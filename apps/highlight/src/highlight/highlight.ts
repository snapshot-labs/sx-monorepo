import { TypedDataField } from '@ethersproject/abstract-signer';
import {
  HIGHLIGHT_DOMAIN,
  HIGHLIGHT_STARKNET_DOMAIN,
  STARKNET_DOMAIN_TYPE
} from '@snapshot-labs/sx';
import AsyncLock from 'async-lock';
import { RpcProvider, StarknetDomain } from 'starknet';
import { Adapter } from './adapter/adapter';
import Agent from './agent';
import Process from './process';
import { verifySignature } from './signatures';
import {
  Event,
  GetUnitReceiptRequest,
  PostMessageRequest,
  Unit
} from './types';

type AgentGetter = (process: Process) => Agent;

export default class Highlight {
  private adapter: Adapter;
  private asyncLock = new AsyncLock();
  public agents: Record<string, AgentGetter | undefined>;

  constructor({
    adapter,
    agents
  }: {
    adapter: Adapter;
    agents: Record<string, AgentGetter>;
  }) {
    this.adapter = adapter;
    this.agents = agents;
  }

  async postMessage(request: PostMessageRequest) {
    const process = new Process({ adapter: this.adapter });

    await this.validateSignature(process, request);

    return this.asyncLock.acquire('postMessage', () =>
      this._postMessage(process, request)
    );
  }

  async _postMessage(process: Process, request: PostMessageRequest) {
    let steps = 0;

    const salt = await this.adapter.get(`salts:${request.domain.salt}`);
    if (salt) {
      throw new Error('Salt already used');
    }

    await this.invoke(process, request);

    const execution = await process.execute();
    steps = process.steps;

    let id: number = (await this.adapter.get('units:id')) || 0;

    const unit: Unit = {
      id,
      version: '0x1',
      timestamp: ~~(Date.now() / 1e3),
      message: request
    };

    id++;
    const multi = this.adapter.multi();
    multi.set(`unit:${id}`, unit);
    multi.set(`unit_events:${id}`, execution.events);
    multi.set('units:id', id);
    multi.set(`salts:${request.domain.salt}`, true);

    await multi.exec();

    return {
      joint: { unit },
      events: execution.events || [],
      unit_id: id,
      steps
    };
  }

  async validateSignature(process: Process, request: PostMessageRequest) {
    const verifyingContract = request.domain.verifyingContract.toLowerCase();

    const getAgent = this.agents[verifyingContract];
    if (!getAgent) {
      throw new Error(`Agent not found: ${verifyingContract}`);
    }

    const agent = getAgent(process);

    const entrypointTypes = agent.entrypoints[request.primaryType];
    if (!entrypointTypes) {
      throw new Error(`Entrypoint not found: ${request.primaryType}`);
    }
    const validationFn = request.domain.revision
      ? this.validateStarknetSignature
      : this.validateEvmSignature;

    return validationFn(request, entrypointTypes);
  }

  async invoke(process: Process, request: PostMessageRequest) {
    const agentAddress = request.domain.verifyingContract.toLowerCase();

    const getAgent = this.agents[agentAddress];
    if (!getAgent) {
      throw new Error(`Agent not found: ${agentAddress}`);
    }

    const agent = getAgent(process);

    return agent.invoke(request);
  }

  async getUnitReceipt(params: GetUnitReceiptRequest) {
    const [unit, events]: [Unit | undefined, Event[] | undefined] =
      await Promise.all([
        this.adapter.get(`unit:${params.id}`),
        this.adapter.get(`unit_events:${params.id}`)
      ]);

    if (!unit) {
      throw new Error(`Unit ${params.id} not found`);
    }

    return {
      unit,
      events: events?.filter(event => event !== null) ?? []
    };
  }

  async getMci() {
    return await this.adapter.get('units:id');
  }

  async reset() {
    return await this.adapter.reset();
  }

  private async validateEvmSignature(
    request: PostMessageRequest,
    types: Record<string, TypedDataField[]>
  ) {
    const { domain, signature, signer, message } = request;
    const verifyingDomain = {
      ...HIGHLIGHT_DOMAIN,
      chainId: domain.chainId,
      salt: domain.salt.toString(),
      verifyingContract: domain.verifyingContract
    };

    const isSignatureValid = await verifySignature(
      verifyingDomain,
      signer,
      types,
      message,
      signature,
      {
        ecdsa: true,
        eip1271: true
      }
    );

    if (!isSignatureValid) {
      throw new Error('Invalid signature');
    }
  }

  private async validateStarknetSignature(
    request: PostMessageRequest,
    types: Record<string, TypedDataField[]>
  ) {
    const { domain, signature, signer, message, primaryType } = request;
    const verifyingDomain: StarknetDomain = {
      ...HIGHLIGHT_STARKNET_DOMAIN,
      chainId: domain.chainId.toString()
    };

    try {
      const provider = new RpcProvider({
        // TODO: make the network support sn and sn-sep
        nodeUrl: `https://rpc.snapshot.org/sn`
      });

      // Check if the contract is deployed
      // Will throw on non-deployed contract
      await provider.getClassAt(signer);

      const data = {
        domain: verifyingDomain,
        // Re-injecting the StarknetDomain type, stripped by the agent
        types: { ...types, StarknetDomain: STARKNET_DOMAIN_TYPE },
        primaryType,
        message
      };

      provider.verifyMessageInStarknet(data, signature.split(','), signer);
    } catch (e: any) {
      if (e.message.includes('Contract not found')) {
        throw new Error('Invalid signature: contract not deployed');
      }

      throw e;
    }
  }
}
