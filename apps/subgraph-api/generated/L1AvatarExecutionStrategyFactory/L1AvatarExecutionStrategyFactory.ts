// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.

import {
  ethereum,
  JSONValue,
  TypedMap,
  Entity,
  Bytes,
  Address,
  BigInt,
} from "@graphprotocol/graph-ts";

export class ContractDeployed extends ethereum.Event {
  get params(): ContractDeployed__Params {
    return new ContractDeployed__Params(this);
  }
}

export class ContractDeployed__Params {
  _event: ContractDeployed;

  constructor(event: ContractDeployed) {
    this._event = event;
  }

  get contractAddress(): Address {
    return this._event.parameters[0].value.toAddress();
  }
}

export class L1AvatarExecutionStrategyFactory extends ethereum.SmartContract {
  static bind(address: Address): L1AvatarExecutionStrategyFactory {
    return new L1AvatarExecutionStrategyFactory(
      "L1AvatarExecutionStrategyFactory",
      address,
    );
  }

  deployedContracts(param0: BigInt): Address {
    let result = super.call(
      "deployedContracts",
      "deployedContracts(uint256):(address)",
      [ethereum.Value.fromUnsignedBigInt(param0)],
    );

    return result[0].toAddress();
  }

  try_deployedContracts(param0: BigInt): ethereum.CallResult<Address> {
    let result = super.tryCall(
      "deployedContracts",
      "deployedContracts(uint256):(address)",
      [ethereum.Value.fromUnsignedBigInt(param0)],
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  implementation(): Address {
    let result = super.call("implementation", "implementation():(address)", []);

    return result[0].toAddress();
  }

  try_implementation(): ethereum.CallResult<Address> {
    let result = super.tryCall(
      "implementation",
      "implementation():(address)",
      [],
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }
}

export class ConstructorCall extends ethereum.Call {
  get inputs(): ConstructorCall__Inputs {
    return new ConstructorCall__Inputs(this);
  }

  get outputs(): ConstructorCall__Outputs {
    return new ConstructorCall__Outputs(this);
  }
}

export class ConstructorCall__Inputs {
  _call: ConstructorCall;

  constructor(call: ConstructorCall) {
    this._call = call;
  }

  get _implementation(): Address {
    return this._call.inputValues[0].value.toAddress();
  }
}

export class ConstructorCall__Outputs {
  _call: ConstructorCall;

  constructor(call: ConstructorCall) {
    this._call = call;
  }
}

export class CreateContractCall extends ethereum.Call {
  get inputs(): CreateContractCall__Inputs {
    return new CreateContractCall__Inputs(this);
  }

  get outputs(): CreateContractCall__Outputs {
    return new CreateContractCall__Outputs(this);
  }
}

export class CreateContractCall__Inputs {
  _call: CreateContractCall;

  constructor(call: CreateContractCall) {
    this._call = call;
  }

  get _owner(): Address {
    return this._call.inputValues[0].value.toAddress();
  }

  get _target(): Address {
    return this._call.inputValues[1].value.toAddress();
  }

  get _starknetCore(): Address {
    return this._call.inputValues[2].value.toAddress();
  }

  get _executionRelayer(): BigInt {
    return this._call.inputValues[3].value.toBigInt();
  }

  get _starknetSpaces(): Array<BigInt> {
    return this._call.inputValues[4].value.toBigIntArray();
  }

  get _quorum(): BigInt {
    return this._call.inputValues[5].value.toBigInt();
  }

  get salt(): Bytes {
    return this._call.inputValues[6].value.toBytes();
  }
}

export class CreateContractCall__Outputs {
  _call: CreateContractCall;

  constructor(call: CreateContractCall) {
    this._call = call;
  }
}
