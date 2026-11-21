import './style.css';
import { ASCII, asciiFrame, asciiGrid, asciiPath, heroBoxes } from './hero';

const BOX_FRAME_HEIGHT = 600;
const MIN_BANNER_COPIES = 3;

function startAscii(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let time = 0;
  let width = 0;
  let height = 0;

  const draw = () => {
    const { cols, rows } = asciiGrid(width, height);
    ctx.clearRect(0, 0, width, height);
    ctx.fill(
      new Path2D(asciiPath(asciiFrame(cols, rows, time), width, height))
    );
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

const canvas = document.querySelector('canvas')!;
const track = document.getElementById('marquee')!;

startAscii(canvas);
document
  .querySelectorAll<HTMLElement>('[data-boxes]')
  .forEach(layer => placeBoxes(layer, canvas.clientWidth));
// Fill with the fallback font too when Calibre fails to load.
document.fonts.load('500 19px Calibre').then(fillBanner, fillBanner);
addEventListener('resize', fillBanner);
