# Proposals & Votes CB Flow

## CB States

| Value | Constant | Proposals | Votes |
|------:|----------|-----------|-------|
| 0 | `PENDING_SYNC` | Default. Waiting for strategy values from Overlord | N/A |
| -1 | `PENDING_COMPUTE` | Strategy values synced. Waiting for `scores_total_value` computation | Default. Waiting for `vp_value` computation |
| -2 | `PENDING_FINAL` | Score value computed, but proposal still active | Value computed, but `vp_state` not final |
| 1 | `FINAL` | Fully computed | Fully computed |
| -3 | `PENDING_DELETE` | N/A | Proposal deleted, vote awaiting async cleanup |
| -10 | `INELIGIBLE` | Invalid payload format, cannot compute (permanent) | Invalid data, cannot compute (permanent) |
| -11 | `ERROR_SYNC` | Overlord sync failed, will be retried | N/A |

> 🟦 Blue = user action &nbsp;&nbsp; 🟧 Orange = async background script

## Proposals State Diagram

```mermaid
flowchart TD
    A([Proposal Created]):::user --> B["cb = 0<br>PENDING_SYNC"]
    B -->|proposalStrategiesValue.ts<br>fetches USD values from Overlord| C{Success?}
    C -->|Yes| D["cb = -1<br>PENDING_COMPUTE"]
    C -->|No, status 400| G
    C -->|No, other error| E["cb = -11<br>ERROR_SYNC"]
    E -->|Retried next cycle| C
    D -->|proposalsScoresValue.ts<br>computes scores_total_value| F{Valid payload?}
    F -->|No| G["cb = -10<br>INELIGIBLE"]
    F -->|Yes| H{scores_state<br>final?}
    H -->|Yes| I["cb = 1<br>FINAL"]
    H -->|No| J["cb = -2<br>PENDING_FINAL"]
    J -->|New vote arrives<br>scores.ts| D

    classDef user fill:#4a90d9,color:#fff
    classDef async fill:#e8833a,color:#fff

    class A user
    class C,F,H async
    class B,D,E,G,I,J default

    linkStyle 0 stroke:#4a90d9
    linkStyle 1,2,3,4,5,6,7,8,9,10 stroke:#e8833a
    linkStyle 11 stroke:#4a90d9
```

## Votes State Diagram

```mermaid
flowchart TD
    A([Vote Created]):::user --> B["cb = -1<br>PENDING_COMPUTE"]
    B -->|votesVpValue.ts| F{Proposal<br>ineligible?}
    F -->|Yes| G["cb = -10<br>INELIGIBLE"]
    F -->|No| C{vp_state<br>final?}
    C -->|Yes| D["cb = 1<br>FINAL"]
    C -->|No| E["cb = -2<br>PENDING_FINAL"]
    E -->|New vote on same proposal<br>triggers scores.ts<br>vp recalculated| B

    B -->|delete-proposal| H["cb = -3<br>PENDING_DELETE"]
    D -->|delete-proposal| H
    E -->|delete-proposal| H
    G -->|delete-proposal| H
    H -->|deleteProposalVotes.ts<br>async cleanup| I([Vote Deleted])

    classDef user fill:#4a90d9,color:#fff
    classDef async fill:#e8833a,color:#fff

    class A user
    class F,C async
    class B,D,E,G,H default
    class I default

    linkStyle 0 stroke:#4a90d9
    linkStyle 1,2,3,4,5 stroke:#e8833a
    linkStyle 6 stroke:#4a90d9
    linkStyle 7,8,9,10 stroke:#4a90d9
    linkStyle 11 stroke:#e8833a
```
