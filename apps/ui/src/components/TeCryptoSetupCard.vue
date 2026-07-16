<script setup lang="ts">
import { computed, ref } from 'vue';
import { fingerprintHex, shortHex } from '@/helpers/teVerify';
import { Proposal } from '@/types';

const props = defineProps<{ proposal: Proposal }>();

const open = ref(false);

const ready = computed(
  () => props.proposal.privacy === 'shutter-elgamal' && !!props.proposal.te_mpk
);

const keyperAddresses = computed<string[]>(() =>
  Array.isArray(props.proposal.te_keyper_addresses)
    ? props.proposal.te_keyper_addresses
    : []
);

const thresholdLabel = computed(() => {
  const t = props.proposal.te_threshold_t;
  const n = props.proposal.te_threshold_n;
  if (t == null || n == null) return '?';
  return `${t + 1}-of-${n}`;
});

// Same threshold rendered for the diagram badge, e.g. "2 of 3".
const diagramThreshold = computed(() => {
  const t = props.proposal.te_threshold_t;
  const n = props.proposal.te_threshold_n;
  if (t == null || n == null) return '?';
  return `${t + 1} of ${n}`;
});

const keyperCount = computed(
  () => props.proposal.te_threshold_n ?? keyperAddresses.value.length
);

const mpkFingerprint = computed(() =>
  props.proposal.te_mpk ? fingerprintHex([props.proposal.te_mpk]) : '?'
);
</script>

<template>
  <div v-if="ready" class="border rounded-lg mt-2.5">
    <button
      type="button"
      class="flex items-center gap-2 w-full px-3 py-2.5 text-skin-link font-semibold"
      @click="open = !open"
    >
      <IH-key class="size-[18px] shrink-0" />
      <span class="grow text-left">Cryptographic setup</span>
      <span class="font-mono text-sm text-skin-text">{{ thresholdLabel }}</span>
      <IH-chevron-right
        class="size-[16px] shrink-0 transition-transform"
        :class="{ 'rotate-90': open }"
      />
    </button>
    <div v-if="open" class="px-3 pb-3 space-y-3">
      <!-- Abstract diagram: keypers jointly form one shared key; the hub
           only ever holds sealed ballots. -->
      <div class="rounded-lg border bg-skin-border/30 px-3 py-3">
        <svg
          viewBox="0 0 300 184"
          class="w-full max-w-[300px] mx-auto"
          fill="none"
          role="img"
          :aria-label="`Three keypers jointly form one shared key (${diagramThreshold} threshold); the hub stores only sealed ballots.`"
        >
          <!-- connectors: keypers -> shared key -->
          <g
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            class="text-skin-text/50"
          >
            <path d="M50 50 C 50 74, 150 70, 150 92" />
            <path d="M150 50 L 150 92" />
            <path d="M250 50 C 250 74, 150 70, 150 92" />
          </g>

          <!-- keyper nodes -->
          <g class="text-skin-link">
            <g v-for="(cx, i) in [50, 150, 250]" :key="i">
              <rect
                :x="cx - 39"
                y="22"
                width="78"
                height="28"
                rx="8"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <text
                :x="cx"
                y="40"
                fill="currentColor"
                font-size="11"
                text-anchor="middle"
                class="font-medium"
              >
                Keyper {{ i + 1 }}
              </text>
            </g>
          </g>

          <!-- threshold badge sitting on the converging connectors -->
          <g>
            <rect
              x="119"
              y="61"
              width="62"
              height="21"
              rx="10.5"
              class="text-skin-bg"
              fill="currentColor"
            />
            <rect
              x="119"
              y="61"
              width="62"
              height="21"
              rx="10.5"
              class="text-skin-link"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <text
              x="150"
              y="75.5"
              class="text-skin-link"
              fill="currentColor"
              font-size="10.5"
              text-anchor="middle"
              font-weight="600"
            >
              {{ diagramThreshold }}
            </text>
          </g>

          <!-- shared key node -->
          <g class="text-skin-link">
            <rect
              x="98"
              y="92"
              width="104"
              height="28"
              rx="8"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <text
              x="150"
              y="110"
              fill="currentColor"
              font-size="11"
              text-anchor="middle"
              class="font-medium"
            >
              Shared key
            </text>
          </g>

          <!-- connector: shared key -> hub -->
          <line
            x1="150"
            y1="120"
            x2="150"
            y2="132"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            class="text-skin-text/50"
          />

          <!-- hub node (holds sealed ballots) -->
          <g class="text-skin-link">
            <rect
              x="98"
              y="132"
              width="104"
              height="30"
              rx="9"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <rect
              x="120"
              y="146"
              width="11"
              height="9"
              rx="2"
              stroke="currentColor"
              stroke-width="1.3"
            />
            <path
              d="M 122.5 146 V 144 a 3 3 0 0 1 6 0 V 146"
              stroke="currentColor"
              stroke-width="1.3"
              fill="none"
            />
            <text
              x="166"
              y="151"
              fill="currentColor"
              font-size="11"
              text-anchor="middle"
              class="font-medium"
            >
              Hub (sealed)
            </text>
          </g>
        </svg>
      </div>
      <div class="text-skin-text text-sm">
        Before voting opened, the keypers ran a distributed key generation (DKG)
        to build one shared encryption key. No single keyper, and not the
        server, can decrypt anything alone. Only the combined totals can be
        revealed, and only after enough keypers cooperate once voting ends.
      </div>
      <div class="text-sm space-y-1">
        <div class="flex justify-between">
          <span class="text-skin-text">Decryption threshold</span>
          <span class="font-mono">{{ thresholdLabel }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-skin-text">Keypers</span>
          <span class="font-mono">{{ keyperCount }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-skin-text">Master public key</span>
          <span class="font-mono">{{ mpkFingerprint }}</span>
        </div>
      </div>
      <ul
        v-if="keyperAddresses.length"
        class="text-sm text-skin-text space-y-1"
      >
        <li
          v-for="(addr, i) in keyperAddresses"
          :key="i"
          class="flex items-center justify-between gap-2"
        >
          <span class="flex items-center gap-1 truncate">
            <IH-key class="size-[14px] shrink-0" />
            Keyper {{ i + 1 }}
          </span>
          <span class="font-mono truncate">{{ shortHex(addr) }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
