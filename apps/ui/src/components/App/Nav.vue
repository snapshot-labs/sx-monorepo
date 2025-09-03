<script lang="ts" setup>
import { FunctionalComponent } from 'vue';
import { RouteLocationNormalizedLoaded } from 'vue-router';
import { useSpaceController } from '@/composables/useSpaceController';
import { SPACES_DISCUSSIONS } from '@/helpers/discourse';
import { offchainNetworks } from '@/networks';
import { useSpaceQuery } from '@/queries/spaces';
import IHAnnotation from '~icons/heroicons-outline/annotation';
import IHArrowLongLeft from '~icons/heroicons-outline/arrow-long-left';
import IHBell from '~icons/heroicons-outline/bell';
import IHCash from '~icons/heroicons-outline/cash';
import IHCog from '~icons/heroicons-outline/cog';
import IHGlobeAlt from '~icons/heroicons-outline/globe-alt';
import IHGlobe from '~icons/heroicons-outline/globe-americas';
import IHHome from '~icons/heroicons-outline/home';
import IHLightningBolt from '~icons/heroicons-outline/lightning-bolt';
import IHNewspaper from '~icons/heroicons-outline/newspaper';
import IHStop from '~icons/heroicons-outline/stop';
import IHUser from '~icons/heroicons-outline/user';
import IHUserGroup from '~icons/heroicons-outline/user-group';
import IHUsers from '~icons/heroicons-outline/users';

type NavigationConfig = {
  style?: 'default' | 'slim';
  items: Record<string, NavigationItem>;
  shortcuts?: Record<string, NavigationItem>;
};

type NavigationItem = {
  name: string;
  icon?: FunctionalComponent;
  count?: number;
  hidden?: boolean;
  link?: any;
  active?: boolean;
};

const route = useRoute();
const notificationsStore = useNotificationsStore();
const { isWhiteLabel } = useWhiteLabel();

const { param } = useRouteParser('space');
const { resolved, address, networkId } = useResolve(param);
const { data: spaceData } = useSpaceQuery({
  networkId: networkId,
  spaceId: address
});
const { web3 } = useWeb3();

const currentRouteName = computed(() => String(route.matched[0]?.name));
const space = computed(() => {
  if (currentRouteName.value === 'space' && resolved.value) {
    return spaceData.value ?? null;
  }

  return null;
});

const { isController } = useSpaceController(space);

const canSeeSettings = computed(() => {
  if (isController.value) return true;

  if (space.value?.additionalRawData?.type === 'offchain') {
    const admins = space.value?.additionalRawData?.admins.map((admin: string) =>
      admin.toLowerCase()
    );

    return admins.includes(web3.value.account.toLowerCase());
  }

  return false;
});

function getNavigationConfig(
  route: RouteLocationNormalizedLoaded
): NavigationConfig | null {
  const mainRoute = route.matched[0]?.name;

  function getSettingsRoute({
    name,
    tab,
    hidden
  }: {
    name: string;
    tab: string;
    hidden?: boolean;
  }) {
    return {
      name,
      link: {
        name: 'space-settings',
        params: { tab }
      },
      active: route.params.tab === tab,
      hidden
    };
  }

  if (mainRoute === 'space') {
    if (route.name === 'space-settings') {
      const isOffchainNetwork = space.value
        ? offchainNetworks.includes(space.value.network)
        : false;

      return {
        style: 'slim',
        items: {
          back: {
            name: 'Settings',
            icon: IHArrowLongLeft,
            link: { name: 'space-overview' },
            active: true
          },
          profile: getSettingsRoute({
            name: 'Profile',
            tab: 'profile'
          }),
          proposal: getSettingsRoute({
            name: 'Proposal',
            tab: 'proposal'
          }),
          votingStrategies: getSettingsRoute({
            name: 'Voting strategies',
            tab: 'voting-strategies'
          }),
          voting: getSettingsRoute({
            name: 'Voting',
            tab: 'voting'
          }),
          members: getSettingsRoute({
            name: 'Members',
            tab: 'members',
            hidden: !isOffchainNetwork
          }),
          execution: getSettingsRoute({
            name: 'Execution',
            tab: 'execution',
            hidden: isOffchainNetwork
          }),
          authenticators: getSettingsRoute({
            name: 'Authenticators',
            tab: 'authenticators',
            hidden: isOffchainNetwork
          }),
          treasuries: getSettingsRoute({
            name: 'Treasuries',
            tab: 'treasuries'
          }),
          delegations: getSettingsRoute({
            name: 'Delegations',
            tab: 'delegations'
          }),
          labels: getSettingsRoute({
            name: 'Labels',
            tab: 'labels'
          }),
          whitelabel: getSettingsRoute({
            name: 'Custom domain',
            tab: 'whitelabel',
            hidden: !isOffchainNetwork
          }),
          advanced: getSettingsRoute({
            name: 'Advanced',
            tab: 'advanced',
            hidden: !isOffchainNetwork
          }),
          controller: getSettingsRoute({
            name: 'Controller',
            tab: 'controller'
          })
        }
      };
    }

    return {
      items: {
        overview: {
          name: 'Overview',
          icon: IHGlobeAlt,
          hidden: true // Modified: Hidden from sidebar, now in Topnav
        },
        proposals: {
          name: 'Proposals',
          icon: IHNewspaper,
          hidden: true // Modified: Hidden from sidebar, now in Topnav
        },
        leaderboard: {
          name: 'Leaderboard',
          icon: IHUserGroup,
          hidden: true // Modified: Hidden from sidebar, now in Topnav
        },
        ...(space.value?.delegations && space.value.delegations.length > 0
          ? {
              delegates: {
                name: 'Delegates',
                icon: IHLightningBolt
              }
            }
          : undefined),
        ...(SPACES_DISCUSSIONS[`${networkId.value}:${address.value}`]
          ? {
              discussions: {
                name: 'Discussions',
                icon: IHAnnotation,
                active: [
                  'space-discussions',
                  'space-discussions-topic'
                ].includes(route.name as string)
              }
            }
          : undefined),
        ...(space.value?.treasuries?.length
          ? {
              treasury: {
                name: 'Treasury',
                icon: IHCash
              }
            }
          : undefined),
        ...(canSeeSettings.value
          ? {
              settings: {
                name: 'Settings',
                icon: IHCog,
                link: { name: 'space-settings', params: { tab: 'profile' } }
              }
            }
          : undefined)
      }
    };
  }

  if (mainRoute === 'settings') {
    return {
      items: {
        spaces: {
          name: 'My spaces',
          icon: IHStop,
          hidden: isWhiteLabel.value
        },
        contacts: {
          name: 'Contacts',
          icon: IHUsers
        }
      }
    };
  }

  if (mainRoute === 'my') {
    return {
      items: {
        home: {
          name: 'Home',
          icon: IHHome,
          hidden: !web3.value.account || true
        },
        explore: {
          name: 'Explore',
          icon: IHGlobe,
          hidden: true
        },
        notifications: {
          name: 'Notifications',
          count: notificationsStore.unreadNotificationsCount,
          icon: IHBell,
          hidden: !web3.value.account || true
        }
      },
      shortcuts: {
        user: {
          name: 'Profile',
          link: { name: 'user', params: { user: web3.value.account } },
          icon: IHUser,
          hidden: !web3.value.account,
          active:
            (route.name as string) === 'user' &&
            route.params.user === web3.value.account
        },
        settings: {
          name: 'Settings',
          link: { name: 'settings-spaces' },
          icon: IHCog,
          hidden: !web3.value.account,
          active: false
        }
      }
    };
  }

  return null;
}

const navigationConfig = computed(() => getNavigationConfig(route));

const navigationItems = computed(() =>
  Object.fromEntries(
    Object.entries({
      ...navigationConfig.value?.items,
      ...navigationConfig.value?.shortcuts
    })
      .map(([key, item]): [string, NavigationItem] => {
        return [
          key,
          {
            ...item,
            active:
              item.active ?? route.name === `${currentRouteName.value}-${key}`,
            hidden: item.hidden ?? false,
            link: item.link ?? { name: `${currentRouteName.value}-${key}` }
          }
        ];
      })
      .filter(([, item]) => item.hidden === false)
  )
);
</script>

<template>
  <div class="border-r bg-skin-bg py-4">
    <AppLink
      v-for="(item, key) in navigationItems"
      :key="key"
      :to="item.link"
      class="px-4 space-x-2 flex items-center"
      :class="[
        item.active ? 'text-skin-link' : 'text-skin-text',
        navigationConfig?.style === 'slim' ? 'py-1' : 'py-1.5'
      ]"
    >
      <component
        :is="item.icon"
        v-if="item.icon"
        class="inline-block"
      ></component>
      <span class="grow" v-text="item.name" />
      <span
        v-if="item.count"
        class="bg-skin-border text-skin-link text-[13px] rounded-full px-1.5"
        v-text="item.count"
      />
    </AppLink>
  </div>
</template>
