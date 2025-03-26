import { Provider } from '@ethersproject/providers';
import set from 'lodash.set';
import { multicall3 } from '@/helpers/call';

export default class Multicaller {
  public network: string;
  public provider: Provider;
  public abi: any[];
  public options: any = {};
  public calls: [string, string, any[]?][] = [];
  public paths: string[] = [];

  constructor(network: string, provider: Provider, abi: any[], options?) {
    this.network = network;
    this.provider = provider;
    this.abi = abi;
    this.options = options || {};
  }

  call(path: string, address: string, fn: string, params?: any[]): Multicaller {
    this.calls.push([address, fn, params]);
    this.paths.push(path);
    return this;
  }

  async execute(
    options: { allowFailure: boolean } = { allowFailure: false }
  ): Promise<any> {
    const obj = {};
    const result = await multicall3(
      this.provider,
      this.abi,
      this.calls,
      options.allowFailure,
      this.options
    );

    result.forEach((r, i) => {
      const [success, data] = r;
      const result = success ? (data.length > 1 ? data : data[0]) : null;

      return set(obj, this.paths[i], result);
    });
    this.calls = [];
    this.paths = [];
    return obj;
  }
}
