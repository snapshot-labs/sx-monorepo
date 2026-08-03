---
'@snapshot-labs/sx': patch
---

Decode the real recipient for ERC-20 transfers in `convertToTransaction`. `createSendTokenTransaction` now takes an explicit `recipient` that defaults to `data.target`, and the `transfer(address,uint256)` branch of `decodeExecution` passes the decoded address instead of falling back to the target. Previously `_form.recipient` was the token contract for every ERC-20 transfer, so the UI named the token as the payee. The transaction destination (`to`) is unchanged and remains the token contract.
