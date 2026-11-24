import { ASCII, ASCII_GLYPH, asciiOrigin } from './hero';
import { PUSH, STEP } from './timeline';

// The hero's ASCII field as drawn now: the frame, its size and its clock.
export interface HeroFrame {
  art: string;
  width: number;
  height: number;
  time: number;
}

const KIND: Record<string, number> = { '⋅': 1, '.': 2, '^': 3 };

// One triangle that covers the whole canvas.
const vertexShader = /* glsl */ `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// Draws the whole field on the hero's ASCII grid, cell by cell. Each cell goes
// from the hero's glyph, to pixel blocks and binary digits streaming sideways,
// to rings that spread out from one point until they fill the band.
const fragmentShader = /* glsl */ `
  precision highp float;
  uniform sampler2D uKinds;
  uniform vec2 uGrid;
  uniform vec2 uOrigin;
  uniform vec2 uSize;
  uniform float uClip;
  uniform float uBand;
  uniform float uRatio;
  uniform float uProgress;
  uniform float uTime;

  const vec2 CELL = vec2(${ASCII_GLYPH.pitch}, ${ASCII.lineHeight.toFixed(1)});
  const float BASELINE = ${ASCII_GLYPH.baseline};
  const float STEP = ${STEP.toFixed(3)};
  const float PUSH_START = ${PUSH.start.toFixed(3)};
  const float PUSH_LENGTH = ${PUSH.length.toFixed(3)};
  const vec4 BLACK = vec4(0.0, 0.0, 0.0, 1.0);
  const vec4 WHITE = vec4(1.0);
  const vec4 CYAN = vec4(0.435, 0.863, 0.867, 1.0);
  const vec4 LIGHT = vec4(0.894, 0.894, 0.898, 1.0);

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // Pixel blocks and binary digits streaming sideways at point at: dense on
  // the left, sparse on the right where the title sits, and scarce on the
  // white below uBand.
  float field(vec2 cell, vec2 at) {
    vec2 shifted = vec2(cell.x + floor(uProgress * 60.0), cell.y);
    vec2 region = floor(shifted / vec2(10.0, 6.0));
    vec2 tile = floor(shifted / vec2(3.0, 2.0));
    float kind = hash(region + floor(uTime * 0.6) * 0.07);
    float density = 1.0 - smoothstep(0.25, 0.7, at.x / uSize.x);
    float amount = at.y < uBand ? 1.0 : 0.3;
    float blocks = mix(0.06, 0.5, density) * amount;
    if (kind < blocks) return hash(tile + floor(uTime * 2.5)) < 0.85 ? 6.0 : 0.0;
    if (kind < blocks + mix(0.06, 0.3, density) * amount) {
      if (hash(tile * 1.3) < 0.12) return 6.0;
      return hash(cell + floor(uTime * 2.5)) < 0.5 ? 4.0 : 5.0;
    }
    return 0.0;
  }

  // How far the push into the next slide has come in step (0 the hero to the
  // field, 1 the field to the rings), from 0 to 1 (see PUSH in timeline.ts).
  float pushTime(float step) {
    return (uProgress / STEP - step - PUSH_START) / PUSH_LENGTH;
  }

  // Rings in the hero's glyphs at point at, spreading out from their center
  // as they push in, until they fill the band: consensus.
  float rings(vec2 at, float jitter) {
    float d = distance(at, vec2(uSize.x * 0.74, uBand * 0.42));
    float reach = smoothstep(0.0, 1.0, pushTime(1.0)) * length(uSize) * 1.1;
    if (d > reach + jitter * 24.0) return 0.0;
    float level = cos(d * 0.065 - uTime * 5.0) * exp(-d / 460.0) * 1.5;
    level = level * (at.y < uBand ? 1.0 : 0.65) + (jitter - 0.5) * 0.08;
    return level > 0.45 ? 3.0 : level > 0.25 ? 2.0 : level > 0.1 ? 1.0 : 0.0;
  }

  // What slide which (0 the hero, 1 the field, 2 the rings) shows at cell:
  // x its glyph (0 empty, 1 ⋅, 2 ., 3 ^, 4 zero, 5 one, 6 block) and y its
  // palette: 0 the hero's, 1 cyan and 2 white for the field, 3 black and 4
  // white for the rings (inked white and black). Like the hero's yellow band,
  // the field and the rings get their color above uBand and white below.
  vec2 slideAt(float which, vec2 cell) {
    vec2 center = uOrigin + (cell + 0.5) * CELL;
    bool isBand = center.y < uBand;
    if (which == 2.0) return vec2(rings(center, hash(cell)), isBand ? 3.0 : 4.0);
    if (which == 1.0) return vec2(field(cell, center), isBand ? 1.0 : 2.0);
    bool isHero = center.y < uClip && all(greaterThanEqual(cell, vec2(0.0))) && all(lessThan(cell, uGrid));
    return vec2(isHero ? floor(texture2D(uKinds, (cell + 0.5) / uGrid).r * 255.0 + 0.5) : 0.0, 0.0);
  }

  // What cell shows: the hero, then the field, then the rings. Each next
  // slide comes in from the right in strips of three rows, each on its own
  // timing, pushing the last one out to the left. The strips behind the logo
  // lead, so its tab can change color with them (slideBehindLogo).
  vec2 glyphOf(vec2 cell) {
    float toField = pushTime(0.0);
    float toRings = pushTime(1.0);
    if (toField <= 0.0) return slideAt(0.0, cell);
    float next = toRings > 0.0 ? 2.0 : 1.0;
    float strip = floor(cell.y / 3.0);
    bool isHeader = uOrigin.y + strip * 3.0 * CELL.y < 112.0;
    float delay = isHeader ? 0.0 : hash(vec2(strip, 9.0)) * 0.4;
    float t = next == 2.0 ? toRings : toField;
    float pushed = smoothstep(0.0, 1.0, clamp((t - delay) / 0.6, 0.0, 1.0));
    float width = floor(uSize.x / CELL.x);
    float edge = floor((1.0 - pushed) * width);
    if (cell.x - floor(-uOrigin.x / CELL.x) >= edge) return slideAt(next, cell - vec2(edge, 0.0));
    return slideAt(next - 1.0, cell + vec2(width - edge, 0.0));
  }

  vec4 groundOf(float palette, bool isDigit) {
    if (palette == 0.0) return vec4(0.0);
    if (palette <= 2.0 && isDigit) return BLACK;
    if (palette == 1.0) return CYAN;
    return palette == 3.0 ? BLACK : WHITE;
  }

  vec4 inkOf(float palette, bool isDigit) {
    if (palette == 1.0 || palette == 2.0) return isDigit ? LIGHT : BLACK;
    return palette == 3.0 ? WHITE : BLACK;
  }

  // Whether pixel p (from the cell's top left) is inside glyph g. The ⋅ . ^
  // boxes are the hero's (ASCII_GLYPH in hero.ts), above the baseline.
  bool isInk(float g, vec2 p) {
    float up = BASELINE - p.y;
    if (g == 1.0) return p.x > 3.34 && p.x < 5.07 && up > 3.82 && up < 5.91;
    if (g == 2.0) return p.x > 2.66 && p.x < 5.07 && up > 0.0 && up < 2.76;
    if (g == 3.0) {
      float dx = abs(p.x - 4.215);
      float v = 10.17 - up;
      bool isOutside = v < 4.07 * dx / 3.965 || v > 4.07;
      bool isHole = dx < 1.865 && v > 2.1 + 1.97 * dx / 1.865;
      return !isOutside && !isHole;
    }
    if (any(lessThan(p, vec2(0.0))) || any(greaterThanEqual(p, CELL))) return false;
    if (g == 4.0) {
      vec2 d = abs(p - vec2(3.71, 4.0)) / vec2(2.4, 3.2);
      float e = pow(d.x, 2.6) + pow(d.y, 2.6);
      return e < 1.0 && e > 0.2;
    }
    if (g == 5.0) {
      bool isBar = p.x > 3.1 && p.x < 4.6 && p.y > 0.8 && p.y < 7.2;
      bool isFlag = p.x > 1.6 && p.x < 3.1 && abs(p.y - 2.4 + (p.x - 1.6) * 1.07) < 0.75;
      bool isBase = p.x > 1.9 && p.x < 5.6 && p.y > 6.0 && p.y < 7.2;
      return isBar || isFlag || isBase;
    }
    return g == 6.0;
  }

  void main() {
    vec2 px = vec2(gl_FragCoord.x, uSize.y * uRatio - gl_FragCoord.y) / uRatio;
    vec2 cell = floor((px - uOrigin) / CELL);
    // Carets reach into the row above and periods into the row below.
    vec4 ground = vec4(0.0);
    for (int i = -1; i <= 1; i++) {
      vec2 c = cell + vec2(0.0, float(i));
      vec2 g = glyphOf(c);
      bool isDigit = g.x == 4.0 || g.x == 5.0;
      if (i == 0) ground = groundOf(g.y, isDigit);
      if (g.x > 0.0 && isInk(g.x, px - uOrigin - c * CELL)) {
        gl_FragColor = inkOf(g.y, isDigit);
        return;
      }
    }
    gl_FragColor = ground;
  }
`;

// Draws the scene on canvas with plain WebGL once the page scrolls, in place
// of the hero's 2D canvas (ascii). Without WebGL, the hero stays as it is.
export function startScene(
  canvas: HTMLCanvasElement,
  ascii: HTMLCanvasElement,
  heroFrame: () => HeroFrame,
  scrollProgress: () => number
): void {
  const gl = canvas.getContext('webgl');
  if (!gl) return;
  const program = gl.createProgram()!;
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertexShader],
    [gl.FRAGMENT_SHADER, fragmentShader]
  ] as const) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);

  const position = gl.getAttribLocation(program, 'position');
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW
  );
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  // The hero's glyphs, one texel per cell, read as they are.
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  for (const name of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) {
    gl.texParameteri(gl.TEXTURE_2D, name, gl.NEAREST);
  }
  for (const name of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) {
    gl.texParameteri(gl.TEXTURE_2D, name, gl.CLAMP_TO_EDGE);
  }
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const ratio = Math.min(devicePixelRatio || 1, 2);
  gl.uniform1f(uniform('uRatio'), ratio);

  const main = document.querySelector('main')!;
  const band = document.querySelector<HTMLElement>('[data-part="band"]')!;
  // What was last drawn: the scroll, the hero's clock and the size.
  let drawn = '';
  const layout = () => {
    const { clientWidth: width, clientHeight: height } = canvas;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    // Resizing clears the canvas, so the next frame draws again.
    drawn = '';
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uniform('uSize'), width, height);
    gl.uniform1f(uniform('uClip'), main.offsetHeight);
    // The field's and the rings' colors end where the hero's yellow does.
    gl.uniform1f(uniform('uBand'), band.offsetHeight);
  };

  // The hero's current frame as one texel per cell.
  let shown = '';
  const upload = ({ art, width, height }: HeroFrame) => {
    if (art === shown) return;
    shown = art;
    const lines = art.split('\n');
    const cols = lines[0]?.length ?? 0;
    const rows = lines.length;
    const kinds = new Uint8Array(cols * rows);
    lines.forEach((line, row) => {
      for (let col = 0; col < cols; col += 1) {
        kinds[row * cols + col] = KIND[line[col] ?? ' '] ?? 0;
      }
    });
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      cols,
      rows,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      kinds
    );
    gl.uniform2f(uniform('uGrid'), cols, rows);
    const origin = asciiOrigin(width, height, cols, rows);
    gl.uniform2f(uniform('uOrigin'), origin.x, origin.y);
  };

  let isActive = false;
  const setActive = (active: boolean) => {
    isActive = active;
    canvas.hidden = !active;
    ascii.style.visibility = active ? 'hidden' : '';
    if (active) layout();
  };

  // Draws only when the scroll, the hero's clock or the size has changed.
  let frame = 0;
  const render = () => {
    frame = requestAnimationFrame(render);
    const progress = scrollProgress();
    if (progress <= 0.002) {
      if (isActive) setActive(false);
      return;
    }
    if (!isActive) setActive(true);
    const hero = heroFrame();
    const state = `${progress} ${hero.time} ${canvas.width}x${canvas.height}`;
    if (state === drawn) return;
    drawn = state;
    upload(hero);
    gl.uniform1f(uniform('uProgress'), progress);
    gl.uniform1f(uniform('uTime'), hero.time);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  addEventListener('resize', () => {
    if (isActive) layout();
  });
  // If the GPU drops the context, the hero's 2D canvas takes over again.
  canvas.addEventListener('webglcontextlost', () => {
    cancelAnimationFrame(frame);
    canvas.hidden = true;
    ascii.style.visibility = '';
  });
  frame = requestAnimationFrame(render);
}
