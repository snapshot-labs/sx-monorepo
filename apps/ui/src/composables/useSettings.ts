import { clone } from '@/helpers/utils';
import { getNetwork, metadataNetwork } from '@/networks';

const DEFAULT_LIMITS_SETTINGS: Record<string, number> = {
  'space.active_proposal_limit_per_author': 0,
  'space.default.body_limit': 0,
  'space.default.choices_limit': 0,
  'space.default.proposal_limit_per_day': 0,
  'space.default.proposal_limit_per_month': 0,
  'space.default.strategies_limit': 0,
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

const DEFAULT_LISTS_SETTINGS: Record<string, string[]> = {
  'space.ecosystem.list': []
};

const limits = ref({
  ...clone(DEFAULT_LIMITS_SETTINGS)
});

const lists = ref({
  ...clone(DEFAULT_LISTS_SETTINGS)
});

const initialized = ref(false);

const network = getNetwork(metadataNetwork);

export function useSettings() {
  async function load() {
    if (initialized.value) return;

    try {
      const result = await network.api.loadSettings();

      result.forEach(({ name, value }) => {
        if (DEFAULT_LISTS_SETTINGS[name].hasOwnProperty(name)) {
          lists.value[name] = value as string[];
        } else if (DEFAULT_LIMITS_SETTINGS[name].hasOwnProperty(name)) {
          limits.value[name] = Number(value);
        }
      });

      initialized.value = true;
    } catch (e) {
      console.error(e);
    }
  }

  onMounted(() => {
    load();
  });

  return { limits, lists };
}
