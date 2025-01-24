import { getNetwork, metadataNetwork } from '@/networks';

const DEFAULT_SETTINGS = {
  'space.active_proposal_limit_per_author': 0,
  'space.default.body_limit': 0,
  'space.default.choices_limit': 0,
  'space.default.proposal_limit_per_day': 0,
  'space.default.proposal_limit_per_month': 0,
  'space.default.strategies_limit': 0,
  'space.ecosystem.list': [],
  'space.ecosystem.proposal_limit_per_day': 0,
  'space.ecosystem.proposal_limit_per_month': 0,
  'space.flagged.proposal_limit_per_day': 0,
  'space.flagged.proposal_limit_per_month': 0,
  'space.turbo.body_limit': 0,
  'space.turbo.choices_limit': 0,
  'space.turbo.proposal_limit_per_day': 0,
  'space.turbo.proposal_limit_per_month': 0,
  'space.turbo.strategies_limit': 0,
  'space.verified.body_limit': 0,
  'space.verified.choices_limit': 0,
  'space.verified.proposal_limit_per_day': 0,
  'space.verified.proposal_limit_per_month': 0,
  'space.verified.strategies_limit': 0,
  'user.default.follow_limit': 0
};

const settings = ref<Map<string, number | string[]>>(
  new Map(Object.entries(DEFAULT_SETTINGS))
);
const initialized = ref(false);

const network = getNetwork(metadataNetwork);

function castValue(value: any, key: string): number | string[] {
  if (key.includes('limit')) {
    return Number(value);
  }

  return value;
}

export function useSettings() {
  async function load() {
    if (initialized.value) return;

    try {
      const result = await network.api.loadSettings();

      result.forEach(setting => {
        if (!settings.value.has(setting.name)) return;

        settings.value.set(
          setting.name,
          castValue(setting.value, setting.name)
        );
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
