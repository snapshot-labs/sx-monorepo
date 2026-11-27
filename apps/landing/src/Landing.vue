<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  FunctionalComponent,
  h,
  onMounted,
  ref,
  watch,
  watchSyncEffect
} from 'vue';
import Footer from './Footer.vue';
import { ASCII, asciiFrame, asciiGrid, asciiPath, heroBoxes } from './hero';
import Logo from './Logo.vue';
import { HeroFrame, startScene } from './scene';
import {
  closingParts,
  fieldParts,
  heroParts,
  nameOf,
  openingParts,
  PUSH,
  scrollProgress,
  slideBehind,
  STEP
} from './timeline';

const BOX_FRAME_HEIGHT = 600;
const MIN_BANNER_COPIES = 3;
// Each slide's rectangles: 4 in its color low on the page, no lower than on
// a 900px tall screen so taller ones keep them where they are, then 6 white
// ones over the band. The scene draws them all with their slide once the page
// scrolls, so only the hero's show before that.
const BOX_LAYERS = [
  { count: 4, class: 'top-[min(87px,calc(100svh-53px-760px))] text-yellow' },
  { count: 6, class: 'top-[320px] text-white' },
  { count: 4, class: 'invisible top-[min(87px,calc(100svh-53px-760px))]' },
  { count: 6, class: 'invisible top-[320px]' },
  { count: 4, class: 'invisible top-[min(87px,calc(100svh-53px-760px))]' },
  { count: 6, class: 'invisible top-[320px]' }
];
// The header tabs take the color of the slide behind them (slideBehind),
// white on the blank page as it opens.
const TAB_GROUNDS = ['#fff', '', '#6fdcdd', '#fff'];
// The menu's, black on the last slide.
const MENU_GROUNDS = ['#fff', '', '#6fdcdd', '#000'];
// The opening plays the second half of the hero's push and its copy coming
// in: from half way between the push's start and the end of the step.
const OPENING_FROM = (PUSH.start + 1) / 2;
const OPENING_MS = 750;
// The slides, as named in the menu and in the URL (/#/protocol).
const SLIDES = ['Lorem', 'Protocol', 'Dolor'];
// /#/terms and /#/privacy open over the landing, which waits underneath where
// it was. Their text loads the first time one opens, and if that fails, as
// when a new release has replaced it, the page offers a reload.
const Legal = defineAsyncComponent({
  loader: () => import('./Legal.vue'),
  errorComponent: () =>
    h('p', { class: 'p-5 text-[19px]' }, [
      "This page didn't load. ",
      h(
        'button',
        { class: 'underline', onClick: () => location.reload() },
        'Reload'
      )
    ])
});
const legalOfHash = () =>
  (['terms', 'privacy'] as const).find(page => page === nameOf(location.hash));
// The menu items, and the menu's padding around them: smaller on narrow
// phones so the menu fits beside the logo.
const MENU_ITEM = 'flex items-center px-2 min-[420px]:px-3 sm:px-5';
const MENU_PADDING = 'px-1 min-[420px]:px-3';
const GLIDE_MS = 1200;

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

const legal = ref(legalOfHash());
const legalLayer = ref<HTMLElement>();
// Under a legal page the landing neither scrolls nor takes focus, and the
// page takes it so the keyboard scrolls it.
watchSyncEffect(
  () => (document.documentElement.style.overflow = legal.value ? 'hidden' : '')
);
watch(legalLayer, layer => layer?.focus());

const progress = ref(0);
// The opening, from OPENING_FROM to 1 once the scene runs: the hero pushes in
// over a blank page, then its copy comes in, as the next slides do on scroll.
// 0 until then, and 1 without it: when the URL opens a slide or a legal page,
// or when motion is reduced.
const opening = ref(
  nameOf(location.hash) ||
    matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 1
    : 0
);
// The progress the slides show: the opening's step before the hero (see
// timeline.ts), until the page scrolls.
const shown = computed(() =>
  opening.value < 1 && progress.value === 0
    ? -STEP * (1 - opening.value)
    : progress.value
);
// How far each part of the hero is from its place (heroParts). As the page
// opens, its copy comes in as the next slides' does, the words from below.
const hero = computed(() => {
  if (shown.value >= 0) return heroParts(shown.value);
  const come = openingParts(shown.value);
  return {
    eyebrow: 1 - come.title,
    title: 1 - come.title,
    word: (i: number) => come.word(i) - 1,
    text: 1 - come.text,
    button: 1 - come.button
  };
});
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
const menu = ref<HTMLElement>();
const menuX = ref(1);
// The slide behind the menu, 0 to 2, or -1 as the page opens: its item is
// active, and on the last slide the menu turns black.
const menuSlide = computed(() => slideBehind(shown.value, menuX.value) - 1);
const itemBoxes = ref<{ left: number; width: number }[]>([]);
// The menu's white block, sliding from item to item with the scroll: on an
// item where its slide rests, and in between as the page moves.
const marker = computed(() => {
  const boxes = itemBoxes.value;
  if (boxes.length < 2) return { left: 0, width: 0 };
  const at = Math.min(progress.value / STEP, boxes.length - 1);
  const i = Math.min(Math.floor(at), boxes.length - 2);
  const [from, to] = [boxes[i]!, boxes[i + 1]!];
  const t = at - i;
  return {
    left: from.left + (to.left - from.left) * t,
    width: from.width + (to.width - from.width) * t
  };
});

// Where slide i rests: the top of the stage, past the banner, then a step
// through it.
const slideTop = (i: number) =>
  stage.value!.offsetTop + i * STEP * (stage.value!.offsetHeight - innerHeight);

// The browser snaps scrolling to the slides (the snap points are in the
// stage), and to the top of the page with the banner.
const snap = (type: string) =>
  (document.documentElement.style.scrollSnapType = type);

// Glides to slide i over a fixed time, slow then faster and faster, without
// snapping so the browser leaves each frame where it is. Any wheel, touch or
// key from the reader stops the glide.
let glide = 0;
function stopGlide() {
  cancelAnimationFrame(glide);
  glide = 0;
  snap('y mandatory');
}
function glideTo(i: number) {
  const top = slideTop(i);
  stopGlide();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    scrollTo(0, top);
    return;
  }
  snap('none');
  const from = scrollY;
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / GLIDE_MS);
    scrollTo(0, from + (top - from) * t ** 2);
    if (t < 1) glide = requestAnimationFrame(step);
    else stopGlide();
  };
  glide = requestAnimationFrame(step);
}
const slideOfHash = () =>
  SLIDES.findIndex(label => label.toLowerCase() === nameOf(location.hash));
// A click on the anchor already in the URL changes no hash, so it glides here.
function open(i: number) {
  if (slideOfHash() === i) glideTo(i);
}

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
  // A slide's anchor opens on that slide, and later ones glide to theirs. An
  // empty one, from a legal page's logo, goes back to the top. Leaving a
  // legal page shows the slide, or the top, at once rather than gliding from
  // where the landing waited.
  if (slideOfHash() >= 0) scrollTo(0, slideTop(slideOfHash()));
  const jumpTo = (top: number) => {
    scrollTo(0, top);
    progress.value = target();
  };
  addEventListener('hashchange', () => {
    const wasLegal = !!legal.value;
    legal.value = legalOfHash();
    if (slideOfHash() >= 0) {
      if (wasLegal) jumpTo(slideTop(slideOfHash()));
      else glideTo(slideOfHash());
    } else if (!nameOf(location.hash)) {
      jumpTo(0);
      history.replaceState(null, '', location.pathname + location.search);
    }
  });
  snap('y mandatory');
  for (const type of ['wheel', 'touchstart', 'keydown']) {
    addEventListener(type, stopGlide, { passive: true });
  }
  const placeMenu = () => {
    menuX.value =
      menu.value!.getBoundingClientRect().left /
      document.documentElement.clientWidth;
    itemBoxes.value = Array.from(menu.value!.querySelectorAll('a'), item => ({
      left: item.offsetLeft,
      width: item.offsetWidth
    }));
  };
  placeMenu();
  addEventListener('resize', placeMenu);
  document.fonts.ready.then(placeMenu);

  const heroFrame = startAscii(ascii.value!);
  // /?rectangles=off leaves the slides without their random rectangles.
  if (new URLSearchParams(location.search).get('rectangles') !== 'off') {
    // Spread over their layer, which is centered with the copy so a wider
    // screen moves them with it.
    const frameWidth =
      document.querySelector<HTMLElement>('[data-boxes]')!.clientWidth;
    boxes.value = BOX_LAYERS.map(({ count }) =>
      heroBoxes(count, frameWidth, BOX_FRAME_HEIGHT, Math.random)
    );
  }

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

  // Scrolling keeps the URL on the slide active in the menu, and without an
  // anchor at the top of the page. A glide leaves the anchor it glides to.
  const nameSlide = () => {
    if (glide || legal.value) return;
    const slide = SLIDES[slideBehind(target(), menuX.value) - 1]!;
    const hash =
      scrollY < stage.value!.offsetTop / 2 ? '' : `#/${slide.toLowerCase()}`;
    if (location.hash === hash) return;
    history.replaceState(null, '', hash || location.pathname + location.search);
  };
  addEventListener('scroll', nameSlide, { passive: true });

  // Once the page has loaded, the glyph field takes over the hero on scroll,
  // and the opening plays. Without it, the hero shows as it is.
  addEventListener('load', () => {
    const isRunning = startScene(
      scene.value!,
      heroLayer.value!,
      heroFrame,
      () => shown.value
    );
    if (!isRunning || opening.value === 1) {
      opening.value = 1;
      return;
    }
    const start = performance.now();
    const play = (now: number) => {
      const t = Math.min(1, (now - start) / OPENING_MS);
      opening.value = OPENING_FROM + (1 - OPENING_FROM) * t;
      if (t < 1) requestAnimationFrame(play);
    };
    play(start);
  });
});
</script>

<template>
  <div
    class="group snap-start overflow-hidden bg-black text-white"
    :inert="!!legal"
  >
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
  <div ref="stage" class="relative h-[400vh]" :inert="!!legal">
    <!-- Where the slides rest: the stage's top, middle and bottom at the
    viewport's top, middle and bottom, as in slideTop. -->
    <div class="absolute inset-x-0 top-0 snap-start" />
    <div class="absolute inset-x-0 top-1/2 snap-center" />
    <div class="absolute inset-x-0 bottom-0 snap-end" />
    <div class="sticky top-0 h-[100svh] overflow-hidden">
      <main class="relative min-h-full overflow-hidden">
        <!-- Hidden until the opening starts, which covers them with a blank
        page as the hero pushes in. -->
        <div
          aria-hidden="true"
          class="pointer-events-none"
          :class="{ invisible: !opening }"
        >
          <div
            data-part="band"
            class="absolute inset-x-0 top-0 h-[540px] bg-yellow"
          />
          <div ref="heroLayer">
            <!-- The glyph field, no taller than 900px: below, however tall the
            screen, nothing is drawn. -->
            <canvas
              ref="ascii"
              class="absolute left-0 top-0 h-[min(100svh,900px)] w-full"
            />
            <div
              v-for="(layer, l) in BOX_LAYERS"
              :key="l"
              data-boxes
              class="absolute inset-x-0 z-[6] mx-auto h-[600px] max-w-[1400px] overflow-hidden [&>div]:absolute [&>div]:bg-current"
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
        <header class="relative z-20 flex justify-between py-6">
          <Logo
            class="bg-yellow"
            :style="{
              backgroundColor: TAB_GROUNDS[slideBehind(shown, 0)]
            }"
          />
          <nav
            ref="menu"
            class="relative flex h-[56px] self-center bg-yellow text-[17px] min-[420px]:text-[20px]"
            :class="[MENU_PADDING, { 'text-white': menuSlide === 2 }]"
            :style="{ backgroundColor: MENU_GROUNDS[menuSlide + 1] }"
          >
            <a
              v-for="(label, i) in SLIDES"
              :key="label"
              :href="`#/${label.toLowerCase()}`"
              :class="MENU_ITEM"
              :aria-current="i === menuSlide ? 'true' : undefined"
              @click="open(i)"
            >
              {{ label }}
            </a>
            <!-- The white block, with the labels again in black so they read
            on it wherever it is. -->
            <div
              aria-hidden="true"
              class="pointer-events-none absolute inset-y-0 overflow-hidden bg-white text-black"
              :style="{ left: `${marker.left}px`, width: `${marker.width}px` }"
            >
              <div
                class="absolute inset-y-0 flex"
                :class="MENU_PADDING"
                :style="{ left: `${-marker.left}px` }"
              >
                <span v-for="label in SLIDES" :key="label" :class="MENU_ITEM">
                  {{ label }}
                </span>
              </div>
            </div>
          </nav>
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
                target="_blank"
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
      <!-- The scene, no taller than the glyph field it draws on. -->
      <canvas
        ref="scene"
        hidden
        aria-hidden="true"
        class="pointer-events-none absolute left-0 top-0 z-[5] h-[min(100%,900px)] w-full"
      />
      <div
        class="pointer-events-none absolute inset-0 z-10 mx-auto flex max-w-[1400px] flex-col gap-6 px-5 pb-8 pt-[215.5px]"
      >
        <h2
          class="pointer-events-auto ml-auto w-full max-w-[760px] bg-[#6fdcdd] py-3 text-[76px] leading-[83.6px]"
          :style="{
            transform: `translateX(${100 * (1 - field.title[0] - field.title[1])}vw)`
          }"
        >
          <Words
            text="Coordination as code, enforced onchain"
            :shift="i => 110 * (1 - field.word(i)[0] - field.word(i)[1])"
          />
        </h2>
        <p
          class="pointer-events-auto w-full max-w-[760px] bg-[#6fdcdd] py-3 text-[26px] leading-[31.2px]"
          :style="{
            transform: `translateX(${100 * (field.text[0] + field.text[1] - 1)}vw)`
          }"
        >
          Program who can propose, who can vote and what a passing vote does.
          The rules hold the same way for humans and agents. A primitive for
          anything multiplayer.
        </p>
      </div>
      <div
        class="pointer-events-none absolute inset-0 z-10 mx-auto flex max-w-[1400px] flex-col gap-6 px-5 pb-8 pt-[215.5px]"
        :inert="closing.button < 1"
      >
        <h2
          class="pointer-events-auto max-w-[760px] bg-white py-3 text-[76px] leading-[83.6px]"
          :style="{ transform: `translateX(${-100 * (1 - closing.title)}vw)` }"
        >
          <Words
            text="Built in the open by over 600 contributors"
            :shift="i => 110 * (1 - closing.word(i))"
          />
        </h2>
        <div class="flex justify-end">
          <div class="w-full max-w-[760px]">
            <p
              class="pointer-events-auto bg-white py-3 text-[26px] leading-[31.2px]"
              :style="{
                transform: `translateX(${100 * (1 - closing.text)}vw)`
              }"
            >
              Snapshot is fully open source under the MIT license, its contracts
              are audited, and the app has no trackers or telemetry. Anyone can
              read the code and help build what comes next.
            </p>
            <a
              href="https://github.com/snapshot-labs/sx-monorepo"
              target="_blank"
              class="pointer-events-auto flex h-[53px] w-fit items-center whitespace-nowrap rounded-full bg-black px-4 text-[19px] leading-[29px] text-white"
              :style="{
                transform: `translateX(${100 * (1 - closing.button)}vw)`
              }"
            >
              View on GitHub →
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- Fixed over every slide; the legal pages have it at their end. -->
  <Footer class="fixed bottom-0 left-0 z-30" :inert="!!legal" />
  <div
    v-if="legal"
    :key="legal"
    ref="legalLayer"
    tabindex="-1"
    class="fixed inset-0 z-40 overflow-y-auto overscroll-contain bg-white outline-none"
  >
    <Legal :page="legal">
      <!-- The menu, here to leave for a slide: none is active. -->
      <nav
        class="flex h-[56px] self-center text-[17px] min-[420px]:text-[20px]"
        :class="MENU_PADDING"
      >
        <a
          v-for="label in SLIDES"
          :key="label"
          :href="`#/${label.toLowerCase()}`"
          :class="MENU_ITEM"
        >
          {{ label }}
        </a>
      </nav>
    </Legal>
  </div>
</template>
