import { EventEmitter } from 'stream';
import AsyncLock from 'async-lock';
import { Adapter } from './adapter/adapter';
import Agent from './agent';
import Process from './process';
import { BASE_DOMAIN, verifySignature } from './signatures';
import {
  Event,
  GetUnitReceiptRequest,
  PostMessageRequest,
  Unit
} from './types';

type AgentGetter = (process: Process) => Agent;

export default class Highlight extends EventEmitter {
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
    super();
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

    this.emit('events', execution.events || []);

    return {
      joint: { unit },
      events: execution.events || [],
      unit_id: id,
      steps
    };
  }

  async validateSignature(process: Process, request: PostMessageRequest) {
    const { domain, signer, signature, message } = request;

    const getAgent = this.agents[domain.verifyingContract.toLowerCase()];
    if (!getAgent) {
      throw new Error(`Agent not found: ${domain.verifyingContract}`);
    }

    const agent = getAgent(process);

    const entrypointTypes = agent.entrypoints[request.primaryType];
    if (!entrypointTypes) {
      throw new Error(`Entrypoint not found: ${request.primaryType}`);
    }

    const verifyingDomain = {
      ...BASE_DOMAIN,
      chainId: domain.chainId,
      salt: domain.salt.toString(),
      verifyingContract: domain.verifyingContract
    };

    const isSignatureValid = await verifySignature(
      verifyingDomain,
      signer,
      entrypointTypes,
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
}
