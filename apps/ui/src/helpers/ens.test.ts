import { describe, expect, it } from 'vitest';
import { getNameOwner } from './ens';

describe('ens', () => {
  describe('getNameOwner', () => {
    describe('for names using the onchain resolver', () => {
      it('should return the owner of the name on mainnet', async () => {
        const owner = await getNameOwner('ens.eth', 1);
        expect(owner).toBe('0xb6E040C9ECAaE172a89bD561c5F73e1C48d28cd9');
      });

      it('should return the owner of the name on testnet', async () => {
        const owner = await getNameOwner('ens.eth', 11155111);
        expect(owner).toBe('0x179A862703a4adfb29896552DF9e307980D19285');
      });

      it('should return an empty address if the name does not exist on mainnet', async () => {
        const owner = await getNameOwner('nonexistent-random-name.eth', 1);
        expect(owner).toBe('0x0000000000000000000000000000000000000000');
      });

      it('should return an empty address if the name does not exist on testnet', async () => {
        const owner = await getNameOwner(
          'nonexistent-random-name.eth',
          11155111
        );
        expect(owner).toBe('0x0000000000000000000000000000000000000000');
      });
    });

    describe('for other TLDs using an offchain DNS resolver', () => {
      it('should return the owner of the domain name', async () => {
        const owner = await getNameOwner('wanki.moe', 1);
        expect(owner).toBe('0xd410007411572127c77b4c3ff88696865a589A2b');
      }, 10000);

      it('should return an empty address when the domain name is not imported', async () => {
        const owner = await getNameOwner('facebook.com', 1);
        expect(owner).toBe('0x0000000000000000000000000000000000000000');
      }, 10000);

      it('should return an empty address for subdomains', async () => {
        const owner = await getNameOwner('web3.wanki.moe', 1);
        expect(owner).toBe('0x0000000000000000000000000000000000000000');
      }, 10000);
    });

    describe('for subdomains using an offchain resolver', () => {
      it('should return the resolved address of the subdomain', async () => {
        const owner = await getNameOwner('lucemans.cb.id', 1);
        expect(owner).toBe('0x4e7abb71BEe38011c54c30D0130c0c71Da09222b');
      }, 10000);

      it('should return an empty address when the subdomain does not exist', async () => {
        const owner = await getNameOwner('lucemans-test-not-exist.cb.id', 1);
        expect(owner).toBe('0x0000000000000000000000000000000000000000');
      }, 10000);

      it('should return an empty address when the domain does not exist', async () => {
        const owner = await getNameOwner('lucemans-test-not-exist.cbars.id', 1);
        expect(owner).toBe('0x0000000000000000000000000000000000000000');
      }, 10000);
    });
  });
});
