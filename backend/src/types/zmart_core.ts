/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/zmart_core.json`.
 */
export type ZmartCore = {
  "address": "B5LimwoBn4aAqFmJsV1KtrxDbtEjaZ9WeNrfDWmJc42Z",
  "metadata": {
    "name": "zmartCore",
    "version": "0.69.0",
    "spec": "0.1.0",
    "description": "ZMART Core - Prediction market trading and resolution"
  },
  "instructions": [
    {
      "name": "activateMarket",
      "docs": [
        "Activate an approved market (admin or creator)",
        "",
        "Transitions a market from APPROVED → ACTIVE, enabling trading.",
        "Can be called by either admin or market creator."
      ],
      "discriminator": [
        10,
        26,
        197,
        116,
        113,
        99,
        72,
        89
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Authority (either admin or creator) activating the market"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "docs": [
            "Market account to activate"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.market_id",
                "account": "marketAccount"
              }
            ]
          }
        },
        {
          "name": "globalConfig",
          "docs": [
            "Global configuration (verify admin if authority is admin)"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "aggregateDisputeVotes",
      "docs": [
        "Aggregate dispute votes and check dispute threshold",
        "",
        "Backend authority aggregates votes off-chain (from VoteRecords) and submits",
        "final counts. If 60%+ agree with dispute, resolution is rejected and market",
        "returns to RESOLVING state. If <60%, original resolution stands and market",
        "transitions to FINALIZED.",
        "",
        "# Arguments",
        "",
        "* `final_agrees` - Total number of \"agree with dispute\" votes",
        "* `final_disagrees` - Total number of \"disagree with dispute\" votes",
        "",
        "# Behavior",
        "",
        "* Records vote counts in MarketAccount",
        "* Calculates agreement percentage",
        "* If >= 60% agree: transitions to RESOLVING (resolution rejected)",
        "* If < 60% agree: transitions to FINALIZED (resolution accepted)",
        "* Emits DisputeAggregated event",
        "",
        "# Errors",
        "",
        "* `ErrorCode::Unauthorized` - Caller is not backend authority",
        "* `ErrorCode::InvalidStateForVoting` - Market not in DISPUTED state",
        "* `ErrorCode::OverflowError` - Vote count overflow (extremely unlikely)"
      ],
      "discriminator": [
        74,
        14,
        30,
        19,
        212,
        141,
        112,
        25
      ],
      "accounts": [
        {
          "name": "market",
          "docs": [
            "Market account (must be in DISPUTED state)"
          ],
          "writable": true
        },
        {
          "name": "globalConfig",
          "docs": [
            "Global config (contains backend authority and dispute threshold)"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "backendAuthority",
          "docs": [
            "Backend authority (must match global config)"
          ],
          "signer": true
        }
      ],
      "args": [
        {
          "name": "finalAgrees",
          "type": "u32"
        },
        {
          "name": "finalDisagrees",
          "type": "u32"
        }
      ]
    },
    {
      "name": "aggregateProposalVotes",
      "docs": [
        "Aggregate proposal votes and check approval threshold",
        "",
        "Backend authority aggregates votes off-chain (from VoteRecords) and submits",
        "final counts. If 70%+ likes, market transitions to APPROVED state.",
        "",
        "# Arguments",
        "",
        "* `final_likes` - Total number of like votes (from off-chain aggregation)",
        "* `final_dislikes` - Total number of dislike votes (from off-chain aggregation)",
        "",
        "# Behavior",
        "",
        "* Records vote counts in MarketAccount",
        "* Calculates approval percentage",
        "* If >= 70% likes: transitions to APPROVED state",
        "* If < 70% likes: stays in PROPOSED (can re-aggregate)",
        "* Emits ProposalAggregated event",
        "",
        "# Errors",
        "",
        "* `ErrorCode::Unauthorized` - Caller is not backend authority",
        "* `ErrorCode::InvalidStateForVoting` - Market not in PROPOSED state",
        "* `ErrorCode::OverflowError` - Vote count overflow (extremely unlikely)"
      ],
      "discriminator": [
        26,
        156,
        18,
        21,
        185,
        176,
        202,
        72
      ],
      "accounts": [
        {
          "name": "market",
          "docs": [
            "Market account (must be in PROPOSED state)"
          ],
          "writable": true
        },
        {
          "name": "globalConfig",
          "docs": [
            "Global config (contains backend authority)"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "backendAuthority",
          "docs": [
            "Backend authority (must match global config)"
          ],
          "signer": true
        }
      ],
      "args": [
        {
          "name": "finalLikes",
          "type": "u32"
        },
        {
          "name": "finalDislikes",
          "type": "u32"
        }
      ]
    },
    {
      "name": "approveProposal",
      "docs": [
        "Approve a market proposal (admin only)",
        "",
        "Transitions a market from PROPOSED → APPROVED after validating",
        "that proposal voting reached 70% approval threshold."
      ],
      "discriminator": [
        136,
        108,
        102,
        85,
        98,
        114,
        7,
        147
      ],
      "accounts": [
        {
          "name": "admin",
          "docs": [
            "Protocol admin with approval authority"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "docs": [
            "Market account to approve"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.market_id",
                "account": "marketAccount"
              }
            ]
          }
        },
        {
          "name": "globalConfig",
          "docs": [
            "Global configuration (verify admin and read approval threshold)"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "buyShares",
      "docs": [
        "Buy YES or NO shares using LMSR",
        "",
        "Users specify a target cost and receive shares calculated by LMSR.",
        "Fees (10% total) are added on top: 3% protocol, 2% resolver, 5% LP.",
        "",
        "# Arguments",
        "",
        "* `outcome` - true for YES, false for NO",
        "* `target_cost` - Maximum willing to pay (before fees, slippage protection)"
      ],
      "discriminator": [
        40,
        239,
        138,
        154,
        8,
        37,
        106,
        108
      ],
      "accounts": [
        {
          "name": "globalConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolFeeWallet",
          "docs": [
            "Protocol fee wallet (validated against global_config)"
          ],
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "outcome",
          "type": "bool"
        },
        {
          "name": "targetCost",
          "type": "u64"
        }
      ]
    },
    {
      "name": "cancelMarket",
      "docs": [
        "Cancel a market and transition to CANCELLED state",
        "",
        "Allows admin to cancel markets that are invalid or fraudulent.",
        "Only works for PROPOSED or APPROVED markets (cannot cancel active/resolving).",
        "Sets market to CANCELLED state. Refunds handled by separate instruction."
      ],
      "discriminator": [
        205,
        121,
        84,
        210,
        222,
        71,
        150,
        11
      ],
      "accounts": [
        {
          "name": "admin",
          "docs": [
            "Protocol admin with cancellation authority"
          ],
          "signer": true
        },
        {
          "name": "market",
          "docs": [
            "Market account to cancel"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.market_id",
                "account": "marketAccount"
              }
            ]
          }
        },
        {
          "name": "globalConfig",
          "docs": [
            "Global configuration (verify admin authority)"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "claimWinnings",
      "docs": [
        "Claim winnings after market finalized",
        "",
        "Users claim based on final outcome:",
        "- YES outcome: Only YES holders win",
        "- NO outcome: Only NO holders win",
        "- INVALID outcome: All holders refunded",
        "",
        "First claimer pays resolver their accumulated fees"
      ],
      "discriminator": [
        161,
        215,
        24,
        59,
        14,
        236,
        242,
        221
      ],
      "accounts": [
        {
          "name": "globalConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true,
          "relations": [
            "position"
          ]
        },
        {
          "name": "resolver",
          "docs": [
            "Resolver (receives accumulated fees if outcome valid)"
          ],
          "writable": true
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program for CPI transfers"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "createMarket",
      "docs": [
        "Create a new prediction market in PROPOSED state",
        "",
        "Initializes a MarketAccount that must undergo proposal voting and",
        "admin approval before becoming tradeable.",
        "",
        "# Arguments",
        "",
        "* `market_id` - Unique identifier for this market (32 bytes, used in PDA seeds)",
        "* `b_parameter` - LMSR liquidity sensitivity parameter",
        "* `initial_liquidity` - Starting liquidity in lamports",
        "* `ipfs_question_hash` - IPFS CID for market question (46 bytes)"
      ],
      "discriminator": [
        103,
        226,
        97,
        235,
        200,
        188,
        251,
        254
      ],
      "accounts": [
        {
          "name": "creator",
          "docs": [
            "Market creator who pays for account creation"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "docs": [
            "Market account PDA (initialized in PROPOSED state)",
            "",
            "Seeds: [b\"market\", market_id.as_ref()]",
            "Space: MarketAccount::LEN (464 bytes + 8 discriminator)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "marketId"
              }
            ]
          }
        },
        {
          "name": "globalConfig",
          "docs": [
            "Global configuration (read protocol settings)"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program for account creation"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "marketId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "bParameter",
          "type": "u64"
        },
        {
          "name": "initialLiquidity",
          "type": "u64"
        },
        {
          "name": "ipfsQuestionHash",
          "type": {
            "array": [
              "u8",
              46
            ]
          }
        }
      ]
    },
    {
      "name": "emergencyPause",
      "docs": [
        "Toggle protocol pause state (pause/unpause trading)",
        "",
        "Allows admin to pause all trading operations in case of critical bugs,",
        "exploits, or market instability. Calling when running pauses protocol.",
        "Calling when paused unpauses protocol. Voting and resolution continue."
      ],
      "discriminator": [
        21,
        143,
        27,
        142,
        200,
        181,
        210,
        255
      ],
      "accounts": [
        {
          "name": "admin",
          "docs": [
            "Protocol admin with pause authority"
          ],
          "signer": true
        },
        {
          "name": "globalConfig",
          "docs": [
            "Global configuration account to update"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "finalizeMarket",
      "docs": [
        "Set final outcome (RESOLVING/DISPUTED → FINALIZED)",
        "",
        "Backend authority finalizes market after vote aggregation.",
        "For disputed markets: if ≥60% agree to flip, flip the outcome.",
        "",
        "# Arguments",
        "",
        "* `dispute_agree` - Dispute agree votes (Some for DISPUTED, None for RESOLVING)",
        "* `dispute_disagree` - Dispute disagree votes (Some for DISPUTED, None for RESOLVING)"
      ],
      "discriminator": [
        16,
        225,
        38,
        28,
        213,
        217,
        1,
        247
      ],
      "accounts": [
        {
          "name": "globalConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "backendAuthority",
          "docs": [
            "Backend authority (vote aggregator)"
          ],
          "signer": true
        }
      ],
      "args": [
        {
          "name": "disputeAgree",
          "type": {
            "option": "u32"
          }
        },
        {
          "name": "disputeDisagree",
          "type": {
            "option": "u32"
          }
        }
      ]
    },
    {
      "name": "initializeGlobalConfig",
      "docs": [
        "Initialize global protocol configuration (one-time setup)",
        "",
        "Creates the GlobalConfig PDA with default settings for fees, voting",
        "thresholds, and time limits. Can only be called once.",
        "",
        "# Arguments",
        "",
        "* `backend_authority` - Backend service authority for vote aggregation"
      ],
      "discriminator": [
        113,
        216,
        122,
        131,
        225,
        209,
        22,
        55
      ],
      "accounts": [
        {
          "name": "admin",
          "docs": [
            "Protocol administrator who pays for account creation and has full control"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "globalConfig",
          "docs": [
            "Global configuration PDA (created once)",
            "",
            "Seeds: [b\"global-config\"]",
            "Space: GlobalConfig::LEN (198 bytes + 8 discriminator)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "protocolFeeWallet",
          "docs": [
            "Wallet receiving protocol fees (3% of trading fees)"
          ]
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program for account creation"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "backendAuthority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "initiateDispute",
      "docs": [
        "Challenge a resolution (RESOLVING → DISPUTED)",
        "",
        "Any user can dispute proposed outcome during dispute window.",
        "Opens community voting via off-chain aggregation."
      ],
      "discriminator": [
        128,
        242,
        160,
        23,
        44,
        61,
        171,
        37
      ],
      "accounts": [
        {
          "name": "globalConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "initiator",
          "docs": [
            "User initiating the dispute"
          ],
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "resolveMarket",
      "docs": [
        "Propose market resolution (ACTIVE → RESOLVING)",
        "",
        "Any user can propose resolution after market conditions met. Starts",
        "48-hour dispute window for community challenges.",
        "",
        "# Arguments",
        "",
        "* `proposed_outcome` - true for YES, false for NO",
        "* `ipfs_evidence_hash` - IPFS CID with resolution evidence (46 bytes)"
      ],
      "discriminator": [
        155,
        23,
        80,
        173,
        46,
        74,
        23,
        239
      ],
      "accounts": [
        {
          "name": "globalConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "resolver",
          "docs": [
            "Resolver proposing the outcome"
          ],
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "proposedOutcome",
          "type": "bool"
        },
        {
          "name": "ipfsEvidenceHash",
          "type": {
            "array": [
              "u8",
              46
            ]
          }
        }
      ]
    },
    {
      "name": "sellShares",
      "docs": [
        "Sell YES or NO shares back to the pool",
        "",
        "Users specify number of shares to sell and receive proceeds calculated",
        "by LMSR. Fees (10% total) are deducted from proceeds.",
        "",
        "# Arguments",
        "",
        "* `outcome` - true for YES, false for NO",
        "* `shares_to_sell` - Number of shares to sell",
        "* `min_proceeds` - Minimum acceptable proceeds (slippage protection)"
      ],
      "discriminator": [
        184,
        164,
        169,
        16,
        231,
        158,
        199,
        196
      ],
      "accounts": [
        {
          "name": "globalConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true,
          "relations": [
            "position"
          ]
        },
        {
          "name": "protocolFeeWallet",
          "docs": [
            "Protocol fee wallet"
          ],
          "writable": true
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program for CPI transfers"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "outcome",
          "type": "bool"
        },
        {
          "name": "sharesToSell",
          "type": "u64"
        },
        {
          "name": "minProceeds",
          "type": "u64"
        }
      ]
    },
    {
      "name": "submitDisputeVote",
      "docs": [
        "Submit a vote on a market dispute (agree/disagree)",
        "",
        "Creates an on-chain VoteRecord for proof and duplicate prevention.",
        "Votes are aggregated off-chain by the backend. When dispute voting",
        "concludes, backend calls aggregate_dispute_votes.",
        "",
        "# Arguments",
        "",
        "* `vote` - true for \"agree with dispute\" (resolution is wrong),",
        "false for \"disagree with dispute\" (resolution is correct)",
        "",
        "# Errors",
        "",
        "* `ErrorCode::InvalidStateForVoting` - Market not in DISPUTED state",
        "* `ErrorCode::AlreadyVoted` - User already voted (PDA init fails)"
      ],
      "discriminator": [
        49,
        223,
        61,
        66,
        152,
        235,
        72,
        230
      ],
      "accounts": [
        {
          "name": "market",
          "docs": [
            "Market being voted on (must be in DISPUTED state)"
          ]
        },
        {
          "name": "voteRecord",
          "docs": [
            "Vote record to create (PDA prevents duplicate votes)",
            "",
            "The `init` constraint will fail if this account already exists,",
            "which happens when a user tries to vote twice on the same dispute.",
            "This provides automatic duplicate vote prevention at the protocol level."
          ],
          "writable": true
        },
        {
          "name": "user",
          "docs": [
            "User submitting the vote (pays for account creation)"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program for account creation"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "vote",
          "type": "bool"
        }
      ]
    },
    {
      "name": "submitProposalVote",
      "docs": [
        "Submit a vote on a market proposal (like/dislike)",
        "",
        "Creates an on-chain VoteRecord for proof and duplicate prevention.",
        "Votes are aggregated off-chain by the backend. When 70% approval",
        "threshold is reached, backend calls approve_proposal.",
        "",
        "# Arguments",
        "",
        "* `vote` - true for \"like\" (support), false for \"dislike\" (oppose)",
        "",
        "# Errors",
        "",
        "* `ErrorCode::InvalidStateForVoting` - Market not in PROPOSED state",
        "* `ErrorCode::AlreadyVoted` - User already voted (PDA init fails)"
      ],
      "discriminator": [
        177,
        187,
        59,
        230,
        29,
        185,
        14,
        240
      ],
      "accounts": [
        {
          "name": "market",
          "docs": [
            "Market being voted on (must be in PROPOSED state)"
          ]
        },
        {
          "name": "voteRecord",
          "docs": [
            "Vote record to create (PDA prevents duplicate votes)",
            "",
            "The `init` constraint will fail if this account already exists,",
            "which happens when a user tries to vote twice on the same proposal.",
            "This provides automatic duplicate vote prevention at the protocol level."
          ],
          "writable": true
        },
        {
          "name": "user",
          "docs": [
            "User submitting the vote (pays for account creation)"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program for account creation"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "vote",
          "type": "bool"
        }
      ]
    },
    {
      "name": "updateGlobalConfig",
      "docs": [
        "Update global protocol configuration parameters",
        "",
        "Allows admin to modify fee percentages, voting thresholds, and other",
        "configuration parameters without redeploying the program.",
        "",
        "# Arguments",
        "",
        "* `protocol_fee_bps` - Protocol fee in basis points (0-10000)",
        "* `resolver_reward_bps` - Resolver reward in basis points (0-10000)",
        "* `liquidity_provider_fee_bps` - LP fee in basis points (0-10000)",
        "* `proposal_approval_threshold` - Proposal approval threshold (0-10000)",
        "* `dispute_success_threshold` - Dispute success threshold (0-10000)",
        "* `min_resolution_delay` - Optional minimum resolution delay in seconds",
        "* `dispute_period` - Optional dispute period duration in seconds"
      ],
      "discriminator": [
        164,
        84,
        130,
        189,
        111,
        58,
        250,
        200
      ],
      "accounts": [
        {
          "name": "admin",
          "docs": [
            "Protocol admin with configuration authority"
          ],
          "signer": true
        },
        {
          "name": "globalConfig",
          "docs": [
            "Global configuration account to update"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "protocolFeeBps",
          "type": "u16"
        },
        {
          "name": "resolverRewardBps",
          "type": "u16"
        },
        {
          "name": "liquidityProviderFeeBps",
          "type": "u16"
        },
        {
          "name": "proposalApprovalThreshold",
          "type": "u16"
        },
        {
          "name": "disputeSuccessThreshold",
          "type": "u16"
        },
        {
          "name": "minResolutionDelay",
          "type": {
            "option": "i64"
          }
        },
        {
          "name": "disputePeriod",
          "type": {
            "option": "i64"
          }
        }
      ]
    },
    {
      "name": "withdrawLiquidity",
      "docs": [
        "Withdraw remaining liquidity after market finalized",
        "",
        "Creator withdraws remaining pool funds + LP fees while",
        "preserving rent reserve."
      ],
      "discriminator": [
        149,
        158,
        33,
        185,
        47,
        243,
        253,
        31
      ],
      "accounts": [
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true,
          "relations": [
            "market"
          ]
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "globalConfig",
      "discriminator": [
        149,
        8,
        156,
        202,
        160,
        252,
        176,
        217
      ]
    },
    {
      "name": "marketAccount",
      "discriminator": [
        201,
        78,
        187,
        225,
        240,
        198,
        201,
        251
      ]
    },
    {
      "name": "userPosition",
      "discriminator": [
        251,
        248,
        209,
        245,
        83,
        234,
        17,
        27
      ]
    },
    {
      "name": "voteRecord",
      "discriminator": [
        112,
        9,
        123,
        165,
        234,
        9,
        157,
        167
      ]
    }
  ],
  "events": [
    {
      "name": "configUpdated",
      "discriminator": [
        40,
        241,
        230,
        122,
        11,
        19,
        198,
        194
      ]
    },
    {
      "name": "disputeAggregated",
      "discriminator": [
        58,
        17,
        210,
        160,
        75,
        36,
        105,
        38
      ]
    },
    {
      "name": "disputeInitiated",
      "discriminator": [
        150,
        109,
        93,
        252,
        198,
        4,
        183,
        153
      ]
    },
    {
      "name": "disputeVoteSubmitted",
      "discriminator": [
        39,
        2,
        213,
        195,
        78,
        10,
        193,
        114
      ]
    },
    {
      "name": "globalConfigInitialized",
      "discriminator": [
        5,
        221,
        172,
        158,
        77,
        87,
        157,
        113
      ]
    },
    {
      "name": "liquidityWithdrawn",
      "discriminator": [
        240,
        120,
        73,
        139,
        154,
        31,
        218,
        68
      ]
    },
    {
      "name": "marketActivated",
      "discriminator": [
        196,
        73,
        78,
        48,
        187,
        132,
        107,
        11
      ]
    },
    {
      "name": "marketCancelled",
      "discriminator": [
        139,
        163,
        33,
        168,
        19,
        180,
        81,
        170
      ]
    },
    {
      "name": "marketCreated",
      "discriminator": [
        88,
        184,
        130,
        231,
        226,
        84,
        6,
        58
      ]
    },
    {
      "name": "marketFinalized",
      "discriminator": [
        83,
        62,
        66,
        204,
        37,
        76,
        234,
        179
      ]
    },
    {
      "name": "marketResolved",
      "discriminator": [
        89,
        67,
        230,
        95,
        143,
        106,
        199,
        202
      ]
    },
    {
      "name": "proposalAggregated",
      "discriminator": [
        234,
        166,
        71,
        118,
        60,
        243,
        139,
        213
      ]
    },
    {
      "name": "proposalApproved",
      "discriminator": [
        70,
        49,
        155,
        228,
        157,
        43,
        88,
        49
      ]
    },
    {
      "name": "proposalVoteSubmitted",
      "discriminator": [
        156,
        67,
        143,
        2,
        217,
        162,
        6,
        56
      ]
    },
    {
      "name": "protocolPauseStatusChanged",
      "discriminator": [
        189,
        150,
        216,
        1,
        103,
        35,
        49,
        103
      ]
    },
    {
      "name": "sharesBought",
      "discriminator": [
        240,
        98,
        69,
        10,
        253,
        234,
        226,
        65
      ]
    },
    {
      "name": "sharesSold",
      "discriminator": [
        35,
        231,
        5,
        53,
        228,
        158,
        113,
        251
      ]
    },
    {
      "name": "winningsClaimed",
      "discriminator": [
        187,
        184,
        29,
        196,
        54,
        117,
        70,
        150
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidFeeConfiguration",
      "msg": "Invalid fee configuration: total fees exceed 100%"
    },
    {
      "code": 6001,
      "name": "invalidThreshold",
      "msg": "Invalid threshold: must be ≤ 10000 (100%)"
    },
    {
      "code": 6002,
      "name": "invalidTimeLimit",
      "msg": "Invalid time limit: must be positive"
    },
    {
      "code": 6003,
      "name": "alreadyInitialized",
      "msg": "Global config already initialized"
    },
    {
      "code": 6004,
      "name": "invalidFeeStructure",
      "msg": "Invalid fee structure: total fees exceed 100%"
    },
    {
      "code": 6005,
      "name": "invalidStateTransition",
      "msg": "Invalid state transition"
    },
    {
      "code": 6006,
      "name": "invalidMarketState",
      "msg": "Market not in required state"
    },
    {
      "code": 6007,
      "name": "marketPaused",
      "msg": "Market is paused"
    },
    {
      "code": 6008,
      "name": "marketCancelled",
      "msg": "Market is cancelled"
    },
    {
      "code": 6009,
      "name": "protocolPaused",
      "msg": "Protocol is paused"
    },
    {
      "code": 6010,
      "name": "cannotCancelMarket",
      "msg": "Cannot cancel market in current state"
    },
    {
      "code": 6011,
      "name": "marketAlreadyCancelled",
      "msg": "Market is already cancelled"
    },
    {
      "code": 6012,
      "name": "zeroAmount",
      "msg": "Trading amount must be greater than zero"
    },
    {
      "code": 6013,
      "name": "insufficientShares",
      "msg": "Insufficient shares to sell"
    },
    {
      "code": 6014,
      "name": "slippageExceeded",
      "msg": "Slippage tolerance exceeded"
    },
    {
      "code": 6015,
      "name": "insufficientLiquidity",
      "msg": "Insufficient liquidity"
    },
    {
      "code": 6016,
      "name": "invalidLiquidity",
      "msg": "Invalid liquidity amount"
    },
    {
      "code": 6017,
      "name": "tradeTooSmall",
      "msg": "Trade amount below minimum (0.00001 SOL)"
    },
    {
      "code": 6018,
      "name": "resolutionPeriodNotEnded",
      "msg": "Resolution period not ended"
    },
    {
      "code": 6019,
      "name": "disputePeriodEnded",
      "msg": "Dispute period ended"
    },
    {
      "code": 6020,
      "name": "noResolutionProposed",
      "msg": "No resolution proposed"
    },
    {
      "code": 6021,
      "name": "alreadyClaimed",
      "msg": "Winnings already claimed"
    },
    {
      "code": 6022,
      "name": "noWinnings",
      "msg": "No winnings to claim"
    },
    {
      "code": 6023,
      "name": "noVotesRecorded",
      "msg": "No votes recorded"
    },
    {
      "code": 6024,
      "name": "insufficientVotes",
      "msg": "Insufficient votes to meet threshold"
    },
    {
      "code": 6025,
      "name": "alreadyResolved",
      "msg": "Market already resolved"
    },
    {
      "code": 6026,
      "name": "disputePeriodNotEnded",
      "msg": "Dispute period not ended"
    },
    {
      "code": 6027,
      "name": "alreadyDisputed",
      "msg": "Already disputed"
    },
    {
      "code": 6028,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6029,
      "name": "invalidAdmin",
      "msg": "Invalid admin"
    },
    {
      "code": 6030,
      "name": "invalidResolver",
      "msg": "Invalid resolver"
    },
    {
      "code": 6031,
      "name": "insufficientReputation",
      "msg": "Insufficient reputation"
    },
    {
      "code": 6032,
      "name": "overflowError",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6033,
      "name": "underflowError",
      "msg": "Arithmetic underflow"
    },
    {
      "code": 6034,
      "name": "divisionByZero",
      "msg": "Division by zero"
    },
    {
      "code": 6035,
      "name": "invalidFixedPoint",
      "msg": "Invalid fixed-point value"
    },
    {
      "code": 6036,
      "name": "invalidLogarithm",
      "msg": "Logarithm of non-positive number"
    },
    {
      "code": 6037,
      "name": "exponentialOverflow",
      "msg": "Exponential overflow"
    },
    {
      "code": 6038,
      "name": "exponentTooLarge",
      "msg": "Exponent too large"
    },
    {
      "code": 6039,
      "name": "invalidInput",
      "msg": "Invalid input value"
    },
    {
      "code": 6040,
      "name": "boundedLossExceeded",
      "msg": "Market loss exceeds theoretical maximum of b * ln(2)"
    },
    {
      "code": 6041,
      "name": "invalidBParameter",
      "msg": "Invalid LMSR b parameter"
    },
    {
      "code": 6042,
      "name": "invalidMarketId",
      "msg": "Invalid market ID"
    },
    {
      "code": 6043,
      "name": "invalidTimestamp",
      "msg": "Invalid timestamp"
    },
    {
      "code": 6044,
      "name": "invalidIpfsHash",
      "msg": "Invalid IPFS hash"
    },
    {
      "code": 6045,
      "name": "insufficientFunds",
      "msg": "Insufficient funds"
    },
    {
      "code": 6046,
      "name": "wouldBreakRentExemption",
      "msg": "Transfer would leave account below rent-exempt minimum"
    },
    {
      "code": 6047,
      "name": "reentrant",
      "msg": "Reentrancy detected - operation already in progress"
    },
    {
      "code": 6048,
      "name": "invalidReservedField",
      "msg": "Reserved fields must be zero"
    },
    {
      "code": 6049,
      "name": "alreadyVoted",
      "msg": "User already voted"
    },
    {
      "code": 6050,
      "name": "invalidStateForVoting",
      "msg": "Invalid state for voting"
    }
  ],
  "types": [
    {
      "name": "configUpdated",
      "docs": [
        "Event emitted when configuration is updated"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "protocolFeeBps",
            "type": "u16"
          },
          {
            "name": "resolverRewardBps",
            "type": "u16"
          },
          {
            "name": "liquidityProviderFeeBps",
            "type": "u16"
          },
          {
            "name": "proposalApprovalThreshold",
            "type": "u16"
          },
          {
            "name": "disputeSuccessThreshold",
            "type": "u16"
          },
          {
            "name": "minResolutionDelay",
            "type": "i64"
          },
          {
            "name": "disputePeriod",
            "type": "i64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "disputeAggregated",
      "docs": [
        "Dispute votes aggregated and resolution decision made"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "agrees",
            "type": "u32"
          },
          {
            "name": "disagrees",
            "type": "u32"
          },
          {
            "name": "agreementPercentage",
            "type": "u8"
          },
          {
            "name": "disputeSucceeded",
            "type": "bool"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "disputeInitiated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "initiator",
            "type": "pubkey"
          },
          {
            "name": "disputedOutcome",
            "type": {
              "option": "bool"
            }
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "disputeVoteSubmitted",
      "docs": [
        "Event emitted when a dispute vote is submitted",
        "",
        "The backend listens for these events and aggregates votes off-chain.",
        "When aggregation is complete, the backend calls aggregate_dispute_votes",
        "to determine if the dispute threshold is met."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketId",
            "docs": [
              "Market ID (not pubkey, the actual market_id bytes)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "user",
            "docs": [
              "User who voted"
            ],
            "type": "pubkey"
          },
          {
            "name": "vote",
            "docs": [
              "Vote choice (true = agree with dispute, false = disagree)"
            ],
            "type": "bool"
          },
          {
            "name": "timestamp",
            "docs": [
              "Timestamp when vote was cast"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "globalConfig",
      "docs": [
        "Global configuration for the ZMART protocol",
        "",
        "This account stores protocol-wide settings including fee percentages,",
        "voting thresholds, time limits, and admin controls.",
        "",
        "PDA Seeds: [\"global_config\"]",
        "Size: 198 bytes (8 discriminator + 190 data)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "docs": [
              "Protocol admin (can update parameters)"
            ],
            "type": "pubkey"
          },
          {
            "name": "backendAuthority",
            "docs": [
              "Backend authority (can aggregate votes, trigger auto-resolution)"
            ],
            "type": "pubkey"
          },
          {
            "name": "protocolFeeWallet",
            "docs": [
              "Protocol fee wallet (receives 3% trading fees by default)"
            ],
            "type": "pubkey"
          },
          {
            "name": "protocolFeeBps",
            "docs": [
              "Fee percentages in basis points (100 = 1%, 10000 = 100%)",
              "Default: 300 (3%)"
            ],
            "type": "u16"
          },
          {
            "name": "resolverRewardBps",
            "docs": [
              "Resolver reward in basis points",
              "Default: 200 (2%)"
            ],
            "type": "u16"
          },
          {
            "name": "liquidityProviderFeeBps",
            "docs": [
              "Liquidity provider fee in basis points",
              "Default: 500 (5%)"
            ],
            "type": "u16"
          },
          {
            "name": "proposalApprovalThreshold",
            "docs": [
              "Proposal approval threshold in basis points",
              "Default: 7000 (70%)"
            ],
            "type": "u16"
          },
          {
            "name": "disputeSuccessThreshold",
            "docs": [
              "Dispute success threshold in basis points",
              "Default: 6000 (60%)"
            ],
            "type": "u16"
          },
          {
            "name": "minResolutionDelay",
            "docs": [
              "Minimum delay before resolution can be finalized (in seconds)",
              "Default: 86400 (24 hours)"
            ],
            "type": "i64"
          },
          {
            "name": "disputePeriod",
            "docs": [
              "Dispute period duration (in seconds)",
              "Default: 259200 (3 days)"
            ],
            "type": "i64"
          },
          {
            "name": "minResolverReputation",
            "docs": [
              "Minimum reputation score required to be a resolver (in basis points)",
              "Default: 8000 (80%)"
            ],
            "type": "u16"
          },
          {
            "name": "isPaused",
            "docs": [
              "Emergency pause flag (stops all trading and state transitions)"
            ],
            "type": "bool"
          },
          {
            "name": "reserved",
            "docs": [
              "Reserved space for future upgrades (64 bytes)"
            ],
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "bump",
            "docs": [
              "Bump seed for PDA derivation"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "globalConfigInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "backendAuthority",
            "type": "pubkey"
          },
          {
            "name": "protocolFeeBps",
            "type": "u16"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "liquidityWithdrawn",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "marketAccount",
      "docs": [
        "Individual prediction market account",
        "",
        "This account stores all market state including LMSR parameters,",
        "share quantities, resolution data, and fee accumulation.",
        "",
        "PDA Seeds: [\"market\", market_id]",
        "Size: 421 bytes (8 discriminator + 413 data)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketId",
            "docs": [
              "Unique market identifier (32-byte UUID from off-chain)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "creator",
            "docs": [
              "Market creator (receives creator rewards)"
            ],
            "type": "pubkey"
          },
          {
            "name": "state",
            "docs": [
              "Current market state (see MarketState enum)"
            ],
            "type": {
              "defined": {
                "name": "marketState"
              }
            }
          },
          {
            "name": "bParameter",
            "docs": [
              "LMSR liquidity depth parameter (fixed-point, 9 decimals)",
              "Controls price sensitivity: larger b = less sensitive"
            ],
            "type": "u64"
          },
          {
            "name": "initialLiquidity",
            "docs": [
              "Initial liquidity provided at market creation (in lamports)"
            ],
            "type": "u64"
          },
          {
            "name": "currentLiquidity",
            "docs": [
              "Current liquidity in the pool (in lamports)"
            ],
            "type": "u64"
          },
          {
            "name": "sharesYes",
            "docs": [
              "Share quantities (fixed-point, 9 decimals)",
              "YES shares outstanding"
            ],
            "type": "u64"
          },
          {
            "name": "sharesNo",
            "docs": [
              "NO shares outstanding"
            ],
            "type": "u64"
          },
          {
            "name": "totalVolume",
            "docs": [
              "Cumulative trading volume (in lamports)"
            ],
            "type": "u64"
          },
          {
            "name": "createdAt",
            "docs": [
              "Market creation timestamp"
            ],
            "type": "i64"
          },
          {
            "name": "approvedAt",
            "docs": [
              "Proposal approval timestamp"
            ],
            "type": "i64"
          },
          {
            "name": "activatedAt",
            "docs": [
              "Market activation timestamp (trading enabled)"
            ],
            "type": "i64"
          },
          {
            "name": "resolutionProposedAt",
            "docs": [
              "Resolution proposal timestamp"
            ],
            "type": "i64"
          },
          {
            "name": "resolvedAt",
            "docs": [
              "Market resolution timestamp (deprecated, use finalized_at)"
            ],
            "type": "i64"
          },
          {
            "name": "finalizedAt",
            "docs": [
              "Market finalization timestamp (final outcome set)"
            ],
            "type": "i64"
          },
          {
            "name": "resolver",
            "docs": [
              "Resolver's wallet address"
            ],
            "type": "pubkey"
          },
          {
            "name": "proposedOutcome",
            "docs": [
              "Proposed outcome (Some(true)=YES, Some(false)=NO, None=INVALID)"
            ],
            "type": {
              "option": "bool"
            }
          },
          {
            "name": "finalOutcome",
            "docs": [
              "Final outcome after dispute period"
            ],
            "type": {
              "option": "bool"
            }
          },
          {
            "name": "ipfsEvidenceHash",
            "docs": [
              "IPFS hash of resolution evidence (46 bytes for CIDv0: Qm...)"
            ],
            "type": {
              "array": [
                "u8",
                46
              ]
            }
          },
          {
            "name": "disputeInitiatedAt",
            "docs": [
              "Dispute initiation timestamp"
            ],
            "type": "i64"
          },
          {
            "name": "disputeInitiator",
            "docs": [
              "User who initiated the dispute"
            ],
            "type": "pubkey"
          },
          {
            "name": "accumulatedProtocolFees",
            "docs": [
              "Protocol fees accumulated (3% default)"
            ],
            "type": "u64"
          },
          {
            "name": "accumulatedResolverFees",
            "docs": [
              "Resolver rewards accumulated (2% default)"
            ],
            "type": "u64"
          },
          {
            "name": "accumulatedLpFees",
            "docs": [
              "Liquidity provider fees accumulated (5% default)"
            ],
            "type": "u64"
          },
          {
            "name": "proposalLikes",
            "docs": [
              "Number of \"like\" votes for proposal"
            ],
            "type": "u32"
          },
          {
            "name": "proposalDislikes",
            "docs": [
              "Number of \"dislike\" votes for proposal"
            ],
            "type": "u32"
          },
          {
            "name": "proposalTotalVotes",
            "docs": [
              "Total proposal votes cast"
            ],
            "type": "u32"
          },
          {
            "name": "resolutionAgree",
            "docs": [
              "Number of \"agree with resolution\" votes"
            ],
            "type": "u32"
          },
          {
            "name": "resolutionDisagree",
            "docs": [
              "Number of \"disagree with resolution\" votes"
            ],
            "type": "u32"
          },
          {
            "name": "resolutionTotalVotes",
            "docs": [
              "Total resolution votes cast"
            ],
            "type": "u32"
          },
          {
            "name": "disputeAgree",
            "docs": [
              "Number of \"agree with dispute\" votes"
            ],
            "type": "u32"
          },
          {
            "name": "disputeDisagree",
            "docs": [
              "Number of \"disagree with dispute\" votes"
            ],
            "type": "u32"
          },
          {
            "name": "disputeTotalVotes",
            "docs": [
              "Total dispute votes cast"
            ],
            "type": "u32"
          },
          {
            "name": "wasDisputed",
            "docs": [
              "Flag indicating if market was disputed"
            ],
            "type": "bool"
          },
          {
            "name": "isCancelled",
            "docs": [
              "Market cancellation flag (admin only)"
            ],
            "type": "bool"
          },
          {
            "name": "cancelledAt",
            "docs": [
              "Market cancellation timestamp (if cancelled by admin)"
            ],
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "isLocked",
            "docs": [
              "Reentrancy guard (SECURITY: Finding #8)",
              "Set to true during sensitive operations to prevent concurrent access",
              "Prevents reentrancy attacks during lamport transfers"
            ],
            "type": "bool"
          },
          {
            "name": "reserved",
            "docs": [
              "Reserved space for future upgrades (119 bytes, reduced by 1 for is_locked)"
            ],
            "type": {
              "array": [
                "u8",
                119
              ]
            }
          },
          {
            "name": "bump",
            "docs": [
              "Bump seed for PDA derivation"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "marketActivated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "initialLiquidity",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "marketCancelled",
      "docs": [
        "Event emitted when a market is cancelled"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "cancelledBy",
            "type": "pubkey"
          },
          {
            "name": "cancelledAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "marketCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "bParameter",
            "type": "u64"
          },
          {
            "name": "state",
            "type": "u8"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "marketFinalized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "finalOutcome",
            "type": {
              "option": "bool"
            }
          },
          {
            "name": "wasDisputed",
            "type": "bool"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "marketResolved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "resolver",
            "type": "pubkey"
          },
          {
            "name": "outcome",
            "type": "bool"
          },
          {
            "name": "evidenceHash",
            "type": {
              "array": [
                "u8",
                46
              ]
            }
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "marketState",
      "docs": [
        "Market lifecycle states (7-state FSM)",
        "",
        "State transitions:",
        "PROPOSED → APPROVED → ACTIVE → RESOLVING → DISPUTED → FINALIZED",
        "→ (skip DISPUTED) → FINALIZED",
        "PROPOSED → CANCELLED (admin only)",
        "APPROVED → CANCELLED (admin only)"
      ],
      "repr": {
        "kind": "rust"
      },
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "proposed"
          },
          {
            "name": "approved"
          },
          {
            "name": "active"
          },
          {
            "name": "resolving"
          },
          {
            "name": "disputed"
          },
          {
            "name": "finalized"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "proposalAggregated",
      "docs": [
        "Proposal votes aggregated and approval decision made"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "likes",
            "type": "u32"
          },
          {
            "name": "dislikes",
            "type": "u32"
          },
          {
            "name": "approvalPercentage",
            "type": "u8"
          },
          {
            "name": "approved",
            "type": "bool"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "proposalApproved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "approvedBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "proposalVoteSubmitted",
      "docs": [
        "Event emitted when a proposal vote is submitted",
        "",
        "The backend listens for these events and aggregates votes off-chain.",
        "When the 70% approval threshold is reached, the backend calls",
        "approve_proposal to transition the market to APPROVED state."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketId",
            "docs": [
              "Market ID (not pubkey, the actual market_id bytes)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "user",
            "docs": [
              "User who voted"
            ],
            "type": "pubkey"
          },
          {
            "name": "vote",
            "docs": [
              "Vote choice (true = like, false = dislike)"
            ],
            "type": "bool"
          },
          {
            "name": "timestamp",
            "docs": [
              "Timestamp when vote was cast"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "protocolPauseStatusChanged",
      "docs": [
        "Event emitted when protocol pause status changes"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "isPaused",
            "type": "bool"
          },
          {
            "name": "pausedBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "sharesBought",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "outcome",
            "type": "bool"
          },
          {
            "name": "shares",
            "type": "u64"
          },
          {
            "name": "cost",
            "type": "u64"
          },
          {
            "name": "newPriceYes",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "sharesSold",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "outcome",
            "type": "bool"
          },
          {
            "name": "shares",
            "type": "u64"
          },
          {
            "name": "proceeds",
            "type": "u64"
          },
          {
            "name": "newPriceYes",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "userPosition",
      "docs": [
        "User's position in a specific market",
        "",
        "This account tracks a user's share holdings, cost basis,",
        "and claiming status for a single market.",
        "",
        "PDA Seeds: [\"position\", market.key(), user.key()]",
        "Size: 174 bytes (8 discriminator + 166 data)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "docs": [
              "Market this position belongs to"
            ],
            "type": "pubkey"
          },
          {
            "name": "user",
            "docs": [
              "User's wallet address"
            ],
            "type": "pubkey"
          },
          {
            "name": "sharesYes",
            "docs": [
              "YES shares held (fixed-point, 9 decimals)"
            ],
            "type": "u64"
          },
          {
            "name": "sharesNo",
            "docs": [
              "NO shares held (fixed-point, 9 decimals)"
            ],
            "type": "u64"
          },
          {
            "name": "totalInvested",
            "docs": [
              "Total amount invested (cost basis for tax tracking, in lamports)"
            ],
            "type": "u64"
          },
          {
            "name": "tradesCount",
            "docs": [
              "Number of trades executed"
            ],
            "type": "u32"
          },
          {
            "name": "lastTradeAt",
            "docs": [
              "Timestamp of last trade"
            ],
            "type": "i64"
          },
          {
            "name": "hasClaimed",
            "docs": [
              "Flag indicating if winnings have been claimed"
            ],
            "type": "bool"
          },
          {
            "name": "claimedAmount",
            "docs": [
              "Amount claimed (in lamports)"
            ],
            "type": "u64"
          },
          {
            "name": "reserved",
            "docs": [
              "Reserved space for future features (64 bytes)"
            ],
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "bump",
            "docs": [
              "Bump seed for PDA derivation"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "voteRecord",
      "docs": [
        "Individual vote record for proposal or dispute voting",
        "",
        "PDA Seeds: [b\"vote\", market_key, user_key, &[vote_type as u8]]",
        "",
        "This ensures one vote per (market, user, vote_type) tuple,",
        "preventing duplicate votes while allowing both proposal and",
        "dispute votes on the same market."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "docs": [
              "Market being voted on (32 bytes)"
            ],
            "type": "pubkey"
          },
          {
            "name": "user",
            "docs": [
              "User who cast the vote (32 bytes)"
            ],
            "type": "pubkey"
          },
          {
            "name": "voteType",
            "docs": [
              "Type of vote (Proposal or Dispute) (1 byte)"
            ],
            "type": {
              "defined": {
                "name": "voteType"
              }
            }
          },
          {
            "name": "vote",
            "docs": [
              "Vote value (1 byte)",
              "- For proposals: true = like/support, false = dislike/oppose",
              "- For disputes: true = support outcome change, false = reject change"
            ],
            "type": "bool"
          },
          {
            "name": "votedAt",
            "docs": [
              "Unix timestamp when vote was cast (8 bytes)"
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed (1 byte)"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "voteType",
      "docs": [
        "Type of vote being recorded"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "proposal"
          },
          {
            "name": "dispute"
          }
        ]
      }
    },
    {
      "name": "winningsClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "resolverFee",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
