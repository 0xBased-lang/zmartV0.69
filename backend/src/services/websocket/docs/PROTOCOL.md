# WebSocket Protocol Specification

**Version**: 0.69.0
**Last Updated**: November 9, 2025
**Protocol**: JSON over WebSocket (RFC 6455)

Complete specification of the ZMART WebSocket protocol including message formats, sequences, state machine, and error handling.

---

## Table of Contents

- [Overview](#overview)
- [Connection Protocol](#connection-protocol)
- [Message Format](#message-format)
- [Client Messages](#client-messages)
- [Server Messages](#server-messages)
- [Event Types Reference](#event-types-reference)
- [Message Sequences](#message-sequences)
- [State Machine](#state-machine)
- [Error Handling](#error-handling)
- [Protocol Versioning](#protocol-versioning)

---

## Overview

### Protocol Characteristics

- **Transport**: WebSocket (RFC 6455)
- **Encoding**: UTF-8
- **Message Format**: JSON
- **Compression**: None (optional future enhancement)
- **Heartbeat**: 30-second ping/pong
- **Max Message Size**: 1MB (configurable)

### Design Principles

1. **Simplicity**: Pure JSON, easy to debug
2. **Type Safety**: Clear message schemas
3. **Extensibility**: Easy to add new event types
4. **Efficiency**: Selective subscriptions reduce bandwidth
5. **Reliability**: Heartbeat for connection health

---

## Connection Protocol

### Connection URL

```
ws://localhost:4001           # Development
wss://ws.yourdomain.com       # Production
```

### Connection Headers

**Required**:
- `Upgrade: websocket`
- `Connection: Upgrade`
- `Sec-WebSocket-Version: 13`
- `Sec-WebSocket-Key: <random-base64>`

**Optional** (future):
- `Authorization: Bearer <JWT>` - For authenticated connections

### Connection Sequence

```
Client                              Server
  │                                   │
  │ 1. WebSocket Handshake Request    │
  ├──────────────────────────────────▶│
  │                                   │
  │ 2. 101 Switching Protocols        │
  │◀──────────────────────────────────┤
  │                                   │
  │ 3. WebSocket Connection Open      │
  │                                   │
  │ 4. Welcome Message                │
  │◀──────────────────────────────────┤
  │   { type: "welcome", ... }        │
  │                                   │
  │ 5. Subscribe to Market            │
  ├──────────────────────────────────▶│
  │   { action: "subscribe", ... }    │
  │                                   │
  │ 6. Subscription Confirmation      │
  │◀──────────────────────────────────┤
  │   { type: "market_state", ... }   │
  │                                   │
  │ 7. Events Flow                    │
  │◀──────────────────────────────────┤
  │   { type: "trade", ... }          │
  │   { type: "vote", ... }           │
  │                                   │
  │ 8. Heartbeat Ping (every 30s)     │
  │◀──────────────────────────────────┤
  │                                   │
  │ 9. Pong Response                  │
  ├──────────────────────────────────▶│
  │                                   │
  ▼                                   ▼
```

---

## Message Format

### Base Message Structure

All messages are JSON objects with the following structure:

#### Client → Server

```typescript
interface ClientMessage {
  action: "subscribe" | "unsubscribe" | "pong";
  market_id?: string;
}
```

#### Server → Client

```typescript
interface WebSocketEvent {
  type: EventType;
  market_id?: string;
  timestamp: string; // ISO 8601 format
  data: any;
}

type EventType = "welcome" | "market_state" | "trade" | "vote" | "discussion" | "error";
```

### Field Descriptions

**Common Fields**:
- `type` (string): Event type identifier
- `timestamp` (string): ISO 8601 timestamp (e.g., `2025-11-09T12:00:00.000Z`)
- `market_id` (string, optional): Market identifier for market-specific events
- `data` (object): Event-specific payload

---

## Client Messages

### 1. Subscribe

Subscribe to market-specific events.

**Schema**:
```typescript
{
  action: "subscribe",
  market_id: string
}
```

**Example**:
```json
{
  "action": "subscribe",
  "market_id": "market-123"
}
```

**Validation**:
- `action` must be `"subscribe"`
- `market_id` must be a non-empty string
- Market ID should match pattern `/^market-[a-zA-Z0-9]+$/`

**Server Response**:
- Success: `market_state` event with subscription confirmation
- Error: `error` event if `market_id` is missing or invalid

---

### 2. Unsubscribe

Unsubscribe from market-specific events.

**Schema**:
```typescript
{
  action: "unsubscribe",
  market_id: string
}
```

**Example**:
```json
{
  "action": "unsubscribe",
  "market_id": "market-123"
}
```

**Validation**:
- `action` must be `"unsubscribe"`
- `market_id` must be a non-empty string

**Server Response**:
- Success: `market_state` event with unsubscription confirmation
- Error: `error` event if `market_id` is missing

---

### 3. Pong

Heartbeat response (optional, browser handles automatically).

**Schema**:
```typescript
{
  action: "pong"
}
```

**Example**:
```json
{
  "action": "pong"
}
```

**Note**: Most WebSocket clients (browsers) automatically respond to ping frames at the protocol level. This message type is optional for manual implementations.

---

## Server Messages

### 1. Welcome

Sent immediately after WebSocket connection is established.

**Schema**:
```typescript
{
  type: "welcome",
  timestamp: string,
  data: {
    client_id: string,
    message: string
  }
}
```

**Example**:
```json
{
  "type": "welcome",
  "timestamp": "2025-11-09T12:00:00.000Z",
  "data": {
    "client_id": "client_1699564800_abc123xyz",
    "message": "Connected to ZMART WebSocket server"
  }
}
```

**When Sent**: Once per connection, immediately after WebSocket open

**Client Action**: Store `client_id` for debugging/logging

---

### 2. Market State

Market data updates (creation, state changes, data updates).

**Schema**:
```typescript
{
  type: "market_state",
  market_id: string,
  timestamp: string,
  data: {
    action: "created" | "updated" | "deleted",
    old_state?: string,  // For "updated" action
    new_state?: string,  // For "updated" action
    market: MarketData,
    subscriptions?: string[]  // For subscription confirmations
  }
}
```

**Example (Market Update)**:
```json
{
  "type": "market_state",
  "market_id": "market-123",
  "timestamp": "2025-11-09T12:00:00.000Z",
  "data": {
    "action": "updated",
    "old_state": "PROPOSED",
    "new_state": "APPROVED",
    "market": {
      "id": "market-123",
      "question": "Will Bitcoin reach $100k by end of 2025?",
      "state": "APPROVED",
      "yes_shares": 500,
      "no_shares": 500,
      "total_volume": 10000,
      "created_at": "2025-11-01T00:00:00Z"
    }
  }
}
```

**Example (Subscription Confirmation)**:
```json
{
  "type": "market_state",
  "market_id": "market-123",
  "timestamp": "2025-11-09T12:00:00.000Z",
  "data": {
    "message": "Subscribed to market market-123",
    "subscriptions": ["market-123", "market-456"]
  }
}
```

**Trigger Conditions**:
- Market created (INSERT into `markets` table)
- Market updated (UPDATE `markets` table - state change, shares update, etc.)
- Market deleted (DELETE from `markets` table)
- Subscription/unsubscription (client action)

---

### 3. Trade

New trade executed on market.

**Schema**:
```typescript
{
  type: "trade",
  market_id: string,
  timestamp: string,
  data: {
    trade_type: "buy" | "sell",
    outcome: boolean,  // true = YES, false = NO
    shares: string,    // BigInt as string
    cost?: string,     // For buy trades
    payout?: string,   // For sell trades
    user_wallet: string,
    created_at: string
  }
}
```

**Example (Buy Trade)**:
```json
{
  "type": "trade",
  "market_id": "market-123",
  "timestamp": "2025-11-09T12:05:00.000Z",
  "data": {
    "trade_type": "buy",
    "outcome": true,
    "shares": "10",
    "cost": "50000000",
    "user_wallet": "4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye",
    "created_at": "2025-11-09T12:05:00.000Z"
  }
}
```

**Example (Sell Trade)**:
```json
{
  "type": "trade",
  "market_id": "market-123",
  "timestamp": "2025-11-09T12:10:00.000Z",
  "data": {
    "trade_type": "sell",
    "outcome": true,
    "shares": "5",
    "payout": "48000000",
    "user_wallet": "5XQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTyf",
    "created_at": "2025-11-09T12:10:00.000Z"
  }
}
```

**Trigger Condition**: INSERT into `trades` table

**Frequency**: High (up to 100 events/minute during peak activity)

**Client Action**:
- Update price chart
- Refresh market volume
- Show notification ("New trade: 10 YES shares")
- Recalculate LMSR prices

---

### 4. Vote

New vote submitted (proposal or dispute).

**Schema**:
```typescript
{
  type: "vote",
  market_id: string,
  timestamp: string,
  data: {
    vote_type: "proposal" | "dispute",
    vote: boolean,  // Proposal: true=like, false=dislike
                    // Dispute: true=agree, false=disagree
    user_wallet: string,
    created_at: string
  }
}
```

**Example (Proposal Vote)**:
```json
{
  "type": "vote",
  "market_id": "market-123",
  "timestamp": "2025-11-09T12:00:00.000Z",
  "data": {
    "vote_type": "proposal",
    "vote": true,
    "user_wallet": "4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye",
    "created_at": "2025-11-09T12:00:00.000Z"
  }
}
```

**Example (Dispute Vote)**:
```json
{
  "type": "vote",
  "market_id": "market-123",
  "timestamp": "2025-11-09T12:30:00.000Z",
  "data": {
    "vote_type": "dispute",
    "vote": true,
    "user_wallet": "4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye",
    "created_at": "2025-11-09T12:30:00.000Z"
  }
}
```

**Trigger Conditions**:
- INSERT into `proposal_votes` table
- INSERT into `dispute_votes` table

**Client Action**:
- Update vote count ("15 likes, 5 dislikes")
- Refresh approval/dispute progress bar
- Show notification ("New vote submitted!")

---

### 5. Discussion

New comment posted on market.

**Schema**:
```typescript
{
  type: "discussion",
  market_id: string,
  timestamp: string,
  data: {
    id: string,
    content: string,
    user_wallet: string,
    created_at: string
  }
}
```

**Example**:
```json
{
  "type": "discussion",
  "market_id": "market-123",
  "timestamp": "2025-11-09T12:00:00.000Z",
  "data": {
    "id": "comment-789",
    "content": "This market seems overvalued based on current trends.",
    "user_wallet": "4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye",
    "created_at": "2025-11-09T12:00:00.000Z"
  }
}
```

**Trigger Condition**: INSERT into `discussions` table

**Client Action**:
- Append comment to discussion thread
- Show "New comment" badge
- Auto-scroll to latest comment (if user preference)

---

### 6. Error

Server error or invalid client message.

**Schema**:
```typescript
{
  type: "error",
  timestamp: string,
  data: {
    error: string
  }
}
```

**Example**:
```json
{
  "type": "error",
  "timestamp": "2025-11-09T12:00:00.000Z",
  "data": {
    "error": "market_id required for subscribe action"
  }
}
```

**Common Error Messages**:
- `"market_id required for subscribe action"`
- `"market_id required for unsubscribe action"`
- `"Unknown action: <action>"`
- `"Invalid message format"`

**Client Action**:
- Log error to console
- Show error toast/notification
- Retry or prompt user to fix issue

---

## Event Types Reference

### Complete Event Type Matrix

| Event Type | Market ID | Trigger | Frequency | Client Action |
|------------|-----------|---------|-----------|---------------|
| `welcome` | No | Connection open | Once per connection | Store client_id |
| `market_state` | Yes | Market INSERT/UPDATE/DELETE | Low (1-10/min) | Update market UI |
| `trade` | Yes | Trade INSERT | High (10-100/min) | Update prices, volume |
| `vote` | Yes | Vote INSERT | Medium (5-20/min) | Update vote counts |
| `discussion` | Yes | Comment INSERT | Low (1-5/min) | Append comment |
| `error` | No | Invalid message | Rare (error handling) | Show error toast |

### Event Priority

**High Priority** (immediate UI update):
- `trade` - Price changes rapidly
- `market_state` (state changes) - Critical status updates

**Medium Priority** (update within 1 second):
- `vote` - Vote counts
- `market_state` (data updates) - Share counts, volume

**Low Priority** (update when convenient):
- `discussion` - Comments
- `error` - User feedback

---

## Message Sequences

### Sequence 1: Basic Connection & Subscription

```
Client                                Server
  │                                     │
  │ 1. WebSocket Connect                │
  ├────────────────────────────────────▶│
  │                                     │
  │ 2. welcome                          │
  │◀────────────────────────────────────┤
  │ { type: "welcome", ... }            │
  │                                     │
  │ 3. subscribe (market-123)           │
  ├────────────────────────────────────▶│
  │ { action: "subscribe", ... }        │
  │                                     │
  │ 4. market_state (confirmation)      │
  │◀────────────────────────────────────┤
  │ { type: "market_state", ... }       │
  │                                     │
  │ 5. Event stream begins              │
  │◀────────────────────────────────────┤
  │ { type: "trade", ... }              │
  │ { type: "vote", ... }               │
  │                                     │
  ▼                                     ▼
```

---

### Sequence 2: Multiple Subscriptions

```
Client                                Server
  │                                     │
  │ Connected & subscribed to market-123│
  │                                     │
  │ 1. subscribe (market-456)           │
  ├────────────────────────────────────▶│
  │                                     │
  │ 2. market_state (confirmation)      │
  │◀────────────────────────────────────┤
  │ { subscriptions: ["market-123",     │
  │   "market-456"] }                   │
  │                                     │
  │ 3. Events from both markets         │
  │◀────────────────────────────────────┤
  │ { type: "trade",                    │
  │   market_id: "market-123", ... }    │
  │ { type: "vote",                     │
  │   market_id: "market-456", ... }    │
  │                                     │
  ▼                                     ▼
```

---

### Sequence 3: Unsubscribe

```
Client                                Server
  │                                     │
  │ Subscribed to market-123            │
  │                                     │
  │ 1. unsubscribe (market-123)         │
  ├────────────────────────────────────▶│
  │                                     │
  │ 2. market_state (confirmation)      │
  │◀────────────────────────────────────┤
  │ { subscriptions: [] }               │
  │                                     │
  │ 3. No more events for market-123    │
  │                                     │
  ▼                                     ▼
```

---

### Sequence 4: Heartbeat

```
Client                                Server
  │                                     │
  │ Connected & subscribed              │
  │                                     │
  │ ... 30 seconds pass ...             │
  │                                     │
  │ 1. Ping (WebSocket frame)           │
  │◀────────────────────────────────────┤
  │                                     │
  │ 2. Pong (automatic)                 │
  ├────────────────────────────────────▶│
  │                                     │
  │ ... 30 seconds pass ...             │
  │                                     │
  │ 3. Ping                             │
  │◀────────────────────────────────────┤
  │                                     │
  │ [Client doesn't respond]            │
  │                                     │
  │ 4. Connection terminated            │
  │ ✗──────────────────────────────────▶│
  │                                     │
  ▼                                     ▼
```

---

### Sequence 5: Error Handling

```
Client                                Server
  │                                     │
  │ 1. subscribe (missing market_id)    │
  ├────────────────────────────────────▶│
  │ { action: "subscribe" }             │
  │                                     │
  │ 2. error                            │
  │◀────────────────────────────────────┤
  │ { type: "error",                    │
  │   data: { error: "market_id         │
  │   required for subscribe action" }} │
  │                                     │
  │ 3. subscribe (correct)              │
  ├────────────────────────────────────▶│
  │ { action: "subscribe",              │
  │   market_id: "market-123" }         │
  │                                     │
  │ 4. market_state (confirmation)      │
  │◀────────────────────────────────────┤
  │                                     │
  ▼                                     ▼
```

---

## State Machine

### Connection State Diagram

```
┌─────────────┐
│ CONNECTING  │ ← Initial state
└──────┬──────┘
       │ WebSocket handshake
       ▼
┌─────────────┐
│   OPEN      │ ← Connected, waiting for welcome
└──────┬──────┘
       │ Receive welcome message
       ▼
┌─────────────┐
│ READY       │ ← Can send subscribe/unsubscribe
└──────┬──────┘
       │ Send subscribe
       ▼
┌─────────────┐
│ SUBSCRIBED  │ ← Receiving events for market(s)
└──────┬──────┘
       │ Heartbeat ping every 30s
       ▼
┌─────────────┐
│   ACTIVE    │ ← Normal operation
└──────┬──────┘
       │ Ping timeout or close frame
       ▼
┌─────────────┐
│  CLOSING    │ ← Graceful shutdown
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   CLOSED    │ ← Connection terminated
└─────────────┘
```

### State Transitions

| From State | Event | To State | Action |
|------------|-------|----------|--------|
| CONNECTING | WebSocket open | OPEN | Wait for welcome |
| OPEN | Receive welcome | READY | Store client_id |
| READY | Send subscribe | SUBSCRIBED | Mark market subscribed |
| SUBSCRIBED | Receive ping | ACTIVE | Send pong |
| ACTIVE | Receive ping | ACTIVE | Send pong |
| ACTIVE | Ping timeout | CLOSING | Terminate connection |
| * | WebSocket close | CLOSED | Clean up resources |

---

## Error Handling

### Client-Side Error Handling

**Invalid Message Format**:
```json
{
  "type": "error",
  "timestamp": "2025-11-09T12:00:00.000Z",
  "data": {
    "error": "Invalid message format"
  }
}
```

**Recommended Client Action**:
- Log error with stack trace
- Do not retry (likely client bug)
- Show error to user for debugging

---

**Missing Required Field**:
```json
{
  "type": "error",
  "timestamp": "2025-11-09T12:00:00.000Z",
  "data": {
    "error": "market_id required for subscribe action"
  }
}
```

**Recommended Client Action**:
- Validate message before sending
- Retry with corrected message
- Log warning

---

**Unknown Action**:
```json
{
  "type": "error",
  "timestamp": "2025-11-09T12:00:00.000Z",
  "data": {
    "error": "Unknown action: invalid_action"
  }
}
```

**Recommended Client Action**:
- Log error
- Do not retry
- Check client implementation for typos

---

### Connection Error Handling

**Network Disconnect**:
- **Code**: 1006 (Abnormal Closure)
- **Action**: Reconnect with exponential backoff

**Server Shutdown**:
- **Code**: 1001 (Going Away)
- **Action**: Reconnect after delay

**Client Disconnect**:
- **Code**: 1000 (Normal Closure)
- **Action**: No reconnection (user-initiated)

---

## Protocol Versioning

### Current Version

**Version**: 0.69.0
**Protocol**: v1
**Breaking Changes**: None (initial release)

### Future Versioning Strategy

**Minor Version Bump** (backward compatible):
- Add new event types
- Add optional fields to existing messages
- Enhance existing functionality

**Major Version Bump** (breaking changes):
- Remove or rename event types
- Remove or rename required fields
- Change message format

### Version Negotiation (Future)

```
Client                                Server
  │                                     │
  │ 1. Connect with version header      │
  ├────────────────────────────────────▶│
  │ X-Protocol-Version: v2              │
  │                                     │
  │ 2. Welcome with version             │
  │◀────────────────────────────────────┤
  │ { version: "v2", ... }              │
  │                                     │
  ▼                                     ▼
```

---

## TypeScript Definitions

### Complete Type Definitions

```typescript
// Client Messages
type ClientAction = "subscribe" | "unsubscribe" | "pong";

interface ClientMessage {
  action: ClientAction;
  market_id?: string;
}

// Server Messages
type EventType = "welcome" | "market_state" | "trade" | "vote" | "discussion" | "error";

interface WebSocketEvent {
  type: EventType;
  market_id?: string;
  timestamp: string;
  data: any;
}

// Event-Specific Payloads
interface WelcomeData {
  client_id: string;
  message: string;
}

interface MarketStateData {
  action?: "created" | "updated" | "deleted";
  old_state?: string;
  new_state?: string;
  market?: any;
  subscriptions?: string[];
  message?: string;
}

interface TradeData {
  trade_type: "buy" | "sell";
  outcome: boolean;
  shares: string;
  cost?: string;
  payout?: string;
  user_wallet: string;
  created_at: string;
}

interface VoteData {
  vote_type: "proposal" | "dispute";
  vote: boolean;
  user_wallet: string;
  created_at: string;
}

interface DiscussionData {
  id: string;
  content: string;
  user_wallet: string;
  created_at: string;
}

interface ErrorData {
  error: string;
}
```

---

## Testing & Validation

### Message Validation

All messages must conform to the schemas defined above. Invalid messages will receive an `error` event response.

### Testing Tools

**wscat**:
```bash
wscat -c ws://localhost:4001
```

**Postman**:
- Supports WebSocket connections
- Can save and replay messages

**Custom Test Client**:
```typescript
const ws = new WebSocket('ws://localhost:4001');
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);

  // Validate against TypeScript interfaces
  if (!validateMessage(message)) {
    console.error('Invalid message format!');
  }
};
```

---

## Best Practices

### Client Implementation

1. **Always handle `welcome` event** - Store client_id for debugging
2. **Validate messages before sending** - Prevent server errors
3. **Handle all event types** - Even if not currently used
4. **Implement reconnection logic** - Network issues are common
5. **Log all messages in development** - Helps debugging
6. **Use TypeScript types** - Catch errors at compile-time

### Server Implementation

1. **Always send `welcome` message** - Client expects it
2. **Validate all client messages** - Return `error` for invalid
3. **Include `timestamp` in all events** - Client-side ordering
4. **Use `market_id` consistently** - Enable filtering
5. **Implement heartbeat** - Detect stale connections
6. **Log all errors** - Monitor for issues

---

**Last Updated**: November 9, 2025
**Version**: 0.69.0
**Protocol Version**: v1
**Status**: Production Ready
