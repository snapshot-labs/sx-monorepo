// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.18;

import { IEvmFactRegistryModule } from "./IEvmFactRegistryModule.sol";

// Vendored from HerodotusDev/herodotus-evm-v2, branch feat/apechain-fact-registry-3,
// src/interfaces/ISatellite.sol
//
// Upstream aggregates 21 module interfaces; only the fact registry module is
// reachable from this codebase, so the other 20 are omitted.
interface ISatellite is IEvmFactRegistryModule {}
