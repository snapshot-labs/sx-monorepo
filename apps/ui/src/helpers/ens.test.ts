import { defaultAbiCoder, Interface } from '@ethersproject/abi';
import { VoidSigner } from '@ethersproject/abstract-signer';
import { Contract } from '@ethersproject/contracts';
import { namehash } from '@ethersproject/hash';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  dnsEncodeName,
  ENS_REGISTRY_ADDRESS,
  getEnsTextRecord,
  getNameOwner,
  getResolver,
  getSpaceController,
  resetEnsV2Cache,
  resolveName,
  setEnsTextRecord
} from './ens';
import { getProvider } from './provider';

afterEach(() => {
  vi.restoreAllMocks();
  resetEnsV2Cache();
});

const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';
const UNIVERSAL_HELPER = '0x33f571aa8A160a21b877cF6E0Fb8806692b97DF5';
const RETIRED_ROOT_REGISTRY = '0xc960f7217d3643b525ef36bec8adf86953cd9ab8';
const ENS_V2 = new Interface([
  'function ROOT_REGISTRY() view returns (address)',
  'function findExactOwner(bytes) view returns (address)',
  'function findResolver(bytes) view returns (address, bytes32, uint256)'
]);

function stubEnsV2(
  handlers: Record<string, (to: string) => string | Error | undefined>
) {
  const provider = getProvider(11155111);
  const original = provider.call.bind(provider);

  return vi.spyOn(provider, 'call').mockImplementation(async (tx, blockTag) => {
    const data = String(await tx.data);
    const fn = Object.keys(handlers).find(name =>
      data.startsWith(ENS_V2.getSighash(name))
    );
    const result = fn && handlers[fn](String(await tx.to));
    if (!result) return original(tx, blockTag);
    if (result instanceof Error) throw result;
    return result;
  });
}

describe('ens', () => {
  describe('dnsEncodeName', () => {
    it('should encode each label with a raw length byte', () => {
      expect(dnsEncodeName('test123.eth')).toBe('0x07746573743132330365746800');
      expect(dnsEncodeName(`${'a'.repeat(84)}.eth`)).toBe(
        `0x54${'61'.repeat(84)}0365746800`
      );
    });

    it('should encode a label longer than 255 bytes as its labelhash', () => {
      expect(dnsEncodeName(`${'a'.repeat(256)}.eth`)).toBe(
        `0x42${Buffer.from(
          '[1daa7034adab66d9ec9e03e2c89201b83a7497e85dc5b971aa9dae2ccbb7a208]'
        ).toString('hex')}0365746800`
      );
    });
  });

  describe('getNameOwner', () => {
    describe('for names registered in ENSv2', () => {
      it('should return the owner of an ENSv2 name on testnet', async () => {
        const owner = await getNameOwner('john1.eth', 11155111);
        expect(owner).toBe('0xF7f2639C67b58D978DB1Db166AF0501Da903f3A3');
      }, 10000);

      it('should resolve a case variant to the same owner', async () => {
        const owner = await getNameOwner('JOHN1.eth', 11155111);
        expect(owner).toBe('0xF7f2639C67b58D978DB1Db166AF0501Da903f3A3');
      }, 10000);

      it('should resolve the same address as the space controller', async () => {
        const controller = await getSpaceController('john1.eth', 11155111);
        expect(controller).toBe('0xF7f2639C67b58D978DB1Db166AF0501Da903f3A3');
      }, 10000);
    });

    describe('for names not migrated to ENSv2 on testnet', () => {
      it('should still resolve a DNS-imported domain through its DNS owner', async () => {
        const owner = await getNameOwner('ethplay.org', 11155111);
        expect(owner).toBe('0x8D852E6cC57A855D0D75E1e2af57C9679D555958');
      }, 10000);

      it('should still resolve a DNS-imported domain without a resolver through its registry owner', async () => {
        const owner = await getNameOwner('gregskril.com', 11155111);
        expect(owner).toBe('0x179A862703a4adfb29896552DF9e307980D19285');
      }, 10000);

      it('should still resolve a subdomain through the registry', async () => {
        const owner = await getNameOwner('vote.vptest2.eth', 11155111);
        expect(owner).toBe('0x385517332F46b20B4F7340a80c011b2973ac622e');
      }, 10000);

      it.each([
        ['a label longer than 63 bytes', `${'a'.repeat(84)}.eth`],
        [
          'a label longer than 255 bytes as its labelhash',
          `${'a'.repeat(256)}.eth`
        ],
        ['a multi-byte emoji label', '🧛🏻‍♂🧛🏻‍♂🧛🏻‍♂🧛🏻‍♂🧛🏻‍♂🧛🏻‍♂.eth']
      ])(
        'should encode %s',
        async (label, name) => {
          const owner = await getNameOwner(name, 11155111);
          expect(owner).toBe('0x0000000000000000000000000000000000000000');
        },
        10000
      );
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

      it('should not answer a DNS domain on testnet from mainnet', async () => {
        const owner = await getNameOwner('defi.app', 11155111);
        expect(owner).toBe('0x0000000000000000000000000000000000000000');
      }, 10000);
    });
  });

  describe('getEnsTextRecord', () => {
    it('should read a record through the Universal Resolver', async () => {
      const record = await getEnsTextRecord(
        'boorger.eth',
        'snapshot',
        11155111
      );
      expect(record).toBe('0x220bc93D88C0aF11f1159eA89a885d5ADd3A7Cf6');
    }, 10000);

    it('should return null for an unset record', async () => {
      const record = await getEnsTextRecord(
        'demodao.eth',
        'snapshot',
        11155111
      );
      expect(record).toBe(null);
    }, 10000);

    it('should return null for a name without a resolver', async () => {
      const record = await getEnsTextRecord(
        'nonexistent-random-name.eth',
        'snapshot',
        11155111
      );
      expect(record).toBe(null);
    }, 10000);

    it('should return null for an un-imported DNS domain', async () => {
      const record = await getEnsTextRecord(
        'facebook.com',
        'snapshot',
        11155111
      );
      expect(record).toBe(null);
    }, 10000);

    it('should reject when the resolver fails', async () => {
      await expect(
        getEnsTextRecord('dblog.eth', 'snapshot', 11155111)
      ).rejects.toThrow();
    }, 10000);

    it('should leave chains without a Universal Resolver on the v1 path', async () => {
      const record = await getEnsTextRecord('stakedao.eth', 'snapshot', 1);
      expect(record).toBe('0xB0552b6860CE5C0202976Db056b5e3Cc4f9CC765');
    }, 10000);
  });

  describe('resolveName', () => {
    it('should normalize the name before resolving', async () => {
      const address = await resolveName('BOORGER.eth', 11155111);
      expect(address).toBe('0x220bc93D88C0aF11f1159eA89a885d5ADd3A7Cf6');
    }, 10000);
  });

  describe('getResolver', () => {
    it('should return the resolver of an ENSv2 name on testnet', async () => {
      const resolver = await getResolver('john1.eth', 11155111);
      expect(resolver).toBe('0xa0BC06a89DEfEf9bc09BF8F2f3d3229ed56F96B8');
    }, 10000);

    it('should normalize the name before resolving', async () => {
      const resolver = await getResolver('JOHN1.eth', 11155111);
      expect(resolver).toBe('0xa0BC06a89DEfEf9bc09BF8F2f3d3229ed56F96B8');
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
      expect(resolver).toBe('0x0000000000000000000000000000000000000000');
    }, 10000);
  });

  describe('setEnsTextRecord', () => {
    it.each([
      [
        'ENSv2',
        'JOHN1.eth',
        11155111,
        '0xF7f2639C67b58D978DB1Db166AF0501Da903f3A3',
        '0xa0BC06a89DEfEf9bc09BF8F2f3d3229ed56F96B8'
      ],
      [
        'ENSv1',
        'ens.eth',
        1,
        '0xb6E040C9ECAaE172a89bD561c5F73e1C48d28cd9',
        '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41'
      ],
      [
        'ENSv1 on Sepolia',
        'ens.eth',
        11155111,
        '0x179A862703a4adfb29896552DF9e307980D19285',
        '0x8FADE66B79cC9f707aB26799354482EB93a5B7dD'
      ]
    ] as const)(
      'should encode an accepted %s controller update',
      async (version, name, chainId, owner, resolver) => {
        const provider = getProvider(chainId);
        const signer = new VoidSigner(owner, provider);
        const intercepted = new Error('Transaction intercepted');
        const send = vi
          .spyOn(signer, 'sendTransaction')
          .mockRejectedValue(intercepted);

        await expect(
          setEnsTextRecord(signer, name, 'snapshot', owner, chainId)
        ).rejects.toBe(intercepted);
        expect(send).toHaveBeenCalledOnce();

        const isV2 = version === 'ENSv2';
        const setter = new Interface([
          `function setText(${isV2 ? 'bytes' : 'bytes32'},string,string)`
        ]);
        const transaction = send.mock.calls[0][0];
        expect(transaction).toMatchObject({
          to: resolver,
          data: setter.encodeFunctionData('setText', [
            isV2 ? '0x056a6f686e310365746800' : namehash(name),
            'snapshot',
            owner
          ])
        });
        await expect(
          provider.call({ ...transaction, from: owner })
        ).resolves.toBe('0x');
      },
      10000
    );
  });

  describe('stale ENSv1 records below an ENSv2 name', () => {
    beforeAll(async () => {
      const registry = new Contract(
        ENS_REGISTRY_ADDRESS,
        [
          'function owner(bytes32) view returns (address)',
          'function resolver(bytes32) view returns (address)'
        ],
        getProvider(11155111)
      );
      const node = namehash('tiny.fox.eth');
      expect(await registry.owner(node)).not.toBe(EMPTY_ADDRESS);
      expect(await registry.resolver(node)).not.toBe(EMPTY_ADDRESS);
    });

    it.each([
      ['getNameOwner', getNameOwner],
      ['getSpaceController', getSpaceController],
      ['getResolver', getResolver]
    ] as const)(
      '%s should not fall back to ENSv1',
      async (_name, lookup) => {
        expect(await lookup('tiny.fox.eth', 11155111)).toBe(EMPTY_ADDRESS);
      },
      10000
    );

    it(
      'should not update the stale ENSv1 resolver',
      async () => {
        const signer = new VoidSigner(
          '0x7Bc153b2a4C8a2f3428bd0da77a901b81c6dD809',
          getProvider(11155111)
        );
        const send = vi
          .spyOn(signer, 'sendTransaction')
          .mockRejectedValue(new Error('Transaction intercepted'));

        await expect(
          setEnsTextRecord(
            signer,
            'tiny.fox.eth',
            'snapshot',
            EMPTY_ADDRESS,
            11155111
          )
        ).rejects.toThrow('No resolver set for name');
        expect(send).not.toHaveBeenCalled();
      },
      10000
    );
  });

  describe.each([
    ['getNameOwner', getNameOwner],
    ['getResolver', getResolver]
  ] as const)('%s helper failures', (_name, lookup) => {
    it(
      'should throw when the helper reads a root registry the resolver does not',
      async () => {
        const rpc = stubEnsV2({
          ROOT_REGISTRY: to =>
            to === UNIVERSAL_HELPER
              ? defaultAbiCoder.encode(['address'], [RETIRED_ROOT_REGISTRY])
              : undefined
        });

        await expect(lookup('john1.eth', 11155111)).rejects.toThrow(
          'root registry'
        );
        expect(
          rpc.mock.calls.map(([tx]) => String(tx.data).slice(0, 10))
        ).not.toContain(ENS_V2.getSighash('findExactOwner'));
      },
      10000
    );

    it.each(['CALL_EXCEPTION', 'SERVER_ERROR'])(
      'should propagate %s instead of falling back to ENSv1',
      async code => {
        const error = Object.assign(new Error('Helper failed'), { code });
        stubEnsV2({ findExactOwner: () => error });

        await expect(lookup('john1.eth', 11155111)).rejects.toBe(error);
      },
      10000
    );

    it.each(['CALL_EXCEPTION', 'SERVER_ERROR'])(
      'should propagate %s when checking ENSv1 delegation',
      async code => {
        const error = Object.assign(new Error('Resolver lookup failed'), {
          code
        });
        stubEnsV2({
          findExactOwner: () =>
            defaultAbiCoder.encode(['address'], [EMPTY_ADDRESS]),
          findResolver: () => error
        });

        await expect(lookup('ens.eth', 11155111)).rejects.toBe(error);
      },
      10000
    );
  });

  describe('getSpaceController', () => {
    it('should resolve a controller from the snapshot record', async () => {
      const controller = await getSpaceController('boorger.eth', 11155111);
      expect(controller).toBe('0x220bc93D88C0aF11f1159eA89a885d5ADd3A7Cf6');
    }, 10000);

    it('should resolve a DNS-imported space through its DNS owner', async () => {
      const controller = await getSpaceController('ethplay.org', 11155111);
      expect(controller).toBe('0x8D852E6cC57A855D0D75E1e2af57C9679D555958');
    }, 10000);

    it('should resolve a DNS-imported space without a resolver through its registry owner', async () => {
      const controller = await getSpaceController('gregskril.com', 11155111);
      expect(controller).toBe('0x179A862703a4adfb29896552DF9e307980D19285');
    }, 10000);

    it('should return an empty address for an un-imported DNS domain', async () => {
      const controller = await getSpaceController('facebook.com', 11155111);
      expect(controller).toBe(EMPTY_ADDRESS);
    }, 10000);

    // an expired wrapped name keeps a stale record in the v1 registry; the
    // Universal Resolver reports no resolver, as the sequencer sees it
    it('should not read the stale record of an expired name', async () => {
      const controller = await getSpaceController(
        'filecoin-test.eth',
        11155111
      );
      expect(controller).toBe(EMPTY_ADDRESS);
    }, 10000);

    // dblog.eth reverts onchain, opdisputegame.eth after its CCIP callback
    it.each(['dblog.eth', 'opdisputegame.eth'])(
      'should reject instead of falling back to the owner when the resolver fails (%s)',
      async name => {
        await expect(getSpaceController(name, 11155111)).rejects.toThrow();
      },
      10000
    );
  });
});
