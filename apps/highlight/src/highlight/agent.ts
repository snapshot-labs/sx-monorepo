import { TypedDataField } from '@ethersproject/abstract-signer';
import { _TypedDataEncoder } from '@ethersproject/hash';
import { camelCase } from 'change-case';
import Process from './process';
import { PostMessageRequest } from './types';

export default class Agent {
  public id: string;
  public process: Process;
  public entrypoints: Record<
    string,
    Record<string, TypedDataField[]> | undefined
  > = {};

  constructor(id: string, process: Process) {
    this.id = id;
    this.process = process;
  }

  addEntrypoint(types: Record<string, TypedDataField[]>) {
    const primaryType = _TypedDataEncoder.getPrimaryType(types);
    this.entrypoints[primaryType] = types;
  }

  async invoke(request: PostMessageRequest) {
    const { primaryType, domain, message, signer } = request;

    const entrypointTypes = this.entrypoints[primaryType];
    if (!entrypointTypes) {
      throw new Error(`Entrypoint not found: ${primaryType}`);
    }

    const handler = (this as Record<string, any>)[camelCase(primaryType)];
    if (typeof handler === 'function') {
      return handler.bind(this)(message, { domain, signer });
    }

    throw new Error(`Handler not found: ${primaryType}`);
  }

  assert(condition: unknown, e: string) {
    if (!condition) throw new Error(e);
  }

  async has(key: string, id?: string) {
    return await this.process.has(id || this.id, key);
  }

  async get(key: string, id?: string): Promise<any> {
    return await this.process.get(id || this.id, key);
  }

  write(key: string, value: any) {
    this.process.write({
      agent: this.id,
      key,
      value
    });
  }

  delete(key: string) {
    this.process.delete({
      agent: this.id,
      key
    });
  }

  emit(key: string, data: any[]) {
    this.process.emit({
      agent: this.id,
      key,
      data
    });
  }
}
