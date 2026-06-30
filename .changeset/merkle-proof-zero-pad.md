---
'@snapshot-labs/sx': patch
---

Zero-pad merkle whitelist proof elements to 32 bytes before encoding. The whitelist proof server (wls.snapshot.box) can return proof elements with a stripped leading zero byte (31 bytes), which caused an on-chain `InvalidProof()` revert for whitelisted voters whose proof contained a hash starting with a zero byte.
