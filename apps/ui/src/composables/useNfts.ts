import { ref, computed, Ref } from 'vue';
import snapshot from '@snapshot-labs/snapshot.js';

const SUPPORTED_ABIS = ['erc721', 'erc1155'];

const nfts: Ref<any[]> = ref([]);
const loading = ref(true);
const loaded = ref(false);

export function useNfts() {
  async function loadNfts(address) {
    loading.value = true;
    const key = 'ckey_2d082caf47f04a46947f4f212a8';
    const url = `https://api.covalenthq.com/v1/1/address/${address}/balances_v2/?quote-currency=USD&format=JSON&nft=true&key=${key}`;
    const results = await snapshot.utils.getJSON(url);
    nfts.value = results.data.items
      .filter(
        item =>
          item.type === 'nft' &&
          item.nft_data &&
          item.supports_erc?.some(itemErc => SUPPORTED_ABIS.includes(itemErc))
      )
      .map(item => {
        const type = item.supports_erc?.find(itemErc =>
          SUPPORTED_ABIS.includes(itemErc)
        );
        const tokenId = item.nft_data[0]?.token_id;
        const title =
          item.nft_data[0]?.external_data?.name ??
          item.contract_name ??
          'Untitled';
        const displayTitle =
          title.match(/(#[0-9]+)$/) || !tokenId
            ? title
            : `${title} #${tokenId}`;

        const image =
          item?.nft_data[0]?.external_data.image ??
          `https://cdn.stamp.fyi/token/${item.contract_address}?s=256`;

        return {
          ...item,
          id: `${item.contract_address}:${tokenId || 0}`,
          type,
          tokenId,
          title,
          displayTitle,
          image
        };
      });
    loading.value = false;
    loaded.value = true;
  }

  const nftsMap = computed(
    () => new Map(nfts.value.map(asset => [asset.id, asset]))
  );

  return { loading, loaded, nfts, nftsMap, loadNfts };
}
