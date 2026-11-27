---
'@snapshot-labs/sx': patch
---

Add the oracle voting strategy on Sepolia and `encodeOracleParams`, relay the strategy params a gasless message signed instead of computing them again, and fail instead of dropping a strategy whose voting power could not be loaded
