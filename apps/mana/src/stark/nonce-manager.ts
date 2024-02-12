import { Account } from 'starknet';
import { Mutex, MutexInterface } from 'async-mutex';

export class NonceManager {
  private mutex = new Mutex();
  private account: Account;
  private nextNonce = -1n;

  private releaseMutex: MutexInterface.Releaser | null = null;

  constructor(account: Account) {
    this.account = account;
  }

  async acquire() {
    this.releaseMutex = await this.mutex.acquire();
  }

  async getNonce(): Promise<string> {
    if (!this.releaseMutex) {
      throw new Error('Tried getting nonce without acquiring mutex first');
    }

    const actualNonce = BigInt(await this.account.getNonce());

    if (actualNonce > this.nextNonce) {
      this.nextNonce = actualNonce;
    }

    return this.nextNonce.toString();
  }

  increaseNonce() {
    this.nextNonce++;
  }

  release() {
    if (!this.releaseMutex) {
      console.warn('Tried releasing mutex without acquiring it first');
      return;
    }

    this.releaseMutex();
    this.releaseMutex = null;
  }
}
