// Scroll choreography: each part of the hero leaves on its own schedule as
// the glyph field takes over (see scene.ts), copy passes over the field, then
// rings spread out from one point and the closing copy comes in.

export function smoothstep(from: number, to: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

// 0 when the section's top reaches the top of the viewport, 1 when its bottom
// reaches the bottom.
export function scrollProgress(
  top: number,
  height: number,
  viewport: number
): number {
  const range = height - viewport;
  return range <= 0 ? 1 : Math.min(1, Math.max(0, -top / range));
}

// The page scrolls through two steps of the same length, the hero to the
// field and the field to the rings. Both run the same schedule in their own
// time, from 0 to 1: the copy leaves, the next slide pushes in, then its copy
// comes in.
export const STEP = 0.5;
// The part of a step the next slide pushes in over (see scene.ts).
export const PUSH = { start: 0.16, length: 0.48 };

function stepTime(progress: number, step: number): number {
  return Math.min(1, Math.max(0, progress / STEP - step));
}

// How far each part of a slide's copy has left during a step, from 0 (in
// place) to 1 (gone).
function copyOut(t: number) {
  return {
    eyebrow: smoothstep(0.04, 0.28, t),
    word: (i: number) => smoothstep(0.06 + i * 0.03, 0.24 + i * 0.03, t),
    title: smoothstep(0.32, 0.56, t),
    text: smoothstep(0.12, 0.4, t),
    button: smoothstep(0.2, 0.44, t)
  };
}

// How far each part of the next slide's copy has come in during a step, from
// 0 (away) to 1 (in place).
function copyIn(t: number) {
  return {
    title: smoothstep(0.48, 0.68, t),
    word: (i: number) => smoothstep(0.56 + i * 0.03, 0.74 + i * 0.03, t),
    text: smoothstep(0.54, 0.74, t),
    button: smoothstep(0.62, 0.84, t)
  };
}

// How far each part of the hero has left. The logo and the yellow band stay:
// the glyph field covers the band.
export function heroParts(progress: number) {
  return copyOut(stepTime(progress, 0));
}

// The copy over the glyph field comes in, holds, then leaves: [in, out].
export function fieldParts(progress: number) {
  const come = copyIn(stepTime(progress, 0));
  const go = copyOut(stepTime(progress, 1));
  return {
    title: [come.title, go.title] as const,
    word: (i: number) => [come.word(i), go.word(i)] as const,
    text: [come.text, go.text] as const
  };
}

// How far each part of the closing copy has come in.
export function closingParts(progress: number) {
  return copyIn(stepTime(progress, 1));
}

// Where rectangle i of a slide is: 0 in place, 1 out of view on its side, -1
// out of view on the other side. The hero's leave, the field's pass through
// and the closing ones come in and stay.
export function boxShift(slide: number, i: number, progress: number): number {
  const out = (t: number) => smoothstep(0.06 + i * 0.024, 0.3 + i * 0.024, t);
  const into = (t: number) => smoothstep(0.44 + i * 0.024, 0.68 + i * 0.024, t);
  if (slide === 1) return out(stepTime(progress, 0));
  if (slide === 2) {
    return 1 - into(stepTime(progress, 0)) - out(stepTime(progress, 1));
  }
  return 1 - into(stepTime(progress, 1));
}

// Which slide's color the logo tab takes, 1 to 3: it changes once the strips
// behind it, which lead the push, have pushed the next slide in.
export function slideBehindLogo(progress: number): number {
  const covered = PUSH.start + 0.6 * PUSH.length;
  if (stepTime(progress, 0) < covered) return 1;
  return stepTime(progress, 1) < covered ? 2 : 3;
}
