import { describe, expect, it } from 'vitest';
import {
  getEnsTextRecord,
  getNameOwner,
  getResolver,
  getSpaceController
} from './ens';

const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';

describe('ens', () => {
  describe('getNameOwner', () => {
    describe('for names migrated to ENSv2', () => {
      // ownership does not bridge v1 to v2: the legacy registry has no owner
      it('should return the owner of a migrated name on testnet', async () => {
        const owner = await getNameOwner('test123.eth', 11155111);
        expect(owner).toBe('0x1208a26FAa0F4AC65B42098419EB4dAA5e580AC6');
      }, 10000);

      it('should resolve the same address as the space controller', async () => {
        const controller = await getSpaceController('test123.eth', 11155111);
        expect(controller).toBe('0x1208a26FAa0F4AC65B42098419EB4dAA5e580AC6');
      }, 10000);
    });

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

      // the DNS resolver answers subdomains with a revert the fail-closed
      // classifier does not accept, matching snapshot.js
      it('should reject for subdomains', async () => {
        await expect(getNameOwner('web3.wanki.moe', 1)).rejects.toThrow();
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

      it('should reject when the domain does not exist', async () => {
        await expect(
          getNameOwner('lucemans-test-not-exist.cbars.id', 1)
        ).rejects.toThrow();
      }, 10000);
    });
  });

  describe('getEnsTextRecord', () => {
    it('should read a record through the Universal Resolver', async () => {
      const record = await getEnsTextRecord('ens.eth', 'avatar', 1);
      expect(record).toMatch(/^https?:\/\//);
    }, 10000);

    it('should return null for an unset record', async () => {
      const record = await getEnsTextRecord('vitalik.eth', 'snapshot', 1);
      expect(record).toBe(null);
    }, 10000);

    // un-imported DNS domains answer every read with a resolver-level revert
    it('should return null for an un-imported DNS domain', async () => {
      const record = await getEnsTextRecord('facebook.com', 'snapshot', 1);
      expect(record).toBe(null);
    }, 10000);
  });

  describe('getResolver', () => {
    // a migrated name's resolver lives in the ENSv2 registry, not the v1 one
    it('should return the ENSv2 resolver of a migrated name on testnet', async () => {
      const resolver = await getResolver('test123.eth', 11155111);
      expect(resolver).toBe('0x7cF791B101633754dE5Ea5Cb186cfEFf4163ccC3');
    }, 10000);

    it('should return the v1 resolver of an unmigrated name on testnet', async () => {
      const resolver = await getResolver('boorger.eth', 11155111);
      expect(resolver).toBe('0x8FADE66B79cC9f707aB26799354482EB93a5B7dD');
    }, 10000);

    it('should return the v1 resolver on mainnet', async () => {
      const resolver = await getResolver('ens.eth', 1);
      expect(resolver).toBe('0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41');
    }, 10000);

    it('should return an empty address for a name without its own resolver', async () => {
      const resolver = await getResolver('lucemans.cb.id', 1);
      expect(resolver).toBe(EMPTY_ADDRESS);
    }, 10000);
  });

  describe('getSpaceController', () => {
    it('should resolve a controller from the snapshot record', async () => {
      const controller = await getSpaceController('stakedao.eth', 1);
      expect(controller).toBe('0xB0552b6860CE5C0202976Db056b5e3Cc4f9CC765');
    }, 10000);

    it('should resolve a DNS-imported space through its DNS owner', async () => {
      const controller = await getSpaceController('defi.app', 1);
      expect(controller).toBe('0x7aeB96261e9dC2C9f01BaE6A516Df80a5a98c7eB');
    }, 10000);

    it('should return an empty address for an un-imported DNS domain', async () => {
      const controller = await getSpaceController('facebook.com', 1);
      expect(controller).toBe(EMPTY_ADDRESS);
    }, 10000);
  });
});
