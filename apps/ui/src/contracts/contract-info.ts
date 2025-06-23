// import { SELECTED_CHAIN } from "../lib/chain-configs";

import spaceContract from './abi/space-contract-abi.json';
import vanillaAuthenticator from './abi/vanilla-authenticator.json';
import vanillaExecutionStrategy from './abi/vanilla-execution-strategy.json';
import vanillaProposalValidationStrategy from './abi/vanilla-proposal-validation-strategy.json';
import vanillaVotingStrategy from './abi/vanilla-voting-strategy.json';

export const SPACE_CONTRACT = {
  abi: spaceContract.abi,
  bytecode: spaceContract.bytecode
};

export const VANILLA_AUTHENTICATOR = {
  abi: vanillaAuthenticator.abi,
  bytecode: vanillaAuthenticator.bytecode
};

export const VANILLA_PROPOSAL_VALIDATION_STRATEGY = {
  abi: vanillaProposalValidationStrategy.abi,
  bytecode: vanillaProposalValidationStrategy.bytecode
};

export const VANILLA_VOTING_STRATEGY = {
  abi: vanillaVotingStrategy.abi,
  bytecode: vanillaVotingStrategy.bytecode
};

export const VANILLA_EXECUTION_STRATEGY = {
  abi: vanillaExecutionStrategy.abi,
  bytecode: vanillaExecutionStrategy.bytecode
};

const arr = JSON.parse(localStorage.getItem('deployedContracts') || '[]');
let changed = false;
arr.forEach(s => {
  if (s.network === 'base-sepolia') s.network = 'base-sep';
  if (!s.voting_types) {
    s.voting_types = ['basic'];
    changed = true;
  }
  if (!s.privacy) {
    s.privacy = 'none';
    changed = true;
  }
});
if (changed) {
  localStorage.setItem('deployedContracts', JSON.stringify(arr, null, 2));
}
