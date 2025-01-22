import { getNetwork, metadataNetwork } from '@/networks';

const settings = ref<Map<string, any>>(new Map());
const initialized = ref(false);

const network = getNetwork(metadataNetwork);

export function useSettings() {
  async function load() {
    if (initialized.value) return;

    try {
      const result = await network.api.loadSettings();
      result.forEach(setting => {
        settings.value.set(setting.name, setting.value);
      });

      initialized.value = true;
    } catch (e) {
      console.error(e);
    }
  }

  onMounted(() => {
    load();
  });

  return { settings };
}
