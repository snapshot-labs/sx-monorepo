import { clone } from '@/helpers/utils';
import { getNetwork, metadataNetwork } from '@/networks';

type LIMITS =
  | 'space.active_proposal_limit_per_author'
  | 'space.default.body_limit'
  | 'space.default.choices_limit'
  | 'space.default.proposal_limit_per_day'
  | 'space.default.proposal_limit_per_month'
  | 'space.default.strategies_limit'
  | 'space.ecosystem.proposal_limit_per_day'
  | 'space.ecosystem.proposal_limit_per_month'
  | 'space.flagged.proposal_limit_per_day'
  | 'space.flagged.proposal_limit_per_month'
  | 'space.turbo.body_limit'
  | 'space.turbo.choices_limit'
  | 'space.turbo.proposal_limit_per_day'
  | 'space.turbo.proposal_limit_per_month'
  | 'space.turbo.strategies_limit'
  | 'space.verified.body_limit'
  | 'space.verified.choices_limit'
  | 'space.verified.proposal_limit_per_day'
  | 'space.verified.proposal_limit_per_month'
  | 'space.verified.strategies_limit'
  | 'user.default.follow_limit';

type LISTS = 'space.ecosystem.list';

const DEFAULT_LIMITS_SETTINGS: Record<LIMITS, number> = {
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

const DEFAULT_LISTS_SETTINGS: Record<LISTS, string[]> = {
  'space.ecosystem.list': []
};

const limits = ref(clone(DEFAULT_LIMITS_SETTINGS));
const lists = ref(clone(DEFAULT_LISTS_SETTINGS));

const initialized = ref(false);

const network = getNetwork(metadataNetwork);

export function useSettings() {
  async function load() {
    if (initialized.value) return;

    try {
      const result = await network.api.loadSettings();

      result.forEach(({ name, value }) => {
        if (DEFAULT_LISTS_SETTINGS.hasOwnProperty(name)) {
          lists.value[name] = value as string[];
        } else if (DEFAULT_LIMITS_SETTINGS.hasOwnProperty(name)) {
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
