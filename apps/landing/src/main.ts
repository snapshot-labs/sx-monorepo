import './style.css';
import { ASCII, asciiFrame, asciiGrid, asciiPath, heroBoxes } from './hero';
import { HeroFrame, startScene } from './scene';
import {
  boxShift,
  closingParts,
  fieldParts,
  heroParts,
  scrollProgress,
  slideBehindLogo
} from './timeline';

const BOX_FRAME_HEIGHT = 600;
const MIN_BANNER_COPIES = 3;

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

function placeBoxes(layer: HTMLElement, frameWidth: number): void {
  const count = Number(layer.dataset.boxes);
  const boxes = heroBoxes(count, frameWidth, BOX_FRAME_HEIGHT, Math.random);
  layer.replaceChildren(
    ...boxes.map(({ x, y, width, height }) => {
      const box = document.createElement('div');
      box.style.cssText = `left:${x}px;top:${y}px;width:${width}px;height:${height}px`;
      return box;
    })
  );
}

// Repeats the banner copy until it covers the viewport, then scrolls by
// exactly one copy so the loop is seamless.
function fillBanner(): void {
  const copy = track.firstElementChild!;
  const copyWidth = copy.getBoundingClientRect().width;
  const copies = Math.max(
    MIN_BANNER_COPIES,
    Math.ceil(document.documentElement.clientWidth / copyWidth) + 2
  );
  const clones = Array.from({ length: copies - 1 }, () => {
    const clone = copy.cloneNode(true) as HTMLElement;
    clone.ariaHidden = 'true';
    return clone;
  });
  track.replaceChildren(copy, ...clones);
  track.style.setProperty('--copy-width', `${copyWidth}px`);
}

const canvas = document.querySelector<HTMLCanvasElement>('main canvas')!;
const track = document.getElementById('marquee')!;

const heroFrame = startAscii(canvas);
document
  .querySelectorAll<HTMLElement>('[data-boxes]')
  .forEach(layer => placeBoxes(layer, canvas.clientWidth));
// Fill with the fallback font too when Calibre fails to load.
document.fonts.load('500 19px Calibre').then(fillBanner, fillBanner);
addEventListener('resize', fillBanner);

// Each part of the hero but the logo leaves on its own as the page scrolls,
// by moving out of view: nothing fades or shrinks.
const stage = document.getElementById('stage')!;
const closing = document.getElementById('closing')!;
const logo = document.querySelector<HTMLElement>('header a')!;

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-part="${name}"]`)!;
const eyebrow = part('eyebrow');
const title = part('title');
const text = part('text');
const button = part('button');
const fieldTitle = part('field-title');
const fieldText = part('field-text');
const closingTitle = part('closing-title');
const closingText = part('closing-text');
const closingButton = part('closing-button');
// Each slide's rectangles, in order.
const boxes = ['1', '2', '3'].map(slide =>
  Array.from(
    document.querySelectorAll<HTMLElement>(`[data-slide="${slide}"] > div`)
  )
);

// Puts each word behind its own mask so it can slide out of view or into it.
function maskWords(el: HTMLElement): HTMLElement[] {
  const masks = el
    .textContent!.trim()
    .split(/\s+/)
    .map(word => {
      const mask = document.createElement('span');
      mask.style.cssText =
        'display:inline-block;overflow:hidden;vertical-align:top';
      const inner = document.createElement('span');
      inner.style.display = 'inline-block';
      inner.textContent = word;
      mask.append(inner);
      return mask;
    });
  el.replaceChildren(...masks.flatMap((mask, i) => (i ? [' ', mask] : [mask])));
  return masks.map(mask => mask.firstElementChild as HTMLElement);
}
const words = maskWords(title);
const fieldWords = maskWords(fieldTitle);
const closingWords = maskWords(closingTitle);

const move = (el: HTMLElement, transform: string) => {
  el.style.transform = transform;
};

function animateHero(progress: number): void {
  const p = heroParts(progress);
  move(eyebrow, `translateX(${-100 * p.eyebrow}vw)`);
  words.forEach((word, i) => move(word, `translateY(${-110 * p.word(i)}%)`));
  move(title, `translateX(${-100 * p.title}vw)`);
  move(text, `translateX(${100 * p.text}vw)`);
  move(button, `translateX(${100 * p.button}vw)`);
  boxes.forEach((slide, s) =>
    slide.forEach((box, i) => {
      const shift =
        (i % 2 ? 1 : -1) * (1 + 0.2 * i) * boxShift(s + 1, i, progress);
      move(box, `translateX(calc(${shift} * (100vw + 100%)))`);
    })
  );

  // The field copy comes in from the sides and leaves the other way.
  const f = fieldParts(progress);
  move(fieldTitle, `translateX(${100 * (1 - f.title[0] - f.title[1])}vw)`);
  fieldWords.forEach((word, i) => {
    const [come, go] = f.word(i);
    move(word, `translateY(${110 * (1 - come - go)}%)`);
  });
  move(fieldText, `translateX(${100 * (f.text[0] + f.text[1] - 1)}vw)`);

  const c = closingParts(progress);
  move(closingTitle, `translateX(${-100 * (1 - c.title)}vw)`);
  closingWords.forEach((word, i) =>
    move(word, `translateY(${110 * (1 - c.word(i))}%)`)
  );
  move(closingText, `translateX(${100 * (1 - c.text)}vw)`);
  move(closingButton, `translateX(${100 * (1 - c.button)}vw)`);
  // The logo tab takes the color of the slide behind it.
  logo.style.backgroundColor = ['', '#6fdcdd', '#fff'][
    slideBehindLogo(progress) - 1
  ]!;
  // Links out of view must not take the keyboard focus.
  button.inert = p.button === 1;
  closing.inert = c.button < 1;
}

// Eases toward the scroll position so wheel steps turn into smooth motion.
const scrollTarget = () => {
  const rect = stage.getBoundingClientRect();
  return scrollProgress(rect.top, rect.height, innerHeight);
};
let progress = scrollTarget();
let isEasing = false;
const ease = () => {
  const target = scrollTarget();
  progress += (target - progress) * 0.14;
  if (Math.abs(target - progress) < 0.0005) progress = target;
  animateHero(progress);
  isEasing = progress !== target;
  if (isEasing) requestAnimationFrame(ease);
};
const wake = () => {
  if (isEasing) return;
  isEasing = true;
  requestAnimationFrame(ease);
};
addEventListener('scroll', wake, { passive: true });
addEventListener('resize', wake);
animateHero(progress);

// Once the page has loaded, the glyph field takes over the hero on scroll.
const scene = document.querySelector<HTMLCanvasElement>('#scene')!;
addEventListener('load', () => {
  if (!startScene(scene, canvas, heroFrame, () => progress)) scene.remove();
});
