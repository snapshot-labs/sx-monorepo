import { skipToken, useQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import { getNfts } from '@/helpers/opensea';
import { ChainId } from '@/types';

export type Nft = Awaited<ReturnType<typeof getNfts>>[number];

type Treasury = {
  chainId: ChainId;
  address: string;
};

export function useNfts({
  treasury
}: {
  treasury: MaybeRefOrGetter<Treasury | null>;
}) {
  const queryFn = computed(() => {
    const treasuryValue = toValue(treasury);

    if (!treasuryValue) return skipToken;

    return () => getNfts(treasuryValue.address, treasuryValue.chainId);
  });

  const { data, isPending, isSuccess } = useQuery({
    queryKey: ['nfts', treasury],
    queryFn: queryFn,
    staleTime: 5 * 60 * 1000
  });

  const nfts = computed(() => data.value ?? []);

  const nftsMap = computed(
    () => new Map(nfts.value.map(asset => [asset.id, asset]))
  );

  return { isPending, isSuccess, nfts, nftsMap };
}
