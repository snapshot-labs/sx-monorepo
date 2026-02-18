import { describe, expect, it, vi } from 'vitest';
import { getSpaceController } from '../../../../../src/clients/offchain/actions/getSpaceController';
import * as ens from '../../../../../src/utils/ens';
import * as domains from '../../../../../src/utils/domains';

describe('getSpaceController', () => {
  it('should call getEnsSpaceController for ENS domains', async () => {
    const mockProvider = {} as any;
    const mockController = '0x1234567890123456789012345678901234567890';
    
    vi.spyOn(ens, 'getEnsSpaceController').mockResolvedValue(mockController);

    const result = await getSpaceController({
      spaceId: 'test.eth',
      networkId: 's',
      provider: mockProvider
    });

    expect(result).toBe(mockController);
    expect(ens.getEnsSpaceController).toHaveBeenCalledWith(
      mockProvider,
      'test.eth',
      1
    );
  });

  it('should call getShibariumDomainOwner for .shib domains', async () => {
    const mockProvider = {} as any;
    const mockController = '0x1234567890123456789012345678901234567890';
    
    vi.spyOn(domains, 'getShibariumDomainOwner').mockResolvedValue(
      mockController
    );

    const result = await getSpaceController({
      spaceId: 'test.shib',
      networkId: 's',
      provider: mockProvider
    });

    expect(result).toBe(mockController);
    expect(domains.getShibariumDomainOwner).toHaveBeenCalledWith(
      mockProvider,
      'test.shib'
    );
  });

  it('should call getUnstoppableDomainOwner for .sonic domains', async () => {
    const mockProvider = {} as any;
    const mockController = '0x1234567890123456789012345678901234567890';
    
    vi.spyOn(domains, 'getUnstoppableDomainOwner').mockResolvedValue(
      mockController
    );

    const result = await getSpaceController({
      spaceId: 'test.sonic',
      networkId: 's',
      provider: mockProvider
    });

    expect(result).toBe(mockController);
    expect(domains.getUnstoppableDomainOwner).toHaveBeenCalledWith(
      mockProvider,
      'test.sonic'
    );
  });

  it('should use correct chain ID for testnet', async () => {
    const mockProvider = {} as any;
    const mockController = '0x1234567890123456789012345678901234567890';
    
    vi.spyOn(ens, 'getEnsSpaceController').mockResolvedValue(mockController);

    await getSpaceController({
      spaceId: 'test.eth',
      networkId: 's-tn',
      provider: mockProvider
    });

    expect(ens.getEnsSpaceController).toHaveBeenCalledWith(
      mockProvider,
      'test.eth',
      11155111
    );
  });

  it('should throw error for .sonic on testnet', async () => {
    const mockProvider = {} as any;

    await expect(
      getSpaceController({
        spaceId: 'test.sonic',
        networkId: 's-tn',
        provider: mockProvider
      })
    ).rejects.toThrow('Sonic not supported on network s-tn');
  });
});
