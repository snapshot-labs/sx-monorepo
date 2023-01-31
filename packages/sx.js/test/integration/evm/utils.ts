import { Signer } from '@ethersproject/abstract-signer';
import { ContractFactory, ContractInterface } from '@ethersproject/contracts';

type ContractDetails = {
  abi: ContractInterface;
  bytecode: {
    object: string;
  };
};

export async function deployDependency(signer: Signer, contractDetails: ContractDetails) {
  const factory = new ContractFactory(contractDetails.abi, contractDetails.bytecode.object, signer);

  const contract = await factory.deploy();

  return contract.address;
}
