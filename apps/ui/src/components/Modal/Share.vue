<script setup lang="ts">
import shuffle from 'lodash/shuffle';
import { PayloadType, Vote } from '@/composables/useSharing';
import { getNetwork } from '@/networks';
import { NetworkID } from '@/types';

type Messages = {
  title?: string;
  subtitle?: string;
};

const props = withDefaults(
  defineProps<{
    open: boolean;
    shareable: Vote;
    network: NetworkID;
    type: PayloadType;
    txId: string | null;
    messages?: Messages;
    showIcon?: boolean;
  }>(),
  {
    messages: () => ({}),
    showIcon: false
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { getShareUrl } = useSharing();

const slideIndex = ref(0);
const isCarouselStopped = ref(false);

const network = computed(() => getNetwork(props.network));

// What to do next, shown one at a time, in a new random order each time the modal opens.
const SLIDES = [
  { id: 'share', text: 'Share it with the world' },
  { id: 'mcp', text: 'Next time, just ask your AI agent' },
  { id: 'calendar', text: 'Never miss a proposal' }
];
const shuffledSlides = ref(shuffle(SLIDES));

// The Snapshot MCP only knows the spaces of the hub: it is left out on Snapshot X, Governor
// and testnet proposals.
const slides = computed(() =>
  shuffledSlides.value.filter(
    item => item.id !== 'mcp' || props.shareable.proposal.network === 's'
  )
);
const slide = computed(() => slides.value[slideIndex.value] ?? slides.value[0]);

// Called when the dot of the slide has filled up.
function showNextSlide() {
  slideIndex.value = (slideIndex.value + 1) % slides.value.length;
}

watch(
  () => props.open,
  () => {
    shuffledSlides.value = shuffle(SLIDES);
    slideIndex.value = 0;
    isCarouselStopped.value = false;
  }
);

watch(
  () => props.shareable,
  async (to, from) => {
    if (props.type !== 'vote') return;

    if (
      props.open &&
      (to as Vote).proposal.id !== (from as Vote)?.proposal.id
    ) {
      emit('close');
    }
  },
  { immediate: true }
);
</script>

<template>
  <UiModal :open="open" class="text-skin-heading" @close="emit('close')">
    <div
      class="flex flex-col space-y-3 px-4 py-5 text-center items-center text-skin-text"
    >
      <div
        v-if="showIcon"
        class="bg-skin-success text-white rounded-full p-[12px]"
      >
        <IS-check :width="28" :height="28" />
      </div>

      <div class="flex flex-col space-y-1 leading-6">
        <h4
          class="font-semibold text-skin-heading text-lg"
          v-text="messages.title"
        />
        <div v-if="messages.subtitle" v-text="messages.subtitle" />
      </div>

      <div class="carousel w-full pt-3" @click="isCarouselStopped = true">
        <div class="min-h-[86px]">
          <transition
            mode="out-in"
            enter-active-class="transition-opacity duration-300"
            enter-from-class="opacity-0"
            leave-active-class="transition-opacity duration-300"
            leave-to-class="opacity-0"
          >
            <div :key="slide.id" class="flex flex-col items-center gap-3">
              <div class="text-skin-link text-md" v-text="slide.text" />
              <UiButton
                v-if="slide.id === 'share'"
                :to="getShareUrl('x', type, shareable)"
              >
                <IC-x class="size-[18px]" />
                Share on X
              </UiButton>
              <DropdownMcp v-else-if="slide.id === 'mcp'" />
              <UiDropdown v-else>
                <template #button>
                  <UiButton>
                    <IH-calendar />
                    Add to calendar
                  </UiButton>
                </template>
                <template #items>
                  <DropdownCalendarItems
                    :space="{
                      network: shareable.proposal.network,
                      ...shareable.proposal.space
                    }"
                  />
                </template>
              </UiDropdown>
            </div>
          </transition>
        </div>
        <div class="flex justify-center gap-1.5 pt-4">
          <button
            v-for="(item, i) in slides"
            :key="item.id"
            type="button"
            class="h-[8px] rounded-full bg-skin-border overflow-hidden transition-all duration-300"
            :class="slideIndex === i ? 'w-[24px]' : 'w-[8px]'"
            :aria-label="item.text"
            :aria-current="slideIndex === i"
            @click="slideIndex = i"
          >
            <div
              v-if="slideIndex === i"
              class="h-full rounded-full bg-skin-link"
              :class="{ 'carousel-progress': !isCarouselStopped }"
              @animationend="showNextSlide"
            />
          </button>
        </div>
      </div>
    </div>
    <div v-if="txId" class="flex items-center justify-center p-4 pt-3 -mt-2">
      <AppLink :to="network.helpers.getExplorerUrl(txId, 'transaction')">
        View on explorer
        <IH-arrow-sm-right class="inline-block -rotate-45" />
      </AppLink>
    </div>
  </UiModal>
</template>

<style lang="scss" scoped>
// The dot of the slide fills up in 4 seconds, then the next slide shows. It waits while the carousel
// is hovered or has the keyboard focus, and it has no animation once the carousel was clicked.
.carousel-progress {
  animation: carousel-progress 4s linear;

  .carousel:hover &,
  .carousel:focus-within & {
    animation-play-state: paused;
  }
}

@keyframes carousel-progress {
  from {
    width: 0;
  }

  to {
    width: 100%;
  }
}
</style>
