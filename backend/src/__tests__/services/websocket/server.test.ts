// ============================================================
// WebSocket Server Unit Tests
// ============================================================
// Purpose: Test WebSocket connection, subscription, and broadcasting
// Story: 2.5 (Day 13)

import WebSocket from "ws";
import { WebSocketServer } from "../../../services/websocket/server";

describe("WebSocketServer", () => {
  let wsServer: WebSocketServer;
  let port: number;

  beforeEach(() => {
    // Use random port for testing
    port = 3000 + Math.floor(Math.random() * 1000);
    wsServer = new WebSocketServer(port);
    wsServer.start();
  });

  afterEach((done) => {
    wsServer.stop();
    // Wait for server to close
    setTimeout(done, 100);
  });

  describe("Connection Management", () => {
    it("should accept client connections", (done) => {
      const client = new WebSocket(`ws://localhost:${port}`);

      client.on("open", () => {
        expect(client.readyState).toBe(WebSocket.OPEN);
        const status = wsServer.getStatus();
        expect(status.connectedClients).toBe(1);
        client.close();
        done();
      });

      client.on("error", (error) => {
        done(error);
      });
    });

    it("should send welcome message on connection", (done) => {
      const client = new WebSocket(`ws://localhost:${port}`);

      client.on("message", (data: WebSocket.Data) => {
        const message = JSON.parse(data.toString());

        expect(message.type).toBe("welcome");
        expect(message.data).toHaveProperty("client_id");
        expect(message.data.message).toContain("Connected to ZMART");

        client.close();
        done();
      });

      client.on("error", (error) => {
        done(error);
      });
    });

    it("should handle multiple client connections", (done) => {
      const client1 = new WebSocket(`ws://localhost:${port}`);
      const client2 = new WebSocket(`ws://localhost:${port}`);

      let openCount = 0;

      const handleOpen = () => {
        openCount++;
        if (openCount === 2) {
          const status = wsServer.getStatus();
          expect(status.connectedClients).toBe(2);
          client1.close();
          client2.close();
          done();
        }
      };

      client1.on("open", handleOpen);
      client2.on("open", handleOpen);

      client1.on("error", (error) => done(error));
      client2.on("error", (error) => done(error));
    });

    it("should clean up on disconnect", (done) => {
      const client = new WebSocket(`ws://localhost:${port}`);

      client.on("open", () => {
        expect(wsServer.getStatus().connectedClients).toBe(1);
        client.close();
      });

      client.on("close", () => {
        // Wait for cleanup
        setTimeout(() => {
          expect(wsServer.getStatus().connectedClients).toBe(0);
          done();
        }, 50);
      });

      client.on("error", (error) => done(error));
    });
  });

  describe("Subscription Logic", () => {
    it("should subscribe to market", (done) => {
      const client = new WebSocket(`ws://localhost:${port}`);
      const marketId = "test-market-123";

      let welcomeReceived = false;

      client.on("message", (data: WebSocket.Data) => {
        const message = JSON.parse(data.toString());

        if (message.type === "welcome") {
          welcomeReceived = true;
          // Send subscribe message
          client.send(
            JSON.stringify({
              action: "subscribe",
              market_id: marketId,
            })
          );
        } else if (message.type === "market_state" && welcomeReceived) {
          // Subscription confirmation
          expect(message.market_id).toBe(marketId);
          expect(message.data.message).toContain("Subscribed");
          expect(message.data.subscriptions).toContain(marketId);

          const status = wsServer.getStatus();
          expect(status.activeMarkets).toBe(1);
          expect(status.subscriptions).toBe(1);

          client.close();
          done();
        }
      });

      client.on("error", (error) => done(error));
    });

    it("should unsubscribe from market", (done) => {
      const client = new WebSocket(`ws://localhost:${port}`);
      const marketId = "test-market-456";

      let step = 0;

      client.on("message", (data: WebSocket.Data) => {
        const message = JSON.parse(data.toString());

        if (message.type === "welcome") {
          step = 1;
          // Subscribe first
          client.send(
            JSON.stringify({
              action: "subscribe",
              market_id: marketId,
            })
          );
        } else if (message.type === "market_state" && step === 1) {
          // Subscribed
          step = 2;
          // Now unsubscribe
          client.send(
            JSON.stringify({
              action: "unsubscribe",
              market_id: marketId,
            })
          );
        } else if (message.type === "market_state" && step === 2) {
          // Unsubscribed
          expect(message.data.message).toContain("Unsubscribed");
          expect(message.data.subscriptions).not.toContain(marketId);

          const status = wsServer.getStatus();
          expect(status.activeMarkets).toBe(0);
          expect(status.subscriptions).toBe(0);

          client.close();
          done();
        }
      });

      client.on("error", (error) => done(error));
    });

    it("should handle subscribe without market_id", (done) => {
      const client = new WebSocket(`ws://localhost:${port}`);

      let welcomeReceived = false;

      client.on("message", (data: WebSocket.Data) => {
        const message = JSON.parse(data.toString());

        if (message.type === "welcome") {
          welcomeReceived = true;
          // Send invalid subscribe (no market_id)
          client.send(
            JSON.stringify({
              action: "subscribe",
            })
          );
        } else if (message.type === "error" && welcomeReceived) {
          expect(message.data.error).toContain("market_id required");
          client.close();
          done();
        }
      });

      client.on("error", (error) => done(error));
    });

    it("should support multiple subscriptions per client", (done) => {
      const client = new WebSocket(`ws://localhost:${port}`);
      const marketId1 = "market-1";
      const marketId2 = "market-2";

      let step = 0;

      client.on("message", (data: WebSocket.Data) => {
        const message = JSON.parse(data.toString());

        if (message.type === "welcome") {
          step = 1;
          client.send(JSON.stringify({ action: "subscribe", market_id: marketId1 }));
        } else if (message.type === "market_state" && step === 1) {
          step = 2;
          client.send(JSON.stringify({ action: "subscribe", market_id: marketId2 }));
        } else if (message.type === "market_state" && step === 2) {
          expect(message.data.subscriptions).toHaveLength(2);
          expect(message.data.subscriptions).toContain(marketId1);
          expect(message.data.subscriptions).toContain(marketId2);

          const status = wsServer.getStatus();
          expect(status.activeMarkets).toBe(2);
          expect(status.subscriptions).toBe(2);

          client.close();
          done();
        }
      });

      client.on("error", (error) => done(error));
    });
  });

  describe("Event Broadcasting", () => {
    it("should broadcast to market subscribers", (done) => {
      const client1 = new WebSocket(`ws://localhost:${port}`);
      const client2 = new WebSocket(`ws://localhost:${port}`);
      const marketId = "broadcast-market";

      let client1Subscribed = false;
      let client2Subscribed = false;
      let client1ReceivedBroadcast = false;
      let client2ReceivedBroadcast = false;

      const handleMessage = (data: WebSocket.Data, clientNum: number) => {
        const message = JSON.parse(data.toString());

        if (message.type === "welcome") {
          if (clientNum === 1) {
            client1.send(JSON.stringify({ action: "subscribe", market_id: marketId }));
          } else {
            client2.send(JSON.stringify({ action: "subscribe", market_id: marketId }));
          }
        } else if (message.type === "market_state" && message.data.message?.includes("Subscribed")) {
          if (clientNum === 1) {
            client1Subscribed = true;
          } else {
            client2Subscribed = true;
          }

          // When both subscribed, broadcast event
          if (client1Subscribed && client2Subscribed) {
            wsServer.broadcast(marketId, {
              type: "trade",
              market_id: marketId,
              data: { test: "broadcast" },
            });
          }
        } else if (message.type === "trade") {
          // Received broadcast
          expect(message.market_id).toBe(marketId);
          expect(message.data.test).toBe("broadcast");

          if (clientNum === 1) {
            client1ReceivedBroadcast = true;
          } else {
            client2ReceivedBroadcast = true;
          }

          // When both received, done
          if (client1ReceivedBroadcast && client2ReceivedBroadcast) {
            client1.close();
            client2.close();
            done();
          }
        }
      };

      client1.on("message", (data) => handleMessage(data, 1));
      client2.on("message", (data) => handleMessage(data, 2));

      client1.on("error", (error) => done(error));
      client2.on("error", (error) => done(error));
    });

    it("should not broadcast to unsubscribed clients", (done) => {
      const subscribedClient = new WebSocket(`ws://localhost:${port}`);
      const unsubscribedClient = new WebSocket(`ws://localhost:${port}`);
      const marketId = "selective-broadcast";

      let subscribedClientReady = false;
      let unsubscribedClientReady = false;
      let subscribedReceived = false;

      subscribedClient.on("message", (data: WebSocket.Data) => {
        const message = JSON.parse(data.toString());

        if (message.type === "welcome") {
          subscribedClient.send(JSON.stringify({ action: "subscribe", market_id: marketId }));
        } else if (message.type === "market_state") {
          subscribedClientReady = true;

          if (unsubscribedClientReady) {
            // Broadcast event
            wsServer.broadcast(marketId, {
              type: "trade",
              market_id: marketId,
              data: { selective: true },
            });
          }
        } else if (message.type === "trade") {
          subscribedReceived = true;
          // Wait a bit to ensure unsubscribed doesn't receive
          setTimeout(() => {
            expect(subscribedReceived).toBe(true);
            subscribedClient.close();
            unsubscribedClient.close();
            done();
          }, 100);
        }
      });

      unsubscribedClient.on("message", (data: WebSocket.Data) => {
        const message = JSON.parse(data.toString());

        if (message.type === "welcome") {
          unsubscribedClientReady = true;

          if (subscribedClientReady) {
            // Broadcast event
            wsServer.broadcast(marketId, {
              type: "trade",
              market_id: marketId,
              data: { selective: true },
            });
          }
        } else if (message.type === "trade") {
          // Should NOT receive this
          done(new Error("Unsubscribed client received broadcast"));
        }
      });

      subscribedClient.on("error", (error) => done(error));
      unsubscribedClient.on("error", (error) => done(error));
    });
  });

  describe("Heartbeat", () => {
    it("should respond to pong", (done) => {
      const client = new WebSocket(`ws://localhost:${port}`);

      client.on("open", () => {
        // Send pong message
        client.send(JSON.stringify({ action: "pong" }));

        // If no error, pong was handled
        setTimeout(() => {
          client.close();
          done();
        }, 100);
      });

      client.on("error", (error) => done(error));
    });
  });
});
