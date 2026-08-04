---
'@snapshot-labs/sx': minor
---

Decode the real recipient for ERC-20 transfers in `convertToTransaction`. Previously `_form.recipient` was the token contract for every ERC-20 transfer, so the UI named the token as the payee. The `transfer(address,uint256)` branch of `decodeExecution` now passes the decoded address. The transaction destination (`to`) is unchanged and remains the token contract.

Breaking: `createSendTokenTransaction` now takes `recipient` as a required argument, positioned before `amount` (`data, recipient, amount, token`). It previously defaulted to `data.target`, which silently produced the wrong recipient for any caller that omitted it.
