<script setup lang="ts">
import { getValidator } from '@/helpers/validation';
import { SkinSettings, Space } from '@/types';

const CUSTOM_DOMAIN_DEFINITION = {
  type: 'string',
  format: 'domain',
  title: 'Domain name',
  maxLength: 64,
  examples: ['vote.balancer.fi']
};

const COLOR_VALIDATION = {
  type: 'string',
  format: 'color',
  examples: ['#FF0000']
};

const SKIN_DEFINITION = {
  type: 'object',
  title: 'Skin settings',
  additionalProperties: false,
  required: [],
  properties: {
    bg_color: {
      ...COLOR_VALIDATION,
      title: 'Background color'
    },
    text_color: {
      ...COLOR_VALIDATION,
      title: 'Text color'
    },
    link_color: {
      ...COLOR_VALIDATION,
      title: 'Link color'
    },
    content_color: {
      ...COLOR_VALIDATION,
      title: 'Content color',
      tooltip: 'Proposal text color'
    },
    border_color: {
      ...COLOR_VALIDATION,
      title: 'Border color'
    },
    heading_color: {
      ...COLOR_VALIDATION,
      title: 'Heading color'
    },
    primary_color: {
      ...COLOR_VALIDATION,
      title: 'Primary color'
    },
    theme: {
      type: 'string',
      title: 'Base theme',
      enum: ['light', 'dark'],
      options: [
        { id: 'light', name: 'Light' },
        { id: 'dark', name: 'Dark' }
      ]
    }
  }
};

const customDomain = defineModel<string>('customDomain', { required: true });
const skinSettings = defineModel<SkinSettings>('skinSettings', {
  required: true
});

const props = defineProps<{
  space: Space;
}>();

const emit = defineEmits<{
  (e: 'errors', value: any);
}>();

const { encodeSkin } = useSkin();
const { isWhiteLabel } = useWhiteLabel();

const formErrors = computed(() => {
  const validator = getValidator({
    type: 'object',
    title: 'Whitelabel',
    additionalProperties: false,
    required: [],
    properties: {
      customDomain: CUSTOM_DOMAIN_DEFINITION,
      ...SKIN_DEFINITION.properties
    }
  });

  const errors = validator.validate(
    {
      customDomain: customDomain.value,
      ...skinSettings.value
    },
    {
      skipEmptyOptionalFields: true
    }
  );
  return errors;
});
const isDisabled = computed(
  () => !props.space.turbo && !props.space.additionalRawData?.domain
);

const previewDomain = computed(
  () => props.space.additionalRawData?.domain || window.location.host
);

const previewUrl = computed(
  () =>
    `${window.location.origin}/#/?skin-preview=${encodeSkin(skinSettings.value)}`
);

watch(formErrors, value => emit('errors', value));

onMounted(() => {
  emit('errors', formErrors.value);
});
</script>

<template>
  <UiMessage
    v-if="isDisabled"
    type="info"
    :learn-more-link="{ name: 'space-pro' }"
    class="mb-4 max-w-[592px]"
  >
    Whitelabel features are only available for Snapshot Pro spaces.
  </UiMessage>
  <div class="flex flex-col items-stretch md:flex-row md:h-full gap-4">
    <div class="s-box space-y-4 order-last md:order-first max-w-[592px]">
      <div>
        <h4 class="eyebrow mb-2 font-medium">Custom domain</h4>
        <UiMessage
          type="info"
          class="mb-3"
          :learn-more-link="'https://docs.snapshot.box/spaces/add-custom-domain'"
        >
          To set up a custom domain, you need to create a CNAME record pointing
          to "cname.snapshot.box" with your DNS provider or registrar.
        </UiMessage>
        <UiInputString
          v-model="customDomain"
          :definition="CUSTOM_DOMAIN_DEFINITION"
          :error="formErrors.customDomain"
          :disabled="isDisabled"
        />
      </div>
      <div>
        <h4 class="eyebrow font-medium">Skin colors</h4>
        <div class="mb-2">
          Empty colors value will fallback to the base theme color.
        </div>
        <UiForm
          v-model="skinSettings"
          :definition="SKIN_DEFINITION"
          :error="formErrors"
          :disabled="isDisabled"
        />
      </div>
      <div>
        <h4 class="eyebrow font-medium">Custom logo</h4>
        <div class="mb-2">
          You can replace your space name in the upper left corner by a custom
          logo. Max dimensions are 380x76 pixels.
        </div>
        <UiInputStamp
          v-model="skinSettings.logo"
          :disabled="isDisabled"
          :fallback="false"
          :width="380"
          :height="76"
          class="!border-0 !mb-0"
          :definition="{
            type: 'string',
            format: 'stamp',
            title: 'Logo'
          }"
        />
      </div>
    </div>
    <div
      v-if="space.additionalRawData?.domain"
      class="shrink-0 relative h-full hidden sm:block"
    >
      <Affix :top="137" :bottom="100">
        <div>
          <div class="flex justify-between items-center mb-2">
            <h4 class="eyebrow font-medium">Preview</h4>
            <AppLink :to="previewUrl" target="_blank">
              <IHArrowsExpand class="cursor-pointer" />
            </AppLink>
          </div>
          <div class="browser">
            <div class="browser-toolbar">
              <div class="browser-toolbar-address" v-text="previewDomain" />
            </div>
            <div
              class="browser-content-container flex items-center justify-center"
            >
              <IC-zap v-if="isDisabled" class="size-[126px] text-skin-border" />
              <div v-else-if="!isWhiteLabel">
                Preview only available on
                <AppLink
                  :to="`https://${previewDomain}/#/settings/whitelabel`"
                  >{{ previewDomain }}</AppLink
                >
              </div>
              <div v-else class="browser-content">
                <iframe
                  :src="previewUrl"
                  inert="true"
                  sandbox="allow-same-origin allow-scripts"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </Affix>
    </div>
  </div>
</template>
<style lang="scss" scoped>
// Resolution of the iframe content
$browser-content-width: 1280px;
$browser-content-height: 720px;
$browser-content-zoom: 0.35;

.browser {
  @apply overflow-hidden border rounded-md;

  width: calc($browser-content-width * $browser-content-zoom);

  &-toolbar {
    @apply bg-skin-border flex items-center px-2 py-1 relative;

    &-address {
      @apply bg-skin-bg truncate mx-auto px-2 w-1/2 text-[12px] text-center rounded-sm;
    }

    &:before {
      @apply text-skin-bg top-[-2px] text-[64px] absolute leading-[0px] tracking-[-7px];
      content: '. . .';
    }
  }

  &-content {
    transform: scale($browser-content-zoom);

    &,
    & iframe {
      @apply border-0;

      width: $browser-content-width;
      height: $browser-content-height;
    }

    &-container {
      @apply overflow-hidden relative;

      width: calc($browser-content-width * $browser-content-zoom - 2px);
      height: calc($browser-content-height * $browser-content-zoom - 2px);
    }
  }
}
</style>
