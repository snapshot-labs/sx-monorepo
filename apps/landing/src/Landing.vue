<script setup lang="ts">
import { computed, FunctionalComponent, h, onMounted, ref } from 'vue';
import { ASCII, asciiFrame, asciiGrid, asciiPath, heroBoxes } from './hero';
import Logo from './Logo.vue';
import { HeroFrame, startScene } from './scene';
import {
  closingParts,
  fieldParts,
  heroParts,
  scrollProgress,
  slideBehindLogo
} from './timeline';

const BOX_FRAME_HEIGHT = 600;
const MIN_BANNER_COPIES = 3;
// Each slide's rectangles: 4 in its color low on the page, then 6 white ones
// over the band. The scene draws them all with their slide once the page
// scrolls, so only the hero's show before that.
const BOX_LAYERS = [
  { count: 4, class: 'top-[calc(100svh-53px-760px)] text-yellow' },
  { count: 6, class: 'top-[320px] text-white' },
  { count: 4, class: 'invisible top-[calc(100svh-53px-760px)]' },
  { count: 6, class: 'invisible top-[320px]' },
  { count: 4, class: 'invisible top-[calc(100svh-53px-760px)]' },
  { count: 6, class: 'invisible top-[320px]' }
];
const LOGO_GROUNDS = ['', '#6fdcdd', '#fff'];

// The words of a title, each behind its own mask so it can slide out of view
// or into it by shift(i) percent of its height.
const Words: FunctionalComponent<{
  text: string;
  shift: (i: number) => number;
}> = ({ text, shift }) =>
  text.split(' ').flatMap((word, i) => [
    i ? ' ' : '',
    h(
      'span',
      { class: 'inline-block overflow-hidden align-top' },
      h(
        'span',
        {
          class: 'inline-block',
          style: { transform: `translateY(${shift(i)}%)` }
        },
        word
      )
    )
  ]);

const progress = ref(0);
const hero = computed(() => heroParts(progress.value));
const field = computed(() => fieldParts(progress.value));
const closing = computed(() => closingParts(progress.value));
const boxes = ref<ReturnType<typeof heroBoxes>[]>([]);
const copies = ref(1);
const copyWidth = ref(0);
const stage = ref<HTMLElement>();
const ascii = ref<HTMLCanvasElement>();
const heroLayer = ref<HTMLElement>();
const scene = ref<HTMLCanvasElement>();
const banner = ref<HTMLElement[]>([]);

function startAscii(canvas: HTMLCanvasElement): () => HeroFrame {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => ({ art: '', width: 0, height: 0, time: 0 });
  let time = 0;
  let width = 0;
  let height = 0;
  let art = '';

  const draw = () => {
    const { cols, rows } = asciiGrid(width, height);
    art = asciiFrame(cols, rows, time);
    ctx.clearRect(0, 0, width, height);
    ctx.fill(new Path2D(asciiPath(art, width, height)));
  };
  const resize = () => {
    const ratio = devicePixelRatio || 1;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  };

  resize();
  addEventListener('resize', resize);
  setInterval(() => {
    time += ASCII.tickStep;
    draw();
  }, ASCII.tickMs);
  return () => ({ art, width, height, time });
}

onMounted(() => {
  const heroFrame = startAscii(ascii.value!);
  boxes.value = BOX_LAYERS.map(({ count }) =>
    heroBoxes(count, ascii.value!.clientWidth, BOX_FRAME_HEIGHT, Math.random)
  );

  // Repeats the banner copy until it covers the viewport, then scrolls by
  // exactly one copy so the loop is seamless. Fills with the fallback font
  // too when Calibre fails to load.
  const fillBanner = () => {
    copyWidth.value = banner.value[0]!.getBoundingClientRect().width;
    copies.value = Math.max(
      MIN_BANNER_COPIES,
      Math.ceil(document.documentElement.clientWidth / copyWidth.value) + 2
    );
  };
  document.fonts.load('500 19px Calibre').then(fillBanner, fillBanner);
  addEventListener('resize', fillBanner);

  // Eases toward the scroll position so wheel steps turn into smooth motion.
  const target = () => {
    const rect = stage.value!.getBoundingClientRect();
    return scrollProgress(rect.top, rect.height, innerHeight);
  };
  progress.value = target();
  let isEasing = false;
  const ease = () => {
    const to = target();
    progress.value += (to - progress.value) * 0.14;
    if (Math.abs(to - progress.value) < 0.0005) progress.value = to;
    isEasing = progress.value !== to;
    if (isEasing) requestAnimationFrame(ease);
  };
  const wake = () => {
    if (isEasing) return;
    isEasing = true;
    requestAnimationFrame(ease);
  };
  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', wake);

  // Once the page has loaded, the glyph field takes over the hero on scroll.
  addEventListener('load', () =>
    startScene(scene.value!, heroLayer.value!, heroFrame, () => progress.value)
  );
});
</script>

<template>
  <div class="group overflow-hidden bg-black text-white">
    <div
      class="flex w-max animate-marquee group-hover:[animation-play-state:paused]"
      :style="{ '--copy-width': `${copyWidth}px` }"
    >
      <p
        v-for="n in copies"
        :key="n"
        ref="banner"
        :aria-hidden="n > 1 ? 'true' : undefined"
        class="whitespace-nowrap py-2.5 pr-8 text-[19px] leading-[29px]"
      >
        Psst! Lorem ipsum dolor sit, consectetur adipiscing elit, sed do eiusmod
        tempor <span class="underline">dolore magna</span>. →
      </p>
    </div>
  </div>
  <div ref="stage" class="relative h-[400vh]">
    <div class="sticky top-0 h-[100svh] overflow-hidden">
      <main class="relative overflow-hidden">
        <div aria-hidden="true" class="pointer-events-none">
          <div
            data-part="band"
            class="absolute inset-x-0 top-0 h-[540px] bg-yellow"
          />
          <div ref="heroLayer">
            <canvas
              ref="ascii"
              class="absolute left-0 top-0 h-[calc(100svh-53px)] w-full"
            />
            <div
              v-for="(layer, l) in BOX_LAYERS"
              :key="l"
              data-boxes
              class="absolute inset-x-0 z-[6] h-[600px] overflow-hidden [&>div]:absolute [&>div]:bg-current"
              :class="layer.class"
            >
              <div
                v-for="(box, i) in boxes[l]"
                :key="i"
                :style="{
                  left: `${box.x}px`,
                  top: `${box.y}px`,
                  width: `${box.width}px`,
                  height: `${box.height}px`
                }"
              />
            </div>
          </div>
        </div>
        <header class="relative z-20 flex py-6">
          <Logo
            :style="{
              backgroundColor: LOGO_GROUNDS[slideBehindLogo(progress) - 1]
            }"
          />
        </header>
        <div
          class="relative z-10 mx-auto flex max-w-[1400px] flex-col gap-6 px-5 pb-8 pt-2.5"
        >
          <div>
            <p
              class="w-fit bg-yellow py-3 text-[17px] uppercase tracking-[1.7px]"
              :style="{ transform: `translateX(${-100 * hero.eyebrow}vw)` }"
            >
              Quis autem vel eum iure
            </p>
            <h1
              class="max-w-[760px] bg-yellow py-3 text-[76px] leading-[83.6px]"
              :style="{ transform: `translateX(${-100 * hero.title}vw)` }"
            >
              <Words
                text="Excepteur sint occaecat cupidatat non proident"
                :shift="i => -110 * hero.word(i)"
              />
            </h1>
          </div>
          <div class="flex justify-end">
            <div class="w-full max-w-[760px]">
              <p
                class="bg-yellow py-3 text-[26px] leading-[31.2px]"
                :style="{ transform: `translateX(${100 * hero.text}vw)` }"
              >
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
                enim ad minim veniam, nostrud.
              </p>
              <a
                href="https://snapshot.box"
                class="flex h-[53px] w-fit items-center whitespace-nowrap rounded-full bg-black px-4 text-[19px] leading-[29px] text-white"
                :style="{ transform: `translateX(${100 * hero.button}vw)` }"
                :inert="hero.button === 1"
              >
                Launch app →
              </a>
            </div>
          </div>
        </div>
      </main>
      <canvas
        ref="scene"
        hidden
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 z-[5] h-full w-full"
      />
      <div
        class="pointer-events-none absolute inset-0 z-10 mx-auto flex max-w-[1400px] flex-col gap-6 px-5 pb-8 pt-[215.5px]"
      >
        <h2
          class="ml-auto w-full max-w-[760px] bg-[#6fdcdd] py-3 text-[76px] leading-[83.6px]"
          :style="{
            transform: `translateX(${100 * (1 - field.title[0] - field.title[1])}vw)`
          }"
        >
          <Words
            text="Duis aute irure dolor in reprehenderit est"
            :shift="i => 110 * (1 - field.word(i)[0] - field.word(i)[1])"
          />
        </h2>
        <p
          class="w-full max-w-[760px] bg-[#6fdcdd] py-3 text-[26px] leading-[31.2px]"
          :style="{
            transform: `translateX(${100 * (field.text[0] + field.text[1] - 1)}vw)`
          }"
        >
          Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut
          fugit, sed quia consequuntur magni dolores eos qui ratione. Neque
          porro quisquam est, qui nemo.
        </p>
      </div>
      <div
        class="pointer-events-none absolute inset-0 z-10 mx-auto flex max-w-[1400px] flex-col gap-6 px-5 pb-8 pt-[215.5px]"
        :inert="closing.button < 1"
      >
        <h2
          class="max-w-[760px] bg-white py-3 text-[76px] leading-[83.6px]"
          :style="{ transform: `translateX(${-100 * (1 - closing.title)}vw)` }"
        >
          <Words
            text="Itaque earum rerum hic tenetur sapiente"
            :shift="i => 110 * (1 - closing.word(i))"
          />
        </h2>
        <div class="flex justify-end">
          <div class="w-full max-w-[760px]">
            <p
              class="bg-white py-3 text-[26px] leading-[31.2px]"
              :style="{
                transform: `translateX(${100 * (1 - closing.text)}vw)`
              }"
            >
              At vero eos et accusamus et iusto odio dignissimos ducimus qui
              blanditiis praesentium voluptatum deleniti atque corrupti quos.
              Similique sunt in culpa officia.
            </p>
            <a
              href="https://snapshot.box"
              class="pointer-events-auto flex h-[53px] w-fit items-center whitespace-nowrap rounded-full bg-black px-4 text-[19px] leading-[29px] text-white"
              :style="{
                transform: `translateX(${100 * (1 - closing.button)}vw)`
              }"
            >
              Launch app →
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
