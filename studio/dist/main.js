// ../../packages/engine/color.ts
var srgbToLinear = (c) => {
  const cs = c / 255;
  return cs <= 0.04045 ? cs / 12.92 : ((cs + 0.055) / 1.055) ** 2.4;
};
var linearToSrgb = (c) => {
  const v = c <= 31308e-7 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
  return v;
};
var linToOklab = (lr, lg, lb) => {
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  };
};
var oklabToLin = (L, a, b) => {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return {
    lr: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    lg: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    lb: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  };
};
var rgbToOklch = ({ r, g, b }) => {
  const { L, a, b: bb } = linToOklab(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b));
  const c = Math.hypot(a, bb);
  let h = Math.atan2(bb, a) * 180 / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c, h };
};
var oklchToLinRgb = ({ l, c, h }) => {
  const hr = h * Math.PI / 180;
  return oklabToLin(l, c * Math.cos(hr), c * Math.sin(hr));
};
var inGamut = (o, eps = 1e-4) => {
  const { lr, lg, lb } = oklchToLinRgb(o);
  return [lr, lg, lb].every((v) => v >= -eps && v <= 1 + eps);
};
var oklchToRgb = (o) => {
  const { lr, lg, lb } = oklchToLinRgb(o);
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  return {
    r: Math.round(clamp01(linearToSrgb(clamp01(lr))) * 255),
    g: Math.round(clamp01(linearToSrgb(clamp01(lg))) * 255),
    b: Math.round(clamp01(linearToSrgb(clamp01(lb))) * 255)
  };
};
var hex = ({ r, g, b }) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
var hexToRgb = (s) => {
  let h = s.trim().replace(/^#/, "");
  if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("");
  if (h.length === 8) h = h.slice(0, 6);
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) throw new Error(`invalid hex color: '${s}'`);
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
};
var maxChroma = (l, h, ceiling = 0.4) => {
  let lo = 0, hi = ceiling;
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut({ l, c: mid, h })) lo = mid;
    else hi = mid;
  }
  return lo;
};
var relLuminance = ({ r, g, b }) => 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
var contrast = (a, b) => {
  const la = relLuminance(a) + 0.05, lb = relLuminance(b) + 0.05;
  return Math.max(la, lb) / Math.min(la, lb);
};
var luminance = (rgb) => relLuminance(rgb);
var composite = (base, over, a) => ({
  r: over.r * a + base.r * (1 - a),
  g: over.g * a + base.g * (1 - a),
  b: over.b * a + base.b * (1 - a)
});
var emittedAlpha = (a, fmt) => fmt === "hex" ? Math.round(a * 255) / 255 : Math.round(a * 100) / 100;
var dualContrastWindow = (ratio = 4.5) => {
  if (ratio > Math.sqrt(21))
    throw new Error(`dualContrastWindow: no color clears ${ratio}:1 on both black and white \u2014 the max dual-side ratio is \u221A21 \u2248 4.58`);
  const min = ratio * 0.05 - 0.05;
  const max = 1.05 / ratio - 0.05;
  return [min, max];
};
var rgbToLab = ({ r, g, b }) => {
  const lr = srgbToLinear(r), lg = srgbToLinear(g), lb = srgbToLinear(b);
  const X = lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375;
  const Y = lr * 0.2126729 + lg * 0.7151522 + lb * 0.072175;
  const Z = lr * 0.0193339 + lg * 0.119192 + lb * 0.9503041;
  const xn = 0.95047, yn = 1, zn = 1.08883;
  const f = (t) => t > 8856e-6 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const fx = f(X / xn), fy = f(Y / yn), fz = f(Z / zn);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
};
var deltaE2000 = (c1, c2) => {
  const { L: L1, a: a1, b: b1 } = rgbToLab(c1);
  const { L: L2, a: a2, b: b2 } = rgbToLab(c2);
  const rad = Math.PI / 180, deg = 180 / Math.PI;
  const avgC = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const G = 0.5 * (1 - Math.sqrt(avgC ** 7 / (avgC ** 7 + 25 ** 7)));
  const a1p = a1 * (1 + G), a2p = a2 * (1 + G);
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const h1p = (Math.atan2(b1, a1p) * deg + 360) % 360;
  const h2p = (Math.atan2(b2, a2p) * deg + 360) % 360;
  const dLp = L2 - L1, dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp * rad / 2);
  const avgLp = (L1 + L2) / 2, avgCp = (C1p + C2p) / 2;
  let avghp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) avghp += h1p + h2p < 360 ? 360 : -360;
    avghp /= 2;
  }
  const T = 1 - 0.17 * Math.cos((avghp - 30) * rad) + 0.24 * Math.cos(2 * avghp * rad) + 0.32 * Math.cos((3 * avghp + 6) * rad) - 0.2 * Math.cos((4 * avghp - 63) * rad);
  const dTheta = 30 * Math.exp(-(((avghp - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(avgCp ** 7 / (avgCp ** 7 + 25 ** 7));
  const Sl = 1 + 0.015 * (avgLp - 50) ** 2 / Math.sqrt(20 + (avgLp - 50) ** 2);
  const Sc = 1 + 0.045 * avgCp;
  const Sh = 1 + 0.015 * avgCp * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;
  return Math.sqrt(
    (dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh)
  );
};

// ../../packages/engine/ramp.ts
var STEP_NUMS = [
  25,
  50,
  100,
  150,
  200,
  250,
  300,
  350,
  400,
  450,
  500,
  550,
  600,
  650,
  700,
  750,
  800,
  850,
  900,
  950
];
var stepKey = (n) => String(n).padStart(3, "0");
var bandOf = (n) => {
  if (n <= 50) return "Highlights";
  if (n <= 350) return "Quarter";
  if (n <= 600) return "Mid";
  if (n <= 900) return "ThreeQuarter";
  return "Shadows";
};
var autoPlaceStep = (l, lMax = 0.975, lMin = 0.16) => {
  const n = STEP_NUMS.length;
  let best = STEP_NUMS[0], bestD = Infinity;
  STEP_NUMS.forEach((num, i) => {
    const target = lMax + (lMin - lMax) * (i / (n - 1));
    const d = Math.abs(target - l);
    if (d < bestD) {
      bestD = d;
      best = num;
    }
  });
  return best;
};
var peakChromaL = (hue, ceiling = 0.4) => {
  let bestL = 0.5, best = 0;
  for (let L = 0.05; L <= 0.97; L += 0.01) {
    const c = maxChroma(L, hue, ceiling);
    if (c > best) {
      best = c;
      bestL = L;
    }
  }
  return bestL;
};
var chromaForL = (L, hue, plateau, peakL, arc, lMax, lMin, ceiling) => {
  let shape;
  if (arc) {
    if (L >= peakL) {
      const span = lMax - peakL;
      const t = span > 1e-9 ? Math.min(1, (L - peakL) / span) : 0;
      shape = 0.05 + 0.95 * (1 - t) ** 1.3;
    } else {
      const span = peakL - lMin;
      const t = span > 1e-9 ? Math.min(1, (peakL - L) / span) : 0;
      shape = 0.45 + 0.55 * (1 - t);
    }
  } else {
    shape = 1 - Math.min(1, Math.abs(L - peakL) / 0.5);
  }
  return Math.min(plateau * shape, maxChroma(L, hue, ceiling));
};
var solveLForLuminance = (targetY, hue, cFor, lMax, lMin) => {
  let lo = lMin, hi = lMax;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    const y = luminance(oklchToRgb({ l: mid, c: cFor(mid), h: hue }));
    if (y < targetY) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};
var lCurve = (knots, n) => {
  const ks = [...knots].sort((a, b) => a.i - b.i);
  const L = [];
  for (let x = 0; x < n; x++) {
    let a = ks[0], b = ks[ks.length - 1];
    for (let k = 0; k < ks.length - 1; k++) {
      if (x >= ks[k].i && x <= ks[k + 1].i) {
        a = ks[k];
        b = ks[k + 1];
        break;
      }
    }
    L[x] = a.i === b.i ? a.L : a.L + (b.L - a.L) * ((x - a.i) / (b.i - a.i));
  }
  return L;
};
var generateRamp = (opts) => {
  const {
    hue,
    chroma,
    chromaCeiling = 0.4,
    lMax = 0.975,
    lMin = 0.16,
    anchor,
    roleTargets = true
  } = opts;
  const n = STEP_NUMS.length;
  const ai = anchor ? STEP_NUMS.indexOf(anchor.stepNum) : -1;
  const arc = !!anchor || opts.peakL != null;
  const peakL = anchor ? anchor.oklch.l : opts.peakL ?? 0.5;
  const cFor = (L) => chromaForL(L, hue, chroma, peakL, arc, lMax, lMin, chromaCeiling);
  const knots = [
    { i: 0, L: lMax },
    { i: n - 1, L: lMin }
  ];
  if (anchor) knots.push({ i: ai, L: anchor.oklch.l });
  if (roleTargets) {
    const i500 = STEP_NUMS.indexOf(500);
    if (i500 !== ai) {
      const [ylo, yhi] = dualContrastWindow(4.5);
      const L500 = solveLForLuminance((ylo + yhi) / 2, hue, cFor, lMax, lMin);
      knots.push({ i: i500, L: L500 });
    }
  }
  const sorted = [...knots].sort((a, b) => a.i - b.i);
  for (let k = 1; k < sorted.length; k++) {
    if (sorted[k].L > sorted[k - 1].L) sorted[k].L = sorted[k - 1].L;
  }
  const Ls = lCurve(sorted, n);
  const steps = STEP_NUMS.map((num, i) => {
    let L = Ls[i], C, H;
    if (i === ai) {
      L = anchor.oklch.l;
      C = anchor.oklch.c;
      H = anchor.oklch.h;
    } else {
      H = hue;
      C = cFor(L);
    }
    const o = { l: L, c: C, h: H };
    const rgb = oklchToRgb(o);
    return { num, key: stepKey(num), oklch: o, rgb, hex: hex(rgb), band: bandOf(num) };
  });
  for (let i = 1; i < steps.length; i++) {
    if (steps[i].oklch.l > steps[i - 1].oklch.l + 1e-9)
      throw new Error(`ramp: non-monotonic lightness \u2014 step ${steps[i].key} (L ${steps[i].oklch.l.toFixed(3)}) is lighter than ${steps[i - 1].key} (L ${steps[i - 1].oklch.l.toFixed(3)}). A pinned anchor's lightness disagrees with its step position; place the anchor at the step matching its L (autoPlaceStep).`);
  }
  return steps;
};

// ../../packages/engine/scale.ts
var SPACE_BASE = 8;
var GRID_BASE = 4;
var AAA_TARGET_PX = 44;
var DEFAULT_MIN_WIDTH_MULTIPLIER = 2.25;
var buttonMinWidth = (height, multiplier) => Math.ceil(height * multiplier / SPACE_BASE - 1e-9) * SPACE_BASE;
var sizeRefPx = (sizes) => (ref) => {
  const icon2 = /^icon\.size\.([^.]+)$/.exec(ref);
  if (icon2) return ICON_SIZES.find((i) => i.name === icon2[1])?.px;
  const sp = /^space\.([0-9]+)$/.exec(ref);
  if (sp) return spaceScale(SPACE_BASE).find((s) => s.key === sp[1])?.px;
  const m = /^size\.([^.]+)\.height$/.exec(ref);
  return m ? sizes.find((s) => s.name === m[1])?.height : void 0;
};
var dimensionGrid = (base = 4, max = 128, extras = []) => {
  const g = /* @__PURE__ */ new Set([0, 1, 2, base, base * 1.5, base * 2]);
  for (let v = base * 3; v <= max; v += base) g.add(v);
  for (const e of extras) g.add(e);
  return [...g].filter((v) => Number.isInteger(v) && v >= 0).sort((a, b) => a - b);
};
var SPACE_KEYS = ["0", "025", "050", "075", "100", "150", "200", "250", "300", "400", "500", "600", "700", "800", "900", "1000", "1100", "1200"];
var spaceScale = (spaceBase = 8) => SPACE_KEYS.map((k) => {
  const mult = Number(k) / 100;
  return { key: k, mult, px: Math.round(mult * spaceBase) };
});
var DENSITY_SPACE_SHIFT = { compact: -1, comfortable: 0, spacious: 1 };
var densitySpace = (ref, density, floorPx = 0) => {
  const m = /^space\.([0-9]+)$/.exec(ref);
  const i = m ? SPACE_KEYS.indexOf(m[1]) : -1;
  if (i < 0) throw new Error(`densitySpace: '${ref}' is not a step of the space ladder (${SPACE_KEYS.map((k) => `space.${k}`).join(", ")}), so density has no step to move it`);
  let j = Math.min(SPACE_KEYS.length - 1, Math.max(0, i + DENSITY_SPACE_SHIFT[density]));
  while (j < SPACE_KEYS.length - 1 && Number(SPACE_KEYS[j]) / 100 * SPACE_BASE < floorPx) j++;
  return `space.${SPACE_KEYS[j]}`;
};
var GAP_FLOOR_PX = 4;
var isGapKey = (key) => /(^|-)gap$/.test(key.split(".").pop() ?? "");
var densitySpacingStep = (key, ref, density) => densitySpace(ref, density, isGapKey(key) ? GAP_FLOOR_PX : 0);
var SIZE_RUNGS = [
  24,
  // compact floor — named `xs` only at compact; ON `MIN_TARGET_PX`
  28,
  // comfortable `xs`
  36,
  // comfortable `sm` — decided (#1207)
  44,
  // comfortable `md` — decided (#1207); the 44px AAA target
  56,
  // comfortable `lg` — decided (#1207)
  68,
  // comfortable `xl`
  80
  // spacious ceiling — named `xl` only at spacious
];
var SIZE_NAMES = ["xs", "sm", "md", "lg", "xl"];
var DENSITY_START = { compact: 0, comfortable: 1, spacious: 2 };
var componentSizes = (density, _spaceBase = 8) => {
  const start = DENSITY_START[density];
  return SIZE_NAMES.map((name, i) => ({ name, height: SIZE_RUNGS[start + i] }));
};
var ICON_SIZES = [
  { name: "xs", px: 16 },
  { name: "sm", px: 20 },
  { name: "md", px: 24 },
  { name: "lg", px: 32 },
  { name: "xl", px: 40 }
];
var iconSizes = () => ICON_SIZES.map((s) => ({ ...s }));
var CONTROL_RUNGS = [12, 16, 20, 24, 28];
var CONTROL_NAMES = ["sm", "md", "lg"];
var CONTROL_TRACK_RATIO = 2;
var CONTROL_DOT_RATIO = 0.5;
var SWITCH_TRACK_RUNGS = [16, 24, 32, 40, 48];
var SWITCH_THUMB_RATIO = 0.75;
var controlInset = (track, thumb) => (track - thumb) / 2;
var controlSizes = (density) => CONTROL_NAMES.map((name, i) => {
  const height = CONTROL_RUNGS[DENSITY_START[density] + i];
  const dot = height * CONTROL_DOT_RATIO;
  const track = SWITCH_TRACK_RUNGS[DENSITY_START[density] + i];
  const thumb = track * SWITCH_THUMB_RATIO;
  return { name, height, width: track * CONTROL_TRACK_RATIO, dot, inset: controlInset(track, thumb), track, thumb };
});
var RADIUS_LADDER = [
  { name: "none", factor: 0 },
  { name: "sm", factor: 0.5 },
  { name: "md", factor: 1 },
  { name: "lg", factor: 1.5 }
];
var snap2 = (v) => Math.round(v / 2) * 2;
var radiusScale = (scale, baseMd = 4, pill = 128, capsule = 999, hairline = false) => {
  const ramp = RADIUS_LADDER.map(({ name, factor }) => ({
    name,
    px: name === "none" ? 0 : Math.max(0, snap2(baseMd * factor * scale))
  }));
  for (let i = 1; i < ramp.length; i++)
    if (ramp[i].px < ramp[i - 1].px)
      throw new Error(`radiusScale: non-monotone rung ${ramp[i].name}=${ramp[i].px}px < ${ramp[i - 1].name}=${ramp[i - 1].px}px (scale=${scale})`);
  ramp.push({ name: "round", px: pill, pill: true });
  ramp.push({ name: "capsule", px: capsule, pill: true });
  if (hairline) ramp.push({ name: "hairline", px: 1 });
  return ramp;
};
var controlRadius = (edge, radiusSmPx) => Math.min(radiusSmPx, snap2(edge / 8));

// ../../packages/engine/vocabulary.ts
var SLIDER_STOPS = {
  radiusScale: { sharp: 0, modest: 0.5, standard: 1, soft: 1.5, round: 2 },
  "shadow.softness": { crisp: 0.4, standard: 1, soft: 1.4, diffuse: 2 },
  "neutral.chroma": { pure: 0, subtle: 6e-3, tinted: 0.012, saturated: 0.02 },
  "neutral.hue": { warm: 60, cool: 250 },
  "layout.containerMax": { narrow: 1120, standard: 1440, wide: 1680, full: 1920 },
  "layout.containerNarrow": { tight: 600, standard: 720, generous: 840, wide: 960 }
};
var TRAITS = {
  energetic: {
    levers: { "motionPersonality.tempo": "snappy", "typography.typeScale": "expressive" },
    why: 'aurora: "Energetic, premium, confident \u2026 Motion is quick and responsive (snappy)"; wendys: "high-energy"'
  },
  calm: {
    levers: { "motionPersonality.tempo": "relaxed", neutralEmphasis: "subtle" },
    why: 'harbor: "Trustworthy, calm \u2026 Motion is unhurried (relaxed)"; aurora: "the working UI should feel calm and precise"'
  },
  premium: {
    levers: { "typography.typeScale": "expressive", "shadow.softness": "crisp", neutralEmphasis: "subtle" },
    // Citation deliberately TRUNCATED rather than reworded: the clause that follows in aurora's
    // brief ends on an en-GB spelling, and a `why` string is inlined into `apps/studio/dist/main.js` where
    // the US-English gate rightly fails it. Quoting an en-GB source into US-gated shipped prose is a
    // real tension; shortening the quote keeps it faithful, where editing the words would not. (This
    // comment is phrased around the word rather than using it for the same reason — engine prose
    // reaches the bundle whether it is a string or a comment.) Only the brief's own words sit inside
    // the quotes: its annotation reads `"premium restraint" → tighter tracking`, with the arrow outside
    // its quote marks, and `test.ts` checks every quoted span verbatim against the brief (#1685).
    why: 'aurora: "Energetic, premium, confident"; its brief maps "premium restraint" to tighter tracking'
  },
  restrained: {
    levers: { neutralEmphasis: "subtle", "neutral.chroma": "subtle", "shadow.softness": "crisp" },
    why: 'harbor: "The palette is restrained on purpose \u2014 low chroma, nothing that fights the content"'
  },
  bold: {
    levers: { neutralEmphasis: "strong", "typography.typeScale": "expressive", "typography.displayCeiling": "3xl" },
    // Two quotes where there was one: the brief sets "Bold, not loud" in markdown bold, so the span
    // across it is not verbatim text in the file (#1685).
    why: 'wendys: "Bold, not loud" + "confident use of the red on white" + "Confident hierarchy"'
  },
  generous: {
    levers: { density: "spacious", radiusScale: "round", "layout.containerNarrow": "generous" },
    why: 'aurora: "Corners are generous"; wendys: "Confident hierarchy, generous whitespace"'
  },
  dense: {
    levers: { density: "compact", "layout.containerMax": "wide" },
    // Re-sourced when aurora moved to comfortable density (#1215): its brief no longer says "dense".
    // No example brief asks for density, so the trait stands as the opposite pole of `generous` and
    // the `why` says so outright; the quote is a brief turning density DOWN, not asking for it (#1685).
    why: 'the opposite pole of `generous`: no example brief asks for density, and harbor names it only to reject it: "not a dense dashboard"'
  },
  soft: {
    levers: { radiusScale: "soft", "shadow.softness": "soft" },
    why: 'aurora: "The page is a soft, tinted off-white \u2026 the product should feel considered, not clinical"'
  },
  sharp: {
    levers: { radiusScale: "sharp", "shadow.softness": "crisp" },
    // It cited no brief until #1685 made every `why` quote one; nb-redesign asks for it outright.
    why: 'nb-redesign: "Corners are sharp"; also the opposite pole of `soft`, so a brief can state the intent rather than only its absence'
  }
};
var getPath = (obj, path) => {
  let node = obj;
  for (const seg of path.split(".")) {
    if (node == null || typeof node !== "object") return void 0;
    node = node[seg];
  }
  return node;
};
var setPath = (obj, path, value) => {
  const segs = path.split(".");
  let node = obj;
  for (const seg of segs.slice(0, -1)) {
    if (node[seg] == null || typeof node[seg] !== "object") node[seg] = {};
    node = node[seg];
  }
  node[segs[segs.length - 1]] = value;
};
var resolveStop = (lever, value) => {
  if (typeof value === "number") return value;
  const stops = SLIDER_STOPS[lever];
  if (!stops) throw new Error(`lever '${lever}' takes a number, not the name '${String(value)}'`);
  const hit = stops[String(value)];
  if (hit === void 0) {
    throw new Error(`unknown value '${String(value)}' for '${lever}' \u2014 expected a number or one of: ${Object.keys(stops).join(", ")}`);
  }
  return hit;
};
var resolveVocabulary = (raw) => {
  const notes = [];
  if (!raw || typeof raw !== "object") return { input: raw, notes };
  const input = JSON.parse(JSON.stringify(raw));
  for (const lever of Object.keys(SLIDER_STOPS)) {
    const current = getPath(input, lever);
    if (typeof current === "string") {
      const resolved = resolveStop(lever, current);
      setPath(input, lever, resolved);
      notes.push(`${lever} '${current}' \u2192 ${resolved}`);
    }
  }
  const personality = input.personality;
  if (personality === void 0) return { input, notes };
  if (!Array.isArray(personality)) {
    throw new Error(`personality must be a list of traits, got ${typeof personality} \u2014 e.g. personality: ['calm', 'restrained']`);
  }
  const claimedBy = /* @__PURE__ */ new Map();
  for (const name of personality) {
    const trait = TRAITS[String(name)];
    if (!trait) {
      throw new Error(`unknown personality trait '${String(name)}' \u2014 expected one of: ${Object.keys(TRAITS).join(", ")}`);
    }
    const applied = [];
    const declined = [];
    for (const [lever, value] of Object.entries(trait.levers)) {
      const owner = claimedBy.get(lever);
      if (owner) {
        declined.push(`${lever} (already set by '${owner}')`);
        continue;
      }
      if (getPath(input, lever) !== void 0) {
        declined.push(`${lever} (set explicitly)`);
        continue;
      }
      const resolved = SLIDER_STOPS[lever] ? resolveStop(lever, value) : value;
      setPath(input, lever, resolved);
      claimedBy.set(lever, String(name));
      applied.push(`${lever} ${resolved}`);
    }
    const head = applied.length ? `personality '${String(name)}' \u2192 ${applied.join(", ")}` : `personality '${String(name)}' \u2192 nothing to fill`;
    notes.push(`${head}${declined.length ? `; kept ${declined.join(", ")}` : ""} [${trait.why}]`);
  }
  delete input.personality;
  return { input, notes };
};

// ../../packages/engine/theme.ts
var ALL_MODES = ["light", "dark", "hc-light", "hc-dark"];
var VALID_MODES = [...ALL_MODES, "wireframe"];
var CORE_TIER = "core";
var STATUS_DEFAULTS = {
  success: { l: 0.55, c: 0.15, h: 145, chroma: 0.15 },
  warning: { l: 0.55, c: 0.15, h: 75, chroma: 0.15 },
  danger: { l: 0.55, c: 0.17, h: 27, chroma: 0.17 },
  info: { l: 0.55, c: 0.13, h: 245, chroma: 0.13 }
};
var RESERVED_PALETTES = /* @__PURE__ */ new Set(["primary", "neutral", "success", "warning", "info", "danger", "white", "black", "transparent", "black-alpha", "white-alpha"]);
var PALETTE_NAME_RE = /^[a-z][a-z0-9-]*$/;
var hueDist = (a, b) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};
var RED_CHROMA_FLOOR = 0.08;
var inRedTerritory = (hue, chroma) => hueDist(hue, STATUS_DEFAULTS.danger.h) <= 20 && chroma >= RED_CHROMA_FLOOR;
var statusRamp = (hue, chroma) => generateRamp({ hue, chroma, peakL: peakChromaL(hue) });
var buildDims = (baseUnit, spaceBase, density, rScale, baseMd, extras = [], hairline = false) => {
  const space = spaceScale(spaceBase);
  const controls = controlSizes(density);
  return {
    // Icon px join the grid extras for the same reason space does (#274): at a non-default baseUnit
    // (e.g. 6) the fixed icon ladder lands OFF the grid, and `icon.size.<k> -> {dimension.<px>}`
    // would dangle. Feeding them in makes every icon alias resolve by construction. At baseUnit 4
    // they are already grid members, so committed out/* is unaffected.
    grid: dimensionGrid(baseUnit, 128, [
      ...extras,
      ...space.map((s) => s.px),
      ...iconSizes().map((i) => i.px),
      // The box mark-clearance `(height − dot) / 2` — the gap a checkbox/radio mark has inside its box.
      // It is fed even though NO token exposes it since #1425 (the tier's `inset` now carries the switch's
      // `(track − thumb) / 2` instead). WHY IT STAYS: before #1425 this quantity WAS `inset`, and it is
      // a compact brand's only source of `core.dimension.5` (compact box-clearances are 3/4/5): aurora's until
      // #1215 moved it to comfortable, the `minimal-compact` corpus fixture's since (measured). Dropping it would
      // DEMOTE that guaranteed primitive out of the compact grid — a contract removal the materialization gate
      // blocks — for no consumer benefit (a raw primitive is never an alias target). Feeding it keeps the
      // grid's small-primitive floor exactly what it was on `main`; the switch's own clearance is fed by
      // `c.inset` beside it. See version.ts CONTRACT 10.1.0 and docs/00-progress (#1425).
      // At SPACIOUS the COMFORTABLE control px join too (#1631, owner-decided: "we should not remove
      // dimension tokens"). The grid is value-keyed, so a density whose own controls don't produce a px
      // drops that primitive: spacious lost `core.dimension.3` (a comfortable `inset`) and `.18` (a
      // comfortable `thumb`), both guaranteed. WHY NOT COMPACT TOO: compact is a contract-corpus density
      // (the `minimal-compact` fixture since #1215, aurora before), so it cannot remove a guaranteed path by
      // construction, and feeding it would ADD `core.dimension.30` to that member, promoting the path to
      // guaranteed (a CONTRACT MINOR, measured).
      // Spacious is the one density outside the corpus; `lint-lever-sweep.ts` holds it to the contract.
      ...[...controls, ...density === "spacious" ? controlSizes("comfortable") : []].flatMap((c) => [c.height, c.width, c.dot, c.inset, c.track, c.thumb, (c.height - c.dot) / 2])
    ]),
    space,
    radius: radiusScale(rScale, baseMd, 128, 999, hairline),
    sizes: componentSizes(density, spaceBase),
    icons: iconSizes(),
    controls,
    density,
    radiusScaleValue: rScale,
    spaceBase
  };
};
var EASING_ROLE_DEFAULTS = [
  { role: "default", curve: "standard" },
  { role: "enter", curve: "decelerate" },
  { role: "exit", curve: "accelerate" },
  { role: "emphasized", curve: "expressive" }
];
var DURATION_BASE = { instant: 50, fast: 100, normal: 200, moderate: 300, slow: 500, slower: 800 };
var TEMPO_FACTOR = { snappy: 0.8, standard: 1, relaxed: 1.3 };
var SPIN_ROLE = "spin";
var SPIN_MS = 800;
var SPIN_REDUCED_MS = 2600;
var round5 = (n) => Math.round(n / 5) * 5;
var buildMotion = (p = {}) => {
  const tempo = p.tempo ?? "standard";
  const f = TEMPO_FACTOR[tempo];
  const duration = {};
  for (const [k, v] of Object.entries(DURATION_BASE)) duration[k] = round5(v * f);
  const durationReduced = {};
  for (const [k, v] of Object.entries(duration)) durationReduced[k] = v <= 100 ? v : v <= 200 ? 50 : 0;
  duration[SPIN_ROLE] = SPIN_MS;
  durationReduced[SPIN_ROLE] = SPIN_REDUCED_MS;
  const easing = {
    // Curves are named for their SHAPE, roles for their USE. They used to share names — `easing.enter`
    // and `easing-role.enter` — which made the role table read `enter → enter` and gave a reader no way
    // to tell which axis they were on. That was fine while the shape name did double duty as the use
    // name; adding the role tier (#527) split the two meanings apart and left the shape tier wearing
    // the use tier's names. `default → standard` was the only row that said anything, and it is the
    // only one that never collided.
    linear: [0, 0, 1, 1],
    standard: [0.2, 0, 0, 1],
    // symmetric in-place (M3 standard)
    decelerate: [0, 0, 0.2, 1],
    // ease-out — fast, then settles into place
    accelerate: [0.4, 0, 1, 1],
    // ease-in — eases off, then leaves
    expressive: [0.4, 0.14, 0.3, 1],
    // the S-curve (Carbon expressive-standard); the comment already said so
    calm: [0.4, 0, 0.6, 1]
    // a11y: soft onset for long/involuntary motion
  };
  const spring = {
    snappy: { damping: 0.9, stiffness: 700 },
    // M3 standard spatial — fast settle, no overshoot
    gentle: { damping: 0.8, stiffness: 380 },
    // M3 expressive spatial — natural settle
    bouncy: { damping: 0.6, stiffness: 800 }
    // M3 expressive fast — overshoot (expressive layer)
  };
  return {
    tempo,
    duration,
    durationReduced,
    easing,
    spring,
    stagger: round5(40 * f),
    // One source: the roles ARE the transition intents, so adding a transition adds its role and the
    // two can never drift apart.
    easingRoles: EASING_ROLE_DEFAULTS.map((r) => {
      const picked = p.easingRoles?.[r.role];
      if (picked !== void 0 && !(picked in easing))
        throw new Error(`motionPersonality.easingRoles.${r.role}: unknown easing curve '${picked}' (have: ${Object.keys(easing).join(", ")})`);
      return { role: r.role, curve: picked ?? r.curve };
    }),
    transitions: [
      { name: "default", duration: "normal", easing: "standard", desc: "standard in-place transition" },
      { name: "enter", duration: "normal", easing: "decelerate", desc: "element settles in" },
      { name: "exit", duration: "fast", easing: "accelerate", desc: "element accelerates out" },
      { name: "emphasized", duration: "moderate", easing: "expressive", desc: "expressive / hero moment" }
    ]
  };
};
var DISABLED_FLOOR_MIN = 3;
var DISABLED_FLOOR_MAX = 4.5;
var normalizeDisabledStrategy = (s) => s === "full" ? "full" : "reduced";
var normalizeDisabledMin = (strategy, min) => {
  if (strategy === "conventional") return DISABLED_FLOOR_MIN;
  return Math.min(DISABLED_FLOOR_MAX, Math.max(DISABLED_FLOOR_MIN, min ?? DISABLED_FLOOR_MIN));
};
var typefaceSlug = (name) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "unnamed";
var WEIGHT_ROLE_ORDER = ["subtle", "default", "emphasis", "strong", "max"];
var TYPE_GROUPS = ["display", "title", "body", "label", "caption", "eyebrow", "code"];
var isItalicCut = (style) => style.toLowerCase().includes("italic");
var SANS_FALLBACK = ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"];
var MONO_FALLBACK = ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "Liberation Mono", "monospace"];
var LINE_HEIGHT_KEYS = ["tight", "snug", "compact", "cozy", "normal", "relaxed", "loose"];
var LETTER_SPACING_KEYS = ["tighter", "tight", "snug", "normal", "wide", "wider"];
var LINE_HEIGHT_LADDER = [
  1,
  1.05,
  1.1,
  // hero display — Tailwind ships leading-none 1.0
  1.15,
  1.2,
  1.25,
  1.3,
  // display text + title (KB: 1.1–1.3)
  1.4,
  1.45,
  1.5,
  1.55,
  1.6,
  // body (KB: 1.4–1.6) — dense → generous
  1.65,
  1.75,
  // long-form reading
  2
  // deliberately generous / accessible reading
];
var LETTER_SPACING_LADDER = [
  -0.05,
  -0.04,
  -0.03,
  -0.02,
  -0.015,
  -0.01,
  -5e-3,
  // negative: display/hero tightening
  0,
  5e-3,
  0.01,
  0.02,
  0.03,
  0.05,
  0.08,
  0.1
  // positive: eyebrow/all-caps opening
];
var lineHeightStepKey = (v) => String(Math.round(v * 100));
var letterSpacingStepKey = (em) => (em < 0 ? "neg-" : "") + String(Math.abs(Math.round(em * 1e3)));
var LINE_HEIGHTS = [
  { key: "tight", value: 1.05 },
  { key: "snug", value: 1.15 },
  { key: "compact", value: 1.25 },
  { key: "cozy", value: 1.4 },
  { key: "normal", value: 1.5 },
  { key: "relaxed", value: 1.65 },
  { key: "loose", value: 1.75 }
];
var LETTER_SPACINGS = [
  { key: "tighter", em: -0.03 },
  { key: "tight", em: -0.02 },
  { key: "snug", em: -0.01 },
  { key: "normal", em: 0 },
  { key: "wide", em: 0.02 },
  { key: "wider", em: 0.05 }
];
var WEIGHT_ROLE_DEFAULT = { subtle: 300, default: 400, emphasis: 600, strong: 700, max: 900 };
var CONTRACT_WEIGHTS = [300, 400, 700, 900];
var fontSizeLadder = (floor = 10) => {
  const px = floor === 8 ? [8, 10, 11, 12, 14, 16, 18] : [10, 11, 12, 14, 16, 18];
  for (let p = 20; p <= 40; p += 4) px.push(p);
  for (let p = 48; p <= 80; p += 8) px.push(p);
  for (let p = 96; p <= 160; p += 16) px.push(p);
  return px;
};
var asStack = (fam, fallbackFace, fallback) => {
  if (!fam) return [fallbackFace, ...fallback];
  const arr = Array.isArray(fam) ? fam : [fam];
  return arr.length > 1 ? arr : [...arr, ...fallback];
};
var TYPE_FAMILY_DEFAULT = {
  display: { face: "Inter", fallback: SANS_FALLBACK },
  title: { face: "Inter", fallback: SANS_FALLBACK },
  label: { face: "Inter", fallback: SANS_FALLBACK },
  eyebrow: { face: "Inter", fallback: SANS_FALLBACK },
  body: { face: "Inter", fallback: SANS_FALLBACK },
  caption: { face: "Inter", fallback: SANS_FALLBACK },
  code: { face: "JetBrains Mono", fallback: MONO_FALLBACK }
};
var TYPE_WEIGHTS_DEFAULT = {
  display: ["strong"],
  title: ["strong"],
  label: ["emphasis"],
  eyebrow: ["emphasis"],
  body: ["default", "strong"],
  caption: ["default", "strong"],
  code: ["default"]
};
var REQUIRED_WEIGHT_ROLES = {
  label: { role: "emphasis", why: "the tag and badge bind type.label.*.emphasis by name, and so does the button unless buttonLabelWeight is 'default'" },
  body: { role: "default", why: "the text field, select, textarea and the checkbox, radio and switch rows bind type.body.*.default by name" },
  caption: { role: "default", why: "the textarea and field message bind type.caption.md.default by name" }
};
var BUTTON_LABEL_DEFAULT_ROLE = "default";
var withButtonLabelWeight = (t, w) => {
  if (w !== "default") return t;
  const roles = t?.weights?.label ?? TYPE_WEIGHTS_DEFAULT.label;
  if (!Array.isArray(roles) || roles.includes(BUTTON_LABEL_DEFAULT_ROLE)) return t;
  const label = [...roles, BUTTON_LABEL_DEFAULT_ROLE].sort((a, b) => WEIGHT_ROLE_ORDER.indexOf(a) - WEIGHT_ROLE_ORDER.indexOf(b));
  return { ...t, weights: { ...t?.weights, label } };
};
var TYPE_LINK_DEFAULT = ["body", "caption"];
var TYPE_TRACK_DEFAULT = {
  display: "tight",
  title: "snug",
  label: "normal",
  eyebrow: "wider",
  body: "normal",
  caption: "normal",
  code: "normal"
};
var trackingFor = (group, px) => group === "display" && px >= 96 ? "tighter" : TYPE_TRACK_DEFAULT[group];
var TYPE_VARIANTS = {
  display: [["sm", 48], ["md", 64], ["lg", 80], ["xl", 96], ["2xl", 128], ["3xl", 160]],
  title: [["xs", 18], ["sm", 20], ["md", 24], ["lg", 28], ["xl", 32], ["2xl", 40]],
  body: [["sm", 14], ["md", 16], ["lg", 18]],
  // `lg` = 18 at the label tier's own weight (emphasis/600), added #1260 for the large button label,
  // whose target the owner resolved to 18px/emphasis (2026-09-17). This is deliberately the body-lg
  // SIZE at the label WEIGHT — the two rejected routes were `lg`=16 (following the 12/14 progression,
  // too small) and moving button to `type.body.*` (18px but default/strong, the wrong weight). Label
  // is reading/UI text, so it is EXEMPT from the typeScale shift (see `isHeading` below): `type.label.lg`
  // resolves to 18px in every density (compact/default/expressive alike), which is what lands the owner's
  // 18px at the comfortable (default) density they targeted rather than a rung that drifts under the shift.
  label: [["sm", 12], ["md", 14], ["lg", 18]],
  caption: [["md", 11], ["lg", 12]],
  // small print; lg=12 (standard), md=11 (denser). sm=10 (fine print) is a future opt-in.
  // Eyebrow is part of the HEADING system, not the UI-text system (#328): a kicker sits above a
  // title and scales with the heading it accompanies. It was a single SIZELESS rung, which made
  // `type.eyebrow.<weight>` the only composite path with no size segment. Three rungs now — `lg`
  // exists specifically for the hero kicker, which is also what makes the fluid rule below do
  // anything (with only 12/14 nothing would ever clear the threshold).
  eyebrow: [["sm", 12], ["md", 14], ["lg", 20]],
  code: [["inline", 14]]
};
var TYPE_SCALE_SHIFT = { compact: -1, default: 0, expressive: 1 };
var DISPLAY_VARIANTS = ["sm", "md", "lg", "xl", "2xl", "3xl"];
var oneRungDown = (ladder, px) => {
  const i = ladder.indexOf(px);
  return i > 0 ? ladder[i - 1] : px;
};
var DISPLAY_MOBILE = {
  36: 32,
  40: 32,
  48: 36,
  56: 40,
  64: 40,
  72: 40,
  80: 40,
  96: 48,
  112: 48,
  128: 48,
  144: 48,
  160: 48
};
var mobileEndpoint = (ladder, group, desktopPx) => {
  if (group === "display") return Math.min(desktopPx, DISPLAY_MOBILE[desktopPx] ?? Math.max(oneRungDown(ladder, desktopPx), 32));
  if (group === "title") return desktopPx <= 20 ? desktopPx : Math.min(desktopPx, Math.max(oneRungDown(ladder, desktopPx), 20));
  if (group === "eyebrow") return desktopPx <= 14 ? desktopPx : Math.min(desktopPx, Math.max(oneRungDown(ladder, desktopPx), 12));
  return desktopPx;
};
var HEADING_SIZE_FLOOR = { display: 32, title: 16, eyebrow: 11 };
var PER_MODE_SIZE_GROUPS = Object.keys(HEADING_SIZE_FLOOR);
var lineHeightFor = (group, px) => {
  if (group === "display") return px >= 64 ? "tight" : "snug";
  if (group === "title") return px >= 56 ? "tight" : px >= 28 ? "snug" : "compact";
  if (group === "label" || group === "eyebrow") return "snug";
  if (group === "caption") return "cozy";
  return "normal";
};
var derivedRungFor = (field, group, px) => field === "leadingShift" ? lineHeightFor(group, px) : trackingFor(group, px);
var shiftRung = (keys, key, by) => {
  if (!by) return key;
  const i = keys.indexOf(key);
  return i < 0 ? key : keys[Math.max(0, Math.min(keys.length - 1, i + by))];
};
var buildComposites = (ladder, t, fluid, families) => {
  const boundGroups = new Set(families.map((f) => f.group));
  const leadShift = t.leadingShift ?? {};
  const trackShift = t.trackingShift ?? {};
  const shift = TYPE_SCALE_SHIFT[t.typeScale ?? "default"];
  const ceilingIdx = DISPLAY_VARIANTS.indexOf(t.displayCeiling ?? "3xl");
  const titleFloor = t.titleFloor ?? 18;
  const captionFloor = t.captionFloor ?? 11;
  const sizeFloor = t.sizeFloor ?? 10;
  const shiftPx = (px) => {
    const i = ladder.indexOf(px);
    if (i < 0) return px;
    return ladder[Math.max(0, Math.min(ladder.length - 1, i + shift))];
  };
  const brandSizes = t.sizes ?? {};
  const consumedSizes = /* @__PURE__ */ new Set();
  const brandSizeFor = (g, v) => brandSizes[g]?.[v];
  const ladderSet = new Set(ladder);
  for (const [g, rungs] of Object.entries(brandSizes)) {
    if (!PER_MODE_SIZE_GROUPS.includes(g))
      throw new Error(`typography.sizes: '${g}' is not a heading group \u2014 per-size overrides cover ${PER_MODE_SIZE_GROUPS.join("/")} only. Reading and UI text takes its size from the category, not from a lever.`);
    for (const [variant, px] of Object.entries(rungs ?? {})) {
      if (!ladderSet.has(px))
        throw new Error(`typography.sizes.${g}.${variant}: ${px}px is not a step on the size ladder (${ladder.join(", ")}).`);
      const floor = HEADING_SIZE_FLOOR[g];
      if (px < floor)
        throw new Error(`typography.sizes.${g}.${variant}: ${px}px is below the ${g} floor of ${floor}px \u2014 the smallest size this system emits for ${g} anywhere.`);
    }
  }
  const sizeOverrides = t.sizeOverrides ?? {};
  const consumedOverrides = /* @__PURE__ */ new Set();
  const overrideFor = (g, v) => sizeOverrides[g]?.[v];
  for (const [g, rungs] of Object.entries(sizeOverrides)) {
    if (!PER_MODE_SIZE_GROUPS.includes(g))
      throw new Error(`typography.sizeOverrides: '${g}' is not a heading group \u2014 per-viewport overrides cover ${PER_MODE_SIZE_GROUPS.join("/")} only. Reading and UI text takes one size from its category, not per viewport.`);
    const floor = HEADING_SIZE_FLOOR[g];
    for (const [variant, ov] of Object.entries(rungs ?? {})) {
      for (const vp of ["desktop", "mobile"]) {
        const px = ov?.[vp];
        if (px == null) continue;
        if (!ladderSet.has(px))
          throw new Error(`typography.sizeOverrides.${g}.${variant}.${vp}: ${px}px is not a step on the size ladder (${ladder.join(", ")}).`);
        if (px < floor)
          throw new Error(`typography.sizeOverrides.${g}.${variant}.${vp}: ${px}px is below the ${g} floor of ${floor}px \u2014 the smallest size this system emits for ${g} anywhere.`);
      }
      if (ov?.mobile != null && !fluid)
        throw new Error(`typography.sizeOverrides.${g}.${variant}.mobile: a mobile override needs responsive typography \u2014 set responsive.fluid (it is off, so type is static and there is no mobile endpoint to pin).`);
    }
  }
  const weightsMap = { ...TYPE_WEIGHTS_DEFAULT, ...t.weights ?? {} };
  for (const g of TYPE_GROUPS) {
    const roles = weightsMap[g];
    if (!Array.isArray(roles) || roles.length === 0)
      throw new Error(`typography.weights.${g}: the '${g}' category needs at least one weight role. Removing weights can't remove a type category, so keep one (its default is ${TYPE_WEIGHTS_DEFAULT[g].join("/")}).`);
    const req = REQUIRED_WEIGHT_ROLES[g];
    if (req && !roles.includes(req.role))
      throw new Error(`typography.weights.${g}: the '${g}' category must include '${req.role}', because ${req.why}. Add '${req.role}' back (the set given is ${roles.join("/")}).`);
  }
  const linkGroups = new Set(t.links ?? TYPE_LINK_DEFAULT);
  const italicGroups = new Set(t.italics ?? []);
  const italicDefaultGroups = new Set(t.italicDefault ?? []);
  for (const g of italicDefaultGroups) {
    if (!TYPE_GROUPS.includes(g))
      throw new Error(`typography.italicDefault: '${g}' is not a type category (${TYPE_GROUPS.join("/")}).`);
    if (italicGroups.has(g))
      throw new Error(`typography.italicDefault: '${g}' is also in typography.italics. A category that is italic by default has no upright weight to pair an -italic variant with, so every twin would repeat its bare weight. Keep '${g}' in one list.`);
  }
  const facePins = t.faces ?? {};
  for (const [g, roles] of Object.entries(facePins)) {
    if (!boundGroups.has(g))
      throw new Error(`typography.faces.${g}: '${g}' is not a category this brand binds a face for (${[...boundGroups].join("/")}) \u2014 a face pin names a CUT within a bound category, it can never add one.`);
    const familyPrimary = families.find((f) => f.group === g)?.stack[0];
    for (const [role, pin] of Object.entries(roles ?? {})) {
      if (!WEIGHT_ROLE_ORDER.includes(role))
        throw new Error(`typography.faces.${g}.${role}: '${role}' is not a weight role (${WEIGHT_ROLE_ORDER.join("/")}).`);
      if (!weightsMap[g].includes(role))
        throw new Error(`typography.faces.${g}.${role}: this category does not ship the '${role}' weight role (it ships ${weightsMap[g].join("/")}) \u2014 pin a slot the category has, or add the role to typography.weights.${g}.`);
      if (!pin || typeof pin.family !== "string" || typeof pin.style !== "string" || !pin.family.trim() || !pin.style.trim())
        throw new Error(`typography.faces.${g}.${role}: a face pin needs a non-empty { family, style } \u2014 the exact Figma family and style to bind (e.g. { family: 'ITC Garamond Std', style: 'Light Condensed' }).`);
      if (pin.family !== familyPrimary)
        throw new Error(`typography.faces.${g}.${role}: family '${pin.family}' must match the category's bound family '${familyPrimary}' \u2014 a pin names a WIDTH/STYLE cut WITHIN the face, not a different family. The Text Style binds fontFamily to the category's variable, so a divergent family is dropped at the host.`);
      if (isItalicCut(pin.style))
        throw new Error(`typography.faces.${g}.${role}: '${pin.style}' names an italic cut, and a face pin binds only the Figma style, so code would render it upright. Set italic with the italics levers instead: typography.italicDefault makes italic the category's default cut, and typography.italics adds -italic variants. A face pin is for cuts the weight axis cannot reach, such as a condensed width.`);
      if (italicDefaultGroups.has(g))
        throw new Error(`typography.faces.${g}.${role}: '${g}' is italic by default (typography.italicDefault), and a pin binds its style verbatim, so the upright cut '${pin.style}' would contradict it. Remove the pin, or take '${g}' out of typography.italicDefault.`);
    }
  }
  const out = [];
  const push = (group, variant, sizePx) => {
    const mobilePin = overrideFor(group, variant)?.mobile;
    const sizeMinPx = fluid ? mobilePin ?? mobileEndpoint(ladder, group, sizePx) : sizePx;
    if (mobilePin != null) consumedOverrides.add(`${group}.${variant}`);
    const emit = (weightRole, link, italic) => {
      const weightSeg = `${weightRole}${italic ? "-italic" : ""}${link ? "-link" : ""}`;
      const segs = [group, variant, weightSeg].filter(Boolean);
      const facePin = facePins[group]?.[weightRole];
      out.push({
        group,
        variant,
        weightRole,
        link,
        italic,
        path: segs.join("."),
        sizePx,
        sizeMinPx,
        ...italicDefaultGroups.has(group) ? { italicDefault: true } : {},
        ...facePin ? { facePin } : {},
        // The derived rung is size-sensitive; the per-group nudge shifts that curve
        // rather than replacing it, so `title` keeps tightening as it grows.
        lineHeight: shiftRung(LINE_HEIGHT_KEYS, lineHeightFor(group, sizePx), leadShift[group] ?? 0),
        tracking: shiftRung(LETTER_SPACING_KEYS, trackingFor(group, sizePx), trackShift[group] ?? 0),
        textCase: group === "eyebrow" ? "uppercase" : "none"
      });
    };
    const italicStates = italicGroups.has(group) ? [false, true] : [false];
    const linkOn = linkGroups.has(group);
    for (const weightRole of weightsMap[group]) {
      for (const italic of italicStates) {
        emit(weightRole, false, italic);
        if (linkOn) emit(weightRole, true, italic);
      }
    }
  };
  for (const group of Object.keys(TYPE_VARIANTS)) {
    if (!boundGroups.has(group)) continue;
    const isHeading = group === "display" || group === "title" || group === "eyebrow";
    let prev = -Infinity;
    if (group === "title" && titleFloor === 16) {
      const px = overrideFor("title", "2xs")?.desktop ?? brandSizes.title?.["2xs"] ?? 16;
      if (brandSizes.title?.["2xs"] !== void 0) consumedSizes.add("title.2xs");
      if (overrideFor("title", "2xs")?.desktop !== void 0) consumedOverrides.add("title.2xs");
      push("title", "2xs", px);
      prev = px;
    }
    if (group === "caption") {
      if (sizeFloor === 8) {
        push("caption", "xs", 8);
        prev = 8;
      }
      if (captionFloor === 10) {
        push("caption", "sm", 10);
        prev = 10;
      }
    }
    for (const [i, [variant, base]] of TYPE_VARIANTS[group].entries()) {
      if (group === "display" && i > ceilingIdx) continue;
      const shifted = isHeading ? shiftPx(base) : base;
      const desktopOv = overrideFor(group, variant)?.desktop;
      const sizePx = desktopOv ?? brandSizeFor(group, variant) ?? shifted;
      if (brandSizeFor(group, variant) !== void 0) consumedSizes.add(`${group}.${variant}`);
      if (desktopOv !== void 0) consumedOverrides.add(`${group}.${variant}`);
      if (sizePx <= prev) {
        const pinned = brandSizeFor(group, variant) !== void 0 || desktopOv !== void 0;
        const where = desktopOv !== void 0 ? `typography.sizeOverrides.${group}.${variant}.desktop` : `typography.sizes.${group}.${variant}`;
        throw new Error(`typography: ${group}.${variant} resolves to ${sizePx}px, which is not larger than the previous rung (${prev}px) \u2014 the ramp must be strictly increasing. ${pinned ? `${where} pins it to ${sizePx}px; a pinned size does not move when the scale does, so either release it or move its neighbor.` : `Check typeScale '${t.typeScale ?? "default"}'${group === "title" ? ` + titleFloor ${titleFloor}` : ""}.`}`);
      }
      push(group, variant, sizePx);
      prev = sizePx;
    }
  }
  for (const [g, rungs] of Object.entries(brandSizes))
    for (const variant of Object.keys(rungs ?? {}))
      if (!consumedSizes.has(`${g}.${variant}`)) {
        const shipped = [...new Set(out.filter((c) => c.group === g).map((c) => c.variant))];
        throw new Error(`typography.sizes.${g}.${variant}: that rung is not in this brand's ${g} set${shipped.length ? ` (${shipped.join("/")})` : ""} \u2014 it is trimmed by displayCeiling or not enabled by titleFloor. A size override re-sizes a rung that exists; it never adds one.`);
      }
  for (const [g, rungs] of Object.entries(sizeOverrides))
    for (const [variant, ov] of Object.entries(rungs ?? {})) {
      const named = ov?.desktop !== void 0 || ov?.mobile !== void 0;
      if (named && !consumedOverrides.has(`${g}.${variant}`)) {
        const shipped = [...new Set(out.filter((c) => c.group === g).map((c) => c.variant))];
        throw new Error(`typography.sizeOverrides.${g}.${variant}: that rung is not in this brand's ${g} set${shipped.length ? ` (${shipped.join("/")})` : ""} \u2014 it is trimmed by displayCeiling or not enabled by titleFloor. A viewport override re-sizes a rung that exists; it never adds one.`);
      }
    }
  for (const g of PER_MODE_SIZE_GROUPS) {
    const rungs = out.filter((c) => c.group === g).reduce((acc, c) => acc.some((a) => a.variant === c.variant) ? acc : [...acc, c], []).sort((a, b) => a.sizePx - b.sizePx);
    let prevMin = -Infinity;
    for (const c of rungs) {
      if (c.sizeMinPx > c.sizePx)
        throw new Error(`typography.sizeOverrides.${g}.${c.variant}: mobile ${c.sizeMinPx}px is larger than desktop ${c.sizePx}px \u2014 an override may not invert a rung (mobile \u2264 desktop; the ramp must not grow on the smaller viewport).`);
      if (c.sizeMinPx < prevMin)
        throw new Error(`typography.sizeOverrides.${g}.${c.variant}: mobile ${c.sizeMinPx}px is smaller than a lower rung's mobile ${prevMin}px \u2014 the mobile ramp must not decrease as size grows (an override broke its monotonicity).`);
      prevMin = c.sizeMinPx;
    }
  }
  return out;
};
var deriveFamilies = (fam = {}) => {
  const isVar = (group) => typeof fam.variable === "object" ? fam.variable[group] ?? false : fam.variable ?? false;
  const out = [];
  for (const group of TYPE_GROUPS) {
    const chosen = fam[group];
    if (chosen === null) {
      if (group !== "code")
        throw new Error(`typography.families.${group}: null opts a category out of the system entirely, and only 'code' may do that \u2014 every other category is load-bearing. Omit the key to take the default face, or name one.`);
      continue;
    }
    const d = TYPE_FAMILY_DEFAULT[group];
    out.push({ group, stack: asStack(chosen, d.face, d.fallback), variable: isVar(group) });
  }
  const codeFace = out.find((b) => b.group === "code")?.stack[0];
  if (codeFace) {
    for (const b of out) {
      if (b.group === "code" || Array.isArray(fam[b.group]) || b.stack[0] !== codeFace) continue;
      b.stack = asStack(b.stack[0], b.stack[0], MONO_FALLBACK);
    }
  }
  return out;
};
var deriveTypefaces = (library = [], ...bindingSets) => {
  const out = [];
  for (const bindings of bindingSets) {
    for (const f of bindings) {
      const name = f.stack[0];
      const slug2 = typefaceSlug(name);
      const hit = out.find((t) => t.slug === slug2);
      if (hit) {
        hit.variable = hit.variable || f.variable;
        continue;
      }
      out.push({ slug: slug2, name, stack: f.stack, variable: f.variable });
    }
  }
  for (const raw of library) {
    const name = raw.trim();
    const slug2 = typefaceSlug(name);
    if (out.some((t) => t.slug === slug2)) continue;
    out.push({ slug: slug2, name, stack: asStack(name, name, SANS_FALLBACK), variable: false });
  }
  return out;
};
var brandLineHeights = (t = {}) => LINE_HEIGHTS.map((l) => ({ key: l.key, value: t.lineHeights?.[l.key] ?? l.value }));
var brandLetterSpacings = (t = {}) => LETTER_SPACINGS.map((l) => ({ key: l.key, em: t.letterSpacings?.[l.key] ?? l.em }));
var buildTypography = (t = {}) => {
  const onLadder = (field, ladder, k, v) => {
    if (!Number.isFinite(v)) throw new Error(`typography.${field} '${k}' ${v} is not a finite number`);
    if (!ladder.some((s) => Math.abs(s - v) < 1e-9))
      throw new Error(`typography.${field} '${k}' ${v} is not a step on the ladder \u2014 bind a role to an existing primitive rather than inventing a value. Available: ${ladder.join(", ")}`);
  };
  for (const [k, v] of Object.entries(t.lineHeights ?? {}))
    if (v !== void 0) onLadder("lineHeights", LINE_HEIGHT_LADDER, k, v);
  for (const [k, v] of Object.entries(t.letterSpacings ?? {}))
    if (v !== void 0) onLadder("letterSpacings", LETTER_SPACING_LADDER, k, v);
  const ordered = (field, keys, resolved) => {
    for (let i = 1; i < resolved.length; i++)
      if (resolved[i] < resolved[i - 1])
        throw new Error(`typography.${field}: '${keys[i]}' (${resolved[i]}) resolves below '${keys[i - 1]}' (${resolved[i - 1]}) \u2014 the rung names are a relative-emphasis ramp, so they must stay in order. Re-point the roles instead of crossing them.`);
  };
  ordered("lineHeights", LINE_HEIGHT_KEYS, LINE_HEIGHTS.map((l) => t.lineHeights?.[l.key] ?? l.value));
  ordered("letterSpacings", LETTER_SPACING_KEYS, LETTER_SPACINGS.map((l) => t.letterSpacings?.[l.key] ?? l.em));
  for (const [field, map] of [["leadingShift", t.leadingShift], ["trackingShift", t.trackingShift]])
    for (const [g, n] of Object.entries(map ?? {}))
      if (n !== void 0 && (!Number.isInteger(n) || n < -5 || n > 5))
        throw new Error(`typography.${field} '${g}' ${n} is invalid \u2014 must be an integer number of rungs in [-5, 5]`);
  if ((t.typeScale ?? "default") === "compact" && t.titleFloor === 16)
    throw new Error(`typography: titleFloor 16 is incompatible with typeScale 'compact' \u2014 compact already shifts title.xs down to 16px, so title.2xs would duplicate it. Use titleFloor 18 with 'compact', or titleFloor 16 with 'default'/'expressive'.`);
  const librarySeen = /* @__PURE__ */ new Set();
  for (const raw of t.typefaceLibrary ?? []) {
    if (typeof raw !== "string" || !raw.trim())
      throw new Error(`typography.typefaceLibrary contains an empty entry \u2014 every entry must be a non-empty font family name`);
    const slug2 = typefaceSlug(raw.trim());
    if (librarySeen.has(slug2))
      throw new Error(`typography.typefaceLibrary lists '${raw.trim()}' twice (both resolve to '${slug2}') \u2014 a face appears in the library once`);
    librarySeen.add(slug2);
  }
  const families = deriveFamilies(t.families);
  const wr = { ...WEIGHT_ROLE_DEFAULT, ...t.weightRoles ?? {} };
  const fluid = t.responsive?.fluid ?? true;
  return {
    families,
    typefaces: deriveTypefaces(t.typefaceLibrary, families),
    sizesPx: fontSizeLadder(t.sizeFloor ?? 10),
    // Minted from need, not the full 100–900 axis (#328): emit only the numerics some
    // weight ROLE actually points at. Every `weight-role.<role>` aliases `font.weight.<n>`,
    // so the role values ARE the complete set of referenced numerics — anything else was a
    // dead leaf (default roles use 5 of 9). Per-mode weights union onto this below, which is
    // what keeps a mode's deviating numeric resolvable. The token contract's four standard
    // numerics (300/400/700/900) are ALWAYS minted on top (#1718): the contract guarantees them,
    // and a brand that remaps a role (prism3's `strong: 600`) would otherwise drop one. A brand
    // at the default roles already emits all four, so this moves no existing emission.
    weightsRef: [.../* @__PURE__ */ new Set([...CONTRACT_WEIGHTS, ...WEIGHT_ROLE_ORDER.map((role) => wr[role])])].sort((a, b) => a - b),
    weightRoles: WEIGHT_ROLE_ORDER.map((role) => ({ role, value: wr[role] })),
    lineHeights: brandLineHeights(t),
    letterSpacings: brandLetterSpacings(t),
    typeScale: t.typeScale ?? "default",
    composites: buildComposites(fontSizeLadder(t.sizeFloor ?? 10), t, fluid, families),
    fluid,
    minViewport: t.responsive?.minViewport ?? 375,
    maxViewport: t.responsive?.maxViewport ?? 1280
  };
};
var SHADOW_BASE = [
  { name: "xs", key: [1, 2, 0, 0.1], amb: [1, 3, 0, 0.06] },
  { name: "sm", key: [1, 2, -1, 0.1], amb: [2, 6, -1, 0.07] },
  { name: "md", key: [2, 4, -2, 0.12], amb: [4, 12, -3, 0.08] },
  { name: "lg", key: [3, 6, -3, 0.12], amb: [8, 20, -5, 0.08] },
  { name: "xl", key: [4, 8, -4, 0.14], amb: [14, 32, -8, 0.1] },
  { name: "2xl", key: [6, 12, -6, 0.14], amb: [22, 52, -12, 0.12] }
];
var buildShadow = (neutralHue, input = {}) => {
  const softness = input.softness ?? 1;
  const tint = { hue: input.tint?.hue ?? neutralHue, amount: input.tint?.amount ?? 0.15 };
  const tintL = 0.13 + 0.17 * tint.amount;
  const colorRgb = tint.amount === 0 ? { r: 0, g: 0, b: 0 } : oklchToRgb({ l: tintL, c: maxChroma(tintL, tint.hue) * tint.amount, h: tint.hue });
  const layer = (a) => ({ offsetX: 0, offsetY: a[0], blur: Math.round(a[1] * softness), spread: a[2], alpha: a[3] });
  const darkAlpha = (a, i) => Math.round(a * (0.3 + 0.09 * i) * 100) / 100;
  const darkLayer = (a, i) => ({ offsetX: 0, offsetY: a[0], blur: Math.round(a[1] * softness), spread: a[2], alpha: darkAlpha(a[3], i) });
  const steps = SHADOW_BASE.map((s, i) => ({
    name: s.name,
    light: [layer(s.key), layer(s.amb)],
    dark: [darkLayer(s.key, i), darkLayer(s.amb, i)]
  }));
  const inset = {
    name: "inset",
    light: [{ offsetX: 0, offsetY: 2, blur: Math.round(4 * softness), spread: 0, alpha: 0.08 }],
    dark: [{ offsetX: 0, offsetY: 2, blur: Math.round(4 * softness), spread: 0, alpha: 0.3 }]
  };
  return { steps, inset, colorRgb, softness, tint };
};
var bpNames = (n) => n <= 5 ? ["sm", "md", "lg", "xl", "2xl"].slice(0, n) : ["xs", "sm", "md", "lg", "xl", "2xl", "3xl"].slice(0, n);
var GUTTER_PX = [16, 16, 24, 24, 32, 32];
var MARGIN_PX = [16, 24, 24, 32, 48, 48];
var COLUMN_MIN = 4;
var COLUMN_MAX = 24;
var resolveColumns = (override, ladder) => {
  if (override === void 0 || override === null || !Number.isFinite(override)) return ladder;
  return Math.max(COLUMN_MIN, Math.min(COLUMN_MAX, Math.round(override)));
};
var SPACE_PX_LADDER = spaceScale(SPACE_BASE).map((s) => s.px).sort((a, b) => a - b);
var SPACE_PX_SET = new Set(SPACE_PX_LADDER);
var resolveGap = (override, ladder, field, bp) => {
  if (override === void 0 || override === null) return ladder;
  if (!Number.isFinite(override) || !SPACE_PX_SET.has(override))
    throw new Error(`layout.${field}.${bp}: ${override}px is not a step on the spacing scale (${SPACE_PX_LADDER.join(", ")}) \u2014 gutter and margin snap to the ladder so they can alias space/*.`);
  return override;
};
var buildLayout = (input = {}) => {
  const floors = input.breakpoints ?? [0, 768, 1024, 1440, 1920];
  const base = input.columns ?? 12;
  const n = floors.length;
  const names = bpNames(n);
  const breakpoints = floors.map((px, i) => ({ name: names[i] ?? `bp${i}`, px }));
  const cols = (i) => i === 0 ? Math.min(4, base) : i === n - 1 ? base : i === 1 ? Math.min(8, base) : base;
  const overrides = input.columnOverrides ?? {};
  const gutterOverrides = input.gutterOverrides ?? {};
  const marginOverrides = input.marginOverrides ?? {};
  const grid = breakpoints.map((b, i) => ({
    bp: b.name,
    columns: resolveColumns(overrides[b.name], cols(i)),
    gutterPx: resolveGap(gutterOverrides[b.name], GUTTER_PX[Math.min(i, GUTTER_PX.length - 1)], "gutterOverrides", b.name),
    marginPx: resolveGap(marginOverrides[b.name], MARGIN_PX[Math.min(i, MARGIN_PX.length - 1)], "marginOverrides", b.name)
  }));
  return { breakpoints, grid, baseColumns: base, containerMax: input.containerMax ?? 1440, containerNarrow: input.containerNarrow ?? 720 };
};
var DEFAULT_BRAND_GRADIENT = (brandPalette) => ({
  name: "brand",
  kind: "linear",
  angle: 135,
  stops: [{ palette: brandPalette, step: 600, position: 0 }, { palette: brandPalette, step: 350, position: 1 }]
});
var lerpHue = (h1, h2, t) => {
  const dh = ((h2 - h1) % 360 + 540) % 360 - 180;
  return (h1 + t * dh + 360) % 360;
};
var lerpOklch = (a, b, t) => ({ l: a.l + (b.l - a.l) * t, c: a.c + (b.c - a.c) * t, h: lerpHue(a.h, b.h, t) });
var lerpRgb = (a, b, t) => ({ r: Math.round(a.r + (b.r - a.r) * t), g: Math.round(a.g + (b.g - a.g) * t), b: Math.round(a.b + (b.b - a.b) * t) });
var buildGradient = (spec, palettes, root) => {
  if (!spec) return { gradients: [] };
  const inputs = spec === true ? [DEFAULT_BRAND_GRADIENT("primary")] : spec;
  const seenGradNames = /* @__PURE__ */ new Set();
  for (const g of inputs) {
    if (!PALETTE_NAME_RE.test(g.name))
      throw new Error(`gradient name '${g.name}' must be a single lowercase slug (letters/digits/hyphen, start with a letter \u2014 no dots, spaces, or symbols)`);
    if (seenGradNames.has(g.name))
      throw new Error(`duplicate gradient name '${g.name}' \u2014 gradient names must be unique`);
    seenGradNames.add(g.name);
  }
  const stepOf = (palette, step) => {
    const p = palettes.find((pp) => pp.palette === palette);
    if (!p) throw new Error(`gradient: palette '${palette}' is not defined (have: ${palettes.map((x) => x.palette).join(", ")})`);
    const s = p.steps.find((st) => st.num === step);
    if (!s) throw new Error(`gradient: '${palette}.${step}' is not a valid ramp step`);
    return s;
  };
  const gradients = inputs.map((g) => {
    const kind = g.kind ?? "linear";
    const interpolation = g.interpolation ?? "oklch";
    const samples = Math.max(2, g.samples ?? 5);
    const stops = g.stops.slice().sort((a, b) => a.position - b.position).map((st) => {
      const s = stepOf(st.palette, st.step);
      return { aliasOf: `${root}.${CORE_TIER}.palette.${st.palette}.${s.key}`, position: st.position, rgb: s.rgb, hex: s.hex, oklch: s.oklch };
    });
    const sampleRgb = (p) => {
      if (p <= stops[0].position) return stops[0].rgb;
      if (p >= stops[stops.length - 1].position) return stops[stops.length - 1].rgb;
      for (let i = 0; i < stops.length - 1; i++) {
        const a = stops[i], b = stops[i + 1];
        if (p >= a.position && p <= b.position) {
          const t = (p - a.position) / (b.position - a.position || 1);
          return interpolation === "oklch" ? oklchToRgb(lerpOklch(a.oklch, b.oklch, t)) : lerpRgb(a.rgb, b.rgb, t);
        }
      }
      return stops[stops.length - 1].rgb;
    };
    const sampledRgb = Array.from({ length: samples }, (_, i) => sampleRgb(i / (samples - 1)));
    const sampled = sampledRgb.map((rgb, i) => ({ hex: hex(rgb), position: Math.round(i / (samples - 1) * 1e3) / 1e3 }));
    const WHITE3 = { r: 255, g: 255, b: 255 }, BLACK3 = { r: 0, g: 0, b: 0 };
    const worstOnWhite = Math.min(...sampledRgb.map((c) => contrast(c, WHITE3)));
    const worstOnBlack = Math.min(...sampledRgb.map((c) => contrast(c, BLACK3)));
    return {
      name: g.name,
      kind,
      angle: g.angle ?? 135,
      center: g.center ?? [0.5, 0.5],
      shape: g.shape ?? "ellipse",
      interpolation,
      stops,
      sampled,
      worstOnWhite,
      worstOnBlack
    };
  });
  return { gradients };
};
var diffAssign = (map, mode, cand2, baseJson) => {
  if (JSON.stringify(cand2) === baseJson) return false;
  map[mode] = cand2;
  return true;
};
var brandTheme = (brandInput) => {
  const notes = [];
  const resolved = resolveVocabulary(brandInput);
  const input = resolved.input;
  notes.push(...resolved.notes);
  const root = input.root ?? "prism";
  if (!/^[a-z][a-z0-9-]*$/.test(root)) {
    throw new Error(`root namespace '${root}' must be a single lowercase segment (letters/digits/hyphen, no dots or spaces)`);
  }
  const modes = input.modes ?? ALL_MODES;
  const badMode = modes.find((m) => !VALID_MODES.includes(m));
  if (badMode) throw new Error(`unknown mode '${badMode}' (valid: ${VALID_MODES.join(", ")})`);
  if (!modes.includes("light")) throw new Error('modes must include "light" (the required base mode)');
  const stdModes = modes.filter((m) => m !== "wireframe");
  if (stdModes.length < ALL_MODES.length) notes.push(`modes: generating ${stdModes.join(", ")} only (dark/HC opt-out)`);
  if (modes.includes("wireframe")) notes.push("modes: wireframe generated (grayscale \u2014 non-neutral roles \u2192 equivalent neutral; radius \u2192 0)");
  const CUSTOM_MODE_RE = /^[a-z0-9][a-z0-9-]*$/;
  const customModes = input.customModes ?? [];
  const customNames = [];
  for (const cm of customModes) {
    if (!CUSTOM_MODE_RE.test(cm.name))
      throw new Error(`customModes: name '${cm.name}' must be a slug (lowercase letters/digits/hyphen, start with a letter or digit \u2014 no spaces, dots, or symbols)`);
    if (VALID_MODES.includes(cm.name))
      throw new Error(`customModes: name '${cm.name}' is a reserved built-in mode \u2014 custom mode names must be distinct`);
    if (customNames.includes(cm.name))
      throw new Error(`customModes: duplicate custom mode name '${cm.name}' \u2014 custom mode names must be unique`);
    if (cm.base !== "light" && cm.base !== "dark")
      throw new Error(`customModes: '${cm.name}' base '${cm.base}' must be a CUSTOMIZABLE built-in (light or dark) \u2014 hc/wireframe cannot be a custom-mode base`);
    if (!modes.includes(cm.base))
      throw new Error(`customModes: '${cm.name}' base '${cm.base}' is not in this brand's generated modes (${modes.join(", ")})`);
    customNames.push(cm.name);
  }
  const modesAll = customNames.length ? [...modes, ...customNames] : modes;
  if (customModes.length) notes.push(`customModes: ${customModes.map((cm) => `${cm.name} (live-inherits ${cm.base})`).join(", ")} \u2014 each re-derives like its base every build; customizable via overrides/modeAnchors`);
  const CUSTOMIZABLE_MODES = ["light", "dark", ...customNames];
  for (const m of Object.keys(input.overrides ?? {})) {
    if (!modesAll.includes(m))
      throw new Error(`overrides: mode '${m}' is not in this brand's modes (${modesAll.join(", ")}) \u2014 nothing to override`);
    if (!CUSTOMIZABLE_MODES.includes(m))
      throw new Error(`overrides: mode '${m}' is generate-only and not customizable \u2014 only ${CUSTOMIZABLE_MODES.join("/")} accept overrides`);
  }
  if (Object.keys(input.overrides ?? {}).length) notes.push(`overrides: per-mode color overrides applied for ${Object.keys(input.overrides).join(", ")} (roles repointed to specific primitive steps; tuned picks that miss a contrast min are warned, not blocked)`);
  for (const m of Object.keys(input.modeAnchors ?? {})) {
    if (!modesAll.includes(m))
      throw new Error(`modeAnchors: mode '${m}' is not in this brand's modes (${modesAll.join(", ")})`);
    if (!CUSTOMIZABLE_MODES.includes(m))
      throw new Error(`modeAnchors: mode '${m}' is generate-only and not customizable \u2014 only ${CUSTOMIZABLE_MODES.join("/")} accept per-mode anchors`);
  }
  if (Object.keys(input.modeAnchors ?? {}).length) notes.push(`modeAnchors: per-mode interactive anchors for ${Object.keys(input.modeAnchors).join(", ")} (a column's fill re-anchored per mode; still floor-gated)`);
  const MOTION_TEMPO_VALUES = ["snappy", "standard", "relaxed"];
  const DENSITY_VALUES = ["comfortable", "compact", "spacious"];
  for (const m of Object.keys(input.modeLevers ?? {})) {
    if (!modesAll.includes(m))
      throw new Error(`modeLevers: mode '${m}' is not in this brand's modes (${modesAll.join(", ")})`);
    if (!CUSTOMIZABLE_MODES.includes(m))
      throw new Error(`modeLevers: mode '${m}' is generate-only and not customizable \u2014 only ${CUSTOMIZABLE_MODES.join("/")} accept per-mode levers`);
    if (m === "light")
      throw new Error(`modeLevers: 'light' is the global baseline for the non-color levers \u2014 set the global radius/density/tempo/shadow/typography levers directly, not modeLevers.light`);
    const lev = input.modeLevers[m];
    if (lev.radius !== void 0 && (!Number.isFinite(lev.radius) || lev.radius < 0 || lev.radius > 2))
      throw new Error(`modeLevers: mode '${m}' radius ${lev.radius} is out of range \u2014 must be a finite number in [0, 2]`);
    for (const [role, w] of Object.entries(lev.weights ?? {})) {
      if (w !== void 0 && (!Number.isFinite(w) || w < 100 || w > 900))
        throw new Error(`modeLevers: mode '${m}' weight '${role}' ${w} is out of range \u2014 must be a finite number in [100, 900]`);
    }
    const rungCheck = (obj, keys, label, brandField) => {
      for (const [k, v] of Object.entries(obj ?? {})) {
        if (v === void 0) continue;
        if (typeof v === "number")
          throw new Error(`modeLevers: mode '${m}' ${label} '${k}' is ${v} \u2014 per-mode ${label} names a TARGET RUNG (one of ${keys.join("/")}), not a value. To change what a rung is worth, set typography.${brandField} (brand-wide; rungs are mode-invariant primitives, #296).`);
        if (!keys.includes(String(v)))
          throw new Error(`modeLevers: mode '${m}' ${label} '${k}' \u2192 '${v}' is not a rung \u2014 must be one of ${keys.join("/")}`);
        if (!keys.includes(k))
          throw new Error(`modeLevers: mode '${m}' ${label} source '${k}' is not a rung \u2014 must be one of ${keys.join("/")}`);
      }
    };
    rungCheck(lev.lineHeights, LINE_HEIGHT_KEYS, "lineHeight", "lineHeights");
    rungCheck(lev.letterSpacings, LETTER_SPACING_KEYS, "letterSpacing", "letterSpacings");
    if (lev.tempo !== void 0 && !MOTION_TEMPO_VALUES.includes(lev.tempo))
      throw new Error(`modeLevers: mode '${m}' tempo '${lev.tempo}' is invalid \u2014 must be one of ${MOTION_TEMPO_VALUES.join("/")}`);
    if (lev.shadow?.softness !== void 0 && (!Number.isFinite(lev.shadow.softness) || lev.shadow.softness < 0 || lev.shadow.softness > 2))
      throw new Error(`modeLevers: mode '${m}' shadow softness ${lev.shadow.softness} is out of range \u2014 must be a finite number in [0, 2]`);
    if (lev.shadow?.tint?.hue !== void 0 && (!Number.isFinite(lev.shadow.tint.hue) || lev.shadow.tint.hue < 0 || lev.shadow.tint.hue > 360))
      throw new Error(`modeLevers: mode '${m}' shadow tint hue ${lev.shadow.tint.hue} is out of range \u2014 must be a finite number in [0, 360]`);
    if (lev.shadow?.tint?.amount !== void 0 && (!Number.isFinite(lev.shadow.tint.amount) || lev.shadow.tint.amount < 0 || lev.shadow.tint.amount > 1))
      throw new Error(`modeLevers: mode '${m}' shadow tint amount ${lev.shadow.tint.amount} is out of range \u2014 must be a finite number in [0, 1]`);
    if (lev.density !== void 0 && !DENSITY_VALUES.includes(lev.density))
      throw new Error(`modeLevers: mode '${m}' density '${lev.density}' is invalid \u2014 must be one of ${DENSITY_VALUES.join("/")}`);
  }
  const leverModes = Object.entries(input.modeLevers ?? {}).filter(([, l]) => l && (l.radius !== void 0 || l.families || l.weights || l.lineHeights || l.letterSpacings || l.tempo || l.shadow || l.density)).map(([m]) => m);
  if (leverModes.length) notes.push(`modeLevers: per-mode lever overrides for ${leverModes.join(", ")} (radius / font family / font weight / line-height / letter-spacing / motion tempo / shadow / density re-derived per mode via the same helpers as the baseline; a mode deviates the global lever, the composite/token set is untouched)`);
  const enumLevers = [
    { path: "density", value: input.density, options: DENSITY_VALUES },
    { path: "controlShape", value: input.controlShape, options: ["rounded", "pill", "boxed", "hairline"] },
    { path: "buttonIcons", value: input.buttonIcons, options: ["attached", "edges"] },
    { path: "buttonContentSize", value: input.buttonContentSize, options: ["match", "smaller"] },
    { path: "buttonLabelWeight", value: input.buttonLabelWeight, options: ["default", "emphasis"] },
    { path: "typography.typeScale", value: input.typography?.typeScale, options: ["compact", "default", "expressive"] },
    { path: "typography.displayCeiling", value: input.typography?.displayCeiling, options: DISPLAY_VARIANTS },
    { path: "typography.titleFloor", value: input.typography?.titleFloor, options: [16, 18] },
    { path: "typography.captionFloor", value: input.typography?.captionFloor, options: [10, 11] },
    { path: "typography.sizeFloor", value: input.typography?.sizeFloor, options: [8, 10] },
    { path: "motionPersonality.tempo", value: input.motionPersonality?.tempo, options: MOTION_TEMPO_VALUES },
    { path: "iconContrast", value: input.iconContrast, options: ["text", "3:1"] },
    { path: "disabledStrategy", value: input.disabledStrategy, options: ["full", "reduced", "accessible", "conventional"] },
    { path: "outlineInteraction", value: input.outlineInteraction, options: ["overlay-neutral", "solid-tint", "none"] },
    { path: "neutralEmphasis", value: input.neutralEmphasis, options: ["subtle", "strong"] }
  ];
  for (const { path, value, options } of enumLevers) {
    if (value !== void 0 && !options.includes(value))
      throw new Error(`${path}: ${JSON.stringify(value)} is invalid \u2014 must be one of ${options.join("/")}`);
  }
  const rangeLevers = [
    { path: "radiusScale", value: input.radiusScale, min: 0, max: 2 },
    { path: "baseMd", value: input.baseMd, min: 2, max: 12 },
    { path: "buttonMinWidthMultiplier", value: input.buttonMinWidthMultiplier, min: 1, max: 4 },
    { path: "shadow.softness", value: input.shadow?.softness, min: 0, max: 2 },
    { path: "layout.columns", value: input.layout?.columns, min: 4, max: 24 },
    { path: "layout.containerMax", value: input.layout?.containerMax, min: 960, max: 1920 },
    { path: "layout.containerNarrow", value: input.layout?.containerNarrow, min: 480, max: 960 },
    { path: "neutral.chroma", value: input.neutral.chroma, min: 0, max: 0.03 }
  ];
  for (const { path, value, min, max } of rangeLevers) {
    if (value === void 0) continue;
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max)
      throw new Error(`${path}: ${JSON.stringify(value)} is out of range \u2014 must be a finite number in [${min}, ${max}]`);
  }
  if (root !== "prism") notes.push(`namespace: tokens emit under '${root}.*' (custom, not the 'prism' default)`);
  const anchorStep = autoPlaceStep(input.primary.l);
  notes.push(`primary anchor (h${input.primary.h}) pinned exactly at step ${anchorStep}`);
  const gamutNote = (name, o) => {
    if (inGamut(o)) return;
    const mc = Math.round(maxChroma(o.l, o.h, o.c) * 1e3) / 1e3;
    notes.push(`anchor '${name}' (L${o.l} C${o.c} h${o.h}) is OUT of sRGB gamut \u2014 max renderable chroma at this L/hue is ~${mc}; it ships clamped toward the boundary, so its lightness and hue may drift. Lower its chroma to ~${mc} for an exact match.`);
  };
  gamutNote("primary", input.primary);
  for (const bc of input.brandColors ?? []) gamutNote(bc.name, bc.oklch);
  if (input.neutral.anchor) gamutNote("neutral", input.neutral.anchor);
  const nAnchor = input.neutral.anchor;
  const nHue = input.neutral.auto ? input.primary.h : input.neutral.hue;
  const neutralSteps = nAnchor ? generateRamp({ hue: nAnchor.h, chroma: nAnchor.c, anchor: { oklch: nAnchor, stepNum: autoPlaceStep(nAnchor.l) } }) : generateRamp({ hue: nHue, chroma: input.neutral.chroma });
  if (nAnchor) notes.push(`neutral pinned around a pre-defined gray (L${nAnchor.l}) at step ${autoPlaceStep(nAnchor.l)} \u2014 ramp built from the anchor, not the hue/chroma cast`);
  else if (input.neutral.auto) notes.push(`neutral hue auto-follows the brand primary (H${Math.round(input.primary.h)}) \u2014 recoloring the brand re-tracks the cast`);
  const palettes = [
    { palette: "primary", role: "brand", description: "Brand primary", steps: generateRamp({ hue: input.primary.h, chroma: input.primary.c, anchor: { oklch: input.primary, stepNum: anchorStep } }) },
    { palette: "neutral", role: "neutral", description: "Neutral", steps: neutralSteps }
  ];
  const seenNames = /* @__PURE__ */ new Set();
  for (const bc of input.brandColors ?? []) {
    if (!PALETTE_NAME_RE.test(bc.name))
      throw new Error(`brand color name '${bc.name}' must be a single lowercase slug (letters/digits/hyphen, start with a letter \u2014 no dots, spaces, or symbols)`);
    if (RESERVED_PALETTES.has(bc.name))
      throw new Error(`brand color name '${bc.name}' is reserved (an engine-generated palette) \u2014 it would overwrite that ramp; pick a distinct name`);
    if (seenNames.has(bc.name))
      throw new Error(`duplicate brand color name '${bc.name}' \u2014 brand color names must be unique`);
    seenNames.add(bc.name);
  }
  for (const bc of input.brandColors ?? []) {
    palettes.push({ palette: bc.name, role: "brand", description: `Brand ${bc.name}`, steps: generateRamp({ hue: bc.oklch.h, chroma: bc.oklch.c, anchor: { oklch: bc.oklch, stepNum: autoPlaceStep(bc.oklch.l) } }) });
    notes.push(`brand color '${bc.name}' (h${bc.oklch.h}) added`);
  }
  const status = (k) => {
    const supplied = input.status?.[k];
    const s = supplied ? input.status[k] : STATUS_DEFAULTS[k];
    notes.push(supplied ? `${k}: brand-supplied hue ${s.h} \u2014 seeds a vivid ramp from its hue+chroma (not pinned at its measured lightness; the exact swatch may not appear verbatim)` : `${k}: engine default hue ${s.h}`);
    return { palette: k, role: k, description: `${k} status`, steps: statusRamp(s.h, s.chroma) };
  };
  palettes.push(status("success"), status("warning"), status("info"));
  const actionPalette = input.actionPalette ?? "primary";
  if (!palettes.some((p) => p.palette === actionPalette)) {
    throw new Error(`actionPalette '${actionPalette}' is not a defined palette (have: ${palettes.map((p) => p.palette).join(", ")})`);
  }
  notes.push(actionPalette === "primary" ? `action color defaults to the PRIMARY brand palette \u2014 CONFIRM this hue is the intended interactive color for this brand` : `action color is decoupled: uses palette '${actionPalette}', NOT the primary brand palette \u2014 explicit brand decision`);
  const roleToPalette = {
    brand: "primary",
    neutral: "neutral",
    success: "success",
    warning: "warning",
    danger: "danger",
    info: "info",
    action: actionPalette
  };
  if (input.roleColors?.danger) {
  } else if (input.status?.danger) {
    palettes.push({ palette: "danger", role: "danger", description: "danger status (brand-supplied)", steps: statusRamp(input.status.danger.h, input.status.danger.chroma) });
    notes.push(`danger: brand-supplied hue ${input.status.danger.h}`);
  } else if (inRedTerritory(input.primary.h, input.primary.c)) {
    const primarySteps = palettes.find((p) => p.palette === "primary").steps;
    palettes.push({ palette: "danger", role: "danger", description: "danger status (seeded from the red brand primary \u2014 its own ramp so danger stays re-pointable)", steps: primarySteps.map((s) => ({ ...s, oklch: { ...s.oklch }, rgb: { ...s.rgb } })) });
    notes.push(`danger: primary hue ${input.primary.h} (chroma ${input.primary.c}) is a saturated red \u2192 danger seeds from the primary ramp, minted as its own palette (semantic tokens alias palette.danger.*, so danger stays independently re-pointable)`);
  } else {
    const d = STATUS_DEFAULTS.danger;
    palettes.push({ palette: "danger", role: "danger", description: "danger status, engine-generated red ramp (the brand supplies no danger hue)", generated: "red", steps: statusRamp(d.h, d.chroma) });
    const hueIsRed = hueDist(input.primary.h, STATUS_DEFAULTS.danger.h) <= 20;
    notes.push(hueIsRed ? `danger: primary hue ${input.primary.h} is red-ish but its chroma ${input.primary.c} is below the ${RED_CHROMA_FLOOR} floor to read as danger \u2192 carved a dedicated saturated red at hue ${d.h} (a near-gray warm primary can't signal destructive actions)` : `danger: primary hue ${input.primary.h} is NOT red \u2192 carved a dedicated danger red at hue ${d.h}`);
  }
  if (Math.abs(hueDist(input.primary.h, STATUS_DEFAULTS.danger.h) - 20) <= 3 && input.primary.c >= RED_CHROMA_FLOOR)
    notes.push(`danger: primary hue ${input.primary.h} is near the red-territory boundary (\xB120\xB0 of ${STATUS_DEFAULTS.danger.h}) \u2014 a small hue shift would flip the danger strategy`);
  const CANONICAL_HUE = {
    danger: STATUS_DEFAULTS.danger.h,
    success: STATUS_DEFAULTS.success.h,
    warning: STATUS_DEFAULTS.warning.h,
    info: STATUS_DEFAULTS.info.h
  };
  const paletteHue = (pal) => {
    if (pal === "primary") return input.primary.h;
    const bc = input.brandColors?.find((b) => b.name === pal);
    if (bc) return bc.oklch.h;
    if (pal === "danger" || pal === "success" || pal === "warning" || pal === "info") return STATUS_DEFAULTS[pal].h;
    return null;
  };
  for (const [r, pal] of Object.entries(input.roleColors ?? {})) {
    if (r === "brand" || r === "neutral")
      throw new Error(`roleColors: '${r}' defines the surface model and cannot be rebased`);
    if (!palettes.some((p) => p.palette === pal))
      throw new Error(`roleColors.${r} \u2192 '${pal}' is not a defined palette (have: ${palettes.map((p) => p.palette).join(", ")})`);
    roleToPalette[r] = pal;
    notes.push(`roleColors: ${r} re-based on palette '${pal}' \u2014 the ${r} family regenerates on that ramp, re-gated (explicit brand decision)`);
    const want = CANONICAL_HUE[r], got = paletteHue(pal);
    if (want !== void 0 && got !== null && hueDist(got, want) > 40)
      notes.push(`roleColors: ${r} \u2192 '${pal}' hue ${Math.round(got)}\xB0 is far from the canonical ${r} hue ${want}\xB0 (\u0394${Math.round(hueDist(got, want))}\xB0) \u2014 CONFIRM the ${r} signal still reads; contrast holds but the color may mislead`);
  }
  const RESERVED_INTERACTIVE = /* @__PURE__ */ new Set(["primary", "neutral", "destructive"]);
  const interactiveStepFor = (pal) => {
    if (pal === "primary") return anchorStep;
    const bc = (input.brandColors ?? []).find((b) => b.name === pal);
    return bc ? autoPlaceStep(bc.oklch.l) : 500;
  };
  const interactivePalettes = (() => {
    let entries;
    if (input.interactivePalettes !== void 0) {
      if (input.accentPalette !== void 0)
        notes.push(`interactivePalettes is set \u2192 the legacy accentPalette '${input.accentPalette}' is IGNORED (interactivePalettes wins)`);
      entries = input.interactivePalettes;
    } else if (input.accentPalette !== void 0) {
      if (input.accentPalette === actionPalette)
        throw new Error(`accentPalette '${input.accentPalette}' must differ from the action palette (docs/20 \xA73 \u2014 never ship two identical interactive columns)`);
      entries = [{ name: "accent", palette: input.accentPalette }];
    } else {
      return [];
    }
    const seen = /* @__PURE__ */ new Set();
    const resolved2 = [];
    for (const e of entries) {
      const name = e.name ?? e.palette;
      if (!PALETTE_NAME_RE.test(name))
        throw new Error(`interactivePalettes: name '${name}' must be a single lowercase slug (letters/digits/hyphen, start with a letter) \u2014 it becomes the interactive.<name>.* role suffix`);
      if (RESERVED_INTERACTIVE.has(name))
        throw new Error(`interactivePalettes: name '${name}' collides with a built-in interactive column (primary/neutral/destructive) \u2014 pick a distinct name`);
      if (seen.has(name))
        throw new Error(`interactivePalettes: duplicate column name '${name}' \u2014 interactive column names must be unique`);
      if (!palettes.some((p) => p.palette === e.palette))
        throw new Error(`interactivePalettes: palette '${e.palette}' (column '${name}') is not a defined palette (have: ${palettes.map((p) => p.palette).join(", ")})`);
      seen.add(name);
      const anchor = e.anchorStep ?? interactiveStepFor(e.palette);
      resolved2.push({ name, palette: e.palette, anchorStep: anchor, anchorPinned: e.anchorStep !== void 0 });
      notes.push(`interactive column '${name}' \u2192 palette '${e.palette}' (fill step ${anchor}) \u2192 a full interactive.${name}.* column`);
    }
    return resolved2;
  })();
  const usedPalettes = /* @__PURE__ */ new Set([...Object.values(roleToPalette), ...interactivePalettes.map((p) => p.palette)]);
  for (let i = palettes.length - 1; i >= 0; i--) {
    const p = palettes[i];
    if ((p.palette === "success" || p.palette === "warning" || p.palette === "info") && !usedPalettes.has(p.palette)) {
      notes.push(`${p.palette}: rebased via roleColors \u2192 the synthesized ${p.palette} ramp is dropped (no role uses it)`);
      palettes.splice(i, 1);
    }
  }
  const baseUnit = GRID_BASE;
  const spaceBase = SPACE_BASE;
  const density = input.density ?? "comfortable";
  const rScale = input.radiusScale ?? 1;
  const baseMd = input.baseMd ?? 4;
  const radiusHairline = (input.radiusHairline ?? false) || input.controlShape === "hairline";
  const modeLevers = input.modeLevers ?? {};
  const radiusByMode = {};
  const baseRadiusJson = JSON.stringify(radiusScale(rScale, baseMd, 128, 999, radiusHairline));
  for (const [m, lev] of Object.entries(modeLevers)) {
    if (lev?.radius !== void 0) diffAssign(radiusByMode, m, radiusScale(lev.radius, baseMd, 128, 999, radiusHairline), baseRadiusJson);
  }
  const sizesByMode = {};
  const controlsByMode = {};
  for (const [m, lev] of Object.entries(modeLevers)) {
    if (lev?.density && lev.density !== density) {
      sizesByMode[m] = componentSizes(lev.density, spaceBase);
      controlsByMode[m] = controlSizes(lev.density);
    }
  }
  notes.push(`dimension axis: ${baseUnit}px grid, ${spaceBase}px space rhythm, density '${density}' (drives component sizes), radius scale ${rScale} (baseMd ${baseMd}px)`);
  if (radiusHairline) notes.push(`radius: hairline sentinel ON${input.radiusHairline ? "" : " (implied by controlShape: hairline #1371)"} \u2014 a fixed, unscaled radius.hairline = 1px alongside the pills (#1362, opt-in), reachable where the even 2px sub-grid cannot go; the scaled ramp is unchanged.`);
  notes.push(`motion: tempo '${input.motionPersonality?.tempo ?? "standard"}' scales the duration ramp; easing roles + springs + composite transitions generated; reduce-motion variants derived (informational preserved, vestibular \u2192 0)`);
  const motion = buildMotion(input.motionPersonality);
  const baseTempo = input.motionPersonality?.tempo ?? "standard";
  const motionByMode = {};
  for (const [m, lev] of Object.entries(modeLevers)) {
    if (lev?.tempo && lev.tempo !== baseTempo) {
      const mm = buildMotion({ ...input.motionPersonality, tempo: lev.tempo });
      motionByMode[m] = { tempo: mm.tempo, duration: mm.duration, durationReduced: mm.durationReduced, stagger: mm.stagger };
    }
  }
  if (Object.keys(motionByMode).length) motion.motionByMode = motionByMode;
  const CURVES = Object.keys(motion.easing);
  const ROLES = motion.easingRoles.map((r) => r.role);
  const easingRolesByMode = {};
  for (const [m, lev] of Object.entries(modeLevers)) {
    const pairs = Object.entries(lev?.easings ?? {}).filter(([, v]) => v);
    for (const [role, curve] of pairs) {
      if (!ROLES.includes(role)) throw new Error(`modeLevers.${m}.easings: unknown motion role '${role}' (have: ${ROLES.join(", ")})`);
      if (!CURVES.includes(curve)) throw new Error(`modeLevers.${m}.easings.${role}: unknown easing curve '${curve}' (have: ${CURVES.join(", ")})`);
    }
    const base = Object.fromEntries(motion.easingRoles.map((r) => [r.role, r.curve]));
    const diff = pairs.filter(([role, curve]) => curve !== base[role]);
    if (diff.length) easingRolesByMode[m] = Object.fromEntries(diff);
  }
  if (Object.keys(easingRolesByMode).length) {
    motion.easingRolesByMode = easingRolesByMode;
    notes.push(`motion easing re-points: ${Object.entries(easingRolesByMode).map(([m, r]) => `${m} (${Object.entries(r).map(([k, v]) => `${k}\u2192${v}`).join(", ")})`).join("; ")} \u2014 the role points at a different curve in that mode; the curve primitives stay mode-invariant.`);
  }
  const shadow = buildShadow(input.neutral.hue, input.shadow);
  notes.push(`shadow: 6-step ramp (xs\u20132xl) + inset, 2-layer (key+ambient), softness ${shadow.softness}; tinted base (hue ${shadow.tint.hue}, amount ${shadow.tint.amount}${shadow.tint.amount === 0 ? " = pure black" : ""}). Mode-aware, LIFT-primary: full shadow in light; reduced (faded, top-weighted) in dark \u2014 the surface ladder carries dark elevation. Composite shadow \u2192 Figma Effect Style.`);
  const shadowAppearance = { light: "light", dark: "dark" };
  for (const cm of customModes) shadowAppearance[cm.name] = cm.base === "dark" ? "dark" : "light";
  const shadowByMode = {};
  const baseShadowJson = JSON.stringify(shadow);
  for (const [mo, lev] of Object.entries(modeLevers)) {
    if (!lev?.shadow) continue;
    const app2 = shadowAppearance[mo] ?? "light";
    const sm = buildShadow(input.neutral.hue, {
      softness: lev.shadow.softness ?? input.shadow?.softness,
      tint: { hue: lev.shadow.tint?.hue ?? input.shadow?.tint?.hue, amount: lev.shadow.tint?.amount ?? input.shadow?.tint?.amount }
    });
    if (app2 === "light" && JSON.stringify(sm) === baseShadowJson) continue;
    const pick = (st) => app2 === "dark" ? st.dark : st.light;
    const layers = { inset: pick(sm.inset) };
    for (const s of sm.steps) layers[s.name] = pick(s);
    shadowByMode[mo] = { appearance: app2, colorRgb: sm.colorRgb, softness: sm.softness, tint: sm.tint, layers };
  }
  for (const cm of customModes) {
    if (cm.base !== "dark" || shadowByMode[cm.name]) continue;
    const layers = { inset: shadow.inset.dark };
    for (const s of shadow.steps) layers[s.name] = s.dark;
    shadowByMode[cm.name] = { appearance: "dark", colorRgb: shadow.colorRgb, softness: shadow.softness, tint: shadow.tint, layers };
  }
  if (Object.keys(shadowByMode).length) shadow.shadowByMode = shadowByMode;
  const gradient = buildGradient(input.gradients, palettes, root);
  if (gradient.gradients.length) {
    notes.push(`gradient: ${gradient.gradients.length} brand gradient(s) [${gradient.gradients.map((g) => `${g.name} ${g.kind}${g.kind === "linear" ? ` ${g.angle}\xB0` : ""} ${g.stops.length}-stop`).join(", ")}] \u2014 OPT-IN. DTCG composite spine, stop colors alias the ramp; kind/angle/${gradient.gradients[0].interpolation} interpolation in $extensions (DTCG omits them \u2014 issue #101). OKLCH-interpolated + ${gradient.gradients[0].sampled.length}-stop sRGB pre-sample for Figma (sRGB-only); materializes as a Figma Paint Style (only stop colors bind). Worst-case-stop contrast computed for text-on-gradient.`);
  } else {
    notes.push("gradient: none (opt-in axis; brand declared no gradients \u2014 the field-common default).");
  }
  const layout = buildLayout(input.layout);
  notes.push(`layout: ${layout.breakpoints.length} breakpoints (${layout.breakpoints.map((b) => `${b.name} ${b.px}`).join(", ")}); grid base ${layout.baseColumns} cols (ladder ${layout.grid.map((g) => g.columns).join("/")}); gutter/margin alias the spacing scale (${layout.grid.map((g) => g.gutterPx).join("/")} \xB7 ${layout.grid.map((g) => g.marginPx).join("/")}); container max ${layout.containerMax}px + narrow ${layout.containerNarrow}px (fluid-first + cap). Breakpoints \u2192 a separate Figma layout collection (modes), composing with color light/dark.`);
  const typography = buildTypography(withButtonLabelWeight(input.typography, input.buttonLabelWeight));
  if (input.buttonLabelWeight === "default")
    notes.push("button label weight: default \u2014 buttons bind type.label.*.default, so the label category ships the default role beside emphasis; tags and badges keep emphasis.");
  const baseFam = input.typography?.families ?? {};
  const baseWr = { ...WEIGHT_ROLE_DEFAULT, ...input.typography?.weightRoles ?? {} };
  const familiesByMode = {};
  const weightRolesByMode = {};
  const extraWeights = /* @__PURE__ */ new Set();
  const baseFamJson = JSON.stringify(deriveFamilies(baseFam));
  const baseWrJson = JSON.stringify(WEIGHT_ROLE_ORDER.map((role) => ({ role, value: baseWr[role] })));
  const boundGroups = new Set(deriveFamilies(baseFam).map((f) => f.group));
  for (const [m, lev] of Object.entries(modeLevers)) {
    for (const g of Object.keys(lev?.families ?? {}))
      if (!boundGroups.has(g))
        throw new Error(`modeLevers.${m}.families.${g}: '${g}' is not a category this brand binds a face for (${[...boundGroups].join("/")}) \u2014 a mode re-points the categories the brand has; it can never add one.`);
    if (lev?.families) diffAssign(familiesByMode, m, deriveFamilies({ ...baseFam, ...lev.families }), baseFamJson);
    if (lev?.weights) {
      const wrMode = { ...baseWr, ...lev.weights };
      const cand2 = WEIGHT_ROLE_ORDER.map((role) => ({ role, value: wrMode[role] }));
      if (diffAssign(weightRolesByMode, m, cand2, baseWrJson)) {
        for (const w of Object.values(lev.weights)) if (w !== void 0) extraWeights.add(w);
      }
    }
  }
  if (extraWeights.size)
    typography.weightsRef = [.../* @__PURE__ */ new Set([...typography.weightsRef, ...extraWeights])].sort((a, b) => a - b);
  if (Object.keys(familiesByMode).length) typography.familiesByMode = familiesByMode;
  if (Object.keys(familiesByMode).length)
    typography.typefaces = deriveTypefaces(input.typography?.typefaceLibrary, typography.families, ...Object.values(familiesByMode));
  if (Object.keys(weightRolesByMode).length) typography.weightRolesByMode = weightRolesByMode;
  const lineHeightRepointByMode = {};
  const letterSpacingRepointByMode = {};
  for (const [m, lev] of Object.entries(modeLevers)) {
    const lh = Object.entries(lev?.lineHeights ?? {}).filter(([k, v]) => v && v !== k);
    const ls = Object.entries(lev?.letterSpacings ?? {}).filter(([k, v]) => v && v !== k);
    if (lh.length) lineHeightRepointByMode[m] = Object.fromEntries(lh);
    if (ls.length) letterSpacingRepointByMode[m] = Object.fromEntries(ls);
  }
  if (Object.keys(lineHeightRepointByMode).length) typography.lineHeightRepointByMode = lineHeightRepointByMode;
  if (Object.keys(letterSpacingRepointByMode).length) typography.letterSpacingRepointByMode = letterSpacingRepointByMode;
  const lhValue = Object.fromEntries(typography.lineHeights.map((l) => [l.key, l.value]));
  const lsValue = Object.fromEntries(typography.letterSpacings.map((l) => [l.key, l.em]));
  const lhRoleByMode = {};
  const lsRoleByMode = {};
  for (const [m, map] of Object.entries(lineHeightRepointByMode))
    for (const [role, target] of Object.entries(map))
      if (lhValue[target] !== void 0) (lhRoleByMode[m] ??= {})[role] = lhValue[target];
  for (const [m, map] of Object.entries(letterSpacingRepointByMode))
    for (const [role, target] of Object.entries(map))
      if (lsValue[target] !== void 0) (lsRoleByMode[m] ??= {})[role] = lsValue[target];
  if (Object.keys(lhRoleByMode).length) typography.lineHeightRoleByMode = lhRoleByMode;
  if (Object.keys(lsRoleByMode).length) typography.letterSpacingRoleByMode = lsRoleByMode;
  for (const c of typography.composites) {
    for (const [m, map] of Object.entries(lineHeightRepointByMode))
      if (map[c.lineHeight]) (c.lineHeightByMode ??= {})[m] = map[c.lineHeight];
    for (const [m, map] of Object.entries(letterSpacingRepointByMode))
      if (map[c.tracking]) (c.trackingByMode ??= {})[m] = map[c.tracking];
  }
  const typeSizesByMode = {};
  const ladderSet = new Set(typography.sizesPx);
  for (const [m, lev] of Object.entries(modeLevers)) {
    const groups = lev?.typeSizes;
    if (!groups) continue;
    for (const [g, rungs] of Object.entries(groups)) {
      if (!PER_MODE_SIZE_GROUPS.includes(g))
        throw new Error(`modeLevers.${m}.typeSizes: '${g}' is not a heading group \u2014 per-mode sizing covers ${PER_MODE_SIZE_GROUPS.join("/")} only. Reading and UI text (body/label/caption/code) is mode-invariant by contract.`);
      const inGroup = typography.composites.filter((c) => c.group === g);
      const known = [];
      for (const c of inGroup) if (!known.includes(c.variant)) known.push(c.variant);
      const baseSize = new Map(inGroup.map((c) => [c.variant, c.sizePx]));
      for (const [variant, px] of Object.entries(rungs ?? {})) {
        if (!known.includes(variant))
          throw new Error(`modeLevers.${m}.typeSizes.${g}: rung '${variant}' does not exist \u2014 this brand ships ${g} ${known.join("/")}. A mode re-sizes the rungs it has; it can never add or remove one (the set is fixed at brand level by displayCeiling/titleFloor).`);
        if (!ladderSet.has(px))
          throw new Error(`modeLevers.${m}.typeSizes.${g}.${variant}: ${px}px is not a step on this brand's size ladder (${typography.sizesPx.join(", ")}).`);
        const floor = HEADING_SIZE_FLOOR[g];
        if (px < floor)
          throw new Error(`modeLevers.${m}.typeSizes.${g}.${variant}: ${px}px is below the ${g} floor of ${floor}px \u2014 the smallest size this system emits for ${g} anywhere.`);
      }
      const merged = known.map((v) => ({ v, px: rungs[v] ?? baseSize.get(v) }));
      for (let i = 1; i < merged.length; i++)
        if (merged[i].px <= merged[i - 1].px)
          throw new Error(`modeLevers.${m}.typeSizes.${g}: ${merged[i].v} resolves to ${merged[i].px}px, which is not larger than ${merged[i - 1].v} (${merged[i - 1].px}px) \u2014 a mode's ramp must be strictly increasing, same as the brand's. Merged ramp: ${merged.map((x) => `${x.v}=${x.px}`).join(" ")}.`);
      const diff = Object.entries(rungs ?? {}).filter(([v, px]) => baseSize.get(v) !== px);
      if (diff.length) (typeSizesByMode[m] ??= {})[g] = Object.fromEntries(diff);
    }
  }
  if (Object.keys(typeSizesByMode).length) typography.typeSizesByMode = typeSizesByMode;
  for (const c of typography.composites)
    for (const [m, groups] of Object.entries(typeSizesByMode)) {
      const px = groups[c.group]?.[c.variant];
      if (px === void 0) continue;
      (c.sizeByMode ??= {})[m] = px;
      (c.sizeMinByMode ??= {})[m] = typography.fluid ? mobileEndpoint(typography.sizesPx, c.group, px) : px;
    }
  const dispSizes = typography.composites.filter((c) => c.group === "display").map((c) => c.sizePx);
  const reqCeiling = input.typography?.displayCeiling ?? "3xl";
  const effCap = dispSizes.length ? Math.max(...dispSizes) : 0;
  const capNote = dispSizes.length === 0 ? ` \u2014 NOTE: display tier fully trimmed; composite count is below the 15\u201325 norm` : "";
  const varFams = typography.families.filter((f) => f.variable).map((f) => f.group);
  notes.push(`typography: curated rem size ladder (${typography.sizesPx.length} steps, ${typography.sizesPx[0]}\u2013${typography.sizesPx[typography.sizesPx.length - 1]}px \u2014 NOT ratio-derived; covers all bases, clean values); weight roles ${typography.weightRoles.map((w) => w.role).join("/")} \u2192 ${typography.weightRoles.map((w) => w.value).join("/")}; families ${typography.families.map((f) => `${f.group}=${f.stack[0]}`).join(", ")}${varFams.length ? ` (variable: ${varFams.join("/")})` : ""}; typeScale '${typography.typeScale}'. ${typography.composites.length} semantic composites (title/display sizes shifted by typeScale; display capped at rung '${reqCeiling}' (${effCap}px); title tier ${(input.typography?.titleFloor ?? 18) === 16 ? "includes" : "omits"} title.2xs${(input.typography?.captionFloor ?? 11) === 10 || (input.typography?.sizeFloor ?? 10) === 8 ? `; caption tier adds ${[(input.typography?.sizeFloor ?? 10) === 8 ? "caption.xs (8px)" : "", (input.typography?.captionFloor ?? 11) === 10 ? "caption.sm (10px)" : ""].filter(Boolean).join(" + ")}` : ""})${capNote}. ${typography.fluid ? `responsive: ${typography.composites.filter((c) => c.sizeMinPx !== c.sizePx).length} fluid composites (size-dependent mobile shrink \u2014 research-validated, Carbon fluid-display curve: body static, titles ~1 rung, display converges to ~40\u201348px; one min/max pair \u2192 web clamp() ${typography.minViewport}\u2013${typography.maxViewport}px + Figma desktop/mobile modes)` : "responsive: OFF (all sizes static)"}. Line-height unitless multiplier in $value; px-from-ratio materialization for Figma in $extensions.`);
  if ((input.typography?.sizeFloor ?? 10) === 8)
    notes.push(`typography: ESCAPE HATCH \u2014 typography.sizeFloor:8 pushes the size ladder to an 8px floor and ships caption.xs = 8px. 8px sits BELOW the size range this system's contrast ratios were reasoned about and below every practical legibility floor; it is a deliberately opted-in exception (off by default), not a rung a brand reaches by accident. Ship it only for genuine fine print (legal, footnotes, dense product attributes) that has an accessible alternative.`);
  const dStrat = normalizeDisabledStrategy(input.disabledStrategy);
  const dMin = normalizeDisabledMin(input.disabledStrategy, input.disabledMin);
  notes.push(dStrat === "full" ? `disabled: 'full' \u2014 disabled text/icon clears a fixed 4.5:1 (AA text) on the floor. Legibility is guaranteed, so the disabled AFFORDANCE rests on the fill / border / cursor / aria-disabled rather than on dimming \u2014 confirm a disabled control still reads as disabled.` : `disabled: 'reduced' (default) \u2014 disabled text/icon clears ${dMin}:1 on the floor: visibly dimmed but legible. Never below 3:1 \u2014 this system does not use the WCAG 1.4.3/1.4.11 inactive-component exemption. Set disabledStrategy:'full' to guarantee AA text instead.`);
  const oInt = input.outlineInteraction ?? "overlay-neutral";
  notes.push(oInt === "overlay-neutral" ? `interactive overlays: 'overlay-neutral' (default) \u2014 outline/text controls + rows/menus hover with a translucent neutral wash (interactive.<color>.overlay.*), contrast-verified on the composited surface. Set 'solid-tint' (interactive.<color>.subtle-fill.{hover,pressed,selected}: the control's own fill at an opacity step) or 'none' to opt out.` : `interactive overlays: '${oInt}' \u2014 no translucent overlay tokens; outline/text hover uses ${oInt === "solid-tint" ? "interactive.<color>.subtle-fill.*, the control's own fill at an opacity step" : "no hover expression"}`);
  const STATUS_ROLE_SET = /* @__PURE__ */ new Set(["success", "warning", "danger", "info"]);
  const surfaceLabel = (s) => typeof s === "object" ? `${s.palette}.${s.step}` : s === "white" || s === "black" ? s : `neutral.${s}`;
  const checkSurfacePalette = (spec, where) => {
    if (spec == null || typeof spec !== "object") return;
    const pb = palettes.find((p) => p.palette === spec.palette);
    if (!pb) throw new Error(`surfaces.${where}: palette '${spec.palette}' is not a declared palette (have: ${palettes.map((p) => p.palette).join(", ")}). A surface band names neutral (a bare step number), the brand (primary), or a custom brandColor \u2014 not an undeclared name.`);
    if (STATUS_ROLE_SET.has(pb.role)) throw new Error(`surfaces.${where}: palette '${spec.palette}' is a STATUS palette (role '${pb.role}') \u2014 a page band in a semantic status color would use it decoratively, which #898 excludes. Use neutral, the brand, or a custom palette.`);
  };
  for (const [mode, sf] of Object.entries(input.surfaces ?? {})) {
    if (sf?.base != null && typeof sf.base === "object") {
      throw new Error(`surfaces.${mode}.base does not accept a palette band \u2014 only the inverse band may (#898). The page ground is neutral-only: use 'white', 'black', or a neutral step number.`);
    }
    checkSurfacePalette(sf?.inverseBase, `${mode}.inverseBase`);
    if (sf?.base !== void 0 && sf.base !== "white" && sf.base !== "black") {
      notes.push(`${mode} primary surface is NON-default (${surfaceLabel(sf.base)}) \u2014 CONFIRM this is the page color; the contrast floor moves with it${sf.floorStep ? ` (floor neutral.${sf.floorStep})` : ""}`);
    } else if (sf?.floorStep !== void 0) {
      notes.push(`${mode} contrast floor overridden to neutral.${sf.floorStep}`);
    }
    if (typeof sf?.inverseBase === "object") {
      notes.push(`${mode} inverse band is a BRAND surface (${surfaceLabel(sf.inverseBase)}) \u2014 CONFIRM contrast; every role gated against the band re-derives and any that miss its floor are flagged (#898)`);
    }
  }
  const actionBrandColor = (input.brandColors ?? []).find((b) => b.name === actionPalette);
  const actionAnchorStep = actionPalette === "primary" ? anchorStep : actionBrandColor ? autoPlaceStep(actionBrandColor.oklch.l) : 500;
  if (actionBrandColor) notes.push(`action anchored at accent '${actionPalette}' step ${actionAnchorStep} (its pinned lightness) \u2014 the brand's own shade, nudged only if it fails AA on the floor`);
  const linkPalette = input.linkPalette ?? actionPalette;
  if (!palettes.some((p) => p.palette === linkPalette))
    throw new Error(`linkPalette '${linkPalette}' is not a defined palette (have: ${palettes.map((p) => p.palette).join(", ")})`);
  const linkBrandColor = (input.brandColors ?? []).find((b) => b.name === linkPalette);
  const linkAnchorStep = linkPalette === "primary" ? anchorStep : linkBrandColor ? autoPlaceStep(linkBrandColor.oklch.l) : 500;
  if (input.linkPalette !== void 0)
    notes.push(linkPalette === actionPalette ? `link color: explicitly set to '${linkPalette}', the same palette as actions \u2014 links follow interactive color` : `link color is decoupled: links use palette '${linkPalette}', NOT the action palette '${actionPalette}' \u2014 explicit brand decision (#1496)`);
  const rampSteps = (name) => palettes.find((p) => p.palette === name).steps;
  const midStep = (steps) => (steps.find((s) => s.num === 500) ?? steps[Math.floor(steps.length / 2)]).rgb;
  const linkColorDistinct = deltaE2000(midStep(rampSteps(linkPalette)), midStep(rampSteps(roleToPalette.neutral))) >= 7;
  if (!linkColorDistinct)
    notes.push(`link a11y (WCAG 1.4.1, Use of Color): the link palette '${linkPalette}' is not color-distinct from body text \u2014 links need an underline so they are not signaled by color alone. Set an underlined link role via \`typography.links\`. Warned, not forced (#1496).`);
  const neutralEmphasis = input.neutralEmphasis ?? "subtle";
  notes.push(`neutral interactive emphasis: '${neutralEmphasis}'${neutralEmphasis === "strong" ? " \u2014 bold near-black/white neutral fill" : " (light-gray, default)"}; inverse surface-context: always generated (#895 removed the lever)`);
  const strictInteractiveContrast = input.strictInteractiveContrast ?? false;
  notes.push(`strict interactive contrast: ${strictInteractiveContrast ? "ON \u2014 inverse primary and destructive on-fill are the neutral extreme, AA-clean in every state (#1389/B4a, destructive 2026-09-24)" : "off \u2014 inverse primary and destructive carry their colored on-fill (brand / danger, #1244/#1384); rest clears AA, transient hover/pressed may dip"}`);
  return {
    id: input.id,
    root,
    namespace: `${root}.${CORE_TIER}.palette`,
    colorFormat: "hex",
    modes: modesAll,
    palettes,
    roleToPalette,
    notes,
    ...customModes.length ? { customModes } : {},
    ...Object.keys(radiusByMode).length || Object.keys(familiesByMode).length || Object.keys(weightRolesByMode).length || Object.keys(lineHeightRepointByMode).length || Object.keys(letterSpacingRepointByMode).length || Object.keys(motionByMode).length || Object.keys(easingRolesByMode).length || Object.keys(shadowByMode).length || Object.keys(sizesByMode).length ? { modeLevers } : {},
    roleAnchorStep: { brand: anchorStep, neutral: 500, success: 500, warning: 500, danger: 500, info: 500, action: actionAnchorStep },
    linkPalette,
    linkAnchorStep,
    surfaces: input.surfaces,
    overrides: input.overrides,
    modeAnchors: input.modeAnchors,
    disabledStrategy: dStrat,
    disabledMin: dMin,
    iconContrast: input.iconContrast ?? "text",
    outlineInteraction: input.outlineInteraction ?? "overlay-neutral",
    neutralEmphasis,
    strictInteractiveContrast,
    interactivePalettes,
    actionAnchorStep: input.actionAnchorStep,
    destructiveAnchorStep: input.destructiveAnchorStep,
    linkStateRungs: input.linkStateRungs,
    dims: { ...buildDims(baseUnit, spaceBase, density, rScale, baseMd, [], radiusHairline), ...Object.keys(radiusByMode).length ? { radiusByMode } : {}, ...Object.keys(sizesByMode).length ? { sizesByMode, controlsByMode } : {} },
    motion,
    typography,
    shadow,
    layout,
    gradient
  };
};

// ../../packages/engine/persist-input.ts
var PERSIST_VERSION = 2;
var UnrecognizedPersistedInputError = class extends Error {
  constructor(detail) {
    super(
      `This file's saved Prism3 brand data ${detail}. It was likely themed with an older or incompatible version of the plugin and can't be safely restored \u2014 re-theme this file (or re-import the brand) to bring it up to the current schema.`
    );
    this.name = "UnrecognizedPersistedInputError";
  }
};
var serializeBrandInput = (input) => JSON.stringify({ v: PERSIST_VERSION, input });
var deserializeBrandInput = (raw) => {
  if (!raw) return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new UnrecognizedPersistedInputError("is not valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new UnrecognizedPersistedInputError("is not a recognizable Prism3 payload");
  }
  const { v, input } = parsed;
  if (v !== PERSIST_VERSION) {
    throw new UnrecognizedPersistedInputError(
      typeof v === "number" ? `is schema v${v}, but this build understands v${PERSIST_VERSION}` : "has no recognizable schema version stamp"
    );
  }
  if (typeof input !== "object" || input === null) {
    throw new UnrecognizedPersistedInputError("is missing its brand payload");
  }
  return input;
};

// src/persist-local.ts
var BRAND_KEY = "prism3:brandInput";
var persistInput = (store, input) => {
  try {
    store.setItem(BRAND_KEY, serializeBrandInput(input));
  } catch {
  }
};
var restoreInput = (store) => {
  let raw;
  try {
    raw = store.getItem(BRAND_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return deserializeBrandInput(raw);
  } catch {
    return null;
  }
};

// ../../packages/engine/figma-description.ts
var BODY_TEXT_FLOOR = 4.5;
var LARGE_TEXT_ONLY = "large text (\u226524px, or \u226518.66px bold) or non-essential text only";
var BAND_GLOSS = {
  Highlights: "near-white tints",
  Quarter: "light tints",
  Mid: "mid tones",
  ThreeQuarter: "dark shades",
  Shadows: "near-black shade"
};
var BAND_NAME = {
  Highlights: "Highlight",
  Quarter: "Quarter-Tone",
  Mid: "Mid-Tone",
  ThreeQuarter: "Three-Quarter-Tone",
  Shadows: "Shadow"
};
var bandPhrase = (band, keys) => {
  const range = keys.length > 1 ? `steps ${keys[0]}\u2013${keys[keys.length - 1]}` : `step ${keys[0]}`;
  return `${BAND_NAME[band]} band (${BAND_GLOSS[band]}, ${range})`;
};

// ../../packages/engine/modes.ts
var WHITE = { r: 255, g: 255, b: 255 };
var BLACK = { r: 0, g: 0, b: 0 };
var pickMinPass = (cands, surface2, min) => {
  const rated = cands.map((c) => ({ ...c, ratio: contrast(c.rgb, surface2) }));
  const passing = rated.filter((c) => c.ratio >= min).sort((a, b) => a.ratio - b.ratio);
  return passing[0] ?? rated.sort((a, b) => b.ratio - a.ratio)[0];
};
var pickMostExtreme = (cands, surface2) => cands.map((c) => ({ ...c, ratio: contrast(c.rgb, surface2) })).sort((a, b) => b.ratio - a.ratio)[0];
var pickClosest = (cands, surface2, target, min = 0) => {
  const rated = cands.map((c) => ({ ...c, ratio: contrast(c.rgb, surface2) }));
  const eligible = rated.filter((c) => c.ratio >= min);
  if (!eligible.length) return rated.sort((a, b) => b.ratio - a.ratio)[0];
  return eligible.sort((a, b) => Math.abs(a.ratio - target) - Math.abs(b.ratio - target))[0];
};
var pickBrand = (steps, ns, palette, anchorNum, surface2, min, exact = false, alsoClear = [], avoid = []) => {
  const cands = steps.map((s) => ({ path: `${ns}.${palette}.${s.key}`, rgb: s.rgb, num: s.num }));
  const anchor = cands.find((c) => c.num === anchorNum) ?? cands.find((c) => c.num === 500);
  const avoidHex = new Set(avoid.map(hex));
  const clearsExtra = (rgb) => alsoClear.every((g) => contrast(rgb, g) >= min) && !avoidHex.has(hex(rgb));
  if (exact || contrast(anchor.rgb, surface2) >= min && clearsExtra(anchor.rgb))
    return { ...anchor, ratio: contrast(anchor.rgb, surface2) };
  const passing = cands.map((c) => ({ ...c, ratio: contrast(c.rgb, surface2) })).filter((c) => c.ratio >= min && clearsExtra(c.rgb)).sort((a, b) => Math.abs(a.num - anchor.num) - Math.abs(b.num - anchor.num));
  return passing[0] ?? { ...anchor, ratio: contrast(anchor.rgb, surface2) };
};
var outlineFillFamily = (method) => {
  switch (method) {
    case "overlay-neutral":
      return { family: "overlay", opaque: false };
    case "solid-tint":
      return { family: "subtle-fill", opaque: false };
    case "none":
      return { family: null, opaque: false };
  }
};
var outlineFillRole = (method, color, state) => {
  const { family } = outlineFillFamily(method);
  return family ? `interactive.${color}.${family}.${state}` : null;
};
var VEIL_RUNGS = [["subtle", 3], ["medium", 4.5], ["strong", 7]];
var cand = (path, rgb) => ({ path, rgb });
var BUILTIN_MODES = [
  { name: "light", kind: "standard", family: "light", mins: { primaryMin: 7, secondaryMin: 4.5, tertiaryMin: 3, actionMin: 4.5, borderTarget: 1.4, nonTextMin: 3 } },
  { name: "dark", kind: "standard", family: "dark", mins: { primaryMin: 7, secondaryMin: 4.5, tertiaryMin: 3, actionMin: 4.5, borderTarget: 1.8, nonTextMin: 3 } },
  { name: "hc-light", kind: "hc", family: "light", mins: { primaryMin: 15, secondaryMin: 7, tertiaryMin: 4.5, actionMin: 7, borderTarget: 4.5, nonTextMin: 4.5 } },
  { name: "hc-dark", kind: "hc", family: "dark", mins: { primaryMin: 15, secondaryMin: 7, tertiaryMin: 4.5, actionMin: 7, borderTarget: 4.5, nonTextMin: 4.5 } },
  { name: "wireframe", kind: "wireframe", family: "light", mins: { primaryMin: 7, secondaryMin: 4.5, tertiaryMin: 3, actionMin: 4.5, borderTarget: 1.4, nonTextMin: 3 } }
];
var modeConfigs = (ns, neutralPalette, neutral, surfaces = {}, descriptors = BUILTIN_MODES, palettes = [{ palette: neutralPalette, steps: neutral }]) => {
  const stepsByPalette = new Map(palettes.map((p) => [p.palette, p.steps]));
  const nearestIn = (steps, num) => steps.reduce((a, b) => Math.abs(b.num - num) < Math.abs(a.num - num) ? b : a);
  const nNear = (num) => nearestIn(neutral, num);
  const n = (num) => {
    const s = nNear(num);
    return cand(`${ns}.${neutralPalette}.${s.key}`, s.rgb);
  };
  const white = cand(`${ns}.white`, WHITE);
  const black = cand(`${ns}.black`, BLACK);
  const short = (c) => c.path.replace(`${ns}.`, "");
  const surfAt = (num) => num <= 0 ? white : num >= 1e3 ? black : n(num);
  const surfAtP = (paletteName, num) => {
    if (paletteName === neutralPalette) return surfAt(num);
    const steps = stepsByPalette.get(paletteName) ?? neutral;
    const s = nearestIn(steps, num);
    return cand(`${ns}.${paletteName}.${s.key}`, s.rgb);
  };
  const specToSurf = (spec) => typeof spec === "object" ? { pal: spec.palette, num: spec.step } : { pal: neutralPalette, num: spec === "white" ? 0 : spec === "black" ? 1e3 : spec };
  const bgLadder = (pal, baseNum, dir) => ({ primary: surfAtP(pal, baseNum), secondary: surfAtP(pal, baseNum + dir * 50), tertiary: surfAtP(pal, baseNum + dir * 100) });
  const fgLadder = (pal, baseNum, dir) => ({ primary: surfAtP(pal, baseNum + dir * 50), secondary: surfAtP(pal, baseNum + dir * 100), tertiary: surfAtP(pal, baseNum + dir * 150) });
  const resolve = (family, defBase) => {
    const cfg = surfaces[family] ?? {};
    const baseSpec = cfg.base ?? defBase;
    const baseS = specToSurf(baseSpec);
    const defFloor = baseSpec === "white" ? 50 : baseSpec === "black" ? 950 : family === "light" ? baseS.num + 50 : baseS.num - 50;
    const floorStep = cfg.floorStep ?? defFloor;
    const dir = family === "light" ? 1 : -1;
    const invSpec = cfg.inverseBase ?? (family === "light" ? 950 : 25);
    const invS = specToSurf(invSpec);
    const invDir = -dir;
    return {
      base: surfAtP(baseS.pal, baseS.num),
      floor: n(floorStep),
      bg: bgLadder(baseS.pal, baseS.num, dir),
      fg: fgLadder(baseS.pal, baseS.num, dir),
      bgInverse: bgLadder(invS.pal, invS.num, invDir),
      fgInverse: fgLadder(invS.pal, invS.num, invDir),
      invRgb: surfAtP(invS.pal, invS.num).rgb
    };
  };
  const resolved = { light: resolve("light", "white"), dark: resolve("dark", 950) };
  const flat = (c) => ({ primary: c, secondary: c, tertiary: c });
  const mk = (r, kind, family, mins) => ({ surface: r.base, floor: r.floor, floorName: short(r.floor), bg: r.bg, bgInverse: r.bgInverse, fg: r.fg, fgInverse: r.fgInverse, inverseSurface: r.invRgb, family, kind, ...mins });
  const hcMk = (base, inv, floor, family, mins) => ({ surface: base, floor, floorName: short(floor), bg: flat(base), bgInverse: flat(inv), fg: flat(base), fgInverse: flat(inv), inverseSurface: inv.rgb, family, kind: "hc", ...mins });
  const out = {};
  for (const d of descriptors) {
    out[d.name] = d.kind === "hc" ? hcMk(d.family === "light" ? white : black, d.family === "light" ? black : white, resolved[d.family].floor, d.family, d.mins) : mk(resolved[d.family], d.kind, d.family, d.mins);
  }
  return out;
};
var FILL_STATES = ["default", "hover", "pressed", "focused", "selected"];
var LINK_STATES = ["default", "hover", "visited", "focused", "pressed"];
var isLinkRole = (rolePath) => rolePath.includes(".link.");
var SEMANTICS = ["brand", "success", "warning", "danger", "info"];
var GROUND_INPUT = {
  "background.primary": "base",
  "inverse.background.primary": "inverseBase"
};
var ICON_TWIN_OF_TEXT = /^((?:inverse\.)?interactive\.[^.]+\.)text\.(rest|hover|pressed)$/;
function withIconTwins(ov) {
  if (!ov) return ov;
  const out = { ...ov };
  for (const [rolePath, ref] of Object.entries(ov)) {
    const m = ICON_TWIN_OF_TEXT.exec(rolePath);
    if (!m) continue;
    const iconPath = `${m[1]}icon.${m[2]}`;
    if (!(iconPath in ov)) out[iconPath] = ref;
  }
  return out;
}
var EXTREME_TIE = 0.05;
var pureExtremeInk = (fill, family, min) => {
  const w = contrast(WHITE, fill), b = contrast(BLACK, fill);
  if (family === "dark" && w >= min && b >= min && Math.abs(w - b) <= EXTREME_TIE) return "white";
  return w >= b ? "white" : "black";
};
var FILL_TWIN_OF_REST = /^(interactive\.[^.]+\.)fill\.rest$/;
function withFillStateTwins(ov) {
  if (!ov) return ov;
  const out = { ...ov };
  for (const [rolePath, ref] of Object.entries(ov)) {
    const m = FILL_TWIN_OF_REST.exec(rolePath);
    if (!m) continue;
    for (const st of ["focused", "selected"]) {
      const twin = `${m[1]}fill.${st}`;
      if (!(twin in ov)) out[twin] = ref;
    }
  }
  return out;
}
var engineGrounds = (roles) => {
  const g = /* @__PURE__ */ new Set();
  for (const r of Object.values(roles)) {
    for (const ref of [r.against, r.legibleFor])
      if (ref && ref !== "self") g.add(ref);
  }
  return g;
};
var groundDependentsOf = (roles, g) => Object.keys(roles).filter((k) => roles[k].against === g || roles[k].legibleFor === g).sort();
var resolveMode = (mode, cfg, theme2, ramps) => {
  const ns = theme2.namespace;
  const r2p = theme2.roleToPalette;
  const neutral = ramps.get(r2p.neutral);
  const ramp = neutral.map((s) => cand(`${ns}.${r2p.neutral}.${s.key}`, s.rgb));
  const hc = cfg.kind === "hc";
  const textCands = hc ? [cand(`${ns}.white`, WHITE), ...ramp, cand(`${ns}.black`, BLACK)] : ramp;
  const baseRgb = cfg.surface.rgb;
  const floorRgb = cfg.floor.rgb;
  const invRgb = cfg.inverseSurface;
  const onMin = 4.5;
  const fillFloorMin = cfg.kind === "hc" ? cfg.actionMin : cfg.nonTextMin;
  const roles = {};
  const rgbByRole = /* @__PURE__ */ new Map();
  const rated = (c, surf) => ({ ...c, ratio: contrast(c.rgb, surf) });
  const ovRefs = theme2.overrides?.[mode] ?? {};
  const ovRgb = /* @__PURE__ */ new Map();
  for (const [rolePath, ref] of Object.entries(ovRefs)) {
    const steps = ramps.get(ref.palette);
    if (!steps) throw new Error(`overrides[${mode}]: unknown palette '${ref.palette}' (role '${rolePath}')`);
    const step = steps.find((s) => s.key === ref.step);
    if (!step) throw new Error(`overrides[${mode}]: unknown step '${ref.step}' in palette '${ref.palette}' (role '${rolePath}')`);
    ovRgb.set(rolePath, step.rgb);
  }
  const asGround = (key, computed) => ovRgb.get(key) ?? computed;
  const put = (key, r, description, against, min) => {
    roles[key] = { path: r.path, description, ratio: r.ratio, against, min, hex: hex(r.rgb), model: "ink-on-surface" };
    rgbByRole.set(key, r.rgb);
  };
  const putSurf = (key, c, description) => {
    roles[key] = { path: c.path, description, ratio: 1, against: "self", min: 0, hex: hex(c.rgb), model: "ink-on-surface" };
    rgbByRole.set(key, c.rgb);
  };
  const putWash = (key, r, description, ground, legibleFor, min, alpha) => {
    roles[key] = { path: r.path, description, ratio: r.ratio, against: ground, min, hex: hex(r.rgb), model: "ink-on-composite", legibleFor, alpha };
    rgbByRole.set(key, r.rgb);
  };
  const pStep = (palette, num) => {
    const steps = ramps.get(palette);
    const s = steps.reduce((a, b) => Math.abs(b.num - num) < Math.abs(a.num - num) ? b : a);
    return cand(`${ns}.${palette}.${s.key}`, s.rgb);
  };
  const N025 = () => pStep(r2p.neutral, 25);
  const N950 = () => pStep(r2p.neutral, 950);
  const brandOnFill = (palette, fill, alsoClear = []) => {
    if (hc) return onColor(fill);
    const steps = [...ramps.get(palette) ?? []].sort((a, b) => a.num - b.num);
    if (!steps.length) return onColor(fill);
    const order = contrast(fill, BLACK) >= contrast(fill, WHITE) ? steps : [...steps].reverse();
    const clears = (st, grounds) => grounds.every((g) => contrast(st.rgb, g) >= onMin);
    const pick = order.find((st) => clears(st, [fill, ...alsoClear])) ?? order.find((st) => clears(st, [fill])) ?? order[order.length - 1];
    return rated(cand(`${ns}.${palette}.${pick.key}`, pick.rgb), fill);
  };
  const onColor = (fill) => {
    const extreme = () => pureExtremeInk(fill, cfg.family, onMin) === "white" ? rated(cand(`${ns}.white`, WHITE), fill) : rated(cand(`${ns}.black`, BLACK), fill);
    if (hc) return extreme();
    const lightCand = cfg.family === "light" ? cand(`${ns}.white`, WHITE) : N025();
    const cL = rated(lightCand, fill), cD = rated(N950(), fill);
    const win = cL.ratio >= cD.ratio ? cL : cD;
    if (win.ratio >= onMin) return win;
    return extreme();
  };
  const wf = cfg.kind === "wireframe";
  const neutralPal = r2p.neutral;
  const palOf = (palette) => wf && palette !== neutralPal ? neutralPal : palette;
  const chromatic = (palette, anchorNum, surf, min, exact = false, alsoClear = [], avoid = []) => {
    const pick = pickBrand(ramps.get(palette), ns, palette, anchorNum, surf, min, exact, alsoClear, avoid);
    return wf && palette !== neutralPal ? pickBrand(ramps.get(neutralPal), ns, neutralPal, pick.num, surf, min, exact, alsoClear, avoid) : pick;
  };
  const paletteRole = (r, surf, min) => chromatic(r2p[r], theme2.roleAnchorStep[r], surf, min);
  const dir = cfg.family === "light" ? 1 : -1;
  const stateRungs = interactiveStateRungs;
  const LINK_STATE_DE = 7;
  const walk = (palette, fromNum, steps, d = dir, guard, percept) => {
    const pal = palOf(palette);
    const ramp2 = ramps.get(pal);
    const near = (n) => ramp2.reduce((a, b) => Math.abs(b.num - n) < Math.abs(a.num - n) ? b : a);
    const lo = ramp2.reduce((m, s2) => Math.min(m, s2.num), Infinity);
    const hi = ramp2.reduce((m, s2) => Math.max(m, s2.num), -Infinity);
    const clears = (r) => !guard || contrast(r, guard.surf) >= guard.min;
    const clearsPercept = (a, b) => percept === void 0 || deltaE2000(a, b) >= percept;
    const scan = (dd) => {
      let seen = 0;
      let prev = near(fromNum).rgb;
      for (let k = 1; ; k++) {
        const at2 = fromNum + dd * 50 * k;
        if (at2 < lo || at2 > hi) return void 0;
        const s2 = near(at2);
        if (!clears(s2.rgb)) continue;
        if (!clearsPercept(s2.rgb, prev)) continue;
        prev = s2.rgb;
        if (++seen === steps) return s2;
      }
    };
    const deepestClearing = (() => {
      if (percept === void 0) return void 0;
      const beyond = ramp2.filter((r) => (d > 0 ? r.num > fromNum : r.num < fromNum) && clears(r.rgb));
      return beyond.length ? beyond.reduce((a, b) => (d > 0 ? b.num > a.num : b.num < a.num) ? b : a) : void 0;
    })();
    const s = scan(d) ?? scan(-d) ?? deepestClearing ?? near(fromNum + d * 50 * steps);
    return cand(`${ns}.${pal}.${s.key}`, s.rgb);
  };
  const guardFrom = (ratio, surf, min) => ratio >= min ? { surf, min } : void 0;
  const neutralLow = () => pStep(r2p.neutral, cfg.family === "light" ? 200 : 750);
  const tintStep = cfg.family === "light" ? 100 : 900;
  const mutedStep = cfg.family === "light" ? 450 : 350;
  const subtleTint = (r) => pStep(palOf(r2p[r]), tintStep);
  const semanticInk = (r, min) => chromatic(r2p[r], theme2.roleAnchorStep[r], floorRgb, min, false, [subtleTint(r).rgb]);
  const semanticInkOn = (r, min, g) => chromatic(r2p[r], theme2.roleAnchorStep[r], g.floor, min, false, [g.tint(r).rgb]);
  const disabledFloor = theme2.disabledStrategy === "full" ? 4.5 : theme2.disabledMin;
  const disabledTarget = hc ? Math.max(disabledFloor, 4.5) : disabledFloor;
  const disabledText = () => ({ r: pickMinPass(textCands, floorRgb, disabledTarget), against: cfg.floorName, min: disabledTarget });
  const onDisabled = () => ({ r: pickMinPass(textCands, asGround("disabled.fill", neutralLow().rgb), disabledTarget), against: "disabled.fill", min: disabledTarget });
  putSurf("background.primary", cfg.bg.primary, "Page surface \u2014 the canvas / base");
  putSurf("background.secondary", cfg.bg.secondary, "Page surface, second tier \u2014 a band one step off the base (equal to the base in high-contrast modes)");
  putSurf("background.tertiary", cfg.bg.tertiary, "Page surface, third tier");
  putSurf("inverse.background.primary", cfg.bgInverse.primary, "Inverse page surface \u2014 the opposite-polarity band (dark on a light page, light on a dark page)");
  putSurf("inverse.background.secondary", cfg.bgInverse.secondary, "Inverse page surface, second tier");
  const invFloorRgb = asGround("inverse.background.secondary", cfg.bgInverse.secondary.rgb);
  putSurf("inverse.background.tertiary", cfg.bgInverse.tertiary, "Inverse page surface, third tier");
  const scrimStep = hc ? cfg.family === "light" ? 60 : 70 : cfg.family === "light" ? 40 : 60;
  put(
    "scrim.default",
    { path: `${ns}.black-alpha.${scrimStep}`, rgb: BLACK, ratio: 1 },
    `Scrim \u2014 black backdrop behind modals and drawers; opacity ${scrimStep}%`,
    "self",
    0
  );
  roles["scrim.default"].alpha = scrimStep / 100;
  const VEIL_STEPS = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90];
  for (const [polarity, wash] of [["dark", BLACK], ["light", WHITE]]) {
    const extreme = polarity === "dark" ? WHITE : BLACK;
    const base = polarity === "dark" ? "black" : "white";
    for (const [rung, floor] of VEIL_RUNGS) {
      const step = VEIL_STEPS.find((s) => contrast(extreme, composite(extreme, wash, s / 100)) >= floor);
      if (step === void 0)
        throw new Error(`veil.${polarity}.${rung}: no emitted alpha step clears ${floor}:1 over the worst-case pixel`);
      put(
        `veil.${polarity}.${rung}`,
        { path: `${ns}.${base}-alpha.${step}`, rgb: wash, ratio: 1 },
        `Media veil, ${polarity} \u2014 a ${rung} ${base} wash (${step}%) over an image, to lift ${base === "black" ? "light" : "dark"} text off it. Verify contrast against your own photo. Identical in every mode; the mode-varying modal backdrop is scrim.default`,
        "self",
        0
      );
      roles[`veil.${polarity}.${rung}`].alpha = step / 100;
    }
    put(
      `veil.${polarity}.clear`,
      { path: polarity === "dark" ? `${ns}.transparent` : `${ns}.white-alpha.0`, rgb: wash, ratio: 1 },
      `Media veil, ${polarity} \u2014 the clear end (0% ${base}) a directional ${polarity} veil fades to. ` + (polarity === "light" ? "Clear white, not clear black, so the fade stays white instead of passing through gray. " : "") + `Identical in every mode`,
      "self",
      0
    );
    roles[`veil.${polarity}.clear`].alpha = 0;
  }
  putSurf("foreground.primary", cfg.fg.primary, "Default surface placed on the page \u2014 a card");
  putSurf("foreground.secondary", cfg.fg.secondary, "A second surface \u2014 a panel / nested container");
  putSurf("foreground.tertiary", cfg.fg.tertiary, "A third surface step");
  putSurf("inverse.foreground.primary", cfg.fgInverse.primary, "Inverse / bold surface \u2014 the opposite-polarity fill (dark on a light page, light on a dark page)");
  putSurf("inverse.foreground.secondary", cfg.fgInverse.secondary, "Inverse surface, second tier");
  put("inverse.foreground.tertiary", rated(cfg.fgInverse.tertiary, baseRgb), "Inverse surface, third tier", "background.primary", cfg.nonTextMin);
  roles["inverse.foreground.tertiary"].alsoAgainst = { against: "inverse.text.primary", min: onMin };
  const fills = {};
  for (const r of ["brand", "success", "warning", "info"]) {
    const f = paletteRole(r, floorRgb, fillFloorMin);
    fills[r] = f;
    put(`foreground.${r}`, f, `Bold ${r} fill \u2014 clears ${fillFloorMin}:1 on background.secondary`, cfg.floorName, fillFloorMin);
  }
  for (const r of SEMANTICS)
    putSurf(`foreground.${r}-subtle`, subtleTint(r), `Subtle ${r} tint surface \u2014 banners, badges, selected rows`);
  for (const r of SEMANTICS)
    put(`inverse.foreground.${r}`, paletteRole(r, invFloorRgb, fillFloorMin), `Bold ${r} fill on an inverse surface \u2014 clears ${fillFloorMin}:1 on inverse.background.secondary`, "inverse.background.secondary", fillFloorMin);
  const invTintStep = cfg.family === "light" ? 900 : 100;
  const subtleTintInverse = (r) => pStep(palOf(r2p[r]), invTintStep);
  for (const r of SEMANTICS)
    putSurf(`inverse.foreground.${r}-subtle`, subtleTintInverse(r), `Subtle ${r} tint surface on an inverse surface \u2014 banners, badges and selected rows on the inverse band`);
  const dangerRest = paletteRole("danger", floorRgb, fillFloorMin);
  fills.danger = dangerRest;
  put("foreground.danger", dangerRest, `Bold danger fill \u2014 clears ${fillFloorMin}:1 on background.secondary`, cfg.floorName, fillFloorMin);
  const fillStateCand = (rest, palette, st, fillMin) => {
    const g = guardFrom(contrast(rest.rgb, floorRgb), floorRgb, fillMin);
    return st === "default" || st === "focused" || st === "selected" ? rest : walk(palette, rest.num, stateRungs(st), dir, g);
  };
  const modeAnchor = (col) => theme2.modeAnchors?.[mode]?.[col];
  const paAnchor = modeAnchor("primary") ?? theme2.actionAnchorStep;
  const fillTierRgb = asGround("background.tertiary", cfg.bg.tertiary.rgb);
  const tierGated = [];
  const restFill = (name, palette, anchor, exact) => {
    tierGated.push(name);
    return chromatic(palette, anchor, floorRgb, fillFloorMin, exact, [fillTierRgb]);
  };
  const actionRest = paAnchor !== void 0 ? restFill("primary", r2p.action, paAnchor, true) : restFill("primary", r2p.action, theme2.roleAnchorStep.action, false);
  const focusAnchor = paAnchor ?? theme2.roleAnchorStep.action;
  const focusRing2 = (ground) => chromatic(r2p.action, focusAnchor, ground, cfg.actionMin);
  const iFill = (name, rest, palette, fillMin) => {
    for (const st of FILL_STATES) {
      const c = fillStateCand(rest, palette, st, fillMin);
      const stKey = st === "default" ? "rest" : st;
      put(
        `interactive.${name}.fill.${stKey}`,
        rated(c, floorRgb),
        `${name} interactive fill \u2014 ${stKey}, clears ${fillMin}:1 on background.secondary`,
        cfg.floorName,
        fillMin
      );
    }
    put(`interactive.${name}.on-fill`, onColor(asGround(`interactive.${name}.fill.rest`, rest.rgb)), `Ink on the ${name} interactive fill`, `interactive.${name}.fill.rest`, onMin);
  };
  const neutralStepR = (num) => {
    const steps = ramps.get(r2p.neutral);
    const s = steps.reduce((a, b) => Math.abs(b.num - num) < Math.abs(a.num - num) ? b : a);
    return { path: `${ns}.${r2p.neutral}.${s.key}`, rgb: s.rgb, num: s.num, ratio: contrast(s.rgb, floorRgb) };
  };
  const iText = (name, restCand, palette, walkable, ground = baseRgb, against = "background.primary") => {
    const restNum = restCand.num;
    const byState = {};
    for (const st of ["default", "hover", "pressed"]) {
      const stKey = st === "default" ? "rest" : st;
      const c = st === "default" || !walkable ? restCand : walk(palette, restNum, stateRungs(st), dir, guardFrom(contrast(restCand.rgb, ground), ground, cfg.secondaryMin));
      put(
        `interactive.${name}.text.${stKey}`,
        rated(c, ground),
        `${name} interactive ink \u2014 ${stKey} (outline / text appearance)`,
        against,
        cfg.secondaryMin
      );
      put(
        `interactive.${name}.icon.${stKey}`,
        rated(c, ground),
        `${name} interactive icon ink \u2014 ${stKey} (the glyph in an outline / ghost / text control)`,
        against,
        cfg.secondaryMin
      );
      byState[stKey] = c;
    }
    return byState;
  };
  const iBorder = (name, inkByState, ground, keyPrefix, against, where = "") => {
    for (const stKey of ["rest", "hover", "pressed"])
      put(
        `${keyPrefix}interactive.${name}.border.${stKey}`,
        rated(inkByState[stKey], ground),
        `${name} interactive border${where} \u2014 ${stKey} (the outline edge; follows the ink)`,
        against,
        cfg.nonTextMin
      );
  };
  iFill("primary", actionRest, r2p.action, fillFloorMin);
  iBorder("primary", iText("primary", paletteRole("action", baseRgb, cfg.secondaryMin), r2p.action, true), baseRgb, "", "background.primary");
  const daAnchor = modeAnchor("destructive") ?? theme2.destructiveAnchorStep;
  const iDestructiveRest = daAnchor !== void 0 ? restFill("destructive", r2p.danger, daAnchor, true) : restFill("destructive", r2p.danger, theme2.roleAnchorStep.danger, false);
  iFill("destructive", iDestructiveRest, r2p.danger, fillFloorMin);
  const dTextGround = asGround("background.tertiary", cfg.bg.tertiary.rgb);
  iBorder("destructive", iText("destructive", paletteRole("danger", dTextGround, cfg.secondaryMin), r2p.danger, true, dTextGround, "background.tertiary"), dTextGround, "", "background.tertiary");
  const neutralStrong = theme2.neutralEmphasis === "strong";
  const neutralAnchor = neutralStrong ? cfg.family === "light" ? 800 : 150 : cfg.family === "light" ? 150 : 850;
  iFill("neutral", neutralStepR(neutralAnchor), r2p.neutral, neutralStrong ? cfg.nonTextMin : 0);
  const nText = iText("neutral", pickMostExtreme(textCands, baseRgb), r2p.neutral, false);
  iBorder("neutral", nText, baseRgb, "", "background.primary");
  for (const entry of theme2.interactivePalettes) {
    const anchor = modeAnchor(entry.name) ?? entry.anchorStep ?? 500;
    const pinned = modeAnchor(entry.name) !== void 0 || !!entry.anchorPinned;
    const rest = restFill(entry.name, entry.palette, anchor, pinned);
    iFill(entry.name, rest, entry.palette, fillFloorMin);
    iBorder(entry.name, iText(entry.name, chromatic(entry.palette, anchor, baseRgb, cfg.secondaryMin), entry.palette, true), baseRgb, "", "background.primary");
  }
  const invColumn = (name, palette, anchor, textGround = invRgb, textAgainst = "inverse.background.primary") => {
    const textRest = palette ? rated(chromatic(palette, anchor, textGround, cfg.secondaryMin), textGround) : pickMostExtreme(textCands, textGround);
    const textNum = textRest.num;
    const invInk = {};
    for (const st of ["default", "hover", "pressed"]) {
      const stKey = st === "default" ? "rest" : st;
      const c = st === "default" || !palette ? textRest : walk(palette, textNum, stateRungs(st), -dir, guardFrom(contrast(textRest.rgb, textGround), textGround, cfg.secondaryMin));
      put(
        `inverse.interactive.${name}.text.${stKey}`,
        rated(c, textGround),
        `${name} interactive ink on an inverse surface \u2014 ${stKey} (outline / text on the inverse band)`,
        textAgainst,
        cfg.secondaryMin
      );
      put(
        `inverse.interactive.${name}.icon.${stKey}`,
        rated(c, textGround),
        `${name} interactive icon ink on an inverse surface \u2014 ${stKey} (the glyph in an outline / ghost / text control on the inverse band)`,
        textAgainst,
        cfg.secondaryMin
      );
      invInk[stKey] = c;
    }
    const fillRestAbs = cfg.family === "light" ? cand(`${ns}.white`, WHITE) : cand(`${ns}.black`, BLACK);
    const inkGround = asGround(`inverse.interactive.${name}.fill.rest`, fillRestAbs.rgb);
    const inkPalette = name === "primary" ? r2p.action ?? r2p.brand : name === "destructive" ? r2p.danger : null;
    const useBrandInk = inkPalette !== null && !theme2.strictInteractiveContrast;
    const extremeAnchor = cfg.family === "light" ? 0 : 1e3;
    const stateFill = (st) => st === "default" ? fillRestAbs : walk(r2p.neutral, extremeAnchor, stateRungs(st), dir);
    const ink = useBrandInk ? brandOnFill(palOf(inkPalette), inkGround, FILL_STATES.map((st) => st === "default" ? inkGround : asGround(`inverse.interactive.${name}.fill.${st}`, stateFill(st).rgb))) : onColor(inkGround);
    const labelNote = (fill, st) => {
      const r = contrast(ink.rgb, fill);
      if (r >= onMin) return "";
      const about = `about ${+r.toFixed(1)}:1`;
      if (st === "hover" || st === "pressed")
        return ` The label on it drops to ${about} in this brief state (exempt by default; ${inkPalette !== null ? `the strict interactive contrast setting keeps it at ${onMin}:1 or more` : `the strict interactive contrast setting does not change the ${name} label`}).`;
      return ` The label on it measures ${about}, below its ${onMin}:1 floor.`;
    };
    for (const st of FILL_STATES) {
      const stKey = st === "default" ? "rest" : st;
      const c = stateFill(st);
      put(
        `inverse.interactive.${name}.fill.${stKey}`,
        rated(c, invRgb),
        stKey === "rest" ? `${name} interactive fill on an inverse surface \u2014 rest \u2014 the white / black default` : `${name} interactive fill on an inverse surface \u2014 ${stKey} \u2014 ${stateRungs(st)} neutral rungs off the white / black rest fill.${labelNote(c.rgb, stKey)}`,
        "inverse.background.primary",
        cfg.nonTextMin
      );
    }
    put(
      `inverse.interactive.${name}.on-fill`,
      ink,
      // ONE description serves all four modes. A leaf carries a single `$description`; the per-mode entries
      // under `$extensions.prism3.modes.*` carry a value and its rating, and no prose. So the wording has to
      // hold in every mode, and "the most vivid brand step" alone does not: `hc-light` / `hc-dark` take the
      // max-contrast extreme instead (the `hc` branch in `brandOnFill`). Naming both arms is the only phrasing
      // that stays true across the set.
      useBrandInk ? `Ink on the ${name} inverse fill \u2014 the ${name === "destructive" ? "danger" : "most vivid brand"} step clearing ${onMin}:1 on every state of the white / black fill, rest through selected, or the max-contrast extreme in the high-contrast modes` : `Ink on the ${name} inverse fill \u2014 a neutral high-contrast label on the white / black rest fill`,
      `inverse.interactive.${name}.fill.rest`,
      onMin
    );
    iBorder(name, invInk, textGround, "inverse.", textAgainst, " on an inverse surface");
  };
  invColumn("primary", r2p.action, modeAnchor("primary") ?? theme2.actionAnchorStep ?? theme2.roleAnchorStep.action);
  invColumn("destructive", r2p.danger, modeAnchor("destructive") ?? theme2.destructiveAnchorStep ?? theme2.roleAnchorStep.danger, asGround("inverse.background.tertiary", cfg.bgInverse.tertiary.rgb), "inverse.background.tertiary");
  invColumn("neutral", null, 0);
  for (const entry of theme2.interactivePalettes) invColumn(entry.name, entry.palette, modeAnchor(entry.name) ?? entry.anchorStep ?? 500);
  if (theme2.outlineInteraction === "overlay-neutral") {
    const overlayPal = cfg.family === "light" ? "black-alpha" : "white-alpha";
    const overlayBase = cfg.family === "light" ? BLACK : WHITE;
    const OVERLAY_ALPHA = [["hover", 10], ["pressed", 20], ["selected", 20]];
    const contentRgb = asGround("text.primary", pickMostExtreme(textCands, baseRgb).rgb);
    const overlayColors = ["primary", "neutral", "destructive", ...theme2.interactivePalettes.map((p) => p.name)];
    for (const color of overlayColors) {
      for (const [st, step] of OVERLAY_ALPHA) {
        const ratio = contrast(contentRgb, composite(baseRgb, overlayBase, step / 100));
        putWash(
          `interactive.${color}.overlay.${st}`,
          { path: `${ns}.${overlayPal}.${step}`, rgb: overlayBase, ratio },
          `${color} interactive overlay \u2014 ${st} (${step}% neutral wash for the PAGE ground; the dark-band twin is inverse.interactive.${color}.overlay.${st})`,
          "background.primary",
          "text.primary",
          cfg.secondaryMin,
          step / 100
        );
      }
    }
    const invOverlayPal = cfg.family === "light" ? "white-alpha" : "black-alpha";
    const invOverlayBase = cfg.family === "light" ? WHITE : BLACK;
    const invContentRgb = asGround("inverse.text.primary", pickMostExtreme(textCands, invRgb).rgb);
    for (const color of overlayColors) {
      for (const [st, step] of OVERLAY_ALPHA) {
        const ratio = contrast(invContentRgb, composite(invRgb, invOverlayBase, step / 100));
        putWash(
          `inverse.interactive.${color}.overlay.${st}`,
          { path: `${ns}.${invOverlayPal}.${step}`, rgb: invOverlayBase, ratio },
          `${color} interactive overlay on an inverse surface \u2014 ${st} (${step}% wash, the opposite polarity to the page wash)`,
          "inverse.background.primary",
          "inverse.text.primary",
          cfg.secondaryMin,
          step / 100
        );
      }
    }
  }
  putSurf("disabled.fill", neutralLow(), "Disabled control fill \u2014 one muted neutral, any intent");
  const dBranch = theme2.disabledStrategy === "full" ? "full contrast, AA text" : "reduced contrast, legible";
  {
    const d = onDisabled();
    put("disabled.on-fill", d.r, `Label / icon on a disabled fill \u2014 muted but clears ${d.min}:1`, "disabled.fill", d.min);
  }
  {
    const d = disabledText();
    put("disabled.text", d.r, `Disabled text \u2014 ${dBranch}; clears ${disabledTarget}:1`, d.against, d.min);
  }
  {
    const d = disabledText();
    put("disabled.icon", d.r, `Disabled icon \u2014 ${dBranch}; clears ${disabledTarget}:1`, d.against, d.min);
  }
  put("disabled.border", rated(neutralLow(), baseRgb), "Disabled control border \u2014 muted neutral", "background.primary", 0);
  const neutralLowInverse = () => pStep(r2p.neutral, cfg.family === "light" ? 800 : 250);
  putSurf("inverse.disabled.fill", neutralLowInverse(), "Disabled control fill on an inverse surface \u2014 one muted neutral, any intent");
  put(
    "inverse.disabled.on-fill",
    pickMinPass(textCands, asGround("inverse.disabled.fill", neutralLowInverse().rgb), disabledTarget),
    `Label / icon on a disabled fill on an inverse surface \u2014 muted but clears ${disabledTarget}:1`,
    "inverse.disabled.fill",
    disabledTarget
  );
  {
    const r = pickMinPass(textCands, invFloorRgb, disabledTarget);
    put("inverse.disabled.text", r, `Disabled text on an inverse surface \u2014 ${dBranch}; clears ${disabledTarget}:1`, "inverse.background.secondary", disabledTarget);
    put("inverse.disabled.icon", r, `Disabled icon on an inverse surface \u2014 ${dBranch}; clears ${disabledTarget}:1`, "inverse.background.secondary", disabledTarget);
  }
  put("inverse.disabled.border", rated(neutralLowInverse(), invRgb), "Disabled control border on an inverse surface \u2014 muted neutral", "inverse.background.primary", 0);
  putSurf("field.fill", cand(`${ns}.transparent`, BLACK), "Form field fill \u2014 transparent by default (no paint): the border is the field boundary, so the fill sits correctly on any ground. Kept themable \u2014 point it at a surface step for a filled field. Hover adds a translucent wash; the fill itself does not change");
  const fieldGroundRgb = asGround("background.secondary", cfg.bg.secondary.rgb);
  const fieldRest = pickMinPass(ramp, fieldGroundRgb, cfg.nonTextMin);
  put("field.border.rest", fieldRest, `Form field resting border \u2014 the boundary of a transparent-fill field, so a perceivable boundary (SC 1.4.11) at ${cfg.nonTextMin}:1 against the darkest permissible ground (\`background.secondary\`), not the page alone`, "background.secondary", cfg.nonTextMin);
  const fieldRestNum = neutral.find((s) => `${ns}.${r2p.neutral}.${s.key}` === fieldRest.path).num;
  put("field.border.hover", rated(walk(r2p.neutral, fieldRestNum, 2, dir, guardFrom(contrast(fieldRest.rgb, fieldGroundRgb), fieldGroundRgb, cfg.nonTextMin)), fieldGroundRgb), `Form field hover border \u2014 two ramp steps stronger than rest, gated at ${cfg.nonTextMin}:1 on the darkest permissible ground (pair it with a second cue; color alone does not carry the state)`, "background.secondary", cfg.nonTextMin);
  put("field.placeholder", pickMinPass(textCands, asGround("background.secondary", cfg.bg.secondary.rgb), cfg.secondaryMin), `Form field placeholder ink \u2014 a readable hint, ${cfg.secondaryMin}:1 on the darkest permissible ground behind the transparent fill (not a sub-AA placeholder)`, "background.secondary", cfg.secondaryMin);
  putSurf("inverse.field.fill", cand(`${ns}.transparent`, BLACK), "Form field fill on an inverse surface \u2014 transparent by default (no paint), the same paint-less field the page takes; the border frames it on the inverse band");
  const fieldInvGroundRgb = asGround("inverse.background.secondary", cfg.bgInverse.secondary.rgb);
  const fieldInvRest = pickMinPass(ramp, fieldInvGroundRgb, cfg.nonTextMin);
  put("inverse.field.border.rest", fieldInvRest, `Form field resting border on an inverse surface \u2014 the boundary of a transparent-fill field, a perceivable boundary (SC 1.4.11) at ${cfg.nonTextMin}:1 against the darkest permissible inverse ground`, "inverse.background.secondary", cfg.nonTextMin);
  const fieldInvRestNum = neutral.find((s) => `${ns}.${r2p.neutral}.${s.key}` === fieldInvRest.path).num;
  put("inverse.field.border.hover", rated(walk(r2p.neutral, fieldInvRestNum, 2, -dir, guardFrom(contrast(fieldInvRest.rgb, fieldInvGroundRgb), fieldInvGroundRgb, cfg.nonTextMin)), fieldInvGroundRgb), `Form field hover border on an inverse surface \u2014 two ramp steps stronger than rest, gated at ${cfg.nonTextMin}:1 on the darkest permissible inverse ground (pair it with a second cue; color alone does not carry the state)`, "inverse.background.secondary", cfg.nonTextMin);
  put("inverse.field.placeholder", pickMinPass(textCands, asGround("inverse.background.secondary", cfg.bgInverse.secondary.rgb), cfg.secondaryMin), `Form field placeholder ink on an inverse surface \u2014 a readable hint, ${cfg.secondaryMin}:1 on the darkest permissible inverse ground behind the transparent fill`, "inverse.background.secondary", cfg.secondaryMin);
  const buildContent = (p, g) => {
    const out = [];
    const T = (key, r, desc, against, min) => out.push({ key, r, desc, against, min });
    const on = g.page ? "" : " on an inverse surface";
    const largeOnly = (pr, min) => pr.label === "text" && min < BODY_TEXT_FLOOR ? `; ${LARGE_TEXT_ONLY}, below the ${BODY_TEXT_FLOOR}:1 body floor` : "";
    T("primary", pickMostExtreme(textCands, g.base), `Primary ${p.label}${on} \u2014 strongest neutral`, g.baseName, cfg.primaryMin);
    T("secondary", pickMinPass(textCands, g.floor, p.secondaryMin), `Secondary ${p.label}${on} \u2014 ${p.secondaryMin}:1 on ${g.floorLabel}`, g.floorName, p.secondaryMin);
    T("tertiary", pickMinPass(textCands, g.floor, p.tertiaryMin), `Tertiary ${p.label}${on} \u2014 ${p.tertiaryMin}:1 on ${g.floorLabel}${largeOnly(p, p.tertiaryMin)}`, g.floorName, p.tertiaryMin);
    for (const r of SEMANTICS)
      T(r, semanticInkOn(r, p.semanticMin, g), `${r} ${p.label} \u2014 ${p.semanticMin}:1 on ${g.floorLabel} and on its own tint`, g.floorName, p.semanticMin);
    for (const r of SEMANTICS)
      T(`${r}-subtle`, rated(chromatic(r2p[r], g.mutedStep, g.base, p.tertiaryMin), g.base), p.label === "text" ? `Muted ${r} text \u2014 ${p.tertiaryMin}:1 on ${g.baseName}${largeOnly(p, p.tertiaryMin)}` : `Muted ${r} ${p.label} \u2014 low-emphasis accent, ${p.tertiaryMin}:1 on ${g.baseName}`, g.baseName, p.tertiaryMin);
    if (g.page) {
      for (const r of SEMANTICS)
        T(`on-${r}`, onColor(asGround(`foreground.${r}`, fills[r].rgb)), `${p.label[0].toUpperCase()}${p.label.slice(1)} on a solid ${r} fill \u2014 ${onMin}:1`, `foreground.${r}`, onMin);
    }
    const linkPal = theme2.linkPalette;
    const linkFollowsAction = linkPal === r2p.action;
    const linkAnchor = linkFollowsAction ? paAnchor ?? theme2.roleAnchorStep.action : theme2.linkAnchorStep;
    const linkBase = chromatic(linkPal, linkAnchor, g.floor, p.semanticMin);
    const linkGuard = guardFrom(contrast(linkBase.rgb, g.floor), g.floor, p.semanticMin);
    const linkNum = linkBase.num;
    const perc = {
      hover: walk(linkPal, linkNum, 1, g.dir, linkGuard, LINK_STATE_DE),
      pressed: walk(linkPal, linkNum, 2, g.dir, linkGuard, LINK_STATE_DE),
      visited: walk(linkPal, linkNum, 3, g.dir, linkGuard, LINK_STATE_DE)
    };
    const plainLink = {
      hover: walk(linkPal, linkNum, 1, g.dir, linkGuard),
      pressed: walk(linkPal, linkNum, 2, g.dir, linkGuard),
      visited: walk(linkPal, linkNum, 3, g.dir, linkGuard)
    };
    const allDistinct = (o) => (/* @__PURE__ */ new Set([linkBase.path, o.hover.path, o.pressed.path, o.visited.path])).size === 4;
    const linkLadder = allDistinct(perc) ? perc : plainLink;
    const linkRungs = theme2.linkStateRungs;
    const engaged = (st) => linkRungs?.[st] !== void 0 ? walk(linkPal, linkNum, linkRungs[st], g.dir, linkGuard) : linkLadder[st];
    const linkStateCand = (st) => st === "default" || st === "focused" ? linkBase : engaged(st);
    for (const st of LINK_STATES)
      T(`link.${st}`, rated(linkStateCand(st), g.floor), `Link ${p.label}${on} \u2014 ${st}, ${p.semanticMin}:1 on ${g.floorLabel}`, g.floorName, p.semanticMin);
    return out;
  };
  const textProfile = { label: "text", secondaryMin: cfg.secondaryMin, tertiaryMin: cfg.tertiaryMin, semanticMin: cfg.actionMin };
  const iconProfile = theme2.iconContrast === "3:1" ? { label: "icon", secondaryMin: cfg.nonTextMin, tertiaryMin: cfg.nonTextMin, semanticMin: cfg.nonTextMin } : { ...textProfile, label: "icon" };
  const pageGround = { base: baseRgb, baseName: "background.primary", floor: floorRgb, floorName: cfg.floorName, floorLabel: "background.secondary", dir, tint: subtleTint, mutedStep, page: true };
  const inverseGround = { base: invRgb, baseName: "inverse.background.primary", floor: invFloorRgb, floorName: "inverse.background.secondary", floorLabel: "inverse.background.secondary", dir: -dir, tint: subtleTintInverse, mutedStep: 1e3 - mutedStep, page: false };
  for (const s of buildContent(textProfile, pageGround)) put(`text.${s.key}`, s.r, s.desc, s.against, s.min);
  for (const s of buildContent(iconProfile, pageGround)) put(`icon.${s.key}`, s.r, s.desc, s.against, s.min);
  for (const s of buildContent(textProfile, inverseGround)) put(`inverse.text.${s.key}`, s.r, s.desc, s.against, s.min);
  for (const s of buildContent(iconProfile, inverseGround)) put(`inverse.icon.${s.key}`, s.r, s.desc, s.against, s.min);
  put("border.primary", pickClosest(ramp, baseRgb, cfg.borderTarget), `Default border \u2014 decorative, ~${cfg.borderTarget}:1`, "background.primary", 0);
  put("border.secondary", pickClosest(ramp, baseRgb, cfg.borderTarget * 2.2, cfg.nonTextMin), "Stronger border / divider", "background.primary", cfg.nonTextMin);
  put("border.tertiary", pickClosest(ramp, baseRgb, cfg.borderTarget * 2.2 * 2.2), "Strongest border / divider \u2014 the third rung of the neutral edge ladder", "background.primary", 0);
  const FIELD_STATUS_BORDERS = ["danger", "warning", "success"];
  const fieldPageRgb = asGround("background.primary", baseRgb);
  const fieldInsetRgb = asGround("background.secondary", cfg.bg.secondary.rgb);
  const fieldWash = roles["interactive.neutral.overlay.hover"];
  const fieldWashRgb = fieldWash ? asGround("interactive.neutral.overlay.hover", rgbByRole.get("interactive.neutral.overlay.hover")) : void 0;
  const fieldWashA = fieldWash?.alpha !== void 0 ? emittedAlpha(fieldWash.alpha, theme2.colorFormat) : void 0;
  const fieldStatusGrounds = [
    fieldInsetRgb,
    ...fieldWashRgb && fieldWashA !== void 0 ? [composite(fieldPageRgb, fieldWashRgb, fieldWashA), composite(fieldInsetRgb, fieldWashRgb, fieldWashA)] : []
  ];
  const focusBorder = hc ? rated(actionRest, baseRgb) : focusRing2(baseRgb);
  const focusAvoid = [asGround("border.focus", focusBorder.rgb)];
  for (const r of SEMANTICS) {
    const field = FIELD_STATUS_BORDERS.includes(r);
    put(`border.${r}`, rated(chromatic(r2p[r], 500, baseRgb, cfg.nonTextMin, false, field ? fieldStatusGrounds : [], field ? focusAvoid : []), baseRgb), `${r} border \u2014 SC 1.4.11 non-text contrast, ${cfg.nonTextMin}:1`, "background.primary", cfg.nonTextMin);
  }
  put("border.focus", focusBorder, `Focus ring color (keyboard focus) \u2014 SC 1.4.11 non-text contrast, ${cfg.nonTextMin}:1 on background.primary`, "background.primary", cfg.nonTextMin);
  put("inverse.border.primary", pickClosest(ramp, invRgb, cfg.borderTarget), `Default border on an inverse surface \u2014 decorative, ~${cfg.borderTarget}:1`, "inverse.background.primary", 0);
  put("inverse.border.secondary", pickClosest(ramp, invRgb, cfg.borderTarget * 2.2), "Stronger border / divider on an inverse surface", "inverse.background.primary", 0);
  put("inverse.border.tertiary", pickClosest(ramp, invRgb, cfg.borderTarget * 2.2 * 2.2), "Strongest border / divider on an inverse surface \u2014 the third rung of the inverse edge ladder", "inverse.background.primary", 0);
  for (const r of SEMANTICS)
    put(`inverse.border.${r}`, rated(chromatic(r2p[r], 500, invRgb, cfg.nonTextMin), invRgb), `${r} border on an inverse surface \u2014 SC 1.4.11 non-text contrast, ${cfg.nonTextMin}:1`, "inverse.background.primary", cfg.nonTextMin);
  put(
    "inverse.border.focus",
    focusRing2(invRgb),
    `Focus ring color on inverse surfaces (keyboard focus) \u2014 SC 1.4.11 non-text contrast, ${cfg.nonTextMin}:1 on inverse.background.primary`,
    "inverse.background.primary",
    cfg.nonTextMin
  );
  const groundRoles = engineGrounds(roles);
  const groundDependents = (g) => groundDependentsOf(roles, g).length;
  const warnings = [];
  const overridden = /* @__PURE__ */ new Set();
  const ov = withFillStateTwins(withIconTwins(theme2.overrides?.[mode]));
  if (ov) {
    for (const [rolePath, ref] of Object.entries(ov)) {
      const existing = roles[rolePath];
      if (!existing) continue;
      if (groundRoles.has(rolePath) && GROUND_INPUT[rolePath]) {
        throw new Error(
          `overrides[${mode}]: '${rolePath}' is a GROUND \u2014 ${groundDependents(rolePath)} role(s) are contrast-measured against it, and this layer runs after they are derived, so overriding it here would leave every one of them reporting contrast against a surface the tree no longer has (#956). Set \`surfaces.${mode}.${GROUND_INPUT[rolePath]}\` instead \u2014 it is read during derivation, so the ladder and everything gated on it re-derive and stay honest.`
        );
      }
      const steps = ramps.get(ref.palette);
      if (!steps) throw new Error(`overrides[${mode}]: unknown palette '${ref.palette}' (role '${rolePath}')`);
      const step = steps.find((s) => s.key === ref.step);
      if (!step) throw new Error(`overrides[${mode}]: unknown step '${ref.step}' in palette '${ref.palette}' (role '${rolePath}')`);
      const newRgb = step.rgb;
      const againstRgb = existing.against === "self" ? newRgb : rgbByRole.get(existing.against) ?? baseRgb;
      let outRgb = newRgb, outStep = ref.step;
      if (isLinkRole(rolePath) && existing.min > 0 && contrast(newRgb, againstRgb) < existing.min) {
        const dir2 = contrast(steps[steps.length - 1].rgb, againstRgb) >= contrast(steps[0].rgb, againstRgb) ? 1 : -1;
        let i = steps.findIndex((s) => s.key === ref.step);
        while (i >= 0 && i + dir2 >= 0 && i + dir2 < steps.length && contrast(steps[i].rgb, againstRgb) < existing.min) i += dir2;
        if (i >= 0) {
          outRgb = steps[i].rgb;
          outStep = steps[i].key;
        }
      }
      const ratio = contrast(outRgb, againstRgb);
      roles[rolePath] = { ...existing, path: `${ns}.${ref.palette}.${outStep}`, ratio, hex: hex(outRgb) };
      rgbByRole.set(rolePath, outRgb);
      overridden.add(rolePath);
    }
  }
  for (const [rolePath, r] of Object.entries(roles))
    if (r.min > 0 && r.ratio < r.min) warnings.push({ role: rolePath, ratio: r.ratio, min: r.min });
  for (const [rolePath, r] of Object.entries(roles)) {
    if (!r.alsoAgainst) continue;
    const me = rgbByRole.get(rolePath), partner = rgbByRole.get(r.alsoAgainst.against);
    if (!me || !partner) throw new Error(`${mode}: '${rolePath}' names alsoAgainst '${r.alsoAgainst.against}', which is not a role in this mode`);
    const ratio = contrast(me, partner);
    if (ratio < r.alsoAgainst.min) warnings.push({ role: rolePath, ratio, min: r.alsoAgainst.min, against: r.alsoAgainst.against });
  }
  const tierChecks = [];
  for (const name of tierGated) {
    const role = `interactive.${name}.fill.rest`;
    const r = roles[role], rgb = rgbByRole.get(role);
    if (!r || !rgb || !(r.min > 0)) continue;
    const ratio = contrast(rgb, fillTierRgb);
    tierChecks.push({ role, against: "background.tertiary", ratio, min: r.min });
    if (ratio < r.min) warnings.push({ role, ratio, min: r.min, against: "background.tertiary" });
  }
  return { mode, surface: baseRgb, roles, ...tierChecks.length ? { tierChecks } : {}, ...warnings.length ? { warnings } : {} };
};
var interactiveStateRungs = (st) => {
  const STATE_RUNGS = 2;
  return st === "default" || st === "rest" ? 0 : st === "hover" || st === "focused" ? STATE_RUNGS : STATE_RUNGS * 2;
};
var resolveAllModes = (theme2) => {
  const ramps = new Map(theme2.palettes.map((p) => [p.palette, p.steps]));
  const neutral = ramps.get(theme2.roleToPalette.neutral);
  const custom = (theme2.customModes ?? []).flatMap((cm) => {
    const baseDesc = BUILTIN_MODES.find((d) => d.name === cm.base);
    return baseDesc ? [{ ...baseDesc, name: cm.name }] : [];
  });
  const descriptors = [...BUILTIN_MODES, ...custom];
  const cfgs = modeConfigs(theme2.namespace, theme2.roleToPalette.neutral, neutral, theme2.surfaces, descriptors, theme2.palettes);
  const results = Object.keys(cfgs).filter((m) => theme2.modes.includes(m)).map((m) => resolveMode(m, cfgs[m], theme2, ramps));
  if (theme2.outlineInteraction === "solid-tint") settleSolidTint(theme2, results);
  else if (theme2.outlineInteraction === "overlay-neutral") settleSolidTint(theme2, results, { color: "primary", state: "selected" });
  return results;
};
var OPACITY_STEPS = [0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
var TINT_NOMINAL = { hover: 20, pressed: 30, selected: 30 };
var TINT_VISIBLE_DE = 2.3;
var settleSolidTint = (theme2, results, only) => {
  const steps = OPACITY_STEPS.filter((s) => s > 0);
  const hexRgb = (r) => hexToRgb(r.hex);
  const columns = only ? [only.color] : ["primary", "neutral", "destructive", ...theme2.interactivePalettes.map((p) => p.name)];
  const grounds = [["", "background.primary", "page"], ["inverse.", "inverse.background.primary", "band"]];
  for (const [prefix, groundKey, groundName] of only ? grounds.slice(0, 1) : grounds) {
    for (const color of columns) {
      const fillKey2 = `${prefix}interactive.${color}.fill.rest`;
      if (!results.every((m) => m.roles[fillKey2] && m.roles[groundKey])) continue;
      const inkKeyOf = (st) => `${prefix}interactive.${color}.text.${st === "selected" ? "pressed" : st}`;
      const cells = (st) => results.map((m) => {
        const ink = m.roles[inkKeyOf(st)];
        return { m, fill: hexRgb(m.roles[fillKey2]), ground: hexRgb(m.roles[groundKey]), ink: ink ? hexRgb(ink) : void 0, min: ink?.min ?? 0 };
      });
      const legible = (st, s) => cells(st).every((c) => !c.ink || contrast(c.ink, composite(c.ground, c.fill, s / 100)) >= c.min);
      const visible = (st, s) => cells(st).every((c) => deltaE2000(composite(c.ground, c.fill, s / 100), c.ground) >= TINT_VISIBLE_DE);
      let h = steps.indexOf(TINT_NOMINAL.hover);
      if (!legible("hover", steps[h])) {
        while (h > 0 && !legible("hover", steps[h])) h--;
      } else while (!visible("hover", steps[h]) && h + 1 < steps.length && legible("hover", steps[h + 1])) h++;
      let p = Math.max(steps.indexOf(TINT_NOMINAL.pressed), h + 1);
      while (!visible("pressed", steps[p]) && p + 1 < steps.length) p++;
      for (const [st, i] of [["hover", h], ["pressed", p], ["selected", p]]) {
        if (only && st !== only.state) continue;
        const step = steps[i];
        const nominal = TINT_NOMINAL[st];
        const why = step < nominal ? `, stepped down from opacity.${nominal} to keep the ${st} label legible` : step > nominal ? `, stepped up from opacity.${nominal} so the ${st} is visible on the ${groundName}` : "";
        const gated = st === "hover";
        for (const c of cells(st)) {
          const fill = c.m.roles[fillKey2];
          const inkKey = inkKeyOf(st);
          c.m.roles[`${prefix}interactive.${color}.subtle-fill.${st}`] = {
            path: fill.path,
            // The SELECTED fill has two users since 2026-09-29 (an outline/text control, and a control the user
            // selects in place, Tag's select type), so its sentence names both rather than one.
            description: `${color} interactive subtle fill${prefix ? " on a dark / inverse surface" : ""} \u2014 ${st} (the ${color} fill at opacity.${step}${why}; translucent, ${st === "selected" ? "the selected background of a selectable control or an outline/text control" : `the outline/text control's ${st} background`})`,
            ratio: c.ink ? contrast(c.ink, composite(c.ground, c.fill, step / 100)) : 0,
            // A WASH (#963): `against` is the ground it composites over, `legibleFor` the ink that must survive
            // on the result — which is what `min` bounds. `hex` is the OPAQUE fill; `alpha` is the step.
            against: groundKey,
            legibleFor: inkKey,
            model: "ink-on-composite",
            min: gated ? c.min : 0,
            hex: fill.hex,
            alpha: step / 100,
            tint: { fill: fillKey2, opacity: step }
          };
        }
      }
    }
  }
  for (const m of results) {
    const failing = Object.entries(m.roles).filter(([k, r]) => r.tint && r.min > 0 && r.ratio < r.min).map(([role, r]) => ({ role, ratio: r.ratio, min: r.min }));
    if (failing.length) m.warnings = [...m.warnings ?? [], ...failing];
  }
};

// ../../packages/engine/preview.ts
var TEXT = 4.5;
var UI = 3;
var surface = { bg: "color.foreground.primary", text: "color.text.primary", border: "color.border.secondary" };
var previewSpec = {
  components: [
    {
      id: "button",
      label: "Button (primary, filled)",
      description: "The primary action \u2014 interactive.primary filled, across its states; disabled is the cross-cutting disabled.* family.",
      variants: ["rest", "hover", "pressed", "disabled"].map((s) => ({
        name: s,
        bindings: {
          bg: s === "disabled" ? "color.disabled.fill" : `color.interactive.primary.fill.${s}`,
          text: s === "disabled" ? "color.disabled.on-fill" : "color.interactive.primary.on-fill",
          radius: "radius.md",
          padX: "space.300",
          padY: "space.150",
          type: "type.label.md.emphasis"
        },
        // The label is gated at the TEXT bar on `rest` only. On hover it is held to UI, and on
        // PRESSED it is UNGATED — both are OWNER DECISIONS, not derivations from WCAG: SC 1.4.3 has
        // no exemption for transient states, so strictly the label owes 4.5 in every reachable one.
        // The original call was to treat hover/pressed label contrast as out of scope rather than add
        // a stateful `on-fill` token family (which would flip the label's color mid-interaction —
        // worse than a subtler hover). Load-bearing as of #352 item 2: with fills relaxed toward their
        // anchors, harbor/dark measured 4.28 on hover and 3.62 on pressed, and NO single ink clears
        // 4.5 across all five fill states for that column.
        //
        // #1281 WIDENED THE SECOND HALF, and the reason is the two-rung state interval. Pressed now
        // sits FOUR rungs from rest rather than two, and in dark mode the fill walks toward the light
        // end — so the one rest-derived ink loses its now-lighter pressed fill in three corpus cells:
        // harbor/primary 2.62, wendys/primary 2.54, wendys/destructive 2.41, all against the 3 bar.
        // Put to the owner with those numbers and DECIDED: pressed is exempt, because what a pressed
        // state has to communicate is DISTINCTION FROM REST, and the alternative was either a smaller
        // interval (the thing #1281 exists to fix) or a stateful on-fill family (the thing the
        // paragraph above rejected for flipping the label mid-press).
        //
        // CATEGORICAL, not per-cell: pressed and selected are never floored for ink-on-fill contrast,
        // anywhere, on any brand or component. The rule is a predicate on the STATE, so a fifth
        // brand's pressed cell needs no entry anywhere — which is the difference between a rule and a
        // growing list of exceptions. `test.ts` carries the scope guard that keeps it honest: every
        // `min: 0` contract must BE a pressed/selected state, so zeroing a rest floor fails by name.
        //
        // Declared as `min: 0` rather than left to fail, which is the whole difference between an
        // exemption and a broken gate: `pass: raw >= min` is then TRUE by construction, the preview
        // still records and displays the real ratio, and a reader sees a contract that says "not
        // gated here" instead of a red cell nobody can distinguish from a regression. Hover keeps UI.
        //
        // WHAT PRESSED STILL OWES is distinction from rest, and that is now its SOLE gated
        // invariant — swept per cell across the corpus in `test.ts`, unconditionally.
        contracts: [{ fg: s === "disabled" ? "color.disabled.on-fill" : "color.interactive.primary.on-fill", bg: s === "disabled" ? "color.disabled.fill" : `color.interactive.primary.fill.${s}`, min: s === "pressed" ? 0 : s === "disabled" || s === "hover" ? UI : TEXT, label: "label on fill" }]
      }))
    },
    {
      id: "button-secondary",
      label: "Button (primary, outline)",
      description: "The demoted action \u2014 interactive.primary outline: border + text ink, no fill (no brand.* leak). Rest \u2192 hover/pressed add the interactive overlay wash (outlineInteraction: overlay-neutral).",
      variants: [
        {
          name: "rest",
          bindings: { bg: "color.background.primary", border: "color.interactive.primary.border.rest", text: "color.interactive.primary.text.rest", radius: "radius.md", padX: "space.300", padY: "space.150", type: "type.label.md.emphasis" },
          contracts: [{ fg: "color.interactive.primary.text.rest", bg: "color.background.primary", min: TEXT, label: "label on page" }, { fg: "color.interactive.primary.border.rest", bg: "color.background.primary", min: UI, label: "border on page" }]
        },
        // hover/pressed add the translucent overlay wash over the page. The wash's contrast is
        // gated at the CORE on the composited result (docs/20 §10) — which the preview can't
        // recompute from role hexes — so no contract pair is declared for the WASH.
        //
        // The border and ink DO move now (#576): both walk toward more contrast per state, so each
        // variant binds its own. Before that the border had one value and this comment said the ink
        // and border "don't change from rest" — true when written, and exactly the kind of claim
        // that goes stale silently when the token surface underneath it grows states.
        {
          name: "hover",
          bindings: { bg: "color.interactive.primary.overlay.hover", border: "color.interactive.primary.border.hover", text: "color.interactive.primary.text.hover", radius: "radius.md", padX: "space.300", padY: "space.150", type: "type.label.md.emphasis" },
          contracts: [{ fg: "color.interactive.primary.border.hover", bg: "color.background.primary", min: UI, label: "hover border on page" }]
        },
        {
          name: "pressed",
          bindings: { bg: "color.interactive.primary.overlay.pressed", border: "color.interactive.primary.border.pressed", text: "color.interactive.primary.text.pressed", radius: "radius.md", padX: "space.300", padY: "space.150", type: "type.label.md.emphasis" },
          contracts: [{ fg: "color.interactive.primary.border.pressed", bg: "color.background.primary", min: UI, label: "pressed border on page" }]
        }
      ]
    },
    {
      id: "input",
      label: "Text input",
      description: "A form field on the field.* chrome \u2014 resting, hover (stronger border), focused (border.focus), and disabled (disabled.*).",
      variants: [
        // The field.* category (docs/20 §17): a TRANSPARENT field fill (#1341) — the field shows the
        // page, so value + placeholder are gated on the ground behind it and the border, which is now the
        // field boundary, is gated on the DARKEST permissible ground (`background.secondary`), matching the
        // engine's own contract. A STRONGER field.border.hover (also on that ground). Focus swaps to
        // border.focus; disabled keeps its solid, WCAG-exempt fill.
        {
          name: "default",
          bindings: { bg: "color.field.fill", border: "color.field.border.rest", text: "color.text.primary", placeholder: "color.field.placeholder", radius: "radius.sm", padX: "space.200", padY: "space.150", type: "type.body.md.default" },
          contracts: [{ fg: "color.text.primary", bg: "color.background.primary", min: TEXT, label: "value on field" }, { fg: "color.field.border.rest", bg: "color.background.secondary", min: UI, label: "resting border" }, { fg: "color.field.placeholder", bg: "color.background.secondary", min: TEXT, label: "placeholder on field" }]
        },
        {
          name: "hover",
          bindings: { bg: "color.field.fill", border: "color.field.border.hover", text: "color.text.primary", placeholder: "color.field.placeholder", radius: "radius.sm", padX: "space.200", padY: "space.150", type: "type.body.md.default" },
          contracts: [{ fg: "color.field.border.hover", bg: "color.background.secondary", min: UI, label: "hover border" }]
        },
        {
          name: "focus",
          bindings: { bg: "color.field.fill", border: "color.border.focus", text: "color.text.primary", radius: "radius.sm", padX: "space.200", padY: "space.150", type: "type.body.md.default" },
          contracts: [{ fg: "color.border.focus", bg: "color.background.primary", min: UI, label: "focus ring" }]
        },
        {
          name: "disabled",
          bindings: { bg: "color.disabled.fill", border: "color.disabled.border", text: "color.disabled.on-fill", radius: "radius.sm", padX: "space.200", padY: "space.150", type: "type.body.md.default" },
          contracts: [{ fg: "color.disabled.on-fill", bg: "color.disabled.fill", min: UI, label: "disabled value on fill" }]
        }
      ]
    },
    {
      id: "card",
      label: "Card",
      description: "A surface with a title, body, and a nested action \u2014 the elevation + ink workhorse.",
      variants: [{
        name: "default",
        bindings: { bg: surface.bg, border: surface.border, title: "type.title.md.strong", titleText: "color.text.primary", body: "type.body.md.default", bodyText: "color.text.secondary", radius: "radius.lg", shadow: "shadow.sm", pad: "space.300" },
        contracts: [{ fg: "color.text.primary", bg: "color.foreground.primary", min: TEXT, label: "title on card" }, { fg: "color.text.secondary", bg: "color.foreground.primary", min: TEXT, label: "body on card" }]
      }]
    },
    {
      id: "alert",
      label: "Alert / banner",
      description: "A semantic banner per status \u2014 tinted fill, matching border, ink, and icon.",
      variants: ["success", "warning", "danger", "info"].map((sem) => ({
        name: sem,
        bindings: { bg: `color.foreground.${sem}-subtle`, border: `color.border.${sem}`, text: `color.text.${sem}`, icon: `color.icon.${sem}`, radius: "radius.md", pad: "space.200", type: "type.body.md.default" },
        contracts: [{ fg: `color.text.${sem}`, bg: `color.foreground.${sem}-subtle`, min: TEXT, label: `${sem} text on tint` }, { fg: `color.border.${sem}`, bg: "color.background.primary", min: UI, label: "border on page" }]
      }))
    },
    {
      id: "nav-item",
      label: "Nav item",
      description: "A top-nav link \u2014 resting and selected (brand ink + action indicator).",
      variants: [
        {
          name: "default",
          bindings: { text: "color.text.secondary", type: "type.label.md.emphasis", padX: "space.200", padY: "space.150" },
          contracts: [{ fg: "color.text.secondary", bg: "color.background.primary", min: TEXT, label: "label on page" }]
        },
        // The indicator is a RESTING mark, not an interaction edge — the nav item is selected, not
        // hovered — so it takes `border.rest` specifically rather than tracking states (#576).
        {
          name: "selected",
          bindings: { text: "color.text.brand", indicator: "color.interactive.primary.border.rest", type: "type.label.md.emphasis", padX: "space.200", padY: "space.150" },
          contracts: [{ fg: "color.text.brand", bg: "color.background.primary", min: TEXT, label: "selected label" }, { fg: "color.interactive.primary.border.rest", bg: "color.background.primary", min: UI, label: "indicator" }]
        }
      ]
    },
    {
      id: "badge",
      label: "Badge / tag",
      description: "A compact status pill \u2014 filled brand and subtle-info variants.",
      variants: [
        {
          name: "brand",
          bindings: { bg: "color.foreground.brand", text: "color.text.on-brand", radius: "radius.round", padX: "space.150", padY: "space.100", type: "type.label.sm.emphasis" },
          contracts: [{ fg: "color.text.on-brand", bg: "color.foreground.brand", min: TEXT, label: "label on fill" }]
        },
        {
          name: "info-subtle",
          bindings: { bg: "color.foreground.info-subtle", text: "color.text.info", radius: "radius.round", padX: "space.150", padY: "space.100", type: "type.label.sm.emphasis" },
          contracts: [{ fg: "color.text.info", bg: "color.foreground.info-subtle", min: TEXT, label: "label on tint" }]
        }
      ]
    },
    {
      id: "typography",
      label: "Type specimen",
      description: "The reading hierarchy \u2014 display, title, body, secondary, and a link.",
      variants: [
        { name: "display", bindings: { type: "type.display.lg.strong", text: "color.text.primary" }, contracts: [{ fg: "color.text.primary", bg: "color.background.primary", min: UI, label: "display (large)" }] },
        { name: "title", bindings: { type: "type.title.lg.strong", text: "color.text.primary" }, contracts: [{ fg: "color.text.primary", bg: "color.background.primary", min: TEXT, label: "title on page" }] },
        { name: "body", bindings: { type: "type.body.md.default", text: "color.text.primary" }, contracts: [{ fg: "color.text.primary", bg: "color.background.primary", min: TEXT, label: "body on page" }] },
        { name: "secondary", bindings: { type: "type.body.md.default", text: "color.text.secondary" }, contracts: [{ fg: "color.text.secondary", bg: "color.background.primary", min: TEXT, label: "secondary on page" }] },
        { name: "link", bindings: { type: "type.body.md.default", text: "color.text.link.default" }, contracts: [{ fg: "color.text.link.default", bg: "color.background.primary", min: TEXT, label: "link on page" }] }
      ]
    }
  ]
};

// ../../packages/engine/version.ts
var ENGINE_VERSION = "0.217.0";
var INVERSE_INTERACTIVE_SLOTS = [
  "border.hover",
  "border.pressed",
  "border.rest",
  "fill.focused",
  "fill.hover",
  "fill.pressed",
  "fill.rest",
  "fill.selected",
  "on-fill",
  "overlay.hover",
  "overlay.pressed",
  "overlay.selected",
  "text.hover",
  "text.pressed",
  "text.rest"
];
var INVERSE_GROUP_MOVES = [
  ["background.inverse", "inverse.background", ["primary", "secondary", "tertiary"]],
  ["border.inverse", "inverse.border", ["brand", "danger", "focus", "info", "primary", "secondary", "success", "warning"]],
  ["disabled.inverse", "inverse.disabled", ["border", "fill", "icon", "on-fill", "text"]],
  ["field.inverse", "inverse.field", ["border.hover", "border.rest", "fill", "placeholder"]],
  ["foreground.inverse", "inverse.foreground", ["brand", "brand-subtle", "danger", "danger-subtle", "info", "info-subtle", "primary", "secondary", "success", "success-subtle", "tertiary", "warning", "warning-subtle"]],
  // `text`/`icon` were the two families spelling the marker `on-inverse`, and #1140 is where that
  // spelling ends: `on-` takes a GROUND, and an inverse SURFACE is a context rather than a ground, so
  // the ink folds into the same `inverse.` group as everything else (`inverse.text.primary`).
  ["icon.on-inverse", "inverse.icon", ["brand", "brand-subtle", "danger", "danger-subtle", "info", "info-subtle", "link.default", "link.focused", "link.hover", "link.visited", "primary", "secondary", "success", "success-subtle", "tertiary", "warning", "warning-subtle"]],
  ["text.on-inverse", "inverse.text", ["brand", "brand-subtle", "danger", "danger-subtle", "info", "info-subtle", "link.default", "link.focused", "link.hover", "link.visited", "primary", "secondary", "success", "success-subtle", "tertiary", "warning", "warning-subtle"]],
  ["interactive.primary.inverse", "inverse.interactive.primary", INVERSE_INTERACTIVE_SLOTS],
  ["interactive.neutral.inverse", "inverse.interactive.neutral", INVERSE_INTERACTIVE_SLOTS],
  ["interactive.destructive.inverse", "inverse.interactive.destructive", INVERSE_INTERACTIVE_SLOTS]
];
var INVERSE_DEDUPED = { group: "border.inverse", leaf: "default", replacedBy: "inverse.border.primary" };
var VEIL_RUNG_RENAMES = [
  ["dark", "large", "subtle"],
  ["dark", "body", "medium"],
  ["dark", "enhanced", "strong"],
  ["light", "large", "subtle"],
  ["light", "body", "medium"],
  ["light", "enhanced", "strong"]
];
var DEPRECATIONS = [
  { path: "motion.easing.enter", replacedBy: "motion.easing.decelerate", since: "2.0.0" },
  { path: "motion.easing.exit", replacedBy: "motion.easing.accelerate", since: "2.0.0" },
  { path: "motion.easing.emphasized", replacedBy: "motion.easing.expressive", since: "2.0.0" },
  // #576 — the outline edge gained states, so each bare leaf became a group. `border.rest` is the
  // honest replacement: it is the state the single value actually WAS (the resting edge), so a
  // consumer following the pointer keeps the same intent rather than silently adopting a hover.
  // Recorded even though the project has no consumers yet — `classify` refuses a `replacedBy` that
  // is not in the live guaranteed set, so these 6 entries are a free check that the rename landed on
  // paths that exist, in a diff where 6 removals and 18 additions are otherwise easy to fat-finger.
  { path: "color.interactive.primary.border", replacedBy: "color.interactive.primary.border.rest", since: "3.0.0" },
  { path: "color.interactive.neutral.border", replacedBy: "color.interactive.neutral.border.rest", since: "3.0.0" },
  { path: "color.interactive.destructive.border", replacedBy: "color.interactive.destructive.border.rest", since: "3.0.0" },
  // These three were authored at 3.0.0 pointing at `on-inverse.border.rest`, which #891 renamed out
  // from under them. The `path` is history and does not move — it is what the retired leaf was
  // literally called — but `replacedBy` must name something the engine still emits, so it follows
  // the rename. This is the rot case the gate exists to catch, and it caught it: `--check` failed
  // with "3 deprecation(s) point at a path the engine does not emit" before this line was touched.
  // …and #1013 renamed them out from under them a SECOND time, for the same reason and with the same
  // rule: `path` is history and never moves, `replacedBy` follows the live name. Every inverse role is
  // now under `color.appearance.*` because `color.*` is the surface tier and carries no inverse roles.
  // …and #1140 a THIRD time, which is what made these three worth deriving from one place rather than
  // typing again: the inverse marker moved to a leading `inverse.` group, so the live path is
  // `color.appearance.inverse.interactive.<palette>.border.rest`. Three catches, same shape each time —
  // `INVERSE_GROUP_MOVES` above is where the live name is now stated once for every era that needs it.
  { path: "color.interactive.primary.on-inverse.border", replacedBy: "color.inverse.interactive.primary.border.rest", since: "3.0.0" },
  { path: "color.interactive.neutral.on-inverse.border", replacedBy: "color.inverse.interactive.neutral.border.rest", since: "3.0.0" },
  { path: "color.interactive.destructive.on-inverse.border", replacedBy: "color.inverse.interactive.destructive.border.rest", since: "3.0.0" },
  // #891 — the inverse-context qualifier drops `on-`. Generated rather than hand-typed: 30 entries
  // written out longhand is 30 chances to fat-finger a segment, and the pairing here is 1:1 by
  // construction. It is still checked rather than asserted — a wrong slot name makes `path` miss the
  // removed set (no `migrated` entry) AND `replacedBy` miss the live set (a dangling deprecation),
  // so either half of a typo fails `token-contract.ts --check` loudly.
  ...["primary", "neutral", "destructive"].flatMap((c) => [
    "text.rest",
    "text.hover",
    "text.pressed",
    "fill.rest",
    "fill.hover",
    "fill.pressed",
    "border.rest",
    "border.hover",
    "border.pressed",
    "on-fill"
  ].map((slot) => ({
    path: `color.interactive.${c}.on-inverse.${slot}`,
    replacedBy: `color.inverse.interactive.${c}.${slot}`,
    since: "4.0.0"
  }))),
  // #891 — `border` spelled the qualifier two ways at once; both become segments under one group.
  // `border.inverse` is the leaf-to-group promotion, so its own replacement WAS the `default` child —
  // and #1140 dropped that child as a duplicate, so this entry now points where the duplicate pointed:
  // `inverse.border.primary`, the path `border.inverse.default` was byte-identical to in every mode.
  // The only entry in this table whose target was DELETED rather than renamed, which is why it is called
  // out: had it been left alone it would have dangled, and `--check` names it.
  { path: "color.border.inverse", replacedBy: "color.inverse.border.primary", since: "4.0.0" },
  { path: "color.border.focus-inverse", replacedBy: "color.inverse.border.focus", since: "4.0.0" },
  // #892 — the two leaves that became 17-role groups. The promoted tier is the honest replacement:
  // it carries the value the leaf had, so a consumer following the pointer keeps the same ink rather
  // than silently adopting a different tier. (#1140 moved the group: `on-inverse` is retired and the ink
  // sits under the one `inverse.` group, so the promoted tier is now `inverse.{text,icon}.primary`.)
  { path: "color.text.on-inverse", replacedBy: "color.inverse.text.primary", since: "5.0.0" },
  { path: "color.icon.on-inverse", replacedBy: "color.inverse.icon.primary", since: "5.0.0" },
  // ── #1013: THE TIER SWAP ────────────────────────────────────────────────────────────────────────
  //
  // `color.*` used to be the VALUE tier — one leaf per resolved role, varying by appearance mode.
  // It is now the SURFACE ALIAS tier: one leaf per role that has a default/inverse pair, pointing into
  // `color.appearance.*`. So a role WITH a pair keeps its short name and gains a second surface mode
  // (no entry needed — the path did not move, only what it resolves to), and a role WITHOUT one loses
  // `color.<role>` entirely. That second group was 114 at the swap and is 113 now, because #1133 retired
  // one of them (see the `scrim` note below).
  //
  // WHY THE LIST IS LITERAL AND NOT DERIVED. `surfaceRowsFor` knows exactly which roles have no row,
  // and importing it here would spell this table in one line. That line would also make the check
  // worthless: `token-contract.ts --accept` refuses a removal with no `DEPRECATIONS` entry, so a table
  // generated from the same function that caused the removal agrees with any bug in it — the removal
  // and its own justification would move together, and the refusal could never fire (`docs/34`). Held
  // literally, a wrong segment fails BOTH ways, loudly: `path` misses the removed set (an unjustified
  // removal) and `replacedBy` misses the live set (a dangling deprecation).
  //
  // THE LIST NOW LIVES IN `INVERSE_GROUP_MOVES` ABOVE AND IS STILL EVERY BIT AS LITERAL. #1140 needs the
  // identical 113 `(group, leaf)` pairs and the identical live targets for its own bump, so the pairs are
  // named once rather than typed twice; the full argument for that is at the table. Nothing here became
  // derived-from-the-subject — only the `color.` / `color.appearance.` prefixes are computed, which is the
  // same latitude #1102's block below takes and for the same reason: a constant carried into both columns
  // still dangles if it is wrong.
  //
  // `['scrim', ['default']]` WAS IN THIS LIST, AND #1133 RETIRED IT RATHER THAN REWORDING IT.
  //
  // At the swap, `color.scrim.default` was the one NON-inverse role that moved: it had no inverse
  // counterpart and the coverage register disposed the gap as `omit` rather than a self-alias, so no
  // pointer row kept the short name alive. #1133 removed the surface mode, which removed the question
  // the disposition answered — a single-mode row is never asked what it does on an inverse ground — so
  // the role gets its pointer and `color.scrim.default` is EMITTED AGAIN (`CONTRACT_VERSION` 7.1.0).
  //
  // A deprecation for a path the engine emits is worse than a missing one: it tells a consumer to stop
  // using a name that works, and it is the only kind of rot `classify` cannot see. The dangling check
  // is on `replacedBy` alone, and `color.appearance.scrim.default` is still perfectly live — so this
  // entry would have gone on passing every gate while saying something false. Removed by hand, and the
  // blind spot filed as its own issue rather than fixed here. It is also why `scrim` is absent from
  // `INVERSE_GROUP_MOVES`: that table is the inverse set, and `scrim` never was inverse.
  ...INVERSE_GROUP_MOVES.flatMap(([oldGroup, newGroup, leaves]) => leaves.map((leaf) => ({
    path: `color.${oldGroup}.${leaf}`,
    replacedBy: `color.${newGroup}.${leaf}`,
    since: "6.0.0"
  }))),
  { path: `color.${INVERSE_DEDUPED.group}.${INVERSE_DEDUPED.leaf}`, replacedBy: `color.${INVERSE_DEDUPED.replacedBy}`, since: "6.0.0" },
  // ── #1140: ONE `inverse` GROUP ──────────────────────────────────────────────────────────────────
  //
  // The 113 inverse roles move from three marker positions to one leading `inverse.` group:
  // `color.appearance.background.inverse.primary` → `color.appearance.inverse.background.primary`,
  // `…text.on-inverse.primary` → `…inverse.text.primary`, and so on. 104 of the 113 are GUARANTEED, which
  // is what makes this a MAJOR (see the `CONTRACT_VERSION` 8.0.0 entry above — the count was measured, not
  // assumed). The other 9 are the `overlay` slots 7.0.0 demoted, and they get entries anyway: a consumer
  // is not the only migrator here, and the Figma variable rename is 113 rows whatever the contract says
  // about 9 of them.
  //
  // Same `(group, leaf)` pairs as #1013's block, one prefix along — the removals are the VALUE-tier
  // spellings this time, since the short spellings went at 6.0.0 and never came back.
  ...INVERSE_GROUP_MOVES.flatMap(([oldGroup, newGroup, leaves]) => leaves.map((leaf) => ({
    path: `color.appearance.${oldGroup}.${leaf}`,
    replacedBy: `color.${newGroup}.${leaf}`,
    since: "8.0.0"
  }))),
  // The dedupe, not a rename: `border.inverse.default` was byte-identical to `border.inverse.primary` in
  // light and in dark, so it is dropped and its consumers are pointed at the twin. This makes the pair a
  // FAN-IN — two retired paths naming one live target — which the contract table holds happily and the
  // Figma rename map refuses to APPLY without disambiguation (`ambiguous-source`).
  //
  // **THAT REFUSAL IS RIGHT FOR THIS ENTRY AND WRONG FOR ITS PARTNER, and it is one refusal covering
  // both.** `planVariableRenames` groups by TARGET, so the group at `inverse/border/primary` holds two
  // live rows in a designer's file and neither moves. For THIS row — the dedupe — that is correct: a
  // migration cannot silently pick which of two variables becomes the survivor, and the designer has to
  // choose. For the OTHER row it is a defect: `border/inverse/primary` → `inverse/border/primary` is an
  // ordinary one-to-one relocation, in no doubt at all, blocked only by an unrelated dedupe that happens
  // to name the same target. Its bindings are left pointing at a variable the engine no longer writes —
  // the stranding #893 built the whole mechanism to prevent, arriving here through the shape of the
  // group rather than through a missing row.
  //
  // Measured on the live map: **111 of the 113 rows at 8.0.0 migrate; these 2 refuse.** Filed as #1142 —
  // the fix belongs in `planVariableRenames` (a group with one non-dedupe source can still migrate it),
  // not in this table, which is a record of history and correct as written.
  { path: `color.appearance.${INVERSE_DEDUPED.group}.${INVERSE_DEDUPED.leaf}`, replacedBy: `color.${INVERSE_DEDUPED.replacedBy}`, since: "8.0.0" },
  // ── #1102: THE `core` TIER ──────────────────────────────────────────────────────────────────────
  //
  // The three RAW-PRIMITIVE groups move under one `core` tier: `palette.red.550` becomes
  // `core.palette.red.550`, and the same for `dimension.*` and `font.*`. 164 paths. The Figma side of
  // the same change is the `core` COLLECTION (`ENGINE_VERSION` 0.27.0), and it is one change rather
  // than two because a variable's name tracks its DTCG path — landed separately these 164 variables
  // would be renamed twice.
  //
  // WHY THE LIST IS LITERAL, for #1013's reason above and not a new one: the transform is a one-line
  // prefix, so importing whatever performed the move would spell this table in a line — and make it
  // agree with any bug in the move, so `--accept`'s refusal could never fire (`docs/34`). Written out,
  // a wrong leaf fails BOTH ways: `path` misses the removed set (an unjustified removal) and
  // `core.<wrong leaf>` misses the live set (a dangling deprecation).
  //
  // The `core.` prefix IS derived from `path`, and that is safe for the same reason rather than in
  // spite of it — it is a constant, and a typo carried from `path` into `replacedBy` still dangles.
  // Deriving the PATHS is what would be circular; deriving the one segment that is the same on all 164
  // is not.
  //
  // `opacity` is deliberately absent: it is directly consumable with no semantic layer to reach for
  // instead (#79), so it is not a primitive in this sense and stays at the root. `font-fluid` is absent
  // too, and for a different reason — it is COMPUTED, not raw, and it is not a DTCG root at all.
  ...[
    ["palette", [
      "black",
      "black-alpha.10",
      "black-alpha.20",
      "black-alpha.30",
      "black-alpha.40",
      "black-alpha.5",
      "black-alpha.50",
      "black-alpha.60",
      "black-alpha.70",
      "black-alpha.80",
      "black-alpha.90",
      "info.025",
      "info.050",
      "info.100",
      "info.150",
      "info.200",
      "info.250",
      "info.300",
      "info.350",
      "info.400",
      "info.450",
      "info.500",
      "info.550",
      "info.600",
      "info.650",
      "info.700",
      "info.750",
      "info.800",
      "info.850",
      "info.900",
      "info.950",
      "neutral.025",
      "neutral.050",
      "neutral.100",
      "neutral.150",
      "neutral.200",
      "neutral.250",
      "neutral.300",
      "neutral.350",
      "neutral.400",
      "neutral.450",
      "neutral.500",
      "neutral.550",
      "neutral.600",
      "neutral.650",
      "neutral.700",
      "neutral.750",
      "neutral.800",
      "neutral.850",
      "neutral.900",
      "neutral.950",
      "white",
      "white-alpha.10",
      "white-alpha.20",
      "white-alpha.30",
      "white-alpha.40",
      "white-alpha.5",
      "white-alpha.50",
      "white-alpha.60",
      "white-alpha.70",
      "white-alpha.80",
      "white-alpha.90"
    ]],
    ["dimension", [
      "0",
      "1",
      "2",
      "4",
      "6",
      "8",
      "10",
      "12",
      "16",
      "20",
      "24",
      "28",
      "32",
      "36",
      "40",
      "44",
      "48",
      "52",
      "56",
      "60",
      "64",
      "68",
      "72",
      "76",
      "80",
      "84",
      "88",
      "92",
      "96",
      "100",
      "104",
      "108",
      "112",
      "116",
      "120",
      "124",
      "128"
    ]],
    ["font", [
      "family.body",
      "family.caption",
      "family.code",
      "family.display",
      "family.eyebrow",
      "family.label",
      "family.title",
      "letter-spacing-role.normal",
      "letter-spacing-role.snug",
      "letter-spacing-role.tight",
      "letter-spacing-role.tighter",
      "letter-spacing-role.wide",
      "letter-spacing-role.wider",
      "letter-spacing.0",
      "letter-spacing.20",
      "letter-spacing.50",
      "letter-spacing.neg-10",
      "letter-spacing.neg-20",
      "letter-spacing.neg-30",
      "line-height-role.compact",
      "line-height-role.cozy",
      "line-height-role.loose",
      "line-height-role.normal",
      "line-height-role.relaxed",
      "line-height-role.snug",
      "line-height-role.tight",
      "line-height.105",
      "line-height.115",
      "line-height.125",
      "line-height.140",
      "line-height.150",
      "line-height.165",
      "line-height.175",
      "size.10",
      "size.11",
      "size.12",
      "size.14",
      "size.16",
      "size.18",
      "size.20",
      "size.24",
      "size.28",
      "size.32",
      "size.36",
      "size.40",
      "size.48",
      "size.56",
      "size.64",
      "size.72",
      "size.80",
      "size.96",
      "size.112",
      "size.128",
      "size.144",
      "size.160",
      "typeface.jetbrains-mono",
      "weight-role.default",
      "weight-role.emphasis",
      "weight-role.max",
      "weight-role.strong",
      "weight-role.subtle",
      "weight.300",
      "weight.400",
      "weight.700",
      "weight.900"
    ]]
  ].flatMap(([group, leaves]) => leaves.map((leaf) => ({
    path: `${group}.${leaf}`,
    replacedBy: `core.${group}.${leaf}`,
    since: "7.0.0"
  }))),
  // ── #1148: ONE COLOUR TIER ──────────────────────────────────────────────────────────────────────
  //
  // The `appearance` level is DELETED and the value tier takes the short names back. Every one of the
  // 243 `color.appearance.<X>` paths becomes `color.<X>`. This is the exact inverse of #1013's move: the
  // short names went to a pointer tier then and they come back to the values now, so a consumer who has
  // been writing `color.text.primary` since before 3.0.0 is unaffected by either change and a consumer
  // who followed #1013's advice to the appearance tier has to come back. That asymmetry is the cost of
  // #1013 and it is being paid here rather than argued about.
  //
  // 225 of the 243 are GUARANTEED, which is the MAJOR (`CONTRACT_VERSION` 9.0.0 — measured with
  // `token-contract.ts --check`, which reported exactly 225 removals, 0 demotions and 104 additions
  // before this block was written). The other 18 are the `overlay` slots #957 demoted, nine on each
  // ground.
  //
  // **THE 18 ARE CHECKED IN NEITHER DIRECTION, AND THEY ARE HERE ANYWAY.** Worth stating, because the
  // rest of this table is load-bearing and these lines are not: a brand-dependent `path` is not in the
  // baseline's `guaranteed`, so it never enters `removed` and no arm asks whether it was ever real; and
  // its `replacedBy` is `brandDependent` too, which `classify` exempts from the dangling check by design
  // (it reports them as `conditionalMigrations` instead). So a typo in one of those 18 tails passes every
  // gate. They are included for the reason #1140's block included the same nine pairs: a consumer of a
  // brand-dependent path is hit by this rename identically to a consumer of a guaranteed one, and
  // splitting the record by which side of the guarantee a path fell on would answer "what happened to my
  // token" for 225 people and not for the rest. The 225 checked lines are what makes the block trustworthy;
  // these 18 ride along, and a reader should know which is which rather than assume uniform coverage.
  //
  // NO FIGMA ROWS COME OUT OF THIS BLOCK, and that is the point rather than an omission. `projectionsOf`
  // strips the `appearance` tier segment from both sides via `TIER_SEGMENT`, so every entry here projects
  // to `roleOf(from) === roleOf(to)` and yields NOTHING. The Figma half is
  // `color-one-collection-1148` in `materialization-renames.ts` — one materialization rule, one record,
  // which is the invariant `lint-materialization-renames.ts` enforces as `multiplyClaimed`. Writing the
  // rename into both registers would fail that gate, by name, and rightly.
  //
  // WHY THE LIST IS LITERAL, for #1013's and #1102's reason and not a new one. The transform is a
  // one-segment prefix strip, so importing whatever performed it would spell this table in a line and make
  // it agree with any bug in the strip (`docs/34`). Written out, a wrong tail fails BOTH ways for the 225:
  // `path` misses the removed set (an unjustified removal) and `color.<wrong tail>` misses the live set (a
  // dangling deprecation). The two PREFIXES are computed, which is the same latitude #1102 takes — a
  // constant carried into both columns still dangles if it is wrong.
  ...[
    ["background", [
      "primary",
      "secondary",
      "tertiary"
    ]],
    ["border", [
      "brand",
      "danger",
      "focus",
      "info",
      "primary",
      "secondary",
      "success",
      "tertiary",
      "warning"
    ]],
    ["disabled", [
      "border",
      "fill",
      "icon",
      "on-fill",
      "text"
    ]],
    ["field", [
      "border.hover",
      "border.rest",
      "fill",
      "placeholder"
    ]],
    ["foreground", [
      "brand",
      "brand-subtle",
      "danger",
      "danger-subtle",
      "info",
      "info-subtle",
      "primary",
      "secondary",
      "success",
      "success-subtle",
      "tertiary",
      "warning",
      "warning-subtle"
    ]],
    ["icon", [
      "brand",
      "brand-subtle",
      "danger",
      "danger-subtle",
      "info",
      "info-subtle",
      "link.default",
      "link.focused",
      "link.hover",
      "link.visited",
      "on-brand",
      "on-danger",
      "on-info",
      "on-success",
      "on-warning",
      "primary",
      "secondary",
      "success",
      "success-subtle",
      "tertiary",
      "warning",
      "warning-subtle"
    ]],
    ["interactive", [
      "destructive.border.hover",
      "destructive.border.pressed",
      "destructive.border.rest",
      "destructive.fill.focused",
      "destructive.fill.hover",
      "destructive.fill.pressed",
      "destructive.fill.rest",
      "destructive.fill.selected",
      "destructive.on-fill",
      "destructive.overlay.hover",
      "destructive.overlay.pressed",
      "destructive.overlay.selected",
      "destructive.text.hover",
      "destructive.text.pressed",
      "destructive.text.rest",
      "neutral.border.hover",
      "neutral.border.pressed",
      "neutral.border.rest",
      "neutral.fill.focused",
      "neutral.fill.hover",
      "neutral.fill.pressed",
      "neutral.fill.rest",
      "neutral.fill.selected",
      "neutral.on-fill",
      "neutral.overlay.hover",
      "neutral.overlay.pressed",
      "neutral.overlay.selected",
      "neutral.text.hover",
      "neutral.text.pressed",
      "neutral.text.rest",
      "primary.border.hover",
      "primary.border.pressed",
      "primary.border.rest",
      "primary.fill.focused",
      "primary.fill.hover",
      "primary.fill.pressed",
      "primary.fill.rest",
      "primary.fill.selected",
      "primary.on-fill",
      "primary.overlay.hover",
      "primary.overlay.pressed",
      "primary.overlay.selected",
      "primary.text.hover",
      "primary.text.pressed",
      "primary.text.rest"
    ]],
    ["inverse", [
      "background.primary",
      "background.secondary",
      "background.tertiary",
      "border.brand",
      "border.danger",
      "border.focus",
      "border.info",
      "border.primary",
      "border.secondary",
      "border.success",
      "border.tertiary",
      "border.warning",
      "disabled.border",
      "disabled.fill",
      "disabled.icon",
      "disabled.on-fill",
      "disabled.text",
      "field.border.hover",
      "field.border.rest",
      "field.fill",
      "field.placeholder",
      "foreground.brand",
      "foreground.brand-subtle",
      "foreground.danger",
      "foreground.danger-subtle",
      "foreground.info",
      "foreground.info-subtle",
      "foreground.primary",
      "foreground.secondary",
      "foreground.success",
      "foreground.success-subtle",
      "foreground.tertiary",
      "foreground.warning",
      "foreground.warning-subtle",
      "icon.brand",
      "icon.brand-subtle",
      "icon.danger",
      "icon.danger-subtle",
      "icon.info",
      "icon.info-subtle",
      "icon.link.default",
      "icon.link.focused",
      "icon.link.hover",
      "icon.link.visited",
      "icon.primary",
      "icon.secondary",
      "icon.success",
      "icon.success-subtle",
      "icon.tertiary",
      "icon.warning",
      "icon.warning-subtle",
      "interactive.destructive.border.hover",
      "interactive.destructive.border.pressed",
      "interactive.destructive.border.rest",
      "interactive.destructive.fill.focused",
      "interactive.destructive.fill.hover",
      "interactive.destructive.fill.pressed",
      "interactive.destructive.fill.rest",
      "interactive.destructive.fill.selected",
      "interactive.destructive.on-fill",
      "interactive.destructive.overlay.hover",
      "interactive.destructive.overlay.pressed",
      "interactive.destructive.overlay.selected",
      "interactive.destructive.text.hover",
      "interactive.destructive.text.pressed",
      "interactive.destructive.text.rest",
      "interactive.neutral.border.hover",
      "interactive.neutral.border.pressed",
      "interactive.neutral.border.rest",
      "interactive.neutral.fill.focused",
      "interactive.neutral.fill.hover",
      "interactive.neutral.fill.pressed",
      "interactive.neutral.fill.rest",
      "interactive.neutral.fill.selected",
      "interactive.neutral.on-fill",
      "interactive.neutral.overlay.hover",
      "interactive.neutral.overlay.pressed",
      "interactive.neutral.overlay.selected",
      "interactive.neutral.text.hover",
      "interactive.neutral.text.pressed",
      "interactive.neutral.text.rest",
      "interactive.primary.border.hover",
      "interactive.primary.border.pressed",
      "interactive.primary.border.rest",
      "interactive.primary.fill.focused",
      "interactive.primary.fill.hover",
      "interactive.primary.fill.pressed",
      "interactive.primary.fill.rest",
      "interactive.primary.fill.selected",
      "interactive.primary.on-fill",
      "interactive.primary.overlay.hover",
      "interactive.primary.overlay.pressed",
      "interactive.primary.overlay.selected",
      "interactive.primary.text.hover",
      "interactive.primary.text.pressed",
      "interactive.primary.text.rest",
      "text.brand",
      "text.brand-subtle",
      "text.danger",
      "text.danger-subtle",
      "text.info",
      "text.info-subtle",
      "text.link.default",
      "text.link.focused",
      "text.link.hover",
      "text.link.visited",
      "text.primary",
      "text.secondary",
      "text.success",
      "text.success-subtle",
      "text.tertiary",
      "text.warning",
      "text.warning-subtle"
    ]],
    ["scrim", [
      "default"
    ]],
    ["text", [
      "brand",
      "brand-subtle",
      "danger",
      "danger-subtle",
      "info",
      "info-subtle",
      "link.default",
      "link.focused",
      "link.hover",
      "link.visited",
      "on-brand",
      "on-danger",
      "on-info",
      "on-success",
      "on-warning",
      "primary",
      "secondary",
      "success",
      "success-subtle",
      "tertiary",
      "warning",
      "warning-subtle"
    ]]
  ].flatMap(([group, leaves]) => leaves.map((leaf) => ({
    path: `color.appearance.${group}.${leaf}`,
    replacedBy: `color.${group}.${leaf}`,
    since: "9.0.0"
  }))),
  // `veil` is DELIBERATELY ABSENT from the loop above, because #1317 broke its `path` and `replacedBy`
  // leaves apart. #1148 moved the value-tier veil rungs to the short spelling under their OLD floor-names
  // (`color.appearance.veil.dark.body` → `color.veil.dark.body`); #1317 then renamed the rungs to
  // intensities (the block below), so `color.veil.dark.body` is no longer live. These six #1148 entries
  // therefore keep their `path` — history: the appearance-tier spelling really was retired at 9.0.0 — and
  // follow `replacedBy` to the NEW live name, the "renamed out from under them" rule the 3.0.0 border
  // entries already follow. `VEIL_RUNG_RENAMES` is where the old→new pairing is stated once.
  ...VEIL_RUNG_RENAMES.map(([pol, oldR, newR]) => ({
    path: `color.appearance.veil.${pol}.${oldR}`,
    replacedBy: `color.veil.${pol}.${newR}`,
    since: "9.0.0"
  })),
  // ── #1317: THE VEIL RUNGS RENAME FROM FLOOR-NAMES TO INTENSITY ──────────────────────────────────
  //
  // `veil.<pol>.{large,body,enhanced}` → `veil.<pol>.{subtle,medium,strong}`, both polarities — six
  // guaranteed paths renamed. The floor-names claimed a per-image contrast guarantee the engine cannot
  // keep (the floor is the worst pixel of an UNKNOWN image); the intensity names claim only magnitude,
  // which a designer can see. See `modes.ts`'s veil note for the owner's reasoning.
  //
  // A PURE NAME CHANGE — the VALUES do not move. The floors stay in `VEIL_RUNGS` as the default-picker,
  // so each rung derives to the identical alpha step and `regen --check` shows the emitted alphas
  // unchanged. That is a MAJOR by the removal rule (a guaranteed path leaves), and `replacedBy` names the
  // intensity twin so a consumer following the pointer keeps the same wash under a new name.
  //
  // THE FIGMA SIDE IS DERIVED FROM HERE, not recorded in `MATERIALIZATION_RENAMES`. A rung rename moves
  // the ROLE (`veil/dark/body` → `veil/dark/medium`), so `projectionsOf` yields a real variable rename;
  // a materialization rule would be a second record in front of one Figma operation, which
  // `lint-materialization-renames.ts` fails as `multiplyClaimed`. Stated literally (not imported from
  // `modes.ts`) so a typo dangles in `--check` rather than agreeing with its subject (`docs/34`).
  ...VEIL_RUNG_RENAMES.map(([pol, oldR, newR]) => ({
    path: `color.veil.${pol}.${oldR}`,
    replacedBy: `color.veil.${pol}.${newR}`,
    since: "10.0.0"
  }))
];

// ../../packages/engine/tree.ts
var WHITE2 = { r: 255, g: 255, b: 255 };
var BLACK2 = { r: 0, g: 0, b: 0 };
var round = (n, d = 4) => Math.round(n * 10 ** d) / 10 ** d;
var rgbStr = ({ r, g, b }) => `rgb(${r}, ${g}, ${b})`;
var colorValue = (rgb, fmt) => fmt === "hex" ? hex(rgb) : rgbStr(rgb);
var rgbFromHex = (h) => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) });
var colorValueFromHex = (h, fmt) => fmt === "hex" ? h : rgbStr(rgbFromHex(h));
var alphaHex = (a) => Math.round(emittedAlpha(a, "hex") * 255).toString(16).padStart(2, "0");
var alphaColorValue = (rgb, a, fmt) => fmt === "hex" ? `${hex(rgb)}${alphaHex(a)}` : `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${emittedAlpha(a, "rgb")})`;
var ALPHA_STEPS = OPACITY_STEPS;
var COLOR_FAMILY_ORDER = [
  "background",
  "foreground",
  "text",
  "icon",
  "interactive",
  "disabled",
  "border",
  "scrim",
  "veil",
  "field",
  "inverse"
];
var orderedRoleKeys = (keys) => {
  const rank = new Map(COLOR_FAMILY_ORDER.map((f, i) => [f, i]));
  const unlisted = [...new Set(keys.map((k) => k.split(".")[0]))].filter((f) => !rank.has(f));
  if (unlisted.length)
    throw new Error(
      `tree: color role family/families absent from COLOR_FAMILY_ORDER: ${unlisted.join(", ")} \u2014 #1150 makes the written order the order Figma lists the collection in, so an unranked family would land wherever the resolver happened to build it. Add it at the position it should read in the variables panel.`
    );
  return keys.map((k, i) => ({ k, i })).sort((a, b) => rank.get(a.k.split(".")[0]) - rank.get(b.k.split(".")[0]) || a.i - b.i).map((e) => e.k);
};
var primitiveLeaf = (theme2, paletteDesc, s, isAnchor, ramp) => {
  const floor2 = (x) => Math.floor(x * 100) / 100;
  const onWhite = contrast(s.rgb, WHITE2), onBlack = contrast(s.rgb, BLACK2);
  const pivot = Math.min(onWhite, onBlack) >= 4.5 ? "mid-tone AA pivot (\u22654.5:1 on white & black)" : `${floor2(onWhite)}:1 on white, ${floor2(onBlack)}:1 on black`;
  const role = isAnchor ? "brand anchor (exact, pinned)" : s.num === 500 ? pivot : "";
  return {
    $type: "color",
    $value: colorValue(s.rgb, theme2.colorFormat),
    // The band is glossed with what it holds and its real step range in THIS ramp (#1623 DT/T-8), so the
    // name is readable without a key: `Quarter-Tone band (light tints, steps 100–350)`.
    $description: `${paletteDesc} ${s.key} \u2014 ${bandPhrase(s.band, ramp.filter((x) => x.band === s.band).map((x) => x.key))}${role ? ` \u2014 ${role}` : ""}`,
    $extensions: { prism3: { generated: true, source: "oklch", oklch: { l: round(s.oklch.l), c: round(s.oklch.c), h: round(s.oklch.h, 2) }, hex: s.hex, band: s.band, anchor: isAnchor, contrastOnWhite: round(contrast(s.rgb, WHITE2), 2) } }
  };
};
var baseLeaf = (theme2, rgb, description, band) => ({
  $type: "color",
  $value: colorValue(rgb, theme2.colorFormat),
  $description: description,
  $extensions: { prism3: { generated: true, source: "oklch", hex: hex(rgb), band } }
});
var aliasLeaf = (path, description, extra) => ({
  $type: "color",
  $value: `{${path}}`,
  $description: description,
  $extensions: { prism3: { role: "semantic", aliasOf: path, ...extra } }
});
var alphaLeaf = (theme2, rgb, a, description) => ({
  $type: "color",
  $value: alphaColorValue(rgb, a, theme2.colorFormat),
  $description: description,
  $extensions: { prism3: { generated: true, alpha: a, note: "composites over any surface" } }
});
var numLeaf = (value, description) => ({
  $type: "number",
  $value: value,
  $description: description,
  $extensions: { prism3: { generated: true } }
});
var strokeStyleLeaf = (value, description) => ({
  $type: "strokeStyle",
  $value: value,
  $description: description,
  $extensions: { prism3: { generated: true } }
});
var durLeaf = (ms, description) => ({
  $type: "duration",
  $value: `${ms}ms`,
  $description: description,
  $extensions: { prism3: { generated: true, ms } }
});
var bezierLeaf = (b, description) => ({
  $type: "cubicBezier",
  $value: b,
  $description: description,
  $extensions: { prism3: { generated: true } }
});
var springLeaf = (p, description) => ({
  $type: "spring",
  $value: p,
  $description: description,
  // `spring` is an INTENTIONAL custom type — springs have no DTCG type yet
  // (design-tokens CG open issue). Style Dictionary ingests it without error
  // (unknown types pass through) but needs a custom transform to render it; that
  // is expected, since spring → platform (web linear()/CSS, native
  // stiffness/damping/mass) is inherently a per-platform step.
  $extensions: { prism3: { generated: true, customType: "spring", note: "no DTCG type for springs yet; provide a platform transform downstream" } }
});
var transitionLeaf = (durPath, easePath, description) => ({
  $type: "transition",
  $value: { duration: `{${durPath}}`, timingFunction: `{${easePath}}`, delay: "0ms" },
  $description: description,
  $extensions: { prism3: { role: "composite" } }
});
var shadowLayerValue = (colorRgb, l, fmt) => ({
  color: alphaColorValue(colorRgb, l.alpha, fmt),
  offsetX: `${l.offsetX}px`,
  offsetY: `${l.offsetY}px`,
  blur: `${l.blur}px`,
  spread: `${l.spread}px`
});
var shadowLeaf = (theme2, step, description) => {
  const fmt = theme2.colorFormat;
  const base = theme2.shadow.colorRgb;
  const lightVals = step.light.map((l) => shadowLayerValue(base, l, fmt));
  const darkVals = theme2.modes.includes("dark") ? step.dark.map((l) => shadowLayerValue(base, l, fmt)) : void 0;
  const modes = {};
  if (darkVals) modes.dark = { $value: darkVals };
  for (const [mode, sm] of Object.entries(theme2.shadow.shadowByMode ?? {})) {
    const layers = sm.layers[step.name];
    if (layers) modes[mode] = { $value: layers.map((l) => shadowLayerValue(sm.colorRgb, l, fmt)) };
  }
  return {
    $type: "shadow",
    $value: lightVals,
    $description: description,
    $extensions: { prism3: {
      generated: true,
      role: "composite",
      layers: step.light.length,
      modes,
      figma: { kind: "effect-style", styleType: "EFFECT", binds: ["color", "radius", "spread", "offsetX", "offsetY"], note: "Figma Effect Style (drop-shadow layers); color + numerics bindable per layer; mode-aware \u2014 dark shadow is reduced (surface lift carries dark elevation), see modes.dark" }
    } }
  };
};
var round3 = (n) => Math.round(n * 1e3) / 1e3;
var gradientCss = (g, fmt) => {
  const stopList = g.stops.map((s) => `${colorValueFromHex(s.hex, fmt)} ${round3(s.position * 100)}%`).join(", ");
  const space = g.interpolation === "oklch" ? " in oklch" : "";
  if (g.kind === "radial") return `radial-gradient(${g.shape} at ${round3(g.center[0] * 100)}% ${round3(g.center[1] * 100)}%${space}, ${stopList})`;
  return `linear-gradient(${g.angle}deg${space}, ${stopList})`;
};
var gradientLeaf = (g, fmt) => {
  const paintType = g.kind === "radial" ? "GRADIENT_RADIAL" : "GRADIENT_LINEAR";
  const geom = g.kind === "radial" ? { center: g.center, shape: g.shape } : { angle: g.angle };
  const aa = Math.min(g.worstOnWhite, g.worstOnBlack);
  const wOnW = round(g.worstOnWhite, 2), wOnB = round(g.worstOnBlack, 2);
  return {
    $type: "gradient",
    $value: g.stops.map((s) => ({ color: `{${s.aliasOf}}`, position: round3(s.position) })),
    $description: `gradient ${g.name} \u2014 ${g.kind}${g.kind === "linear" ? ` ${g.angle}\xB0` : ` (${g.shape})`}, ${g.stops.length} stops, ${g.interpolation} interpolation \u2014 brand gradient (opt-in)`,
    $extensions: { prism3: {
      generated: true,
      role: "composite",
      kind: g.kind,
      ...geom,
      interpolation: g.interpolation,
      css: gradientCss(g, fmt),
      a11y: {
        worstOnWhite: wOnW,
        worstOnBlack: wOnB,
        note: `text-on-gradient: white text clears ${wOnW}:1 at the lightest stop, black text ${wOnB}:1 at the darkest \u2014 a text overlay must meet its ratio at the worst-case point (constrain the lightness range or add a scrim)${aa < 4.5 ? "; NEITHER plain overlay clears 4.5:1 body text \u2014 use a scrim or a solid container" : ""}`
      },
      figma: {
        kind: "paint-style",
        styleType: "PAINT",
        paintType,
        binds: ["gradientStops[].color"],
        baked: ["type", g.kind === "radial" ? "center/shape" : "angle", "positions"],
        sampledStops: g.sampled,
        note: "Figma Paint Style (gradient fill) \u2014 created via the Plugin API only (REST cannot write/read Paint values). Only stop COLORS bind to COLOR variables (Plugin API Update 92); kind, angle/transform and stop positions are baked. Figma interpolates in sRGB only, so bind the canonical stop colors AND lay down sampledStops to approximate the OKLCH curve."
      }
    } }
  };
};
var dimLeaf = (px, description) => ({
  $type: "dimension",
  $value: `${px}px`,
  $description: description ?? `${px}px \u2014 dimension primitive`,
  $extensions: { prism3: { generated: true, px } }
});
var dimAlias = (path, description, extra) => ({
  $type: "dimension",
  $value: `{${path}}`,
  $description: description,
  $extensions: { prism3: { role: "semantic", aliasOf: path, ...extra } }
});
var fontFamilyLeaf = (stack, variable, description) => ({
  $type: "fontFamily",
  $value: stack[0],
  $description: description,
  $extensions: { prism3: { generated: true, variable, fallbackStack: stack.slice(1), figma: { kind: "style-part", field: "fontFamily", scope: "FONT_FAMILY" } } }
});
var familySemanticAlias = (ref, face, description) => ({
  $type: "fontFamily",
  $value: `{${ref}}`,
  $description: description,
  $extensions: { prism3: { generated: true, role: "semantic", aliasOf: ref, face, figma: { kind: "style-part", field: "fontFamily", scope: "FONT_FAMILY" } } }
});
var fontSizeLeaf = (px, description) => {
  const rem = round(px / 16, 4);
  return {
    $type: "dimension",
    $value: `${rem}rem`,
    $description: description,
    $extensions: { prism3: { generated: true, px, rem, figma: { kind: "variable", field: "fontSize", scope: "FONT_SIZE", unit: "px", value: px } } }
  };
};
var fontWeightLeaf = (value, description) => ({
  $type: "fontWeight",
  $value: value,
  $description: description,
  $extensions: { prism3: { generated: true, figma: { kind: "variable", field: "fontWeight", scope: "FONT_WEIGHT" } } }
});
var weightRoleAlias = (path, numeric, description) => ({
  $type: "fontWeight",
  $value: `{${path}}`,
  $description: description,
  $extensions: { prism3: { role: "semantic", aliasOf: path, numeric } }
});
var rungRoleAlias = (path, value, description) => ({
  $type: typeof value === "number" && path.includes("line-height") ? "number" : "dimension",
  $value: `{${path}}`,
  $description: description,
  $extensions: { prism3: { role: "semantic", aliasOf: path } }
});
var lineHeightLeaf = (value, description) => ({
  $type: "number",
  $value: value,
  $description: description,
  $extensions: { prism3: { generated: true, unitless: true, figma: { kind: "style-part", field: "lineHeight", unit: "PERCENT", percent: Math.round(value * 100), note: "Figma has no unitless line-height variable; the exporter bakes lineHeight as PERCENT (multiplier \xD7 100) \u2014 mode/size-independent, so one bake covers desktop + mobile fluid modes" } } }
});
var letterSpacingLeaf = (em, description) => ({
  $type: "dimension",
  $value: `${em}em`,
  $description: description,
  $extensions: { prism3: { generated: true, em, figma: { kind: "style-part", field: "letterSpacing", unit: "PERCENT", percent: Math.round(em * 1e4) / 100, note: "Figma binds letter-spacing as PERCENT or PIXELS; the exporter bakes as PERCENT (em \xD7 100) \u2014 mode/size-independent. A future pass ships FLOAT tracking variables so brands can retune tracking without style edits (\xA74 fix 3b bindable form)" } } }
});
var fluidClamp = (minPx, maxPx, minVW, maxVW) => {
  const slope = (maxPx - minPx) / (maxVW - minVW);
  const slopeVw = round(slope * 100, 4);
  const interceptRem = round((minPx - slope * minVW) / 16, 4);
  const preferred = `${interceptRem}rem + ${slopeVw}vw`;
  return { clamp: `clamp(${round(minPx / 16, 4)}rem, ${preferred}, ${round(maxPx / 16, 4)}rem)`, preferred };
};
var RE_POINT_LABEL = { fontSize: "size" };
var typographyLeaf = (root, c, face, minVW, maxVW) => {
  const a = (seg) => `{${root}.${CORE_TIER}.font.${seg}}`;
  const value = {
    fontFamily: a(`family.${c.group}`),
    // #415 — a composite's family IS its category
    fontSize: a(`size.${c.sizePx}`),
    // canonical = desktop/max (fallback)
    fontWeight: a(`weight-role.${c.weightRole}`),
    lineHeight: a(`line-height-role.${c.lineHeight}`),
    letterSpacing: a(`letter-spacing-role.${c.tracking}`)
  };
  const slanted = c.italic || c.italicDefault === true;
  if (slanted) value.fontStyle = "italic";
  if (c.textCase !== "none") value.textCase = c.textCase;
  if (c.link) value.textDecoration = "underline";
  const isFluid = c.sizeMinPx !== c.sizePx;
  const responsive = isFluid ? {
    fluid: true,
    min: { px: c.sizeMinPx, rem: round(c.sizeMinPx / 16, 4), ref: `{${root}.${CORE_TIER}.font.size.${c.sizeMinPx}}` },
    max: { px: c.sizePx, rem: round(c.sizePx / 16, 4), ref: `{${root}.${CORE_TIER}.font.size.${c.sizePx}}` },
    web: fluidClamp(c.sizeMinPx, c.sizePx, minVW, maxVW).clamp,
    figma: { field: "fontSize", scope: "FONT_SIZE", modes: { mobile: c.sizeMinPx, desktop: c.sizePx } }
  } : { fluid: false, px: c.sizePx };
  const rungModes = {};
  for (const [m, px] of Object.entries(c.sizeByMode ?? {})) (rungModes[m] ??= {}).fontSize = a(`size.${px}`);
  const modeVariants = Object.keys(rungModes).length ? { modes: Object.fromEntries(Object.entries(rungModes).map(([m, parts]) => [m, {
    $value: { ...value, ...parts },
    // A re-sized rung carries its OWN fluid pair — the brand-level one was derived from the size
    // this mode replaced, so reusing it would pair a smaller desktop value with a larger mobile
    // floor. Absent when the mode only re-points leading/tracking, which don't affect size.
    ...c.sizeByMode?.[m] !== void 0 && c.sizeMinByMode?.[m] !== void 0 ? { responsive: c.sizeMinByMode[m] !== c.sizeByMode[m] ? {
      fluid: true,
      min: { px: c.sizeMinByMode[m], rem: round(c.sizeMinByMode[m] / 16, 4), ref: `{${root}.${CORE_TIER}.font.size.${c.sizeMinByMode[m]}}` },
      max: { px: c.sizeByMode[m], rem: round(c.sizeByMode[m] / 16, 4), ref: `{${root}.${CORE_TIER}.font.size.${c.sizeByMode[m]}}` },
      web: fluidClamp(c.sizeMinByMode[m], c.sizeByMode[m], minVW, maxVW).clamp,
      figma: { field: "fontSize", scope: "FONT_SIZE", modes: { mobile: c.sizeMinByMode[m], desktop: c.sizeByMode[m] } }
    } : { fluid: false, px: c.sizeByMode[m] } } : {},
    // Labeled from the fields actually present. The previous expression hardcoded
    // "size"/"leading/tracking" and its second branch was already dead (#377 moved leading and
    // tracking onto the semantic role), so adding family would have mislabeled a family re-point
    // as "leading/tracking". Only fontSize reaches here now (#415 moved family onto the semantic
    // too), but the label table keeps the note honest if another field ever does.
    note: `${Object.keys(parts).map((f) => RE_POINT_LABEL[f] ?? f).join(" + ")} re-point \u2014 ${m} (${Object.entries(parts).map(([f, v]) => `${f} \u2192 ${v}`).join(", ")})`
  }])) } : {};
  return {
    $type: "typography",
    $value: value,
    $description: `${c.group}${c.variant ? " " + c.variant : ""} ${c.weightRole}${c.italic ? " italic" : ""}${c.link ? " link" : ""} \u2014 ${isFluid ? `${c.sizeMinPx}\u2192${c.sizePx}px fluid` : `${c.sizePx}px`} ${face}, ${c.lineHeight} line-height, ${c.weightRole} weight${slanted ? ", italic" : ""}, ${c.tracking} tracking${c.textCase !== "none" ? `, ${c.textCase}` : ""}${c.link ? ", underlined (link \u2014 pair with text.link.* color)" : ""}`,
    $extensions: { prism3: { role: "composite", ...modeVariants, group: c.group, variant: c.variant, weightRole: c.weightRole, sizePx: c.sizePx, ...c.italic ? { italic: true } : {}, ...c.link ? { link: true } : {}, ...c.textCase !== "none" ? { textCase: c.textCase } : {}, ...c.facePin ? { facePin: c.facePin } : {}, responsive, figma: { kind: "text-style", styleType: "TEXT", binds: ["fontFamily", "fontSize", "fontStyle"], baked: ["lineHeight", "letterSpacing", ...c.textCase !== "none" ? ["textCase"] : [], ...c.link ? ["textDecoration"] : []], note: "Figma Text Style; fontFamily/fontSize/fontStyle bind their variables (fontSize can bind a font-fluid var with desktop/mobile modes \u2014 see responsive.figma.modes); lineHeight + letterSpacing baked as PERCENT (mode/size-independent); textCase/underline baked (not bindable). fontStyle binds a STRING cut variable (#1485), the single weight/style control the Text Style has, holding the Figma style name: a facePin (#1368) sets it verbatim (e.g. Light Condensed \u2014 the width cut the numeric weight axis cannot reach), else it is the weight-role numeric run through a weight-to-style-name table (the italic named-instance, e.g. Bold Italic, when $value carries fontStyle:italic). The numeric fontWeight stays parallel data ($value.fontWeight aliases the weight-role primitive) but is no longer bound on the style." } } }
  };
};
var EASING_NOTE = {
  linear: "constant speed, no easing",
  standard: "symmetric ease for in-place changes",
  decelerate: "fast start, soft landing; for entrances",
  accelerate: "soft start, fast finish; for exits",
  expressive: "S-curve for emphasized moments",
  calm: "accessibility: soft onset for long/involuntary motion"
};
var buildTree = (theme2) => {
  const root = theme2.root;
  const palette = {
    white: baseLeaf(theme2, WHITE2, "Pure white \u2014 Highlight base / default surface", "Highlights"),
    black: baseLeaf(theme2, BLACK2, "Pure black \u2014 Shadow base", "Shadows"),
    // #1341 — the alpha-0 "no paint" primitive. A fully-transparent COLOR value, distinct from the
    // `opacity.*` number scale (a multiplier) and from the white-/black-alpha ramps (which start at
    // 5%). The default `color.field.fill` aliases it, so a field frames by its border on whatever
    // ground it sits rather than carrying an off-register surface (#1341/#1342). Built through the same
    // `alphaLeaf` mechanism the ramps use so a sibling can add opaque white/black fill sources the same
    // way (#1384), scoped here to `transparent` only.
    transparent: alphaLeaf(theme2, BLACK2, 0, "Transparent \u2014 alpha 0, no paint. field.fill aliases it, so a field is framed by its border on any ground")
  };
  const brandPalette = theme2.roleToPalette.brand;
  const brandAnchorStep = theme2.roleAnchorStep.brand;
  for (const p of theme2.palettes) {
    const node = {};
    for (const s of p.steps) node[s.key] = primitiveLeaf(theme2, p.description, s, p.palette === brandPalette && s.num === brandAnchorStep, p.steps);
    palette[p.palette] = node;
  }
  const alphaRamp = (rgb, label) => {
    const node = {};
    for (const s of ALPHA_STEPS) if (s > 0 && s < 100) node[String(s)] = alphaLeaf(theme2, rgb, s / 100, `${label} ${s}% \u2014 alpha, composites over any surface`);
    return node;
  };
  palette["black-alpha"] = alphaRamp(BLACK2, "Black alpha");
  palette["white-alpha"] = alphaRamp(WHITE2, "White alpha");
  palette["white-alpha"]["0"] = alphaLeaf(theme2, WHITE2, 0, "White alpha 0% \u2014 clear white, the end a light veil fades to");
  const opacity = {};
  for (const s of ALPHA_STEPS) opacity[String(s)] = numLeaf(round(s / 100, 2), `opacity ${s}% (${round(s / 100, 2)})`);
  const modes = resolveAllModes(theme2);
  const OVERRIDE_MODES = theme2.modes.filter((m2) => m2 !== "light");
  const washFields = (r) => r.model === "ink-on-composite" ? { contrastModel: r.model, legibleFor: r.legibleFor } : {};
  const tintRefs = (r) => ({ color: `{${root}.color.${r.tint.fill}}`, opacity: `{${root}.opacity.${r.tint.opacity}}` });
  const tintValue = (r) => alphaColorValue(rgbFromHex(r.hex), r.alpha, theme2.colorFormat);
  const byMode = new Map(modes.map((m2) => [m2.mode, m2]));
  const lightMode = byMode.get("light");
  const colorRoles = {};
  for (const roleKey of orderedRoleKeys(Object.keys(lightMode.roles))) {
    const lr = lightMode.roles[roleKey];
    const modeOverrides = {};
    for (const m2 of OVERRIDE_MODES) {
      const rr = byMode.get(m2)?.roles[roleKey];
      if (!rr) continue;
      modeOverrides[m2] = rr.tint ? { $value: tintValue(rr), tint: tintRefs(rr), contrast: round(rr.ratio, 2), against: rr.against, ...washFields(rr), ...rr.min > 0 ? { min: rr.min } : {}, ...rr.description !== lr.description ? { description: rr.description } : {} } : { $value: `{${rr.path}}`, aliasOf: rr.path, contrast: round(rr.ratio, 2), against: rr.against, ...washFields(rr), ...rr.min > 0 ? { min: rr.min } : {}, ...rr.description !== lr.description ? { description: rr.description } : {} };
    }
    if (lr.tint) {
      const leaf2 = {
        $type: "color",
        $value: tintValue(lr),
        $description: lr.description,
        $extensions: { prism3: {
          role: "semantic",
          tint: tintRefs(lr),
          contrast: round(lr.ratio, 2),
          against: lr.against,
          ...washFields(lr),
          ...lr.min > 0 ? { min: lr.min } : {},
          modes: modeOverrides,
          figma: { collection: "color", modes: ["light", ...OVERRIDE_MODES], note: "one Figma color variable: in each mode it aliases the fill variable in `tint.color` at the opacity variable in `tint.opacity`" }
        } }
      };
      const parts2 = roleKey.split(".");
      let node2 = colorRoles;
      for (let i = 0; i < parts2.length - 1; i++) node2 = node2[parts2[i]] ??= {};
      node2[parts2[parts2.length - 1]] = leaf2;
      continue;
    }
    const leaf = aliasLeaf(lr.path, lr.description, {
      contrast: round(lr.ratio, 2),
      against: lr.against,
      ...washFields(lr),
      ...lr.min > 0 ? { min: lr.min } : {},
      modes: modeOverrides,
      figma: { collection: "color", modes: ["light", ...OVERRIDE_MODES], note: "one Figma color variable; light is $value, other modes in $extensions.prism3.modes.*" }
    });
    const parts = roleKey.split(".");
    let node = colorRoles;
    for (let i = 0; i < parts.length - 1; i++) node = node[parts[i]] ??= {};
    node[parts[parts.length - 1]] = leaf;
  }
  const gridSet = new Set(theme2.dims.grid);
  const gridStepOverride = (px, note) => gridSet.has(px) ? { $value: `{${root}.${CORE_TIER}.dimension.${px}}`, px, note } : { $value: `${px}px`, px, note };
  const dimension = {};
  for (const px of theme2.dims.grid) dimension[String(px)] = dimLeaf(px);
  const space = {};
  const spaceKeyOf = new Map(theme2.dims.space.map((s) => [s.px, s.key]));
  for (const s of theme2.dims.space) space[s.key] = dimAlias(`${root}.${CORE_TIER}.dimension.${s.px}`, `space.${s.key} \u2014 ${s.px}px (${s.mult}\xD7 ${theme2.dims.spaceBase}px base)`, { px: s.px, mult: s.mult });
  const radius = {};
  const wireframe = theme2.modes.includes("wireframe");
  const radiusByMode = theme2.dims.radiusByMode ?? {};
  for (const r of theme2.dims.radius) {
    const leaf = gridSet.has(r.px) ? dimAlias(`${root}.${CORE_TIER}.dimension.${r.px}`, `radius ${r.name} \u2014 ${r.px}px${r.pill ? " (pill)" : ""}`, { px: r.px, radiusScale: theme2.dims.radiusScaleValue }) : dimLeaf(r.px, `radius ${r.name} \u2014 ${r.px}px (off-grid literal)`);
    const modeOverrides = {};
    if (wireframe && r.px !== 0)
      modeOverrides.wireframe = { $value: `{${root}.${CORE_TIER}.dimension.0}`, px: 0, note: "wireframe zeroes all radius (sharp corners)" };
    for (const [mode, steps] of Object.entries(radiusByMode)) {
      const rr = steps.find((s) => s.name === r.name);
      if (!rr || rr.px === r.px) continue;
      modeOverrides[mode] = gridStepOverride(rr.px, `radius lever override \u2014 ${mode} (${rr.px}px)`);
    }
    if (Object.keys(modeOverrides).length) leaf.$extensions.prism3.modes = modeOverrides;
    radius[r.name] = leaf;
  }
  const sizesByMode = theme2.dims.sizesByMode ?? {};
  const sizeModes = (sizeName, field, ownPx, pick, ov) => {
    const modeOverrides = {};
    for (const [mode, steps] of Object.entries(sizesByMode)) {
      const mz = steps.find((s) => s.name === sizeName);
      if (!mz || pick(mz) === ownPx) continue;
      modeOverrides[mode] = ov(pick(mz), `density lever override \u2014 ${mode} (${field} ${pick(mz)}px)`);
    }
    return Object.keys(modeOverrides).length ? modeOverrides : void 0;
  };
  const size = {};
  for (const z of theme2.dims.sizes) {
    const heightLeaf = gridSet.has(z.height) ? dimAlias(`${root}.${CORE_TIER}.dimension.${z.height}`, `size.${z.name} control height \u2014 ${z.height}px (density: ${theme2.dims.density})`, { px: z.height, density: theme2.dims.density }) : dimLeaf(z.height, `size.${z.name} control height \u2014 ${z.height}px`);
    const hMods = sizeModes(z.name, "height", z.height, (s) => s.height, gridStepOverride);
    if (hMods) heightLeaf.$extensions.prism3.modes = hMods;
    size[z.name] = { height: heightLeaf };
  }
  const mdStep = theme2.dims.sizes.find((z) => z.name === "md");
  const targetPx = Math.max(mdStep.height, AAA_TARGET_PX);
  const minHeightLeaf = gridSet.has(targetPx) ? dimAlias(`${root}.${CORE_TIER}.dimension.${targetPx}`, `size.md.min-height \u2014 interactive target-size floor (WCAG 2.2 SC 2.5.5): max(size.md.height ${mdStep.height}, ${AAA_TARGET_PX}) = ${targetPx}px`, { px: targetPx }) : dimLeaf(targetPx, `size.md.min-height \u2014 interactive target-size floor (WCAG 2.2 SC 2.5.5): ${targetPx}px`);
  const minHeightMods = {};
  for (const [mode, steps] of Object.entries(sizesByMode)) {
    const mz = steps.find((s) => s.name === "md");
    if (!mz) continue;
    const px = Math.max(mz.height, AAA_TARGET_PX);
    if (px === targetPx) continue;
    minHeightMods[mode] = gridStepOverride(px, `density lever override \u2014 ${mode} (min-height ${px}px)`);
  }
  if (Object.keys(minHeightMods).length) minHeightLeaf.$extensions.prism3.modes = minHeightMods;
  size.md["min-height"] = minHeightLeaf;
  const iconSize = {};
  for (const ic of theme2.dims.icons) {
    iconSize[ic.name] = gridSet.has(ic.px) ? dimAlias(`${root}.${CORE_TIER}.dimension.${ic.px}`, `icon.size.${ic.name} \u2014 ${ic.px}px artboard (fixed grid; pairs with size.${ic.name})`, { px: ic.px }) : dimLeaf(ic.px, `icon.size.${ic.name} \u2014 ${ic.px}px artboard (fixed grid)`);
  }
  const icon2 = { size: iconSize };
  const controlSize = {};
  const controlsByMode = theme2.dims.controlsByMode ?? {};
  const controlModes = (name, field, ownPx, pick) => {
    const modeOverrides = {};
    for (const [mode, steps] of Object.entries(controlsByMode)) {
      const mc = steps.find((c) => c.name === name);
      if (!mc || pick(mc) === ownPx) continue;
      modeOverrides[mode] = gridStepOverride(pick(mc), `density lever override \u2014 ${mode} (${field} ${pick(mc)}px)`);
    }
    return Object.keys(modeOverrides).length ? modeOverrides : void 0;
  };
  const controlLeaf = (px, description) => gridSet.has(px) ? dimAlias(`${root}.${CORE_TIER}.dimension.${px}`, description, { px, density: theme2.dims.density }) : dimLeaf(px, description);
  const radiusSmPx = theme2.dims.radius.find((r) => r.name === "sm")?.px ?? 0;
  const controlRadiusLeaf = (px, rung, edge) => gridSet.has(px) ? dimAlias(`${root}.${CORE_TIER}.dimension.${px}`, `control.size.${rung} radius \u2014 ${px}px corner on the ${edge}px box edge (min of radius.sm ${radiusSmPx}px and one eighth of the box, ${edge}px \xF7 8, snapped to the 2px radius sub-grid). Clamped to the box rather than taken from the radius ramp: a fixed-size control does not scale its corner the way a card does.`, { px, radiusScale: theme2.dims.radiusScaleValue, clampedFrom: radiusSmPx }) : dimLeaf(px, `control.size.${rung} radius \u2014 ${px}px corner on the ${edge}px box edge (off-grid literal; min of radius.sm ${radiusSmPx}px and one eighth of the box, ${edge}px \xF7 8)`);
  const controlRadiusModes = (rung, edge, ownPx) => {
    const names = /* @__PURE__ */ new Set([...Object.keys(radiusByMode), ...Object.keys(controlsByMode)]);
    if (wireframe) names.add("wireframe");
    const modeOverrides = {};
    for (const mode of names) {
      const smPx = mode === "wireframe" ? 0 : radiusByMode[mode]?.find((s) => s.name === "sm")?.px ?? radiusSmPx;
      const edgePx = controlsByMode[mode]?.find((c) => c.name === rung)?.height ?? edge;
      const px = controlRadius(edgePx, smPx);
      if (px === ownPx) continue;
      modeOverrides[mode] = gridStepOverride(px, mode === "wireframe" ? "wireframe zeroes all radius (sharp corners), so the control corner clamps to 0" : `control-radius re-derivation \u2014 ${mode} (${px}px: min of radius.sm ${smPx}px and ${edgePx}\xF78)`);
    }
    return Object.keys(modeOverrides).length ? modeOverrides : void 0;
  };
  const lhRatio = new Map(theme2.typography.lineHeights.map((l) => [l.key, l.value]));
  const bodyLineBox = {};
  const lineBoxFrom = {};
  for (const c of theme2.typography.composites) {
    if (c.group !== "body") continue;
    const rung = c.path.split(".")[1];
    const px = Math.round(c.sizePx * (lhRatio.get(c.lineHeight) ?? 1));
    if (bodyLineBox[rung] !== void 0 && bodyLineBox[rung] !== px)
      throw new Error(`control.size.${rung}.line-box is ambiguous: ${lineBoxFrom[rung]} gives ${bodyLineBox[rung]}px but ${c.path} gives ${px}px. Every body composite at one rung must share a size and line height (#1220).`);
    bodyLineBox[rung] = px;
    lineBoxFrom[rung] ??= c.path;
  }
  for (const c of theme2.dims.controls) {
    const heightLeaf = controlLeaf(c.height, `control.size.${c.name} \u2014 ${c.height}px box edge for a square control's own dimension: a checkbox square or a radio circle (density: ${theme2.dims.density}). A square control reads this on both axes. A switch's track is not square and reads \`track\`/\`width\` instead.`);
    const widthLeaf = controlLeaf(c.width, `control.size.${c.name} width \u2014 ${c.width}px track width for a two-position control, i.e. a switch (2x the ${c.track}px \`track\` height, the common 2:1 track ratio). A square control uses \`height\` on both axes and does not read this.`);
    const dotLeaf = controlLeaf(c.dot, `control.size.${c.name} dot \u2014 ${c.dot}px inner mark for a radio's dot (half the ${c.height}px box edge, leaving a ${(c.height - c.dot) / 2}px gap to the boundary). A control whose mark is a glyph draws it full-bleed at \`height\`; a switch's traveling thumb reads \`thumb\` instead.`);
    const trackLeaf = controlLeaf(c.track, `control.size.${c.name} track \u2014 ${c.track}px track height for a switch (density: ${theme2.dims.density}). The switch's own cross-axis edge, larger than the ${c.height}px square-control \`height\` because a track holds a traveling thumb. A checkbox/radio does not read it.`);
    const thumbLeaf = controlLeaf(c.thumb, `control.size.${c.name} thumb \u2014 ${c.thumb}px traveling thumb for a switch (0.75 \xD7 the ${c.track}px \`track\`). Larger than a radio's \`dot\` because the switch's mark is the moving element the eye tracks. A checkbox/radio does not read it.`);
    const insetLeaf = controlLeaf(c.inset, `control.size.${c.name} inset \u2014 ${c.inset}px gap between the thumb and the track's boundary ((${c.track}px track \u2212 ${c.thumb}px thumb) \xF7 2). Read as a track's uniform padding by a control whose mark travels, i.e. a switch's thumb, so the thumb clears the track's ends at both extremes instead of sitting flush. A control whose mark is centered and static does not read it.`);
    const hMods = controlModes(c.name, "height", c.height, (x) => x.height);
    const wMods = controlModes(c.name, "width", c.width, (x) => x.width);
    const dMods = controlModes(c.name, "dot", c.dot, (x) => x.dot);
    const iMods = controlModes(c.name, "inset", c.inset, (x) => x.inset);
    const tMods = controlModes(c.name, "track", c.track, (x) => x.track);
    const thMods = controlModes(c.name, "thumb", c.thumb, (x) => x.thumb);
    if (hMods) heightLeaf.$extensions.prism3.modes = hMods;
    if (wMods) widthLeaf.$extensions.prism3.modes = wMods;
    if (dMods) dotLeaf.$extensions.prism3.modes = dMods;
    if (iMods) insetLeaf.$extensions.prism3.modes = iMods;
    if (tMods) trackLeaf.$extensions.prism3.modes = tMods;
    if (thMods) thumbLeaf.$extensions.prism3.modes = thMods;
    const lineBoxPx = bodyLineBox[c.name];
    const lineBox = lineBoxPx !== void 0 ? dimLeaf(lineBoxPx, `control.size.${c.name} line-box \u2014 ${lineBoxPx}px, the height of one line of the \`body.${c.name}\` label (font size \xD7 line height). A selection control sits in a box this tall and centers within it, so it tracks the first line of a wrapping label instead of floating mid-paragraph.`) : void 0;
    const radiusPx = controlRadius(c.height, radiusSmPx);
    const radiusLeaf = controlRadiusLeaf(radiusPx, c.name, c.height);
    const rMods = controlRadiusModes(c.name, c.height, radiusPx);
    if (rMods) radiusLeaf.$extensions.prism3.modes = rMods;
    controlSize[c.name] = { height: heightLeaf, width: widthLeaf, dot: dotLeaf, inset: insetLeaf, track: trackLeaf, thumb: thumbLeaf, radius: radiusLeaf, ...lineBox ? { "line-box": lineBox } : {} };
  }
  const control = { size: controlSize };
  const bwAlias = (px, name) => gridSet.has(px) ? dimAlias(`${root}.${CORE_TIER}.dimension.${px}`, name, { px }) : dimLeaf(px, name);
  const borderWidth = {
    none: bwAlias(0, "border-width none \u2014 0px"),
    hairline: bwAlias(1, "border-width hairline \u2014 1px (default border floor)"),
    thick: bwAlias(2, "border-width thick \u2014 2px (emphasis / selected)"),
    heavy: bwAlias(4, "border-width heavy \u2014 4px")
  };
  const focus = {
    ring: {
      width: bwAlias(2, "focus ring width \u2014 2px (meets WCAG 2.4.13, AAA focus appearance)"),
      offset: bwAlias(2, "focus ring offset \u2014 2px (separates ring from the element edge)"),
      "offset-field": bwAlias(0, "focus ring offset, form fields \u2014 0px (the ring sits on the field edge, so it does not collide with adjacent fields)"),
      style: strokeStyleLeaf("solid", "focus ring style \u2014 solid (dashed/dotted fail at small sizes)")
    }
  };
  const m = theme2.motion;
  const motionByMode = m.motionByMode ?? {};
  const msPath = (v) => `${root}.motion.duration-ms.${v}`;
  const msValues = /* @__PURE__ */ new Set();
  const collect = (mo) => {
    if (!mo) return;
    for (const v of Object.values(mo.duration ?? {})) msValues.add(v);
    for (const v of Object.values(mo.durationReduced ?? {})) msValues.add(v);
    if (mo.stagger !== void 0) msValues.add(mo.stagger);
  };
  collect(m);
  for (const mm of Object.values(motionByMode)) collect(mm);
  const motion = { "duration-ms": {}, duration: {}, "duration-reduced": {}, easing: {}, "easing-role": {}, spring: {}, transition: {} };
  for (const v of [...msValues].sort((a, b) => a - b))
    motion["duration-ms"][String(v)] = durLeaf(v, `duration primitive \u2014 ${v}ms (literal; the semantic tier names the use)`);
  const durSemantic = (baseMs, description, pick, label) => {
    const leaf = {
      $type: "duration",
      $value: `{${msPath(baseMs)}}`,
      $description: description,
      $extensions: { prism3: { role: "semantic", aliasOf: msPath(baseMs), ms: baseMs } }
    };
    const modeOverrides = {};
    for (const [mode, mm] of Object.entries(motionByMode)) {
      const v = pick(mm);
      if (v === void 0 || v === baseMs) continue;
      modeOverrides[mode] = { $value: `{${msPath(v)}}`, aliasOf: msPath(v), ms: v, note: label(mode, v) };
    }
    if (Object.keys(modeOverrides).length) leaf.$extensions.prism3.modes = modeOverrides;
    return leaf;
  };
  for (const [k, v] of Object.entries(m.duration)) motion.duration[k] = durSemantic(v, k === SPIN_ROLE ? `motion duration spin \u2014 ${v}ms per full turn of a spinner, linear, the same at every tempo` : `motion duration ${k} \u2014 ${v}ms (tempo: ${m.tempo})`, (mm) => mm.duration[k], (mode, mv) => `motion tempo lever override \u2014 ${mode} (duration ${k} \u2192 ${mv}ms)`);
  for (const [k, v] of Object.entries(m.durationReduced)) motion["duration-reduced"][k] = durSemantic(v, k === SPIN_ROLE ? `reduce-motion spin \u2014 ${v}ms per full turn: a slow turn, kept rather than removed, because the spinner is how a sighted user sees work continuing` : `reduce-motion ${k} \u2014 ${v}ms${v === 0 ? " (eliminated \u2014 substitute a cross-fade)" : ""}`, (mm) => mm.durationReduced[k], (mode, mv) => `motion tempo lever override \u2014 ${mode} (reduce-motion ${k} \u2192 ${mv}ms)`);
  for (const [k, v] of Object.entries(m.easing)) motion.easing[k] = bezierLeaf(v, `easing ${k}${EASING_NOTE[k] ? ` \u2014 ${EASING_NOTE[k]}` : ""}`);
  for (const [k, v] of Object.entries(m.spring)) motion.spring[k] = springLeaf(v, `spring ${k} \u2014 damping ${v.damping}, stiffness ${v.stiffness}`);
  for (const r of m.easingRoles) {
    const leaf = {
      $type: "cubicBezier",
      $value: `{${root}.motion.easing.${r.curve}}`,
      $description: `easing role '${r.role}' \u2192 ${r.curve} \u2014 the intent a transition names, so a mode can substitute a curve without redefining one`,
      $extensions: { prism3: { role: "semantic", aliasOf: `${root}.motion.easing.${r.curve}` } }
    };
    const modeOverrides = {};
    for (const [mode, map] of Object.entries(m.easingRolesByMode ?? {})) {
      const curve = map[r.role];
      if (!curve || curve === r.curve) continue;
      modeOverrides[mode] = { $value: `{${root}.motion.easing.${curve}}`, aliasOf: `${root}.motion.easing.${curve}`, note: `motion easing re-point \u2014 ${mode} (${r.role} \u2192 ${curve})` };
    }
    if (Object.keys(modeOverrides).length) leaf.$extensions.prism3.modes = modeOverrides;
    motion["easing-role"][r.role] = leaf;
  }
  for (const t of m.transitions) motion.transition[t.name] = transitionLeaf(`${root}.motion.duration.${t.duration}`, `${root}.motion.easing-role.${t.name}`, `motion ${t.name} \u2014 ${t.desc} (${t.duration} + ${t.easing})`);
  motion.stagger = durSemantic(m.stagger, `stagger standard \u2014 ${m.stagger}ms between siblings`, (mm) => mm.stagger, (mode, mv) => `motion tempo lever override \u2014 ${mode} (stagger \u2192 ${mv}ms)`);
  const ty = theme2.typography;
  const familiesByMode = ty.familiesByMode ?? {};
  const weightRolesByMode = ty.weightRolesByMode ?? {};
  const stackKey = (s) => s.join("\0");
  const typeface = {};
  for (const tf of ty.typefaces)
    typeface[tf.slug] = fontFamilyLeaf(tf.stack, tf.variable, `typeface \u2014 ${tf.name}${tf.variable ? " [variable font]" : ""}`);
  const family = {};
  for (const f of ty.families) {
    const slug2 = typefaceSlug(f.stack[0]);
    const leaf = familySemanticAlias(`${root}.${CORE_TIER}.font.typeface.${slug2}`, f.stack[0], `font family \u2014 ${f.group} \u2192 ${f.stack[0]}`);
    const modeOverrides = {};
    for (const [mode, fams] of Object.entries(familiesByMode)) {
      const mf = fams.find((x) => x.group === f.group);
      if (!mf || stackKey(mf.stack) === stackKey(f.stack)) continue;
      const mslug = typefaceSlug(mf.stack[0]);
      modeOverrides[mode] = { $value: `{${root}.${CORE_TIER}.font.typeface.${mslug}}`, aliasOf: `${root}.${CORE_TIER}.font.typeface.${mslug}`, face: mf.stack[0], note: `font family override \u2014 ${mode} (\u2192 ${mf.stack[0]})` };
    }
    if (Object.keys(modeOverrides).length) leaf.$extensions.prism3.modes = modeOverrides;
    family[f.group] = leaf;
  }
  const fsize = {};
  for (const px of ty.sizesPx) fsize[String(px)] = fontSizeLeaf(px, `font size ${px}px (${round(px / 16, 4)}rem) \u2014 curated ladder primitive`);
  const fweight = {};
  for (const w of ty.weightsRef) fweight[String(w)] = fontWeightLeaf(w, `font weight ${w} \u2014 numeric reference (the brand's literal axis value)`);
  const weightRole = {};
  for (const r of ty.weightRoles) {
    const leaf = weightRoleAlias(`${root}.${CORE_TIER}.font.weight.${r.value}`, r.value, `weight role '${r.role}' \u2192 ${r.value} \u2014 function-named, so it survives a brand swap (the brand maps the numeric; a 2-weight brand collapses roles)`);
    const modeOverrides = {};
    for (const [mode, roles] of Object.entries(weightRolesByMode)) {
      const mr = roles.find((x) => x.role === r.role);
      if (!mr || mr.value === r.value) continue;
      modeOverrides[mode] = { $value: `{${root}.${CORE_TIER}.font.weight.${mr.value}}`, weight: mr.value, note: `font weight-role lever override \u2014 ${mode} (${r.role} \u2192 ${mr.value})` };
    }
    if (Object.keys(modeOverrides).length) leaf.$extensions.prism3.modes = modeOverrides;
    weightRole[r.role] = leaf;
  }
  const lhStepsUsed = /* @__PURE__ */ new Map();
  const lsStepsUsed = /* @__PURE__ */ new Map();
  for (const lh of ty.lineHeights) lhStepsUsed.set(lineHeightStepKey(lh.value), lh.value);
  for (const ls of ty.letterSpacings) lsStepsUsed.set(letterSpacingStepKey(ls.em), ls.em);
  for (const byMode2 of Object.values(ty.lineHeightRoleByMode ?? {}))
    for (const v of Object.values(byMode2)) lhStepsUsed.set(lineHeightStepKey(v), v);
  for (const byMode2 of Object.values(ty.letterSpacingRoleByMode ?? {}))
    for (const v of Object.values(byMode2)) lsStepsUsed.set(letterSpacingStepKey(v), v);
  const lineHeight = {};
  for (const [key, value] of [...lhStepsUsed].sort((a, b) => a[1] - b[1]))
    lineHeight[key] = lineHeightLeaf(value, `line height ${value}\xD7 \u2014 unitless multiplier (ladder step ${key})`);
  const letterSpacing = {};
  for (const [key, em] of [...lsStepsUsed].sort((a, b) => a[1] - b[1]))
    letterSpacing[key] = letterSpacingLeaf(em, `letter spacing ${em}em (ladder step ${key})`);
  const lineHeightRole = {};
  for (const lh of ty.lineHeights) {
    const leaf = rungRoleAlias(
      `${root}.${CORE_TIER}.font.line-height.${lineHeightStepKey(lh.value)}`,
      lh.value,
      `line-height role '${lh.key}' \u2192 ${lh.value}\xD7 \u2014 a relative-emphasis name a mode may re-point; the step itself never changes`
    );
    const modes2 = {};
    for (const [m2, byRole] of Object.entries(ty.lineHeightRoleByMode ?? {}))
      if (byRole[lh.key] !== void 0)
        modes2[m2] = { $value: `{${root}.${CORE_TIER}.font.line-height.${lineHeightStepKey(byRole[lh.key])}}` };
    if (Object.keys(modes2).length) leaf.$extensions.prism3.modes = modes2;
    lineHeightRole[lh.key] = leaf;
  }
  const letterSpacingRole = {};
  for (const ls of ty.letterSpacings) {
    const leaf = rungRoleAlias(
      `${root}.${CORE_TIER}.font.letter-spacing.${letterSpacingStepKey(ls.em)}`,
      ls.em,
      `letter-spacing role '${ls.key}' \u2192 ${ls.em}em \u2014 a relative-emphasis name a mode may re-point; the step itself never changes`
    );
    const modes2 = {};
    for (const [m2, byRole] of Object.entries(ty.letterSpacingRoleByMode ?? {}))
      if (byRole[ls.key] !== void 0)
        modes2[m2] = { $value: `{${root}.${CORE_TIER}.font.letter-spacing.${letterSpacingStepKey(byRole[ls.key])}}` };
    if (Object.keys(modes2).length) leaf.$extensions.prism3.modes = modes2;
    letterSpacingRole[ls.key] = leaf;
  }
  const font = {
    typeface,
    family,
    size: fsize,
    weight: fweight,
    "weight-role": weightRole,
    "line-height": lineHeight,
    "line-height-role": lineHeightRole,
    "letter-spacing": letterSpacing,
    "letter-spacing-role": letterSpacingRole
  };
  const faceOf = Object.fromEntries(ty.families.map((f) => [f.group, f.stack[0]]));
  const typeGroup = {};
  for (const c of ty.composites) {
    const leaf = typographyLeaf(root, c, faceOf[c.group], ty.minViewport, ty.maxViewport);
    const parts = c.path.split(".");
    let node = typeGroup;
    for (let i = 0; i < parts.length - 1; i++) node = node[parts[i]] ??= {};
    node[parts[parts.length - 1]] = leaf;
  }
  const sh = theme2.shadow;
  const shadow = {};
  sh.steps.forEach((s, i) => {
    shadow[s.name] = shadowLeaf(theme2, s, `shadow ${s.name} \u2014 elevation ${i + 1} of ${sh.steps.length}, ${s.light.length}-layer (key+ambient)`);
  });
  shadow.inset = shadowLeaf(theme2, sh.inset, "shadow inset \u2014 inner shadow for wells / pressed states / inputs");
  const gradient = {};
  for (const g of theme2.gradient.gradients) gradient[g.name] = gradientLeaf(g, theme2.colorFormat);
  const ly = theme2.layout;
  const breakpoint = {};
  for (const b of ly.breakpoints) breakpoint[b.name] = dimLeaf(b.px, `breakpoint ${b.name} \u2014 min-width ${b.px}px (mobile-first)`);
  const gridSpaceAlias = (px, desc, bp, variable) => {
    const key = spaceKeyOf.get(px);
    const fig = { figma: { collection: "layout", mode: bp, variable, note: "breakpoint = Figma mode (separate layout collection; composes with color light/dark)" } };
    return key ? dimAlias(`${root}.space.${key}`, desc, { px, ...fig }) : dimLeaf(px, desc);
  };
  const grid = {};
  for (const g of ly.grid) {
    grid[g.bp] = {
      columns: { $type: "number", $value: g.columns, $description: `grid ${g.bp} \u2014 ${g.columns} columns (design grid / Figma layout-grid; build with CSS Grid)`, $extensions: { prism3: { generated: true, figma: { collection: "layout", mode: g.bp, variable: "grid.columns", note: "breakpoint = Figma mode" } } } },
      gutter: gridSpaceAlias(g.gutterPx, `grid ${g.bp} gutter \u2014 ${g.gutterPx}px (spacing-scale alias)`, g.bp, "grid.gutter"),
      margin: gridSpaceAlias(g.marginPx, `grid ${g.bp} margin \u2014 ${g.marginPx}px (spacing-scale alias)`, g.bp, "grid.margin")
    };
  }
  const container = {
    max: dimLeaf(ly.containerMax, `container max \u2014 ${ly.containerMax}px content cap (fluid below it)`),
    narrow: dimLeaf(ly.containerNarrow, `container narrow \u2014 ${ly.containerNarrow}px reading measure`),
    fluid: { $type: "dimension", $value: "100%", $description: "container fluid \u2014 full width with margins (the default)", $extensions: { prism3: { generated: true } } }
  };
  const brand = { core: { palette, dimension, font }, color: colorRoles, opacity, motion, type: typeGroup, shadow, icon: icon2, ...Object.keys(gradient).length ? { gradient } : {}, breakpoint, grid, container, space, radius, "border-width": borderWidth, focus, size, control };
  const tree = {
    [root]: brand,
    $extensions: {
      // `version` is the ENGINE version, not the token-contract version: it answers "what code
      // produced this file", which is what you need when a value looks wrong. The name-surface
      // version lives in schema/token-contract.json — see engine/version.ts for why they differ.
      generator: { name: "Prism3 engine", version: ENGINE_VERSION, method: "OKLCH color + grid-derived dimension generation" },
      prism3: { theme: theme2.id, root, colorFormat: theme2.colorFormat, decisions: theme2.notes }
    }
  };
  const resolvePath = (path) => {
    let node = tree;
    for (const seg of path.split(".")) {
      node = node?.[seg];
      if (node === void 0) return false;
    }
    return node && node.$type !== void 0;
  };
  const aliases = [];
  const walk = (node, path) => {
    if (node && typeof node === "object") {
      if (node.$type !== void 0) {
        const v = node.$value;
        if (typeof v === "string") {
          const m2 = v.match(/^\{(.+)\}$/);
          if (m2) aliases.push({ path: path.join("."), ref: m2[1] });
        } else if (v && typeof v === "object" && !Array.isArray(v)) {
          for (const sv of Object.values(v)) if (typeof sv === "string") {
            const m2 = sv.match(/^\{(.+)\}$/);
            if (m2) aliases.push({ path: path.join("."), ref: m2[1] });
          }
        } else if (Array.isArray(v)) {
          for (const item of v) if (item && typeof item === "object") {
            for (const sv of Object.values(item)) if (typeof sv === "string") {
              const m2 = sv.match(/^\{(.+)\}$/);
              if (m2) aliases.push({ path: path.join("."), ref: m2[1] });
            }
          }
        }
        const pushRef = (v2) => {
          if (typeof v2 !== "string") return;
          const m2 = v2.match(/^\{(.+)\}$/);
          if (m2) aliases.push({ path: path.join("."), ref: m2[1] });
        };
        const modeOv = node.$extensions?.prism3?.modes;
        if (modeOv && typeof modeOv === "object" && !Array.isArray(modeOv)) {
          for (const mv of Object.values(modeOv)) {
            if (Array.isArray(mv)) {
              for (const item of mv) if (item && typeof item === "object") Object.values(item).forEach(pushRef);
              continue;
            }
            const sv = mv?.$value;
            pushRef(sv);
            if (Array.isArray(sv)) {
              for (const item of sv) if (item && typeof item === "object") Object.values(item).forEach(pushRef);
            } else if (sv && typeof sv === "object") Object.values(sv).forEach(pushRef);
          }
        }
        const resp = node.$extensions?.prism3?.responsive;
        if (resp?.fluid) for (const end of [resp.min, resp.max]) {
          const sv = end?.ref;
          if (typeof sv === "string") {
            const m2 = sv.match(/^\{(.+)\}$/);
            if (m2) aliases.push({ path: path.join("."), ref: m2[1] });
          }
        }
        return;
      }
      for (const [k, v] of Object.entries(node)) if (!k.startsWith("$")) walk(v, [...path, k]);
    }
  };
  walk(brand, [root]);
  const broken = aliases.filter((a) => !resolvePath(a.ref));
  let modeChecks = 0, modePass = 0;
  for (const mr of modes) for (const r of Object.values(mr.roles)) if (r.min > 0) {
    modeChecks++;
    if (r.ratio >= r.min) modePass++;
  }
  for (const mr of modes) for (const c of mr.tierChecks ?? []) {
    modeChecks++;
    if (c.ratio >= c.min) modePass++;
  }
  for (const mr of modes) for (const r of Object.values(mr.roles)) if (r.alsoAgainst) {
    modeChecks++;
    const partner = mr.roles[r.alsoAgainst.against];
    if (partner && contrast(hexToRgb(r.hex), hexToRgb(partner.hex)) >= r.alsoAgainst.min) modePass++;
  }
  const alphaLeaves = 2 * ALPHA_STEPS.filter((s) => s > 0 && s < 100).length + 1;
  const colorLeaves = 3 + theme2.palettes.reduce((n, p) => n + p.steps.length, 0) + alphaLeaves;
  return { tree, modes, stats: { colorLeaves, dimLeaves: theme2.dims.grid.length, spaceTokens: theme2.dims.space.length, radiusTokens: theme2.dims.radius.length, sizeSteps: theme2.dims.sizes.length, fontSizes: theme2.typography.sizesPx.length, fontWeights: theme2.typography.weightsRef.length, typeComposites: theme2.typography.composites.length, aliases: aliases.length, resolved: aliases.length - broken.length, broken, modeChecks, modePass } };
};
var at = (tree, path) => path.split(".").reduce((n, s) => n?.[s], tree);
var deref = (tree, node) => {
  let cur = node, guard = 0;
  while (cur && typeof cur.$value === "string" && /^\{.+\}$/.test(cur.$value)) {
    if (guard++ >= 10) return void 0;
    cur = at(tree, cur.$value.slice(1, -1));
  }
  return cur;
};
var pxOf = (tree, node) => {
  const v = String(deref(tree, node)?.$value);
  if (v.endsWith("rem")) return parseFloat(v) * 16 || 0;
  return parseInt(v.replace("px", ""), 10) || 0;
};
var subNode = (tree, aliasStr) => at(tree, String(aliasStr).replace(/^\{|\}$/g, ""));
var numOf = (tree, node) => {
  const t = deref(tree, node);
  return typeof t?.$value === "number" ? t.$value : parseFloat(String(t?.$value)) || 0;
};
var remPxOf = (tree, node) => {
  const t = deref(tree, node);
  const px = t?.$extensions?.prism3?.px;
  if (px) return px;
  const v = String(t?.$value);
  return v.endsWith("rem") ? parseFloat(v) * 16 : parseFloat(v) || 0;
};
var familyOf = (tree, node) => {
  const t = deref(tree, node);
  if (Array.isArray(t?.$value)) return t.$value.join(", ");
  const primary = String(t?.$value ?? "sans-serif");
  const fallback = t?.$extensions?.prism3?.fallbackStack ?? [];
  return [primary, ...fallback].join(", ");
};

// ../../packages/engine/resolve-preview.ts
var cssBoxShadow = (layers) => layers.map((l) => `${l.inset ? "inset " : ""}${l.offsetX} ${l.offsetY} ${l.blur} ${l.spread}${l.color ? " " + l.color : ""}`).join(", ");
var strip = (p) => p.replace(/^color\./, "");
var resolvePreview = (theme2, spec = previewSpec) => {
  const modes = resolveAllModes(theme2);
  const hexOf = (rolePath, i) => modes[i].roles[strip(rolePath)]?.hex;
  const alphaByte = (a) => Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0");
  const colorAt = (rolePath, i) => {
    const role = modes[i].roles[strip(rolePath)];
    if (!role?.hex) return void 0;
    return role.alpha != null && role.alpha < 1 ? role.hex + alphaByte(role.alpha) : role.hex;
  };
  const refs = /* @__PURE__ */ new Set();
  for (const c of spec.components) for (const v of c.variants) {
    for (const t of Object.values(v.bindings)) if (t.startsWith("color.")) refs.add(t);
    for (const ct of v.contracts ?? []) {
      refs.add(ct.fg);
      refs.add(ct.bg);
    }
  }
  const colors = {};
  for (const ref of [...refs].sort()) {
    const byMode = {};
    modes.forEach((m, i) => {
      const h = colorAt(ref, i);
      if (h) byMode[m.mode] = h;
    });
    colors[ref] = byMode;
  }
  const contracts = [];
  for (const c of spec.components) for (const v of c.variants) for (const ct of v.contracts ?? []) {
    const byMode = {};
    modes.forEach((m, i) => {
      const fg = hexOf(ct.fg, i), bg = hexOf(ct.bg, i);
      if (fg && bg) {
        const raw = contrast(hexToRgb(fg), hexToRgb(bg));
        byMode[m.mode] = { ratio: Math.round(raw * 100) / 100, pass: raw >= ct.min };
      }
    });
    contracts.push({ component: c.id, variant: v.name, fg: ct.fg, bg: ct.bg, min: ct.min, label: ct.label, byMode });
  }
  const { tree } = buildTree(theme2);
  const data = tree[Object.keys(tree)[0]];
  const dimRefs = /* @__PURE__ */ new Set(), typeRefs = /* @__PURE__ */ new Set(), shadowRefs = /* @__PURE__ */ new Set();
  for (const c of spec.components) for (const v of c.variants) for (const t of Object.values(v.bindings)) {
    if (t.startsWith("type.")) typeRefs.add(t);
    else if (t.startsWith("radius.") || t.startsWith("space.")) dimRefs.add(t);
    else if (t.startsWith("shadow.")) shadowRefs.add(t);
  }
  const dims = {};
  const dimOverrides = {};
  for (const ref of [...dimRefs].sort()) {
    const node = at(data, ref);
    dims[ref] = pxOf(tree, node);
    const mo = node?.$extensions?.prism3?.modes;
    if (mo && typeof mo === "object" && !Array.isArray(mo)) {
      const perMode = {};
      for (const [mode, ov] of Object.entries(mo)) {
        const v = ov?.$value;
        if (typeof v === "string") perMode[mode] = pxOf(tree, subNode(tree, v));
      }
      if (Object.keys(perMode).length) dimOverrides[ref] = perMode;
    }
  }
  const type = {};
  const unresolvedType = [];
  for (const ref of [...typeRefs].sort()) {
    const node = at(data, ref);
    const val = node?.$value;
    if (val == null || typeof val !== "object" || Array.isArray(val)) {
      unresolvedType.push(ref);
      continue;
    }
    const sizePx = node?.$extensions?.prism3?.sizePx ?? remPxOf(tree, subNode(tree, val.fontSize));
    const stack = familyOf(tree, subNode(tree, val.fontFamily));
    const lhNode = val.lineHeight ? deref(tree, subNode(tree, val.lineHeight)) : void 0;
    const lsNode = val.letterSpacing ? deref(tree, subNode(tree, val.letterSpacing)) : void 0;
    type[ref] = {
      fontFamily: stack.split(",")[0].trim(),
      // primary face alone (display)
      fontFamilyStack: stack,
      fontWeight: numOf(tree, subNode(tree, val.fontWeight)),
      fontSizePx: sizePx,
      ...lhNode?.$value != null ? { lineHeight: numOf(tree, lhNode) } : {},
      ...lsNode?.$extensions?.prism3?.em != null ? { letterSpacingEm: lsNode.$extensions.prism3.em } : {}
    };
  }
  const shadowNode = data.shadow ?? {};
  const allShadowRefs = /* @__PURE__ */ new Set([...shadowRefs, ...Object.keys(shadowNode).filter((k) => k[0] !== "$").map((k) => `shadow.${k}`)]);
  const shadows = {};
  for (const ref of [...allShadowRefs].sort()) {
    const node = at(data, ref);
    const base = Array.isArray(node?.$value) ? node.$value : [];
    const mo = node?.$extensions?.prism3?.modes;
    const byMode = {};
    for (const m of modes) {
      const entry = mo?.[m.mode];
      let layers = base;
      if (entry !== void 0) {
        if (!Array.isArray(entry?.$value)) {
          throw new Error(
            `resolve-preview: shadow mode entry '${m.mode}' on '${ref}' is not the wrapped { $value: [...] } shape (got ${Array.isArray(entry) ? "a bare array \u2014 the #708 shape" : typeof entry}).`
          );
        }
        layers = entry.$value;
      }
      if (layers.length) byMode[m.mode] = cssBoxShadow(layers);
    }
    shadows[ref] = byMode;
  }
  return { modes: modes.map((m) => m.mode), colors, contracts, dims, dimOverrides, type, unresolvedType, shadows };
};

// ../../packages/engine/schema/example-brands.json
var example_brands_default = {
  prism3: {
    id: "prism3",
    root: "pds3",
    primary: {
      l: 0.4709,
      c: 0.3001,
      h: 266.75
    },
    neutral: {
      hue: 266.75,
      chroma: 5e-3
    },
    brandColors: [
      {
        name: "accent",
        oklch: {
          l: 0.5573,
          c: 0.2634,
          h: 289.32
        }
      }
    ],
    surfaces: {
      light: {
        base: "white"
      }
    },
    status: {
      success: {
        l: 0.55,
        c: 0.15,
        h: 155,
        chroma: 0.15
      },
      warning: {
        l: 0.55,
        c: 0.16,
        h: 70,
        chroma: 0.16
      },
      danger: {
        l: 0.55,
        c: 0.19,
        h: 25,
        chroma: 0.19
      },
      info: {
        l: 0.55,
        c: 0.13,
        h: 230,
        chroma: 0.13
      }
    },
    density: "comfortable",
    radiusScale: 1,
    iconContrast: "text",
    motionPersonality: {
      tempo: "standard"
    },
    shadow: {
      tint: {
        hue: 266.75,
        amount: 0.35
      }
    },
    typography: {
      families: {
        display: "Playfair Display",
        title: "Playfair Display",
        body: "Inter",
        label: "Inter",
        caption: "Inter",
        eyebrow: "Inter",
        code: "JetBrains Mono"
      },
      weights: {
        display: [
          "emphasis",
          "strong"
        ],
        title: [
          "emphasis",
          "strong"
        ]
      },
      weightRoles: {
        emphasis: 500,
        strong: 600
      },
      italicDefault: [
        "display",
        "title"
      ],
      italics: [
        "body"
      ],
      responsive: {
        fluid: true
      }
    },
    gradients: [
      {
        name: "brand",
        kind: "linear",
        angle: 135,
        stops: [
          {
            palette: "primary",
            step: 600,
            position: 0
          },
          {
            palette: "accent",
            step: 500,
            position: 1
          }
        ]
      },
      {
        name: "glow",
        kind: "radial",
        center: [
          0.5,
          0.4
        ],
        shape: "circle",
        stops: [
          {
            palette: "accent",
            step: 400,
            position: 0
          },
          {
            palette: "primary",
            step: 700,
            position: 1
          }
        ]
      }
    ]
  },
  aurora: {
    id: "aurora",
    root: "ads",
    primary: {
      l: 0.5,
      c: 0.18,
      h: 285
    },
    neutral: {
      hue: 285,
      chroma: 8e-3
    },
    brandColors: [
      {
        name: "accent",
        oklch: {
          l: 0.55,
          c: 0.15,
          h: 235
        }
      }
    ],
    actionPalette: "accent",
    surfaces: {
      light: {
        base: "white"
      }
    },
    radiusScale: 2,
    density: "comfortable",
    iconContrast: "3:1",
    motionPersonality: {
      tempo: "snappy"
    },
    typography: {
      families: {
        display: "Clash Display",
        title: "Clash Display",
        eyebrow: "Clash Display",
        body: "Inter",
        caption: "Inter",
        label: "Inter",
        code: "JetBrains Mono",
        variable: {
          display: true,
          title: true,
          eyebrow: true,
          body: true,
          caption: true,
          label: true
        }
      },
      weightRoles: {
        subtle: 300,
        default: 400,
        emphasis: 500,
        strong: 700
      },
      typeScale: "expressive",
      displayCeiling: "xl",
      titleFloor: 16,
      responsive: {
        fluid: true,
        minViewport: 360,
        maxViewport: 1440
      }
    },
    shadow: {
      softness: 1.3,
      tint: {
        hue: 285,
        amount: 0.5
      }
    },
    layout: {
      breakpoints: [
        0,
        480,
        768,
        1024,
        1440,
        1920
      ],
      containerMax: 1280
    },
    gradients: [
      {
        name: "brand",
        kind: "linear",
        angle: 135,
        stops: [
          {
            palette: "primary",
            step: 600,
            position: 0
          },
          {
            palette: "accent",
            step: 500,
            position: 1
          }
        ]
      },
      {
        name: "glow",
        kind: "radial",
        center: [
          0.5,
          0.4
        ],
        shape: "circle",
        stops: [
          {
            palette: "accent",
            step: 400,
            position: 0
          },
          {
            palette: "accent",
            step: 700,
            position: 1
          }
        ]
      }
    ]
  },
  harbor: {
    id: "harbor",
    root: "hds",
    primary: {
      l: 0.46,
      c: 0.08,
      h: 195
    },
    neutral: {
      hue: 65,
      chroma: 6e-3
    },
    surfaces: {
      light: {
        base: 50
      }
    },
    status: {
      success: {
        l: 0.52,
        c: 0.13,
        h: 150,
        chroma: 0.13
      },
      warning: {
        l: 0.7,
        c: 0.15,
        h: 70,
        chroma: 0.15
      },
      danger: {
        l: 0.52,
        c: 0.18,
        h: 27,
        chroma: 0.18
      }
    },
    density: "comfortable",
    radiusScale: 1,
    typography: {
      typeScale: "compact"
    },
    motionPersonality: {
      tempo: "relaxed"
    }
  }
};

// src/provenance.ts
var provenanceOf = (origin, input) => deepFreeze({ origin: structuredClone(origin), baseline: structuredClone(input) });
var deepFreeze = (v) => {
  if (v !== null && typeof v === "object" && !Object.isFrozen(v)) {
    Object.freeze(v);
    for (const k of Object.keys(v)) deepFreeze(v[k]);
  }
  return v;
};
var noOrigin = (input) => provenanceOf({ kind: "none" }, input);
var isDirty = (current, p) => canonical(current) !== canonical(p.baseline);
var canonical = (v) => JSON.stringify(sortKeys(v));
var sortKeys = (v) => {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v === null || typeof v !== "object") return v;
  const out = {};
  for (const k of Object.keys(v).sort()) {
    out[k] = sortKeys(v[k]);
  }
  return out;
};
var needsOverwriteConfirm = (current, p) => p.origin.kind !== "none" && isDirty(current, p);
var joinSeed = (read, recovered) => read.present ? { state: "present", recovered, contractOk: read.ok, detail: read.detail } : read.ok ? { state: "absent" } : { state: "error", message: read.detail };
var withRecovered = (o, recovered) => o.state === "present" && recovered && !o.recovered ? { ...o, recovered: true } : o;
var isUnrecoverable = (o) => o.state === "present" && !o.recovered;

// src/state/store.ts
var BRANDS = example_brands_default;
var BOOT_BRAND = "prism3";
var brandState;
var provenance;
var bootProvenance;
var theme;
var lastGoodInput;
var rp;
var currentMode;
var lastError = null;
var page = "palettes";
var firstRun = () => provenance.origin.kind === "none";
var subscribers = /* @__PURE__ */ new Map();
var invalidate = (topic) => {
  const set = subscribers.get(topic);
  if (set) for (const fn of [...set]) fn();
};
var persist = null;
var setPersist = (fn) => {
  persist = fn;
};
var initSession = (input, origin) => {
  brandState = input;
  provenance = provenanceOf(origin, brandState);
  bootProvenance = provenance;
  theme = brandTheme(brandState);
  lastGoodInput = structuredClone(brandState);
  rp = resolvePreview(theme);
  currentMode = rp.modes[0];
  lastError = null;
};
var rebuild = () => {
  try {
    const t = brandTheme(brandState);
    rp = resolvePreview(t);
    theme = t;
    lastGoodInput = structuredClone(brandState);
    lastError = null;
    persist?.(brandState);
  } catch (e) {
    lastError = e.message;
  }
  invalidate("brand");
};
var syncIdentity = () => {
  lastGoodInput.id = brandState.id;
  lastGoodInput.root = brandState.root;
  persist?.(lastGoodInput);
};
var ensureThemeFresh = () => {
  if (theme.root !== (brandState.root ?? "prism")) rebuild();
};
var loadInput = (input, origin) => {
  brandState = structuredClone(input);
  provenance = provenanceOf(origin, brandState);
  invalidate("origin");
  setPage("palettes");
  rebuild();
  setCurrentMode(rp.modes[0]);
};
var clearOrigin = () => {
  provenance = noOrigin(brandState);
  invalidate("origin");
};
var setCurrentMode = (m) => {
  currentMode = m;
  invalidate("mode");
};
var setPage = (k) => {
  page = k;
  invalidate("page");
};
var getPath2 = (o, p) => p.split(".").reduce((a, k) => a == null ? void 0 : a[k], o);
var setPath2 = (o, p, v) => {
  const ks = p.split(".");
  const last = ks.pop();
  let cur = o;
  for (const k of ks) {
    if (cur[k] == null || typeof cur[k] !== "object") cur[k] = {};
    cur = cur[k];
  }
  cur[last] = v;
};
var getModeLever = (mode, path) => {
  let node = brandState.modeLevers?.[mode];
  for (const p of path.split(".")) {
    if (node == null) return void 0;
    node = node[p];
  }
  return node;
};
var pruneModeLevers = (mode) => {
  const ml = brandState.modeLevers;
  if (!ml) return;
  const e = ml[mode];
  const dropEmpties = (o) => {
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (v && typeof v === "object" && !Array.isArray(v)) {
        dropEmpties(v);
        if (!Object.keys(v).length) delete o[k];
      }
    }
  };
  if (e) {
    dropEmpties(e);
    if (!Object.keys(e).length) delete ml[mode];
  }
  if (!Object.keys(ml).length) brandState.modeLevers = void 0;
};
var setModeLever = (mode, path, value) => {
  const ml = brandState.modeLevers ?? (brandState.modeLevers = {});
  const e = ml[mode] ?? (ml[mode] = {});
  const parts = path.split(".");
  const last = parts.pop();
  let node = e;
  for (const p of parts) node = node[p] ?? (node[p] = {});
  if (value !== void 0 && value !== "") node[last] = value;
  else delete node[last];
  pruneModeLevers(mode);
};

// ../../packages/engine/levers.ts
var enumOpts = (...pairs) => pairs.map(([value, label]) => ({ value, label }));
var leverManifest = [
  // ---- COLOR ----
  {
    key: "primary",
    group: "color",
    label: "Primary brand color",
    control: "color",
    required: true,
    description: "The exact brand anchor. Pinned, never shifted; the engine places it on the ramp by its lightness."
  },
  {
    key: "neutral.hue",
    group: "color",
    label: "Neutral hue",
    control: "slider",
    required: true,
    min: 0,
    max: 360,
    step: 1,
    unit: "\xB0",
    description: "Hue the grays lean toward (a small chroma tints them to the brand for cohesion)."
  },
  {
    key: "neutral.chroma",
    group: "color",
    label: "Neutral chroma",
    control: "slider",
    required: true,
    min: 0,
    max: 0.03,
    step: 1e-3,
    description: "Peak neutral chroma (~0.004\u20130.02); tapers to near-0 at the ramp ends. 0 = pure gray."
  },
  {
    key: "neutral.anchor",
    group: "color",
    label: "Pin a neutral",
    control: "color",
    advanced: true,
    description: "Optional. A pre-defined brand gray, pinned verbatim at its lightness step; the ramp is built around it (hue/chroma from the anchor) instead of the cast. Set for a client that ships their own neutral; omit to derive from hue + chroma."
  },
  {
    key: "brandColors",
    group: "color",
    label: "Additional brand colors",
    control: "list",
    itemLabel: "brand color (name + OKLCH)",
    description: "Secondary / tertiary / accents \u2014 any number; each becomes its own ramp and can drive actions."
  },
  {
    key: "actionPalette",
    group: "color",
    label: "Action palette",
    control: "palette-ref",
    default: "primary",
    description: "Which palette drives interactive/action color. Defaults to primary; point at an accent when the hero color is a poor CTA."
  },
  {
    key: "linkPalette",
    group: "color",
    label: "Link palette",
    control: "palette-ref",
    description: "Which palette drives link color. Defaults to following the action palette; point at primary, neutral, or an accent to give links their own color. The contrast floor holds either way. A link palette that is not color-distinct from body text (e.g. neutral) prompts a warning to underline links for WCAG 1.4.1 \u2014 pair it with an underlined link role."
  },
  {
    key: "status.success",
    group: "color",
    label: "Success color",
    control: "color",
    advanced: true,
    description: "Optional measured override; omit to let the engine synthesize from a canonical hue."
  },
  {
    key: "status.warning",
    group: "color",
    label: "Warning color",
    control: "color",
    advanced: true,
    description: "Optional measured override; omit to synthesize."
  },
  {
    key: "status.danger",
    group: "color",
    label: "Danger color",
    control: "color",
    advanced: true,
    description: "Optional measured override; omit to reuse the brand red (if red) or carve a dedicated one."
  },
  {
    key: "status.info",
    group: "color",
    label: "Info color",
    control: "color",
    advanced: true,
    description: "Optional measured override; omit to synthesize from the canonical blue hue."
  },
  {
    key: "surfaces",
    group: "color",
    label: "Page surfaces",
    control: "object",
    advanced: true,
    description: "Non-default page surface per mode (e.g. a warm off-white). The contrast floor moves with it."
  },
  {
    key: "strictInteractiveContrast",
    group: "color",
    label: "Strict interactive contrast",
    control: "toggle",
    advanced: true,
    default: false,
    description: "Opt-in (off by default). The inverse filled button steps its fill per state; the primary and destructive labels\u2019 colored ink clears AA at rest but dips on the transient hover/pressed steps. On swaps both inverse labels to the neutral high-contrast ink so every state clears AA \u2014 guaranteed legibility over brand color."
  },
  {
    key: "linkStateRungs",
    group: "color",
    label: "Link states",
    control: "object",
    advanced: true,
    description: "Optional. Set how far each engaged link state \u2014 hover, pressed, visited \u2014 steps from the resting link, one state at a time, as a count of ramp steps. An unset state keeps the tuned walk; the resting link and its focus follow the action palette. Each step is held to the link\u2019s contrast floor, so it respaces a state without dropping the link below 4.5:1."
  },
  // ---- FORM ----
  {
    key: "radiusScale",
    group: "form",
    label: "Corner softness",
    control: "slider",
    default: 1,
    min: 0,
    max: 2,
    step: 0.5,
    description: "0 = sharp, 1 = default, 2 = soft. Scales the radius ramp."
  },
  {
    key: "density",
    group: "form",
    label: "Density",
    control: "enum",
    default: "comfortable",
    options: enumOpts(["comfortable", "Comfortable"], ["compact", "Compact"], ["spacious", "Spacious"]),
    description: "Sets control heights, and moves each component\u2019s padding and gaps one step on the spacing scale. The name stays stable; the metrics shift. Spacing follows the brand\u2019s density, not the mode\u2019s: a mode\u2019s density changes control heights only."
  },
  {
    key: "controlShape",
    group: "form",
    label: "Control shape",
    control: "enum",
    default: "rounded",
    options: enumOpts(["boxed", "Boxed"], ["hairline", "Hairline"], ["rounded", "Rounded"], ["pill", "Pill"]),
    description: "Corner shape for pill-able controls like buttons. Boxed is sharp (0px); hairline is a fixed 1px edge; rounded follows corner softness; pill is a full height \xF7 2, whatever the softness."
  },
  // The button levers (#1667). Labels and option labels are the owner's exact words.
  {
    key: "buttonIcons",
    group: "form",
    label: "Button icons",
    control: "enum",
    default: "attached",
    options: enumOpts(["attached", "Attached to label"], ["edges", "Locked to edges"]),
    description: "Where button icons sit. Attached to label keeps them beside the label. Locked to edges pins them to the button edges and centers the label in the space between."
  },
  {
    key: "buttonContentSize",
    group: "form",
    label: "Button label & icon",
    control: "enum",
    default: "match",
    options: enumOpts(["match", "Match button size"], ["smaller", "One step smaller"]),
    description: "The label and icon size of a medium button. One step smaller gives it the small button\u2019s label and icon at the same height and padding. Small and large buttons are unchanged."
  },
  // #1752 — label and option labels are the owner's exact words (2026-09-28). Buttons only.
  {
    key: "buttonLabelWeight",
    group: "form",
    label: "Button label weight",
    control: "enum",
    default: "emphasis",
    options: enumOpts(["default", "Default"], ["emphasis", "Emphasis"]),
    description: "The weight role a button label binds: Emphasis (600 at the stock weight roles) or Default (400). Default adds that weight to the label styles. Tags and badges keep Emphasis."
  },
  {
    key: "buttonMinWidthMultiplier",
    group: "form",
    label: "Button minimum width",
    control: "slider",
    default: 2.25,
    min: 1,
    max: 4,
    step: 0.25,
    unit: "\xD7 height",
    description: "A button is at least its height times this wide, rounded up to the 8px grid, so a short label never makes a stubby button."
  },
  {
    key: "baseMd",
    group: "form",
    label: "Radius anchor",
    control: "slider",
    advanced: true,
    default: 4,
    min: 2,
    max: 12,
    step: 1,
    unit: "px",
    description: "The radius.md value (px) at scale 1."
  },
  {
    key: "radiusHairline",
    group: "form",
    label: "Hairline radius",
    control: "toggle",
    advanced: true,
    default: false,
    description: "Opt-in (off by default). On adds a fixed 1px radius.hairline for near-sharp brands \u2014 the scaled ramp only reaches even values, so this is the way to a 1px corner."
  },
  // ---- TYPE ----
  {
    key: "typography.typeScale",
    group: "type",
    label: "Type scale",
    control: "enum",
    default: "default",
    options: enumOpts(["compact", "Compact"], ["default", "Default"], ["expressive", "Expressive"]),
    description: "Shifts heading sizes (display, title and eyebrow) up/down the ladder; body/label/caption/code stay put."
  },
  {
    key: "typography.families",
    group: "type",
    label: "Font families",
    control: "object",
    description: "The face each text category draws from (+ a variable-font flag). A single name auto-pads a system fallback stack; `code: null` opts out of code styles."
  },
  {
    key: "typography.weightRoles",
    group: "type",
    label: "Weight roles \u2192 numeric",
    control: "object",
    advanced: true,
    description: "Map subtle/default/emphasis/strong/max to the brand\u2019s numeric weights (defaults 300/400/600/700/900)."
  },
  {
    key: "typography.displayCeiling",
    group: "type",
    label: "Display size ceiling",
    control: "enum",
    advanced: true,
    default: "3xl",
    options: enumOpts(
      ["sm", "display.sm (1 rung)"],
      ["md", "display.md (2 rungs)"],
      ["lg", "display.lg (3 rungs)"],
      ["xl", "display.xl (4 rungs)"],
      ["2xl", "display.2xl (5 rungs)"],
      ["3xl", "display.3xl (all 6)"]
    ),
    description: "Highest display rung the brand ships; rungs above it are omitted. Named by rung, not px, so the type scale preset cannot change how many rungs survive."
  },
  {
    key: "typography.titleFloor",
    group: "type",
    label: "Title floor",
    control: "enum",
    advanced: true,
    default: 18,
    options: enumOpts([18, "18px (title.xs)"], [16, "16px (adds title.2xs)"]),
    description: "Whether the title tier includes title.2xs \u2014 a 16px brand-font heading that overlaps body.md. Not available with the compact type scale, which already places a title at 16px."
  },
  {
    key: "typography.captionFloor",
    group: "type",
    label: "Caption floor",
    control: "enum",
    advanced: true,
    default: 11,
    options: enumOpts([11, "11px (caption.md)"], [10, "10px (adds caption.sm)"]),
    description: "Whether the caption tier includes caption.sm \u2014 a 10px fine-print rung (10 is already a step on the size ladder). Default floors caption at 11px; opt in for dense legal, footer or product-attribute fine print. Off by default, so no existing brand moves."
  },
  {
    key: "typography.sizeFloor",
    group: "type",
    label: "Type size floor",
    control: "enum",
    advanced: true,
    default: 10,
    options: enumOpts([10, "10px (default floor)"], [8, "8px (adds caption.xs \u2014 escape hatch)"]),
    description: "Opt-in sub-10px floor. 8 pushes the size ladder to an 8px floor and adds caption.xs. 8px sits below the size range the system contrast ratios were reasoned about, so the engine flags it in notes as a deliberate escape hatch \u2014 ship it only for genuine fine print that has an accessible alternative. Off by default, so no existing brand moves."
  },
  {
    key: "typography.responsive",
    group: "type",
    label: "Responsive type",
    control: "object",
    advanced: true,
    description: "Fluid heading sizing on/off + the min/max viewport pair driving clamp() and the Figma modes."
  },
  {
    key: "typography.weights",
    group: "type",
    label: "Per-role weight sets",
    control: "object",
    advanced: true,
    description: "Which weights each type role ships (weight is an axis on every role; adding one is additive). Every role keeps at least one. Label keeps emphasis, and body and caption keep default: the button and form controls use them."
  },
  {
    key: "typography.links",
    group: "type",
    label: "Underlined link roles",
    control: "list",
    advanced: true,
    itemLabel: "type role",
    description: "Which roles get an underlined .*-link variant. Default body + caption."
  },
  {
    key: "typography.italics",
    group: "type",
    label: "Italic roles",
    control: "list",
    advanced: true,
    itemLabel: "type role",
    description: "Which roles ship an .*-italic variant per weight (fontStyle:italic). Default none \u2014 italics are opt-in."
  },
  {
    key: "typography.italicDefault",
    group: "type",
    label: "Italic-default roles",
    control: "list",
    advanced: true,
    itemLabel: "type role",
    description: "Which roles set italic as their only cut: the bare styles are italic (fontStyle:italic; 500 \u2192 Medium Italic), with no upright variant. Default none. A role here cannot also be in Italic roles."
  },
  // ---- MOTION ----
  {
    key: "motionPersonality.tempo",
    group: "motion",
    label: "Motion tempo",
    control: "enum",
    default: "standard",
    options: enumOpts(["snappy", "Snappy"], ["standard", "Standard"], ["relaxed", "Relaxed"]),
    description: "Scales the duration ramp (snappy \xD70.8, standard \xD71.0, relaxed \xD71.3). Reduce-motion is derived."
  },
  // ---- ELEVATION ----
  {
    key: "shadow.softness",
    group: "elevation",
    label: "Shadow softness",
    control: "slider",
    default: 1,
    min: 0,
    max: 2,
    step: 0.1,
    description: "Blur:offset dial. Low \u2192 crisp/product; high \u2192 soft/marketing."
  },
  {
    key: "shadow.tint",
    group: "elevation",
    label: "Shadow tint",
    control: "object",
    advanced: true,
    description: "Hue-shift the shadow base off pure black (hue + amount). Defaults to a subtle neutral tint."
  },
  // ---- LAYOUT ----
  {
    key: "layout.breakpoints",
    group: "layout",
    label: "Breakpoints",
    control: "list",
    advanced: true,
    itemLabel: "min-width (px)",
    description: "Min-width floors (px), ascending. Names auto sm/md/lg/xl/2xl. Default [0,768,1024,1440,1920]."
  },
  {
    key: "layout.columns",
    group: "layout",
    label: "Grid columns",
    control: "slider",
    advanced: true,
    default: 12,
    min: 4,
    max: 24,
    step: 1,
    description: "Base column count for the design grid (16/24 for dense-data brands)."
  },
  {
    key: "layout.containerMax",
    group: "layout",
    label: "Container max",
    control: "slider",
    advanced: true,
    default: 1440,
    min: 960,
    max: 1920,
    step: 40,
    unit: "px",
    description: "Content max-width cap; layout is fluid below it."
  },
  {
    key: "layout.containerNarrow",
    group: "layout",
    label: "Content container",
    control: "slider",
    advanced: true,
    default: 720,
    min: 480,
    max: 960,
    step: 20,
    unit: "px",
    description: "The reading-measure content column (~65\u201375ch) \u2014 narrower than the full container."
  },
  // ---- ADVANCED (accessibility + opt-in) ----
  {
    key: "iconContrast",
    group: "advanced",
    label: "Icon contrast floor",
    control: "enum",
    default: "text",
    options: enumOpts(["text", "Match text (4.5:1)"], ["3:1", "Non-text floor (3:1)"]),
    description: "Whether icons mirror text contrast or run against the WCAG 1.4.11 non-text floor. Matching text is the default on purpose: icons usually sit beside text, and an icon that is lighter than the label next to it reads as a mistake even though 3:1 conforms. Choose the non-text floor when icons stand alone or you want them to recede."
  },
  {
    key: "disabledStrategy",
    group: "advanced",
    label: "Disabled contrast",
    control: "enum",
    default: "reduced",
    options: enumOpts(["full", "Full contrast (4.5:1 \u2014 AA text)"], ["reduced", "Reduced contrast (3:1 minimum)"]),
    description: "Full guarantees AA text on disabled controls \u2014 legibility is certain, but the disabled look then rests on fill / border / cursor rather than dimming. Reduced dims it to a floor you set, never below 3:1."
  },
  {
    key: "disabledMin",
    group: "advanced",
    label: "Reduced contrast floor",
    control: "slider",
    default: 3,
    min: 3,
    max: 4.5,
    step: 0.5,
    description: "How dim Reduced goes. 3:1 is the WCAG non-text / large-text threshold and where Primer and USWDS sit \u2014 the lowest ratio still legible. Escalates to 4.5:1 in high-contrast modes. Ignored on Full."
  },
  {
    key: "outlineInteraction",
    group: "advanced",
    label: "Outline hover",
    control: "enum",
    default: "overlay-neutral",
    options: enumOpts(["overlay-neutral", "Neutral overlay wash"], ["solid-tint", "Tinted wash"], ["none", "No hover fill"]),
    description: "How outline/text controls express hover/pressed/selected. Overlay = translucent neutral wash (composites over any surface); solid-tint = the control's own fill at 20% opacity (30% pressed), stepped down the opacity scale where the label needs more contrast and up where the hover would not show, so a destructive outline hovers red-tinted rather than gray; none = omit."
  },
  {
    key: "neutralEmphasis",
    group: "advanced",
    label: "Neutral emphasis",
    control: "enum",
    default: "subtle",
    options: enumOpts(["subtle", "Subtle (light gray)"], ["strong", "Strong (bold near-black/white)"]),
    description: "The neutral interactive fill boldness \u2014 subtle light gray (a surface) or a strong near-black/near-white fill."
  },
  {
    key: "interactivePalettes",
    group: "color",
    label: "Interactive palettes",
    control: "list",
    advanced: true,
    itemLabel: "accent column (name + palette [+ anchorStep])",
    description: "Promote declared palettes (a `brandColors` entry, or `primary`) to full interactive.<name>.* columns \u2014 fill/states, on-fill, text, border, overlay. The generalized accent lever; edit via the interactive cards. Supersedes the back-compat single-column `accentPalette` input."
  },
  {
    key: "gradients",
    group: "advanced",
    label: "Gradients",
    control: "toggle",
    default: false,
    description: "Opt-in (off by default). On ships one default brand gradient; an explicit array ships specific ones."
  }
];
for (const lever of leverManifest) {
  const stops = SLIDER_STOPS[lever.key];
  if (stops) lever.stops = stops;
}

// ../../packages/engine/design-md.ts
var unquote = (s) => {
  const t = s.trim();
  if (t.length >= 2 && (t[0] === '"' && t[t.length - 1] === '"' || t[0] === "'" && t[t.length - 1] === "'")) {
    return t.slice(1, -1);
  }
  return t;
};
var isQuoted = (s) => {
  const t = s.trim();
  return t.length >= 2 && (t[0] === '"' && t[t.length - 1] === '"' || t[0] === "'" && t[t.length - 1] === "'");
};
var typeScalar = (raw) => {
  const t = raw.trim();
  if (isQuoted(t)) return unquote(t);
  if (t === "" || t === "null" || t === "~") return null;
  if (t === "true") return true;
  if (t === "false") return false;
  if (/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(t)) return Number(t);
  return t;
};
var parseFlow = (src) => {
  let i = 0;
  const ws = () => {
    while (i < src.length && /\s/.test(src[i])) i++;
  };
  const scanBare = (stops) => {
    const start = i;
    let depth = 0, q = "";
    while (i < src.length) {
      const c = src[i];
      if (q) {
        if (c === q) q = "";
        i++;
        continue;
      }
      if (c === '"' || c === "'") {
        q = c;
        i++;
        continue;
      }
      if (c === "{" || c === "[") {
        depth++;
        i++;
        continue;
      }
      if (c === "}" || c === "]") {
        if (depth === 0) break;
        depth--;
        i++;
        continue;
      }
      if (depth === 0 && stops.includes(c)) break;
      i++;
    }
    return src.slice(start, i);
  };
  const value = () => {
    ws();
    if (src[i] === "{") return map();
    if (src[i] === "[") return seq();
    return typeScalar(scanBare(",}]"));
  };
  const map = () => {
    const o = {};
    i++;
    ws();
    if (src[i] === "}") {
      i++;
      return o;
    }
    while (i < src.length) {
      ws();
      const key = unquote(scanBare(":")).trim();
      i++;
      o[key] = value();
      ws();
      if (src[i] === ",") {
        i++;
        continue;
      }
      i++;
      break;
    }
    return o;
  };
  const seq = () => {
    const a = [];
    i++;
    ws();
    if (src[i] === "]") {
      i++;
      return a;
    }
    while (i < src.length) {
      a.push(value());
      ws();
      if (src[i] === ",") {
        i++;
        continue;
      }
      i++;
      break;
    }
    return a;
  };
  return value();
};
var parseScalarOrFlow = (s) => {
  const t = s.trim();
  return t[0] === "{" || t[0] === "[" ? parseFlow(t) : typeScalar(t);
};
var stripComment = (line) => {
  let q = "", depth = 0;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === q) q = "";
      continue;
    }
    if (c === '"' || c === "'") {
      q = c;
      continue;
    }
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") depth = Math.max(0, depth - 1);
    else if (c === "#" && depth === 0 && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
};
var colonSplit = (s) => {
  let q = "", depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === q) q = "";
      continue;
    }
    if (c === '"' || c === "'") {
      q = c;
      continue;
    } else if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") depth = Math.max(0, depth - 1);
    else if (c === ":" && depth === 0) return i;
  }
  return -1;
};
var parseBlock = (lines) => {
  let pos = 0;
  const block = (indent) => lines[pos].content.startsWith("- ") || lines[pos].content === "-" ? seq(indent) : map(indent);
  const map = (indent) => {
    const o = {};
    const seen = /* @__PURE__ */ new Set();
    while (pos < lines.length && lines[pos].indent === indent && !lines[pos].content.startsWith("- ")) {
      const line = lines[pos].content;
      const ci = colonSplit(line);
      if (ci < 0) break;
      const key = unquote(line.slice(0, ci)).trim();
      const rest = line.slice(ci + 1).trim();
      if (seen.has(key)) throw new Error(`design.md: duplicate key '${key}' at line ${lines[pos].src ?? "?"} \u2014 a repeated key silently overwrites the earlier one; remove one.`);
      seen.add(key);
      pos++;
      if (rest !== "") {
        o[key] = parseScalarOrFlow(rest);
        continue;
      }
      const next = lines[pos];
      const nextIsSeq = next && (next.content.startsWith("- ") || next.content === "-");
      if (next && (next.indent > indent || nextIsSeq && next.indent === indent)) o[key] = block(next.indent);
      else o[key] = null;
    }
    return o;
  };
  const seq = (indent) => {
    const a = [];
    while (pos < lines.length && lines[pos].indent === indent && (lines[pos].content.startsWith("- ") || lines[pos].content === "-")) {
      const after = lines[pos].content === "-" ? "" : lines[pos].content.slice(2);
      if (after !== "" && colonSplit(after) >= 0) {
        const virtual = indent + 2;
        lines[pos] = { indent: virtual, content: after, src: lines[pos].src };
        a.push(map(virtual));
      } else if (after === "") {
        pos++;
        const next = lines[pos];
        if (next && next.indent > indent) a.push(block(next.indent));
        else a.push(null);
      } else {
        a.push(parseScalarOrFlow(after));
        pos++;
      }
    }
    return a;
  };
  const result = map(lines.length ? lines[0].indent : 0);
  if (pos < lines.length) {
    const bad = lines[pos];
    throw new Error(`design.md: unparseable frontmatter at line ${bad.src ?? "?"} \u2014 "${bad.content}" (indent ${bad.indent}). This line's indentation doesn't fit its block, which would otherwise silently drop it and every line after it. Fix the indentation / structure.`);
  }
  return result;
};
var parseYamlSubset = (src) => {
  const lines = [];
  const rawLines = src.split("\n");
  for (let i = 0; i < rawLines.length; i++) {
    const stripped = stripComment(rawLines[i]);
    if (stripped.trim() === "") continue;
    const indent = stripped.length - stripped.trimStart().length;
    lines.push({ indent, content: stripped.slice(indent).trimEnd(), src: i + 1 });
  }
  return lines.length ? parseBlock(lines) : {};
};
var parseDesignMd = (text) => {
  const nl = text.indexOf("\n");
  const firstLine = (nl < 0 ? text : text.slice(0, nl)).trim();
  if (firstLine !== "---") {
    throw new Error("design.md must open with a '---' YAML frontmatter fence on the first line");
  }
  const restLines = text.slice(nl + 1).split("\n");
  const closeIdx = restLines.findIndex((l) => l.trim() === "---");
  if (closeIdx < 0) throw new Error("design.md frontmatter is not closed with a '---' line");
  const fm = restLines.slice(0, closeIdx).join("\n");
  const prose = restLines.slice(closeIdx + 1).join("\n").trim();
  return { input: parseYamlSubset(fm), prose };
};
var bareOk = (s) => s.length > 0 && s.trim() === s && !/[,{}[\]:#"']/.test(s) && !/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s) && !["true", "false", "null", "~"].includes(s);
var serScalar = (v) => {
  if (v === null) return "null";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  const s = String(v);
  return bareOk(s) ? s : `"${s.replace(/"/g, '\\"')}"`;
};
var serValue = (v) => {
  if (Array.isArray(v)) return `[${v.map(serValue).join(", ")}]`;
  if (v && typeof v === "object") {
    const body = Object.entries(v).filter(([, x]) => x !== void 0).map(([k, x]) => `${bareOk(k) ? k : `"${k}"`}: ${serValue(x)}`).join(", ");
    return `{ ${body} }`;
  }
  return serScalar(v);
};
var toDesignMd = (input, prose = "") => {
  const fm = Object.entries(input).filter(([, v]) => v !== void 0).map(([k, v]) => `${k}: ${serValue(v)}`);
  const body = prose.trim();
  return `---
${fm.join("\n")}
---
${body ? `
${body}
` : ""}`;
};

// ../../packages/engine/classify-colors.ts
var round2 = (n, dp = 4) => Number(n.toFixed(dp));
var oklchOf = (hex2) => {
  const o = rgbToOklch(hexToRgb(hex2));
  return { l: round2(o.l), c: round2(o.c), h: round2(o.h, 2) };
};
var baseRampFor = (role, token) => {
  switch (role) {
    case "primary":
      return "primary";
    case "secondary":
      return "secondary";
    case "tertiary":
      return "tertiary";
    case "neutral":
    case "white":
    case "black":
      return "neutral";
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "error":
      return "danger";
    // engine calls it danger
    case "info":
      return "info";
    case "variant": {
      const base = token.split("-")[0];
      return ["primary", "secondary", "tertiary", "neutral"].includes(base) ? base : null;
    }
    default:
      return null;
  }
};
var roleOf = (token) => {
  const t = token.toLowerCase();
  if (t === "primary") return "primary";
  if (t === "secondary") return "secondary";
  if (t === "tertiary") return "tertiary";
  if (t === "white") return "white";
  if (t === "black") return "black";
  if (t === "neutral" || /^neutral-/.test(t)) return "neutral";
  if (t === "success") return "success";
  if (t === "warning") return "warning";
  if (t === "error") return "error";
  if (t === "info") return "info";
  if (/^(primary|secondary|tertiary)-/.test(t)) return "variant";
  return "unknown";
};
var classifyColors = (colors) => {
  const log = [];
  const provided = [];
  for (const [token, hex2] of Object.entries(colors)) {
    const role = roleOf(token);
    const rgb = hexToRgb(hex2);
    provided.push({ token, hex: hex2, rgb, oklch: rgbToOklch(rgb), role, baseRamp: baseRampFor(role, token), usedAsAnchor: false });
  }
  const mark = (token) => {
    const p = provided.find((x) => x.token === token);
    if (p) p.usedAsAnchor = true;
  };
  const lc = {};
  const origKey = {};
  for (const [token, hex2] of Object.entries(colors)) {
    const k = token.toLowerCase();
    lc[k] = hex2;
    origKey[k] = token;
  }
  if (!lc.primary) throw new Error("classify-colors: no 'primary' color in the map \u2014 cannot anchor the brand palette");
  const primary = oklchOf(lc.primary);
  mark(origKey.primary);
  log.push({ token: origKey.primary, decision: `\u2192 brand anchor (pinned) oklch(${primary.l} ${primary.c} ${primary.h})` });
  const brandColors = [];
  for (const name of ["secondary", "tertiary"]) {
    if (lc[name]) {
      const o = oklchOf(lc[name]);
      brandColors.push({ name, oklch: o });
      mark(origKey[name]);
      log.push({ token: origKey[name], decision: `\u2192 brandColors[] '${name}' (pinned) oklch(${o.l} ${o.c} ${o.h})` });
    }
  }
  const neutrals = provided.filter((p) => p.role === "neutral");
  let neutral;
  if (neutrals.length) {
    const sumC = neutrals.reduce((s, p) => s + p.oklch.c, 0);
    let x = 0, y = 0;
    for (const p of neutrals) {
      const r = p.oklch.h * Math.PI / 180;
      x += p.oklch.c * Math.cos(r);
      y += p.oklch.c * Math.sin(r);
    }
    const hue = sumC > 1e-6 ? round2((Math.atan2(y, x) * 180 / Math.PI + 360) % 360, 2) : 0;
    const chroma = round2(sumC / neutrals.length);
    neutral = { hue, chroma };
    neutrals.forEach((p) => mark(p.token));
    log.push({ token: `neutral-* (${neutrals.length})`, decision: `\u2192 neutral { hue ${hue}, chroma ${chroma} } (chroma-weighted hue, mean chroma over ${neutrals.length} swatches)` });
  } else {
    neutral = { hue: primary.h, chroma: 5e-3, auto: true };
    log.push({ token: "neutral", decision: `\u2192 none provided; auto-follows the brand primary { hue ${neutral.hue}, chroma ${neutral.chroma} }` });
  }
  const status = {};
  const statusMap = [["success", "success"], ["warning", "warning"], ["error", "danger"]];
  for (const [token, key] of statusMap) {
    if (lc[token]) {
      const o = oklchOf(lc[token]);
      status[key] = { l: o.l, c: o.c, h: o.h, chroma: o.c };
      mark(origKey[token]);
      const rename = token === "error" ? " [RENAME error\u2192danger]" : "";
      log.push({ token: origKey[token], decision: `\u2192 status.${key}${rename} hue ${o.h}, chroma ${o.c} (lightness placed by the status ramp, not pinned)` });
    }
  }
  for (const p of provided.filter((x) => !x.usedAsAnchor)) {
    const why = p.role === "info" ? "info is engine-SYNTHESIZED (not an anchor); kept for the fidelity diff" : p.role === "white" || p.role === "black" ? `${p.role} is a primitive; kept for the fidelity diff` : p.role === "variant" ? `state/scale variant of '${p.baseRamp}'; engine regenerates the ramp \u2014 kept for the fidelity diff` : "unrecognized token; kept for the fidelity diff";
    log.push({ token: p.token, decision: `\xB7 report-only \u2014 ${why}` });
  }
  return { input: { primary, neutral, brandColors, status }, provided, log };
};

// ../../packages/engine/standard-design-md.ts
var splitFrontmatter = (text) => {
  const nl = text.indexOf("\n");
  const firstLine = (nl < 0 ? text : text.slice(0, nl)).trim();
  if (firstLine !== "---") {
    throw new Error("standard design.md must open with a '---' YAML frontmatter fence on the first line");
  }
  const rest = text.slice(nl + 1);
  const close = rest.indexOf("\n---");
  if (close < 0) throw new Error("standard design.md frontmatter is not closed with a '---' line");
  const fm = rest.slice(0, close);
  const afterFence = rest.slice(close + 4);
  const proseStart = afterFence.indexOf("\n");
  const prose = (proseStart < 0 ? "" : afterFence.slice(proseStart + 1)).trim();
  return { fm, prose };
};
var asRecord = (v) => v && typeof v === "object" && !Array.isArray(v) ? v : {};
var parseStandardDesignMd = (text) => {
  const { fm, prose } = splitFrontmatter(text);
  const raw = parseYamlSubset(fm);
  const colorsRaw = asRecord(raw.colors);
  const colors = {};
  for (const [k, v] of Object.entries(colorsRaw)) {
    if (v == null || v === "")
      throw new Error(`color '${k}' has no value \u2014 a bare '#hex' is read as a comment; quote it, e.g. ${k}: "#3366ff"`);
    colors[k] = String(v);
  }
  return {
    name: raw.name != null ? String(raw.name) : "brand",
    version: raw.version != null ? String(raw.version) : void 0,
    colors,
    typography: asRecord(raw.typography),
    rounded: asRecord(raw.rounded),
    spacing: asRecord(raw.spacing),
    elevation: asRecord(raw.elevation),
    xPrism3: asRecord(raw["x-prism3"]),
    prose
  };
};
var isStandardDesignMd = (std) => Object.keys(std.colors).length > 0;
var idFromName = (name) => name.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "brand";
var deriveFamilies2 = (typography) => {
  const firstFamilyFor = (pred) => {
    for (const [name, tok] of Object.entries(typography)) if (pred(name.toLowerCase()) && tok.fontFamily) return tok.fontFamily;
    return void 0;
  };
  const text = firstFamilyFor((n) => /^(body|caption|paragraph)/.test(n));
  const heading = firstFamilyFor((n) => /^(mega|display|title|button|label|eyebrow)/.test(n)) ?? text;
  const out = {};
  for (const g of ["display", "title", "label", "eyebrow"]) if (heading) out[g] = heading;
  for (const g of ["body", "caption"]) if (text) out[g] = text;
  return out;
};
var applyXPrism3 = (input, x) => {
  const applied = [];
  if (x.radiusScale != null) {
    const rs = resolveStop("radiusScale", x.radiusScale);
    if (!Number.isFinite(rs)) throw new Error(`x-prism3.radiusScale must be a finite number or a named stop, got ${JSON.stringify(x.radiusScale)}`);
    input.radiusScale = rs;
    applied.push(`radiusScale=${rs}`);
  }
  if (x.personality != null) {
    input.personality = x.personality;
    applied.push(`personality=[${Array.isArray(x.personality) ? x.personality.join(", ") : String(x.personality)}]`);
  }
  if (x.root != null) {
    input.root = String(x.root);
    applied.push(`root=${x.root}`);
  }
  if (x.typeScale != null) {
    input.typography = { ...input.typography, typeScale: x.typeScale };
    applied.push(`typeScale=${x.typeScale}`);
  }
  if (x.density != null) {
    input.density = x.density;
    applied.push(`density=${x.density}`);
  }
  if (x.motionTempo != null) {
    input.motionPersonality = { tempo: x.motionTempo };
    applied.push(`motionTempo=${x.motionTempo}`);
  }
  if (x.actionPalette != null) {
    input.actionPalette = String(x.actionPalette);
    applied.push(`actionPalette=${x.actionPalette}`);
  }
  if (x.iconContrast != null) {
    input.iconContrast = x.iconContrast;
    applied.push(`iconContrast=${x.iconContrast}`);
  }
  if (x.surfaces != null) {
    input.surfaces = x.surfaces;
    applied.push("surfaces");
  }
  if (x.gradients != null) {
    input.gradients = x.gradients;
    applied.push("gradients");
  }
  return applied;
};
var standardToBrandInput = (std, id) => {
  const classification = classifyColors(std.colors);
  const input = {
    id: id ?? idFromName(std.name),
    primary: classification.input.primary,
    neutral: classification.input.neutral,
    brandColors: classification.input.brandColors,
    status: classification.input.status,
    typography: { families: deriveFamilies2(std.typography) }
    // typeScale via x-prism3 or engine default
  };
  const xApplied = Object.keys(std.xPrism3).length ? applyXPrism3(input, std.xPrism3) : [];
  return { input, classification, xApplied };
};

// ../../packages/engine/inverse-roles.ts
var isInverseRole = (k) => k === "inverse" || k.startsWith("inverse.");

// ../../packages/engine/button-spacing.ts
var BUTTON_SPACING = {
  "size.small.padding-x": "space.200",
  "size.small.padding-x-visual": "space.150",
  "size.small.padding-y": "space.075",
  "size.small.gap": "space.100",
  "size.medium.padding-x": "space.200",
  "size.medium.padding-x-visual": "space.150",
  "size.medium.padding-y": "space.100",
  "size.medium.gap": "space.100",
  "size.large.padding-x": "space.300",
  "size.large.padding-x-visual": "space.200",
  "size.large.padding-y": "space.100",
  "size.large.gap": "space.150"
};

// ../../packages/engine/components/button.ts
var BUTTON_SPACING_AT = Object.fromEntries(["small", "medium", "large"].map((sz) => [sz, Object.fromEntries(Object.entries(BUTTON_SPACING).filter(([k]) => k.startsWith(`size.${sz}.`)))]));
var intentTokens = (family) => ({
  // filled — interactive fill + on-fill ink
  "filled.fill": `color.interactive.${family}.fill.rest`,
  "filled.fill.hover": `color.interactive.${family}.fill.hover`,
  "filled.fill.pressed": `color.interactive.${family}.fill.pressed`,
  "filled.label": `color.interactive.${family}.on-fill`,
  "filled.icon": `color.interactive.${family}.on-fill`,
  // outline — the EDGE carries state (#576), so all three rather than letting hover/pressed fall to rest
  "outline.border": `color.interactive.${family}.border.rest`,
  "outline.border.hover": `color.interactive.${family}.border.hover`,
  "outline.border.pressed": `color.interactive.${family}.border.pressed`,
  // THE INK CARRIES STATE TOO (#1282), and this is the half #576 left behind. That change made the
  // outline EDGE stateful and bound all three of its steps above; the label and icon stayed pinned to
  // `.rest`, so an outline button's border moved on hover and pressed while the text it surrounds did
  // not. The roles were already there — `iText` has emitted `text.{rest,hover,pressed}` since #576,
  // and `iBorder` consumes those very candidates, so the border was tracking an ink the component
  // then declined to bind. Nothing was missing from the token tier; three keys were missing here.
  //
  // Same rung delta as the border by construction rather than by agreement: both resolve
  // `color.interactive.<family>.{text,border}.<state>`, and `border` IS `text` passed by value
  // (`iBorder`). So "the edge matches its label" now holds at every state, which is what #576 said it
  // was for and could only deliver at rest.
  "outline.label": `color.interactive.${family}.text.rest`,
  "outline.label.hover": `color.interactive.${family}.text.hover`,
  "outline.label.pressed": `color.interactive.${family}.text.pressed`,
  // #1471 — the GLYPH binds the dedicated `icon.*` role, not `text.*`. Value-identical (the engine mints
  // `interactive.<family>.icon.{rest,hover,pressed}` as a value twin of `text.*`), so this is a semantic
  // rebinding with NO color change: an outline button's icon is an icon, and now says so. The label keeps
  // `text.*` (it IS text). Both button and icon-button move together.
  "outline.icon": `color.interactive.${family}.icon.rest`,
  "outline.icon.hover": `color.interactive.${family}.icon.hover`,
  "outline.icon.pressed": `color.interactive.${family}.icon.pressed`,
  "outline.overlay.hover": `color.interactive.${family}.overlay.hover`,
  "outline.overlay.pressed": `color.interactive.${family}.overlay.pressed`,
  // text — ink + the translucent overlay wash (#536 item 1: both overlay states keyed, or a pressed
  // ghost button falls back to rest and projects byte-identical to it).
  //
  // THE INK CARRIES STATE, exactly as `outline` above (#1351 part 1). The earlier reading here was that
  // `text` needed no per-state ink because — unlike `outline` — it draws no border for the ink to fall
  // out of step with. That reasoning missed the ground the ink actually sits on: the overlay wash is a
  // translucent WHITE layer on the inverse band, so on hover/pressed it LIGHTENS the ground beneath a
  // pinned `text.rest` ink and the composited contrast collapses — measured over the real inverse
  // backdrop `#0D0D0E`, button `text` fell rest 4.87 → hover 3.81 → pressed 2.70 (both AA fails), and
  // button-destructive the same shape. `outline` never showed it because #1282 had already made its ink
  // step; `text` is the half that treatment left behind. So the ink now walks `text.{rest,hover,pressed}`
  // like `outline`'s label/icon — the same roles `iText` has emitted since #576, resolved once and shared
  // — and the overlay wash stays the separate mechanism it always was, keyed at both states below. On the
  // default (page) surface the roles resolve to the page ink and the step is contrast-safe by
  // construction; the projector's `color.* → color.inverse.*` rewrite gives the inverse band its own
  // stepped ink, which is where the failure lived. Neutral's ink is `walkable: false`, so its three
  // states collapse onto rest exactly as `outline` neutral does — no change to a neutral text button.
  // (Part 2 — the `filled` inverse-primary `on-fill` holding constant while the fill darkens — is a
  // separate, design-carrying fix (#1351 part 2) and is deliberately NOT touched here.)
  "text.label": `color.interactive.${family}.text.rest`,
  "text.label.hover": `color.interactive.${family}.text.hover`,
  "text.label.pressed": `color.interactive.${family}.text.pressed`,
  // #1471 — the GLYPH binds `icon.*` (value-identical to `text.*`); the label keeps `text.*`. See the
  // `outline.icon` note above — a name/semantic move, no color change.
  "text.icon": `color.interactive.${family}.icon.rest`,
  "text.icon.hover": `color.interactive.${family}.icon.hover`,
  "text.icon.pressed": `color.interactive.${family}.icon.pressed`,
  "text.overlay.hover": `color.interactive.${family}.overlay.hover`,
  "text.overlay.pressed": `color.interactive.${family}.overlay.pressed`
});
var makeButton = (id, name, summary, description, family, sibling) => ({
  id,
  name,
  aliases: ["btn", "cta"],
  category: "form",
  status: "draft",
  description,
  summary,
  props: [
    // #1242 — `label`, not `children`. The property NAME is what a designer reads in Figma's
    // properties panel (`figmaProperties.texts` keys against `props` by name, so the two move
    // together — see `component-schema.ts` `figmaPropertyErrors`), and `children` is a React-ism
    // that means nothing to a designer. The React `children` idiom is a code-side wrapper concern;
    // the def's declared API names the slot for what it IS — the label. LOWERCASE per #1333: every
    // Figma TEXT property name is lowercase, matching the already-lowercase swap and variant names.
    // #1697 — the description said the label was "not required for the icon-only case" beside
    // `required: true`. The icon-only case is a different component (icon-button), so on THIS def the
    // label is always required, and the prose now says so rather than contradicting the flag beside it.
    { name: "label", type: "node (label)", required: true, description: "Visible label; verb-first, sentence case, \u22643 words. Always required here \u2014 an icon-only control is the separate icon-button, which requires an accessible name instead." },
    { name: "onClick", type: "function", required: false, description: "Action handler. Suppressed while isPending or isInactive." },
    // #1223 — no `intent` prop. Intent is now the COMPONENT (Button = primary; Destructive Button;
    // Neutral Button), not a prop on one component. EMPHASIS IS STILL THE APPEARANCE AXIS: a form with
    // three actions is typically three of the SAME component at filled / outline / text, not three colors.
    { name: "appearance", type: "enum: 'filled' | 'outline' | 'text'", values: ["filled", "outline", "text"], default: "filled", required: false, description: "Visual treatment over the color, decoupled from intent so the matrix scales by addition. filled = interactive fill + on-fill ink; outline = border + text ink; text = ink only. (Reconciled from solid/outline/plain.)" },
    { name: "size", type: "enum: 'small' | 'medium' | 'large'", values: ["small", "medium", "large"], default: "medium", required: false, description: "Control size \u2014 drives height, padding, and label type." },
    { name: "surface", type: "enum: 'default' | 'inverse'", values: ["default", "inverse"], default: "default", required: false, description: "The ground the button sits on. `default` for a normal page; `inverse` for a dark or brand-filled band, where the button binds its `color.inverse.*` counterparts so fill, ink, border, overlay and the disabled treatment keep contrast against the flipped surface. A host that cannot know its ground picks `default`, and the designer sets `inverse` on the instance \u2014 the same answer the nested focus ring gives." },
    { name: "fullWidth", type: "boolean", default: false, required: false, description: "Stretch to container. Aliases: block / isFullWidth." },
    { name: "type", type: "enum: 'button' | 'submit' | 'reset'", values: ["button", "submit", "reset"], default: "button", required: false, description: "Opinionated default 'button' to neutralize the platform's submit-on-enter-in-form trap; require 'submit' explicitly." },
    { name: "isPending", type: "boolean", default: false, required: false, description: "Delays the spinner, preserves width, keeps focus (aria-disabled, not native disabled), suppresses re-fire, announces busy. Preferred over `loading`." },
    { name: "isInactive", type: "boolean", default: false, required: false, description: "Focusable disabled \u2014 visually muted, retains tab order, surfaces the blockage reason on focus. Use for a control blocked by satisfiable app state (e.g. submit on an incomplete form)." },
    { name: "disabled", type: "boolean", default: false, required: false, description: "Native disabled. Reserved for controls fundamentally irrelevant to the current view; removes from tab order + a11y tree. Prefer isInactive for anything relevant-but-blocked." },
    { name: "leadingVisual", type: "slot", required: false, description: "Icon / avatar / counter / spinner before the label." },
    { name: "trailingVisual", type: "slot", required: false, description: "Icon / caret / indicator after the label." },
    { name: "href", type: "string", required: false, description: "Discouraged \u2014 prefer link-button. If set, the button renders an <a>, which drops type and disabled semantics." },
    // #1697 — the old description ("only needed when there is no visible label") assumed a case this def
    // cannot reach: `label` is required, so every Button has visible text. What `aria-label` does here is
    // EXTEND that text, and 2.5.3 is the constraint on how.
    { name: "aria-label", type: "string", required: false, description: 'Extends the visible label with context it does not carry ("Delete invoice 1042" on a "Delete" button). Start it with the visible text, so a voice-control user who speaks the label still activates the control (WCAG 2.5.3 Label in Name).' }
  ],
  states: ["rest", "hover", "focus-visible", "pressed", "pending", "inactive", "disabled"],
  variants: {
    // #1223 — `intent` is gone as an axis; it is the component identity now. `appearance` carries
    // emphasis, `surface` the ground, `size` the rung, `width` a drag (not projected).
    appearance: ["filled", "outline", "text"],
    size: ["small", "medium", "large"],
    width: ["auto", "full"],
    // THE INVERSE GROUND (#1134), and the bindings for it are NOT in `tokens` below — that is the whole
    // mechanism, not an omission. An inverse control binds every role's inverse counterpart, which
    // docs/20 §9.9 defines as `color.inverse.` + the role. Expressed as authored keys they would collide
    // with this def's own grammar by arity: `filled.fill.inverse` fills the `{state}` segment with
    // `inverse` (not a state), and a cross-cutting `inverse.disabled.fill` names no slot the projector
    // dispatches — both rejected by `paintKeyErrors`. So the whole inverse half is unauthorable here and
    // is applied by the projector instead — `anatomy-figma.ts` rewrites each resolved `color.*` ref to its
    // `color.inverse.*` counterpart at any coordinate where `surface=inverse`. This def declares the axis;
    // the transform supplies the values. (The intent-family segment the grammar once led with is gone with
    // #1223 — intent is the component now — so the collision is one arity shorter but the conclusion holds.)
    surface: ["default", "inverse"]
  },
  // WHEN each axis changes (#1611): runtime axes are held to one footprint, authoring axes are not.
  // appearance stays RUNTIME, the strict default: a toggle button that fills when selected is the owner's
  // bold-when-selected shape (#1611), so an outline member must keep its filled sibling's box.
  axisKinds: { appearance: "runtime", size: "authoring", width: "authoring", surface: "authoring" },
  // NO `modifiers` AXIS (#845), and its three values were three different things, which is the whole
  // defect: an axis's values are mutually exclusive coordinates along ONE dimension, and a button can
  // carry a leading visual AND a trailing visual simultaneously while `pending` is a coordinate on the
  // state axis entirely. It was a bag of unrelated booleans wearing an axis's clothing, and this def's
  // own `codeOnly` said so before the axis was removed.
  //
  // NOTHING IS LOST, because each of the three already lives somewhere that models it correctly, and
  // that is what made this a removal rather than a migration:
  //   leading-visual / trailing-visual → `figmaProperties.slotAxes`, which projects them as the two
  //     presence axes they are (`leading=` / `trailing=`) — declared, and the reason that surface is 648
  //     rather than 162. Presence had to be an AXIS rather than a Figma BOOLEAN because #326's slot-aware
  //     inset changes the CONTAINER's padding, which a boolean's single-node `visible` cannot reach.
  //   pending → `states`, and the projected `stateAxis`.
  // So removing the axis is projection-neutral: measured, `figmaAnatomySet` returns 648 members before
  // and after. What it DOES change is the paint census GRID, 1134 → 378 coordinates (4374 → 1458
  // assignments), which is `lint-paint.ts` arm 2's baseline shrinking to stop enumerating a phantom
  // dimension three times over.
  //
  // ONE HAZARD, and it is the reason this removal is not a one-line delete. The deleted `codeOnly` entry
  // was the ONLY place in this def's prose naming `pending` — and `figmaPropertyErrors`'s `admits()` is
  // what licenses omitting a state from the projected axis. Measured before removing it: with the entry
  // gone and nothing replacing it, dropping `pending` from `stateAxis` is still refused (`pending` IS on
  // the axis, so nothing needs admitting) — but `test.ts` asserts that dropping it FAILS *"even though
  // codeOnly MENTIONS it"*, and that assertion was written about this exact entry. The mention had to be
  // preserved somewhere that is not a leading admission, which is what the `slotAxes` comment below now
  // does. Deleting prose a gate reads is the same class of change as deleting the gate.
  // Full color × appearance × size skin, bound to the interactive.* family + cross-cutting
  // disabled.*. Every color now carries the SAME shape (fill+states / on-fill / border / text
  // / overlay), so the matrix is uniform — no per-color gaps. State-qualified slots carry a
  // dotted state suffix. accent is omitted from the base matrix (brand-conditional — it exists
  // only when the brand declares an accent palette). Keys structure the matrix; generators read them.
  // HOW THOSE PAINT KEYS ARE SPELLED (#758). This is the grammar `paintOf` used to have hardcoded, so
  // the two templates below are a transcription of existing behavior rather than a new decision —
  // which is why the 648-member paint is byte-identical across that change by construction.
  //
  // The state-qualified template LEADS, and the order is the fallback: `filled.fill.hover` wins where
  // it exists, and a state that does not restyle a part falls through to the rest key (a `pending`
  // button's fill is its rest fill). Reverse these two and every state paints its rest color — silently
  // identical to their rest sibling, which is #536 item 1's shape.
  //
  // #1223 dropped the leading `{intent}` segment: intent is the component now, so the family is fixed
  // per def (supplied by `intentTokens(family)` above) and no longer a coordinate the key carries.
  //
  // `disabled.*` is deliberately NOT a template here: it switches token family rather than qualifying
  // a key, and it is conditional on the appearance having that structure at rest. That is behavior,
  // and it stays in the projector where it can be expressed.
  paintKeys: ["{appearance}.{slot}.{state}", "{appearance}.{slot}"],
  // The spacing this spec states at comfortable, which density moves one step along the space ladder.
  densitySpacing: ["size.{size}.padding-x", "size.{size}.padding-x-visual", "size.{size}.padding-y", "size.{size}.gap"],
  tokens: {
    // base (variant-independent)
    "radius": "radius.md",
    // THE OUTLINE BORDER'S THICKNESS (#1278). The WIDTH does not move — Prism 2 draws its outline
    // buttons at 1px and that is owner-confirmed — so this binds the token that already resolves to 1
    // rather than choosing a new figure. What moves is PROVENANCE: the 1 was the executors' literal
    // (`if (!node.strokeWeight) … = 1`), the right number with nothing behind it, and a brand re-runging
    // its border floor changed every other bordered part while the button stayed at Figma's fallback.
    //
    // `border-width.hairline` is 1px in all four corpus brands, aliased to `<root>.core.dimension.1`,
    // and its own `$description` calls it the *default border floor* — which is what a button's edge is.
    // No token is added, so `CONTRACT_VERSION` does not move; #1228 bound the three selection controls to
    // `border-width.thick` by the identical mechanism, and the two figures staying DIFFERENT is the point
    // rather than an inconsistency: 2px is a control weight, 1px is a button's, and both defs now agree
    // with the reference through a token instead of one through a token and one through a fallback.
    //
    // BOUND ON THE SHARED CONTAINER, so it is carried at `filled` and `text` too, where no border paints.
    // That is #1228's own shape one def along — checkbox at `checked` and switch at `on` bind a thickness
    // and paint nothing — and it is precisely the coordinate `claimDefaults`' gate exists for: the literal
    // would otherwise run AFTER the bind loop and UNBIND what Figma just accepted, reporting no miss.
    "border-width": "border-width.hairline",
    "focus-ring": "color.border.focus",
    "ring-width": "focus.ring.width",
    "ring-offset": "focus.ring.offset",
    // per-size geometry + label type. The height is the shared `size.*` rung; the spacing is this spec's
    // own, as `space.*` steps at COMFORTABLE density (the spacing model, 2026-09-29), and density moves each
    // one step along the space ladder (`densitySpacing` below). The horizontal model, left edge inward:
    // [padding-x-visual][icon][gap][label][padding-x]. Three values, one ordering:
    //
    //     gap  <  padding-x-visual  <  padding-x
    //
    //   · `gap` (#325) is tightest — PROXIMITY. The icon and label must sit closer to each other than to the
    //     button's edge, or they read as two things sharing a box.
    //   · `padding-x-visual` (#326) sits between — an icon's own bounding box already adds apparent space,
    //     so equal numeric padding reads as TOO MUCH on the icon side. Material 3 (`leading-space` 24 vs
    //     `with-leading-icon-leading-space` 16), Spectrum (`edge-to-text` vs `edge-to-visual`) and Carbon
    //     converge on it.
    //   · `padding-x` is loosest — plain text carries no bounding-box bonus.
    //
    // The ordering is the contract, asserted over every def at every density after the step rule
    // (`test.ts`, "spacing ordering"). The steps are the ones the shared scale used to derive
    // (gap = half of padding-x, the icon side two-thirds snapped to the scale), kept pixel-identical at
    // comfortable: small 16/12/8, medium 16/12/8, large 24/16/12, with 6/8/8 block padding. The steps live in
    // `button-spacing.ts` (data only, so the studio can read them without importing a def).
    //
    // `icon` — THE ONE-RUNG OFFSET (#1350, OWNER-DECIDED 2026-09-08). The control rung binds a glyph
    // artboard ONE RUNG BELOW its own rung: small→xs (16), medium→sm (20), large→md (24). This is
    // deliberately NOT #324's 1:1 identity any more, and the reversal is scoped to the TEXT-BEARING
    // button family (button / -destructive / -neutral) alone. #324/#756 built the identity so that a
    // control's icon matched a standalone `<Icon>` at the same size — a medium button's icon and a
    // standalone medium icon both 24. The owner has SANCTIONED breaking that here: a label already
    // carries the button, so its flanking glyph reads better one rung smaller, and 32px at `large`
    // (the old `lg`) was simply too big. `icon-button` is UNCHANGED — an icon-only control has no
    // label to lean on, so its glyph stays on the 1:1 ladder and still matches a standalone icon.
    // So the composition identity now holds for icon-button and is deliberately offset for buttons.
    // `lint-rung-names.ts` arm 3 and `test.ts`'s icon-button↔button parity assertion both record this
    // as a one-rung offset rather than an equality, and still FAIL BY NAME if the button icon drifts
    // to any rung other than exactly one below `md` (docs/34 — the invariant changed shape, it did not
    // disappear).
    ...BUTTON_SPACING_AT["small"],
    "size.small.height": "size.sm.height",
    "size.small.icon": "icon.size.xs",
    "size.small.type": "type.label.sm.emphasis",
    ...BUTTON_SPACING_AT["medium"],
    "size.medium.height": "size.md.height",
    "size.medium.icon": "icon.size.sm",
    "size.medium.type": "type.label.md.emphasis",
    ...BUTTON_SPACING_AT["large"],
    "size.large.height": "size.lg.height",
    "size.large.icon": "icon.size.md",
    // RESOLVED #1260 (owner target 2026-09-17): a large button's label is 18px at emphasis (600),
    // bound to the `type.label.lg` rung MINTED for it — the body-lg SIZE (18) at the label tier's own
    // WEIGHT (emphasis/600). Before this, there was no `lg` rung so `large` reused `md` and a large
    // button's label was typographically identical to a medium one while height/padding/gap all moved;
    // #1248's type-key sweep measured that collapse (2 distinct styles across 3 sizes). It is now 3 —
    // `type.label.{sm,md,lg}` = 12/14/18 — and the sweep's authored expectation moves to 3 in step, so
    // re-pointing this back to `md` fails that gate by name (docs/34). Label is reading/UI text, exempt
    // from the typeScale shift, so `lg` resolves to 18px in every density (the owner's comfortable target).
    "size.large.type": "type.label.lg.emphasis",
    // THE PER-FAMILY PAINT — the full appearance × slot × state skin, bound to `interactive.<family>.*`.
    // Authored once in `intentTokens` above and spread here so the three components cannot silently
    // diverge (#1223, docs/34); the keys the projector reads (`filled.fill`, `outline.border.hover`, …)
    // are what that function returns. `test.ts` asserts these are the ONLY tokens that differ across the
    // three defs.
    ...intentTokens(family),
    // cross-cutting disabled (docs/20 §7) — ONE treatment, any appearance, IDENTICAL across all three
    // button components (that identity is why splitting the intents loses no coverage — #1223).
    //
    // INK IS KEYED TWICE, per ground (#784), and until #784 the second form was spelled
    // `disabled.on-fill` — a slot segment the projector never dispatches, so it was bound, gated, and
    // reached at no coordinate while every disabled appearance painted page ink. On `filled` that put
    // `disabled.text` on `disabled.fill` at 2.14:1 (wendys) / 2.55:1 (harbor), against the 3.04-3.08:1
    // contract `disabled.on-fill` already held. The `.on-fill` suffix now QUALIFIES the slot it paints
    // rather than replacing it, so `label`/`icon` stay words `paintOf` asks for and the projector picks
    // the form by whether the appearance actually has a disabled fill beneath the ink.
    "disabled.fill": "color.disabled.fill",
    "disabled.label": "color.disabled.text",
    "disabled.icon": "color.disabled.icon",
    "disabled.label.on-fill": "color.disabled.on-fill",
    "disabled.icon.on-fill": "color.disabled.on-fill",
    // THE DISABLED EDGE TRACKS THE DISABLED INK (#1349), and until here it did not. It bound
    // `color.disabled.border` — a muted neutral matched to `disabled.fill` (both resolve `neutralLow()`,
    // gated `min: 0`) — which on a dark/inverse band paints DARKER than the disabled label/icon it
    // surrounds (nb dark: border `neutral.750` vs ink `neutral.550`), so the disabled outline button's
    // edge read heavier than the text inside it. A border is a NON-TEXT graphical object, so its whole
    // a11y bar is SC 1.4.11's 3:1 against adjacent colors — it does not need to be darker than the ink,
    // and matching the ink is both the correct weight and a real contract where the old role carried none.
    //
    // So the edge now binds `color.disabled.icon` — the SAME role the disabled icon ink binds two lines
    // up, its graphical-object peer among the disabled roles (`disabled.text`/`disabled.icon` resolve
    // identically; icon is the non-text one). It is STRUCTURAL (`anatomy-figma.ts` STRUCTURAL = {fill,
    // border}), so it paints only on `outline`, where there is no fill and the edge sits on the page —
    // exactly the ground `disabled.icon` is gated against (`background.primary`), so the border inherits
    // that role's real contract rather than the old `min: 0` exemption. Measured against the page: nb/aurora
    // 3.16:1, harbor 3.32:1 (reduced, `disabledMin` floor 3), HC modes ≥4.5:1 — clears 3:1 in every mode by
    // construction (`disabled.icon`'s own `min` is ≥3, so nothing here can dip below the graphical-object bar).
    // The `color.disabled.border` ROLE is unchanged and still bound by the other bordered controls
    // (text-field, select, the *-control trio), so no token NAME moves and CONTRACT holds. Icon-button
    // took the same rebind in #1697 (it painted 1.48–1.80:1 against the page on the old role).
    // `test.ts` pins the equality BY NAME (border role === icon role, ≠ the old `color.disabled.border`)
    // and re-measures the resolved ratio ≥3 across the corpus, so a revert to the darker binding fails
    // a named assertion rather than shipping the heavier edge again (docs/34).
    "disabled.border": "color.disabled.icon"
  },
  // The STRUCTURAL layer (#327), instantiated from the KB brief §2 — which is already an
  // adjudicated cross-system anatomy, so this is a transcription into schema, not a re-derivation.
  //
  // Two parts of the brief resolve differently here, and both are decisions rather than omissions:
  //  · The brief's "container/target" and "layout container" are ONE part. In the brief they are
  //    separate paragraphs because CSS lets them be separate concerns; in both Figma auto-layout
  //    and `inline-flex` they are the same node, and splitting them would emit a redundant frame.
  //  · The focus ring IS a part, and this REVERSES the decision recorded here through #493 (#536
  //    item 3). The old reasoning was that a ring is "a stroke-with-offset on the target, not a node",
  //    so a part would put something in the child tree a materializer has nowhere to place. Both
  //    halves were wrong, and the second is what mattered: the ring is a node — an ABSOLUTELY
  //    positioned sibling — and a materializer places it precisely because it takes no cell in the row.
  //    What forced the reversal was the cost the old decision carried, measured rather than argued:
  //    `appearance=outline, state=focus-visible` emitted its REST border and no ring at all, and all
  //    108 focus-visible rows were byte-identical to their rest sibling. A ring drawn on the target
  //    instead would have to win the target's single stroke away from outline's border. An absolute
  //    sibling has its own, so nothing is traded — see `parts.focusRing`.
  anatomy: {
    root: "container",
    parts: {
      container: {
        kind: "box",
        // THE ORDER IS THE PRECEDENCE (#933): the overlay if it resolves, otherwise the fill. `filled`
        // keys a fill and no overlay; `outline` and `text` key an overlay and no fill, because they have
        // no fill to change for hover and express it as a translucent wash on this same node. Exactly
        // one of the two resolves at any coordinate, so the order is a tie-break that never fires — it
        // is written down because the projector used to hold it as a hardcoded `??` and the def that
        // depends on it could not see it.
        paintSlots: ["overlay", "fill", "border"],
        role: "target",
        children: ["leadingVisual", "label", "trailingVisual", "focusRing"],
        // justify: center is the CONSTANT (docs/28 §5.2). Primer ties alignment to purpose —
        // center for CTAs, left for selection toggles — but that would make `align` the first
        // LAYOUT prop in ComponentDef, a precedent propagating across ~40 components. Deferred
        // until a real surface needs it, not settled by preference.
        //
        // New Balance was that surface (#1667), and the answer is a BRAND lever, not a prop: a brand's
        // buttons all pin their icons or none do. `buttonIcons: edges` ("Locked to edges") is applied by
        // `applyButtonLayout` before projection — this root keeps hugging above its floor, the icons go out
        // of flow pinned to its edges (`PartDef.pin`), and each icon's side reserves inset + icon + gap as
        // padding, so the label centers in the space beside them and the button still grows with it. What
        // is authored here is the default, "Attached to label", unchanged. The per-size `minWidth` floor is
        // written there too, from the brand's heights, which is why this def authors none.
        layout: { direction: "row", align: "center", justify: "center", sizing: { x: "hug", y: "fixed" } },
        padding: {
          block: "size.{size}.padding-y",
          inlineLabel: "size.{size}.padding-x",
          inlineVisual: "size.{size}.padding-x-visual"
        },
        gap: "size.{size}.gap",
        height: "size.{size}.height",
        radius: "radius",
        // The EDGE's thickness (#1278) — see `border-width` in `tokens` for the figure and why it is
        // 1 and not 2. Names the def's own key rather than the token, exactly as `radius` above and as
        // checkbox/radio/switch do.
        strokeWidth: "border-width"
      },
      // `nesting: swap` on all three swap-materialized parts (#681). A slot's target is nominated per
      // FILE by the caller and its content is the designer's to change, so there is no variant for the
      // def to fix — which is exactly what `swap` says.
      leadingVisual: { kind: "slot", optional: true, size: "size.{size}.icon", nesting: { kind: "swap" }, note: "Icon / avatar / counter / spinner before the label." },
      label: { kind: "text", optional: false, type: "size.{size}.type", note: "Its own node so truncation, wrap and line-height are controllable independently of the row." },
      trailingVisual: { kind: "slot", optional: true, size: "size.{size}.icon", nesting: { kind: "swap" }, note: "Icon / caret / indicator after the label. Not split into visual + action (docs/28 \xA75.3): the condition that split rested on \u2014 a pending state needing its own slot \u2014 is already carried by leadingVisual + isPending." },
      spinner: {
        kind: "overlay",
        // THE SPINNER COMPONENT (#1670), swapped in at the member on the slot's own icon rung (a medium
        // button's `icon.size.sm` → `spinner/small`). Before `spinner` existed the overlay took the caller's
        // icon placeholder, so a pending member showed a placeholder glyph where the spinner belongs.
        nests: "spinner",
        nesting: { kind: "swap" },
        // ORDERED, and the order is the design decision (#848). Leading first because a spinner on the
        // left reads as "loading" while one on the right reads as a trailing indicator; trailing second
        // because a cell that EXISTS is always a better host than the label-overlay fallback.
        replaces: ["leadingVisual", "trailingVisual"],
        overlaysWhenAbsent: "label",
        when: "pending",
        size: "size.{size}.icon",
        note: 'Takes a visual cell when there is one (Primer: "the spinner replaces only that visual slot, and the button label remains visible") \u2014 width identical, because the cell was already the icon\'s size. With no visual cell at all there is nothing to take, so it goes out of flow, centered on the label, and the label holds the width open at zero opacity (React Aria). Generalized from "the leading visual" to "a visual cell" by #848, and the narrow reading was a real defect rather than a simplification: `replaces` named only `leadingVisual`, so `leading=false, trailing=true` \u2014 which has a visual cell \u2014 fell through to the label overlay and rendered as spinner + trailing visual with the label at zero opacity, i.e. two icons and no text. Found in a live Figma paste; every gate was green (see #848 and docs/34 shape 16). The older note before that ruled out the label\'s position on the grounds that replacing a centered label collapses the width, which conflated replacing with removing: removing the label collapses the width, overlaying it does not, and that conflation ruled out the correct fix for the label-only case for as long as it stood (#612).'
      },
      focusRing: {
        kind: "absolute",
        when: "focus-visible",
        nests: "focus-ring",
        inset: "ring-offset",
        // THE STROKE THE OFFSET HAS TO CLEAR (#801). `ring-offset` is the visible gap the brand asks
        // for; the ring draws its own 2px stroke INSIDE its bounds, so a materializer that positions
        // this part at -2 has the stroke drawn back across the whole gap and the ring lands flush on
        // the border. Both numbers travel and the executor sums them — see `PartDef.strokeInset`.
        strokeInset: "ring-width",
        // `nest-fixed` with `follow: ['surface']` (#1134, #1156). The ring's `surface` FOLLOWS this
        // button's `surface`: a `surface=inverse` button member nests the `surface=inverse` ring, so a
        // button on a dark band gets the ring tuned for that band — which is what its own 3:1 contract
        // needs (1.4.11, the reason the ring has the axis). `variant: { surface: 'default' }` is the
        // fallback, reached only where the host member does not carry `surface` (a structure-only plan).
        // This is why both axes are named `surface` (#1134): the passthrough is by NAME, and a button
        // spelling it `surface` while the ring spelled it `color` could not drive one through the other.
        // Naming the variant is still #681 — the def CHOOSES rather than inheriting the ring set's first
        // child (creation-order, #656's error one layer out); `follow` only makes the choice per member.
        nesting: { kind: "nest-fixed", variant: { surface: "default" }, follow: ["surface"] },
        note: "An absolutely-positioned sibling nesting the shared `focus-ring` component. Takes no cell in the row, so no geometry moves, and has its own stroke \u2014 which is what dissolves the collision rather than trading a loss: a ring drawn on the target would compete with `appearance=outline`'s border for the single stroke a Figma node has, at three different palette steps (550 ring / 500 border / 550 rest fill). Shared rather than authored per host because the ring is nobody's component \u2014 `focus.ring.*` and `color.border.focus` are top-level families and `focus.ring.offset-field` already emits separately."
      }
    },
    derived: {
      "min-width": 'height \xD7 minWidthMultiplier \u2014 Spectrum computes it rather than authoring it, so a short label ("OK") cannot produce a stubby button',
      "pill-radius": "height \xF7 2 \u2014 only when appearance uses the pill radius; a literal radius token would be wrong at more than one height"
    },
    // The ceilings. Each is structure the neutral vocabulary can state and Figma provably cannot
    // hold, so it is recorded rather than silently lost in the projection.
    codeOnly: [
      "touch-target-expansion \u2014 the optical box and the hit box are deliberately decoupled (::before / absolute overlay), reconciling the WCAG 2.5.8 24\xD724 floor with Apple HIG 44\xD744 without inflating a compact button. Figma has no concept of a hit area larger than the frame.",
      'focus-ring-offset \u2014 the ring GEOMETRY now projects (an absolute sibling nesting the shared `focus-ring`), but its position is FROZEN at paste: Figma\'s x/y accept no variable binding, so the payload resolves `focus.ring.offset` AND `focus.ring.width` to numbers, sums them, and writes the result (#801 \u2014 the ring\'s stroke is drawn INSIDE its own bounds, so the gap the brand asked for has to be widened by the stroke that eats it). Two names freeze exactly as one did. Every bound paint re-themes when a brand changes; an already-pasted ring does not move. AND A REBUILD DOES NOT MOVE IT EITHER, which is the half worth writing down: the executor finds the set by name on the current page and skips each member by name, reporting `\u2713 already built` without writing any geometry \u2014 so to pick up a corrected ring position you must DELETE the existing component set, or build onto a fresh page. This is not specific to the ring; it is true of any geometry, paint or constraint change to an already-pasted set, and it is tracked as #827 because name-based idempotence cannot tell "already built correctly" from "built by an older engine". The `:focus-visible` CONDITION remains unprojectable \u2014 Figma carries the ring as a variant coordinate a designer selects, not as a state a pointer triggers.',
      "focus-ring STROKE, WIDTH and RADIUS \u2014 owned by the nested `focus-ring` component, not by this def. `focus-ring`, `ring-width` and `ring-offset` are bound in `tokens`, and since #801 BOTH numbers reach a Figma node as this def's own absolute geometry: the host positions the part at -(offset + width), because the ring draws its stroke inside its own bounds and would otherwise consume the whole gap. Since #1266 the width reaches the RING's node too, as its bound `strokeWeight` \u2014 so the compensation and the stroke it compensates for are finally the same number, which for three releases they were not. So this def verifies that a ring is nominated and where it sits, including the compensation that makes \"where\" visible, and nothing more. Sharing the ring is still the right call \u2014 the ring is one shared thing (`focus.ring.*` and `color.border.focus` are top-level families) and authoring it N ways in N hosts would be worse. But the UNGATED PART IS NOT A CONSEQUENCE OF SHARING IT, which is what this entry once claimed: it is projector and schema gaps, neither of them a trade anybody made. ALL THREE are now CLOSED, and what took the third one's place is smaller than the third one was. PAINT (closed #758 \u2192 #784): `paintOf` once keyed every lookup as `{intent}.{appearance}.{slot}`, so a def whose axes are surface/tone resolved nothing; #758 replaced that with each def's own `paintKeys` and #784 corrected the ring's keys to the slot vocabulary the projector dispatches. STRUCTURE (closed #795): this entry said `figmaAnatomySet` refuses any variant axis outside intent/appearance/size and `planComponentName` always writes a `size=` coordinate the ring has no axis for, so a ring member could never match the coordinate this def nests by \u2014 #795 deleted the axis list and made `size=` conditional on the def declaring `size`, and `focus-ring` now projects two members named exactly `surface=default` / `surface=inverse`, which is what this def's `nesting: { variant: { surface: 'default' }, follow: ['surface'] }` asks for (re-verified against `nestVariantMatch`). STROKE WIDTH (closed #1266): `PartDef` gained `strokeWidth`, `focus-ring`'s `ring` part binds it, and every projected member carries a bound `strokeWeight`. Before it, both executors fell through to `if (!node.strokeWeight) \u2026 = 1` and the ring pasted at 1px in every brand \u2014 half its declared thickness, and 3px of visible gap where 2 was designed, because the compensation above had already assumed 2. What is LEFT is one keyword: `PartDef` has no field for a stroke's style, and cannot usefully have one, because Figma expresses `solid`/`dashed` as a `dashPattern` of pixel runs rather than as a keyword \u2014 so `focus.ring.style` resolves against every brand and has nowhere to bind. A schema decision under #740. Read the remaining gap as \"the ring pastes without its dash style\", not as \"the ring pastes without its stroke\".",
      "min-width derivation \u2014 a literal per size at build (#1667): height \xD7 multiplier, rounded up to 8px, from baseline-density heights. Frozen, not live; a per-mode density keeps the baseline floor.",
      "Locked to edges (#1667) \u2014 in code, padding plus absolutely positioned icons: the button keeps `inline-size: auto` above its `min-inline-size` floor, each icon side pads by `calc(padding-x-visual + icon + gap)`, and the icons sit `position: absolute` at `padding-x-visual` from their edge, vertically centered, so the label centers in the space beside them. Figma holds the same shape with the reserve and the inset as literal px per size (its padding binds one variable, not a sum), so a brand change reaches them only on a rebuild, as with the floor.",
      "width (auto | full) \u2014 declared as a variant axis but deliberately NOT projected into Figma (#487 \xA74). A designer resizes an auto-layout frame; a variant axis for it doubles the whole set to buy nothing a drag does not already do.",
      // #1697 — brief §9 and §11, carried as code-tier rules. None of the four LEADS with an axis or state
      // name: `admits()` reads the first word as an admission that the name is unprojected (#867), so a
      // rule that opened with `pending` or `size` would license dropping it from the Figma projection.
      "Label overflow (brief \xA79) \u2014 the label wraps to a second line rather than truncating, since an ellipsis hides the action. The button takes no fixed English width: `min-inline-size` plus padding, so a German or Finnish label widens it. Figma holds one line of placeholder text, so neither rule projects.",
      "RTL mirroring (brief \xA79) \u2014 logical properties (`padding-inline`, `margin-inline`, flex `gap`) mirror the whole row, so the leading and trailing visuals swap sides on their own. Only directional glyphs (back and forward chevrons) flip, set per icon (`autoMirror`), never a blanket `scaleX(-1)` on the slot; search, settings and media-transport glyphs stay as drawn.",
      "Press behavior (brief \xA711) \u2014 built on a headless press primitive (React Aria `usePress`, Atlassian `Pressable`) that normalizes mouse, touch, keyboard and pointer, with the visual tokens owned here. No `overrides` surface into internal nodes: strict token mapping and headless composition instead.",
      "Form integration (brief \xA711) \u2014 inside a `<form action>`, `useFormStatus` sets `isPending` while the action is in flight. The component forwards `ref` and spreads rest props onto the underlying element, which tooltip and popover anchoring depend on.",
      // The `modifiers` admission is GONE, with the axis it admitted (#845). Two notes on why it is not
      // simply deleted-and-forgotten. FIRST, its closing sentence had already gone stale: it said slot
      // presence "needs its own variant axis … that axis does not exist in this def yet", and `slotAxes`
      // has existed since #487 step 2 — so the entry was admitting an axis for a reason that had been
      // fixed, which is a stale exemption reading as a live one. SECOND, an admission for an axis the def
      // no longer declares is refused by nothing in either direction; `figmaPropertyErrors` only asks
      // whether every DECLARED-and-unprojected axis is admitted, never whether every admission has an
      // axis. So it would have sat here indefinitely as evidence for an axis that was gone.
      // The `intent-at-disabled redundancy (#612)` entry is GONE with #1223, and its removal is the point
      // rather than an omission. It documented that all three intents rendered ONE byte-identical row at
      // `state=disabled` (144 redundant rows, accepted not pruned) — a redundancy that existed only
      // because intent was an AXIS crossing state. #1223 removes the intent axis entirely: each button
      // component now carries ONE disabled skin per coordinate, and the three components' disabled skins
      // are identical to each other (the shared `disabled.*` block), which is the token tier being correct
      // one level up. There is no per-intent redundancy left to admit, so the entry and the `admits()`
      // guard that protected its wording both retire — nothing declares `intent` for the check to key on.
      "inactive \u2014 a real state (isInactive), deliberately NOT a Figma variant. Its whole delta from `disabled` is behavioral: it retains tab order, keeps the control in the a11y tree, carries aria-disabled rather than the native attribute, and surfaces the blockage reason on focus. None of that is paint, so a variant has nothing to encode. At the TOKEN tier its intended visual is `disabled`'s by an explicit decision (docs/03 item 3, resolved 2026-06-24: `disabledStrategy: 'accessible'` IS the KB's contrast-preserving `inactive`; docs/06 defines `text.disabled` as \"disabled / inactive ink\"). The EMITTER does not implement that yet \u2014 `anatomy-figma.ts` special-cases `state === 'disabled'` only, so `inactive` falls through to the `rest` paints, which is worse than a duplicate: the column would have read as a normal enabled button. Either way it is unprojectable, and the two facts fail it independently."
    ]
  },
  // How this projects into Figma component properties (#487 §5). DECLARED, not inferred from
  // `props[].type` — those are prose. Deliberately partial: `variantAxes` names only the three axes
  // that exist and should project, and every axis it omits is admitted in `codeOnly` above (the
  // validator enforces that pairing). The slot-presence axis §4 calls for is future def work, so it
  // is absent rather than stubbed.
  figmaProperties: {
    // `surface` PROJECTS (#1134) — it doubles each component's set (216 → 432) so a designer can pick a
    // button for a dark band from the same component, which is the deliverable. It is a real axis a
    // variant carries, unlike `width` (a drag, admitted in codeOnly): the two grounds are genuinely
    // different pixels, and Figma has no way to publish "inverse context" to a nested instance, so an
    // explicit coordinate is the only thing that can carry it. Its inverse paints come from the
    // projector's `color.inverse.*` rewrite (see `variants.surface`), not from keys in `tokens`.
    //
    // #1223 — `intent` is NO LONGER an axis here. Each of the three button components fixes one family,
    // so its set is appearance(3) × size(3) × surface(2) × state(6) × slot-combos(4) = 432 members; the
    // former single 1296-member set is now three 432-member sets (Button / Destructive / Neutral).
    variantAxes: ["appearance", "size", "surface"],
    // Six of the seven in `states` above — still the single source (#487 §0.4). The legacy sheet's
    // six (`active`, `focused`, `loading`) are deliberately NOT codified: they are that sheet's names
    // for `pressed`, `focus-visible` and `pending`.
    //
    // `inactive` is the one omission, and it is admitted in `codeOnly` above rather than dropped —
    // same mechanism `focus-ring-offset` uses. Seven remains right for `states` (the def's truth);
    // six is right for the projection (what a variant can carry). Keeping it would have shipped 108
    // rows that render as their `rest` sibling — the emitter has no `inactive` paint branch — under a
    // label promising a blocked control. See the codeOnly entry for why no branch is worth adding.
    stateAxis: { name: "state", values: ["rest", "hover", "focus-visible", "pressed", "pending", "disabled"] },
    // Slot PRESENCE (§4) — the axis `planComponentName` has been emitting all along. Declaring it
    // takes the projected surface from 189 to 756, which is what the emitter already produced; the
    // gap was in the declaration, not the emitter.
    //
    // An axis rather than a BOOLEAN because presence changes the CONTAINER's geometry: #326's
    // slot-aware inset sets `paddingLeft = leading ? inlineVisual : inlineLabel` per side, and a
    // Figma BOOLEAN drives one node's `visible` and can touch nothing above it. `booleans` staying
    // stated-empty below is the same finding read from the other end.
    //
    // THESE TWO AXES ARE WHERE `modifiers` WENT (#845). That axis listed `leading-visual`,
    // `trailing-visual` and `pending` as though they were alternatives; the first two are these two
    // presence axes, and `pending` was never a modifier at all — it is a value on the state axis
    // directly above, which is why removing the axis dropped nothing. This is deliberately NOT a
    // leading `codeOnly` admission: `admits()` requires an entry to LEAD with a name to license
    // omitting it, so stating `pending` here records where it went WITHOUT licensing its omission from
    // the state axis. `test.ts` asserts that dropping `pending` from that axis fails *even though*
    // codeOnly mentions it — an assertion written about the deleted `modifiers` entry, and the reason
    // this mention had to land somewhere that cannot be mistaken for an admission.
    //
    // `figmaName` is the icon-property canon (#1380), the #1309 display-name decoupling reaching the
    // presence axes: the code axis stays the idiomatic `leading`/`trailing` (what `planSetLayout` and the
    // slot machinery key on), while the SWITCH a designer reads in the panel is `leading icon` /
    // `trailing icon`. A true/false variant axis renders as a switch in Figma; the label is what this sets.
    slotAxes: [
      { name: "leading", part: "leadingVisual", figmaName: "leading icon" },
      { name: "trailing", part: "trailingVisual", figmaName: "trailing icon" }
    ],
    // Slot CONTENT, so a designer can pick the icon — orthogonal to presence above. `figmaName` gives each
    // swap the canon panel label `↳ swap leading icon` / `↳ swap trailing icon` (#1380): the `↳ ` prefix
    // (U+21B3 + space) makes Figma render it nested beneath its `leading icon` / `trailing icon` switch,
    // while the code prop stays the idiomatic `leadingVisual` / `trailingVisual` (validated against `props`).
    swaps: {
      leadingVisual: { part: "leadingVisual", figmaName: "\u21B3 swap leading icon" },
      trailingVisual: { part: "trailingVisual", figmaName: "\u21B3 swap trailing icon" }
    },
    // "Button" is the placeholder, and it lives here rather than in the payload: the def is the layer
    // a second brand overrides. Figma accepts an empty TEXT default, which is what #510's set shipped —
    // 21 structurally perfect variants with nothing readable in any of them.
    //
    // KEYED `label` (#1242/#1333) — the idiomatic lowercase prop, validated as a declared `prop` name.
    // No `figmaName` needed: the canon panel label IS `label` (#1380), so the KEY doubles as the display
    // name. It projects FIRST in the panel (text → swap → boolean order in `planSetProperties`), which is
    // the "label at the top" half of the icon-property canon.
    texts: { label: { part: "label", default: "Button" } },
    // Empty, and stated rather than omitted. `fullWidth` is layout; `isPending`/`isInactive`/
    // `disabled` collapse into the state axis; `onClick`/`type`/`href` are behavioral. A Figma
    // BOOLEAN drives one node's `visible` and nothing else, and none of those are that.
    booleans: {},
    // The set's COLUMNS (#656). `state` because it is the axis a designer reads across — the six
    // steps of one skin, side by side, is how the color layer was reviewed and how the legacy sheet
    // is drawn. It is also the widest axis here, so the cardinality fallback would pick it anyway;
    // declaring it is what stops the next axis added to this def from taking the columns by accident,
    // which is precisely what `slotAxes` did in #536 (the full set laid out 324 × 2, measured live at
    // 320 × 23304px). With this, 72 rows × 6 columns per component (#1223 — was 108 × 6 when intent
    // crossed the row axis; each of the three components now carries a third of the rows).
    gridAxis: "state"
  },
  accessibility: {
    role: "button (native <button>; never div[role=button] \u2014 it inherits Space/Enter activation, focus, and HC affordances for free)",
    // #1697 — every entry carries its reason, and 2.5.5 is stated as intent: `lint-hit-target.ts` gates the
    // 44px floor at the default size on comfortable and spacious densities, and names a small button and
    // compact density as the two exceptions, so "meets 44×44" would be a claim the engine does not make.
    // 1.4.13 is left out on purpose: the brief lists it "only if a tooltip is attached", and this def
    // attaches none (see `notes.evolution`).
    wcag: [
      "1.4.11 Non-text Contrast (the focus ring and boundary at 3:1)",
      "2.4.7 Focus Visible (a :focus-visible ring on every member, never suppressed, kept through pending and inactive)",
      "2.4.13 Focus Appearance (AAA \u2014 the ring is offset from the edge, so a sliver of background separates it from the fill)",
      "2.5.3 Label in Name (an aria-label starts with the visible label text)",
      "2.5.8 Target Size (Minimum) (24\xD724 \u2014 small is 36px tall, 28px at compact density)",
      "2.5.5 Target Size (Enhanced) (44\xD744, as intent \u2014 medium clears 44px at comfortable and spacious density and misses it at compact (36px); small clears it only at spacious (44px); reaching 44 elsewhere is a code-side hit-area expansion)",
      "4.1.2 Name/Role/Value (native <button>: the label is the name, the role is button, and state rides aria-disabled, aria-busy and aria-pressed)"
    ],
    keyboard: 'Native <button>: Enter activates on keydown, Space on keyup. (This asymmetry vs a link \u2014 which activates on Enter only, Space scrolls \u2014 is exactly why a navigating "button" must be a real link.)',
    focus: "A :focus-visible ring (color.border.focus) with an outline-offset so a sliver of background separates ring from border \u2014 it does not blend into the button's own fill (WCAG 1.4.11, target 3:1). Never suppressed. Focus is retained through pending and inactive (aria-disabled, not native disabled).",
    aria: 'State attributes are distinct, not interchangeable: aria-pressed only for a toggle-button; aria-expanded (+ aria-haspopup) for a menu/disclosure trigger; aria-checked only for the switch role. Do not conflate them. Busy: while isPending, set aria-busy and announce via a polite live region ("Saving\u2026"), and set aria-hidden="true" on the embedded spinner, which otherwise announces its own "Loading" status (a double announcement); keep the control focusable so the busy state is discoverable. isInactive/isPending use aria-disabled (not native disabled) so focus and the explanatory name/description stay reachable. Localization (brief \xA79): the label wraps rather than truncating and has no fixed English width, the row mirrors under RTL through logical properties, and only directional glyphs flip.'
  },
  content: {
    labelPattern: 'Verb-first, action-specific, sentence case, \u22643 words. "Save changes" / "Delete file" \u2014 never "OK", "Submit", or "Click here".',
    errorPattern: "Button has no error state \u2014 surface failures in an adjacent inline-message / alert (errors belong to the form/field).",
    dialogPattern: 'Match the destructive verb to the consequence ("Delete", not "Confirm"). Cancel = abort+revert; Close/Dismiss = dismiss info; never "OK" on an error.'
  },
  // SHARED across the three components (#1223) — the universal rules. Color is the component, so the
  // "which intent" guidance lives in each component's own `description`; what stays here is the appearance
  // hierarchy, labels, states and surface, which apply the same to Button / Destructive / Neutral.
  docs: {
    usage: "Use for an immediate action in the current context \u2014 submit/save/reset a form, trigger a UI state change (open modal, toggle drawer), or fire async work. Color is the component (Button / Button.Destructive / Button.Neutral \u2014 pick by semantics); rank actions within a view by appearance (filled > outline > text), with exactly one filled button per view or region.",
    do: [
      'Lead with a verb, name the object ("Publish post", not "Submit")',
      "Keep exactly one filled button per view; demote the rest to outline / text, so a view of three actions is three buttons at three appearances rather than three fills competing",
      "Set surface=inverse for a button on a dark or brand-filled band, so its fill, ink, border and disabled treatment bind the inverse counterparts instead of losing contrast against the flipped ground",
      // THE BRAND'S BUTTON SETTINGS (#1667), stated for the agent that builds this component in code: the
      // def is brand-agnostic, so the settings travel as brand input (`buttonIcons`,
      // `buttonMinWidthMultiplier`, `buttonContentSize`, and #1752's `buttonLabelWeight`) and these lines
      // say what each one builds.
      // #1697 — split from one ~400-character line: one item per setting value.
      "Place the icons the way the brand's `buttonIcons` setting says; `attached` (Attached to label, the default) keeps them beside the label with the group centered",
      "Under `buttonIcons: edges` (Locked to edges), position each icon absolutely at the visual padding from its edge, pad that side by the padding + the icon + the gap, and center the label in the space left \u2014 a button with only a trailing icon has its label slightly left of center, and a long label still widens the button",
      "Give every size a minimum width of its height \xD7 the brand's `buttonMinWidthMultiplier` (2.25 by default), rounded up to a multiple of 8px \u2014 88, 104 and 128px at heights of 36, 44 and 56px \u2014 in both icon placements, so a short label never makes a stubby button",
      "On a brand whose `buttonContentSize` is `smaller` (One step smaller), give a medium button the small size's label style and icon size (`type.label.sm.emphasis`, `icon.size.xs`) at the medium height and padding; small and large buttons keep their own",
      // #1752 — the fourth setting. Same shape as the line above: the setting, its option label, what it binds.
      "On a brand whose `buttonLabelWeight` is `default` (Default), set every size's label in the `default` weight of its label style (`type.label.sm.default`, `type.label.md.default`, `type.label.lg.default`) instead of `emphasis`; with One step smaller, a medium button takes `type.label.sm.default`",
      "Use isInactive (focusable) for a control blocked by satisfiable state; reserve disabled for the irrelevant",
      ...sibling.do
    ],
    dont: [
      "Use a button for navigation to a URL \u2014 use a link / link-button",
      "Stack multiple filled buttons competing for attention \u2014 differentiate rank by appearance, not by adding fills",
      "Use native disabled on a relevant-but-blocked control (dead end for keyboard/SR users)",
      "Remove the label to make room for a spinner \u2014 the button narrows mid-submit and screen readers lose the name; the spinner takes the leading visual's place, or overlays a label held at zero opacity"
    ],
    contentGuidelines: "Verb-first, specific, sentence case, no terminal punctuation, \u22643 words to bound i18n expansion."
  },
  ai: {
    primaryPurpose: "Trigger an action in place.",
    whenToUse: "The user needs to DO something on this surface \u2014 submit, confirm, open, apply, or start async work.",
    avoidWhen: `The target is a different location/URL \u2192 use a link (or link-button if it must look like a button). A persistent on/off state \u2192 use Switch.Row. One-of-many selection \u2192 use Radio.Group (or a segmented control, not built yet). A toggle with pressed state \u2192 use a toggle button (not built yet). Icon-only with no visible text \u2192 use IconButton (the accessible name is required there at the type level). ${sibling.avoidWhen}`,
    // #1697 — `spinner` (the pending state swaps it in, #1670) and `focus-ring` (every focus-visible member
    // nests it) are the two components this one always builds with, beside the icon in its slots.
    commonPartners: ["icon", "spinner", "focus-ring"],
    triggerKeywords: sibling.triggerKeywords,
    generationPriority: sibling.generationPriority
  },
  composition: {
    // What the anatomy nests (#1700): the ring (absolute) and the pending spinner (an overlay swap). The `icon`
    // a slot usually carries is a partner, not a part — a slot names no component (#513).
    composesWith: ["focus-ring", "spinner"],
    // #1697 — each sibling points at the icon-button of its OWN family, so the destructive button's
    // icon-only alternative is the destructive icon-button rather than the primary one.
    alternativeTo: [family === "primary" ? "icon-button" : `icon-button-${family}`, "switch-row"],
    planned: ["tooltip", "button-group", "menu", "popover", "link", "link-button", "toggle-button", "split-button"],
    replacesPatterns: ["input[type=button|submit]", "div[role=button]"]
  },
  motion: {
    enter: "none (present on mount)",
    exit: "none",
    // #1697 — the brief's ~100–150ms is carried as the target, not as a fact: this def binds no motion
    // token, so "runs via motion tokens" was a claim nothing made true. Recorded in `notes.unverified`.
    reduceMotion: "State transitions (background, border, shadow) are meant to run ~100\u2013150ms through the brand's motion tokens; this component binds none yet, so the timing is code-side. A subtle press (scale 0.98) gives tactile feedback. Under prefers-reduced-motion, resolve scale/translate to none but keep the instantaneous color change so the state stays perceivable; the pending spinner is functional and its busy state is carried by aria-busy regardless."
  },
  notes: {
    contested: [
      "native disabled vs focusable isInactive \u2014 the practice defaults to isInactive for relevant-but-blocked, but focusable aria-disabled is not yet the field-wide default (per-engagement decision).",
      'a low-emphasis destructive ("quiet Delete") is expressed as the Destructive Button at appearance=text rather than a fully orthogonal emphasis\xD7tone split \u2014 tone is the component (#1223), emphasis is the appearance axis within it.',
      "outline/text hover uses the interactive overlay wash, which assumes outlineInteraction=overlay-neutral (the default); a solid-tint / none brand rebinds those slots before projection (`applyOutlineInteraction`, #1608: the tinted-wash variable interactive.<color>.subtle-fill, the control's own fill at an opacity step (#1614, #1646) / no hover fill), on the inverse band too.",
      // #1697 — brief §15 `notes.contested`, carried with how this def resolves each.
      "polymorphism (brief \xA73) \u2014 a separate link-button over a generic `as` prop, and where polymorphism is unavoidable, infer `<a>` from `href`. This def keeps `href` as a discouraged escape hatch and lists link-button as planned.",
      "the `modifiers` axis (brief \xA74, \xA715) \u2014 the brief lists leading-visual / trailing-visual / icon-only / pending as one modifiers axis. This def omits it (#845): the two visuals are slot-presence axes, pending is a state, and icon-only is the separate icon-button."
    ],
    evolution: [
      // Moved from `contested` (#1700): resolved here, so it is evolution, not an open question.
      "ghost vs plain (brief \xA73) \u2014 the brief flagged `ghost` (an intent) and `plain` (an appearance) as overlapping at the low-emphasis end. Resolved by retiring `ghost` as a color: the quiet button is Button.Neutral at appearance=text (docs/20). Icon-button reuses the word as its appearance value (#1432), where there is no text to name.",
      "RESOLVED (was the v1 HIGH finding): interaction states existed only on the solid action/danger roles, so the default (neutral) button was hover-less. The interactive color system (docs/20) gives every color \u2014 primary/neutral/destructive \u2014 the full fill+states/on-fill/border/text/overlay shape, so the matrix is now uniform and the default button has proper hover/pressed. Disabled is the cross-cutting disabled.* family, no longer scattered per-color.",
      // #1697 — moved from `unverified`, where it sat marked RESOLVED.
      "RESOLVED (#1260): type.label.lg now exists (18px / emphasis) and size.large.type binds it, so a large button label is one rung above medium (14 \u2192 18) rather than reusing type.label.md.",
      // #1697 — brief §13, the three field shifts, with where each lands here.
      "Field shift 1 (brief \xA713) \u2014 off native `disabled`, toward focusable inactive. Carried as the isPending / isInactive / disabled trio; still not the field-wide default, which is why it is also contested above.",
      "Field shift 2 (brief \xA713) \u2014 behavior moves into headless press primitives (Atlassian `Pressable`, React Aria `usePress`). Carried as a codeOnly rule.",
      "Field shift 3 (brief \xA713) \u2014 framework-agnostic delivery (Web Components + CSS variables). The brief holds its headline example, the Polaris Web Components move, as unverified; nothing here depends on it.",
      '1.4.13 Content on Hover or Focus is left out of `accessibility.wcag` (#1697): the brief lists it "only if a tooltip is attached", and this def attaches none \u2014 tooltip is planned, and the criterion belongs to its def.'
    ],
    unverified: [
      // #1697 — narrowed. The ring's 3:1 against the PAGE is gated (focus-ring.ts wcag, per mode, 4.5:1 in
      // high contrast); what stays open is its contrast against the host's own edge.
      "FINDING (engine): the focus ring clears 3:1 against the page in every mode (gated, focus-ring.ts). Its contrast against the host's own edge or fill is not measured \u2014 the offset is what makes it achievable, not what proves it.",
      "motion timing \u2014 the brief's ~100\u2013150ms state transition is carried in `motion.reduceMotion` as the target. No motion token is bound, so nothing gates it."
    ]
  }
});
var button = makeButton(
  "button",
  "Button",
  "Triggers an action in place. For navigation, use a link.",
  "In-flow trigger for an action that happens now, in the current context \u2014 submit, save, confirm, open a dialog, fire async work \u2014 in the brand's primary action style, the expected look of a button. Not navigation (use link / link-button, even when it looks like a button), not a persistent binary (Switch.Row), not one-of-many selection (segmented-control / toggle-button). For a destructive or a weightless action, use the Button.Destructive / Button.Neutral sibling components.",
  "primary",
  {
    triggerKeywords: ["button", "submit", "cta", "confirm", "action", "primary action", "save"],
    avoidWhen: "The action deletes or removes something \u2192 use Button.Destructive. The action carries no brand emphasis (a toolbar control, a dense row) \u2192 use Button.Neutral.",
    generationPriority: 1,
    do: []
  }
);
var buttonDestructive = makeButton(
  "button-destructive",
  "Button.Destructive",
  "Triggers a destructive action \u2014 delete, remove \u2014 in the destructive color.",
  'In-flow trigger for a destructive action \u2014 delete, remove, discard, disconnect \u2014 in the destructive color, so the consequence reads before the click. Same anatomy as Button; the color is the whole difference. Pair it with an adjacent neutral escape ("Cancel" / "Keep"), and match the verb to the consequence ("Delete", not "Confirm"). For a quiet destructive action, use appearance=text on this component.',
  "destructive",
  {
    // Brief §10: `danger` / `destructive` are the aliases consumers reach for; both map here.
    triggerKeywords: ["destructive button", "danger button", "delete button", "danger", "destructive", "delete", "remove", "discard"],
    avoidWhen: "The action is not destructive \u2192 use Button, or Button.Neutral for one with no brand emphasis. Color is a weak carrier on its own, so a destructive action also names its consequence in the label.",
    generationPriority: 2,
    // Brief §5, the destructive-pairing rule.
    do: [
      'Place it beside a neutral escape ("Cancel" / "Keep"), never alone; on a delete confirmation the safe choice is often the filled button and the destructive action sits at a lower appearance beside it'
    ]
  }
);
var buttonNeutral = makeButton(
  "button-neutral",
  "Button.Neutral",
  "Triggers an action with no brand emphasis \u2014 toolbars, dense rows.",
  "In-flow trigger for an action that carries no brand weight \u2014 a toolbar control, a dense table row, a low-stakes secondary action \u2014 in the neutral color. Reach for it when the control genuinely has no brand emphasis to carry, not merely because it is secondary in rank (rank is the appearance axis: a secondary primary action is the Button at appearance=outline). Same anatomy as Button.",
  "neutral",
  {
    // #1697 — no "delete" (that is Button.Destructive) and no "primary action" (that is Button).
    triggerKeywords: ["neutral button", "toolbar button", "cancel button", "low-emphasis action", "action"],
    avoidWhen: "The action is the view's main one or carries the brand \u2192 use Button. It deletes or removes something \u2192 use Button.Destructive.",
    generationPriority: 2,
    do: []
  }
);

// ../../packages/engine/components/icon-button.ts
var iconButtonIntentTokens = (family) => ({
  // filled — interactive fill + on-fill ink (the glyph carries the ink an icon-only control has instead of a label)
  "filled.fill": `color.interactive.${family}.fill.rest`,
  "filled.fill.hover": `color.interactive.${family}.fill.hover`,
  "filled.fill.pressed": `color.interactive.${family}.fill.pressed`,
  "filled.icon": `color.interactive.${family}.on-fill`,
  // outline — the EDGE carries state (#576), so all three rather than letting hover/pressed fall to rest.
  "outline.border": `color.interactive.${family}.border.rest`,
  "outline.border.hover": `color.interactive.${family}.border.hover`,
  "outline.border.pressed": `color.interactive.${family}.border.pressed`,
  // THE GLYPH INK CARRIES STATE TOO (#1427), reversing the icon-button-only pin that held it at `.rest`.
  // This is Button's #1282/#1351 change reaching the icon-only control: the QA (2026-09-15) found the icon
  // ink static across states for `outline`/`ghost` while the container's edge and overlay wash moved, so an
  // outline icon-button's border stepped on hover/pressed while its glyph did not, and a ghost icon-button's
  // glyph sat unchanged while the overlay wash lightened the ground beneath it — the same composited-contrast
  // collapse Button measured (#1351). The roles were already there — `iText` emits `text.{rest,hover,pressed}`
  // (#576), the very candidates `border` above consumes by value — so the glyph now walks the SAME three
  // steps the label does on Button: nothing new in the token tier, three keys per appearance were missing
  // here. Neutral's ink is `walkable: false`, so its three states collapse onto rest exactly as the border
  // does — no change to a neutral icon-button.
  // #1471 — the GLYPH binds the dedicated `icon.*` role, not `text.*`. On an icon-only control this is the
  // role the ink always SHOULD have carried — the whole content is a glyph. Value-identical (the engine
  // mints `interactive.<family>.icon.{rest,hover,pressed}` as a value twin of `text.*`), so NO color
  // change; both icon-button and button move together.
  "outline.icon": `color.interactive.${family}.icon.rest`,
  "outline.icon.hover": `color.interactive.${family}.icon.hover`,
  "outline.icon.pressed": `color.interactive.${family}.icon.pressed`,
  // ghost — the borderless/fill-less icon action (#1432, owner-decided 2026-09-17). RENAMED from `text`:
  // a "text" appearance is meaningless on an icon-only control (there is no text), so the axis VALUE is
  // `ghost`, the industry term for a borderless icon button. This is an axis-VALUE rename only — the paint
  // KEY prefix is `ghost.*` so the projector selects it at the `ghost` coordinate, while the VALUES still
  // bind `color.interactive.${family}.text.*`: the mechanical mapping to button's `text` appearance ink
  // role is UNCHANGED (only the icon-button coordinate name moved, not the behavior). Button KEEPS `text`;
  // the two families deliberately diverge on this one appearance-value name (owner-accepted). The glyph ink
  // walks state (#1427, as `outline` above); hover/pressed also carry the translucent overlay wash.
  // #1471 — the GLYPH binds `icon.*` (value-identical to `text.*`). The `ghost.*` KEY prefix still selects
  // this at the `ghost` coordinate (#1432); only the VALUE role moves from `text` to `icon`. No color change.
  "ghost.icon": `color.interactive.${family}.icon.rest`,
  "ghost.icon.hover": `color.interactive.${family}.icon.hover`,
  "ghost.icon.pressed": `color.interactive.${family}.icon.pressed`,
  // outline/ghost hover is the overlay wash — a fill on the target node, because neither appearance has a
  // fill to change. Both states keyed, or a pressed member falls back to rest and projects identical to it.
  "outline.overlay.hover": `color.interactive.${family}.overlay.hover`,
  "outline.overlay.pressed": `color.interactive.${family}.overlay.pressed`,
  "ghost.overlay.hover": `color.interactive.${family}.overlay.hover`,
  "ghost.overlay.pressed": `color.interactive.${family}.overlay.pressed`
});
var makeIconButton = (id, name, summary, description, family, inheritsFrom, sibling) => ({
  id,
  name,
  aliases: ["icon-btn"],
  category: "form",
  status: "draft",
  description,
  summary,
  inherits: inheritsFrom,
  // Delta from Button: the label becomes an icon; the name moves to a required accessible name.
  // #1225 — no `intent` prop. Intent is now the COMPONENT (IconButton = primary; Destructive IconButton;
  // Neutral IconButton), not a prop on one component.
  props: [
    { name: "icon", type: "slot", required: true, description: "The single icon. Rendered aria-hidden \u2014 the IconButton owns the name." },
    { name: "aria-label", type: "string", required: true, description: 'Required accessible name (there is no visible text). A verb naming the action ("Close", "More actions"). Enforced at the type level \u2014 a missing name is a compile error, not a runtime warning; that requirement is the reason IconButton is a separate component.' },
    // #1697 — RESTATED, not inherited. `inherits` is read by nothing (see the anatomy note), so an API this
    // def depends on and does not state is an API no reader of this def can see. `onClick` is the action;
    // `type` carries Button's submit-trap default, which matters most here — an icon-only control inside a
    // form (a clear-field ×, a row delete) is exactly the one nobody expects to submit it.
    { name: "onClick", type: "function", required: false, description: "Action handler. Suppressed while isPending or isInactive." },
    { name: "type", type: "enum: 'button' | 'submit' | 'reset'", values: ["button", "submit", "reset"], default: "button", required: false, description: "Defaults to 'button', as Button does \u2014 the platform default is 'submit', so an icon button inside a form (a clear-field \xD7, a row delete) would submit it. Set 'submit' explicitly." },
    { name: "appearance", type: "enum: 'filled' | 'outline' | 'ghost'", values: ["filled", "outline", "ghost"], default: "ghost", required: false, description: "Default ghost \u2014 icon-only actions usually sit in toolbars, not as filled CTAs. The tertiary appearance is `ghost` (a borderless, fill-less icon action) because an icon-only control has no text; Button keeps `text`. Emphasis is the appearance axis; the color is the component (IconButton / IconButton.Destructive / IconButton.Neutral)." },
    { name: "size", type: "enum: 'small' | 'medium' | 'large'", values: ["small", "medium", "large"], default: "medium", required: false, description: "Square control; height drives both dimensions." },
    { name: "shape", type: "enum: 'square' | 'circular'", values: ["square", "circular"], default: "square", required: false, description: "The corner silhouette, and geometry only. `square` is the button's normal rounded rectangle (`radius.md`); `circular` is full-round (`radius.round`), the tap target read as a disc. No color, state, or token difference between the two \u2014 only the corner radius \u2014 which is why it is a clean 2-value axis and not a component split (each intent, by contrast, carries a different `interactive.<family>` binding). Both stay square in dimension (height drives width); shape rounds the corners, it does not change the box." },
    { name: "surface", type: "enum: 'default' | 'inverse'", values: ["default", "inverse"], default: "default", required: false, description: "The ground the icon-button sits on, following Button 1:1. `default` for a normal page; `inverse` for a dark or brand-filled band, where the control binds its `color.inverse.*` counterparts so fill, ink, border, overlay and the disabled treatment keep contrast against the flipped surface. An inverse icon-button inherits the shared white-inverse model with the icon as the ink: white fill + a per-family icon-ink derived to clear AA on white. A host that cannot know its ground picks `default`, and the designer sets `inverse` on the instance \u2014 the same answer the nested focus ring gives." },
    { name: "isPending", type: "boolean", default: false, required: false, description: "Swaps the icon for a spinner after a short delay, keeps focus (aria-disabled, not native disabled), suppresses re-fire, and announces busy through a polite live region. The square keeps its size." },
    { name: "isInactive", type: "boolean", default: false, required: false, description: "Focusable disabled for relevant-but-blocked actions \u2014 retains tab order and surfaces the blockage reason on focus." },
    { name: "disabled", type: "boolean", default: false, required: false, description: "Native disabled, reserved for controls irrelevant to the view; removes it from the tab order and the a11y tree." }
  ],
  states: ["rest", "hover", "focus-visible", "pressed", "pending", "inactive", "disabled"],
  variants: {
    // #1225 — `intent` is gone as an axis; it is the component identity now. `appearance` carries emphasis,
    // `size` the rung. #1432 — the tertiary value is `ghost`, not `text` (an icon-only control has no text);
    // this is an axis-VALUE rename for the icon-button family only, Button keeps `text` (owner-decided).
    appearance: ["filled", "outline", "ghost"],
    size: ["small", "medium", "large"],
    // #1353 — SHAPE is pure geometry (owner-decided 2026-09-10). `square` (default) is the button's normal
    // radius (`radius.md`); `circular` is full-round (`radius.round`). The two values differ ONLY in the
    // container's corner radius and are token-identical everywhere else, so this is a 2-value axis and NOT a
    // component split (the #1225 contrast: intent split into components because each carried a different
    // color binding; shape carries none). `square` leads because it is the default (the byte-identical
    // pre-#1353 geometry), and the order here MUST match `figmaProperties.variantAxes` and the
    // `lint-axis-values.ts` register entry.
    shape: ["square", "circular"],
    // #1427 — THE INVERSE GROUND, following Button 1:1 (the axis it always lacked; `button` has carried
    // `surface` since #1134). Like Button, the inverse bindings are NOT in `tokens` below — the projector
    // rewrites each resolved `color.*` ref to its `color.inverse.*` counterpart at any coordinate where
    // `surface=inverse` (`anatomy-figma.ts`, keyed on the axis by NAME). So this def declares the axis and
    // binds only default-ground roles; the transform supplies the inverse half, and the shared
    // `inverse.interactive.<family>.fill` role #1384 made white is inherited for free — an inverse
    // icon-button gets a white fill with a per-family icon-ink that clears AA on white. `default` leads
    // because it is the rest coordinate the inverse rewrite falls through to. APPENDED after `shape` so the
    // three axes Button shares (appearance/size/surface) keep their relative order and `shape` stays the
    // one icon-button-specific axis.
    surface: ["default", "inverse"]
  },
  // WHEN each axis changes (#1611): runtime axes are held to one footprint, authoring axes are not.
  // appearance stays RUNTIME, the strict default: a toggle icon button that fills when selected is the owner's
  // bold-when-selected shape (#1611).
  axisKinds: { appearance: "runtime", size: "authoring", shape: "authoring", surface: "authoring" },
  // NO `modifiers` AXIS (#845). It held `['pending']` — an axis of one, whose single value is already a
  // value on the state axis, so it modeled one coordinate twice and enumerated no alternatives at all.
  // An axis's values are supposed to be mutually exclusive coordinates along one dimension; a one-value
  // list has no dimension. `pending` survives where it already lived (`states`, and the projected
  // `stateAxis`), and it keeps its own leading `codeOnly` entry explaining the spinner ceiling — which
  // is what makes this removal safe here: see the note in `button.ts`, where it was NOT.
  // Icon-only is SQUARE: the height role drives both dimensions, so padding-x = padding-y.
  // Color skin follows Button's reconciled interactive.* model (same color × appearance);
  // this delta binds the square geometry + the base focus contract + the icon-glyph skins.
  // The icon glyph binds the same interactive inks Button's label does (on-fill for filled,
  // text for outline/text) — every color now carries the full state shape (v1 gap closed).
  // Same paint grammar as the substrate (#758), and stated rather than inherited: `inherits` records
  // the API delta, not the skin, and `paintOf` reads this def's own field. Repeating two lines is the
  // cheaper error than a lookup that walks `inherits` and resolves to a grammar nobody reading this
  // file can see — the set's color would then depend on a file it does not name.
  //
  // #1225 dropped the leading `{intent}` segment: intent is the component now, so the family is fixed per
  // def (supplied by `iconButtonIntentTokens(family)` above) and no longer a coordinate the key carries.
  paintKeys: ["{appearance}.{slot}.{state}", "{appearance}.{slot}"],
  tokens: {
    // #1353 — THE PER-SHAPE CORNER RUNG. `shape=square` binds the button's normal rounded rung (`radius.md`,
    // the byte-identical pre-#1353 value); `shape=circular` binds the full-round rung (`radius.round`). The
    // container resolves `radius.{shape}` (below), so these two keys ARE the shape axis's whole geometry
    // footprint — there is no bare `radius` key any more. The `controlShape: pill` BRAND lever repoints the
    // ROUNDED rung (`radius.md` → `radius.capsule`) and LEAVES the intrinsic round rung (`radius.round`), so
    // under a pill brand the square shape becomes a capsule (a circle, since the control is square) while the
    // circular shape stays on its own round rung — the exact rule the lever already applies to switch/radio's
    // intrinsic `radius.round` (`applyControlShape`'s header). Square's pill behavior is therefore unchanged
    // from before this axis existed.
    "radius.square": "radius.md",
    "radius.circular": "radius.round",
    // THE OUTLINE BORDER'S THICKNESS (#1278, #1300) — 1px, and it does not move; only its PROVENANCE does.
    // The number used to be the executors' `if (!node.strokeWeight) … = 1` fallback, the right figure
    // with nothing behind it, so a brand re-runging its border floor moved every other bordered part in
    // the system while this def stayed on Figma's default.
    //
    // BOUND ON THE DEF, so it travels with the def regardless of how it is split (#1300's own note). #1225
    // carries it into EACH of the three siblings by way of the shared factory — one bind, three components,
    // which is exactly the shape #1278's first cut MISSED when it bound the button factory and reached
    // icon-button not at all (`inherits: 'button'` is prose, nothing resolves through it).
    //
    // The rung is the same one `button` binds and deliberately NOT the one the selection controls bind:
    // Prism 2 draws its outline buttons at 1px and its checkbox/radio/switch at 2px, so `hairline` here
    // is this def agreeing with the reference rather than with its neighbors. See `checkbox.ts`'s
    // `border-width` note for the argument, and the #1278 arms for both directions of the sweep.
    "border-width": "border-width.hairline",
    "focus-ring": "color.border.focus",
    "ring-width": "focus.ring.width",
    "ring-offset": "focus.ring.offset",
    // square sizing — one dimension token drives width AND height
    "size.small.side": "size.sm.height",
    "size.medium.side": "size.md.height",
    "size.large.side": "size.lg.height",
    // the GLYPH artboard, on the 1:1 ladder (#324) — small→sm, so an IconButton's glyph matches a
    // STANDALONE `<Icon>` at the same size. Icon-button is UNCHANGED by #1350: it keeps the 1:1 identity
    // precisely because an icon-only control has no label to lean on. The text-bearing Button family, by
    // contrast, now binds its icon ONE RUNG SMALLER (owner-decided, #1350 — see `button.ts`), so a medium
    // IconButton's glyph (24) is one rung LARGER than a medium Button's leading visual (20). The control
    // side and the glyph inside it are two separate rungs and both are needed: `side` is the square's
    // outer box, this is what sits in it.
    "size.small.icon": "icon.size.sm",
    "size.medium.icon": "icon.size.md",
    "size.large.icon": "icon.size.lg",
    // THE PER-FAMILY PAINT — the full appearance × slot × state skin, bound to `interactive.<family>.*`.
    // Authored once in `iconButtonIntentTokens` above and spread here so the three components cannot
    // silently diverge (#1225, docs/34); the keys the projector reads (`filled.fill`, `outline.border.hover`,
    // …) are what that function returns. `test.ts` asserts these are the ONLY tokens that differ across the
    // three defs.
    ...iconButtonIntentTokens(family),
    // cross-cutting disabled — ONE treatment, any appearance, IDENTICAL across all three icon-button
    // components (that identity is why splitting the intents loses no coverage — #1225).
    "disabled.fill": "color.disabled.fill",
    "disabled.icon": "color.disabled.icon",
    // THE DISABLED EDGE TRACKS THE DISABLED GLYPH (#1697), the rebind #1349 gave Button. It bound
    // `color.disabled.border` — the muted neutral matched to `disabled.fill`, gated `min: 0` — which on the
    // page measured 1.48–1.80:1, so a disabled outline icon-button's edge all but vanished around a glyph
    // that clears 3:1. A border is a non-text graphical object, so its bar is SC 1.4.11's 3:1, and the role
    // that already carries that contract against the page is the disabled icon ink two lines up. It paints
    // only on `outline` (STRUCTURAL, no fill beneath), so the ground is `background.primary`, exactly what
    // `disabled.icon` is gated against. `test.ts` pins the equality by name and re-measures the resolved
    // ratio ≥3 per brand × mode for each sibling, so a revert fails a named assertion.
    "disabled.border": "color.disabled.icon"
  },
  // The STRUCTURAL layer. AUTHORED FLAT, and that is a decision rather than a shortcut: `inherits`
  // is declared in `component-schema.ts` and read by NOTHING — not the validator, not
  // `anatomy-figma.ts`, not the plugin. It is prose, asserted once in `test.ts` and otherwise inert.
  // So this def's props, variants and tokens are already written out in full, and an anatomy that
  // leaned on Button's would be the one field in the file resolved by a mechanism that does not
  // exist. Teaching the Figma path inheritance is a new mechanism on the critical path buying
  // nothing this component needs — the delta is small and stating it costs less than resolving it.
  //
  // THE THREE DELTAS FROM BUTTON, each of which is why this could not be a copy:
  //
  //  1. ONE part where Button has three. Button's row is leadingVisual / label / trailingVisual; here
  //     the icon is the whole content. There is no label, so nothing flanks anything.
  //  2. SQUARE, not a row with padding. Button's box hugs its content on x and pins a bound height on
  //     y; this one binds ONE key to BOTH axes (`size.{size}.side` → `size.<step>.height`, so a medium
  //     IconButton is exactly as tall as a medium Button and exactly that wide). It therefore carries
  //     NO padding at all — a square whose glyph is centered has no side to inset asymmetrically, and
  //     #326's whole subject (the visual side insets less than the label side) has no label side to
  //     compare against. `padding` is absent rather than symmetric-and-ignored.
  //  3. NO gap. A gap is the space BETWEEN two cells and there is one cell.
  //
  // WHAT IS IDENTICAL, deliberately: the focus ring. Same `absolute` part nesting the same shared
  // `focus-ring` component at the same bound offset, for the reason `button.ts` records — the ring is
  // nobody's component, and an absolute sibling has its own stroke so `appearance=outline`'s border
  // does not have to lose one. Copied rather than inherited on the same terms as everything else here.
  anatomy: {
    root: "container",
    parts: {
      container: {
        kind: "box",
        // Button's grammar, so Button's slots and Button's precedence — see its `container` for why the
        // order is written down rather than left in the projector (#933).
        paintSlots: ["overlay", "fill", "border"],
        role: "target",
        children: ["icon", "focusRing"],
        // FIXED on both axes, which follows from the square rather than being a separate choice: one
        // variable drives width and height, so `hug` on either would let the glyph decide a dimension
        // the token already decided. `justify`/`align` both center — the one cell sits in the middle of
        // a square, which is the only placement a square with no padding admits.
        layout: { direction: "row", align: "center", justify: "center", sizing: { x: "fixed", y: "fixed" } },
        // ONE key, BOTH axes. Not `height` plus a matching `width`: two bindings that must agree can be
        // rebound on one axis with nothing to notice, because each stays individually valid. A single
        // key cannot drift from itself, so "square" is a fact the def states rather than an invariant
        // nobody checks. See `PartDef.size`.
        size: "size.{size}.side",
        // #1353 — the corner radius now VARIES by the `shape` axis, resolved through `radius.{shape}` the same
        // way `size.{size}.side` varies by `size`. `varOf` fills `{shape}` from the member's coordinate and
        // looks up `tokens['radius.square'|'radius.circular']` — so `square` → `radius.md`, `circular` →
        // `radius.round`. This is the ONLY node the shape axis touches; everything else is token-identical
        // across the two values (the #1353 pins in `test.ts` assert exactly that).
        radius: "radius.{shape}",
        // The EDGE's thickness (#1278, #1300) — names this def's own key, like `radius` and `size` above.
        // See `border-width` in `tokens` for the figure and why it is stated here rather than inherited.
        strokeWidth: "border-width"
      },
      // REQUIRED, and this is the load-bearing difference from Button's two optional visuals. The whole
      // reason IconButton is a separate component is that its content and its accessible name cannot
      // both be optional (§10) — a slot that could be absent would project an empty square, which is
      // the "button, unlabeled" failure with the visual half missing too.
      //
      // `optional` is therefore ABSENT (which the schema reads as required), and that has a consequence
      // recorded in `figmaProperties` below rather than here: presence is not a question, so there is no
      // slot-presence axis, so the grid does not double.
      icon: {
        kind: "slot",
        size: "size.{size}.icon",
        nesting: { kind: "swap" },
        note: "The single icon, and the entire content. Rendered aria-hidden \u2014 the IconButton owns the accessible name, so the glyph is decorative even though it is the only thing visible. Bound to the `icon.size.*` ladder (#324's 1:1 rule), so an IconButton's glyph matches a standalone `<Icon>` at the same size \u2014 the identity the text-bearing Button family deliberately gives up one rung of (owner-decided, #1350): a medium IconButton's glyph is 24 where a medium Button's leading visual is 20."
      },
      // THE PENDING SPINNER PROJECTS (#1697), as Button's has since #1677/#1670. Before this the def
      // admitted it as a code-tier ceiling, on the reasoning that an overlay replacing the ONLY part had no
      // floor for `overlaysWhenAbsent` — but that field is required only when EVERY `replaces` target is
      // optional (`component-schema.ts`, the overlay checks). `icon` is required, so it is present at every
      // coordinate, the overlay always lands in its cell, and no fallback is needed or declared. The
      // spinner takes the icon's own cell at the icon's own rung (small → `spinner/small`, medium →
      // `spinner/medium`, large → `spinner/large` — icon-button's 1:1 ladder), so the square does not move.
      spinner: {
        kind: "overlay",
        nests: "spinner",
        nesting: { kind: "swap" },
        replaces: ["icon"],
        when: "pending",
        size: "size.{size}.icon",
        note: 'Takes the icon\'s own cell while pending, at the icon\'s size, so the square keeps its size. The accessible name stays on the control (aria-label), and the busy state is announced through a polite live region, with `aria-hidden="true"` on the spinner so it does not announce its own "Loading" as well.'
      },
      focusRing: {
        kind: "absolute",
        when: "focus-visible",
        nests: "focus-ring",
        inset: "ring-offset",
        // Identical to Button's, and for the identical reason (#801) — the ring's inside-drawn stroke
        // consumes the offset, so the gap needs both numbers. See `PartDef.strokeInset`.
        strokeInset: "ring-width",
        // `nest-fixed` with `follow: ['surface']` (#681, #1134, #1427). The ring's `surface` FOLLOWS this
        // icon-button's `surface`: a `surface=inverse` member nests the `surface=inverse` ring, so a control
        // on a dark band gets the ring tuned for that band — which is what its own 3:1 contract needs
        // (1.4.11, the reason the ring has the axis). `variant: { surface: 'default' }` is the fallback,
        // reached only where the host member does not carry `surface` (a structure-only plan). NAMING the
        // variant is still #681 — the def CHOOSES rather than inheriting the ring set's first child
        // (creation-order, #656's error one layer out); `follow` only makes the choice per member. This is
        // the exact one line Button carries — #1427 added icon-button's own `surface` axis, closing the
        // "icon-button has no surface axis of its own yet" gap this note used to record (docs/20 §9.8).
        nesting: { kind: "nest-fixed", variant: { surface: "default" }, follow: ["surface"] },
        note: "The same absolutely-positioned sibling nesting the same shared `focus-ring` as Button, at the same bound offset. Its own stroke is the point: an icon-only control is the most likely to be `appearance=outline` in a dense toolbar, and a ring drawn on the target would have to win that border's single stroke away from it."
      }
    },
    derived: {
      // KEPT so `isPillable` stays true and icon-button remains in the `controlShape: pill` brand-lever set
      // (#1163). The lever repoints the ROUNDED rung — the `shape=square` binding (`radius.md`) — to
      // `radius.capsule`, which clamps to height ÷ 2 on this square control and reads as a CIRCLE; the
      // `shape=circular` binding (`radius.round`) is the intrinsic round rung the lever leaves alone, exactly
      // as it leaves switch/radio. So a pill brand rounds the square shape off (unchanged from before #1353)
      // and the circular shape is already round — the two coincide under pill, which is what a brand-wide
      // "everything is a pill" choice means.
      "pill-radius": "height \xF7 2 \u2014 the pill lever repoints the square shape's rounded rung to radius.capsule, which on this width = height control is a CIRCLE; the circular shape is already full-round (radius.round)"
    },
    codeOnly: [
      "touch-target-expansion \u2014 the same decoupling of the optical box from the hit box Button records, and the one component where it matters MOST: `size=small` is a 36px square in every example brand (28px at compact density), so the optical box is below the Apple HIG 44\xD744 floor in every brand. Figma has no concept of a hit area larger than the frame, so the expansion cannot project and the emitted small square is the optical size only. A designer measuring it in Figma is reading the wrong box.",
      "focus-ring-offset \u2014 the ring GEOMETRY projects (an absolute sibling nesting the shared `focus-ring`), and its position is FROZEN at paste: Figma's x/y accept no variable binding, so the payload resolves `focus.ring.offset` AND `focus.ring.width` to numbers and writes their sum (#801 \u2014 the ring's stroke draws INSIDE its own bounds and would otherwise consume the whole gap). A brand changing either value re-themes every bound paint and does not move an already-pasted ring; nor does a REBUILD, which finds the set by name and skips each member by name, so a corrected position needs the existing set deleted or a fresh page. See `button`'s entry \u2014 the caveat is general to any geometry change, not to the ring. The `:focus-visible` CONDITION is likewise unprojectable \u2014 Figma carries the ring as a variant coordinate a designer selects, not as a state a pointer triggers.",
      // The phrase "a Figma node" ends this clause with a DASH rather than a colon, and that is not a
      // style preference (#804). This def's prose is bundled into `apps/plugin/dist/main.js` as string
      // content, and both CI and `build.mjs` assert that file contains no Node builtin import by grepping
      // for the `node` scheme prefix over the whole file — so a colon directly after "node" fails a
      // sandbox-safety check as though the main thread had imported the filesystem module. Measured: 0
      // occurrences before this def's prose reached the plugin bundle, 1 after. The grep cannot tell
      // prose from an import and is right not to try, since a check that parsed import syntax would miss
      // a builtin reached any other way. This comment observes the same rule it explains — the plugin
      // build does not minify, so a comment naming the literal would trip the check it documents.
      // #1697 — REWRITTEN. The old entry said `ring-width` "reaches no Figma node", while the entry above
      // it (and #801) sums the width into the ring's position, and #1266 binds it as the ring's own
      // `strokeWeight`. The entry contradicted its neighbor and had been stale since #1266.
      "focus-ring STROKE, WIDTH and RADIUS \u2014 owned by the nested `focus-ring` component, not by this def. Both numbers reach the build: since #801 the host positions the ring at -(offset + width), and since #1266 the width is the ring's own bound `strokeWeight`, so the compensation and the stroke are one figure. What stays unbound is the stroke style (`focus.ring.style`), which Figma holds as a dash pattern rather than a keyword \u2014 the same remaining gap `button` records.",
      'aria-label \u2014 the REQUIRED accessible name, and the def\'s entire reason for existing (\xA710). A Figma component property could carry a string, but it would be a string with no relationship to anything Figma reads: no exported frame, no prototype, no handoff surface consumes it, and a TEXT property named `aria-label` sitting empty on every member would read as a name that had been provided. The requirement is a TYPE-LEVEL one in the code projection, which is where it can actually fail a build; Figma cannot hold "required" at all.',
      // The `modifiers` admission is GONE, with the axis it admitted (#845). Keeping it would have left
      // an entry admitting an axis this def no longer declares — an exemption with nothing to exempt,
      // which `figmaPropertyErrors` cannot detect in either direction and which reads to the next author
      // as evidence the axis still exists. Deleting the axis and leaving its admission is the stale-
      // exemption shape `lint-paint.ts` checks BOTH directions for.
      //
      // The `pending` entry that used to sit below stayed through #845, and NOT because it explained this
      // axis: it explained a spinner ceiling on a state that still ships and projects. #1697 retired it
      // when the spinner began to project.
      //
      // AND MEASURING THAT FOUND A PRE-EXISTING DEFECT, filed as #867 rather than fixed here (history —
      // with #1697 the leading `pending` entry is gone, so this def no longer carries the instance).
      // Because `pending — the SPINNER…` LEADS with the state name, `admits()` reads it as an admission
      // that `pending` is unprojected — so dropping `pending` from this def's `stateAxis` is ALLOWED,
      // silently, where the identical mutation on `button` is refused. The entry is not an admission at
      // all; it describes a content ceiling WITHIN a state that does project. Measured before and after
      // the `modifiers` removal: allowed both times, so this pass neither caused it nor fixes it. It is
      // `admits()`'s leading-word rule read from the other end — that rule stops prose about something
      // else from admitting a name, and cannot tell prose ABOUT the name from prose admitting its
      // absence.
      //
      // The `intent-at-disabled redundancy` entry is GONE with #1225, and its removal is the point rather
      // than an omission. It documented that all three intents rendered ONE byte-identical row at
      // `state=disabled` (18 groups of 3 identical rows) — a redundancy that existed only because intent
      // was an AXIS crossing state. #1225 removes the intent axis entirely: each icon-button component now
      // carries ONE disabled skin per coordinate, and the three components' disabled skins are identical to
      // each other (the shared `disabled.*` block), which is the token tier being correct one level up.
      // There is no per-intent redundancy left to admit, so the entry retires — nothing declares `intent`.
      "inactive \u2014 a real state (isInactive), deliberately NOT a Figma variant, and the two reasons fail it independently. Its whole delta from `disabled` is behavioral (retains tab order, keeps the control in the a11y tree, carries aria-disabled rather than the native attribute, surfaces the blockage reason on focus), so a variant has nothing to encode; and the emitter special-cases `state === 'disabled'` only, so an `inactive` column would fall through to the `rest` paints and read as a normal enabled control.",
      // #1697 — the `pending — the SPINNER…` ceiling is GONE: the spinner projects (see `parts.spinner`).
      // Its removal also retires this def's instance of #867 — that entry LED with `pending`, so `admits()`
      // read it as licensing `pending`'s omission from the state axis. The entries below lead with other
      // words on purpose.
      "Spinner delay \u2014 in code the spinner appears only after a short delay (brief \xA78), so a fast response does not flash one. Figma holds the swapped member alone.",
      "RTL mirroring (button brief \xA79) \u2014 only a directional glyph flips under RTL (a back or forward chevron), set per icon (`autoMirror`); search, settings, close and media-transport glyphs stay as drawn. Figma draws the glyph once."
    ]
  },
  // How this projects into Figma component properties (#487 §5), and the shape is Button's MINUS the
  // slot-presence axes — which is the whole finding, recorded here rather than left to be inferred
  // from an absence.
  //
  // THE SLOT-FILL DIMENSION COLLAPSES TO 1, and it collapses rather than needing a new shape. Button's
  // `slotAxes` exists because presence changes GEOMETRY: #326 sets `paddingLeft = leading ?
  // inlineVisual : inlineLabel`, so `leading=true` and `leading=false` are two different boxes and a
  // Figma boolean (which drives one node's `visible` and can touch nothing above it) cannot carry the
  // difference. Neither half of that argument survives here: the icon is REQUIRED so there is no
  // `false` coordinate to carry, and there is no padding to vary even if there were. `figmaProperties`
  // therefore declares no `slotAxes` at all, and the validator already refuses one over a
  // non-optional part — so the collapse is enforced rather than merely intended.
  //
  // What that leaves is `AnatomyPlan.slots` — typed `{leading, trailing}` and written into every
  // member's name by `planComponentName`. It needs NO new shape either: with no slot axes declared,
  // `figmaAnatomySet` iterates `[false]` on both, so every member carries `leading=false,
  // trailing=false` and the two coordinates are constants. Constant axes cost one name segment each
  // and nothing else — `planSetLayout` gives a dimension only to axes that VARY, so they contribute no
  // rows and no columns. Not free, and worth naming as the price of not touching the type: every
  // IconButton member's name ends in two coordinates about slots it does not have, which reads as
  // vestigial to a designer inspecting the set. A distinct shape (`slots` keyed by the def's own part
  // names) is the honest fix and is a REFACTOR of a type three call sites read, on the critical path
  // of a component that does not need it. Recorded as the deliberate cost, not discovered later.
  //
  // #1225 — `intent` is NO LONGER an axis here. Each of the three icon-button components fixes one family;
  // the former single intent-crossing set is now three per-family sets (IconButton / Destructive IconButton /
  // Neutral IconButton). #1353 then adds the `shape` axis and #1427 the `surface` axis, so each set is
  // appearance(3) × size(3) × shape(2) × surface(2) × state(6) = 216 members (108 before the surface axis,
  // 54 before the shape axis).
  figmaProperties: {
    // #1353 — `shape` PROJECTS as a variant axis, so a designer picks square/circular in the Figma set the
    // same way they pick appearance/size. Appended after `size` (declaration order is the order Figma shows
    // the properties and `planComponentName` writes them). #1427 then APPENDS `surface` (default/inverse),
    // following Button 1:1, so the set is now appearance(3) × size(3) × shape(2) × surface(2) × state(6) =
    // 216 members per icon-button component (was 108 before the surface axis, so it exactly DOUBLES again).
    // The order MUST match `variants` and the `lint-axis-values.ts` register.
    variantAxes: ["appearance", "size", "shape", "surface"],
    // Six of the seven states, exactly as Button — `inactive` is admitted in `codeOnly` above rather
    // than dropped. Seven remains right for `states` (the def's truth); six is right for the
    // projection (what a variant can carry).
    stateAxis: { name: "state", values: ["rest", "hover", "focus-visible", "pressed", "pending", "disabled"] },
    // NO `slotAxes` — see the note above. The icon is required, so presence is not a question, and the
    // validator would reject an axis over a non-optional part.
    //
    // `state` across the columns for the same reason Button declares it: it is the axis a designer
    // scans to compare one control's states, and leaving it to cardinality would hand the columns to
    // whichever axis happened to be widest. Here that is `state` anyway (6 vs 3), which is exactly why
    // it is worth DECLARING — an inherited answer that happens to be right is #656's situation before
    // #656, and it would change silently the day the axis set moves.
    gridAxis: "state",
    booleans: {},
    // Slot CONTENT, so a designer can pick the glyph. The one property this component has, and it is
    // required-in-code but swappable-in-Figma: `required` means a consumer must SUPPLY an icon, not
    // that they must supply a particular one.
    //
    // `figmaName: 'swap icon'` is the icon-property canon reaching icon-button (#1380, owner-decided
    // 2026-09-09), via the same #1309 display-name mechanism. Lowercase, and DELIBERATELY WITHOUT the
    // `↳ ` prefix button/select use: the prefix renders a swap as nested BENEATH its presence switch, and
    // icon-button has none — its icon is REQUIRED, so there is no `leading icon` boolean to nest under and
    // a `↳` would be orphaned. The icon stays required; icon-button's identity (an accessible, required
    // icon-only control) is unchanged. The code prop stays `icon`.
    swaps: { icon: { part: "icon", figmaName: "swap icon" } }
  },
  accessibility: {
    role: "button (native <button>)",
    // #1697 — reasons on every entry, 2.4.13 added (Button carries it and the ring is the same one), 1.4.13
    // scoped to a tooltip as the brief scopes it, and 2.5.5 stated as intent (see `button.ts`).
    wcag: [
      "4.1.2 Name/Role/Value (the mandatory accessible name)",
      "2.5.3 Label in Name (a visible tooltip and the aria-label carry the same words)",
      "1.4.11 Non-text Contrast (focus ring at 3:1, and the icon glyph itself at 3:1 against its background)",
      "2.4.7 Focus Visible (a :focus-visible ring on every member, never suppressed, kept through pending and inactive)",
      "2.4.13 Focus Appearance (AAA \u2014 the ring is offset from the edge, so a sliver of background separates it from the fill)",
      "1.4.13 Content on Hover or Focus (only where a tooltip is attached: dismissible, hoverable and persistent)",
      "2.5.8 Target Size (Minimum) (24\xD724 \u2014 the small square is 36px, 28px at compact density)",
      "2.5.5 Target Size (Enhanced) (44\xD744, as intent \u2014 medium clears 44px at comfortable and spacious density and misses it at compact (36px); small clears it only at spacious (44px); icon-only controls are the likeliest to miss it, so reaching 44 elsewhere is a code-side hit-area expansion)"
    ],
    keyboard: "Native <button> \u2014 Enter on keydown, Space on keyup. Identical to Button.",
    focus: "Same offset :focus-visible ring as Button; retained through pending/inactive.",
    aria: 'aria-label is the accessible name (required). If it triggers a menu, add aria-haspopup + aria-expanded; aria-pressed only if it is a toggle. While isPending, set aria-busy, keep it focusable, and announce the busy state through a polite live region ("Saving\u2026"), and set aria-hidden="true" on the embedded spinner, which otherwise announces its own "Loading" status (a double announcement). Do not put a tooltip on a natively-disabled icon button (unreachable) \u2014 use isInactive so the reason stays reachable. Under RTL, only a directional glyph flips (a back chevron).'
  },
  content: {
    labelPattern: `The accessible name is a verb naming the action ("Close", "Edit", "More actions") \u2014 never the icon's shape ("X", "three dots"). If a tooltip is shown, its text should match the accessible name.`
  },
  docs: {
    usage: "Use for a self-evident action where space is tight and a text label would be redundant or not fit \u2014 toolbar actions, a close affordance, row-level edit/delete. Color is the component (IconButton / IconButton.Destructive / IconButton.Neutral \u2014 pick by semantics); rank actions within a view by appearance (filled > outline > ghost). Always provide the accessible name; pair with a tooltip (not built yet) for the visible name on hover/focus.",
    do: [
      "Always give it an accessible name (a verb)",
      "Use recognizable, conventional icons (close = \xD7, more = \u22EF); pair novel icons with a visible label instead",
      "Expand the hit area to meet target-size minimums even when the icon is visually small",
      ...sibling.do
    ],
    dont: [
      'Ship it without an accessible name ("button, unlabeled")',
      "Use it for an unfamiliar action a user cannot infer from the glyph \u2014 use a labeled Button",
      "Tooltip a natively-disabled icon button (the tooltip can't be reached) \u2014 use isInactive"
    ],
    // #1697 — carried from `content.labelPattern`, which has no reader (see `ComponentDef.content`).
    contentGuidelines: `The accessible name is a verb naming the action ("Close", "More actions"), never the glyph's shape ("X", "three dots"). A tooltip, where one is attached, shows the same words as the accessible name.`
  },
  ai: {
    primaryPurpose: "Trigger an action with an icon alone, no visible label.",
    whenToUse: "A self-evident, conventional action in a space-constrained context (toolbar, table row, card header, close affordance).",
    avoidWhen: `The action is not obvious from the icon (use a labeled Button) \u2014 or a visible label would fit and aid recognition. Never when you cannot supply an accessible name. ${sibling.avoidWhen}`,
    commonPartners: ["icon", "spinner", "focus-ring"],
    triggerKeywords: sibling.triggerKeywords,
    generationPriority: sibling.generationPriority
  },
  composition: {
    // #1697 — `spinner` joins: the pending member swaps it in. `alternativeTo` names the labeled Button of
    // the SAME family, the one `inherits` already names.
    // #1700 — what the anatomy nests: the ring (absolute) and the pending spinner (an overlay swap). The
    // `icon` the required slot carries is a partner, not a part — a slot names no component (#513).
    composesWith: ["focus-ring", "spinner"],
    alternativeTo: [inheritsFrom],
    planned: ["tooltip", "button-group", "menu", "popover", "link"],
    replacesPatterns: ["div[role=button] wrapping an icon", "a <button> holding only an <svg> and no accessible name"]
  },
  // #1697 — Button's reduce-motion rule (button brief §8), carried rather than inherited.
  motion: {
    enter: "none (present on mount)",
    exit: "none",
    reduceMotion: "State transitions (background, border) are meant to run ~100\u2013150ms through the brand's motion tokens; this component binds none yet, so the timing is code-side. Under prefers-reduced-motion, resolve scale/translate to none but keep the instantaneous color change so the state stays perceivable; the pending spinner is functional and its busy state is carried by aria-busy regardless."
  },
  notes: {
    contested: [
      "Whether IconButton is a distinct component or a mode of Button \u2014 the practice ships it distinct precisely so the accessible name is required at the type level (button brief \xA710).",
      // #1697 — the assumption Button records, which holds here identically (same overlay keys).
      "outline/ghost hover uses the interactive overlay wash, which assumes outlineInteraction=overlay-neutral (the default); a solid-tint / none brand rebinds those slots before projection (`applyOutlineInteraction`, #1608), on the inverse band too."
    ],
    evolution: [
      "RESOLVED (#1432, owner-decided 2026-09-17): the tertiary appearance is `ghost`, not `text` \u2014 an icon-only control has no text. The paint still binds the `text`-family ink role (now its `icon` twin, #1471); only the axis value moved. Button keeps `text`.",
      "RESOLVED (#1353, owner-decided 2026-09-10): a `shape` axis (square | circular), geometry only \u2014 the two values differ in the corner radius alone, which is why it is an axis and not a component split.",
      "RESOLVED (#1427): a `surface` axis (default | inverse), following Button, and the glyph ink walks state on outline/ghost as Button's label does.",
      "RESOLVED (#1350, owner-decided 2026-09-08): icon-button keeps the 1:1 glyph rung (medium \u2192 icon.size.md, 24px), matching a standalone icon, where the text-bearing Button moved one rung smaller.",
      "RESOLVED (#1697): the disabled edge binds the disabled icon ink (as #1349 did for Button) instead of `color.disabled.border`, which measured 1.48\u20131.80:1 against the page; the pending member swaps in the real spinner."
    ],
    unverified: [
      "motion timing \u2014 the button brief's ~100\u2013150ms state transition is carried in `motion.reduceMotion` as the target. No motion token is bound, so nothing gates it.",
      "the focus ring clears 3:1 against the page in every mode (gated, focus-ring.ts); its contrast against the host's own edge or fill is not measured."
    ]
  }
});
var iconButton = makeIconButton(
  "icon-button",
  "IconButton",
  "Icon-only action. Needs an accessible name.",
  "A Button whose entire content is a single icon, with no visible text label, in the brand's primary action style. Use for space-constrained, self-evident actions (close, more, edit) in toolbars, table rows, and headers. Because there is no visible label, an accessible name is mandatory. For a destructive or a weightless icon action, use the IconButton.Destructive / IconButton.Neutral sibling components.",
  "primary",
  "button",
  {
    triggerKeywords: ["icon button", "more button", "toolbar action", "edit action", "kebab menu"],
    avoidWhen: "The action deletes or removes something \u2192 use IconButton.Destructive. It carries no brand emphasis (most toolbar and row actions, a close affordance) \u2192 use IconButton.Neutral.",
    generationPriority: 2,
    do: []
  }
);
var iconButtonDestructive = makeIconButton(
  "icon-button-destructive",
  "IconButton.Destructive",
  "Icon-only destructive action. Needs an accessible name.",
  "An icon-only trigger for a destructive action \u2014 delete, remove, discard \u2014 in the destructive color, so the consequence reads before the click. Same anatomy as IconButton; the color is the whole difference, and the accessible name is still mandatory (a bare trash glyph is not a name). For a quiet destructive icon action, use appearance=ghost on this component.",
  "destructive",
  "button-destructive",
  {
    // Button brief §10: `danger` / `destructive` are the aliases consumers reach for.
    triggerKeywords: ["delete icon button", "trash button", "remove icon button", "danger icon button", "destructive icon button"],
    avoidWhen: "The action is not destructive \u2192 use IconButton, or IconButton.Neutral for one with no brand emphasis.",
    generationPriority: 3,
    // Button brief §5, the destructive-pairing rule, applied to a row action.
    do: [
      'Confirm a destructive icon action that cannot be undone \u2014 the confirmation carries a neutral escape ("Cancel" / "Keep"), since a lone trash glyph offers none'
    ]
  }
);
var iconButtonNeutral = makeIconButton(
  "icon-button-neutral",
  "IconButton.Neutral",
  "Icon-only action with no brand emphasis. Needs an accessible name.",
  "An icon-only trigger that carries no brand weight \u2014 a toolbar control, a dense table-row action, a close affordance \u2014 in the neutral color, which is where most icon-only actions sit. Reach for it when the control genuinely has no brand emphasis to carry, not merely because it is secondary in rank (rank is the appearance axis). Same anatomy as IconButton; the accessible name is still mandatory.",
  "neutral",
  "button-neutral",
  {
    triggerKeywords: ["close button", "dismiss button", "toolbar icon button", "neutral icon button", "row action"],
    avoidWhen: "The action carries the brand \u2192 use IconButton. It deletes or removes something \u2192 use IconButton.Destructive.",
    generationPriority: 2,
    do: []
  }
);

// ../../packages/engine/icon-glyphs.ts
var ICON_PATHS = {
  "arrow-down": "M12.9999 16.1716L18.3638 10.8076L19.778 12.2218L11.9999 20L4.22168 12.2218L5.63589 10.8076L10.9999 16.1716V4H12.9999V16.1716Z",
  "arrow-down-left": "M9 13.589L17.6066 4.98242L19.0208 6.39664L10.4142 15.0032H18V17.0032H7V6.00324H9V13.589Z",
  "arrow-down-right": "M14.5895 16.0032L5.98291 7.39664L7.39712 5.98242L16.0037 14.589V7.00324H18.0037V18.0032H7.00373V16.0032H14.5895Z",
  "arrow-left": "M7.82843 10.9999H20V12.9999H7.82843L13.1924 18.3638L11.7782 19.778L4 11.9999L11.7782 4.22168L13.1924 5.63589L7.82843 10.9999Z",
  "arrow-right": "M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z",
  "arrow-up": "M12.9999 7.82843V20H10.9999V7.82843L5.63589 13.1924L4.22168 11.7782L11.9999 4L19.778 11.7782L18.3638 13.1924L12.9999 7.82843Z",
  "arrow-up-left": "M9.41421 8L18.0208 16.6066L16.6066 18.0208L8 9.41421V17H6V6H17V8H9.41421Z",
  "arrow-up-right": "M16.0037 9.41421L7.39712 18.0208L5.98291 16.6066L14.5895 8H7.00373V6H18.0037V17H16.0037V9.41421Z",
  "check": "M10.0007 15.1709L19.1931 5.97852L20.6073 7.39273L10.0007 17.9993L3.63672 11.6354L5.05093 10.2212L10.0007 15.1709Z",
  "check-circle": "M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM11.0026 16L6.75999 11.7574L8.17421 10.3431L11.0026 13.1716L16.6595 7.51472L18.0737 8.92893L11.0026 16Z",
  "check-circle-filled": "M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM11.0026 16L18.0737 8.92893L16.6595 7.51472L11.0026 13.1716L8.17421 10.3431L6.75999 11.7574L11.0026 16Z",
  "chevron-down": "M11.9997 13.1714L16.9495 8.22168L18.3637 9.63589L11.9997 15.9999L5.63574 9.63589L7.04996 8.22168L11.9997 13.1714Z",
  "chevron-left": "M10.8284 12.0007L15.7782 16.9504L14.364 18.3646L8 12.0007L14.364 5.63672L15.7782 7.05093L10.8284 12.0007Z",
  "chevron-right": "M13.1714 12.0007L8.22168 7.05093L9.63589 5.63672L15.9999 12.0007L9.63589 18.3646L8.22168 16.9504L13.1714 12.0007Z",
  "chevron-up": "M11.9997 10.8284L7.04996 15.7782L5.63574 14.364L11.9997 8L18.3637 14.364L16.9495 15.7782L11.9997 10.8284Z",
  "close": "M12.0007 10.5865L16.9504 5.63672L18.3646 7.05093L13.4149 12.0007L18.3646 16.9504L16.9504 18.3646L12.0007 13.4149L7.05093 18.3646L5.63672 16.9504L10.5865 12.0007L5.63672 7.05093L7.05093 5.63672L12.0007 10.5865Z",
  "close-filled": "M12.0007 10.5865L16.9504 5.63672L18.3646 7.05093L13.4149 12.0007L18.3646 16.9504L16.9504 18.3646L12.0007 13.4149L7.05093 18.3646L5.63672 16.9504L10.5865 12.0007L5.63672 7.05093L7.05093 5.63672L12.0007 10.5865Z",
  "error-circle": "M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM11 15H13V17H11V15ZM11 7H13V13H11V7Z",
  "error-circle-filled": "M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM11 15V17H13V15H11ZM11 7V13H13V7H11Z",
  "external-link-filled": "M10 6V8H5V19H16V14H18V20C18 20.5523 17.5523 21 17 21H4C3.44772 21 3 20.5523 3 20V7C3 6.44772 3.44772 6 4 6H10ZM21 3V12L17.206 8.207L11.2071 14.2071L9.79289 12.7929L15.792 6.793L12 3H21Z",
  "eye": "M12.0003 3C17.3924 3 21.8784 6.87976 22.8189 12C21.8784 17.1202 17.3924 21 12.0003 21C6.60812 21 2.12215 17.1202 1.18164 12C2.12215 6.87976 6.60812 3 12.0003 3ZM12.0003 19C16.2359 19 19.8603 16.052 20.7777 12C19.8603 7.94803 16.2359 5 12.0003 5C7.7646 5 4.14022 7.94803 3.22278 12C4.14022 16.052 7.7646 19 12.0003 19ZM12.0003 16.5C9.51498 16.5 7.50026 14.4853 7.50026 12C7.50026 9.51472 9.51498 7.5 12.0003 7.5C14.4855 7.5 16.5003 9.51472 16.5003 12C16.5003 14.4853 14.4855 16.5 12.0003 16.5ZM12.0003 14.5C13.381 14.5 14.5003 13.3807 14.5003 12C14.5003 10.6193 13.381 9.5 12.0003 9.5C10.6196 9.5 9.50026 10.6193 9.50026 12C9.50026 13.3807 10.6196 14.5 12.0003 14.5Z",
  "eye-filled": "M1.18164 12C2.12215 6.87976 6.60812 3 12.0003 3C17.3924 3 21.8784 6.87976 22.8189 12C21.8784 17.1202 17.3924 21 12.0003 21C6.60812 21 2.12215 17.1202 1.18164 12ZM12.0003 17C14.7617 17 17.0003 14.7614 17.0003 12C17.0003 9.23858 14.7617 7 12.0003 7C9.23884 7 7.00026 9.23858 7.00026 12C7.00026 14.7614 9.23884 17 12.0003 17ZM12.0003 15C10.3434 15 9.00026 13.6569 9.00026 12C9.00026 10.3431 10.3434 9 12.0003 9C13.6571 9 15.0003 10.3431 15.0003 12C15.0003 13.6569 13.6571 15 12.0003 15Z",
  "eye-off": "M17.8827 19.2968C16.1814 20.3755 14.1638 21.0002 12.0003 21.0002C6.60812 21.0002 2.12215 17.1204 1.18164 12.0002C1.61832 9.62283 2.81932 7.5129 4.52047 5.93457L1.39366 2.80777L2.80788 1.39355L22.6069 21.1925L21.1927 22.6068L17.8827 19.2968ZM5.9356 7.3497C4.60673 8.56015 3.6378 10.1672 3.22278 12.0002C4.14022 16.0521 7.7646 19.0002 12.0003 19.0002C13.5997 19.0002 15.112 18.5798 16.4243 17.8384L14.396 15.8101C13.7023 16.2472 12.8808 16.5002 12.0003 16.5002C9.51498 16.5002 7.50026 14.4854 7.50026 12.0002C7.50026 11.1196 7.75317 10.2981 8.19031 9.60442L5.9356 7.3497ZM12.9139 14.328L9.67246 11.0866C9.5613 11.3696 9.50026 11.6777 9.50026 12.0002C9.50026 13.3809 10.6196 14.5002 12.0003 14.5002C12.3227 14.5002 12.6309 14.4391 12.9139 14.328ZM20.8068 16.5925L19.376 15.1617C20.0319 14.2268 20.5154 13.1586 20.7777 12.0002C19.8603 7.94818 16.2359 5.00016 12.0003 5.00016C11.1544 5.00016 10.3329 5.11773 9.55249 5.33818L7.97446 3.76015C9.22127 3.26959 10.5793 3.00016 12.0003 3.00016C17.3924 3.00016 21.8784 6.87993 22.8189 12.0002C22.5067 13.6998 21.8038 15.2628 20.8068 16.5925ZM11.7229 7.50857C11.8146 7.503 11.9071 7.50016 12.0003 7.50016C14.4855 7.50016 16.5003 9.51488 16.5003 12.0002C16.5003 12.0933 16.4974 12.1858 16.4919 12.2775L11.7229 7.50857Z",
  "eye-off-filled": "M4.52047 5.93457L1.39366 2.80777L2.80788 1.39355L22.6069 21.1925L21.1927 22.6068L17.8827 19.2968C16.1814 20.3755 14.1638 21.0002 12.0003 21.0002C6.60812 21.0002 2.12215 17.1204 1.18164 12.0002C1.61832 9.62283 2.81932 7.5129 4.52047 5.93457ZM14.7577 16.1718L13.2937 14.7078C12.902 14.8952 12.4634 15.0002 12.0003 15.0002C10.3434 15.0002 9.00026 13.657 9.00026 12.0002C9.00026 11.537 9.10522 11.0984 9.29263 10.7067L7.82866 9.24277C7.30514 10.0332 7.00026 10.9811 7.00026 12.0002C7.00026 14.7616 9.23884 17.0002 12.0003 17.0002C13.0193 17.0002 13.9672 16.6953 14.7577 16.1718ZM7.97446 3.76015C9.22127 3.26959 10.5793 3.00016 12.0003 3.00016C17.3924 3.00016 21.8784 6.87993 22.8189 12.0002C22.5067 13.6998 21.8038 15.2628 20.8068 16.5925L16.947 12.7327C16.9821 12.4936 17.0003 12.249 17.0003 12.0002C17.0003 9.23874 14.7617 7.00016 12.0003 7.00016C11.7514 7.00016 11.5068 7.01833 11.2677 7.05343L7.97446 3.76015Z",
  "FPO-default-icon": "M12 22C17.5229 22 22 17.5229 22 12C22 6.47715 17.5229 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5229 6.47715 22 12 22ZM15.0925 12.6124C15.0479 12.4206 15.0255 12.2242 15.0255 12.0234C15.0255 11.8137 15.0479 11.6107 15.0925 11.4143C15.1415 11.218 15.2174 11.044 15.32 10.8922C15.4226 10.736 15.5565 10.6133 15.7216 10.5241C15.8867 10.4304 16.0876 10.3835 16.3241 10.3835C16.5606 10.3835 16.7614 10.4304 16.9265 10.5241C17.0916 10.6133 17.2255 10.736 17.3281 10.8922C17.4307 11.044 17.5044 11.218 17.549 11.4143C17.598 11.6107 17.6226 11.8137 17.6226 12.0234C17.6226 12.2242 17.598 12.4206 17.549 12.6124C17.5044 12.7999 17.4307 12.9694 17.3281 13.1212C17.2255 13.2729 17.0916 13.3956 16.9265 13.4893C16.7614 13.5785 16.5606 13.6232 16.3241 13.6232C16.0876 13.6232 15.8867 13.5785 15.7216 13.4893C15.5565 13.3956 15.4226 13.2729 15.32 13.1212C15.2174 12.9694 15.1415 12.7999 15.0925 12.6124ZM14.1353 11.0328C14.0282 11.3362 13.9747 11.6664 13.9747 12.0234C13.9747 12.3715 14.0282 12.6972 14.1353 13.0007C14.2424 13.2996 14.3963 13.5607 14.5971 13.7838C14.798 14.0069 15.0434 14.1832 15.3334 14.3126C15.628 14.4375 15.9581 14.5 16.3241 14.5C16.6944 14.5 17.0246 14.4375 17.3147 14.3126C17.6047 14.1832 17.8501 14.0069 18.051 13.7838C18.2518 13.5607 18.4058 13.2996 18.5129 13.0007C18.6199 12.6972 18.6735 12.3715 18.6735 12.0234C18.6735 11.6664 18.6199 11.3362 18.5129 11.0328C18.4058 10.7249 18.2518 10.4572 18.051 10.2296C17.8501 10.002 17.6047 9.82351 17.3147 9.69411C17.0246 9.5647 16.6944 9.5 16.3241 9.5C15.9581 9.5 15.628 9.5647 15.3334 9.69411C15.0434 9.82351 14.798 10.002 14.5971 10.2296C14.3963 10.4572 14.2424 10.7249 14.1353 11.0328ZM5.75 9.61379H9.11011V10.4973H6.80087V11.6017H8.80221V12.4183H6.80087V14.3929H5.75V9.61379ZM10.7686 11.8628H11.5852C11.7057 11.8628 11.8217 11.8539 11.9332 11.836C12.0448 11.8182 12.143 11.7847 12.2277 11.7356C12.3125 11.6821 12.3794 11.6084 12.4285 11.5147C12.4821 11.421 12.5089 11.2983 12.5089 11.1466C12.5089 10.9949 12.4821 10.8721 12.4285 10.7785C12.3794 10.6847 12.3125 10.6133 12.2277 10.5643C12.143 10.5107 12.0448 10.475 11.9332 10.4572C11.8217 10.4393 11.7057 10.4304 11.5852 10.4304H10.7686V11.8628ZM9.71769 9.61379H11.873C12.1719 9.61379 12.4263 9.65841 12.636 9.74766C12.8458 9.83244 13.0153 9.94623 13.1447 10.089C13.2786 10.2318 13.3745 10.3947 13.4326 10.5776C13.495 10.7606 13.5263 10.9502 13.5263 11.1466C13.5263 11.3385 13.495 11.5281 13.4326 11.7155C13.3745 11.8985 13.2786 12.0613 13.1447 12.2041C13.0153 12.3469 12.8458 12.463 12.636 12.5522C12.4263 12.637 12.1719 12.6794 11.873 12.6794H10.7686V14.3929H9.71769V9.61379Z",
  "home": "M21 19.9997C21 20.552 20.5523 20.9997 20 20.9997H4C3.44772 20.9997 3 20.552 3 19.9997V9.48882C3 9.18023 3.14247 8.88893 3.38606 8.69947L11.3861 2.47725C11.7472 2.19639 12.2528 2.19639 12.6139 2.47725L20.6139 8.69947C20.8575 8.88893 21 9.18023 21 9.48882V19.9997ZM19 18.9997V9.97791L12 4.53346L5 9.97791V18.9997H19Z",
  "image": "M2.9918 21C2.44405 21 2 20.5551 2 20.0066V3.9934C2 3.44476 2.45531 3 2.9918 3H21.0082C21.556 3 22 3.44495 22 3.9934V20.0066C22 20.5552 21.5447 21 21.0082 21H2.9918ZM20 15V5H4V19L14 9L20 15ZM20 17.8284L14 11.8284L6.82843 19H20V17.8284ZM8 11C6.89543 11 6 10.1046 6 9C6 7.89543 6.89543 7 8 7C9.10457 7 10 7.89543 10 9C10 10.1046 9.10457 11 8 11Z",
  "info-circle": "M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM11 7H13V9H11V7ZM11 11H13V17H11V11Z",
  "info-circle-filled": "M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM11 11V17H13V11H11ZM11 7V9H13V7H11Z",
  "link": "M17.6572 14.8282L16.2429 13.414L17.6572 11.9998C19.2193 10.4377 19.2193 7.90506 17.6572 6.34296C16.0951 4.78086 13.5624 4.78086 12.0003 6.34296L10.5861 7.75717L9.17188 6.34296L10.5861 4.92875C12.9292 2.5856 16.7282 2.5856 19.0714 4.92875C21.4145 7.27189 21.4145 11.0709 19.0714 13.414L17.6572 14.8282ZM14.8287 17.6567L13.4145 19.0709C11.0714 21.414 7.27238 21.414 4.92923 19.0709C2.58609 16.7277 2.58609 12.9287 4.92923 10.5856L6.34345 9.17139L7.75766 10.5856L6.34345 11.9998C4.78135 13.5619 4.78135 16.0946 6.34345 17.6567C7.90555 19.2188 10.4382 19.2188 12.0003 17.6567L13.4145 16.2425L14.8287 17.6567ZM14.8287 7.75717L16.2429 9.17139L9.17188 16.2425L7.75766 14.8282L14.8287 7.75717Z",
  "minus": "M5 11V13H19V11H5Z",
  "minus-filled": "M19 11H5V13H19V11Z",
  "more-horizontal-filled": "M5 10C3.9 10 3 10.9 3 12C3 13.1 3.9 14 5 14C6.1 14 7 13.1 7 12C7 10.9 6.1 10 5 10ZM19 10C17.9 10 17 10.9 17 12C17 13.1 17.9 14 19 14C20.1 14 21 13.1 21 12C21 10.9 20.1 10 19 10ZM12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10Z",
  "more-vertical-filled": "M12 3C10.9 3 10 3.9 10 5C10 6.1 10.9 7 12 7C13.1 7 14 6.1 14 5C14 3.9 13.1 3 12 3ZM12 17C10.9 17 10 17.9 10 19C10 20.1 10.9 21 12 21C13.1 21 14 20.1 14 19C14 17.9 13.1 17 12 17ZM12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10Z",
  "pause-circle": "M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM9 9H11V15H9V9ZM13 9H15V15H13V9Z",
  "play-circle": "M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM10.6219 8.41459L15.5008 11.6672C15.6846 11.7897 15.7343 12.0381 15.6117 12.2219C15.5824 12.2658 15.5447 12.3035 15.5008 12.3328L10.6219 15.5854C10.4381 15.708 10.1897 15.6583 10.0672 15.4745C10.0234 15.4088 10 15.3316 10 15.2526V8.74741C10 8.52649 10.1791 8.34741 10.4 8.34741C10.479 8.34741 10.5562 8.37078 10.6219 8.41459Z",
  "plus": "M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z",
  "plus-circle": "M11 11V7H13V11H17V13H13V17H11V13H7V11H11ZM12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20Z",
  "plus-circle-filled": "M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM11 11H7V13H11V17H13V13H17V11H13V7H11V11Z",
  "plus-filled": "M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z",
  "resize-grip": "M18.2929 10.2929L19.7071 11.7071L11.7071 19.7071L10.2929 18.2929L18.2929 10.2929ZM18.2929 15.2929L19.7071 16.7071L16.7071 19.7071L15.2929 18.2929L18.2929 15.2929Z",
  "search": "M18.031 16.6168L22.3137 20.8995L20.8995 22.3137L16.6168 18.031C15.0769 19.263 13.124 20 11 20C6.032 20 2 15.968 2 11C2 6.032 6.032 2 11 2C15.968 2 20 6.032 20 11C20 13.124 19.263 15.0769 18.031 16.6168ZM16.0247 15.8748C17.2475 14.6146 18 12.8956 18 11C18 7.1325 14.8675 4 11 4C7.1325 4 4 7.1325 4 11C4 14.8675 7.1325 18 11 18C12.8956 18 14.6146 17.2475 15.8748 16.0247L16.0247 15.8748Z",
  "warning-triangle": "M12.865 3.00017L22.3912 19.5002C22.6674 19.9785 22.5035 20.5901 22.0252 20.8662C21.8732 20.954 21.7008 21.0002 21.5252 21.0002H2.47266C1.92037 21.0002 1.47266 20.5525 1.47266 20.0002C1.47266 19.8246 1.51886 19.6522 1.60663 19.5002L11.1329 3.00017C11.4091 2.52187 12.0206 2.358 12.4989 2.63414C12.651 2.72191 12.7772 2.84815 12.865 3.00017ZM4.20471 19.0002H19.7932L11.9989 5.50017L4.20471 19.0002ZM10.9989 16.0002H12.9989V18.0002H10.9989V16.0002ZM10.9989 9.00017H12.9989V14.0002H10.9989V9.00017Z",
  "warning-triangle-filled": "M12.865 3.00017L22.3912 19.5002C22.6674 19.9785 22.5035 20.5901 22.0252 20.8662C21.8732 20.954 21.7008 21.0002 21.5252 21.0002H2.47266C1.92037 21.0002 1.47266 20.5525 1.47266 20.0002C1.47266 19.8246 1.51886 19.6522 1.60663 19.5002L11.1329 3.00017C11.4091 2.52187 12.0206 2.358 12.4989 2.63414C12.651 2.72191 12.7772 2.84815 12.865 3.00017ZM10.9989 16.0002V18.0002H12.9989V16.0002H10.9989ZM10.9989 9.00017V14.0002H12.9989V9.00017H10.9989Z"
};
var ICON_NAMES = Object.keys(ICON_PATHS);

// ../../packages/engine/components/icon.ts
var icon = {
  id: "icon",
  name: "Icon",
  aliases: ["glyph", "symbol", "svg-icon"],
  category: "foundations",
  status: "draft",
  summary: "Glyph from the icon set at 16/20/24/32px. Decorative unless labeled; never interactive.",
  description: "A small vector glyph standing in for a concept, drawn on a square base-4/base-8 artboard at a fixed set of sizes. Decorative by default and hidden from assistive tech; a `label` is the sole gateway that makes it meaningful and named. Never the interactive element \u2014 an icon-only control is a Button that wraps one.",
  props: [
    { name: "name", type: "enum: IconName", values: [...ICON_NAMES], required: true, description: "Which glyph, typed to the set's literal vocabulary rather than a free string \u2014 an unknown name must fail at compile time, because a missing glyph otherwise fails silently as an invisible gap in production. The vocabulary is `IconName`, generated from the icon set and imported rather than restated, so a glyph cannot enter the set and be forgotten in the API. Compile-time refusal is available to any consumer importing that type; a code projection that widens it back to `string` gives the guarantee up, and that projection is the thing to watch rather than this def. Per-glyph components (`<IconSearch/>`) are the equivalent surface for a tree-shaken delivery." },
    { name: "size", type: "enum: 'x-small' | 'small' | 'medium' | 'large'", values: ["x-small", "small", "medium", "large"], default: "medium", required: false, description: "Enumerated, snapping to the fixed pixel grid \u2014 16 / 20 / 24 / 32. NOT arbitrary integers: off-grid scaling blurs strokes between hardware pixels and is the first thing an icon system must forbid. The t-shirt words are the vocabulary every other def uses; the rungs they bind are the engine's (`icon.size.*`)." },
    { name: "tone", type: "enum: 'inherit' | a semantic ink token", values: ["inherit", "primary", "secondary", "tertiary", "brand", "success", "warning", "danger", "info"], default: "inherit", required: false, description: "Ink. Defaults to `inherit` (`currentColor`), so the glyph tracks its host control's hover/disabled/error cascade with no JS reconciliation. A semantic value pins it instead, insulating an error glyph from an inherited color that would make it invisible. Rejects raw hex by construction \u2014 an enum has no cell for one \u2014 so contrast is enforced centrally rather than per call site." },
    { name: "label", type: "string", required: false, description: 'The only route to an accessible name. Present makes the glyph meaningful: `role="img"` + `aria-label`. Absent makes it decorative: `aria-hidden="true"`, which is the DEFAULT and the most common correct answer \u2014 a named icon beside its own text double-announces ("Email, Email"). Inside an icon-only control the WRAPPER carries the name and this stays absent; never name both.' }
  ],
  // `[]` — and this is a claim rather than an omission (§4). An icon is not interactive, so hover /
  // focus-visible / pressed / disabled belong to whatever control wraps it. A `disabled` icon inside
  // a disabled Button is Button's `disabled.icon` paint reaching in, not a state this component owns.
  states: [],
  // `name` is which glyph — the grid, as of #864. `tone` is the color-expression model, and it is a real
  // axis rather than a prop-only concern because a semantic ink is a different component in Figma's sense
  // — see the codeOnly entry for why it does not project.
  //
  // NOT declared: `fill` (outlined↔filled) and `weight`. Both are real axes in the field (§4 —
  // Material's FILL/wght variable-font axes, SF Symbols' rendering modes), and both are properties of
  // the SET's delivery rather than of a glyph slot the token tier can bind. Declaring them here would
  // put an axis in the component API that nothing in this repo can supply a value for.
  // `name` IS THE FIGMA GRID, AND `size` IS NOT AN AXIS HERE ANY MORE (#864). Both halves of that need
  // saying, because the second is a removal from a def that has carried it since #741.
  //
  // #864 was this def building four empty artboards — one per size rung, each containing nothing. The
  // geometry existed in `ICON_PATHS` and nothing reached it, so what the Figma leg needs is a member PER
  // GLYPH; a member per size rung is four copies of the same empty square. Enumerating both would be
  // four members per glyph (the whole set × four size rungs) carrying each glyph's path FOUR times, for
  // members that differ only by a dimension — and a vector is scaled to the box it sits in, so those
  // four are the same drawing.
  //
  // `size` therefore leaves `variants` rather than merely leaving `variantAxes`, and that is forced
  // rather than chosen: `figmaAnatomySet` hands `figmaAnatomyPlan` an undefined size for an axis it does
  // not project, and the plan refuses a sizeless coordinate for a def that DECLARES sizes (#795's guard,
  // deliberately — a sizeless plan would stand in for a grid the def enumerates). So a def cannot declare
  // a size axis it does not project.
  //
  // WHAT THAT DOES NOT COST, measured rather than assumed: nothing downstream binds a size on an icon
  // INSTANCE. `button.ts` and `icon-button.ts` each bind `size.{size}.icon` on their own slot — the host
  // sizes the square it swaps a glyph into, which is the composition #756's identity mapping describes.
  // The `size` PROP stays, with all four rungs and its `md` default, because a code consumer sizes an icon
  // directly and `lint-rung-names.ts` arm 2 still compares the enum against these bindings.
  //
  // `tone` still does not project — see the codeOnly entry. Its REASON moved in #1211 (a projected
  // `tone=inherit` member would now paint the floor and duplicate `tone=primary`, rather than having no
  // coordinate to occupy at all); the conclusion did not.
  variants: {
    name: [...ICON_NAMES],
    tone: ["inherit", "primary", "secondary", "tertiary", "brand", "success", "warning", "danger", "info"]
  },
  // WHEN each axis changes (#1611): runtime axes are held to one footprint, authoring axes are not.
  // `name` and `tone` stay RUNTIME, the strict default: a host swaps glyphs live (eye / eye-off, a chevron
  // flipping on expand) and inks them from its own state.
  axisKinds: { name: "runtime", tone: "runtime" },
  // THE PAINT GRAMMAR, and this def is why the field exists (#758). The ink axis leads with its own
  // NAME and carries no `{slot}` segment at all — `tone.primary`, not `primary.icon` — because the
  // component has one paintable surface, so a slot segment would be a constant repeated eight times.
  // `field-message` keys the same axis name the OPPOSITE way (`default.label` — value first, slot
  // second) over a disjoint value set, which is why the declaration is a template rather than an axis
  // list: an axis list can express one of these two shipped conventions and would force a rekey of
  // the other.
  //
  // THE SECOND KEY IS THE FLOOR, AND IT REVERSES WHAT THIS FILE USED TO SAY (#1211). Both this comment
  // and the one over `tokens` argued that `tone.inherit` must bind NOTHING — that `currentColor` is the
  // ABSENCE of a pinned ink, so a coordinate at `inherit` "resolves no paint and the glyph keeps
  // whatever ink it inherits", which that comment called the correct projection of `currentColor`
  // rather than a dropped binding. That reasoning predates any rendered default icon and it is wrong on
  // contact with the output. MEASURED: `variantAxes` is `['name']` alone, so no projected member carries
  // a `tone` coordinate at all — `tone.{tone}` is unfillable at every projected member and every one
  // ships with no fill bound. What they then inherit is not a host cascade: Figma has no `currentColor`, so it
  // resolves the literal `fill="currentColor"` in the glyph document to BLACK. The old position did not
  // project `currentColor`; it shipped unbound black glyphs (39 at the time, every member since) and read that as the projection.
  //
  // `'{slot}'` is the fallback the rest of the corpus already spells this way — `checkbox`, `radio`,
  // `switch` and `field-label` all end on it — and it sits SECOND on purpose: `paintOf` walks these in
  // DECLARATION ORDER, so a named tone still wins and the floor answers only the coordinates that name
  // none. That is every projected member, and `inherit` too.
  //
  // ONE HALF OF THE OLD ARGUMENT SURVIVES, and it is why the fix is a floor rather than a `tone.inherit`
  // entry: there is no token whose value is "inherit", so any key spelled that way would be a lie about
  // what the default DOES. The floor says something different and true — with no tone named, the ink is
  // the primary icon role. `tone: inherit` keeps its code meaning (the `tone` prop still documents
  // `currentColor`, and a DOM consumer can still leave the ink to the cascade); the floor is what a
  // target with no inheritance model resolves instead of falling back to a hard-coded black.
  paintKeys: ["tone.{tone}", "{slot}"],
  tokens: {
    // The two vocabularies meeting on four lines (#844) — the CONSUMER's word on the left, the ENGINE's
    // rung on the right, which is the shape every other sized def has always had and `icon` now does too.
    // The rungs did not move: `medium` still reaches `icon.size.md` = 24, so #756's default rule holds
    // unchanged. Only the word a consumer types changed.
    "size.x-small": "icon.size.xs",
    "size.small": "icon.size.sm",
    "size.medium": "icon.size.md",
    "size.large": "icon.size.lg",
    // THE FLOOR (#1211) — the ink a glyph takes when no tone is named, which is every projected member.
    // Keyed on the SLOT (`icon`) rather than on a tone value, because it is not a ninth tone: it is what
    // `paintOf('icon')` finds after `tone.{tone}` fails to fill. It points at the same role `tone.primary`
    // does, deliberately — the default tone IS primary, so a second role here would make the floor
    // disagree with the tone a consumer would name to get "the normal one".
    icon: "color.icon.primary",
    "tone.primary": "color.icon.primary",
    "tone.secondary": "color.icon.secondary",
    "tone.tertiary": "color.icon.tertiary",
    "tone.brand": "color.icon.brand",
    "tone.success": "color.icon.success",
    "tone.warning": "color.icon.warning",
    "tone.danger": "color.icon.danger",
    "tone.info": "color.icon.info"
  },
  // ONE PART, AND IT IS THE GLYPH ITSELF (#864).
  //
  // This part used to be a `box` — a square artboard whose note said it "carries the glyph paths", and
  // it carried nothing. That was #864: four members built without throwing, each an empty frame, with
  // every gate legitimately green because a node that exists is all any of them checked. The def named
  // the vocabulary in a prop enum and nothing connected the enum to `ICON_PATHS`.
  //
  // So the part is now `kind: 'vector'` and NAMES A GLYPH, templated on the `name` axis. `'{name}'`
  // resolves per member against the set at projection, which is the distinction that matters here: a
  // static `glyph: 'check'` also projects one correctly-named member per glyph and every one of them draws a check
  // mark. Measured on this branch before it was fixed, which is why the templating exists and why the
  // gate for this checks each member's path against `ICON_PATHS[its own name]` rather than checking that
  // a vector is present.
  //
  // NO SIZE BINDING, and the schema refuses one: a vector is scaled to the box it sits in, so the
  // artboard is the HOST's binding to make (`size.{size}.icon` on button's and icon-button's slots).
  // Binding it here would state the same square twice, on the box that owns it and on the outline inside
  // it, with nothing to notice when the two disagree.
  //
  // The brief's §2 point survives this, restated rather than dropped: "the 'anatomy' most people picture
  // (the paths) matters less than this governance". True — and it was never an argument for the paths
  // being absent. The set is still the versioned vocabulary (§10) and this def still does not author
  // geometry; it names a member of that vocabulary and fails loudly when the name stops resolving.
  anatomy: {
    root: "glyph",
    parts: {
      glyph: {
        kind: "vector",
        // `target` in the schema's sense — the single node that owns this component's paint and
        // dimensions — and NOT in the interaction sense, which an icon never has (§5). Worth stating
        // because the two readings diverge here for the first time: every def so far has been a
        // control, where the paint owner and the hit-area owner are the same node. `role: 'target'`
        // on a glyph claims the former only. The a11y consequence of the latter is carried by the
        // `touch-target` codeOnly entry, which puts the target-size floor on the wrapper where it belongs.
        role: "target",
        // WHICH glyph, by name in the set's vocabulary, resolved at the member's own coordinate. Never
        // path data — see `PartDef.glyph`: the name is the contract surface `icon.name` already types,
        // so a glyph that leaves the set is a projection failure rather than an invisible gap.
        glyph: "{name}",
        note: "The glyph outline itself, drawn on the set's square artboard and scaled to whatever box it is instanced into. The geometry comes from the set (`ICON_PATHS`) by name, so this def references the vocabulary without authoring it."
      }
    },
    // The ceilings. Every entry is structure the brief states and the Figma leg provably cannot hold.
    codeOnly: [
      // MUST LEAD with `tone` — `figmaPropertyErrors` requires an unprojected variant axis to be
      // admitted by an entry that STARTS with the axis name, because a passing mention inside an
      // entry about something else is a gate satisfied by unrelated prose (the #563 finding).
      "tone \u2014 the ink axis, declared in `variants` and deliberately not a Figma variant, and as of #795 the reason is ONE reason rather than three. The surviving one is the interesting one and always was: `inherit` (`currentColor`) is the DEFAULT and Figma has no equivalent \u2014 a Figma node's fill is a value, never an inheritance from its host. #1211 SHARPENS that rather than softening it, and the sharpening matters because the old wording is now half wrong. It said the most common tone \"has no coordinate to occupy\"; it has one, because `paintKeys` now ends on a `{slot}` floor and a coordinate at `inherit` resolves the primary ink like any other tone-less one. What Figma still cannot carry is the MEANING: a projected `tone=inherit` member would paint that floor and be pixel-identical to `tone=primary`, so the axis would offer a value whose entire job \u2014 defer to the host \u2014 the projection silently drops while looking complete. A duplicate member that lies is worse than an absent one, which is why the axis stays in code. The other two reasons are gone, and both were OURS rather than Figma's. STRUCTURAL: this entry said `figmaAnatomySet` refuses any variant axis outside intent/appearance/size (`PROJECTABLE_VARIANT_AXES`) and throws rather than enumerating around it \u2014 #795 deleted that list, so the projector would carry `tone` today if this def asked, and the def does not ask. PAINT: `paintOf` used to key every lookup as `{intent}.{appearance}.{slot}`, so a def whose paint axis is `tone` resolved nothing; #758 replaced that with this def's own `paintKeys` and the tone ink resolves at every tone \u2014 verified in `test.ts`, which plans this def at `{tone: danger}` and asserts the `color/icon/danger` binding. So the set projects over `name` and paints along `tone`, which is the shape #795's `variantAxes` doc comment cites as the field's original meaning.",
      'glyph fill vs stroke \u2014 the set ships FILLED outlines (`fill="currentColor"` on a closed path, verified across every source in the set), so a materializer paints the vector and never strokes it. A stroked-icon set is the other half of the field (Feather, Lucide) and would need a stroke weight plus a cap/join treatment. `PartDef.strokeWidth` exists since #1266, but it binds the stroke a `box` draws (the focus ring\'s) and is refused on a `vector`, and there is no cap or join field at all \u2014 so a stroked glyph still has no way to be declared, which is the `stroke weight` entry below met from the geometry side. Stated here because the def now DOES declare the geometry (#864) and this is the part of it that still cannot be declared.',
      "optical baseline shift \u2014 a glyph's bounding box is rarely its visual center of mass, so an inline icon needs an optical shift (Material Symbols moves ~11.5% of the text size down, aligning the glyph center to the x-height rather than the box). That is a relationship between a glyph and the TEXT beside it, resolved at render; Figma centers a node in its parent frame and has nowhere to state it. The recurring polish bug the brief names \u2014 an icon sitting a pixel low beside its label \u2014 lives entirely in this gap.",
      "stroke weight \u2014 a constant tuned to the typeface rather than a per-icon value (Atlassian's 1.5px matches its 1.5px typeface stroke by the squint test; Material's baseline is 2dp). It is a property of the SET, so no single glyph component can carry it. `PartDef.strokeWidth` (#1266) is the field a box's stroke binds, and `validateComponentDef` refuses it on a `vector`: this set's glyphs are filled outlines, so their weight is drawn into the path and a bound stroke would reach no node.",
      'label routing \u2014 the whole a11y contract is a DOM shape: present makes `role="img"` + `aria-label`, absent makes `aria-hidden="true"` (\xA76). Figma has no accessibility tree, so the one prop that decides whether this component is announced at all is invisible to the Figma leg. It is not a variant either \u2014 the meaningful/decorative split is semantic, not visual, and the two cells are pixel-identical.',
      "touch-target \u2014 the target-size floor for an icon-only control is the WRAPPER's, not the glyph's: at least 24\xD724 (SC 2.5.8, AA), and 44\xD744 on touch (SC 2.5.5, AAA; 48 on Android). A 16px glyph cannot be its own target, and this component must not grow to pretend otherwise; the Button supplies the padding while the glyph stays visually tight. Stated here because the temptation is to fix the target size where the small thing is.",
      'RTL mirroring \u2014 directional glyphs mirror under `dir="rtl"` (back/forward, send, undo, list indentation) and non-directional ones must not (a clock stays a clock). The robust mechanism is per-glyph `isMirroredInRTL` metadata so the component automates the transform, which makes it a fact about each member of the set rather than about this def \u2014 and Figma carries no such flag.',
      "delivery \u2014 inline SVG vs sprite vs variable WOFF2 is a genuine engineering trade with accessibility, bundle and rendering consequences (\xA711), and it is downstream of the design language rather than of this def: a locked fixed-stroke system ships tree-shaken inline SVG, a multi-axis one ships a variable font. The Figma leg is indifferent to all of it, and so is the token tier."
    ]
  },
  // `name` ALONE — one member per glyph, each carrying its own outline (#864, FPO added 40th in #1012).
  // This used to be `['size']`, four members that were four empty squares.
  //
  // Still the def #795's `variantAxes` doc comment points at, and now more sharply: it projects along
  // `name` and PAINTS along `tone`, so the projected axis set and the def's axis set are disjoint. That is
  // exactly the distinction the field was created for — the axes that become the Figma grid, not the axes
  // the def has — and this is the first def where the two share no member at all.
  //
  // `size` is not here and is not in `variants` either; see the `variants` comment for why the second
  // follows from the first rather than being a separate decision.
  //
  // MEASURED, and asserted in `test.ts` rather than pinned here (#1323): the set no longer fits ONE paste
  // chunk. Its single-shot payload exceeds `SET_CHUNK_BYTES`, so `planSetChunks` splits it and the first
  // chunk packs to ~99% of budget. It was one chunk until #1316 grew the vocabulary past the threshold;
  // the chunk count is a measured property of the current set against the budget, not a frozen number,
  // which is why the check lives in a test that fails by name the day a member tips it into a new chunk.
  // Each glyph's path still travels once, which is the property that made this shape the cheap one —
  // enumerating size as well would ship every path four times for members that are the same drawing at
  // four scales.
  //
  // No `stateAxis`: `states` is `[]`, so there is nothing to project. No `swaps`: an icon has no slot
  // — it IS what fills someone else's. `booleans` is stated-empty rather than omitted, which is the
  // established way this schema says "considered, and none survive".
  //
  // `emitAsComponents` — the one place icon differs from every control def at MATERIALIZATION (#1012). A
  // control wants its members combined into one COMPONENT_SET with a variant picker; an icon set does
  // not. A designer reaches for `search`, not for a whole-vocabulary variant set they must then select a `name=` out
  // of — and Figma folds the slash in `icon/search` into an assets-panel FOLDER, which is the delivery
  // an icon library is supposed to have. So each member is left as its own top-level `icon/<glyph>`
  // component instead of being combined. This changes only how the plugin writes the SAME projected
  // members — the flag never enters the plan, so it moves no plan stamp; the surface is still the members
  // `variantAxes: ['name']` enumerates.
  figmaProperties: {
    variantAxes: ["name"],
    booleans: {},
    emitAsComponents: true
  },
  accessibility: {
    role: 'img when meaningful (with aria-label); none when decorative (aria-hidden="true")',
    wcag: [
      "1.1.1 Non-text Content (meaningful \u2192 text alternative; decorative \u2192 hidden from AT)",
      "1.4.1 Use of Color (an icon must never be the sole carrier of meaning color conveys)",
      "1.4.11 Non-text Contrast (a meaningful icon clears 3:1; a decorative one is exempt)",
      "2.5.8 Target Size (the WRAPPING control's concern, never the glyph's)"
    ],
    focus: "None of its own. An icon takes no focus; the control wrapping it does, and the focus ring is that control's (see `focus-ring`).",
    aria: 'A three-way matrix, and almost every icon bug is picking the wrong cell. DECORATIVE (text beside it, or ornament): omit `label` \u2192 `aria-hidden="true"`; this is the default. MEANINGFUL STANDALONE: `label` \u2192 `role="img"` + `aria-label`, and `role="img"` is MANDATORY \u2014 without it many screen readers ignore an `aria-label` on a raw `<svg>` and leave the user on an unannounced stop. INSIDE AN ICON-ONLY CONTROL: the wrapper carries the name and the glyph stays `aria-hidden`; reversing it causes ghost focus rings and unpredictable AT behavior. Never name both.'
  },
  content: {
    labelPattern: `When meaningful: a concise noun or verb naming the concept or the action it fires \u2014 "Search", "Delete" \u2014 matching what the glyph depicts, not the asset's internal name. When decorative: no name at all.`,
    metaphorRules: "Rely on globally established metaphors rather than local idioms; keep them minimal and additive, because a complex metaphor is illegible at 16px; avoid depicting physical hardware, which dates the moment the device does. The floppy-disk save glyph endures precisely because its meaning outlived the object."
  },
  docs: {
    usage: "Use to reinforce meaning, speed scanning, or anchor an action alongside text. Few icons are universally understood, so a glyph beside a visible label is a wayfinding anchor for returning users rather than a replacement for the words. Pick a size from the enum, leave `tone` at `inherit` unless the glyph must resist its host's cascade, and decide the one question that matters: is this glyph meaningful (give it a `label`) or decorative (do not)? For an icon-only action, reach for Button or IconButton and leave this glyph unnamed inside it.",
    do: [
      "Leave `label` off when the icon sits beside its own text \u2014 decorative is the default and the most common correct answer",
      'Give a meaningful standalone icon a `label`, which supplies both `role="img"` and the name',
      "Pick a size from the enum so the glyph lands on the pixel grid",
      "Let `tone` inherit unless an inherited color would make the glyph illegible"
    ],
    dont: [
      "Make the icon the interactive element \u2014 an icon-only control is a Button, and the name and the hit target (at least 24\xD724; 44\xD744 on touch) live on the wrapper",
      "Name both the wrapper and the glyph (it double-announces, and causes ghost focus rings)",
      "Scale a glyph to an arbitrary size \u2014 off-grid scaling blurs strokes between hardware pixels",
      "Pass a raw hex color \u2014 that moves contrast enforcement out to the call site",
      "Invent a one-off glyph outside the set; the set is the discipline and an ad-hoc glyph is debt"
    ]
  },
  ai: {
    primaryPurpose: "Render a set glyph at a grid size, routed correctly into or out of the accessibility tree.",
    whenToUse: "Beside a label to reinforce meaning, or standalone with a `label` when the glyph itself carries the meaning.",
    avoidWhen: "As an interactive element. An icon-only action is a Button (or IconButton) with an accessible name and a hit target of at least 24\xD724 (44\xD744 on touch), containing an unnamed glyph \u2014 reaching for Icon there puts the affordance on a node with no focus management, no keyboard listeners and no touch target. Also avoid it as an illustration (larger, narrative, its own component), a logo, or a thumbnail; and avoid naming a glyph that sits beside its own text.",
    // The hosts whose slots usually carry an icon, plus `field-message`, whose `icon` prop overrides its
    // status glyph in code. A reverse list, so it lives here (#1700).
    commonPartners: ["button", "icon-button", "text-field", "field-message", "select", "tag"],
    triggerKeywords: ["icon", "glyph", "symbol", "svg", "chevron", "arrow", "search icon", "close icon"],
    generationPriority: 2
  },
  composition: {
    // Nests nothing (#1700). The hosts that swap it into a slot are in `ai.commonPartners`.
    composesWith: [],
    alternativeTo: [],
    replacesPatterns: ["legacy icon fonts", "ad-hoc inline SVGs outside the set"],
    // `avatar` from brief §12 (an icon is Avatar's image-load fallback). `tag` left for `ai.commonPartners`
    // when it was built (2026-09-27): its leading slot carries an icon.
    planned: ["link", "menu", "illustration", "logo", "thumbnail", "emoji", "avatar"]
  },
  // Brief §8.
  motion: {
    enter: "none",
    exit: "none",
    reduceMotion: "Static \u2014 an icon has no motion of its own. A glyph moves only as part of its host's state transition (a chevron rotating on expand, an outlined glyph cross-fading to filled), and the host owns that motion and its reduced-motion behavior."
  },
  notes: {
    contested: [
      "Delivery \u2014 tree-shaken inline SVG (the default for a locked fixed-stroke language) vs a variable WOFF2 font (for multi-axis / optical-sizing systems) vs an SVG sprite. Legacy ligature/PUA icon fonts are settled as dead; the FONT model is not (\xA711).",
      "Sizing model \u2014 px grid vs `em`. This def binds the grid; an `em` treatment belongs on the container an icon sits inline with.",
      "Taxonomy \u2014 literal glyph names (`chevron-right`) vs semantic ones (`next`). The field's resolution, adopted here: literal names for the immutable primitives, semantic names at an alias layer above them."
    ],
    unverified: [
      "The brief flags an externally-supplied figure that font glyphs render materially faster than inline SVG in high-frame-rate tests, pending source backing. Nothing in this def depends on it."
    ],
    // Brief §13, the pendulum the practice adopts.
    evolution: [
      "Delivery has swung between network and rendering optimization. Under HTTP/1.1, connection limits favored CSS sprites and legacy icon fonts to cut requests. HTTP/2 multiplexing removed that bottleneck, and the field moved to tree-shaken inline SVG to fix the accessibility and flash-of-unstyled-content failures of font hacks. Now inline-SVG DOM weight is the bottleneck in dense interfaces, and parametric design (optical sizing, responsive weight, smooth micro-motion) pulls toward a hybrid: variable WOFF2 fonts for flexibility and a small DOM, beside ever-better tree-shaking for SVG.",
      "Multi-tone and variable fill became a state pair (outlined and filled) rather than two unrelated glyphs, and the set-as-versioned-API discipline hardened into alias maps, deprecation entry points and rename codemods. The consensus the practice adopts: the delivery mechanism is secondary to a strict, declarative, correctly labeled accessible API."
    ]
  }
};

// ../../packages/engine/component-glyphs.ts
var SPINNER_GEOMETRY = {
  /** The artboard, in units. Every glyph in the engine is drawn on 24. */
  viewBox: 24,
  /** The centerline radius of the ring and the arc. */
  radius: 10,
  /** The band's thickness at the 24-unit artboard — 2px at 24px, scaling with the rendered size. */
  stroke: 2,
  /** The head arc's length as a fraction of the circumference, measured on the centerline. Round caps add
   *  half the stroke at each end, exactly as a `stroke-dasharray` dash with `stroke-linecap: round` does. */
  arc: 0.33,
  /** The track's opacity: a faint full ring at 20% of the spinner's own color. */
  track: 0.2
};
var r3 = (n) => {
  const v = Math.round(n * 1e3) / 1e3;
  return String(Object.is(v, -0) ? 0 : v);
};
var spinnerLayers = (g = SPINNER_GEOMETRY) => {
  const c = g.viewBox / 2;
  const ro = g.radius + g.stroke / 2;
  const ri = g.radius - g.stroke / 2;
  const cap = g.stroke / 2;
  const at2 = (r, deg) => {
    const t = deg * Math.PI / 180;
    return `${r3(c + r * Math.cos(t))} ${r3(c + r * Math.sin(t))}`;
  };
  const track = `M${r3(c + ro)} ${r3(c)}A${r3(ro)} ${r3(ro)} 0 1 1 ${r3(c - ro)} ${r3(c)}A${r3(ro)} ${r3(ro)} 0 1 1 ${r3(c + ro)} ${r3(c)}ZM${r3(c + ri)} ${r3(c)}A${r3(ri)} ${r3(ri)} 0 1 1 ${r3(c - ri)} ${r3(c)}A${r3(ri)} ${r3(ri)} 0 1 1 ${r3(c + ri)} ${r3(c)}Z`;
  const a0 = -90;
  const a1 = -90 + g.arc * 360;
  const large = g.arc > 0.5 ? 1 : 0;
  const head = `M${at2(ro, a0)}A${r3(ro)} ${r3(ro)} 0 ${large} 1 ${at2(ro, a1)}A${r3(cap)} ${r3(cap)} 0 0 1 ${at2(ri, a1)}A${r3(ri)} ${r3(ri)} 0 ${large} 0 ${at2(ri, a0)}A${r3(cap)} ${r3(cap)} 0 0 1 ${at2(ro, a0)}Z`;
  return [
    { id: "track", d: track, fillRule: "evenodd", opacity: g.track },
    { id: "arc", d: head }
  ];
};
var COMPONENT_GLYPHS = {
  spinner: spinnerLayers()
};

// ../../packages/engine/anatomy-figma.ts
var NEST_TARGET_SLOT = "__NEST_TARGET__";
var nestMissAdvice = (found, target) => {
  switch (found) {
    case "COMPONENT_SET":
      return "found a COMPONENT_SET of that name and the def names no variant for it; nothing built \u2014 an exposed nest needs a nested property this write does not create yet, so declare nest-fixed with a coordinate, or publish one variant as its own component";
    case "INSTANCE":
      return "found an INSTANCE of that name, not a component; nothing built \u2014 nest the main component instead of a copy of it";
    case "OTHER":
      return "found a node of that name that is not a component; nothing built \u2014 rename it, or publish the component under this name";
    case "ABSENT":
      return `not in this file \u2014 build ${target ?? NEST_TARGET_SLOT} FIRST (it is nested here, and the plugin builds one component per run), then rebuild this one`;
  }
};
var nestVariantMissAdvice = (wanted, members) => "found a COMPONENT_SET of that name, and no member matching " + Object.entries(wanted).map(([k, v]) => k + "=" + v).join(", ") + "; nothing built \u2014 the def asks for a variant this set does not have. Members: " + (members.length ? members.join(" | ") : "(none)") + ". Fix the coordinate in the def, or add the variant to the set \u2014 nothing is nested by guess, because a valid wrong ring looks like a success";
var nestVariantMissAdviceSrc = () => nestVariantMissAdvice.toString();
var nestVariantMatch = (wanted, members) => {
  const hits = members.filter((m) => {
    const coord = {};
    for (const kv of m.split(", ")) {
      const i = kv.indexOf("=");
      if (i > 0) coord[kv.slice(0, i)] = kv.slice(i + 1);
    }
    const keys = Object.keys(coord);
    return keys.length === Object.keys(wanted).length && keys.every((k) => coord[k] === wanted[k]);
  });
  return hits.length === 1 ? hits[0] : null;
};
var nestVariantMatchSrc = () => nestVariantMatch.toString();
var resolveNestMember = (sets, target, wanted, match, unmatched) => {
  const named = sets.filter((s) => s.name === target);
  if (!named.length) return null;
  if (named.length > 1) return { miss: ".nestTarget -> " + target + " (found " + named.length + " COMPONENT_SETs named " + target + "; nothing built \u2014 a nest resolves only inside the one set its def names. Rename or remove the stale copy, then rebuild)" };
  const kids = named[0].children || [];
  const members = kids.map((c) => c.name || "");
  const hit = match(wanted, members);
  const member = hit ? kids.filter((c) => c.name === hit)[0] : void 0;
  if (member && member.type === "COMPONENT" && member.createInstance) return { member };
  return { miss: ".nestVariant -> " + target + " (" + (hit ? "matched member " + hit + " of " + target + " is not a component; nothing built" : unmatched(wanted, members)) + ")" };
};
var resolveNestMemberSrc = () => resolveNestMember.toString();
var SWAP_TARGET_SLOT = "__SWAP_TARGET__";
var swapMissAdvice = (found, target) => {
  const name = target ?? SWAP_TARGET_SLOT;
  switch (found) {
    case "ABSENT":
      return `not in this file \u2014 build ${name} FIRST (it fills a slot here, and the plugin builds one component per run), then rebuild this one`;
    case "COMPONENT_SET":
      return `found a COMPONENT_SET named ${name}, and a swap target has to be ONE component \u2014 an INSTANCE_SWAP default is a single node id, and a set is many members. Publish one member of ${name} as its own component under that name, or nominate a member instead of the set`;
    case "INSTANCE":
      return `found an INSTANCE named ${name}, not a component \u2014 swap in the main component instead of a copy of it, or publish ${name} under this name`;
    case "OTHER":
      return `found a node named ${name} that is not a component \u2014 rename it, or publish the component this slot needs under the name ${name}`;
  }
};
var SWAP_PLACEHOLDER = "built as a placeholder frame, which is a box you can still fill by hand";
var SWAP_NO_PROPERTY = "the property is NOT created, so this slot is not swappable at all \u2014 Figma demands a node id for an INSTANCE_SWAP default and refuses the component key, an empty string and null alike";
var PAYLOAD_PREAMBLE = `const vars=await figma.variables.getLocalVariablesAsync();
// KEYED BY TAIL, NOT BY NAME (#1097). A plan's bound names are root-relative (see \`figmaVarName\`), and
// every variable in the file is \`<root>/<tail>\`, so the map has to meet the plan in tail space. The split
// is POSITIONAL \u2014 it drops the first segment whatever that brand called it \u2014 because a reader that spelled
// a root would work for the brand it was written against and silently bind nothing for a client's own
// namespace, which is Prism2's \`pds/\` bug arriving in a new decade. \`figma-names.ts\`'s \`tailOf\` is the
// same three lines; it cannot be imported into a generated payload string, so this is a second spelling
// by necessity rather than by choice.
//
// A tail COLLISION means the file holds two brands' variables under one tail (a shared library plus a
// local set), and it is reported rather than resolved: last-write-wins would bind the wrong brand's
// variable, which paints and looks right.
const seenTail=new Map();
const byName=new Map();
for(const v of vars){const t=v.name.split('/').slice(1).join('/');if(!t)continue;if(seenTail.has(t))seenTail.get(t).push(v.name);else seenTail.set(t,[v.name]);byName.set(t,v);}
const styles=await figma.getLocalTextStylesAsync();
const styleByName=new Map(styles.map(s=>[s.name,s]));
const effects=await figma.getLocalEffectStylesAsync();
const effectByName=new Map(effects.map(s=>[s.name,s]));
// Swap targets are resolved by NAME across the whole file, not just the current page \u2014 the FPO icon
// lives wherever the file's author put it, and \`currentPage.findAll\` would miss it silently.
await figma.loadAllPagesAsync();
const comps=figma.root.findAllWithCriteria({types:['COMPONENT']});
const compByName=new Map(comps.map(c=>[c.name,c]));
// A SECOND criteria call, sets only (#681). Two calls rather than one widened call for the reason the
// executor's port states: the COMPONENT map is instantiated from and a ComponentSetNode has no
// createInstance, so one map per node type keeps each read honest about what it holds.
// A LIST, not a name->set map (#1781): a map keeps one set per name and drops the rest, and two sets under
// the exact name a def targets is an ambiguity to REPORT. \`resolveNestMember\` filters it by exact name.
const compSets=figma.root.findAllWithCriteria({types:['COMPONENT_SET']});
// The two shared miss helpers, shipped as SOURCE rather than as baked strings: both take runtime
// arguments (the coordinate, the member list) that only exist in the live file. One definition, in
// anatomy-figma.ts, called by both executors \u2014 which is what stops the wording drifting.
const nestVariantMatch=${nestVariantMatchSrc()};
const nestVariantMissAdvice=${nestVariantMissAdviceSrc()};
// WHICH member a nest instantiates, decided ONCE for both executors (#1781): out of the named set's own
// children, never re-looked-up by member name across the file, and never from a set whose name only
// contains or prefixes the target. Shipped as source for the same reason as the two helpers above.
const resolveNestMember=${resolveNestMemberSrc()};
// THE SWAP MISS, FOUR WAYS (#1288) \u2014 the same table the plugin's two \`INSTANCE_SWAP\` consumers report
// through, reaching this payload by the OTHER of the two mechanisms in this preamble. The helpers above
// ship their SOURCE because they take runtime arguments; these four sentences take only the target, so
// they are baked as pre-computed strings and the target arrives as \`SWAP_TARGET_SLOT\`, substituted below.
// Same split \`nestMissAdvice\` uses one branch down, and for the same reason.
//
// ONE SPELLING FOR TWO CONSUMERS, which is why this is a preamble helper rather than an inline ternary like
// the nest path's. \`build\`'s INSTANCE_SWAP branch and \`PAYLOAD_DECLARE_PROPS\`'s property loop both diagnose
// the same lookup failure, and a second copy of the selection is a second place for it to rot.
//
// \`figma.root.findAll\` AT PASTE TIME, on the failure path only. #1288 was filed believing the paste path
// could not do this \u2014 that it "composes its advice at EMIT time and has no root.findAll". Emit time fixes
// only WHICH strings ship; the payload runs in the file, so the search is available here exactly as it is
// in the plugin. Failure path only for the reason the nest path states: a cold build already runs thousands
// of subtree searches and the happy path must not pay for a diagnosis it never prints.
const swapAdvice=(name)=>{const other=figma.root.findAll(x=>x.name===name)[0];return (!other?${JSON.stringify(swapMissAdvice("ABSENT"))}:other.type==='COMPONENT_SET'?${JSON.stringify(swapMissAdvice("COMPONENT_SET"))}:other.type==='INSTANCE'?${JSON.stringify(swapMissAdvice("INSTANCE"))}:${JSON.stringify(swapMissAdvice("OTHER"))}).split(${JSON.stringify(SWAP_TARGET_SLOT)}).join(name);};
const misses=[];
for(const [t,names] of seenTail) if(names.length>1) misses.push('AMBIGUOUS variable tail '+t+' \u2014 the file carries it under '+names.length+' brand roots ('+names.join(', ')+'), so a plan binding it cannot say which; remove or relink one of the sets');`;
var MIN_LINES_SLOT = "__MIN_LINES__";
var PIN_LIFT_SLOT = "__PIN_LIFT__";
var PIN_SLOT = "__PIN__";
var CORNER_SLOT = "__CORNER__";
var PLACEMENT_SLOT = "__PLACEMENT__";
var GRADIENT_SLOT = "__GRADIENT__";
var GRADIENT_CLAIM_SLOT = "__GRADIENT_CLAIM__";
var PAYLOAD_BUILD = `const __expose=[];
// #1378 \u2014 DRAIN THE EXPOSURE QUEUE, called immediately after every \`createComponentFromNode\` and nowhere
// else. That call is what puts the nested instances inside a component, which is Figma's precondition for
// \`isExposedInstance\`; the conversion is in place, so the handles collected during the build are still the
// same nodes. Cleared on the way out, so one member's queue never reaches the next member's marking pass \u2014
// the payload's \`build\` threads no per-member collector, so the drain point is what keeps them separate.
// Per node and read back, matching the plugin executor: a refusal must cost one exposure, not the set.
const __exposeNow=(member)=>{
  for(const inst of __expose){
    try{inst.isExposedInstance=true;}
    catch(e){misses.push(member+'.nestExpose -> REFUSED ('+(e&&e.message?e.message:String(e))+')');continue;}
    if(inst.isExposedInstance!==true)misses.push(member+'.nestExpose -> DISCARDED (set true, reads '+String(inst.isExposedInstance)+'; the nested instance\\'s properties will not surface on the parent)');
  }
  __expose.length=0;
};
// #1393 \u2014 CLAIM THE DEFAULTS, the paste twin of the plugin executor's \`claimDefaults\` (#865), kept in
// LOCKSTEP with it: same properties, same values, same carve-outs. \`createFrame()\` hands back an opaque
// white box and \`combineAsVariants()\` a dressed set, so every property no plan claimed survived as a Figma
// default; this path had no such pass and left the white on every unclaimed or unresolvable fill. Runs LAST
// in \`build\`, so a declared value is never clobbered; the PLAN decides "claimed", never the live node.
// \`n\` is null for the SET, whose border and radius are claimed as the variant-set frame (#1430): WRITTEN
// from \`SET_BORDER\` when the set comes back with no stroke paint, KEPT when the host already stroked it.
// Each write is guarded and reports rather than throws, so a refused default costs a miss, not the member.
// FIGMA'S OWN COMPONENT-SET BORDER, written because the API does not supply its paint. Probed live
// (2026-09-27): \`combineAsVariants\` returns strokes [], weight 1, INSIDE, dashPattern [10,5], radius 5,
// fills [] \u2014 a dash with nothing to draw. Twin of \`SET_BORDER\` in the plugin's write-components.ts.
const SET_BORDER={r:0x97/255,g:0x47/255,b:1,weight:1,align:'INSIDE',dash:[10,5],radius:5};
const claimDefaults=(node,n,mode,layerOp)=>{
  const t=node.type,isSet=!n,m=n||{},P=m.paints||{},B=m.bound||{},where=n?n.name:'set';
  // An INSTANCE is claimed by its nomination and a COMPONENT by the frame it was made from.
  if(t==='INSTANCE'||t==='COMPONENT')return;
  const set=(k,v)=>{try{node[k]=v;}catch(err){misses.push(where+'.'+k+' -> UNCLAIMED and could not be neutralized ('+err.message+"); it keeps Figma's default \u2014 #865");}};
  const keep=(k,f)=>{const c=node[k];set(k,c===undefined?f:Array.isArray(c)?c.slice():c);};
  // Decided ONCE, before any write, so the ink and corner branches agree: a set the host returns with NO
  // stroke paint gets \`SET_BORDER\` written; a set it returns already stroked keeps its own (\`keep\`).
  const S=SET_BORDER,bareSet=isSet&&!(node.strokes||[]).length,w=(k,v,f)=>bareSet?set(k,v):keep(k,f);
  set('visible',m.visible!=null?m.visible:true);
  // An IMPORTED glyph layer's opacity is declared by \`glyphSvg\` (#1670: the spinner's track is a layer at 0.2),
  // like its fills \u2014 so it is claimed by the document, and writing 1 here would erase it.
  if(!m.zeroOpacity)set('opacity',mode==='imported'&&layerOp!=null?layerOp:1);
  if(!m.effectStyle)set('effects',[]);
  set('blendMode','PASS_THROUGH');set('rotation',0);set('layoutAlign','INHERIT');set('layoutGrow',m.layoutGrow||0);
  if(mode==='created'){
    set('constraints',{horizontal:'MIN',vertical:'MIN'});
    if(isSet){set('fills',[]);w('strokes',[{type:'SOLID',color:{r:S.r,g:S.g,b:S.b}}],[]);w('strokeWeight',S.weight,1);w('strokeAlign',S.align,'INSIDE');w('dashPattern',S.dash.slice(),[]);}
    else{
      // A TEXT fill has no neutral value \u2014 \`[]\` is invisible text \u2014 so an unpainted label is REPORTED.
      if(!P.fills${GRADIENT_CLAIM_SLOT}){if(t==='TEXT')misses.push(where+'.fills -> UNCLAIMED on a TEXT node (reported, not neutralized: [] is invisible text; the def must declare a text paint) \u2014 #865');else set('fills',[]);}
      // The weight is gated on the plan's binding (#1228): a literal write after the bind loop UNBINDS it.
      if(!P.strokes){set('strokes',[]);if(!('strokeWeight' in B))set('strokeWeight',1);set('strokeAlign','INSIDE');}
      set('dashPattern',[]);
    }
  }
  if(t==='FRAME'||t==='COMPONENT_SET'){
    for(const k of ['topLeftRadius','topRightRadius','bottomLeftRadius','bottomRightRadius'])if(isSet)w(k,S.radius,0);else if(!(k in B))set(k,0);
    set('clipsContent',!!m.clipsContent);
    // Parent-side auto-layout properties apply only on an auto-layout frame, and Figma THROWS on
    // \`strokesIncludedInLayout\` elsewhere \u2014 so gated on the PLAN's \`layoutMode\`.
    if(m.layoutMode){for(const k of ['itemSpacing','paddingLeft','paddingRight','paddingTop','paddingBottom'])if(!(k in B||k in(m.paddingPx||B)))set(k,0);set('strokesIncludedInLayout',false);}
  }
  // The last two DETACH an applied text style on the host (#1567) \u2014 \`build\` re-applies it right after.
  if(t==='TEXT'){if(!m.textAlignVertical)set('textAlignVertical','TOP');set('textAlignHorizontal','LEFT');set('textAutoResize',m.textAutoResize||'WIDTH_AND_HEIGHT');set('textTruncation','DISABLED');set('paragraphSpacing',0);set('leadingTrim','NONE');}
};
const build=async(n)=>{
  let node;
  if(n.type==='TEXT'){node=figma.createText();}
  else if(n.type==='INSTANCE_SWAP'){
    // A slot with no resolvable target becomes a placeholder FRAME \u2014 but it says so. #482 shipped
    // the frame WITHOUT saying so, because there was no INSTANCE_SWAP branch at all: the plan
    // declared swappable slots and the paste built empty 24x24 boxes.
    const target=n.swapTarget?compByName.get(n.swapTarget):undefined;
    if(!n.swapTarget)misses.push(n.name+'.swapTarget -> (none nominated; built as a placeholder frame)');
    // DIAGNOSE, then report (#1288) \u2014 was the bare name and nothing else, which said neither what the file
    // holds under it nor what to do about it. Composed BYTE-IDENTICALLY to the plugin's node loop: same
    // prefix, same advice, same one consequence clause. That is not tidiness \u2014 \`test.ts\`'s parity gate
    // compares the two executors' miss strings for equality, so this is the spelling that gate reads.
    else if(!target)misses.push(n.name+'.swapTarget -> '+n.swapTarget+' ('+swapAdvice(n.swapTarget)+'; '+${JSON.stringify(SWAP_PLACEHOLDER)}+')');
    node=target?target.createInstance():figma.createFrame();
  }
  else if(n.type==='NESTED_INSTANCE'){
    // A SHARED component the file must already have \u2014 the first node type that can fail because of
    // what is absent from the FILE rather than from the plan.
    // NO placeholder frame, and this is the opposite call from INSTANCE_SWAP above deliberately. An
    // unstroked frame in a focus ring's place is invisible and reads as a ring that built fine; a slot's
    // placeholder is a box a designer can still fill. So a missing ring builds NOTHING and says so.
    const nested=compByName.get(n.nestTarget);
    // A SET the def named a coordinate in (#681). Checked only when the plain-component lookup missed:
    // a component and a set can share a name, and the component needs no coordinate to be unambiguous.
    // THE SET AND ITS MEMBER, resolved together (#1781): out of the named set's own children, never by member
    // name across the file. null = no set of that name; else a member, or a miss to report and build nothing.
    const res=!nested&&n.nestVariant?resolveNestMember(compSets,n.nestTarget,n.nestVariant,nestVariantMatch,nestVariantMissAdvice):null;
    if(res&&res.miss){misses.push(n.name+res.miss);return null;}
    // The MEMBER is instantiated, never the set \u2014 Figma has no instance-of-a-set.
    if(res){node=res.member.createInstance();}
    else if(!nested){
      // DIAGNOSE before reporting (#681): a second search, by name across every node type, so the miss
      // can say what is actually in the file. Only on the failure path \u2014 the happy path pays nothing.
      // A SET still reaches here only when the plan carried NO coordinate at all (no \`nestVariant\`): since
      // #1330 even a \`nest-exposed\` part projects a default coordinate, so a real def never lands here with
      // a set \u2014 this is the defensive path for a coordinate-free plan, which the COMPONENT_SET advice names.
      const other=figma.root.findAll(x=>x.name===n.nestTarget)[0];
      const found=(!other?${JSON.stringify(nestMissAdvice("ABSENT"))}:other.type==='COMPONENT_SET'?${JSON.stringify(nestMissAdvice("COMPONENT_SET"))}:other.type==='INSTANCE'?${JSON.stringify(nestMissAdvice("INSTANCE"))}:${JSON.stringify(nestMissAdvice("OTHER"))}).split(${JSON.stringify(NEST_TARGET_SLOT)}).join(n.nestTarget);
      misses.push(n.name+'.nestTarget -> '+n.nestTarget+' ('+found+')');return null;
    }
    else{node=nested.createInstance();}
    // EXPOSE (#1330), DEFERRED (#1378). A \`nest-exposed\` node carries \`nestExpose\`; the instance must be
    // marked exposed so the nested component's properties surface at the parent's level (Figma exposes them
    // wholesale \u2014 the named axes are the engine's public-surface intent, resolved per surface). Guarded on
    // \`nestExpose\`, so a \`nest-fixed\` instance is never marked.
    //
    // The write itself is NOT here, and the comment this replaces is why: it asserted \`isExposedInstance\` is
    // writeable "on a primary instance inside a component/set, which is exactly what a member's nested
    // instance is after combine" \u2014 true, and then wrote it during the build, when \`build\` has assembled a
    // detached subtree whose root is still a plain frame. Figma refuses with
    // "Instance must be contained within a component or component set to be exposed." and the whole set dies.
    // So: collected, and written by \`__exposeNow()\` after \`createComponentFromNode\`. Twin of the plugin
    // executor's collector, and the twin is the point \u2014 this half was never gated (#1377), so the plugin's
    // round-trip caught the identical defect here only by reading.
    if(node&&n.nestExpose&&n.nestExpose.length)__expose.push(node);
  }
  else if(n.type==='GLYPH'){
    // THE GLYPH (#864). The only node here whose content is GEOMETRY rather than a box, a binding or a
    // nomination \u2014 and so also the only one that can build successfully and contain nothing, which is
    // exactly what #864 was: four artboards created without throwing.
    //
    // FIGMA'S OWN SVG IMPORTER, not \`createVector\` + \`vectorPaths\`, and the two measurements behind that
    // are on \`glyphSvg\`. It returns a FRAME sized to the document's artboard with the outline inside, so
    // the node the plan names is the ARTBOARD and the glyph is its child.
    node=figma.createNodeFromSvg(n.glyphSvg);
    // THE READ-BACK THE WHOLE ISSUE TURNS ON, and \`docs/34\`'s trap stated in its own words: asserting
    // "the node has children" passes on an empty group and "a vector exists" passes on a zero-area path.
    // So the quantity is the one a human would check \u2014 a VECTOR with a non-zero box \u2014 and it is asked of
    // the built subtree rather than of the document we submitted.
    const drawn=(node.findAll?node.findAll(x=>x.type==='VECTOR'):[]).filter(v=>v.width>0&&v.height>0);
    if(!drawn.length)misses.push(n.name+'.glyphSvg -> NO VECTOR (submitted '+n.glyphSvg.length+' chars of SVG; the import produced no outline with area, so the member would be an empty artboard \u2014 #864)');
    // THE ARTBOARD, read back too, because an importer is free to size its result to the INK. That is
    // the second half of #864's own class: \`minus\` is 14\xD72 of drawing on a 24\xD724 artboard, and a member
    // sized to the drawing stretches non-uniformly into the square its host binds.
    if(n.glyphViewBox&&(node.width!==n.glyphViewBox[0]||node.height!==n.glyphViewBox[1]))misses.push(n.name+'.glyphViewBox -> '+n.glyphViewBox[0]+'x'+n.glyphViewBox[1]+' (the imported frame reads '+node.width+'x'+node.height+'; the glyph was sized to its ink rather than to its artboard, so every host binding a square would distort it)');
    // SCALE rather than the importer's default, on the OUTLINE and not on the frame. The frame is resized
    // by whoever instances it \u2014 a host binds \`size.{size}.icon\` onto its own slot \u2014 and a child left at
    // Figma's MIN/MIN constraint keeps the 24px it was drawn at, so a 16px instance would show the
    // top-left corner of the glyph. This is the one property of the import we override.
    for(const v of drawn)v.constraints={horizontal:'SCALE',vertical:'SCALE'};
    // THE LITERAL GLYPH SIZE (#1340). A non-root glyph whose def states \`glyphPx\` is not sized by an
    // instancing host and binds no \`size\` variable, so the frame stays at its 24px import \u2014 a stray small
    // mark in a large frame. Resize it to the literal here, AFTER the artboard read-back above (which sees
    // the import's own 24px) and BEFORE the bind loop below (this node binds no dimension, so the resize is
    // never cleared \u2014 resize-then-bind, the #500 order the anatomy gate checks). The outline's SCALE
    // constraints, just set, scale the drawn grid to fill the resized frame.
    if(n.glyphPx)node.resize(n.glyphPx,n.glyphPx);
  }
  else{node=figma.createFrame();node.clipsContent=n.clipsContent===true;}
  node.name=n.name;
  // NODE-VISIBILITY BOOLEAN (#1331): a hidden-by-default part is BUILT hidden, and its \`leading icon\`
  // switch (wired below) toggles it. Carried only when false, so every other node keeps Figma's default.
  if(n.visible===false)node.visible=false;
  // Before ANY dimension binding. See the header note \u2014 a locked node keeps only the last of the two.
  node.unlockAspectRatio();
  // HELD for the re-apply after \`claimDefaults\` (#1393/#1567), which detaches the style it touches.
  let sty=null;
  if(n.textStyle){
    const st=styleByName.get(n.textStyle);
    if(!st)misses.push(n.name+'.textStyle -> '+n.textStyle);
    else{
      // The STYLE'S OWN font, loaded before the style is applied. \`setTextStyleIdAsync\` pulls in a
      // family/style pair (\`Inter Semi Bold\`) that need not be the one \`createText\` starts on, and
      // Figma requires a font to be loaded before any text write. Loading here rather than once at the
      // top because the plan is what knows which styles it uses, and a hard-coded \`Inter Regular\`
      // would be a guess about a brand's typography.
      try{await figma.loadFontAsync(st.fontName);}catch(err){misses.push(n.name+'.font -> '+st.fontName.family+' '+st.fontName.style+' ('+err.message+')');}
      await node.setTextStyleIdAsync(st.id);
      sty=st;
    }
  }
  // The PLACEHOLDER, after the style so the copy is set on a node already carrying the right font.
  // Both orders work (measured \u2014 the style survives a prior \`characters\` write, and vice versa), so
  // this one is chosen for reading order rather than necessity.
  if(typeof n.characters==='string'){
    try{node.characters=n.characters;}catch(err){misses.push(n.name+'.characters -> '+JSON.stringify(n.characters)+' ('+err.message+')');}
    // READ BACK, same discipline as the bindings: a text node that silently kept nothing is exactly
    // the empty-label set this step exists to stop shipping.
    if(node.characters!==n.characters)misses.push(n.name+'.characters -> DISCARDED (set '+JSON.stringify(n.characters)+', reads '+JSON.stringify(node.characters)+')');
  }
  // AFTER the text style, because a text style does not carry it and could not overwrite it \u2014 \`TextStyle\`
  // has no alignment field on either axis (#1009, measured against \`@figma/plugin-typings\`). Ordered
  // here anyway so the sequence reads the same as every other text write in this function.
  // WRAPPING LABEL (#1424): auto-height lets a fixed-width text reflow \u2014 written only when the plan carries
  // it; \`claimDefaults\` writes WIDTH_AND_HEIGHT on every other TEXT node (#1393). One loop over the two,
  // in this order, because the chunked paste budget (\`SET_CHUNK_BYTES\`) is counted in the bytes of this code.
  for(const k of['textAlignVertical','textAutoResize'])if(n[k])node[k]=n[k];
  if(n.effectStyle){
    const ef=effectByName.get(n.effectStyle);
    if(!ef)misses.push(n.name+'.effectStyle -> '+n.effectStyle);
    else await node.setEffectStyleIdAsync(ef.id);
  }
  if(n.layoutMode){
${PLACEMENT_SLOT}
    // The five, in this order \u2014 one loop for the chunk byte budget (#1667), \`layoutMode\` first.
    for(const k of['layoutMode','primaryAxisAlignItems','counterAxisAlignItems','primaryAxisSizingMode','counterAxisSizingMode'])node[k]=n[k];
    // THE MIN-WIDTH FLOOR (#1343a, #1345). Inside the \`layoutMode\` branch because Figma accepts a
    // minimum width only on an auto-layout frame (the schema refuses \`minWidth\` on a layout-less box for
    // the same reason). Written only when the plan carries it, so every other frame is untouched. A floor
    // is never 0 (the schema refuses a non-positive one), so truthiness is the presence test.
    if(n.minWidth)node.minWidth=n.minWidth;
    // #1667 reserve beside a pinned icon (\`paddingPx\`), before the children; \`claimDefaults\` keeps it.
    Object.assign(node,n.paddingPx);
  }
  // WRAPPING LABEL (#1424), child-side: a text that FILLS its row's main axis so it reflows rather than
  // overflowing. Settable on any node (outside an auto-layout parent Figma ignores it), written only when
  // the plan carries it \u2014 \`claimDefaults\` below writes \`layoutGrow: 0\` on every other node (#1393).
  if(n.layoutGrow)node.layoutGrow=n.layoutGrow;
  // THE ASPECT-RATIO LOCK (#1316). Establish the proportion by resizing, THEN lock, THEN let the bind
  // loop bind the SINGLE nominal dimension \u2014 Figma derives the other axis from the lock. Ordered after
  // layoutMode and before the bind loop for that reason: a lock captured from the resized box, and a
  // single dimension bound afterward, so there is no second binding for the lock to evict.
  if(n.aspectRatio){node.resize(n.aspectRatio,1);node.lockAspectRatio();}
  // \`wrote\` is what was ACTUALLY set, which is not the same as what the plan declared \u2014 a name that
  // does not resolve is skipped below. The read-back iterates this rather than the declaration, so an
  // unresolved name reports its one true cause instead of also claiming Figma discarded a write that
  // was never attempted.
  const wrote=[];
  for(const [prop,varName] of Object.entries(n.bound)){
    const v=byName.get(varName);
    if(!v){misses.push(n.name+'.'+prop+' -> '+varName);continue;}
    node.setBoundVariable(prop,v);
    wrote.push(prop);
  }
  // PAINTS \u2014 a fourth API shape. \`setBoundVariableForPaint\` RETURNS a new paint rather than mutating
  // the node, so the result must be assigned back into a fills/strokes ARRAY; forgetting the
  // assignment is a no-op that throws nothing.
  const paint=(varName,where)=>{
    const v=byName.get(varName);
    if(!v){misses.push(n.name+'.'+where+' -> '+varName);return null;}
    return figma.variables.setBoundVariableForPaint({type:'SOLID',color:{r:0,g:0,b:0}},'color',v);
  };
  // Same reason as \`wrote\` above: only a paint that was actually assigned can have been discarded.
  const painted={};
  // Every bound paint is OPAQUE \u2014 a \`solid-tint\` hover's tint lives in the wash VARIABLE it binds (#1614,
  // #1646), because the host resets a bound paint's opacity whenever Apply Theme rewrites its variable.
  if(n.paints&&n.paints.fills){const p=paint(n.paints.fills,'fills');if(p){node.fills=[p];painted.fills=1;}
  // DECLARED BUT UNRESOLVABLE -> transparent, never Figma's opaque white (#1387, ported #1393). TEXT exempt:
  // \`[]\` is invisible text. Lockstep with the plugin executor's paints branch.
  else if(node.type!=='TEXT')node.fills=[];}
${GRADIENT_SLOT}
  if(n.paints&&n.paints.strokes){
    const p=paint(n.paints.strokes,'strokes');
    // A stroke variable with no strokeWeight paints nothing visible, so the border appearance would
    // bind correctly and render as no border at all.
    // GATED ON \`wrote\` (#1266). A part that declares \`strokeWidth\` has \`strokeWeight\` BOUND a few lines
    // up, and a literal assignment after a binding unbinds it \u2014 the border would then be the right paint
    // at a hardcoded 1px, re-theming on color and frozen on width. \`wrote\` rather than \`n.bound\`, because
    // a name that failed to resolve was skipped and still needs the fallback to paint something.
    // BORDER-BOX, and \`strokesIncludedInLayout\` defaults the other way. Left at Figma's default the
    // stroke is ADDED to the auto-layout size, so an outline button measured 62 wide where the filled
    // one measured 60 \u2014 swapping \`appearance\` moved the footprint, which is the one thing a variant
    // axis must not do. It showed up on the hug axis only: the fixed (bound) height absorbed the same
    // 2px silently, so a component with two fixed axes would have hidden this completely.
    // GATED ON AUTO-LAYOUT, the SECOND executor's copy of the plugin's fix: Figma only ALLOWS this
    // property on an auto-layout frame and THROWS on a \`layoutMode: NONE\` one \u2014 and this branch runs on
    // any STROKED node, which since PR-B includes the standalone focus ring (a stroked #1266, absolute,
    // layoutMode-NONE root frame). Unguarded, pasting the ring threw here on the real host and parked it.
    // The border-box motive is moot on an absolute node anyway: with no auto-layout there is no footprint
    // for the stroke to grow. \`&&node.layoutMode\` so an undefined layoutMode (a non-auto-layout frame) is
    // skipped, not compared true against \`'NONE'\`.
    if(p){node.strokes=[p];painted.strokes=1;if(!node.strokeWeight&&wrote.indexOf('strokeWeight')<0)node.strokeWeight=1;node.strokeAlign='INSIDE';if('strokesIncludedInLayout' in node&&node.layoutMode&&node.layoutMode!=='NONE')node.strokesIncludedInLayout=false;}
  }
  if(n.descendantFills){
    // The ink lives on the VECTORs INSIDE the node, never on the node itself \u2014 a fill on the wrapper is a
    // painted square behind the glyph. True of a swapped instance (a HOST pushing ink down) and true of a
    // \`GLYPH\`, whose wrapper is the artboard Figma's SVG importer returned; one field, one meaning, from
    // whichever side. Verified to survive createComponentFromNode.
    const vecs=node.findAll?node.findAll(x=>x.type==='VECTOR'):[];
    if(vecs.length===0)misses.push(n.name+'.descendantFills -> '+n.descendantFills+' (no VECTOR inside this node to paint)');
    for(const vec of vecs){const p=paint(n.descendantFills,'descendantFills');if(p)vec.fills=[p];}
  }
  // READ BACK. The name resolved and the setter did not throw, which is not the same as the binding
  // being there \u2014 see the header note. This closes \`misses[]\`'s blind spot generically, so the next
  // silently-discarded write is reported by the paste instead of being found by probing months later.
  // HOST TRUTH (#1332): a bound \`strokeWeight\` reads back on the four PER-SIDE keys, never the scalar
  // (the 2026-09-09 host-truth audit) \u2014 so a weight counts as held when EITHER the scalar OR all four
  // per-side keys are present, and a genuinely unbound weight is still reported.
  const got=node.boundVariables||{};
  const held=(prop)=>!!got[prop]||(prop==='strokeWeight'&&['strokeTopWeight','strokeRightWeight','strokeBottomWeight','strokeLeftWeight'].every(k=>!!got[k]));
  for(const prop of wrote)
    if(!held(prop))misses.push(n.name+'.'+prop+' -> DISCARDED (resolved, set, not retained)');
  // Paints read back too, and from the ARRAY rather than the node \u2014 a paint binding lives on the
  // paint object, so \`boundVariables.fills\` is not where it is.
  const boundPaint=(arr)=>!!(arr&&arr[0]&&arr[0].boundVariables&&arr[0].boundVariables.color);
  if(painted.fills&&!boundPaint(node.fills))misses.push(n.name+'.fills -> DISCARDED (paint set, not retained)');
  if(painted.strokes&&!boundPaint(node.strokes))misses.push(n.name+'.strokes -> DISCARDED (paint set, not retained)');
  // FLOW CHILDREN FIRST, absolute ones after \u2014 two passes, because an absolute child is positioned
  // against its parent's FINAL size and the parent hugs its flow content. Positioning inside one loop
  // would read \`node.width\` mid-append and silently make the result depend on the part's ORDER in the
  // def: correct while the ring is declared last, and quietly wrong the day someone reorders \`children\`.
  const absolutes=[],centered=[];
  // The BOX each centered child is measured on, by part name (#848). Collected in the flow pass because
  // that is where the sibling nodes exist; read in the centering pass after the parent has settled.
  const boxes=new Map();
  for(const c of n.children){
    const kid=await build(c);
    // A NESTED_INSTANCE whose shared component is missing returns null \u2014 the child is skipped and the
    // rest of the tree still builds, so the paste reports one precise miss instead of failing whole.
    if(!kid)continue;
    node.appendChild(kid);
    boxes.set(c.name,kid);
    if(c.absoluteInset)absolutes.push([c,kid]);
    if(c.absoluteCenter)centered.push([c,kid]);
    // Zero opacity, written straight rather than bound: a brand does not get to theme a label under a
    // spinner to half-visible. See the plan field's note.
    if(c.zeroOpacity)kid.opacity=0;
    // CROSS-AXIS CHILD FILL (#1503). Applied by the PARENT for the same reason the absolute lifts below are:
    // \`layoutAlign\` is a CHILD's relationship to its parent's auto-layout, and applying it here reaches a
    // nested INSTANCE (a \`nest\` row / label / message) the child neutralizer returns early on. Written only
    // when the plan carries it (a \`crossAxisFill\` part); every other child keeps Figma's \`INHERIT\`.
    //
    // And a filling nest's own FIXED mode beside it (#1751): without it a stretched instance hugs \u2014 see the
    // plan field. On the SAME line and unguarded (\`Object.assign\` skips an undefined source) because a
    // guard on a line of its own costs 25 bytes in every chunk's shell. (Chosen when the #536 probe grid had to
    // stay one chunk; #1798 replaced that rule with the indivisible-unit headroom and a tested split.)
    if(c.layoutAlign)kid.layoutAlign=c.layoutAlign;Object.assign(kid,c.instanceSizing);
${MIN_LINES_SLOT}
${PIN_LIFT_SLOT}
  }
  // A CENTERED absolute child (#612's pending spinner with no visual cell to take). Applied by the
  // parent for the same reason the inset ones are \u2014 \`layoutPositioning\` only means anything inside an
  // auto-layout parent, and the centering is measured off a box the parent owns.
  for(const [c,kid] of centered){
    // Written via a variable so this statement is not BYTE-IDENTICAL to the ring's lift above. A test
    // mutates that one by string-replacing \`kid.layoutPositioning='ABSOLUTE';\` \u2014 and \`String.replace\`
    // with a string pattern replaces only the FIRST occurrence, so a duplicated statement here silently
    // stole the mutation and the ring's own gate went green while unmutated. Caught by that gate failing
    // when this loop was added; keep them textually distinct.
    const lift='ABSOLUTE';kid.layoutPositioning=lift;
    // THE BOX THE CENTERING IS MEASURED ON (#848). The part named in \`absoluteCenterOn\` when it is
    // there, the parent otherwise. Centering on the PARENT is right only if the overlaid part is itself
    // centered in it, and at \`leading=false, trailing=true\` the label is not: the trailing cell holds the
    // right side, so the label sits left of center and a spinner centered on the container landed 12px
    // right of the text it stands in for. Read LIVE, after the flow pass, because the label's width is
    // the designer's text and only Figma knows it.
    const on=c.absoluteCenterOn?boxes.get(c.absoluteCenterOn):undefined;
    // A named box that is not in the tree is REPORTED, not silently swapped for the parent \u2014 falling
    // back would reproduce the exact off-center spinner this field exists to fix, and do it quietly.
    if(c.absoluteCenterOn&&!on)misses.push(c.name+'.absoluteCenterOn -> '+c.absoluteCenterOn+' (not built; centered on the parent instead, so it will sit off-center wherever that part is not itself centered \u2014 #848)');
    // NOT resized: unlike the ring, a centered overlay keeps its own square size \u2014 the \`size\` binding
    // is already on it, and \`resize\` would CLEAR that binding (the comment on the ring's resize says
    // so, and there it is safe only because an absolute part binds no dimensions).
    // \`x\`/\`y\` are PARENT-relative, and so is a sibling's \`x\`/\`y\` \u2014 so the sibling's offset carries
    // straight into the arithmetic with no coordinate conversion.
    if(on){kid.x=on.x+(on.width-kid.width)/2;kid.y=on.y+(on.height-kid.height)/2;}
    else{kid.x=(node.width-kid.width)/2;kid.y=(node.height-kid.height)/2;}
    // Centered on both axes so the spinner stays over the label's middle when a designer resizes the
    // variant. STRETCH would distort it; CENTER is the constraint that matches the geometry.
    kid.constraints={horizontal:'CENTER',vertical:'CENTER'};
    // READ BACK, same discipline as the ring's. A centered child that quietly stayed in the flow ADDS a
    // cell \u2014 which is the precise defect this whole mechanism exists to prevent, so it must not fail
    // silently: the button would grow by the spinner's cell exactly as it did before #612.
    if(kid.layoutPositioning!=='ABSOLUTE')misses.push(c.name+'.layoutPositioning -> DISCARDED (set ABSOLUTE, reads '+kid.layoutPositioning+'; the spinner would take a cell and the button would grow on pending)');
  }
${CORNER_SLOT}  // Applied by the PARENT, because every fact here is about the child's relationship to it:
  // \`layoutPositioning\` is only meaningful inside an auto-layout parent, and the parent's size is what
  // the inset is measured from.
  for(const [c,kid] of absolutes){
    const v=byName.get(c.absoluteInset);
    if(!v){misses.push(c.name+'.absoluteInset -> '+c.absoluteInset);continue;}
    kid.layoutPositioning='ABSOLUTE';
    // The VALUE, read from the variable, because \`x\`/\`y\` accept no binding \u2014 the one place in this
    // payload where a resolved number is written instead of a binding, and the reason the plan carries a
    // name rather than a number (the plan stays brand-invariant; the freeze happens here, per file).
    // \`resolveForConsumer\` rather than reading \`valuesByMode\`: the value is itself an ALIAS to a
    // dimension primitive, and the raw map hands back a VARIABLE_ALIAS object rather than a number.
    const gap=v.resolveForConsumer(kid).value;
    if(typeof gap!=='number'){misses.push(c.name+'.absoluteInset -> '+c.absoluteInset+' resolved to '+JSON.stringify(gap)+', not a number');continue;}
    // THE STROKE THE GAP HAS TO CLEAR (#801). \`strokeAlign\` is INSIDE above \u2014 correct for a border,
    // since a stroke outside would grow the auto-layout footprint \u2014 so the nested ring draws its own
    // stroke back inward across the gap. At 2px offset and a 2px ring the outer edge lands exactly on the
    // host's border: gap ZERO, which is the position WCAG 1.4.11 exists to forbid. So the coordinate is
    // \`gap + strokeWidth\` and only the GAP is the design value. Absent means the nested component draws
    // nothing inside its bounds, which is right for any absolute part that is not a ring.
    let inset=gap;
    if(c.absoluteStrokeInset){
      const sv=byName.get(c.absoluteStrokeInset);
      if(!sv)misses.push(c.name+'.absoluteStrokeInset -> '+c.absoluteStrokeInset+' (positioned at the offset alone; the ring will sit flush against the border it must be distinguishable from \u2014 #801)');
      else{
        const sw=sv.resolveForConsumer(kid).value;
        if(typeof sw!=='number')misses.push(c.name+'.absoluteStrokeInset -> '+c.absoluteStrokeInset+' resolved to '+JSON.stringify(sw)+', not a number (positioned at the offset alone \u2014 the ring will sit flush, #801)');
        else inset=gap+sw;
      }
    }
    // CLEAR THE INHERITED NOMINAL SIDE (#1388, #1290's prediction). The nested component's root binds
    // width AND height to its \`nominal-side\` (\`size.md.height\`, present only so it builds alone), and an
    // INSTANCE inherits that binding. \`resize\` clears the bindings this payload set but not one inherited
    // through an instance \u2014 so without this the ring carries a stale \`size/md/height\` binding that agrees
    // with the resized box only by coincidence on a \`size=small\` host (28 + 2\xD74 = 36 = md height) and
    // decouples the moment a brand moves its density or size ladder. Cleared BEFORE the resize; the ring's
    // own \`strokeWeight\` binding is left alone (its brand stroke, not a dimension the host overwrites).
    kid.setBoundVariable('width',null);kid.setBoundVariable('height',null);
    // Grown on every side by the full coordinate: the ring is 2\xD7inset larger than the parent and starts
    // at -inset, which leaves \`gap\` of visible background once the stroke is drawn inward.
    // \`resize\` is safe HERE and nowhere else in this payload: it clears dimension bindings, and an
    // absolute part binds none (its size IS the parent's, so \`bound\` is empty by construction \u2014 gated).
    kid.resize(node.width+inset*2,node.height+inset*2);
    kid.x=-inset;kid.y=-inset;
    // CONCENTRIC RADIUS (#1388): the ring sits \`inset\` outside its host on every side, so its corner
    // radius must be the host's grown by that same \`inset\` \u2014 else the straight run of a radius-0 ring cuts
    // across the host's rounded corner. Read the host's four corners (a bound radius reads back resolved)
    // and add \`inset\`, per-corner because the host binds them per-corner (the scalar reads \`mixed\`). One
    // formula, three cases: a radius-0 host \u2192 \`inset\` (a rounded-rect ring, not a hard square); a full-round
    // host (radio, radius \u2265 half its side) \u2192 \`host + inset \u2265 ringSide/2\`, which Figma clamps to a circle;
    // an ordinary rounded host stays concentric at the constant gap. Frozen at paste like \`x\`/\`y\`/inset.
    for(const corner of ['topLeftRadius','topRightRadius','bottomLeftRadius','bottomRightRadius']){
      const hostR=node[corner];
      if(typeof hostR==='number')kid[corner]=hostR+inset;
    }
    // STRETCH on both axes so the ring tracks its target when a designer resizes a variant. Without it
    // the ring keeps the size it was pasted at and widening the button leaves it behind \u2014 silently,
    // because it looks correct at the one size it was built.
    kid.constraints={horizontal:'STRETCH',vertical:'STRETCH'};
    // READ BACK, the same discipline as every other setter here. \`layoutPositioning\` is rejected on a
    // child of a non-auto-layout parent, and an absolute child that quietly stayed in the flow ADDS a
    // cell to the row \u2014 the one thing the ring must not do to its host's geometry.
    if(kid.layoutPositioning!=='ABSOLUTE')misses.push(c.name+'.layoutPositioning -> DISCARDED (set ABSOLUTE, reads '+kid.layoutPositioning+'; the ring would take a cell in the row)');
  }
  // #1393 \u2014 AND IT HAS TO BE LAST: every write above declares something; this declares nothing else was.
${PIN_SLOT}
  claimDefaults(node,n,'created');
  // RE-APPLY THE TEXT STYLE, because \`claimDefaults\`' \`paragraphSpacing\`/\`leadingTrim\` just detached it
  // (#1567, host-measured). No \`loadFontAsync\`: the style's font was loaded above, in this same run.
  // One miss either way \u2014 a refused re-apply and a silently dropped one leave the same unstyled node.
  if(sty){let e='';try{await node.setTextStyleIdAsync(sty.id);}catch(err){e=' ('+err.message+')';}if(node.textStyleId!==sty.id)misses.push(n.name+'.textStyle -> '+sty.name+' DISCARDED after the #865 defaults, reads '+(node.textStyleId||'no style')+e);}
  // The IMPORTED subtree: \`createNodeFromSvg\` bypasses \`createFrame()\`, so its inner nodes are claimed too,
  // in 'imported' mode (fills, strokes and constraints there are the glyph's own).
  if(n.type==='GLYPH'&&node.findAll){const ops=(n.glyphSvg||'').match(/<path\\b[^>]*>/g)||[];let vi=0;for(const d of node.findAll(()=>true)){let op;if(d.type==='VECTOR'){const e=ops[vi++];const mm=e&&/\\sopacity="([0-9.]+)"/.exec(e);op=mm?Number(mm[1]):1;}claimDefaults(d,n,'imported',op);}}
  return node;
};`;
var PAYLOAD_DECLARE_PROPS = `// COMPONENT PROPERTIES (#487 step 6). On the SET, and only after combining \u2014 measured, not read:
// \`addComponentProperty\` on a member throws "Can only set component property definitions on a product
// component", so there is no per-variant path to fall back to. Declaring before the combine works via
// the standalone-component route and the ids are then REWRITTEN by \`combineAsVariants\` (\`children#103:19\`
// became \`children#103:21\`), which is a second reason to do it after: an id captured before the combine
// is stale by the time a reference needs it.
// SKIP BY NAME, exactly as the chunked path skips members it already built \u2014 and for a sharper reason.
// Measured live: re-declaring an existing property does NOT throw. Figma silently creates a SECOND
// property (\`leadingVisual2#113:102\`) and hands back an id whose own name does not match the key it just
// made (\`leadingVisual#113:102\`). So a re-pasted final chunk would double every property and wire the
// refs to the copies, orphaning the originals \u2014 a corrupted panel reported as a clean paste. A property
// that is already present with the right type is REUSED; its id is what the refs need anyway.
let declared={};
try{declared=set.componentPropertyDefinitions||{};}catch(err){/* already reported as UNREADABLE above */}
const byBareName=new Map();
for(const k of Object.keys(declared))if(declared[k].type!=='VARIANT')byBareName.set(k.split('#')[0],k);
const propIds=new Map();
for(const p of PROPS){
  const already=byBareName.get(p.name);
  if(already){
    if(declared[already].type===p.type){propIds.set(p.name,already);continue;}
    misses.push('property '+p.name+' -> ALREADY on the set as '+declared[already].type+' but this paste declares '+p.type+' (left alone; declaring it again would silently create a second property called '+p.name+'2)');
    continue;
  }
  let def;
  if(p.type==='INSTANCE_SWAP'){
    // Figma demands a NODE ID here. \`key\`, \`''\`, \`null\` and \`undefined\` are each rejected with
    // "Property value is incompatible with component property type" \u2014 so an unresolvable target is not
    // a missing default, it is a property that cannot be created at all.
    const target=compByName.get(p.swapTarget);
    // "not found" was the wrong claim for three of the four states this reaches (#1288): a set, an instance
    // and a frame of that name are all FOUND. The consequence clause is the property loop's own \u2014 the slot
    // is not swappable at all, where the node loop above leaves a box a designer can still fill.
    if(!target){misses.push('property '+p.name+' -> swap target '+p.swapTarget+' ('+swapAdvice(p.swapTarget)+'; '+${JSON.stringify(SWAP_NO_PROPERTY)}+')');continue;}
    def=target.id;
  }else def=p.default;
  try{propIds.set(p.name,set.addComponentProperty(p.name,p.type,def));}
  catch(err){misses.push('property '+p.name+' -> '+p.type+' REFUSED ('+err.message+')');}
}`;

// src/write-adapter.ts
var webCommit = () => ({
  isFigma: false,
  postTheme() {
  },
  postComponents() {
  },
  postFileSetup() {
  },
  postStyleGuide() {
  },
  postPrune() {
  },
  onHostMessage() {
  },
  requestResize() {
  }
});
var hostCommit = () => false ? figmaCommit() : webCommit();

// src/build-identity.ts
var parseBuildId = (raw) => {
  const sp = raw.indexOf(" ");
  if (sp > 0) return { kind: "tree", builtAt: raw.slice(0, sp), tree: raw.slice(sp + 1) };
  if (raw === "local") return { kind: "local" };
  return { kind: "commit", commit: raw };
};
var treeName = (tree) => tree.split("/").filter(Boolean).pop() ?? tree;
var buildChip = (raw) => {
  const id = parseBuildId(raw);
  if (id.kind !== "tree") return raw;
  return `${treeName(id.tree)} ${id.builtAt.slice(5, 16).replace("T", " ")}Z`;
};
var buildTitle = (raw) => {
  const id = parseBuildId(raw);
  if (id.kind === "local") return "Built outside the deploy \u2014 no commit to report.";
  if (id.kind === "commit") return `Deployed from commit ${id.commit}.`;
  return `Built from ${id.tree} at ${id.builtAt}. Every checkout carries its own dist/ under the same plugin id, so this names the one Figma loaded.`;
};

// src/size-labels.ts
var SIZE_BASE_LABEL = "Base";
var SIZE_BASE_TITLE = "One base size \u2014 the Responsive type lever scales it between mobile and desktop.";
var sizeColumnHeader = (isBase, isEditable, modeLabel) => {
  if (isBase) return { text: SIZE_BASE_LABEL, suffix: "", title: SIZE_BASE_TITLE };
  if (!isEditable) return { text: modeLabel, suffix: " auto" };
  return { text: modeLabel, suffix: "" };
};

// src/outline-roles.ts
var outlineStateRoles = (method, color, state, onInverseGround) => {
  const page2 = state === "rest" ? null : outlineFillRole(method, color, state);
  const onBand = onInverseGround && !(outlineFillFamily(method).opaque && page2);
  const g = onBand ? "inverse." : "";
  return {
    fill: page2 ? `${g}${page2}` : null,
    text: `${g}interactive.${color}.text.${state}`,
    border: `${g}interactive.${color}.border.${state}`
  };
};

// src/em-percent.ts
var emToPercentLabel = (em) => {
  const pct = Math.round(em * 100 * 1e3) / 1e3;
  return `${pct < 0 ? "\u2212" : ""}${String(Math.abs(pct))}%`;
};

// src/export-settings.ts
var ARTIFACTS = [
  {
    id: "dtcg",
    label: "Design tokens",
    // Descriptions may carry teachable domain vocabulary (#618, reading 1) — "alias" and "token" are
    // learnable from two encounters on screen. Engine identifiers are not; see `jargonDefects`.
    desc: "The whole token tree in the W3C design-token format, aliases intact. This is the file a build reads."
  },
  {
    id: "design-md",
    label: "Brand brief",
    desc: "The few anchors this brand is generated from, as Markdown. Import it back here to get the brand again."
  }
];
var DTCG_SETTINGS = [
  {
    key: "tokenNameCase",
    artifact: "dtcg",
    sources: ["generated"],
    admits: "renaming",
    label: "Token names",
    desc: "Dashes are what the engine writes, so a name reads as it does here. Underscores suit toolchains that read a dash as minus.",
    options: [
      { value: "kebab", label: "color.on-fill" },
      { value: "snake", label: "color.on_fill" }
    ],
    def: "kebab"
  },
  {
    key: "formatDotNotation",
    artifact: "dtcg",
    sources: ["generated"],
    admits: "nesting",
    label: "Grouping",
    desc: "Groups nest by default, the way the format describes them. One flat level with dotted keys is easier to search and to diff.",
    options: [
      { value: "nested", label: "Nested groups" },
      { value: "dotted", label: "One flat level" }
    ],
    def: "nested"
  },
  {
    key: "fileStructure",
    artifact: "dtcg",
    sources: ["generated"],
    admits: "file-count",
    label: "Files",
    desc: "One file holds everything. Splitting writes a file per top-level group \u2014 same names, spread out, and they merge back.",
    options: [
      { value: "single", label: "One file" },
      { value: "per-group", label: "One per group" }
    ],
    def: "single"
  },
  {
    key: "prettyPrint",
    artifact: "dtcg",
    sources: ["generated"],
    admits: "serialization",
    label: "Formatting",
    desc: "Indented reads well in a review. Compact is smaller to ship, and a build reads the two the same way.",
    options: [
      { value: "pretty", label: "Indented" },
      { value: "compact", label: "Compact" }
    ],
    def: "pretty"
  }
];
var DESIGN_MD_SETTINGS = [];
var ALL_SETTINGS = [...DTCG_SETTINGS, ...DESIGN_MD_SETTINGS];
var defaultSettings = () => Object.fromEntries(ALL_SETTINGS.map((s) => [s.key, s.def]));
var visibleSettings = (artifact, source) => ALL_SETTINGS.filter((s) => s.artifact === artifact && s.sources.includes(source));
var isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
var isLeaf = (v) => isObj(v) && "$value" in v;
var metaOf = (tree) => {
  const out = {};
  for (const [k, v] of Object.entries(isObj(tree) ? tree : {})) if (k.startsWith("$")) out[k] = v;
  return out;
};
var renameSegment = (seg, style) => style === "snake" ? seg.replace(/-/g, "_") : seg;
var renamePath = (path, style) => path.split(".").map((s) => renameSegment(s, style)).join(".");
var renameAliasesIn = (value, style) => {
  if (typeof value === "string") {
    return value.replace(/\{([^{}]+)\}/g, (_m, inner) => `{${renamePath(inner, style)}}`);
  }
  if (Array.isArray(value)) return value.map((v) => renameAliasesIn(v, style));
  if (isObj(value)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = renameAliasesIn(v, style);
    return out;
  }
  return value;
};
var renameLeaf = (leaf, style) => {
  const out = {};
  for (const [k, v] of Object.entries(leaf)) out[k] = k === "$value" ? renameAliasesIn(v, style) : v;
  return out;
};
var leavesOf = (tree) => {
  const out = [];
  const walk = (n, path) => {
    if (!isObj(n)) return;
    if (isLeaf(n)) {
      out.push({ path, leaf: n });
      return;
    }
    for (const [k, v] of Object.entries(n)) {
      if (k.startsWith("$")) continue;
      walk(v, path ? `${path}.${k}` : k);
    }
  };
  walk(tree, "");
  return out;
};
var nest = (leaves) => {
  const out = {};
  for (const { path, leaf } of leaves) {
    const segs = path.split(".");
    let cur = out;
    for (const seg of segs.slice(0, -1)) {
      if (!isObj(cur[seg])) cur[seg] = {};
      cur = cur[seg];
    }
    cur[segs[segs.length - 1]] = leaf;
  }
  return out;
};
var flatten = (leaves) => {
  const out = {};
  for (const { path, leaf } of leaves) out[path] = leaf;
  return out;
};
var groupOf = (path) => path.split(".")[1] ?? "";
var projectDtcg = (tree, slug2, s) => {
  const meta = metaOf(tree);
  const renamed = leavesOf(tree).map(({ path, leaf }) => ({
    path: renamePath(path, s.tokenNameCase),
    leaf: renameLeaf(leaf, s.tokenNameCase)
  }));
  const indent = s.prettyPrint === "pretty" ? 2 : void 0;
  const doc = (ls) => ({ ...s.formatDotNotation === "dotted" ? flatten(ls) : nest(ls), ...meta });
  const ser = (v) => JSON.stringify(v, null, indent) + "\n";
  if (s.fileStructure !== "per-group") {
    return [{ name: `${slug2}.tokens.json`, text: ser(doc(renamed)) }];
  }
  const groups = /* @__PURE__ */ new Map();
  for (const l of renamed) {
    const g = groupOf(l.path);
    const bucket = groups.get(g);
    if (bucket) bucket.push(l);
    else groups.set(g, [l]);
  }
  return [...groups.entries()].map(([group, ls]) => ({
    name: `${slug2}.${group}.tokens.json`,
    text: ser(doc(ls))
  }));
};
var SAMPLE_CRITERIA = [
  // A dashed segment is the only thing a name style can visibly change.
  { key: "dashed-name", exercises: "tokenNameCase", test: (p) => p.split(".").slice(1).some((s) => s.includes("-")) },
  // An alias is where a name style has to reach INSIDE a value, which is the half that gets forgotten.
  { key: "alias-value", exercises: "tokenNameCase", test: (_p, l) => typeof l.$value === "string" && /\{[^{}]*-[^{}]*\}/.test(l.$value) },
  // Depth is what nesting versus one flat level is a choice about.
  { key: "deep-path", exercises: "formatDotNotation", test: (p) => p.split(".").length >= 5 },
  // A composite value is where indentation stops being cosmetic.
  { key: "composite", exercises: "prettyPrint", test: (_p, l) => isObj(l.$value) || Array.isArray(l.$value) }
];
var sampleLeaves = (tree, max = 6) => {
  const all = leavesOf(tree);
  const picked = [];
  const size = (l) => JSON.stringify(l.leaf).length;
  const take = (pred) => {
    const hits = all.filter(({ path, leaf }) => pred(path, leaf) && !picked.some((p) => p.path === path));
    if (!hits.length) return;
    picked.push(hits.reduce((best, l) => {
      const d = size(l) - size(best);
      return d < 0 || d === 0 && l.path < best.path ? l : best;
    }));
  };
  take((p, l) => typeof l.$value === "string" && p.split(".").length === 3 && !p.includes("-"));
  for (const c of SAMPLE_CRITERIA) take(c.test);
  const firstGroup = picked.length ? groupOf(picked[0].path) : "";
  while (picked.length < max) {
    const before = picked.length;
    take((p, l) => groupOf(p) !== firstGroup && SAMPLE_CRITERIA.some((c) => c.test(p, l)));
    if (picked.length === before) break;
  }
  return picked.slice(0, max);
};
var sampleTree = (tree, max = 6) => nest(sampleLeaves(tree, max));
var previewFiles = (tree, slug2, s, max = 6) => projectDtcg(sampleTree(tree, max), slug2, s);
var fileNames = (tree, slug2, s) => projectDtcg(tree, slug2, s).map((f) => f.name);
var IMPORT_SLOTS = [
  {
    id: "design-md",
    available: true,
    label: "Brand brief",
    desc: "Paste or upload a brief. The engine has to accept it before it replaces what you have here."
  },
  // #677: reconstructing a brand from emitted tokens is an undetermined inverse — the engine grows a
  // whole system from sparse anchors, and that does not run backwards. Until it is decided, no control.
  { id: "figma-file", available: false, needs: "#677" }
];
var availableImportSlots = () => IMPORT_SLOTS.filter((s) => s.available);

// src/main.ts
var NEW_BRAND = () => ({
  id: "untitled",
  root: "prism",
  modes: ["light"],
  // most brands ship light only (docs/11 Pillar 1)
  primary: { l: 0.55, c: 0.15, h: 262 },
  neutral: { hue: 262, chroma: 6e-3, auto: true }
  // neutral hue auto-follows primary (262 = primary.h → identical ramp; now live-linked)
});
var ROOT_RE = /^[a-z][a-z0-9-]*$/;
var LIVE_CONTROLS = /* @__PURE__ */ new Set(["slider", "enum", "palette-ref", "toggle"]);
var MODE_LABEL = { light: "Light", dark: "Dark", "hc-light": "HC light", "hc-dark": "HC dark", wireframe: "Wireframe" };
var NAV = [
  { key: "palettes", label: "Palettes", sub: "Brand hues & neutrals \u2192 ramps" },
  { key: "surfaces", label: "Surfaces & fills", sub: "Backgrounds, text, gradients" },
  { key: "interactive", label: "Interactive", sub: "Action colors, states, a11y" },
  { key: "typography", label: "Typography", sub: "Families, weights \u2192 type scale" },
  { key: "elevation", label: "Elevation", sub: "Shadows" },
  { key: "sizeRadius", label: "Size & radius", sub: "Size, density, corner radius" },
  { key: "layout", label: "Layout", sub: "Breakpoints & containers" },
  { key: "motion", label: "Motion", sub: "Tempo & easing" },
  { key: "preview", label: "Preview", sub: "Components & contrast, all modes", view: true },
  // #259 — the style-guide step, after Apply theme: it documents the variables Apply wrote, so it follows the
  // authoring pages and Preview. Figma-only for the `components` reason below — it draws on the canvas.
  // Placement and label are proposed, owner to confirm (docs/45).
  { key: "styleGuide", label: "Style guide", sub: "Token tables on the Figma canvas", view: true, figmaOnly: true },
  // #718 — the component write's destination, and A DEMOTION RATHER THAN A PROMOTION. The natural
  // reading of "components get their own rail item" is that the capability graduated; here it is the
  // reverse. The control is leaving a first-class slot beside Apply precisely because it is not
  // first-class: it is the anatomy schema's materialization proof (docs/28, docs/14 §3.1), kept
  // runnable so the schema has a consumer that can refute it, not a capability a client is offered.
  //
  // `figmaOnly` follows the rule docs/23 §7 already settled for the deferred Output group: a
  // destination that only makes sense in the Figma channel is present in the plugin host and omitted
  // from the web rail, rather than rendered inert there. Both NAV consumers read `railNav()`.
  { key: "components", label: "Components", sub: "Internal \u2014 build the Button set", view: true, figmaOnly: true }
];
var railNav = () => NAV.filter((s) => !("figmaOnly" in s && s.figmaOnly) || commit.isFigma);
var isView = (s) => "view" in s && s.view === true;
var isFirstView = (nav, i) => isView(nav[i]) && !nav.slice(0, i).some(isView);
var PRIMITIVE_KEYS = /* @__PURE__ */ new Set(["primary", "neutral.hue", "neutral.chroma", "neutral.anchor", "brandColors"]);
var pageOfLever = (l) => {
  if (l.group === "type") return "typography";
  if (l.group === "motion") return "motion";
  if (l.group === "elevation") return "elevation";
  if (l.group === "layout") return "layout";
  if (l.group === "form") return "sizeRadius";
  if (l.key === "gradients" || l.key === "surfaces") return "surfaces";
  return "interactive";
};
var leversFor = (key) => leverManifest.filter((l) => !l.advanced && !PRIMITIVE_KEYS.has(l.key) && pageOfLever(l) === key);
var leverByKey = (k) => leverManifest.find((l) => l.key === k);
var legibleInkOn = (bgHex, dark = "#191920", light = "#f7f7f7") => {
  if (!bgHex.startsWith("#")) return dark;
  const bg = hexToRgb(bgHex);
  return contrast(hexToRgb(dark), bg) >= contrast(hexToRgb(light), bg) ? dark : light;
};
var paintVolatile = () => {
};
var volatileHosts = [];
var setVolatile = (hosts, paint) => {
  volatileHosts = hosts;
  paintVolatile = paint;
};
var globalErrHost = null;
var syncErrorBar = () => {
  if (!globalErrHost?.isConnected) {
    if (lastError) console.error(`the 'error' chrome surface is not mounted in this view, so an engine error is going unreported: ${lastError} (#772)`);
    return;
  }
  globalErrHost.style.display = lastError ? "" : "none";
  if (lastError) globalErrHost.textContent = `That change didn't apply: ${lastError} \u2014 you are seeing the last theme that resolved.`;
  syncChromeHeight();
};
var apply = () => {
  rebuild();
  syncChrome();
  paintVolatile();
};
var applyFull = () => {
  rebuild();
  renderWorkspace();
};
var UTILITIES = ["mono", "faint"];
var STATES = [
  "active",
  "arow-lead",
  "authored",
  "bad",
  "cap",
  "cs-nudge",
  "cur",
  "dark",
  "derived",
  "dia",
  "disabled",
  "fill",
  "fixed",
  "inline",
  "is-anchor",
  "is-pressed",
  "mtbl-spec",
  "no",
  "none",
  "note",
  "ok",
  "on",
  "open",
  "pin",
  "primary",
  "r",
  "ro",
  "set",
  "sg-inv",
  "sg-l",
  "sg-r",
  "sg-t",
  "show-hex",
  "slider",
  "sm",
  "stuck",
  "unbound",
  "unknown",
  "warn",
  "yes",
  "zero"
];
var mix = (...parts) => ({ cls: parts.filter(Boolean).join(" ") });
var FREE = /* @__PURE__ */ new Set([...UTILITIES, ...STATES]);
var scopeOf = (token) => token.includes("-") ? token.slice(0, token.indexOf("-")) : token;
var checkScope = (cls) => {
  const toks = cls.split(/\s+/).filter(Boolean);
  const anchor = toks.find((t) => !FREE.has(t));
  if (anchor) {
    const s = scopeOf(anchor);
    const off = toks.filter((t) => !FREE.has(t) && t !== s && !t.startsWith(`${s}-`));
    if (off.length) {
      throw new Error(
        `apps/studio: class list "${cls}" spans scopes \u2014 '${anchor}' is scope '${s}', but ${off.map((t) => `'${t}'`).join(", ")} is not. One element, one scope (#770). If the composition is intended, say so with mix().`
      );
    }
  }
  return cls;
};
var el = (tag2, cls, text) => {
  const n = document.createElement(tag2);
  if (cls) n.className = typeof cls === "string" ? checkScope(cls) : cls.cls;
  if (text !== void 0) n.textContent = text;
  return n;
};
var hook = (n, role) => {
  n.setAttribute("data-p3", role);
  return n;
};
var addClass = (n, cls) => {
  const next = `${n.className} ${typeof cls === "string" ? cls : cls.cls}`.trim();
  n.className = typeof cls === "string" ? checkScope(next) : next;
};
var chunk = (a, n) => {
  const o = [];
  for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n));
  return o;
};
var optionEl = (value, text, selected = false) => {
  const o = document.createElement("option");
  o.value = value;
  o.textContent = text;
  if (selected) o.selected = true;
  return o;
};
var selectEl = (mods = "") => el(
  "select",
  // A plain string is `select`'s own modifier vocabulary (`sm`/`fill`/`cap`) and goes through the
  // scope check like any mint; a caller wanting to size the control from ITS scope says so with
  // mix(), which is the one shape that legitimately crosses (#770).
  typeof mods === "string" ? mods ? `select ${mods}` : "select" : mix("select", mods.cls)
);
var numberField = (o) => {
  const inp = el("input", o.className ? mix("num", o.className) : "num");
  inp.type = "number";
  if (o.min != null) inp.min = String(o.min);
  if (o.max != null) inp.max = String(o.max);
  if (o.step != null) inp.step = String(o.step);
  inp.value = String(o.value);
  if (o.title) inp.title = o.title;
  return inp;
};
var rangeInput = (o) => {
  const inp = el("input", o.className);
  inp.type = "range";
  if (o.min != null) inp.min = String(o.min);
  if (o.max != null) inp.max = String(o.max);
  if (o.step != null) inp.step = String(o.step);
  inp.value = String(o.value);
  return inp;
};
var toggleField = (checked, onToggle) => {
  const input = el("input");
  input.type = "checkbox";
  input.className = mix("toggle", "hit-min").cls;
  input.checked = checked;
  const val = el("span", "knob-val", checked ? "On" : "Off");
  input.onchange = () => {
    val.textContent = input.checked ? "On" : "Off";
    onToggle(input.checked);
  };
  return knobBody(input, val);
};
var colorPath = (role) => `color.${role}`;
var tokenPillSpan = (path) => {
  const p = hook(el("span", "tpill mono", path), "token-pill");
  p.title = path;
  return p;
};
var isInversePath = (path) => path.split(".").includes("inverse");
var withInverseBadge = (path, pill) => {
  if (!isInversePath(path)) return pill;
  const wrap = hook(el("span", "tpill-wrap"), "token-pill-wrap");
  const badge2 = hook(el("span", "tpill-inv", "inverse"), "token-pill-inverse");
  badge2.title = "The inverse band. Shown beside the path because a narrow pill hides its leading part.";
  wrap.append(badge2, pill);
  return wrap;
};
var tokenPill = (path) => withInverseBadge(path, tokenPillSpan(path));
var tokenPillWrapping = (path) => {
  const p = tokenPillSpan(path);
  p.textContent = "";
  const segs = path.split(".");
  segs.forEach((seg, i) => {
    p.append(i < segs.length - 1 ? `${seg}.` : seg);
    if (i < segs.length - 1) p.append(el("wbr"));
  });
  return withInverseBadge(path, p);
};
var addButton = (label, onClick, cls = "") => {
  const btn = el("button", cls ? mix("addbtn", cls) : "addbtn", label);
  btn.onclick = onClick;
  return btn;
};
var removeButton = (onClick, title = "Remove", cls = "") => {
  const btn = el("button", cls ? mix("rx", cls) : "rx", "\xD7");
  btn.title = title;
  btn.onclick = onClick;
  return btn;
};
var knobBody = (...kids) => {
  const r = el("div", "knob-body");
  r.append(...kids);
  return r;
};
var knob = (label, body, desc) => {
  const wrap = el("div", "knob");
  wrap.append(el("label", "knob-label", label));
  wrap.append(...Array.isArray(body) ? body : [body]);
  wrap.append(hook(el("p", "knob-desc", desc), "control-description"));
  return wrap;
};
var commit = hostCommit();
var seedOutcome = null;
var inputRecovered = false;
var restoreError = null;
var applyState = null;
var componentState = null;
var fileSetupState = null;
var styleGuideState = null;
var styleGuideOptions = {};
var componentProgress = null;
var pruneBusy = false;
var prunePreview = null;
var pruneVerdict = null;
var openDetail = null;
var hostFonts = [];
var hostFontStyles = /* @__PURE__ */ new Map();
var handleHostMessage = (m) => {
  if (m.kind === "restore-input") {
    try {
      brandTheme(m.input);
    } catch {
      return;
    }
    inputRecovered = true;
    if (seedOutcome) seedOutcome = withRecovered(seedOutcome, true);
    loadBrand(m.input, { kind: "file" });
    return;
  }
  if (m.kind === "restore-input-empty") {
    if (provenance === bootProvenance) {
      clearOrigin();
      build();
    }
    return;
  }
  if (m.kind === "restore-input-error") {
    restoreError = m.message;
    if (barHost) renderBar();
    return;
  }
  if (m.kind === "font-list") {
    hostFonts = m.families;
    hostFontStyles = new Map(m.families.map((f, i) => [f, m.styles[i] ?? 0]));
    renderWorkspace();
    return;
  }
  if (m.kind === "apply-result") {
    applyState = { ok: m.ok, headline: m.headline, summary: m.summary };
    openDetail = m.ok ? null : "apply";
    if (barHost) {
      renderBar();
      syncApplyDetail();
    }
    return;
  }
  if (m.kind === "component-result") {
    componentState = { ok: m.ok, headline: m.headline, summary: m.summary };
    openDetail = m.ok ? null : "components";
    componentProgress = null;
    if (barHost) {
      renderBar();
      syncApplyDetail();
    }
    syncComponentRow();
    return;
  }
  if (m.kind === "file-setup-result") {
    fileSetupState = { ok: m.ok, headline: m.headline, summary: m.summary };
    openDetail = m.ok ? null : "filesetup";
    if (barHost) {
      renderBar();
      syncApplyDetail();
    }
    syncFileSetupRow();
    return;
  }
  if (m.kind === "style-guide-result") {
    styleGuideState = { ok: m.ok, headline: m.headline, summary: m.summary };
    openDetail = m.ok ? null : "styleguide";
    if (barHost) {
      renderBar();
      syncApplyDetail();
    }
    syncStyleGuideRow();
    return;
  }
  if (m.kind === "component-progress") {
    if (componentState !== "pending") return;
    componentProgress = { phase: m.phase, done: m.done, total: m.total };
    const text = componentPendingText();
    for (const node of componentPendingEls) {
      if (node.isConnected) node.textContent = text;
      else componentPendingEls.delete(node);
    }
    return;
  }
  if (m.kind === "prune-result") {
    pruneBusy = false;
    if (m.applied) {
      pruneVerdict = { ok: m.ok, count: m.count, summary: m.summary };
      prunePreview = null;
    } else if (m.count > 0 && m.pillOnly) {
      prunePreview = null;
      pruneVerdict = { ok: m.ok, count: m.count, summary: `Agent preview: ${m.summary}` };
    } else if (m.count > 0) {
      prunePreview = { count: m.count, summary: m.summary };
      pruneVerdict = null;
    } else {
      prunePreview = null;
      pruneVerdict = { ok: m.ok, count: 0, summary: m.summary };
    }
    if (barHost) renderBar();
    return;
  }
  if (m.kind === "seed-info") {
    seedOutcome = joinSeed({ present: m.present, ok: m.ok, detail: m.summary }, inputRecovered);
    if (barHost) renderBar();
  }
};
var anchorStepFor = (palette) => {
  if (palette === "primary") return autoPlaceStep(lastGoodInput.primary.l);
  if (palette === "neutral") return lastGoodInput.neutral.anchor ? autoPlaceStep(lastGoodInput.neutral.anchor.l) : null;
  const bc = (lastGoodInput.brandColors ?? []).find((b) => b.name === palette);
  if (bc) return autoPlaceStep(bc.oklch.l);
  const seed = STATUS_ROLES.includes(palette) ? lastGoodInput.status?.[palette] : void 0;
  return seed ? autoPlaceStep(seed.l) : null;
};
var rampBands = (steps, anchorStep) => {
  const wrap = el("div", "pramp");
  const sorted = [...steps].sort((a, b) => a.num - b.num);
  for (const rowSteps of chunk(sorted, 10)) {
    const band = el("div", "band");
    const strip2 = el("div", "strip");
    const labs = el("div", "labs");
    for (const s of rowSteps) {
      const isAnchor = s.num === anchorStep;
      const sw = el("div", "sw" + (isAnchor ? " is-anchor" : ""));
      sw.style.background = s.hex;
      strip2.append(sw);
      const lab = el("div", "lab");
      const hexEl = el("span", "lab-hex mono", s.hex);
      hexEl.title = s.hex;
      lab.append(el("span", "lab-step mono" + (isAnchor ? " on" : ""), s.key), hexEl);
      labs.append(lab);
    }
    band.append(strip2, labs);
    wrap.append(band);
  }
  return wrap;
};
var cascadeRename = (prev, next) => {
  if (brandState.actionPalette === prev) brandState.actionPalette = next;
  if (brandState.linkPalette === prev) brandState.linkPalette = next;
  const rc = brandState.roleColors;
  if (rc) {
    for (const r of Object.keys(rc)) if (rc[r] === prev) rc[r] = next;
  }
  brandState.interactivePalettes?.forEach((e) => {
    if (e.palette === prev) e.palette = next;
  });
  if (Array.isArray(brandState.gradients)) brandState.gradients.forEach((g) => g.stops.forEach((s) => {
    if (s.palette === prev) s.palette = next;
  }));
};
var cascadeRemove = (removed) => {
  if (brandState.actionPalette === removed) brandState.actionPalette = "primary";
  if (brandState.linkPalette === removed) brandState.linkPalette = void 0;
  const rc = brandState.roleColors;
  if (rc) {
    for (const r of Object.keys(rc)) if (rc[r] === removed) delete rc[r];
    if (!Object.keys(rc).length) brandState.roleColors = void 0;
  }
  if (brandState.interactivePalettes) {
    brandState.interactivePalettes = brandState.interactivePalettes.filter((e) => e.palette !== removed);
    if (!brandState.interactivePalettes.length) brandState.interactivePalettes = void 0;
  }
  if (Array.isArray(brandState.gradients)) brandState.gradients.forEach((g) => g.stops.forEach((s) => {
    if (s.palette === removed) s.palette = "primary";
  }));
};
var SECTION_MODE_SCOPE = {
  // Surfaces & fills
  "Backgrounds": "per-mode",
  "Foreground fills": "per-mode",
  "Text": "per-mode",
  // Interactive — the three action palettes edit; the global behaviors only re-resolve
  "Primary actions": "per-mode",
  "Neutral actions": "per-mode",
  "Destructive actions": "per-mode",
  "Outline button hover": "shared",
  "Icon colors": "shared",
  "Focus ring": "shared",
  // Size & radius
  "Corner radius": "per-mode",
  "Density & size": "per-mode",
  "Spacing grid": "shared",
  "Primitive scales": "shared",
  // Elevation
  "Shadow": "per-mode",
  "Elevation ramp": "shared",
  // Motion
  // Easing is 'shared', not 'per-mode', and the audit is what caught the difference. Its per-mode
  // control is a COLUMN-PER-MODE table (#522), so it edits every mode at once and its markup is
  // identical whichever mode the bar holds — the bar does not scope it. With `hasControls` true the
  // three-state badge renders "Editing · All modes", which is exactly the case #437 proposed that
  // label for. Marking it 'per-mode' claimed the bar scoped an editor it has no effect on.
  "Tempo": "per-mode",
  "Easing": "shared",
  "Motion": "shared",
  "Duration ramp": "shared",
  "Springs": "shared",
  // Preview — read-only end to end
  "Background": "shared",
  "Foreground": "shared",
  "Text color": "shared",
  "Border": "shared",
  "Icon": "shared",
  "Disabled": "shared",
  "Interactive": "shared"
};
var VIEW_ONLY = "data-view-only";
var viewOnly = (c) => {
  c.setAttribute(VIEW_ONLY, "");
  return c;
};
var SPECIMEN = "data-specimen";
var specimen = (e) => {
  e.setAttribute(SPECIMEN, "");
  return e;
};
var SPECIMEN_PAIR = "data-specimen-pair";
var specimenPair = (e, ink, fill) => {
  specimen(e).setAttribute(SPECIMEN_PAIR, `${ink} on ${fill}`);
  return e;
};
var TOKEN_CONTROL_SEL = `input:not([disabled]):not([${VIEW_ONLY}]), select:not([disabled]):not([${VIEW_ONLY}]), textarea:not([disabled]):not([${VIEW_ONLY}])`;
var modeScopeBadge = (scope, hasControls) => {
  const perMode = scope === "per-mode" && !DERIVED_MODES.has(currentMode);
  const derivedPerMode = scope === "per-mode" && DERIVED_MODES.has(currentMode);
  const editable = perMode || hasControls && !derivedPerMode;
  const b = el("span", "msb" + (editable ? " on" : ""));
  const mode = MODE_LABEL[currentMode] ?? currentMode;
  if (perMode) b.append(el("span", "msb-k", "Editing"), el("span", "msb-v", mode));
  else if (hasControls && !derivedPerMode) b.append(el("span", "msb-k", "Editing"), el("span", "msb-v", "All modes"));
  else b.append(el("span", "msb-k", "Non-editable"));
  b.title = perMode ? `Controls in this section write to ${mode} only.` : hasControls && !derivedPerMode ? "Controls here set one value that every mode then uses. What you see still re-resolves per mode." : scope === "per-mode" ? `${mode} is derived \u2014 it cannot be edited. Switch to a customizable mode to edit this section.` : "Derived from the values above. Nothing in this section is directly editable.";
  return b;
};
var palSection = (title, sub) => {
  const sec = el("div", "psec");
  const head = el("div", "psec-head");
  const txt = el("div", "psec-txt");
  txt.append(hook(el("h3", "psec-t", title), "section-title"), hook(el("p", "psec-d", sub), "section-description"));
  head.append(txt);
  sec.append(head);
  return sec;
};
var pfield = (label, control, right = false) => {
  const f = el("div", "pfield" + (right ? " r" : ""));
  f.append(el("span", "pfk", label), control);
  return f;
};
var anchorField = () => {
  const v = el("span", "panchor mono");
  const field = pfield("Anchor", v, true);
  const set = (key, note) => {
    v.textContent = note ? note : key ? key : "derived";
    v.className = "panchor mono" + (note ? " note" : key ? " dia" : " none");
  };
  return { field, set };
};
var brandRow = (getHex, setHex, name, path, isAction, paletteName, nameEl, removable) => {
  const row = el("div", "prow authored show-hex");
  const head = el("div", "phead");
  const ident = el("div", "pident");
  const picker = el("input", "pswatch");
  picker.type = "color";
  picker.value = getHex();
  picker.title = "Edit color";
  const idcol = el("div", "pidcol");
  idcol.append(nameEl ?? el("span", "pname", name));
  const sub = el("div", "psub");
  const hexLab = el("span", "phex mono", picker.value);
  sub.append(hexLab);
  if (path) sub.append(tokenPill(path));
  if (isAction) {
    const badge2 = el("span", "prole");
    const dot = el("span", "prole-dot");
    dot.style.background = picker.value;
    badge2.append(dot, document.createTextNode("default interactive color"));
    sub.append(badge2);
  }
  idcol.append(sub);
  ident.append(picker, idcol);
  if (removable) ident.append(removeButton(removable, "Remove color", "prm"));
  const anchor = anchorField();
  head.append(ident, anchor.field);
  const bands = el("div", "pramp-wrap");
  row.append(head, bands);
  picker.oninput = () => {
    setHex(picker.value);
    hexLab.textContent = picker.value;
    apply();
  };
  const refresh = () => {
    const pal = theme.palettes.find((p) => p.palette === paletteName);
    const aStep = anchorStepFor(paletteName);
    anchor.set(aStep != null ? pal?.steps.find((s) => s.num === aStep)?.key : void 0);
    bands.replaceChildren(rampBands(pal?.steps ?? [], aStep));
  };
  return { row, refresh };
};
var neutralRow = () => {
  const pinned = !!brandState.neutral.anchor;
  const auto = !pinned && !!brandState.neutral.auto;
  const editable = !pinned && !auto;
  const effHue = auto ? brandState.primary.h : brandState.neutral.hue;
  const row = el("div", "prow" + (pinned ? " authored show-hex" : ""));
  const head = el("div", "phead");
  const ident = el("div", "pident");
  const swWrap = el("div", "pswrap");
  let swatch2;
  let hexLab = null;
  if (pinned) {
    const a2 = brandState.neutral.anchor;
    const picker = el("input", "pswatch");
    picker.type = "color";
    picker.value = hex(oklchToRgb(a2));
    picker.title = "Edit color";
    picker.oninput = () => {
      const o = rgbToOklch(hexToRgb(picker.value));
      a2.l = o.l;
      a2.c = o.c;
      a2.h = o.h;
      if (hexLab) hexLab.textContent = picker.value;
      apply();
    };
    swatch2 = picker;
    swWrap.append(swatch2);
  } else {
    swatch2 = el("div", "pswatch ro");
    const lock = el("span", "plock");
    lock.innerHTML = '<svg viewBox="0 0 14 14" aria-hidden="true"><rect x="3" y="6.4" width="8" height="5.4" rx="1.3"/><path d="M4.6 6.4V5a2.4 2.4 0 0 1 4.8 0v1.4" fill="none"/></svg>';
    swWrap.append(swatch2, lock);
  }
  const idcol = el("div", "pidcol");
  idcol.append(el("span", "pname", "neutral"));
  const sub = el("div", "psub");
  if (pinned) {
    hexLab = el("span", "phex mono", swatch2.value);
    sub.append(hexLab);
  }
  sub.append(tokenPill("palette.neutral"));
  idcol.append(sub);
  ident.append(swWrap, idcol);
  const origin = el("div", "porigin");
  const src = selectEl("sm");
  src.append(optionEl("auto", "Auto", auto), optionEl("custom", "Custom tint", editable), optionEl("pinned", "Pinned color", pinned));
  src.onchange = () => {
    const n = brandState.neutral;
    if (src.value === "auto") {
      delete n.anchor;
      n.auto = true;
    } else if (src.value === "custom") {
      delete n.anchor;
      if (n.auto) {
        n.hue = brandState.primary.h;
        delete n.auto;
      }
    } else {
      n.anchor = { l: 0.5, c: Math.min(n.chroma, 0.02), h: effHue };
      delete n.auto;
    }
    applyFull();
  };
  origin.append(pfield("Source", src));
  const a = brandState.neutral.anchor;
  const nSlider = (key, label, max, step, value, fmt) => {
    const f = el("div", editable ? "pfield slider" : "pfield slider ro");
    const top = el("div", "psl-top");
    const val = el("span", "psl-val mono", fmt(value));
    top.append(el("span", "pfk", label), val);
    const input = rangeInput({ className: "psl-range", min: 0, max, step, value });
    if (!editable) input.disabled = true;
    else input.oninput = () => {
      setPath2(brandState, key, Number(input.value));
      val.textContent = fmt(Number(input.value));
      apply();
    };
    f.append(top, input);
    return f;
  };
  const hueField = nSlider("neutral.hue", "Hue", 360, 1, pinned ? a.h : effHue, (v) => `${Math.round(v)}\xB0`);
  origin.append(hueField, nSlider("neutral.chroma", "Chroma", 0.03, 1e-3, pinned ? a.c : brandState.neutral.chroma, (v) => v.toFixed(3)));
  const hueVal = hueField.querySelector(".psl-val");
  const hueInput = hueField.querySelector(".psl-range");
  const anchor = anchorField();
  head.append(ident, origin, anchor.field);
  const bands = el("div", "pramp-wrap");
  row.append(head, bands);
  const refresh = () => {
    const pal = theme.palettes.find((p) => p.palette === "neutral");
    const aStep = anchorStepFor("neutral");
    anchor.set(aStep != null ? pal?.steps.find((s) => s.num === aStep)?.key : void 0);
    if (!pinned) {
      const mid = pal?.steps.find((s) => s.num === 500)?.hex;
      if (mid) swatch2.style.background = mid;
    }
    if (auto) {
      const h = brandState.primary.h;
      hueVal.textContent = `${Math.round(h)}\xB0`;
      hueInput.value = String(h);
    }
    bands.replaceChildren(rampBands(pal?.steps ?? [], aStep));
  };
  return { row, refresh };
};
var renderPrimitives = (host) => {
  host.append(hero(
    "Start from your brand colors.",
    "Give the engine your exact hues. It grows each into a gamut-aware, contrast-placed ramp and pins your color as the anchor \u2014 never shifted. Every semantic role downstream aliases these."
  ));
  const refreshers = [];
  const brandSec = palSection("Brand palettes", "Each brand color grown into a gamut-aware, contrast-placed ramp \u2014 your color pinned as the anchor, never shifted.");
  const action = brandState.actionPalette ?? "primary";
  {
    const b = brandRow(
      () => hex(oklchToRgb(brandState.primary)),
      (h) => setPath2(brandState, "primary", rgbToOklch(hexToRgb(h))),
      "primary",
      "palette.primary",
      action === "primary",
      "primary",
      null,
      null
    );
    brandSec.append(b.row);
    refreshers.push(b.refresh);
  }
  const list = brandState.brandColors ?? [];
  list.forEach((bc, i) => {
    const nameEl = el("input", "pname-input mono");
    nameEl.type = "text";
    nameEl.value = bc.name;
    nameEl.spellcheck = false;
    nameEl.onchange = () => {
      const prev = bc.name, next = nameEl.value.trim() || bc.name;
      if (next === prev) return;
      const taken = /* @__PURE__ */ new Set(["primary", "neutral", ...list.filter((_, j) => j !== i).map((b2) => b2.name)]);
      if (taken.has(next)) {
        nameEl.value = prev;
        return;
      }
      bc.name = next;
      cascadeRename(prev, next);
      applyFull();
    };
    const b = brandRow(
      () => hex(oklchToRgb(bc.oklch)),
      (h) => {
        bc.oklch = rgbToOklch(hexToRgb(h));
      },
      bc.name,
      `palette.${bc.name}`,
      action === bc.name,
      bc.name,
      nameEl,
      () => {
        const removed = list[i].name;
        list.splice(i, 1);
        cascadeRemove(removed);
        applyFull();
      }
    );
    brandSec.append(b.row);
    refreshers.push(b.refresh);
  });
  brandSec.append(addButton("+ Add brand color", () => {
    const arr = brandState.brandColors ?? (brandState.brandColors = []);
    const names = new Set(arr.map((b) => b.name));
    let n = arr.length + 1, nm = `accent${n}`;
    while (names.has(nm)) nm = `accent${++n}`;
    arr.push({ name: nm, oklch: { l: 0.55, c: 0.15, h: 235 } });
    applyFull();
  }, "padd"));
  host.append(brandSec);
  const neuSec = palSection("Neutral", "A tinted gray scale that follows your brand hue automatically. Switch to Custom tint to tune it, or Pinned color to lock an exact brand gray.");
  {
    const n = neutralRow();
    neuSec.append(n.row);
    refreshers.push(n.refresh);
  }
  host.append(neuSec);
  const valSec = palSection("Status ramps", "The success / warning / danger / info ramps every semantic role aliases \u2014 auto-derived, seeded from a custom hue, or borrowed from a brand palette.");
  for (const role of STATUS_ROLES) {
    const s = statusRow(role);
    valSec.append(s.row);
    refreshers.push(s.refresh);
  }
  host.append(valSec);
  host.append(renderAlphaAndOpacity());
  setVolatile([brandSec, neuSec, valSec], () => {
    refreshers.forEach((r) => r());
  });
  paintVolatile();
};
var renderControl = (lever, commit2 = apply) => {
  const live = LIVE_CONTROLS.has(lever.control);
  let body;
  if (lever.control === "slider") {
    const input = rangeInput({ min: lever.min, max: lever.max, step: lever.step, value: getPath2(brandState, lever.key) ?? lever.default ?? lever.min ?? 0 });
    input.disabled = !live;
    const val = el("span", "knob-val", `${input.value}${lever.unit ?? ""}`);
    if (live) input.oninput = () => {
      setPath2(brandState, lever.key, Number(input.value));
      val.textContent = `${input.value}${lever.unit ?? ""}`;
      commit2();
    };
    body = knobBody(input, val);
  } else if (lever.control === "palette-ref" && live) {
    const sel = selectEl("sm");
    const palettes = ["primary", ...(brandState.brandColors ?? []).map((b) => b.name)];
    const cur = String(getPath2(brandState, lever.key) ?? lever.default ?? "primary");
    for (const p of palettes) sel.append(optionEl(p, p, p === cur));
    sel.onchange = () => {
      setPath2(brandState, lever.key, sel.value);
      commit2();
    };
    body = sel;
  } else if (lever.control === "enum") {
    const sel = selectEl("sm");
    const cur = getPath2(brandState, lever.key) ?? lever.default;
    for (const o of lever.options ?? []) sel.append(optionEl(String(o.value), o.label, o.value === cur));
    sel.disabled = !live;
    if (live) sel.onchange = () => {
      setPath2(brandState, lever.key, sel.value);
      commit2();
    };
    body = sel;
  } else if (lever.control === "toggle") {
    body = toggleField(!!(getPath2(brandState, lever.key) ?? lever.default), (checked) => {
      setPath2(brandState, lever.key, checked);
      commit2();
    });
  } else {
    const v = getPath2(brandState, lever.key) ?? lever.default;
    let text;
    if (Array.isArray(v)) text = v.map((it) => it?.name).filter(Boolean).join(", ") || `${v.length} item(s)`;
    else if (v && typeof v === "object") text = "configured";
    else text = String(v ?? lever.itemLabel ?? "\u2014");
    body = el("div", "knob-val ro", text);
  }
  return knob(lever.label, body, lever.description);
};
var renderPerModeSelect = (lever, key, opts, globalOf, parse, autoNote) => {
  const cur = getModeLever(currentMode, key);
  const sel = selectEl("sm fill");
  sel.append(optionEl("", `Auto \u2014 follows global (${globalOf()})`, cur == null));
  let matched = false;
  for (const [v, label] of opts) {
    const on = String(cur) === v;
    matched ||= on;
    sel.append(optionEl(v, label, on));
  }
  if (cur != null && !matched) sel.append(optionEl(String(cur), `${cur} (custom)`, true));
  sel.onchange = () => {
    setModeLever(currentMode, key, sel.value === "" ? void 0 : parse(sel.value));
    applyFull();
  };
  const desc = `${lever.description} \u2014 per ${MODE_LABEL[currentMode] ?? currentMode}; \u201CAuto\u201D follows the global ${autoNote}.`;
  return knob(lever.label, sel, desc);
};
var RADIUS_SCALE_OPTS = [["0", "0 \xB7 sharp"], ["0.5", "0.5"], ["1", "1 \xB7 default"], ["1.5", "1.5"], ["2", "2 \xB7 soft"]];
var TEMPO_OPTS = [["snappy", "Snappy"], ["standard", "Standard"], ["relaxed", "Relaxed"]];
var DENSITY_OPTS = [["compact", "Compact"], ["comfortable", "Comfortable"], ["spacious", "Spacious"]];
var renderPerModeRadius = (lever) => renderPerModeSelect(lever, "radius", RADIUS_SCALE_OPTS, () => String(brandState.radiusScale ?? lever.default ?? 1), Number, "corner softness");
var renderPerModeTempo = (lever) => renderPerModeSelect(lever, "tempo", TEMPO_OPTS, () => String(brandState.motionPersonality?.tempo ?? lever.default ?? "standard"), (s) => s, "tempo");
var renderPerModeDensity = (lever) => hook(
  renderPerModeSelect(lever, "density", DENSITY_OPTS, () => String(brandState.density ?? lever.default ?? "comfortable"), (s) => s, "density"),
  "per-mode-density"
);
var pairCellEl = (ct, paths) => {
  const td = el("td", "pair");
  if (paths) {
    td.append(el("span", "pair-path mono", `${ct.fg} on ${ct.bg}`));
    if (ct.label) td.append(el("span", "pair-sub", ct.label));
  } else {
    td.textContent = `${ct.component} \xB7 ${ct.variant} \u2014 ${ct.label ?? `${ct.min}:1`}`;
  }
  return td;
};
var contractTableEl = (contracts, paths = false) => {
  const table = el("table", "ctable");
  const thead = el("tr");
  thead.append(el("th", void 0, paths ? "Foreground on background" : "Pair"));
  for (const m of rp.modes) thead.append(el("th", "mcol", MODE_LABEL[m] ?? m));
  table.append(thead);
  for (const ct of contracts) {
    const tr = el("tr");
    tr.append(pairCellEl(ct, paths));
    for (const m of rp.modes) {
      const cell = el("td", "mcol");
      const r = ct.byMode[m];
      if (r) {
        cell.append(el("span", `dot ${r.pass ? "ok" : "no"}`), el("span", "ratio", r.ratio.toFixed(2)));
      } else cell.textContent = "\u2014";
      tr.append(cell);
    }
    table.append(tr);
  }
  return table;
};
var renderPreviewContracts = (host) => {
  const failing = rp.contracts.filter((ct) => rp.modes.some((m) => ct.byMode[m] && !ct.byMode[m].pass));
  const instances = rp.contracts.reduce((n, ct) => n + rp.modes.filter((m) => ct.byMode[m] && !ct.byMode[m].pass).length, 0);
  const sec = palSection(
    "Contrast contracts",
    `Every declared a11y pair (${rp.contracts.length}), computed on the resolved colors across all modes. The per-control badges on each editing page verify the active mode at the point of edit; the per-page tables scope this to what that page governs.`
  );
  const tally = el(
    "p",
    failing.length ? "pv-tally no" : "pv-tally ok",
    failing.length ? `${failing.length} of ${rp.contracts.length} pairs fall below their floor \u2014 ${instances} mode${instances === 1 ? "" : "s"} affected.` : "Every pair clears its floor in every mode."
  );
  sec.append(tally);
  sec.append(contractTableEl(rp.contracts));
  host.append(sec);
};
var tokenTableEl = (rows, cols) => {
  const table = el("table", mix("ctable", "toktable"));
  const thead = el("tr");
  thead.append(el("th", void 0, "Token"));
  for (const c of cols) thead.append(el("th", "mcol", c));
  table.append(thead);
  for (const r of rows) {
    const tr = el("tr");
    tr.append(el("td", "pair mono", r.name));
    for (const c of r.cells) {
      const td = el("td", "mcol");
      if (typeof c === "string") td.textContent = c;
      else td.append(c);
      tr.append(td);
    }
    table.append(tr);
  }
  return table;
};
var collectLeaves = (node, prefix, out) => {
  if (!node || typeof node !== "object") return;
  if (node.$type !== void 0) {
    out.push({ path: prefix, node });
    return;
  }
  for (const [k, v] of Object.entries(node)) if (!k.startsWith("$")) collectLeaves(v, prefix ? `${prefix}.${k}` : k, out);
};
var hexOfNode = (tree, node) => {
  const own = node?.$extensions?.prism3?.hex;
  if (own) return own;
  const v = node?.$value;
  if (typeof v === "string" && /^\{.+\}$/.test(v)) return hexOfNode(tree, deref(tree, subNode(tree, v)));
  if (typeof v === "string" && (v.startsWith("#") || v.startsWith("rgb"))) return v;
  return void 0;
};
var colorHexAt = (tree, node, mode, baseMode) => {
  const ov = node.$extensions?.prism3?.modes?.[mode];
  if (mode === baseMode || !node.$extensions?.prism3?.modes) return hexOfNode(tree, node);
  return ov?.$value ? hexOfNode(tree, deref(tree, subNode(tree, ov.$value))) : hexOfNode(tree, node);
};
var typeComposite = (tree, node, value, onTarget) => {
  const v = value ?? node.$value ?? {};
  const t = (alias) => {
    const n = subNode(tree, alias);
    return n && onTarget ? onTarget(n) : n;
  };
  const parts = [];
  if (v.fontFamily) parts.push(familyOf(tree, t(v.fontFamily)).split(",")[0].trim());
  if (v.fontWeight) parts.push(String(numOf(tree, t(v.fontWeight))));
  if (v.fontSize) parts.push(`${Math.round(remPxOf(tree, t(v.fontSize)))}px`);
  if (v.lineHeight) parts.push(`${numOf(tree, t(v.lineHeight))} lh`);
  if (v.letterSpacing) {
    const ls = deref(tree, t(v.letterSpacing));
    const em = ls?.$extensions?.prism3?.em;
    if (em != null) parts.push(`${em}em \xB7 ${emToPercentLabel(em)}`);
  }
  return parts.join(" \xB7 ");
};
var shadowCss = (layers) => Array.isArray(layers) ? layers.map((l) => `${l.offsetX} ${l.offsetY} ${l.blur} ${l.spread ?? "0"} ${l.color}`).join(", ") : "";
var tokTier = "primitive";
var tokShow = "both";
var tokPath = "full";
var tokCat = "";
var TOK_ALIAS = /^\{.+\}$/;
var tokTierOf = (node) => node.$type === "typography" ? "semantic" : typeof node.$value === "string" && TOK_ALIAS.test(node.$value) ? "semantic" : "primitive";
var COMPOSITE_PART = {
  fontFamily: "Family",
  fontSize: "Size",
  fontWeight: "Weight",
  lineHeight: "Leading",
  letterSpacing: "Tracking"
};
var renderPreviewTokens = (host) => {
  ensureThemeFresh();
  const tree = buildTree(theme).tree;
  const root = tree.$extensions?.prism3?.root ?? Object.keys(tree).find((k) => !k.startsWith("$"));
  const brand = tree[root];
  const modes = rp.modes;
  const baseMode = modes[0];
  const modeLabels = modes.map((m) => MODE_LABEL[m] ?? m);
  const rootRe = new RegExp("^" + root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\.");
  const valueAt = (node, m) => {
    const ov = node.$extensions?.prism3?.modes?.[m];
    if (m === baseMode || !ov) return node.$value;
    return ov.$value ?? ov;
  };
  const aliasAt = (node, m) => {
    const v = valueAt(node, m);
    return typeof v === "string" && TOK_ALIAS.test(v) ? v.replace(/[{}]/g, "").replace(rootRe, "") : void 0;
  };
  const hopAt = (node, m) => {
    const v = valueAt(node, m);
    return typeof v === "string" && TOK_ALIAS.test(v) ? subNode(tree, v) : void 0;
  };
  const targetAt = (node, m) => deref(tree, hopAt(node, m) ?? node);
  const compositeParts = (node, m) => {
    const v = valueAt(node, m);
    return node.$type !== "typography" || !v || typeof v !== "object" ? [] : Object.entries(v).filter(([, x]) => typeof x === "string" && TOK_ALIAS.test(x)).map(([k, x]) => ({ label: COMPOSITE_PART[k] ?? k, path: String(x).replace(/[{}]/g, "").replace(rootRe, "") }));
  };
  const valueText = (node, m) => {
    if (node.$type === "typography") return typeComposite(tree, node, valueAt(node, m), (n2) => {
      const ov = n2.$extensions?.prism3?.modes?.[m];
      return m === baseMode || !ov || typeof ov !== "object" ? n2 : { ...n2, ...ov };
    });
    if (node.$type === "shadow") return shadowCss(valueAt(node, m)) || "\u2014";
    const n = targetAt(node, m);
    const px = n?.$extensions?.prism3?.px;
    if (px != null) return `${px}px`;
    const val = n?.$value;
    return typeof val === "number" ? String(val) : String(val ?? "\u2014");
  };
  const tokCell = (node, m, canShort) => {
    const alias = aliasAt(node, m);
    const parts = compositeParts(node, m);
    const hasAlias = alias !== void 0 || parts.length > 0;
    const wantAlias = tokShow !== "value" && hasAlias;
    const wantValue = tokShow !== "alias" || !hasAlias;
    const wrap = el("div", wantAlias && wantValue ? "tok-two" : void 0);
    if (wantAlias && parts.length) {
      const g = el("div", "tok-stack");
      for (const part of parts) {
        g.append(el("span", "pfk", part.label));
        g.append(el("span", "mono tok-alias", tokPath === "short" && canShort ? part.path.split(".").slice(1).join(".") : part.path));
      }
      wrap.append(g);
    } else if (wantAlias && alias) {
      const a = el("span", "mono tok-alias", tokPath === "short" && canShort ? alias.split(".").slice(1).join(".") : alias);
      const hop = hopAt(node, m);
      if (hop && tokTierOf(hop) === "semantic") {
        const c = el("span", "tok-chain", " \u203A");
        c.title = `Aliases another semantic \u2014 resolves through to ${valueText(node, m)}`;
        a.append(c);
      }
      wrap.append(a);
    }
    if (wantValue) {
      const v = el("span", "tok-val");
      const hx = node.$type === "color" ? colorHexAt(tree, node, m, baseMode) : void 0;
      if (hx) v.append((() => {
        const s = el("span", "tok-sw");
        s.style.background = hx;
        return s;
      })());
      const txt = node.$type === "color" ? hx ?? "\u2014" : valueText(node, m);
      const t = el("span", "mono tok-hexv", txt);
      if (node.$type === "shadow" || node.$type === "typography") t.title = txt;
      v.append(t);
      wrap.append(v);
    }
    return wrap;
  };
  const refsVaryByMode = (node) => modes.some((m) => {
    if (hopAt(node, m)?.$extensions?.prism3?.modes) return true;
    const v = valueAt(node, m);
    return node.$type === "typography" && !!v && typeof v === "object" && Object.values(v).some((x) => typeof x === "string" && TOK_ALIAS.test(x) && subNode(tree, x)?.$extensions?.prism3?.modes);
  });
  const sections = [];
  for (const category of Object.keys(brand).filter((k) => !k.startsWith("$"))) {
    const all = [];
    collectLeaves(brand[category], "", all);
    const leaves = all.filter((l) => tokTierOf(l.node) === tokTier);
    if (!leaves.length) continue;
    const ns = [...new Set(leaves.flatMap((l) => [...modes.map((m) => aliasAt(l.node, m)), ...modes.flatMap((m) => compositeParts(l.node, m)).map((cp) => cp.path)].filter(Boolean).map((a) => a.split(".")[0])))].sort();
    const modeSource = leaves.some((l) => l.node.$extensions?.prism3?.modes) ? "own" : leaves.some((l) => refsVaryByMode(l.node)) ? "ref" : null;
    sections.push({ cat: category, leaves, hasModes: modeSource !== null, modeSource, ns });
  }
  const seg = el("div", mix("pvseg", "tok-seg"));
  for (const [k, label] of [["primitive", "Primitives"], ["semantic", "Semantics"]]) {
    const b = el("button", "pvseg-b" + (tokTier === k ? " on" : ""), label);
    b.onclick = () => {
      if (tokTier !== k) {
        tokTier = k;
        tokCat = "";
        paintVolatile();
      }
    };
    seg.append(b);
  }
  host.append(seg);
  const bar = el("div", "tok-ctrls");
  if (tokTier === "semantic") {
    const showSel = selectEl();
    for (const [v, label] of [["both", "Alias and value"], ["alias", "Alias only"], ["value", "Value only"]])
      showSel.append(new Option(label, v));
    showSel.value = tokShow;
    showSel.onchange = () => {
      tokShow = showSel.value;
      paintVolatile();
    };
    bar.append(pfield("Show", showSel));
    const pseg = el("div", "seg");
    for (const [k, label] of [["full", "Full"], ["short", "Short"]]) {
      const b = el("button", "seg-b" + (tokPath === k ? " on" : ""), label);
      b.onclick = () => {
        if (tokPath !== k) {
          tokPath = k;
          paintVolatile();
        }
      };
      pseg.append(b);
    }
    bar.append(pfield("Alias path", pseg));
  }
  const catSel = selectEl();
  catSel.append(new Option("All categories", ""));
  for (const s of sections) catSel.append(new Option(`${s.cat} (${s.leaves.length})`, s.cat));
  catSel.value = sections.some((s) => s.cat === tokCat) ? tokCat : tokCat = "";
  catSel.onchange = () => {
    tokCat = catSel.value;
    paintVolatile();
  };
  bar.append(pfield("Category", catSel));
  host.append(bar);
  const shown = sections.filter((s) => !tokCat || s.cat === tokCat);
  if (!shown.length) {
    host.append(el("p", "tok-empty", "No categories match this filter."));
    return;
  }
  for (const s of shown) {
    const canShort = s.ns.length === 1;
    const cols = s.hasModes ? modeLabels : ["Value"];
    const sec = palSection(
      s.cat.charAt(0).toUpperCase() + s.cat.slice(1),
      tokTier === "primitive" ? s.hasModes ? `${s.leaves.length} primitives, each with a per-mode variant \u2014 the exception to the rule below: a value that is genuinely different per mode, not a re-pointed alias.` : `${s.leaves.length} primitives \u2014 one value, no modes. The ramps are shared; a mode re-points a semantic at a different primitive, it never redefines one.` : `${s.leaves.length} semantics \u2014 ${s.modeSource === "own" ? "each mode aliases its own target" : s.modeSource === "ref" ? "one alias set; what those aliases resolve to varies per mode" : "mode-invariant, one value"}.`
    );
    const rows = s.leaves.map((l) => ({ name: l.path, cells: (s.hasModes ? modes : [baseMode]).map((m) => tokCell(l.node, m, canShort)) }));
    const scroll = el("div", "pv-tscroll");
    scroll.append(tokenTableEl(rows, cols));
    sec.append(scroll);
    if (tokTier === "semantic" && tokPath === "short" && s.ns.length) {
      const note = el("p", "tok-callout");
      note.textContent = canShort ? `All aliases in this table resolve under ${s.ns[0]}.* \u2014 prefix hidden.` : `Full paths kept: this table aliases into ${s.ns.join(" and ")}, so one shared prefix would be wrong here.`;
      sec.append(note);
    }
    host.append(sec);
  }
};
var SG_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 15 9l7 .5-5.3 4.6L18.2 21 12 17l-6.2 4 1.5-6.9L2 9.5 9 9z"/></svg>';
var renderPreviewStyleGuide = (host) => {
  const rolesByMode = new Map(
    resolveAllModes(theme).map((x) => [x.mode, x.roles])
  );
  const cur = currentMode;
  const OPP = { light: "dark", dark: "light", "hc-light": "hc-dark", "hc-dark": "hc-light" };
  const opp = OPP[cur] && rolesByMode.has(OPP[cur]) ? OPP[cur] : rp.modes.find((m) => m !== cur) ?? cur;
  const ns = theme.namespace + ".";
  const role = (m, k) => rolesByMode.get(m)?.[k];
  const rgba = (hx, a) => {
    const n = parseInt(hx.slice(1), 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
  };
  const paint = (m, k) => {
    const r = role(m, k);
    return r ? r.alpha != null ? rgba(r.hex, r.alpha) : r.hex : "transparent";
  };
  const stepOf = (r) => r.path.startsWith(ns) ? r.path.slice(ns.length) : r.path;
  const fails = (m, k) => {
    const r = role(m, k);
    return !!(r && r.min > 0 && r.ratio < r.min);
  };
  const tipOf = (m, k) => {
    const r = role(m, k);
    if (!r) return `${k} \u2014 unset`;
    const c = r.min > 0 ? ` \xB7 ${r.ratio.toFixed(2)}:1 (min ${r.min})` : "";
    return `${stepOf(r)} \xB7 ${r.hex}${c}`;
  };
  const sgPill = (k, label, m = cur) => {
    const path = label ?? colorPath(k);
    const p = tokenPillSpan(path);
    p.textContent = "";
    path.split(".").forEach((seg, i, all) => {
      p.append(i < all.length - 1 ? `${seg}.` : seg);
      if (i < all.length - 1) p.append(el("wbr"));
    });
    p.setAttribute("data-sgtip", tipOf(m, k));
    if (fails(m, k)) {
      addClass(p, mix("sg-failpill"));
      p.append(el("b", "sg-fx", "!"));
    }
    return withInverseBadge(path, p);
  };
  const pills = (...nodes) => {
    const w = el("div", "sg-pills");
    nodes.forEach((n) => w.append(n));
    return w;
  };
  const grid = (cols, cards) => {
    const g = el("div", `sg-grid sg-g${cols}`);
    cards.forEach((c) => g.append(c));
    return g;
  };
  const surfaceCard = (k, label, inkRole, sub, extra = []) => {
    const cw = el("div", "sg-cw");
    const card = el("div", "sg-card");
    card.style.background = paint(cur, k);
    if (fails(cur, k)) card.append(el("span", "sg-failmk", "!"));
    const lab = el("div", "sg-lab", label);
    specimen(lab).style.color = paint(cur, inkRole);
    card.append(lab);
    if (sub) {
      const sb = el("div", "sg-sub", sub);
      specimen(sb).style.color = paint(cur, inkRole);
      card.append(sb);
    }
    cw.append(card, pills(sgPill(k), ...extra));
    return cw;
  };
  const scrimCard = (k) => {
    const cw = el("div", "sg-cw");
    const card = el("div", "sg-card sg-scrimcard");
    card.style.background = paint(cur, "background.primary");
    const dim = el("div", "sg-scrimdim");
    dim.style.background = paint(cur, k);
    const panel = el("div", "sg-scrimpanel");
    panel.style.background = paint(cur, "foreground.primary");
    const lab = el("div", "sg-lab", "Modal");
    specimen(lab).style.color = paint(cur, "text.primary");
    panel.append(lab);
    dim.append(panel);
    card.append(dim);
    cw.append(card, pills(sgPill(k)));
    return cw;
  };
  const borderCard = (k) => {
    const cw = el("div", "sg-cw");
    const card = el("div", "sg-card sg-bcard");
    card.style.border = `2px solid ${paint(cur, k)}`;
    if (fails(cur, k)) card.append(el("span", "sg-failmk", "!"));
    cw.append(card, pills(sgPill(k)));
    return cw;
  };
  const iconCard = (k, bgRole) => {
    const cw = el("div", "sg-cw");
    const card = el("div", "sg-card sg-icard");
    if (bgRole) {
      card.style.background = paint(cur, bgRole);
      card.style.border = "none";
    }
    const ico = el("span", "sg-ico");
    specimen(ico).style.color = paint(cur, k);
    ico.innerHTML = SG_ICON;
    card.append(ico);
    cw.append(card, pills(sgPill(k)));
    return cw;
  };
  const SG_SURFACES = [
    { key: "background.primary", label: "Page", ink: "text.primary", line: "border.primary", line2: "border.secondary", tiered: true },
    { key: "background.secondary", label: "Page, second tier", ink: "text.primary", line: "border.primary", line2: "border.secondary", tiered: true },
    // The inverse band has ONE on-color ink, so the supporting tiers collapse onto it rather than
    // borrowing a page-gated role that was never measured against this ground.
    { key: "inverse.background.primary", label: "Inverse", ink: "inverse.text.primary", line: "inverse.border.primary", line2: "inverse.border.primary", tiered: false }
  ];
  const surf = SG_SURFACES.find((x) => x.key === sgSurface) ?? SG_SURFACES[0];
  const ground = (sec) => {
    const g = el("div", "sg-ground");
    const head = sec.querySelector(".psec-head");
    while (sec.lastChild && sec.lastChild !== head) g.prepend(sec.lastChild);
    const bg = paint(cur, surf.key);
    const support = surf.tiered ? paint(cur, "text.secondary") : paint(cur, surf.ink);
    g.style.background = bg;
    g.style.setProperty("--panel", bg);
    g.style.setProperty("--paper", paint(cur, surf.tiered ? "background.secondary" : surf.key));
    g.style.setProperty("--line", paint(cur, surf.line));
    g.style.setProperty("--line2", paint(cur, surf.line2));
    g.style.setProperty("--ink", paint(cur, surf.ink));
    g.style.setProperty("--ink2", support);
    g.style.setProperty("--muted", support);
    g.style.setProperty("--faint", support);
    sec.append(g);
    return sec;
  };
  const bar = el("div", "sg-surfbar");
  const sel = hook(selectEl("cap"), "style-guide-ground");
  for (const o of SG_SURFACES) sel.append(optionEl(o.key, o.label, o.key === surf.key));
  sel.onchange = () => {
    sgSurface = sel.value;
    renderWorkspace();
  };
  const stack = el("div", "sg-surfstack");
  const row = el("div", "sg-surfrow");
  const sw = el("span", "sg-surfsw");
  sw.style.background = paint(cur, surf.key);
  row.append(sw, sel);
  stack.append(row, sgPill(surf.key));
  bar.append(pfield("View style guide on", stack));
  host.append(bar);
  const SEM = [["Brand", "brand"], ["Danger", "danger"], ["Success", "success"], ["Warning", "warning"], ["Info", "info"]];
  const secBg = palSection("Background", "The base page planes, their inverse counterparts, and the scrim that dims them behind a modal.");
  secBg.append(subHead("Base"), grid(3, [["Primary", "background.primary"], ["Secondary", "background.secondary"], ["Tertiary", "background.tertiary"]].map(([n, k]) => surfaceCard(k, n, "text.primary"))));
  secBg.append(subHead("Inverse"), grid(3, [["Primary", "inverse.background.primary"], ["Secondary", "inverse.background.secondary"], ["Tertiary", "inverse.background.tertiary"]].map(([n, k], i) => surfaceCard(k, n, "inverse.text.primary", i === 0 ? "Inverse text" : void 0, i === 0 ? [sgPill("inverse.text.primary")] : []))));
  secBg.append(subHead("Scrim"), grid(3, [scrimCard("scrim.default")]));
  host.append(ground(secBg));
  const secFg = palSection("Foreground", "Content surfaces placed ON the page \u2014 the neutral and inverse ladders, plus semantic fills in bold and subtle weights, each paired with its on-surface text.");
  secFg.append(subHead("Neutral"), grid(3, [["Primary", "foreground.primary"], ["Secondary", "foreground.secondary"], ["Tertiary", "foreground.tertiary"]].map(([n, k]) => surfaceCard(k, n, "text.primary"))));
  secFg.append(subHead("Inverse"), grid(3, [["Primary", "inverse.foreground.primary"], ["Secondary", "inverse.foreground.secondary"], ["Tertiary", "inverse.foreground.tertiary"]].map(([n, k]) => surfaceCard(k, n, "inverse.text.primary"))));
  secFg.append(subHead("Bold"), grid(5, SEM.map(([n, s]) => surfaceCard(`foreground.${s}`, n, `text.on-${s}`, "On-color text", [sgPill(`text.on-${s}`)]))));
  secFg.append(subHead("Subtle"), grid(5, SEM.map(([n, s]) => surfaceCard(`foreground.${s}-subtle`, n, `text.${s}`, "On-color text", [sgPill(`text.${s}`)]))));
  host.append(ground(secFg));
  const secText = palSection("Text color", "Every text color at one size, shown on the current surface and its inverse counterpart. On-color text lives with the fills above.");
  const curLabel = MODE_LABEL[cur] ?? cur, oppLabel = MODE_LABEL[opp] ?? opp;
  const lbg = paint(cur, "background.primary"), dbg = paint(opp, "background.primary");
  const tcHead = (txt, cls, color) => {
    const d = el("div", `sg-tc ${cls} sg-tchd`, txt);
    specimen(d).style.color = color;
    return d;
  };
  const tcCell = (nm, k, m, cls, ul) => {
    const d = el("div", `sg-tc ${cls} sg-tcrow`);
    specimen(d).style.color = paint(m, k);
    const sp = el("span", "sg-samp", nm);
    if (ul) sp.style.textDecoration = "underline";
    d.append(sp);
    if (fails(m, k)) d.append(el("b", "sg-fx", "!"));
    return d;
  };
  const tcGroups = [
    ["Neutral", [["Primary", "text.primary"], ["Secondary", "text.secondary"], ["Tertiary", "text.tertiary"]], false],
    ["Semantic", SEM.map(([n, s]) => [n, `text.${s}`]), false],
    ["Semantic \u2014 subtle", SEM.map(([n, s]) => [n, `text.${s}-subtle`]), false],
    ["Links", [["Link", "text.link.default"], ["Hover", "text.link.hover"], ["Pressed", "text.link.pressed"], ["Visited", "text.link.visited"], ["Focused", "text.link.focused"]], true]
  ];
  for (const [glab, items, ul] of tcGroups) {
    secText.append(subHead(glab));
    const g = el("div", "sg-tcg");
    g.style.setProperty("--lbg", lbg);
    g.style.setProperty("--dbg", dbg);
    g.append(tcHead(`On ${curLabel} surface`, "sg-l", paint(cur, "text.tertiary")), tcHead(`On ${oppLabel} surface`, "sg-r", paint(opp, "text.tertiary")), tcHead("Token", "sg-t", "var(--faint)"));
    for (const [nm, k] of items) {
      g.append(tcCell(nm, k, cur, "sg-l", ul), tcCell(nm, k, opp, "sg-r", ul));
      const tc = el("div", "sg-tc sg-t sg-tcrow");
      tc.append(sgPill(k));
      g.append(tc);
    }
    secText.append(g);
  }
  const callout = el("div", "sg-callout");
  callout.append(document.createTextNode("Links draw only from the action ramp \u2014 the engine defines "));
  callout.append(el("span", "mono", "text.link.default / hover / pressed / visited / focused"));
  callout.append(document.createTextNode(" and no neutral or accent link roles. The engaged states step by a perceptual interval, so hover, pressed, and visited stay clearly distinct even where the link color sits deep in the ramp. Focused resolves to the same color as default: the focus ring carries that state, so the link text does not shift."));
  secText.append(callout);
  host.append(ground(secText));
  const secBorder = palSection("Border", "Neutral separators, the focus ring, and semantic borders \u2014 their own category, not a surface.");
  secBorder.append(subHead("Neutral"), grid(3, ["border.primary", "border.secondary", "border.tertiary", "inverse.border.primary"].map((k) => borderCard(k))));
  secBorder.append(subHead("Focus & semantic"), grid(3, ["border.focus", "inverse.border.focus", "border.brand", "border.danger", "border.success", "border.warning", "border.info"].map((k) => borderCard(k))));
  host.append(ground(secBorder));
  const secIcon = palSection("Icon", "Icon color at the neutral tiers, the semantic set, and the on-color icons that sit on bold fills.");
  secIcon.append(subHead("Neutral"), grid(3, ["icon.primary", "icon.secondary", "icon.tertiary"].map((k) => iconCard(k))));
  secIcon.append(subHead("Semantic"), grid(5, ["icon.brand", "icon.danger", "icon.success", "icon.warning", "icon.info"].map((k) => iconCard(k))));
  secIcon.append(subHead("On color"), grid(5, SEM.map(([, s]) => iconCard(`icon.on-${s}`, `foreground.${s}`))));
  host.append(ground(secIcon));
  const secDis = palSection("Disabled", "One shared, stateless inert set \u2014 reused by every control. No per-palette or inverse variant.");
  const disCards = [];
  {
    const cw = el("div", "sg-cw");
    const c = el("div", "sg-card");
    c.style.background = paint(cur, "disabled.fill");
    cw.append(c, pills(sgPill("disabled.fill")));
    disCards.push(cw);
  }
  {
    const cw = el("div", "sg-cw");
    const c = el("div", "sg-card sg-mid");
    c.style.background = paint(cur, "disabled.fill");
    const l = el("div", "sg-lab", "Disabled");
    specimen(l).style.color = paint(cur, "disabled.on-fill");
    c.append(l);
    cw.append(c, pills(sgPill("disabled.on-fill")));
    disCards.push(cw);
  }
  {
    const cw = el("div", "sg-cw");
    const c = el("div", "sg-card sg-mid");
    c.style.background = "var(--panel)";
    const l = el("div", "sg-lab", "Disabled");
    specimen(l).style.color = paint(cur, "disabled.text");
    c.append(l);
    cw.append(c, pills(sgPill("disabled.text")));
    disCards.push(cw);
  }
  disCards.push(borderCard("disabled.border"), iconCard("disabled.icon"));
  secDis.append(grid(5, disCards));
  host.append(ground(secDis));
  const secInt = palSection("Interactive", "Each interactive palette in three treatments \u2014 filled, outline, inverse \u2014 with its rest / hover / pressed set laid out in a row. Each button is tagged with its exact fill token; the treatment label carries the supporting token. Disabled is one shared, stateless set. This style guide covers Primary, Neutral and Destructive only \u2014 accent palettes aren\u2019t shown here.");
  const STATES2 = ["rest", "hover", "pressed"];
  const btn = (bg, fg, bd, pair) => {
    const b = hook(el("button", "sg-btn", "Button"), "style-guide-button");
    b.style.background = bg;
    (pair ? specimenPair(b, ...pair) : specimen(b)).style.color = fg;
    if (bd) b.style.borderColor = bd;
    return b;
  };
  const bcol = (bg, fg, bd, st, fullkey, subpath, pair) => {
    const c = hook(el("div", "sg-bcol"), "style-guide-state");
    c.append(btn(bg, fg, bd, pair), hook(el("span", "sg-st", st), "style-guide-state-name"), sgPill(fullkey, subpath));
    return c;
  };
  const footLine = (lbl, p) => {
    const s = el("span", "sg-foothint");
    s.append(document.createTextNode(lbl + " "), p);
    return s;
  };
  const trow = (label, foot, cols, inv) => {
    const row2 = el("div", "sg-trow");
    const lab = el("div", "sg-tlab", label);
    if (foot.length) {
      const f = el("div", "sg-tlfoot");
      foot.forEach((n) => f.append(n));
      lab.append(f);
    }
    const bs = hook(el("div", "sg-btns" + (inv ? " sg-inv" : "")), "style-guide-buttons");
    if (inv) {
      const invBg = paint(cur, "inverse.background.primary");
      bs.style.setProperty("--sg-invp", invBg);
      bs.style.setProperty("--sg-invp-ink", legibleInkOn(invBg, "#191920", "#c9ccce"));
    }
    cols.forEach((c) => bs.append(c));
    row2.append(lab, bs);
    return row2;
  };
  const onInverseGround = isInverseRole(surf.key);
  const paletteBlock = (nm, c) => {
    const block = hook(el("div", "sg-pblock"), "style-guide-palette");
    const hd = el("div", "sg-phd");
    hd.append(el("span", "sg-rn", nm), sgPill(`interactive.${c}.fill.rest`, `color.interactive.${c}`));
    block.append(hd);
    const filled = STATES2.map((s) => bcol(
      paint(cur, `interactive.${c}.fill.${s}`),
      paint(cur, `interactive.${c}.on-fill`),
      null,
      s,
      `interactive.${c}.fill.${s}`,
      `fill.${s}`,
      [`interactive.${c}.on-fill`, `interactive.${c}.fill.${s}`]
    ));
    const rolesFor = (s) => outlineStateRoles(theme.outlineInteraction, c, s, onInverseGround);
    const bgFor = Object.fromEntries(
      STATES2.map((s) => {
        const k = rolesFor(s).fill;
        return [s, k ? paint(cur, k) : "transparent"];
      })
    );
    const otxt = (s) => rolesFor(s).text;
    const obdFor = (s) => rolesFor(s).border;
    const obd = obdFor("rest");
    const outline = STATES2.map((s) => bcol(bgFor[s], paint(cur, otxt(s)), paint(cur, obdFor(s)), s, otxt(s), `text.${s}`));
    const inv = STATES2.map((s) => bcol(
      paint(cur, `inverse.interactive.${c}.fill.${s}`),
      paint(cur, `inverse.interactive.${c}.on-fill`),
      null,
      s,
      `inverse.interactive.${c}.fill.${s}`,
      `fill.${s}`,
      [`inverse.interactive.${c}.on-fill`, `inverse.interactive.${c}.fill.${s}`]
    ));
    block.append(trow("Filled", [footLine("text", sgPill(`interactive.${c}.on-fill`, "on-fill"))], filled, false));
    block.append(hook(trow("Outline", [footLine("border", sgPill(obd, "border"))], outline, false), "style-guide-outline"));
    block.append(trow("Inverse", [footLine("text", sgPill(`inverse.interactive.${c}.on-fill`, "on-fill"))], inv, !onInverseGround));
    return block;
  };
  secInt.append(paletteBlock("Primary", "primary"), paletteBlock("Neutral", "neutral"), paletteBlock("Destructive", "destructive"));
  {
    const block = hook(el("div", "sg-pblock"), "style-guide-palette");
    const hd = el("div", "sg-phd");
    hd.append(el("span", "sg-rn", "Disabled"), sgPill("disabled.fill", "color.disabled"));
    block.append(hd);
    block.append(trow("Filled", [footLine("text", sgPill("disabled.on-fill", "on-fill"))], [bcol(paint(cur, "disabled.fill"), paint(cur, "disabled.on-fill"), null, "disabled", "disabled.fill", "fill", ["disabled.on-fill", "disabled.fill"])], false));
    block.append(hook(trow("Outline", [footLine("text", sgPill("disabled.text", "text"))], [bcol("transparent", paint(cur, "disabled.text"), paint(cur, "disabled.border"), "disabled", "disabled.border", "border")], false), "style-guide-outline"));
    block.append(trow("Inverse", [el("span", "sg-foothint", "shared \u2014 no inverse variant")], [bcol(paint(cur, "disabled.fill"), paint(cur, "disabled.on-fill"), null, "disabled", "disabled.fill", "fill", ["disabled.on-fill", "disabled.fill"])], !onInverseGround));
    secInt.append(block);
  }
  host.append(ground(secInt));
};
var PAGE_COPY = {
  palettes: ["", ""],
  // Palettes has its own hero in renderPrimitives
  surfaces: ["Surfaces & fills.", "The page backgrounds every role sits on, the text colors derived to stay readable on them, and an optional brand gradient. Text is contrast-placed \u2014 override to a specific neutral step and the badge tells you whether it still clears. (Status hues are edited per-ramp on Palettes.)"],
  interactive: ["Interactive color & states.", "Point actions at the palette that reads best, tune the interactive treatment (hover, inverse, neutral emphasis), and set the accessibility policy \u2014 icon contrast + the disabled strategy."],
  typography: ["Set the type system.", "Families, weights, and the type scale that shifts the semantic\u2192primitive size mapping. The rem ladder is brand-invariant; the scale is the dial."],
  elevation: ["Elevation.", "The shadow ramp \u2014 blur/offset softness and an optional brand-hued tint on the shadow base. Dark modes get a reduced set automatically."],
  sizeRadius: ["Size & radius.", "Component sizing (control height, driven by density) and corner radius. Both go per-mode outside Light. Each component sets its own padding, and density moves it one step on the spacing scale."],
  layout: ["Layout.", "Breakpoints, grid columns, and container widths \u2014 the responsive frame the system lays out within."],
  motion: ["Motion.", "Tempo (the duration ramp) and the expressive easing curve. Reduce-motion is derived."],
  preview: ["Preview your system.", "The style guide, the full contrast-contract table, and every resolved token \u2014 through the mode picked above. Switch modes to preview them; this is the one place the whole system renders together."],
  // #718. The lede states the role rather than the feature, because that is the fact this page exists
  // to convey: the write is how the anatomy schema is proven to materialize, not a component library
  // the brand ships. Naming the one def and the member count keeps it from reading as a catalog.
  styleGuide: ["Style guide.", "Token tables drawn from this file\u2019s variables: each palette as a scale on Primitive tokens, each role family on Semantic tokens. One column per mode, each swatch bound to its variable and drawn on the ground its contrast is measured against. Run it after Apply to Figma."],
  components: ["Components.", "Internal \u2014 the Button set, written onto the Figma canvas from the component definition. One definition carries the anatomy this needs, so one component builds: 648 variants across intent, appearance, size, state, and the two icon slots. This is how the definition format is proven to materialize, not a component library the brand ships."]
};
var STATUS_ROLES = ["success", "warning", "danger", "info"];
var statusSeedHex = (role) => {
  const cur = brandState.status?.[role];
  if (cur) return hex(oklchToRgb(cur));
  const pal = theme.palettes.find((p) => p.palette === role);
  return pal?.steps.find((s) => s.num === 500)?.hex ?? pal?.steps[Math.floor(pal.steps.length / 2)]?.hex ?? "#808080";
};
var setStatusHue = (role, hexVal) => {
  const rc = { ...brandState.roleColors ?? {} };
  delete rc[role];
  const o = rgbToOklch(hexToRgb(hexVal));
  brandState.roleColors = Object.keys(rc).length ? rc : void 0;
  brandState.status = { ...brandState.status ?? {}, [role]: { l: o.l, c: o.c, h: o.h, chroma: o.c } };
  apply();
};
var statusRow = (role) => {
  const borrowed = brandState.roleColors?.[role];
  const custom = !borrowed && !!brandState.status?.[role];
  const row = el("div", "prow" + (custom ? " authored show-hex" : ""));
  const head = el("div", "phead");
  const ident = el("div", "pident");
  let swatch2;
  let hexLab = null;
  if (custom) {
    const picker = el("input", "pswatch");
    picker.type = "color";
    picker.value = statusSeedHex(role);
    picker.title = `Seed the ${role} ramp from a hue`;
    picker.onchange = () => {
      setStatusHue(role, picker.value);
      if (hexLab) hexLab.textContent = picker.value;
    };
    swatch2 = picker;
  } else {
    swatch2 = el("div", "pswatch ro");
  }
  const idcol = el("div", "pidcol");
  idcol.append(el("span", "pname", role));
  const sub = el("div", "psub");
  if (custom) {
    hexLab = el("span", "phex mono", swatch2.value);
    sub.append(hexLab);
  }
  sub.append(tokenPill(`palette.${role}`));
  idcol.append(sub);
  ident.append(swatch2, idcol);
  const origin = el("div", "porigin");
  const sel = selectEl("sm");
  sel.append(optionEl("auto", "Auto", !borrowed && !custom), optionEl("custom", "Custom hue\u2026", custom));
  for (const p of ["primary", ...(brandState.brandColors ?? []).map((b) => b.name)]) sel.append(optionEl("borrow:" + p, `Use ${p}`, borrowed === p));
  sel.onchange = () => {
    const rc = { ...brandState.roleColors ?? {} };
    delete rc[role];
    const st = { ...brandState.status ?? {} };
    delete st[role];
    if (sel.value === "custom") {
      const o = rgbToOklch(hexToRgb(statusSeedHex(role)));
      st[role] = { l: o.l, c: o.c, h: o.h, chroma: o.c };
    } else if (sel.value.startsWith("borrow:")) rc[role] = sel.value.slice("borrow:".length);
    brandState.roleColors = Object.keys(rc).length ? rc : void 0;
    brandState.status = Object.keys(st).length ? st : void 0;
    applyFull();
  };
  origin.append(pfield("Source", sel));
  const anchor = anchorField();
  head.append(ident, origin, anchor.field);
  const bands = el("div", "pramp-wrap");
  row.append(head, bands);
  const refresh = () => {
    const resolved = theme.roleToPalette[role] ?? role;
    const srcName = borrowed ?? resolved;
    const pal = theme.palettes.find((p) => p.palette === srcName);
    const steps = pal?.steps ?? [];
    const aStep = anchorStepFor(srcName);
    const note = borrowed ? `borrowing ${borrowed}` : resolved !== role ? `via ${resolved}` : void 0;
    anchor.set(aStep != null ? steps.find((s) => s.num === aStep)?.key : void 0, note);
    if (!custom) {
      const mid = steps.find((s) => s.num === 500)?.hex ?? steps[Math.floor(steps.length / 2)]?.hex;
      if (mid) swatch2.style.background = mid;
    }
    bands.replaceChildren(rampBands(steps, aStep));
  };
  return { row, refresh };
};
var subHead = (title) => {
  const s = el("div", "sub-lab");
  s.append(el("h3", "sub-t", title));
  return s;
};
var stepKeyOf = (path) => path ? path.split(".").pop() : "";
var contrastBadge = (ratio, min, label) => {
  const b = el("span", `cbadge ${ratio >= min ? "ok" : "no"}`);
  if (label) b.append(el("span", "cb-lab", label));
  b.append(hook(el("span", "cb-ratio", `${ratio.toFixed(2)}:1`), "contrast-ratio"), el("span", "cb-mark", ratio >= min ? "\u2713" : "\u2717"));
  return b;
};
var swatch = (bg, cls = "sw") => {
  const s = el("div", cls);
  s.style.background = bg;
  return s;
};
var iRoles = () => resolveAllModes(theme).find((x) => x.mode === currentMode)?.roles ?? {};
var stepsOf = (palette) => (theme.palettes.find((p) => p.palette === palette)?.steps ?? []).map((s) => s.key);
var capWord = (s) => s.charAt(0).toUpperCase() + s.slice(1);
var baselineOf = (roleKey, mode, without) => {
  const roles = resolveAllModes(without(theme)).find((x) => x.mode === mode)?.roles;
  return stepKeyOf(roles?.[roleKey]?.path);
};
var baselineStepOf = (roleKey, mode = currentMode) => baselineOf(roleKey, mode, (t) => {
  const modeOv = { ...t.overrides?.[mode] ?? {} };
  delete modeOv[roleKey];
  return { ...t, overrides: { ...t.overrides, [mode]: modeOv } };
});
var baselineAnchorStepOf = (roleKey, mode, name) => baselineOf(roleKey, mode, (t) => mode === "light" ? {
  ...t,
  actionAnchorStep: name === "primary" ? void 0 : t.actionAnchorStep,
  destructiveAnchorStep: name === "destructive" ? void 0 : t.destructiveAnchorStep,
  interactivePalettes: t.interactivePalettes.map((p) => p.name === name ? { ...p, anchorStep: void 0 } : p)
} : { ...t, modeAnchors: { ...t.modeAnchors, [mode]: { ...t.modeAnchors?.[mode] ?? {}, [name]: void 0 } } });
var rgbaOf = (r) => {
  const h = (r.hex ?? "#000000").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `rgba(${n >> 16 & 255}, ${n >> 8 & 255}, ${n & 255}, ${r.alpha ?? 1})`;
};
var isWash = (r) => (r.alpha ?? 1) < 1;
var washCss = (roles, r) => {
  const ground = (r.against ? roles[r.against]?.hex : void 0) ?? roles["background.primary"]?.hex ?? "#ffffff";
  const c = rgbaOf(r);
  return `linear-gradient(${c}, ${c}), ${ground}`;
};
var washSourceRead = (r) => {
  if (r.tint) {
    const n2 = hook(el("span", "sf-derived", `fill at ${r.tint.opacity}%`), "source-readout");
    n2.title = "The button\u2019s own fill at an opacity step, chosen to keep the hover label readable and the hover visible. Change the fill to change its color.";
    return n2;
  }
  const parts = (r.path ?? "").split(".");
  const n = hook(el("span", "sf-derived", parts.length >= 2 ? `${parts[parts.length - 2]} ${stepKeyOf(r.path)}` : r.path ?? "\u2014"), "source-readout");
  n.title = "A translucent wash has no ramp step to swap in \u2014 a step of the neutral ramp is opaque, and would replace the wash rather than retint it.";
  return n;
};
var roleSourceSelect = (roles, roleKey, palette, derivedStep) => {
  const r = roles[roleKey];
  if (r && isWash(r)) return washSourceRead(r);
  const cur = brandState.overrides?.[currentMode]?.[roleKey]?.step;
  return stepPicker(
    palette,
    stepsOf(palette),
    derivedStep,
    typeof cur === "string" ? cur : void 0,
    (step) => setFillOverride(roleKey, palette, step),
    contrastMark(roleKey, palette)
  );
};
var invFillSourceSelect = (roleKey, assignedPalette, neutralPalette) => {
  const sel = selectEl("cap");
  const curOv = brandState.overrides?.[currentMode]?.[roleKey];
  const cur = typeof curOv?.step === "string" ? `${curOv.palette}::${curOv.step}` : void 0;
  const absName = baselineStepOf(roleKey);
  sel.append(optionEl("", `Auto \xB7 ${absName} (crisp)`, cur == null));
  const addPalette = (pal) => {
    const mark = contrastMark(roleKey, pal);
    for (const s of stepsOf(pal)) sel.append(optionEl(`${pal}::${s}`, `${pal} ${s}${mark?.(s) ?? ""}`, cur === `${pal}::${s}`));
  };
  addPalette(assignedPalette);
  if (neutralPalette !== assignedPalette) addPalette(neutralPalette);
  sel.onchange = () => {
    if (sel.value === "") {
      setFillOverride(roleKey, assignedPalette, void 0);
      return;
    }
    const [pal, step] = sel.value.split("::");
    setFillOverride(roleKey, pal, step);
  };
  return sel;
};
var contrastMark = (roleKey, palette) => {
  const roles = iRoles();
  const r = roles[roleKey];
  const min = r?.min ?? 0;
  if (!r || min <= 0 || !r.against || r.against === "self") return void 0;
  const againstHex = roles[r.against]?.hex;
  if (!againstHex) return void 0;
  const againstRgb = hexToRgb(againstHex);
  const steps = theme.palettes.find((p) => p.palette === palette)?.steps ?? [];
  const label = ` \xB7 \u2713 ${String(min).replace(/\.0$/, "")}:1`;
  return (step) => {
    const s = steps.find((x) => x.key === step);
    if (!s) return "";
    return contrast(hexToRgb(s.hex), againstRgb) >= min ? label : "";
  };
};
var wirePress = (n) => {
  addClass(n, mix("pinnable"));
  n.title = "Click to hold the pressed state";
  n.onclick = (e) => {
    e.preventDefault();
    n.classList.toggle("is-pressed");
  };
};
var exGround = (dark) => iRoles()[dark ? "inverse.background.primary" : "background.primary"]?.hex ?? (dark ? "#0d0d10" : "#ffffff");
var exBtn = (bg, fg, dark = false, label = "Button", hover, pressed) => {
  const box = hook(el("div", "exbox" + (dark ? " dark" : "")), "example-ground");
  box.style.background = exGround(dark);
  const b = hook(el("span", "ibtn"), "example-button");
  b.style.setProperty("--ibtn-bg", bg);
  specimen(b).style.color = fg;
  if (hover) b.style.setProperty("--ibtn-hbg", hover);
  if (pressed) {
    b.style.setProperty("--ibtn-pbg", pressed);
    wirePress(b);
  }
  b.append(document.createTextNode(label), iconEl("arrow", fg));
  box.append(b);
  return box;
};
var exLink = (color, dark = false, hover, pressed) => {
  const box = hook(el("div", "exbox" + (dark ? " dark" : "")), "example-ground");
  box.style.background = exGround(dark);
  const a = el("a", "ilink", "Text link");
  a.style.setProperty("--ilink-fg", color);
  if (hover) a.style.setProperty("--ilink-hfg", hover);
  if (pressed) {
    a.style.setProperty("--ilink-pfg", pressed);
    wirePress(a);
  }
  box.append(a);
  return box;
};
var edgeOf = (roles, prefix, state = "rest") => roles[`${prefix}.border.${state}`]?.hex ?? roles[`${prefix}.text.${state}`]?.hex ?? "#000000";
var exOutline = (edge, wash, dark = false, hoverWash, pressedWash, o = {}) => {
  const box = hook(el("div", "exbox" + (dark ? " dark" : "")), "example-ground");
  box.style.background = exGround(dark);
  const ink = o.ink ?? edge;
  const b = hook(el("span", "ibtn"), "example-button");
  b.style.setProperty("--ibtn-bg", wash);
  specimen(b).style.color = ink;
  b.style.setProperty("--ibtn-bw", "1.5px");
  b.style.setProperty("--ibtn-bd", edge);
  if (o.hoverEdge) b.style.setProperty("--ibtn-hbd", o.hoverEdge);
  if (o.pressedEdge) b.style.setProperty("--ibtn-pbd", o.pressedEdge);
  if (hoverWash) b.style.setProperty("--ibtn-hbg", hoverWash);
  if (pressedWash) b.style.setProperty("--ibtn-pbg", pressedWash);
  if (pressedWash || o.pressedEdge) wirePress(b);
  if (o.pressedInk && (pressedWash || o.pressedEdge)) {
    const restInk = ink, pressedInk = o.pressedInk;
    b.onclick = (e) => {
      e.preventDefault();
      b.style.color = b.classList.toggle("is-pressed") ? pressedInk : restInk;
    };
  }
  b.append(document.createTextNode("Outline"), iconEl("arrow", o.icon ?? ink));
  box.append(b);
  return box;
};
var exIconLabel = (iconColor, textColor, dark = false) => {
  const box = hook(el("div", "exbox" + (dark ? " dark" : "")), "example-ground");
  box.style.background = exGround(dark);
  const row = el("span", "inote");
  specimen(row).style.color = textColor;
  const ic = el("span", "inote-ic");
  specimen(ic).style.color = iconColor;
  ic.append(iconEl("bell", iconColor));
  row.append(ic, document.createTextNode("Notifications"));
  box.append(row);
  return box;
};
var exTextOnPage = (color, label) => {
  const box = hook(el("div", "exbox"), "example-ground");
  box.style.background = exGround(false);
  const t = el("span", "inote", label);
  specimen(t).style.color = color;
  box.append(t);
  return box;
};
var iExample = (inner, badge2) => {
  const aex = hook(el("div", "aex"), "role-example");
  aex.append(inner);
  if (badge2) aex.append(badge2);
  return aex;
};
var twoUp = (a, b) => {
  const row = el("div", "aex-two");
  for (const [label, node, badge2] of [a, b]) {
    const s = el("div", "aex-spec");
    s.append(el("span", "pfk", label), node);
    if (badge2) s.append(badge2);
    row.append(s);
  }
  const wrap = hook(el("div", "aex"), "role-example");
  wrap.append(row);
  return wrap;
};
var iBadge = (r) => r && r.ratio != null && r.min != null && r.min > 0 ? contrastBadge(r.ratio, r.min) : void 0;
var iStates = (roles, palette, cells) => {
  const g = el("div", "astates-g");
  let any = false;
  for (const [name, roleKey] of cells) {
    const r = roles[roleKey];
    if (!r) continue;
    any = true;
    const cell = hook(el("div", "astate"), "role-state");
    const head = el("div", "astate-h");
    head.append(hook(swatch(isWash(r) ? washCss(roles, r) : r.hex, "astate-sw"), "role-state-swatch"), hook(el("span", "astate-n", name), "role-state-name"));
    cell.append(head, roleSourceSelect(roles, roleKey, palette, baselineStepOf(roleKey)));
    g.append(cell);
  }
  if (!any) return null;
  const wrap = hook(el("div", "astates"), "role-states");
  wrap.append(el("div", "astates-h", "Interactive states"), g);
  return wrap;
};
var iRow = (o) => {
  const row = hook(el("div", "arow" + (o.lead ? " arow-lead" : "")), o.lead ? "role-lead" : "role-row");
  const main = el("div", "arow-main");
  if (!o.lead) main.append(hook(swatch(o.swatchBg ?? "#000000", "asw"), "role-swatch"));
  const mid = hook(el("div", "amid"), "role-body");
  if (o.label) mid.append(el("div", "alabel", o.label));
  const ctl = hook(el("div", "sf-ctlblock"), "role-source");
  ctl.append(el("span", "pfk", o.srcLabel ?? "Source"), o.select);
  mid.append(ctl);
  if (o.pill) mid.append(tokenPill(o.pill));
  if (o.desc) mid.append(el("p", "adesc", o.desc));
  if (o.warn) mid.append(el("p", "fz-warn", o.warn));
  main.append(mid, o.example);
  row.append(main);
  if (o.states) row.append(o.states);
  return row;
};
var slotRow = (o) => {
  const roles = iRoles();
  const roleKey = `${o.inverse ? "inverse." : ""}interactive.${o.name}.${o.slot}`;
  const r = roles[roleKey];
  if (!r) return null;
  return iRow({
    swatchBg: r.hex,
    label: o.label,
    // #1384 — the inverse fill row offers white + neutral as pinnable sources; every other row keeps the
    // single-palette override select.
    select: o.invFillSources ? invFillSourceSelect(roleKey, o.palette, theme.roleToPalette.neutral) : roleSourceSelect(roles, roleKey, o.palette, baselineStepOf(roleKey)),
    pill: colorPath(roleKey),
    desc: o.desc,
    example: iExample(o.example(roles), iBadge(roles[o.badgeRole ?? roleKey])),
    states: o.states ? iStates(roles, o.palette, o.states) : null
  });
};
var fillRestRow = (col) => {
  const roles = iRoles();
  const r = roles[`interactive.${col.name}.fill.rest`];
  if (!r) return null;
  const onFill = roles[`interactive.${col.name}.on-fill`];
  let select2;
  let warn;
  if (col.setStep) {
    const steps = stepsOf(col.palette);
    select2 = stepPicker(
      col.palette,
      steps,
      baselineAnchorStepOf(`interactive.${col.name}.fill.rest`, currentMode, col.name),
      steps.find((k) => Number(k) === col.stepValue),
      (step) => col.setStep(step === void 0 ? void 0 : Number(step))
    );
    const min = r.min ?? 0, ratio = r.ratio ?? Infinity;
    if (min > 0 && ratio < min)
      warn = `${stepKeyOf(r.path)} doesn't clear the contrast floor here \u2014 ${ratio.toFixed(2)}:1 against ${r.against}, needs ${min}:1. Applied as picked; hover, pressed, text and on-fill all derive from it.`;
  } else {
    select2 = roleSourceSelect(roles, `interactive.${col.name}.fill.rest`, col.palette, baselineStepOf(`interactive.${col.name}.fill.rest`));
  }
  return iRow({
    swatchBg: r.hex,
    label: "Fill \xB7 rest",
    select: select2,
    pill: colorPath(`interactive.${col.name}.fill.rest`),
    desc: "The button / container fill. This anchors the family \u2014 hover, pressed, text and on-fill derive from it unless you override them below.",
    warn,
    example: iExample(exBtn(
      r.hex,
      onFill?.hex ?? "#ffffff",
      false,
      "Button",
      roles[`interactive.${col.name}.fill.hover`]?.hex,
      roles[`interactive.${col.name}.fill.pressed`]?.hex
    ), iBadge(onFill)),
    states: iStates(roles, col.palette, [["Hover", `interactive.${col.name}.fill.hover`], ["Pressed", `interactive.${col.name}.fill.pressed`]])
  });
};
var overlayRow = (col) => {
  const roles = iRoles();
  const r = roles[`interactive.${col.name}.overlay.hover`];
  if (!r) return null;
  const nPal = theme.roleToPalette.neutral;
  const edge = edgeOf(roles, `interactive.${col.name}`);
  const hoverInk = roles[`interactive.${col.name}.text.hover`];
  const pressedInk = roles[`interactive.${col.name}.text.pressed`];
  const pressed = roles[`interactive.${col.name}.overlay.pressed`];
  const ground = (r.against ? roles[r.against]?.hex : void 0) ?? roles["background.primary"]?.hex;
  const badge2 = hoverInk && ground && (hoverInk.min ?? 0) > 0 ? contrastBadge(contrast(hexToRgb(hoverInk.hex), composite(hexToRgb(ground), hexToRgb(r.hex), r.alpha ?? 1)), hoverInk.min) : void 0;
  return iRow({
    swatchBg: washCss(roles, r),
    label: "Overlay wash",
    select: roleSourceSelect(roles, `interactive.${col.name}.overlay.hover`, nPal, baselineStepOf(`interactive.${col.name}.overlay.hover`)),
    pill: colorPath(`interactive.${col.name}.overlay.hover`),
    // Names the ground, and says what the primitive is NOT. The old copy said the wash "composites over
    // any surface" — true of the mechanism and false of the result, which is exactly the claim #892
    // retired from the engine's own `$description` when it gave the inverse band its own opposite-polarity
    // wash. This surface kept saying it after the engine stopped.
    desc: "The translucent hover / pressed wash for this palette\u2019s outline & text actions \u2014 a neutral alpha primitive composited over the page surface it is measured against, so there is no ramp step to swap in.",
    // The row's rest swatch already IS the hover wash (there's no "rest" overlay to show — the wash only
    // ever appears on hover/pressed), so only pressed needs wiring here; a :hover cue would be a no-op.
    example: iExample(exOutline(
      edge,
      rgbaOf(r),
      false,
      void 0,
      pressed ? rgbaOf(pressed) : void 0,
      { ink: hoverInk?.hex, pressedInk: pressedInk?.hex }
    ), badge2),
    states: iStates(roles, nPal, [["Hover", `interactive.${col.name}.overlay.hover`], ["Pressed", `interactive.${col.name}.overlay.pressed`]])
  });
};
var subtleFillRow = (col) => {
  const roles = iRoles();
  const r = roles[`interactive.${col.name}.subtle-fill.hover`];
  if (!r) return null;
  const pressed = roles[`interactive.${col.name}.subtle-fill.pressed`];
  const edge = edgeOf(roles, `interactive.${col.name}`);
  const ink = roles[`interactive.${col.name}.text.rest`]?.hex;
  const short = (n) => n.toFixed(2).replace(/\.00$/, "");
  return iRow({
    swatchBg: washCss(roles, r),
    label: "Subtle tint",
    select: roleSourceSelect(roles, `interactive.${col.name}.subtle-fill.hover`, col.palette, baselineStepOf(`interactive.${col.name}.subtle-fill.hover`)),
    pill: colorPath(`interactive.${col.name}.subtle-fill.hover`),
    desc: "The hover / pressed fill for this palette\u2019s outline & text actions \u2014 the button\u2019s own fill at 20% opacity (30% pressed), so the control keeps its color. Steps lower if the label needs more contrast, higher if the hover would not show.",
    // `min`/`ratio` are optional on the resolved role, so a missing pair means "no contract stated" —
    // which must read as no warning, not as a failed one.
    warn: (r.min ?? 0) > 0 && (r.ratio ?? Infinity) < (r.min ?? 0) ? `This tint leaves the hover label at ${short(r.ratio ?? 0)}:1, under the ${short(r.min ?? 0)}:1 it needs even at the lowest opacity step \u2014 pick a lighter fill, or the text stops being readable on hover.` : void 0,
    example: iExample(exOutline(edge, rgbaOf(r), false, void 0, pressed ? rgbaOf(pressed) : void 0, { ink })),
    states: iStates(roles, col.palette, [
      ["Hover", `interactive.${col.name}.subtle-fill.hover`],
      ["Pressed", `interactive.${col.name}.subtle-fill.pressed`]
    ])
  });
};
var borderDesc = (name, inverse) => (inverse ? "The outline control\u2019s edge on a dark / inverse surface. Follows that band\u2019s text ink by default \u2014 pin a step to let the edge differ from the label it surrounds." : "The outline control\u2019s edge. Follows the text ink by default \u2014 pin a step to let the edge differ from the label it surrounds.") + (name === "neutral" ? " Neutral\u2019s ink is already the far end of its ramp, so all three states land on one step and the edge holds still on hover unless you pin them apart." : "");
var renderPaletteSection = (col) => {
  const roles = iRoles();
  if (!roles[`interactive.${col.name}.fill.rest`]) return null;
  const sec = el("div", "psec");
  const head = el("div", "psec-h");
  head.append(el("p", "psec-t", col.title));
  if (col.onRemove) head.append(removeButton(col.onRemove, "Remove interactive color", "rmv"));
  sec.append(head, el("p", "psec-d", col.desc));
  if (col.lead) sec.append(col.lead);
  const P = col.palette, nm = col.name, inv = `inverse.interactive.${nm}`, nPal = theme.roleToPalette.neutral;
  const rows = [
    fillRestRow(col),
    slotRow({
      name: nm,
      slot: "fill.rest",
      inverse: true,
      label: "Fill \xB7 inverse",
      palette: P,
      invFillSources: true,
      desc: "The button fill on a dark / inverse surface \u2014 crisp white by default (#1384). Pin white, a neutral step, or a palette step; each is contrast-marked.",
      example: (rs) => exBtn(
        rs[`${inv}.fill.rest`]?.hex ?? "#ffffff",
        rs[`${inv}.on-fill`]?.hex ?? "#000000",
        true,
        "Button",
        rs[`${inv}.fill.hover`]?.hex,
        rs[`${inv}.fill.pressed`]?.hex
      ),
      badgeRole: `${inv}.on-fill`,
      states: [["Hover", `${inv}.fill.hover`], ["Pressed", `${inv}.fill.pressed`]]
    }),
    slotRow({
      name: nm,
      slot: "text.rest",
      label: "Text \xB7 rest",
      palette: P,
      desc: "Text links & text buttons on light surfaces.",
      example: (rs) => exLink(
        rs[`interactive.${nm}.text.rest`]?.hex ?? "#000000",
        false,
        rs[`interactive.${nm}.text.hover`]?.hex,
        rs[`interactive.${nm}.text.pressed`]?.hex
      ),
      states: [["Hover", `interactive.${nm}.text.hover`], ["Pressed", `interactive.${nm}.text.pressed`]]
    }),
    slotRow({
      name: nm,
      slot: "text.rest",
      inverse: true,
      label: "Text \xB7 inverse",
      palette: P,
      desc: "Text links & text buttons on dark / inverse surfaces.",
      example: (rs) => exLink(
        rs[`${inv}.text.rest`]?.hex ?? "#ffffff",
        true,
        rs[`${inv}.text.hover`]?.hex,
        rs[`${inv}.text.pressed`]?.hex
      ),
      states: [["Hover", `${inv}.text.hover`], ["Pressed", `${inv}.text.pressed`]]
    }),
    // #576 — the outline control's EDGE, per family and per state, on the page band and the inverse one.
    // PER-COLUMN rather than one shared control because each family resolves it from a different ramp:
    // primary from the action palette, destructive from danger, neutral from the neutral ramp, an accent
    // from its own. That divergence is the thing a single shared select could not express.
    //
    // Present under every `outlineInteraction` method including `none` — measured on all six corpus
    // themes — which is the method where it matters most, since with no hover wash the edge and the ink
    // are the only things carrying the state.
    slotRow({
      name: nm,
      slot: "border.rest",
      label: "Border \xB7 rest",
      palette: P,
      desc: borderDesc(nm, false),
      example: (rs) => exOutline(edgeOf(rs, `interactive.${nm}`), "transparent", false, void 0, void 0, {
        ink: rs[`interactive.${nm}.text.rest`]?.hex,
        icon: rs[`interactive.${nm}.icon.rest`]?.hex,
        hoverEdge: rs[`interactive.${nm}.border.hover`]?.hex,
        pressedEdge: rs[`interactive.${nm}.border.pressed`]?.hex
      }),
      states: [["Hover", `interactive.${nm}.border.hover`], ["Pressed", `interactive.${nm}.border.pressed`]]
    }),
    slotRow({
      name: nm,
      slot: "border.rest",
      inverse: true,
      label: "Border \xB7 inverse",
      palette: P,
      desc: borderDesc(nm, true),
      example: (rs) => exOutline(edgeOf(rs, inv), "transparent", true, void 0, void 0, {
        ink: rs[`${inv}.text.rest`]?.hex,
        icon: rs[`${inv}.icon.rest`]?.hex,
        hoverEdge: rs[`${inv}.border.hover`]?.hex,
        pressedEdge: rs[`${inv}.border.pressed`]?.hex
      }),
      states: [["Hover", `${inv}.border.hover`], ["Pressed", `${inv}.border.pressed`]]
    }),
    overlayRow(col),
    subtleFillRow(col),
    // #288 — the opaque sibling; only one of the two is ever non-null
    slotRow({
      name: nm,
      slot: "on-fill",
      label: "On-fill text",
      palette: nPal,
      desc: "The ink on the fill \u2014 auto-picked to clear contrast on the button surface.",
      example: (rs) => exBtn(rs[`interactive.${nm}.fill.rest`]?.hex ?? "#000000", rs[`interactive.${nm}.on-fill`]?.hex ?? "#ffffff")
    }),
    slotRow({
      name: nm,
      slot: "on-fill",
      inverse: true,
      label: "On-fill text \xB7 inverse",
      palette: nPal,
      desc: "The ink on the inverse (light) fill \u2014 button text on a dark surface.",
      example: (rs) => exBtn(rs[`${inv}.fill.rest`]?.hex ?? "#ffffff", rs[`${inv}.on-fill`]?.hex ?? "#000000", true)
    })
  ];
  for (const rw of rows) if (rw) sec.append(rw);
  return sec;
};
var LINK_STATE_ROWS = [
  ["Default", "default"],
  ["Hover", "hover"],
  ["Pressed", "pressed"],
  ["Visited", "visited"],
  ["Focused", "focused"]
];
var LINK_ENGAGED = /* @__PURE__ */ new Set(["hover", "pressed", "visited"]);
var LINK_RUNG_MAX = 8;
var setLinkRung = (state, rung) => {
  const m = brandState.linkStateRungs ?? (brandState.linkStateRungs = {});
  if (rung === void 0) delete m[state];
  else m[state] = rung;
  if (!Object.keys(m).length) brandState.linkStateRungs = void 0;
  applyFull();
};
var linkRungPicker = (state) => {
  const sel = selectEl("cap");
  const cur = brandState.linkStateRungs?.[state];
  sel.append(optionEl("", "Auto", cur == null));
  for (let k = 1; k <= LINK_RUNG_MAX; k++) sel.append(optionEl(String(k), `${k} step${k > 1 ? "s" : ""}`, cur === k));
  sel.onchange = () => setLinkRung(state, sel.value === "" ? void 0 : Number(sel.value));
  return sel;
};
var setLinkFamilyOverride = (prefix, step) => {
  const pal = theme.linkPalette;
  const steps = (theme.palettes.find((p) => p.palette === pal)?.steps ?? []).map((s) => s.key);
  const states = ["default", "hover", "pressed", "visited", "focused"];
  if (step === void 0) {
    for (const st of states) setFillOverride(`${prefix}.link.${st}`, pal, void 0);
    return;
  }
  const idx = (k) => steps.indexOf(k);
  const clamp = (i) => Math.max(0, Math.min(steps.length - 1, i));
  const defBase = idx(baselineStepOf(`${prefix}.link.default`));
  const i0 = idx(step);
  for (const st of states) {
    if (st === "default" || st === "focused") {
      setFillOverride(`${prefix}.link.${st}`, pal, step);
      continue;
    }
    const dist = idx(baselineStepOf(`${prefix}.link.${st}`)) - defBase;
    setFillOverride(`${prefix}.link.${st}`, pal, steps[clamp(i0 + dist)]);
  }
};
var linkAbsPicker = (prefix) => {
  const pal = theme.linkPalette;
  const steps = (theme.palettes.find((p) => p.palette === pal)?.steps ?? []).map((s) => s.key);
  const cur = brandState.overrides?.[currentMode]?.[`${prefix}.link.default`]?.step;
  return stepPicker(
    pal,
    steps,
    baselineStepOf(`${prefix}.link.default`),
    typeof cur === "string" ? cur : void 0,
    (step) => setLinkFamilyOverride(prefix, step)
  );
};
var linkStatesStrip = (roles, prefix, rungEditable = false) => {
  const g = el("div", "astates-g");
  let any = false;
  for (const [name, st] of LINK_STATE_ROWS) {
    const key = `${prefix}.link.${st}`;
    const r = roles[key];
    if (!r) continue;
    any = true;
    const cell = hook(el("div", "astate"), "role-state");
    const head = el("div", "astate-h");
    head.append(hook(swatch(r.hex, "astate-sw"), "role-state-swatch"), hook(el("span", "astate-n", name), "role-state-name"));
    cell.append(head, tokenPill(colorPath(key)));
    const badge2 = iBadge(r);
    if (badge2) cell.append(badge2);
    if (st === "default") cell.append(linkAbsPicker(prefix));
    else if (rungEditable && LINK_ENGAGED.has(st)) cell.append(linkRungPicker(st));
    g.append(cell);
  }
  if (!any) return null;
  const wrap = hook(el("div", "astates"), "role-states");
  wrap.append(el("div", "astates-h", "Link states"), g);
  return wrap;
};
var linkRow = (o) => {
  const roles = iRoles();
  const restKey = `${o.prefix}.link.default`;
  const rest = roles[restKey];
  if (!rest) return null;
  const row = hook(el("div", "arow"), "role-row");
  const main = el("div", "arow-main");
  main.append(hook(swatch(rest.hex, "asw"), "role-swatch"));
  const mid = hook(el("div", "amid"), "role-body");
  mid.append(el("div", "alabel", o.label), tokenPill(colorPath(restKey)), el("p", "adesc", o.desc));
  main.append(mid, iExample(o.example(roles), iBadge(rest)));
  row.append(main);
  const strip2 = linkStatesStrip(roles, o.prefix, o.rungEditable);
  if (strip2) row.append(strip2);
  return row;
};
var renderLinksSection = () => {
  const roles = iRoles();
  if (!roles["text.link.default"]) return null;
  const sec = hook(el("div", "psec"), "section-links");
  const head = el("div", "psec-h");
  head.append(el("p", "psec-t", "Links"));
  sec.append(head, el(
    "p",
    "psec-d",
    "The global link role, drawn from the link palette below \u2014 one link role, no per-accent link roles. The resting link and its focus follow the link palette; the engaged states step away from it. The rung pickers on the page text link set how many steps hover, pressed and visited move \u2014 one cross-mode default for every family, so they stay distinct even where the link sits deep in the ramp. Each family can also pin an exact color for the current mode on its resting-link picker; a pin wins over the rung default and re-anchors that family, and the engine holds every link to its contrast floor. Focused always matches the resting link: the focus ring carries that state, so the link text does not shift."
  ));
  sec.append(linkPaletteLead());
  if (theme.notes.some((n) => /WCAG 1\.4\.1/.test(n)))
    sec.append(hook(el(
      "p",
      "te-order-warn",
      "\u26A0 This link palette is not color-distinct from body text, so color alone cannot mark a link. Underline links for WCAG 1.4.1 (Use of Color) \u2014 add the link role to Underlined link roles in Type. A warning, not a block."
    ), "order-warning"));
  const rows = [
    linkRow({
      prefix: "text",
      label: "Text link",
      desc: "Links in running text on light surfaces.",
      rungEditable: true,
      example: (rs) => exLink(rs["text.link.default"]?.hex ?? "#000000", false, rs["text.link.hover"]?.hex, rs["text.link.pressed"]?.hex)
    }),
    linkRow({
      prefix: "inverse.text",
      label: "Text link \xB7 inverse",
      desc: "Links in running text on dark / inverse surfaces.",
      example: (rs) => exLink(rs["inverse.text.link.default"]?.hex ?? "#ffffff", true, rs["inverse.text.link.hover"]?.hex, rs["inverse.text.link.pressed"]?.hex)
    }),
    linkRow({
      prefix: "icon",
      label: "Icon link",
      desc: "The icon twin of the link ink \u2014 an icon inside a link on light surfaces.",
      example: (rs) => exIconLabel(rs["icon.link.default"]?.hex ?? "#000000", rs["text.link.default"]?.hex ?? "#000000")
    }),
    linkRow({
      prefix: "inverse.icon",
      label: "Icon link \xB7 inverse",
      desc: "The icon twin on dark / inverse surfaces.",
      example: (rs) => exIconLabel(rs["inverse.icon.link.default"]?.hex ?? "#ffffff", rs["inverse.text.link.default"]?.hex ?? "#ffffff", true)
    })
  ];
  for (const rw of rows) if (rw) sec.append(rw);
  return sec;
};
var iEnumSelect = (key) => {
  const lever = leverByKey(key);
  const sel = selectEl("cap");
  const cur = getPath2(brandState, key) ?? lever.default;
  for (const o of lever.options ?? []) sel.append(optionEl(String(o.value), o.label, o.value === cur));
  sel.onchange = () => {
    setPath2(brandState, key, sel.value);
    applyFull();
  };
  return sel;
};
var actionPaletteLead = () => {
  const sel = selectEl("cap");
  const palettes = ["primary", ...(brandState.brandColors ?? []).map((b) => b.name)];
  const cur = String(brandState.actionPalette ?? "primary");
  for (const p of palettes) sel.append(optionEl(p, capWord(p), p === cur));
  sel.onchange = () => {
    setPath2(brandState, "actionPalette", sel.value);
    applyFull();
  };
  const roles = iRoles();
  return iRow({
    lead: true,
    label: "Action palette",
    srcLabel: "Source",
    select: sel,
    desc: "Which palette drives your primary actions \u2014 a brand color, or point it at your neutral for a restrained, monochrome look. The contrast floor is accessible either way.",
    example: iExample(exBtn(roles["interactive.primary.fill.rest"]?.hex ?? "#000000", roles["interactive.primary.on-fill"]?.hex ?? "#ffffff"))
  });
};
var linkPaletteLead = () => {
  const sel = selectEl("cap");
  const palettes = ["primary", "neutral", ...(brandState.brandColors ?? []).map((b) => b.name)];
  const cur = String(theme.linkPalette);
  for (const p of palettes) sel.append(optionEl(p, capWord(p), p === cur));
  sel.onchange = () => {
    setPath2(brandState, "linkPalette", sel.value);
    applyFull();
  };
  const roles = iRoles();
  return hook(iRow({
    lead: true,
    label: "Link palette",
    srcLabel: "Source",
    select: sel,
    desc: "Which palette drives your links \u2014 follows your action palette by default, or point it at your neutral or an accent to give links their own color. The contrast floor holds either way.",
    example: iExample(exLink(roles["text.link.default"]?.hex ?? "#000000", false, roles["text.link.hover"]?.hex, roles["text.link.pressed"]?.hex))
  }), "link-palette");
};
var neutralEmphasisLead = () => {
  const sel = selectEl("cap");
  const cur = lastGoodInput.neutralEmphasis ?? "subtle";
  for (const [ne, label] of NEUTRAL_EMPHASES) sel.append(optionEl(ne, capWord(label), ne === cur));
  sel.onchange = () => {
    setPath2(brandState, "neutralEmphasis", sel.value);
    applyFull();
  };
  const roles = iRoles();
  return iRow({
    lead: true,
    label: "Button emphasis",
    srcLabel: "Emphasis",
    select: sel,
    desc: "A neutral / secondary button as a subtle light-gray surface, or a bold near-black/white fill. Shared across modes.",
    example: iExample(exBtn(roles["interactive.neutral.fill.rest"]?.hex ?? "#eeeeee", roles["interactive.neutral.on-fill"]?.hex ?? "#111111"))
  });
};
var renderGlobalBehavior = (host) => {
  const cap = el("div", "gcap");
  cap.append(el("p", "gcap-t", "Global action behavior"), el("p", "gcap-d", "These apply across every action palette below."));
  host.append(cap);
  const roles = iRoles();
  const ohBlurb = theme.outlineInteraction === "solid-tint" ? "How every outline & text action reacts on hover. The hover is each control\u2019s own fill at 20% opacity, so a destructive outline hovers red-tinted rather than gray." : theme.outlineInteraction === "none" ? "How every outline & text action reacts on hover. No hover fill \u2014 the border and ink carry the state on their own." : "How every outline & text action reacts on hover. Each palette\u2019s Overlay wash row tunes the tint it uses.";
  const oh = palSection("Outline button hover", ohBlurb);
  const ohEdge = edgeOf(roles, "interactive.primary");
  const ohInk = roles["interactive.primary.text.rest"]?.hex;
  const ohRole = outlineFillRole(theme.outlineInteraction, "primary", "hover");
  const ohRes = ohRole ? roles[ohRole] : void 0;
  const ohWash = !ohRes ? "transparent" : outlineFillFamily(theme.outlineInteraction).opaque ? ohRes.hex : rgbaOf(ohRes);
  oh.append(iRow({
    lead: true,
    srcLabel: "Method",
    select: iEnumSelect("outlineInteraction"),
    example: twoUp(
      ["Rest", exOutline(ohEdge, "transparent", false, void 0, void 0, { ink: ohInk })],
      ["Hover", exOutline(ohEdge, ohWash, false, void 0, void 0, { ink: ohInk })]
    )
  }));
  host.append(oh);
  const ds = palSection("Disabled", "How much contrast a disabled label keeps \u2014 on a disabled fill, and as plain disabled text on the page. Never below 3:1 either way; this system doesn\u2019t use the WCAG exemption for inactive controls. The disabled fill itself is a fixed step of your neutral ramp, so it moves with the neutral, not with these controls.");
  const dFull = normalizeDisabledStrategy(getPath2(brandState, "disabledStrategy")) === "full";
  const dsExample = () => {
    const r = iRoles();
    return twoUp(
      ["On fill", exBtn(r["disabled.fill"]?.hex ?? "#e7e7ee", r["disabled.on-fill"]?.hex ?? "#9a9aa6", false, "Save"), iBadge(r["disabled.on-fill"])],
      ["On page", exTextOnPage(r["disabled.text"]?.hex ?? "#9a9aa6", "Save"), iBadge(r["disabled.text"])]
    );
  };
  let dsEx = dsExample();
  ds.append(iRow({
    lead: true,
    srcLabel: "Contrast",
    select: iEnumSelect("disabledStrategy"),
    desc: "Full guarantees AA text (4.5:1); Reduced dims to a floor you set, no lower than 3:1.",
    // The affordance caveat, surfaced where the choice is made rather than left to be discovered:
    // at 4.5:1 the label is as legible as body copy, so "disabled" reads from fill/border/cursor.
    warn: dFull ? "At 4.5:1 the label is as legible as body text \u2014 check a disabled control still reads as disabled (the cue now rests on fill, border, cursor and aria-disabled)." : void 0,
    example: dsEx
  }));
  if (!dFull) {
    const min = leverByKey("disabledMin");
    if (min) {
      const c = renderControl(min);
      const slider = c.querySelector('input[type="range"]');
      const label = c.querySelector(".knob-val");
      if (slider) {
        slider.oninput = () => {
          if (label) label.textContent = `${slider.value}${min.unit ?? ""}`;
          setPath2(brandState, min.key, Number(slider.value));
          rebuild();
          const next = dsExample();
          dsEx.replaceWith(next);
          dsEx = next;
        };
        slider.onchange = () => {
          setPath2(brandState, min.key, Number(slider.value));
          applyFull();
        };
      }
      ds.append(c);
    }
  }
  host.append(ds);
  const ic = palSection("Icon colors", "Should icons match your text color, or take a distinct (lighter) color? The example shows both.");
  const txt = roles["text.primary"]?.hex ?? "#191920", lighter = roles["text.tertiary"]?.hex ?? "#9a9aa6";
  ic.append(iRow({
    lead: true,
    label: "Icon color",
    srcLabel: "Icon color",
    select: iEnumSelect("iconContrast"),
    desc: "Match text keeps icons at full text legibility; Distinct lets them sit lighter (WCAG non-text 3:1).",
    example: twoUp(["Match text", exIconLabel(txt, txt)], ["Distinct", exIconLabel(lighter, txt)])
  }));
  host.append(ic);
  const fr = palSection("Focus ring", "The ring geometry every focusable control shares \u2014 width, how far it sits off the element, and its stroke style. Fixed for every brand (WCAG 2.4.13 sets the floor); its color is the color.border.focus role above.");
  const frRows = [
    ["focus.ring.width", "2px", "WCAG 2.4.13 floor"],
    ["focus.ring.offset", "2px", "separates the ring from the element edge"],
    ["focus.ring.offset-field", "0px", "form fields \u2014 the ring hugs the field"],
    ["focus.ring.style", "solid", "dashed and dotted fail at small sizes"]
  ];
  const frWrap = el("div", "fr-wrap");
  const frList = el("div", "fr-list");
  for (const [ref, val, why] of frRows) {
    const r = el("div", "fr-row");
    r.append(tokenPill(ref), el("span", "fr-v mono", val), el("span", "fr-why", why));
    frList.append(r);
  }
  const frEx = el("div", "fr-ex");
  const ringColor = roles["border.focus"]?.hex ?? roles["interactive.primary.border.rest"]?.hex ?? "#3e6dc8";
  for (const [lab, off] of [["Control", "2px"], ["Form field", "0px"]]) {
    const cell = el("div", "fr-excell");
    const btn = el("div", "fr-btn", lab);
    btn.style.outline = `2px solid ${ringColor}`;
    btn.style.outlineOffset = off;
    cell.append(btn, el("span", "fr-exlab", `offset ${off}`));
    frEx.append(cell);
  }
  frWrap.append(frList, frEx);
  fr.append(frWrap);
  host.append(fr);
};
var renderAddAccentRow = () => {
  const row = el("div", "ic-add");
  const brandNames = (brandState.brandColors ?? []).map((b) => b.name);
  const already = new Set((brandState.interactivePalettes ?? []).map((e) => e.palette));
  const actionPal = theme.roleToPalette.action;
  const RESERVED_ICOL = /* @__PURE__ */ new Set(["primary", "neutral", "destructive"]);
  const promotable = ["primary", ...brandNames].filter((p) => !already.has(p) && p !== actionPal && !RESERVED_ICOL.has(p));
  if (!promotable.length) {
    row.append(el("span", "ic-addhint", "Add a brand color on Primitives to create another interactive color."));
    return row;
  }
  const sel = selectEl("cap");
  for (const p of promotable) sel.append(optionEl(p, capWord(p)));
  const btn = addButton("+ Add action palette", () => {
    const arr = brandState.interactivePalettes ?? (brandState.interactivePalettes = []);
    arr.push({ palette: sel.value });
    applyFull();
  }, "ic-addbtn");
  row.append(sel, btn);
  return row;
};
var renderInteractiveMatrix = (host) => {
  renderGlobalBehavior(host);
  const perMode = currentMode !== "light";
  if (perMode) host.append(el("p", "ic-modenote", `Editing ${MODE_LABEL[currentMode] ?? currentMode}\u2019s interactive colors \u2014 \u201CAuto\u201D follows the generated baseline; pick a step to override this mode.`));
  const anchor = (name, get, set) => {
    if (!perMode) return { stepValue: get(), setStep: (v) => {
      set(v);
      applyFull();
    } };
    return {
      stepValue: brandState.modeAnchors?.[currentMode]?.[name],
      setStep: (v) => {
        const ma = brandState.modeAnchors ?? (brandState.modeAnchors = {});
        const forMode = ma[currentMode] ?? (ma[currentMode] = {});
        if (v === void 0) {
          delete forMode[name];
          if (!Object.keys(forMode).length) delete ma[currentMode];
          if (!Object.keys(ma).length) brandState.modeAnchors = void 0;
        } else forMode[name] = v;
        applyFull();
      }
    };
  };
  const add = (node) => {
    if (node) host.append(node);
  };
  add(renderPaletteSection({ name: "primary", title: "Primary actions", desc: "The default interactive colors. State colors are calculated from your selections unless you override them.", palette: theme.roleToPalette.action, lead: actionPaletteLead(), ...anchor("primary", () => brandState.actionAnchorStep, (v) => setPath2(brandState, "actionAnchorStep", v)) }));
  add(renderPaletteSection({ name: "neutral", title: "Neutral actions", desc: "The secondary / low-emphasis action set \u2014 for \u201CCancel\u201D, toolbar buttons, and quiet controls.", palette: theme.roleToPalette.neutral, lead: neutralEmphasisLead() }));
  add(renderPaletteSection({ name: "destructive", title: "Destructive actions", desc: "Delete / remove and other irreversible actions.", palette: theme.roleToPalette.danger, ...anchor("destructive", () => brandState.destructiveAnchorStep, (v) => setPath2(brandState, "destructiveAnchorStep", v)) }));
  (brandState.interactivePalettes ?? []).forEach((entry, i) => {
    const nm = entry.name ?? entry.palette;
    add(renderPaletteSection({
      name: nm,
      title: `${capWord(nm)} actions`,
      desc: "Optional secondary interactive set.",
      palette: entry.palette,
      ...anchor(nm, () => entry.anchorStep, (v) => setPath2(brandState, `interactivePalettes.${i}.anchorStep`, v)),
      ...perMode ? {} : { onRemove: () => {
        brandState.interactivePalettes.splice(i, 1);
        if (!brandState.interactivePalettes.length) brandState.interactivePalettes = void 0;
        applyFull();
      } }
    }));
  });
  if (!perMode) host.append(renderAddAccentRow());
  add(renderLinksSection());
};
var addModeOpen = false;
var addModeName = "";
var DERIVED_MODES = /* @__PURE__ */ new Set(["hc-light", "hc-dark", "wireframe"]);
var modeIsEditable = (m) => !DERIVED_MODES.has(m);
var RESERVED_MODE_NAMES = /* @__PURE__ */ new Set(["light", "dark", "hc-light", "hc-dark", "wireframe"]);
var modeAllPass = (m) => rp.contracts.every((ct) => !ct.byMode[m] || ct.byMode[m].pass);
var renderModeSetMenu = (repaint, inline = false) => {
  const menu = el("div", "mctx-menu" + (inline ? " inline" : ""));
  const modes = brandState.modes ?? ALL_MODES;
  const darkOn = modes.includes("dark");
  const hcOn = modes.includes("hc-light") || modes.includes("hc-dark");
  const wireOn = modes.includes("wireframe");
  menu.append(el("div", "mctx-mcap", "Modes this brand generates"));
  const lightRow = hook(el("div", "mctx-opt on fixed"), "mode-base-row");
  lightRow.title = "Light is always generated \u2014 it\u2019s the base mode, so it can\u2019t be turned off.";
  const lock = iconEl("lock", "currentColor");
  hook(lock, "mode-base-lock");
  lock.setAttribute("class", "mctx-lock");
  lock.setAttribute("role", "img");
  lock.setAttribute("aria-label", "Locked");
  lightRow.append(el("span", "mctx-box", "\u2713"), el("span", void 0, "Light"), lock, hook(el("span", "mctx-always", "always"), "mode-base-always"));
  menu.append(lightRow);
  const opt = (label, on, title, toggle) => {
    const row = el("button", "mctx-opt" + (on ? " on" : ""));
    row.title = title;
    row.append(el("span", "mctx-box", on ? "\u2713" : ""), el("span", void 0, label));
    row.onclick = toggle;
    menu.append(row);
  };
  opt("Dark", darkOn, "A dark appearance \u2014 generated, editable", () => setModes(!darkOn, hcOn, wireOn));
  opt("High contrast", hcOn, "AAA contrast floors \u2014 auto-derived, read-only", () => setModes(darkOn, !hcOn, wireOn));
  opt("Wireframe", wireOn, "Grayscale, sharp corners \u2014 auto-derived, generate-only", () => setModes(darkOn, hcOn, !wireOn));
  menu.append(el("div", "mctx-div"));
  const customs = brandState.customModes ?? [];
  if (customs.length) {
    menu.append(el("div", "mctx-mcap", "Custom modes"));
    customs.forEach((cm, i) => {
      const row = el("div", "mctx-custom");
      row.append(el("span", "mctx-cname", cm.name), el("span", "mctx-cbase", `\u21B3 ${cm.base}`));
      const rm = el("button", "mctx-crm", "\xD7");
      rm.title = "Remove custom mode";
      rm.onclick = () => {
        brandState.customModes.splice(i, 1);
        if (!brandState.customModes.length) brandState.customModes = void 0;
        if (currentMode === cm.name) setCurrentMode("light");
        applyFull();
      };
      row.append(rm);
      menu.append(row);
    });
  }
  if (!addModeOpen) {
    const add = el("button", "mctx-opt");
    add.append(el("span", "mctx-box"), el("span", void 0, "+ Add mode\u2026"));
    add.onclick = () => {
      addModeOpen = true;
      repaint();
    };
    menu.append(add);
  } else {
    const form = el("div", "mctx-addform");
    const nameIn = el("input", "mctx-addname");
    nameIn.type = "text";
    nameIn.placeholder = "e.g. marketing-dark";
    nameIn.value = addModeName;
    nameIn.spellcheck = false;
    nameIn.oninput = () => {
      addModeName = nameIn.value;
    };
    const baseSel = selectEl("sm fill");
    for (const bm of ["light", ...darkOn ? ["dark"] : []]) baseSel.append(optionEl(bm, MODE_LABEL[bm] ?? bm));
    const err = el("p", "mctx-adderr");
    const doAdd = () => {
      const nm = addModeName.trim();
      if (!/^[a-z0-9][a-z0-9-]*$/.test(nm)) {
        err.textContent = "Lowercase letters, digits, hyphens; start with a letter or digit.";
        return;
      }
      if (RESERVED_MODE_NAMES.has(nm) || (brandState.customModes ?? []).some((c) => c.name === nm)) {
        err.textContent = "That name is taken (a built-in or existing custom mode).";
        return;
      }
      (brandState.customModes ?? (brandState.customModes = [])).push({ name: nm, base: baseSel.value });
      addModeOpen = false;
      addModeName = "";
      setCurrentMode(nm);
      applyFull();
    };
    const addBtn = el("button", "mctx-addbtn", "Add mode");
    addBtn.onclick = doAdd;
    const cancel = el("button", "mctx-addcancel", "Cancel");
    cancel.onclick = () => {
      addModeOpen = false;
      addModeName = "";
      repaint();
    };
    const btns = el("div", "mctx-addbtns");
    btns.append(addBtn, cancel);
    const nameField = el("div", "mctx-addfield");
    nameField.append(el("label", "mctx-addlab", "Mode name"), nameIn);
    const baseField = el("div", "mctx-addfield");
    baseField.append(el("label", "mctx-addlab", "Base mode"), baseSel);
    form.append(nameField, baseField, err, btns);
    menu.append(form);
  }
  menu.append(el("p", "mctx-note", "A custom mode seeds from its base every build, then deviates via the per-mode color controls (interactive, foreground)."));
  return menu;
};
var renderModeContext = () => {
  const strip2 = el("div", "modectx");
  const left = el("div", "mctx-modes");
  left.append(el("span", "mctx-cap", "Mode"));
  for (const m of rp.modes) {
    const derived = DERIVED_MODES.has(m);
    const b = hook(el("button", "mctx-b" + (m === currentMode ? " on" : "") + (derived ? " derived" : "")), "mode-tab");
    b.append(hook(el("span", "mctx-name", MODE_LABEL[m] ?? m), "mode-tab-name"));
    if (derived) b.append(el("span", "mctx-vo", "view only"));
    if (derived) b.title = m === "wireframe" ? "Auto-derived \u2014 a mechanical grayscale, not contrast-derived. A read-only verification view." : "Auto-derived from your contrast contracts \u2014 a read-only verification view.";
    b.onclick = () => {
      if (currentMode !== m) {
        setCurrentMode(m);
        renderWorkspace();
      } else {
        renderModeStrip();
      }
    };
    left.append(b);
  }
  strip2.append(left);
  return strip2;
};
var renderGeneratedNote = () => {
  const wf = currentMode === "wireframe";
  const label = MODE_LABEL[currentMode] ?? currentMode;
  const box = hook(el("div", "genview"), "derived-note");
  box.append(el("h3", "genview-t", `${label} is auto-derived \u2014 read-only`));
  box.append(el("p", "genview-d", wf ? "Wireframe is a mechanical grayscale: every non-neutral role collapses to its neutral equivalent and corners go sharp. It\u2019s generated from your theme, not hand-tuned \u2014 edit Light or Dark and it follows." : "High contrast pushes every role to meet the AAA contrast floors. It\u2019s derived from your contrast contracts, not hand-tuned \u2014 edit Light or Dark and it follows. Verifying it here is the point: confirm it holds before you ship."));
  const ok = modeAllPass(currentMode);
  const chip = el("div", "genview-chip " + (ok ? "ok" : "no"));
  chip.append(
    el("span", "gv-mark", ok ? "\u2713" : "\u2717"),
    el("span", void 0, ok ? "Every contrast contract passes in this mode" : "Some contracts fail in this mode \u2014 see Preview \u2192 Contrast contracts")
  );
  box.append(chip);
  box.append(el("p", "genview-hint", "Toggle which modes generate from the brand menu\u2019s \u201CModes\u201D section."));
  return box;
};
var fieldBlock = (label, desc, body) => {
  const w = el("div", "tsz-field");
  w.append(el("label", "tsz-flabel", label), el("p", "tsz-fdesc", desc), body);
  return w;
};
var TYPE_SHAPES = [
  ["compact", "Compact", "Tighter steps. Denser screens and information-heavy products."],
  ["default", "Default", "The balanced ramp. A safe starting point for most brands."],
  ["expressive", "Expressive", "Wider steps and a bigger jump into headings. Editorial and marketing."]
];
var SHAPE_SHIFT = { compact: -1, default: 0, expressive: 1 };
var typeSizesOpen = null;
var ladderStep = (px, by) => {
  const l = theme.typography.sizesPx, i = l.indexOf(px);
  if (i < 0) return void 0;
  const j = i + by;
  return j >= 0 && j < l.length ? l[j] : void 0;
};
var rowsOf = (t, group) => t.typography.composites.filter((c) => c.group === group).reduce((acc, c) => acc.some((a) => a.variant === c.variant) ? acc : [...acc, { variant: c.variant, px: c.sizePx }], []).sort((a, b) => b.px - a.px);
var headingRows = (group) => rowsOf(theme, group);
var widestRows = null;
var computeWidestRows = () => {
  widestRows = null;
  const tries = [
    { displayCeiling: "3xl", titleFloor: 16 },
    { displayCeiling: "3xl" },
    { displayCeiling: "3xl", titleFloor: 16, sizes: void 0 }
  ];
  for (const over of tries) {
    try {
      const t = brandTheme({ ...brandState, typography: { ...brandState.typography, ...over } });
      widestRows = new Map(PER_MODE_SIZE_GROUPS.map((g) => [g, rowsOf(t, g)]));
      return;
    } catch {
    }
  }
};
var brandSizePin = (group, variant) => brandState.typography?.sizes?.[group]?.[variant];
var modeSizePin = (mode, group, variant) => brandState.modeLevers?.[mode]?.typeSizes?.[group]?.[variant];
var setBrandSize = (group, variant, px) => {
  const ty = brandState.typography ??= {};
  if (px === void 0) {
    const g = ty.sizes?.[group];
    if (!g || !ty.sizes) return;
    delete g[variant];
    if (!Object.keys(g).length) delete ty.sizes[group];
    if (!Object.keys(ty.sizes).length) delete ty.sizes;
    return;
  }
  ((ty.sizes ??= {})[group] ??= {})[variant] = px;
};
var viewportPin = (group, variant, vp) => brandState.typography?.sizeOverrides?.[group]?.[variant]?.[vp];
var setViewportSize = (group, variant, vp, px) => {
  const ty = brandState.typography ??= {};
  if (px === void 0) {
    const rung = ty.sizeOverrides?.[group]?.[variant];
    if (!rung || !ty.sizeOverrides) return;
    delete rung[vp];
    if (!Object.keys(rung).length) delete ty.sizeOverrides[group][variant];
    if (ty.sizeOverrides[group] && !Object.keys(ty.sizeOverrides[group]).length) delete ty.sizeOverrides[group];
    if (!Object.keys(ty.sizeOverrides).length) delete ty.sizeOverrides;
    return;
  }
  (((ty.sizeOverrides ??= {})[group] ??= {})[variant] ??= {})[vp] = px;
};
var pinnedSizeCount = () => {
  let n = 0;
  const bs = brandState.typography?.sizes ?? {};
  for (const g of Object.keys(bs)) n += Object.keys(bs[g] ?? {}).length;
  for (const m of Object.keys(brandState.modeLevers ?? {})) {
    const ms = brandState.modeLevers?.[m]?.typeSizes ?? {};
    for (const g of Object.keys(ms)) n += Object.keys(ms[g] ?? {}).length;
  }
  const vo = brandState.typography?.sizeOverrides ?? {};
  for (const g of Object.keys(vo))
    for (const variant of Object.keys(vo[g] ?? {}))
      n += Object.keys(vo[g][variant] ?? {}).length;
  return n;
};
var sizeCell = (group, rows, i, mode, resolved) => {
  const variant = rows[i].variant;
  const px = resolved[i];
  const upper = i > 0 ? resolved[i - 1] : void 0;
  const lower = i + 1 < resolved.length ? resolved[i + 1] : void 0;
  const floor = HEADING_SIZE_FLOOR[group];
  const step = (dir) => ladderStep(px, dir);
  const dn = step(-1), up = step(1);
  return stepCell({
    px,
    // Sizes DO bound on their neighbors: the ramp must stay strictly increasing or the engine
    // refuses to build. That is the difference from weight roles, which may cross.
    canDown: dn !== void 0 && dn >= floor && (lower === void 0 || dn > lower),
    canUp: up !== void 0 && (upper === void 0 || up < upper),
    pinned: mode ? modeSizePin(mode, group, variant) !== void 0 : brandSizePin(group, variant) !== void 0,
    label: `${group} ${variant}${mode ? ` in ${mode}` : ""}`,
    step,
    write: (v) => {
      if (mode) setModeLever(mode, `typeSizes.${group}.${variant}`, v);
      else setBrandSize(group, variant, v);
      applyFull();
    }
  });
};
var renderSizeTable = (group) => {
  const live = headingRows(group);
  const all = widestRows?.get(group) ?? live;
  if (!all.length) return null;
  const inRange = new Set(live.map((r) => r.variant));
  const modes = rp.modes;
  const box = el("div", "mtbl");
  box.append(el("p", "mtbl-cap", group));
  const scroll = el("div", "mtbl-scroll");
  const tbl = el("table", "mtbl-tbl");
  const thead = el("thead"), htr = el("tr");
  htr.append(el("th", "mtbl-stick", "Size"));
  for (const m of modes) {
    const th = el("th", "mtbl-mode");
    const h = sizeColumnHeader(m === "light", modeIsEditable(m), MODE_LABEL[m] ?? m);
    th.append(document.createTextNode(h.text));
    if (h.suffix) th.append(el("span", "mtbl-ro", h.suffix));
    if (h.title) th.title = h.title;
    htr.append(th);
  }
  htr.append(el("th", "mtbl-fill"));
  thead.append(htr);
  tbl.append(thead);
  const tb = el("tbody");
  const resolvedByMode = /* @__PURE__ */ new Map();
  for (const m of modes) {
    resolvedByMode.set(m, live.map((r) => {
      const c = theme.typography.composites.find((x) => x.group === group && x.variant === r.variant);
      return (m === "light" ? void 0 : c.sizeByMode?.[m]) ?? c.sizePx;
    }));
  }
  const mobileResolved = live.map((r) => theme.typography.composites.find((x) => x.group === group && x.variant === r.variant).sizeMinPx);
  const desktopResolved = resolvedByMode.get("light") ?? live.map((r) => r.px);
  const mobileCell = (i) => {
    const variant = live[i].variant;
    const px = mobileResolved[i];
    const desktop = desktopResolved[i];
    const floor = HEADING_SIZE_FLOOR[group];
    const larger = i > 0 ? mobileResolved[i - 1] : void 0;
    const smaller = i + 1 < mobileResolved.length ? mobileResolved[i + 1] : void 0;
    const derived = mobileEndpoint(theme.typography.sizesPx, group, desktop);
    const pinned = viewportPin(group, variant, "mobile") !== void 0;
    const step = (dir) => ladderStep(px, dir);
    const dn = step(-1), up = step(1);
    return stepCell({
      px,
      canDown: dn !== void 0 && dn >= floor && (smaller === void 0 || dn >= smaller),
      canUp: up !== void 0 && up <= desktop && (larger === void 0 || up <= larger),
      pinned,
      label: `${group} ${variant} mobile`,
      title: () => pinned ? `Mobile size, pinned (the Responsive lever would derive ${derived}px)` : `Mobile size, derived from the ${desktop}px desktop value by the Responsive lever`,
      step,
      write: (v) => {
        setViewportSize(group, variant, "mobile", v);
        applyFull();
      }
    });
  };
  for (const r of all) {
    const tr = el("tr", inRange.has(r.variant) ? "" : "mtbl-off");
    const nameCell = el("td", "mtbl-stick");
    nameCell.append(el("span", "mtbl-name mono", r.variant));
    if (!inRange.has(r.variant)) nameCell.append(el("span", "mtbl-ro", " outside range"));
    tr.append(nameCell);
    if (inRange.has(r.variant)) {
      const i = live.findIndex((x) => x.variant === r.variant);
      for (const m of modes) {
        const td = el("td", "mtbl-mode");
        if (m !== "light" && !modeIsEditable(m)) {
          const px = resolvedByMode.get(m)[i];
          const self = el("span", "mtbl-selfval mono", `${px}px`);
          self.title = `${MODE_LABEL[m] ?? m} is auto-derived from Light and Dark \u2014 it resolves to ${px}px and accepts no per-mode override.`;
          td.append(self);
        } else if (m === "light" && theme.typography.fluid) {
          const stack = el("div", "mtbl-vpstack");
          stack.append(
            el("span", "mtbl-vplab", "Desktop"),
            sizeCell(group, live, i, null, resolvedByMode.get("light")),
            el("span", "mtbl-vplab", "Mobile"),
            mobileCell(i)
          );
          td.append(stack);
        } else {
          td.append(sizeCell(group, live, i, m === "light" ? null : m, resolvedByMode.get(m)));
        }
        tr.append(td);
      }
    } else {
      for (const [mi, m] of modes.entries()) {
        const td = el("td", "mtbl-mode");
        td.append(el("span", "mtbl-offval mono", mi === 0 ? `${r.px}px` : "\u2014"));
        tr.append(td);
      }
    }
    tr.append(el("td", "mtbl-fill"));
    tb.append(tr);
  }
  tbl.append(tb);
  scroll.append(tbl);
  box.append(scroll);
  return box;
};
var renderTypeSizes = () => {
  const ty = theme.typography;
  const sec = palSection("Heading sizes", "The shape of the heading system, how far the ramp runs, and \u2014 if you need it \u2014 every size set individually.");
  const cur = getPath2(brandState, "typography.typeScale") ?? "default";
  const cards = hook(el("div", "shape-cards"), "heading-shapes");
  let anyBlocked = false;
  for (const [key, name, blurb] of TYPE_SHAPES) {
    const b = hook(el("button", "shape-card" + (key === cur ? " on" : "")), `heading-shape-${key}`);
    b.setAttribute("aria-pressed", String(key === cur));
    const titles = ty.composites.filter((c) => c.group === "title").map((c) => c.sizePx);
    const d = SHAPE_SHIFT[key] - SHAPE_SHIFT[cur];
    const shifted = titles.map((p) => ladderStep(p, d) ?? p);
    b.append(
      el("b", void 0, name),
      el("span", "shape-blurb", blurb),
      el("span", "shape-nums mono", titles.length ? `title ${Math.min(...shifted)}px\u2013${Math.max(...shifted)}px` : "")
    );
    let blocked = false;
    if (key !== cur) {
      try {
        brandTheme({ ...brandState, typography: { ...brandState.typography, typeScale: key === "default" ? void 0 : key } });
      } catch {
        blocked = true;
      }
    }
    b.disabled = blocked;
    if (blocked) b.title = "Some sizes set below would clash at this shape. Release them to switch.";
    b.onclick = () => {
      if (key === cur || blocked) return;
      setPath2(brandState, "typography.typeScale", key === "default" ? void 0 : key);
      applyFull();
    };
    cards.append(b);
    if (blocked) anyBlocked = true;
  }
  if (anyBlocked) {
    const warn = el("div", "shape-blocked");
    warn.append(el("span", void 0, "Some shapes are unavailable while sizes are set individually \u2014 they would clash."));
    const rel = hook(el("button", "shape-release", "Release pinned sizes"), "heading-shape-release");
    rel.onclick = () => {
      if (brandState.typography) {
        delete brandState.typography.sizes;
        delete brandState.typography.sizeOverrides;
      }
      for (const m of Object.keys(brandState.modeLevers ?? {})) setModeLever(m, "typeSizes", void 0);
      applyFull();
    };
    warn.append(rel);
    cards.append(warn);
  }
  sec.append(fieldBlock("Shape", "How the heading sizes step. Most brands never need more than this.", cards));
  const range = el("div", "range-row");
  const ceil = leverByKey("typography.displayCeiling");
  if (ceil) {
    const f = el("div", "range-f");
    f.append(el("span", "pfk", "Largest display size"));
    const sel = selectEl("sm");
    const opts = ceil.options ?? [];
    let pxByVariant = /* @__PURE__ */ new Map();
    try {
      const full = brandTheme({ ...brandState, typography: { ...brandState.typography, displayCeiling: opts[opts.length - 1]?.value } });
      pxByVariant = new Map(full.typography.composites.filter((c) => c.group === "display").map((c) => [c.variant, c.sizePx]));
    } catch {
    }
    for (const o of opts) {
      const px = pxByVariant.get(String(o.value));
      sel.append(optionEl(String(o.value), px ? `${o.value} \u2014 ${px}px` : String(o.value)));
    }
    sel.value = String(getPath2(brandState, ceil.key) ?? ceil.default);
    sel.onchange = () => {
      setPath2(brandState, ceil.key, sel.value);
      applyFull();
    };
    f.append(sel);
    range.append(f);
  }
  {
    const f = hook(el("div", "range-f"), "heading-title-floor");
    f.append(el("span", "pfk", "Smallest title size"));
    const on = (getPath2(brandState, "typography.titleFloor") ?? 18) === 16;
    const row = el("div", "range-tg");
    const tf2 = toggleField(on, (checked) => {
      setPath2(brandState, "typography.titleFloor", checked ? 16 : void 0);
      applyFull();
    });
    const readout2 = tf2.querySelector(".knob-val");
    if (readout2) tf2.insertBefore(el("span", "range-tglab mono", "16px"), readout2);
    else tf2.append(el("span", "range-tglab mono", "16px"));
    row.append(tf2);
    f.append(row);
    range.append(f);
  }
  sec.append(fieldBlock("Range", "Where the ramp starts and stops. Sizes outside it are not generated.", range));
  const pins = pinnedSizeCount();
  const open = typeSizesOpen ?? pins > 0;
  if (open) computeWidestRows();
  const head = el("div", "szt-head");
  const tf = toggleField(open, (checked) => {
    typeSizesOpen = checked;
    renderWorkspace();
  });
  const readout = tf.querySelector(".knob-val");
  const headLab = el("span", "szt-headlab", "Edit individual sizes");
  if (readout) tf.insertBefore(headLab, readout);
  else tf.append(headLab);
  head.append(tf);
  if (pins) head.append(el("span", "szt-badge", `${pins} customized`));
  sec.append(fieldBlock("Customize sizes", "Set any size directly, vary it per mode, and \u2014 when Responsive is on \u2014 pin a desktop or mobile value per size. The shape above still sets everything you don\u2019t touch.", head));
  if (open) for (const g of PER_MODE_SIZE_GROUPS) {
    const t = renderSizeTable(g);
    if (t) sec.append(t);
  }
  return sec;
};
var renderResponsiveControls = () => {
  const ty = theme.typography;
  const col = el("div", "cs-ctl-stack");
  const cb = el("input");
  cb.type = "checkbox";
  cb.checked = brandState.typography?.responsive?.fluid ?? ty.fluid;
  cb.onchange = () => {
    setPath2(brandState, "typography.responsive.fluid", cb.checked);
    apply();
  };
  const fl = el("label", "adv-row");
  fl.append(cb, el("span", "adv-row-lab", "Fluid heading sizing (clamp between viewports)"));
  col.append(fl);
  const mk = (key, label, fallback) => {
    const inp = numberField({ className: "adv-num", value: String(getPath2(brandState, `typography.responsive.${key}`) ?? fallback) });
    inp.onchange = () => {
      const n = Number(inp.value);
      if (Number.isFinite(n)) {
        setPath2(brandState, `typography.responsive.${key}`, n);
        apply();
      }
    };
    const row = el("div", "adv-row");
    row.append(el("span", "adv-row-lab", label), inp, el("span", "adv-unit", "px"));
    col.append(row);
  };
  mk("minViewport", "Min viewport", ty.minViewport);
  mk("maxViewport", "Max viewport", ty.maxViewport);
  return col;
};
var renderBreakpointsControls = () => {
  const listEl = el("div", "adv-bplist");
  const commit2 = (arr) => {
    const clean = [...new Set(arr.filter((n) => Number.isFinite(n) && n >= 0))].sort((a, b) => a - b);
    setPath2(brandState, "layout.breakpoints", clean);
    draw();
    apply();
  };
  const draw = () => {
    listEl.innerHTML = "";
    const bps = brandState.layout?.breakpoints ?? theme.layout.breakpoints.map((b) => b.px);
    bps.forEach((px, i) => {
      const cell = el("div", "adv-bp");
      const inp = numberField({ className: "adv-num", value: String(px) });
      inp.onchange = () => {
        const next = [...bps];
        next[i] = Number(inp.value);
        commit2(next);
      };
      const rm = el("button", mix("adv-x", "hit-min"), "\xD7");
      rm.onclick = () => commit2(bps.filter((_, j) => j !== i));
      cell.append(inp, rm);
      listEl.append(cell);
    });
    const add = el("button", "adv-add", "+ Add");
    add.onclick = () => {
      const bps2 = brandState.layout?.breakpoints ?? theme.layout.breakpoints.map((b) => b.px);
      commit2([...bps2, Math.max(0, ...bps2) + 256]);
    };
    listEl.append(add);
  };
  draw();
  return listEl;
};
var renderEasingEditor = () => {
  const wrap = palSection("Easing", "Six curves, fixed \u2014 no curve\u2019s numbers are authored or change per mode. What you choose is which curve each motion role uses: once for the brand, and per mode where a mode wants to differ. The Motion specimen traces the emphasized card.");
  wrap.append(subHead("The curve set"));
  const strip2 = el("div", "mo-ez-strip");
  for (const [name, bez] of Object.entries(theme.motion.easing)) {
    const card = el("div", "mo-ez-card");
    const stage = el("div", "mo-ez-stage");
    stage.append(motionStageSvg(bez));
    card.append(
      stage,
      el("div", "mo-ez-name", name),
      tokenPillWrapping(`motion.easing.${name}`),
      el("div", "mo-ez-bez mono", `${bez.join(", ")}`)
    );
    strip2.append(card);
  }
  wrap.append(strip2);
  if (rp.modes.length > 1) {
    const m = theme.motion;
    const curve = (k) => `cubic-bezier(${(m.easing[k] ?? []).join(", ")})`;
    wrap.append(renderRepointTable(
      "Easing per mode",
      m.easingRoles.map((r) => ({ key: r.role, val: r.curve, base: r.curve })),
      (v) => String(v),
      "easings",
      Object.keys(m.easing).map((k) => ({ key: k, val: curve(k) })),
      "Role",
      (role, c2) => setPath2(brandState, `motionPersonality.easingRoles.${role}`, c2)
    ));
  }
  return wrap;
};
var renderDurationRamp = () => {
  const mo = theme.motion;
  const byMode = mo.motionByMode?.[currentMode];
  const dur = byMode?.duration ?? mo.duration;
  const reduced = byMode?.durationReduced ?? mo.durationReduced;
  const stagger = byMode?.stagger ?? mo.stagger;
  const tempoLabel = byMode?.tempo ?? mo.tempo;
  const wrap = hook(palSection(
    "Duration ramp",
    `The six semantic durations at tempo '${tempoLabel}', each aliasing a literal ms primitive, beside the reduce-motion ramp the engine derives from it. Read-only \u2014 Tempo above scales the whole ladder.`
  ), "section-duration-ramp");
  const table = el("table", mix("ctable", "mo-ramp"));
  const head = el("tr");
  for (const h of ["Step", "Duration", "Aliases", "Reduce-motion"]) head.append(el("th", void 0, h));
  table.append(head);
  for (const name of Object.keys(dur).filter((n) => n !== SPIN_ROLE)) {
    const ms = dur[name], rms = reduced[name];
    const tr = el("tr");
    const nameCell = el("td");
    nameCell.append(el("span", "mo-ramp-name", name), tokenPill(`motion.duration.${name}`));
    const aliasCell = el("td");
    aliasCell.append(tokenPill(`motion.duration-ms.${ms}`));
    const redCell = el("td");
    redCell.append(el("span", "mo-ramp-ms mono", `${rms}ms`));
    if (rms === 0) redCell.append(el("span", "mo-ramp-note", "eliminated"));
    redCell.append(tokenPill(`motion.duration-reduced.${name}`));
    tr.append(nameCell, el("td", "mono", `${ms}ms`), aliasCell, redCell);
    table.append(tr);
  }
  wrap.append(table);
  const foot = el("div", "mo-ramp-foot");
  foot.append(
    el("span", "mo-ramp-name", "stagger"),
    tokenPill("motion.stagger"),
    el("span", "mono", `${stagger}ms`),
    el("span", "mo-ramp-note", "between staggered siblings")
  );
  wrap.append(foot);
  const msValues = /* @__PURE__ */ new Set();
  const collect = (m) => {
    if (!m) return;
    for (const v of Object.values(m.duration ?? {})) msValues.add(v);
    for (const v of Object.values(m.durationReduced ?? {})) msValues.add(v);
    if (m.stagger !== void 0) msValues.add(m.stagger);
  };
  collect(mo);
  for (const mm of Object.values(mo.motionByMode ?? {})) collect(mm);
  wrap.append(subHead(`Millisecond primitives \u2014 ${msValues.size} values`));
  wrap.append(el("p", "sl-note", "Literal, not semantic: one invariant leaf per reachable value across every mode\u2019s tempo. A per-mode tempo re-points the alias above; it never re-values one of these."));
  const prims = el("div", "mo-ms-strip");
  for (const v of [...msValues].sort((a, b) => a - b)) {
    const chip = el("div", "mo-ms-chip");
    chip.append(el("span", "mo-ms-val mono", `${v}ms`), tokenPillWrapping(`motion.duration-ms.${v}`));
    prims.append(chip);
  }
  wrap.append(prims);
  return wrap;
};
var renderSpringsSection = () => {
  const wrap = palSection("Springs", "Three generated spring presets for platforms that animate with physics rather than a duration + curve. Read-only \u2014 stated as damping and stiffness, the two numbers a consumer needs.");
  const grid = el("div", "mo-spring-grid");
  for (const [name, s] of Object.entries(theme.motion.spring)) {
    const card = el("div", "mo-spring-card");
    card.append(el("div", "mo-ez-name", name), tokenPillWrapping(`motion.spring.${name}`));
    const nums = el("div", "mo-spring-nums mono");
    nums.append(el("span", void 0, `damping ${s.damping}`), el("span", void 0, `stiffness ${s.stiffness}`));
    card.append(nums);
    grid.append(card);
  }
  wrap.append(grid);
  return wrap;
};
var renderScreen = (host, key, sections, specimens) => {
  const [title, lede] = PAGE_COPY[key];
  host.append(hero(title, lede));
  if (DERIVED_MODES.has(currentMode)) host.append(renderGeneratedNote());
  else sections(host);
  const vol = el("div", "stage-vol");
  host.append(vol);
  setVolatile([vol], () => {
    vol.innerHTML = "";
    for (const s of specimens()) if (s) vol.append(s);
  });
  paintVolatile();
};
var SURFACE_CONTRACT_COMPONENTS = /* @__PURE__ */ new Set(["typography", "card"]);
var renderSectionContrast = (key) => {
  if (key !== "surfaces" && key !== "interactive") return null;
  const cts = rp.contracts.filter((ct) => SURFACE_CONTRACT_COMPONENTS.has(ct.component) === (key === "surfaces"));
  if (!cts.length) return null;
  const det = el("details", "contracts");
  const sum = el("summary", "contracts-sum");
  sum.append(el("span", "contracts-t", "Contrast on this page"), el("span", "contracts-hint", `${cts.length} pairs \xB7 all modes \xB7 the full system table lives in Preview`));
  det.append(sum);
  det.append(el("p", "np-note", "The a11y pairs this page governs, computed on the resolved colors across every mode \u2014 the per-control badges above verify the active mode at the point of edit."));
  det.append(contractTableEl(cts, true));
  return det;
};
var renderSurfacesPage = (host) => renderScreen(host, "surfaces", (h) => {
  h.append(renderSurfacesEditor());
  h.append(renderForegroundsEditor());
  h.append(renderForegroundEditor());
  h.append(subHead("Gradients"));
  renderGradientsSection(h);
}, () => []);
var renderInteractivePage = (host) => renderScreen(host, "interactive", (h) => {
  renderInteractiveMatrix(h);
}, () => [renderSectionContrast("interactive")]);
var renderTypePreview = () => {
  const ty = theme.typography;
  const wrap = el("div");
  const fam = palSection("Typefaces", `The face each category resolves to${rp.modes.length > 1 ? ", per mode" : ""}. Everything below is set in these.`);
  const ftbl = el("div", "mtbl");
  const fscroll = el("div", "mtbl-scroll");
  const ft = el("table", "mtbl-tbl");
  const fhead = el("thead"), fhtr = el("tr");
  fhtr.append(el("th", "mtbl-stick", "Category"));
  for (const m of rp.modes) {
    const th = el("th", "mtbl-mode");
    th.append(document.createTextNode(MODE_LABEL[m] ?? m));
    if (m === "light") th.append(el("span", "mtbl-ro", " baseline"));
    fhtr.append(th);
  }
  fhtr.append(el("th", "mtbl-fill mtbl-spec", "Specimen"));
  fhead.append(fhtr);
  ft.append(fhead);
  const fb = el("tbody");
  for (const f of ty.families) {
    const tr = el("tr");
    const nc = el("td", "mtbl-stick");
    nc.append(el("span", "mtbl-name mono", f.group));
    tr.append(nc);
    let stack = f.stack.join(", ");
    for (const m of rp.modes) {
      const per = ty.familiesByMode?.[m]?.find((x) => x.group === f.group)?.stack.join(", ");
      const resolved = per ?? f.stack.join(", ");
      if (m === "light") stack = resolved;
      const td = el("td", "mtbl-mode");
      const nm = el("span", "tp-fam", resolved.split(",")[0].replace(/["']/g, "").trim());
      nm.title = resolved;
      td.append(nm);
      tr.append(td);
    }
    const spec = el("td", "mtbl-fill mtbl-spec");
    const samp = el("span", "mtbl-spec-t", "The quick brown fox jumps");
    samp.style.fontFamily = stack;
    spec.append(samp);
    tr.append(spec);
    fb.append(tr);
  }
  ft.append(fb);
  fscroll.append(ft);
  ftbl.append(fscroll);
  fam.append(ftbl);
  wrap.append(fam);
  const wsec = palSection("Weight roles by face", "Each role at the numeric it resolves to, and whether each face actually ships that weight. Availability is advisory \u2014 nothing here is ever blocked. Set the numerics on Semantics.");
  const faces = [];
  const addFace = (stackArr, cat) => {
    if (!stackArr?.length) return;
    const name = stackArr[0].replace(/["']/g, "").trim();
    const found = faces.find((f) => f.name.toLowerCase() === name.toLowerCase());
    if (found) {
      if (!found.roles.includes(cat)) found.roles.push(cat);
      return;
    }
    faces.push({ name, stack: stackArr.join(", "), roles: [cat] });
  };
  for (const f of ty.families) addFace(f.stack, f.group);
  for (const m of rp.modes) for (const f of ty.familiesByMode?.[m] ?? []) addFace(f.stack, f.group);
  const wtbl = el("div", "mtbl");
  const wscroll = el("div", "mtbl-scroll");
  const wt = el("table", "mtbl-tbl");
  const whead = el("thead"), whtr = el("tr");
  whtr.append(el("th", "mtbl-stick", "Role"), el("th", "mtbl-mode", "Weight"));
  for (const f of faces) {
    const th = el("th", "mtbl-mode");
    th.append(document.createTextNode(f.name));
    th.title = `${f.name} \u2014 used by ${f.roles.join(", ")}
${f.stack}`;
    whtr.append(th);
  }
  whtr.append(el("th", "mtbl-fill"));
  whead.append(whtr);
  wt.append(whead);
  const wb = el("tbody");
  for (const w of ty.weightRoles) {
    const tr = el("tr");
    const nc = el("td", "mtbl-stick");
    nc.append(el("span", "mtbl-name mono", w.role));
    tr.append(nc);
    tr.append(el("td", "mtbl-mode", `${w.value} ${WEIGHT_NAME[w.value] ?? ""}`.trim()));
    for (const f of faces) {
      const known = knownWeightsOf(f.name);
      const ships = !known ? null : known.includes(w.value);
      const td = el("td", "mtbl-mode");
      td.append(el("span", "tpw-mark " + (ships === null ? "unknown" : ships ? "yes" : "no"), ships === null ? "?" : ships ? "\u25CF" : "\u25CB"));
      const samp = el("span", mix("mtbl-spec-t", "tpw-samp"), "Ag 123");
      samp.style.fontWeight = String(w.value);
      samp.style.fontFamily = f.stack;
      td.append(samp);
      td.title = ships === null ? `${f.name} \u2014 unknown family, availability cannot be asserted` : ships ? `${f.name} ships ${w.value}` : `${f.name} may not ship ${w.value} \u2014 falls back to the nearest`;
      tr.append(td);
    }
    tr.append(el("td", "mtbl-fill"));
    wb.append(tr);
  }
  wt.append(wb);
  wscroll.append(wt);
  wtbl.append(wscroll);
  wsec.append(wtbl);
  wsec.append(el("p", "sl-note", "\u25CF ships it \xB7 \u25CB may not (falls back to the nearest) \xB7 ? unknown family, not flagged. A specimen that looks identical to the row above it is the fallback showing \u2014 that is what \u25CB predicts."));
  const repointed = ty.weightRoles.filter((w) => rp.modes.some((m) => {
    const v = ty.weightRolesByMode?.[m]?.find((x) => x.role === w.role)?.value;
    return v !== void 0 && v !== w.value;
  })).map((w) => w.role);
  if (repointed.length)
    wsec.append(el("p", "sl-note", `Baseline numerics shown. ${repointed.length === 1 ? "One role is" : `${repointed.length} roles are`} re-pointed in at least one mode (${repointed.join(", ")}) \u2014 see Weight roles on the Semantics tab for the per-mode values. Availability itself does not vary by mode.`));
  wrap.append(wsec);
  wrap.append(renderTypeRamp());
  return wrap;
};
var typeTab = "primitives";
var TYPE_TABS = [["primitives", "Primitives"], ["semantics", "Semantics"], ["styles", "Text styles"], ["preview", "Preview"]];
var renderTypographyPage = (host) => renderScreen(host, "typography", (h) => {
  const seg = el("div", "pvseg");
  for (const [k, label] of TYPE_TABS) {
    const b = hook(el("button", "pvseg-b" + (typeTab === k ? " on" : ""), label), `type-tab-${k}`);
    b.onclick = () => {
      if (typeTab !== k) {
        typeTab = k;
        renderWorkspace();
      }
    };
    seg.append(b);
  }
  h.append(seg);
  h.append(el("p", "tabnote", typeTab === "primitives" ? "The raw material. Only the typeface library is yours to edit \u2014 the ladders below it are fixed and brand-invariant, shown so you can see what every style is chosen from." : typeTab === "semantics" ? "Named roles, each bound to one primitive. A mode can re-point any of them without touching the primitive underneath." : typeTab === "styles" ? "The styles your product actually uses, and the levers that shape them." : "Everything the system generates, at size, in every mode. Nothing here is editable."));
  if (typeTab === "primitives") h.append(renderTypefaceLibrary(), renderSizeLadder(), renderRungLadders());
  else if (typeTab === "semantics") {
    h.append(renderTypefaceBindings(), renderWeightRoles(), renderLeadingTracking());
    const repoints = renderRepoints();
    if (repoints) h.append(repoints);
  } else if (typeTab === "styles") h.append(renderTypeSizes(), renderCategorySetup(), renderFacePins());
  else h.append(renderTypePreview());
}, () => []);
var renderElevationPage = (host) => renderScreen(host, "elevation", (h) => {
  h.append(renderShadowEditor(leverByKey("shadow.softness")));
}, () => [renderShadowSpecimen()]);
var leverControl = (key, perMode, commit2) => {
  const l = leverByKey(key);
  if (!l) return null;
  if (key === "radiusScale" && perMode) return renderPerModeRadius(l);
  if (key === "density" && perMode) return renderPerModeDensity(l);
  if (key === "motionPersonality.tempo" && perMode) return renderPerModeTempo(l);
  return renderControl(l, commit2);
};
var leverSection = (title, sub, keys, perMode, commit2) => {
  const sec = palSection(title, sub);
  let any = false;
  for (const k of keys) {
    const c = leverControl(k, perMode, commit2);
    if (c) {
      sec.append(c);
      any = true;
    }
  }
  return any ? sec : null;
};
var csLeverStack = (keys, perMode) => {
  const stack = el("div", "cs-ctl-stack");
  for (const k of keys) {
    const c = leverControl(k, perMode);
    if (c) stack.append(c);
  }
  return stack;
};
var primitiveScalesNote = () => el(
  "p",
  "ic-modenote",
  "Nothing to set here. The dimension grid is the fixed 4px-step ladder every geometry token resolves onto \u2014 border widths and icon sizes are named aliases onto it, and radius, spacing and component sizes land on its steps. Change those on the sections above; this is what they land on."
);
var ALPHA_STEPS_UI = [0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
var alphaHex2 = (base, pct) => `#${base === "black" ? "000000" : "ffffff"}${Math.round(pct / 100 * 255).toString(16).padStart(2, "0")}`;
var renderAlphaAndOpacity = () => {
  const sec = palSection("Alpha & opacity", "Black and white at increasing transparency, and the matching dimensionless opacity scale. Fixed for every brand \u2014 these are primitives, so there is nothing to tune; they are here so you can see what exists and what each name resolves to.");
  const ramp = (name, path, steps, dark, fill, value, chipPct) => {
    const row = el("div", "prow");
    const head = el("div", "phead");
    const ident = el("div", "pident");
    const chip = el("div", mix("pswatch", "ro", "ao-chk", dark ? "dark" : ""));
    const chipFill = el("div", "ao-fill");
    chipFill.style.background = fill(chipPct);
    chip.append(chipFill);
    const idcol = el("div", "pidcol");
    idcol.append(el("span", "pname", name));
    const sub = el("div", "psub");
    sub.append(tokenPill(path));
    idcol.append(sub);
    ident.append(chip, idcol);
    head.append(ident);
    row.append(head);
    const wrap = el("div", "pramp");
    const band = el("div", "band");
    const strip2 = el("div", "strip");
    const labs = el("div", "labs");
    for (const pct of steps) {
      const sw = el("div", mix("sw", "ao-chk", dark ? "dark" : ""));
      const inner = el("div", "ao-fill");
      inner.style.background = fill(pct);
      sw.append(inner);
      strip2.append(sw);
      const lab = el("div", "lab");
      lab.append(el("span", "lab-step mono", String(pct)), el("span", "lab-hex mono", value(pct)));
      lab.title = `${path}.${pct}`;
      labs.append(lab);
    }
    band.append(strip2, labs);
    wrap.append(band);
    row.append(wrap);
    return row;
  };
  const alphaSteps = ALPHA_STEPS_UI.filter((x) => x > 0 && x < 100);
  sec.append(ramp(
    "Black alpha",
    "palette.black-alpha",
    alphaSteps,
    false,
    (p) => `rgba(0,0,0,${p / 100})`,
    (p) => alphaHex2("black", p),
    50
  ));
  sec.append(ramp(
    "White alpha",
    "palette.white-alpha",
    alphaSteps,
    true,
    (p) => `rgba(255,255,255,${p / 100})`,
    (p) => alphaHex2("white", p),
    50
  ));
  sec.append(ramp(
    "Opacity",
    "opacity",
    ALPHA_STEPS_UI,
    false,
    (p) => `rgba(23,19,53,${p / 100})`,
    (p) => String(+(p / 100).toFixed(2)),
    50
  ));
  return sec;
};
var spacingFixedNote = () => el(
  "p",
  "ic-modenote",
  "The 8px rhythm is fixed for every brand. Changing the base would rename spacing values rather than unlock them \u2014 4px is still available as space.050 \u2014 and the numbered scale only means \u201Cn\xD7 base\u201D across brands if the base is the same across brands."
);
var renderSizeRadiusPage = (host) => controlSplitPage(host, "sizeRadius", () => {
  const perMode = currentMode !== "light";
  return [
    { title: "Corner radius", sub: "The corner-radius ramp \u2014 its anchor (radius.md at scale 1), the softness dial that scales the whole ramp, and the opt-in 1px hairline the even sub-grid cannot otherwise reach.", controls: csLeverStack(["baseMd", "radiusScale", "radiusHairline"], perMode), paint: paintRadiusPreview },
    // controlShape is a GLOBAL brand lever (not per-mode) — `csLeverStack([…], false)` renders the plain
    // enum select. It sits beside corner softness on purpose: both shape the corner, but orthogonally
    // (softness scales the ramp; pill overrides it with height ÷ 2 for pill-able controls).
    { title: "Control shape", sub: "Corner shape for pill-able controls (button, icon-button). Boxed is sharp; hairline is a fixed 1px edge; rounded follows corner softness; pill is a full height \xF7 2, whatever the softness.", controls: csLeverStack(["controlShape"], false), paint: paintControlShapePreview },
    // The button levers (#1667) are GLOBAL brand levers like controlShape, so `false` again. The labels are
    // the owner's exact words and live in `levers.ts`; this block only groups them beside their specimen.
    { title: "Buttons", sub: "Button icon placement, the medium label and icon size, the label weight, and minimum width. Applies to buttons, not icon buttons.", controls: csLeverStack(["buttonIcons", "buttonContentSize", "buttonLabelWeight", "buttonMinWidthMultiplier"], false), paint: paintButtonLayoutPreview },
    // Per mode, the note says what a mode's own density does and does not move (owner, 2026-09-29, docs/28
    // §5.4.3); the sentence is the density lever's own, so the knob and the section read the same.
    { title: "Density & size", sub: perMode ? "Component sizing \u2014 control height per step. Spacing follows the brand\u2019s density, not the mode\u2019s: a mode\u2019s density changes control heights only." : "Component sizing \u2014 control height per step. The density name stays stable; the heights shift, and each component\u2019s padding and gaps move one step on the spacing scale.", controls: csLeverStack(["density"], perMode), paint: paintSizePreview },
    // No controls: the rhythm and the fine grid base are FIXED (scale.ts SPACE_BASE / GRID_BASE). The
    // specimen stays — the scale is still worth reading — and the note says why there is nothing to set,
    // which is more use than a section that quietly vanished.
    { title: "Spacing grid", sub: "The spacing rhythm \u2014 space.100 = 1\xD7 an 8px base, fixed for every brand.", controls: spacingFixedNote(), stack: true, paint: paintSpacingPreview },
    // These three scales are emitted, aliased by half the system, and were visible NOWHERE in the
    // dashboard — a user could only find them in Preview's token list. Nothing here is settable, which
    // is exactly why they had no home: the page is organized around levers, and a scale with no lever
    // fell through. Read-only is the point — see what exists, and what the names resolve to.
    { title: "Primitive scales", sub: "The raw grid the geometry aliases resolve onto \u2014 fixed for every brand, and read-only. Radius, spacing and component sizes all land on dimension steps.", controls: primitiveScalesNote(), stack: true, paint: paintPrimitivesPreview }
  ];
});
var controlSplitPage = (host, pageKey, blocks) => {
  const [title, lede] = PAGE_COPY[pageKey];
  host.append(hero(title, lede));
  if (DERIVED_MODES.has(currentMode)) {
    host.append(renderGeneratedNote());
    setVolatile([], () => {
    });
    return;
  }
  const refreshers = [];
  const previews = [];
  for (const b of blocks()) {
    const sec = palSection(b.title, b.sub);
    const preview = el("div", "cs-preview");
    if (!b.controls || b.stack) {
      if (b.controls) sec.append(b.controls);
      addClass(preview, "cs-preview-full");
      sec.append(preview);
    } else {
      const split = el("div", "cs-split");
      const ctlCol = el("div", "cs-ctl-col");
      ctlCol.append(b.controls);
      split.append(ctlCol, preview);
      sec.append(split);
    }
    host.append(sec);
    previews.push(preview);
    refreshers.push(() => b.paint(preview));
  }
  setVolatile(previews, () => {
    refreshers.forEach((r) => r());
  });
  paintVolatile();
};
var csSlider = (key, label, min, max, step, unit, get) => {
  const f = el("div", "cs-ctl");
  const top = el("div", "cs-ctl-top");
  const val = el("span", "cs-ctl-val mono", `${get()}${unit}`);
  top.append(el("span", "cs-ctl-lab", label), val);
  const input = rangeInput({ className: "cs-range", min, max, step, value: get() });
  input.oninput = () => {
    val.textContent = `${input.value}${unit}`;
  };
  input.onchange = () => {
    setPath2(brandState, key, Number(input.value));
    apply();
  };
  f.append(top, input);
  return f;
};
var LAYOUT_COLUMN_CHOICES = [4, 6, 8, 12, 16, 24];
var renderLayoutPage = (host) => controlSplitPage(host, "layout", () => {
  const colSel = selectEl("cap");
  const curCols = brandState.layout?.columns ?? theme.layout.baseColumns;
  for (const c of LAYOUT_COLUMN_CHOICES) colSel.append(optionEl(String(c), `${c} columns`, c === curCols));
  colSel.onchange = () => {
    setPath2(brandState, "layout.columns", Number(colSel.value));
    apply();
  };
  const colsCtl = el("div", "cs-ctl");
  colsCtl.append(el("span", "cs-ctl-lab", "Grid columns"), colSel);
  const caps = el("div", "cs-ctl-stack");
  caps.append(
    csSlider("layout.containerMax", "Container max", 960, 1920, 40, "px", () => brandState.layout?.containerMax ?? theme.layout.containerMax),
    csSlider("layout.containerNarrow", "Content container", 480, 960, 20, "px", () => brandState.layout?.containerNarrow ?? theme.layout.containerNarrow)
  );
  return [
    { title: "Breakpoints", sub: `Min-width floors (px, ascending) \u2014 names auto-assign from the count: ${theme.layout.breakpoints.map((x) => x.name).join(" / ")}.`, controls: renderBreakpointsControls(), stack: true, paint: paintBreakpointsPreview },
    // Beside breakpoints on purpose (#361): both are viewport thresholds in px, and the interpolation
    // range only means something read against the floors it spans.
    { title: "Responsive type sizing", sub: "Headings interpolate between a mobile floor and a desktop ceiling across this viewport range; body, label, caption and code stay fixed by design. Eyebrow shrinks only above 14px, so small kickers hold their size and hero kickers do not.", controls: renderResponsiveControls(), stack: true, paint: paintFluidPreview },
    { title: "Grid columns", sub: "Base column count for the design grid (16 / 24 for dense-data brands). Each breakpoint gets a 4/8/\u2026 ladder up to this base.", controls: colsCtl, paint: paintColumnsPreview },
    // The resolved per-breakpoint grid — the same `theme.layout.grid` the Figma grid-style emitter ships
    // from (#1480/#1532/#1593), so the readout cannot drift from what a brand exports. Columns, gutter and
    // margin are each editable per breakpoint (an override wins over the ladder); gutter/margin snap to the
    // spacing scale so they keep aliasing the space tokens.
    { title: "Per-breakpoint grid", sub: "The columns, gutter and margin the engine emits for each breakpoint \u2014 one Figma grid style each. Each follows its ladder by default; override a breakpoint to pin its value. Gutter and margin snap to the spacing scale, reaching down to 4px.", controls: perBreakpointColsNote(), stack: true, paint: paintPerBreakpointGrid },
    { title: "Container caps", sub: "Content-width caps \u2014 layout is fluid below the cap. The content container is the narrower reading-measure column (~65\u201375ch).", controls: caps, stack: true, paint: paintContainersPreview }
  ];
});
var renderMotionPage = (host) => renderScreen(host, "motion", (h) => {
  const perMode = currentMode !== "light";
  const tempo = leverSection("Tempo", "The overall motion speed for this brand. Per-mode outside Light.", leversFor("motion").map((l) => l.key), perMode, applyFull);
  if (tempo) h.append(hook(tempo, "section-tempo"));
  h.append(renderDurationRamp());
  h.append(renderEasingEditor());
  h.append(renderSpringsSection());
}, () => [renderMotionSpecimen()]);
var previewView = "styleguide";
var sgSurface = "background.primary";
var PREVIEW_VIEWS = [["styleguide", "Style guide"], ["contrast", "Contrast contracts"], ["tokens", "Token list"]];
var renderPreviewPage = (host) => {
  const [title, lede] = PAGE_COPY.preview;
  host.append(hero(title, lede));
  const seg = el("div", "pvseg");
  for (const [k, label] of PREVIEW_VIEWS) {
    const b = el("button", "pvseg-b" + (previewView === k ? " on" : ""), label);
    b.onclick = () => {
      if (previewView !== k) {
        previewView = k;
        renderWorkspace();
      }
    };
    seg.append(b);
  }
  host.append(seg);
  const vol = el("div", "stage-vol");
  host.append(vol);
  setVolatile([vol], () => {
    vol.innerHTML = "";
    const pv = el("div", "pvhost");
    vol.append(pv);
    if (previewView === "styleguide") renderPreviewStyleGuide(pv);
    else if (previewView === "contrast") renderPreviewContracts(pv);
    else renderPreviewTokens(pv);
  });
  paintVolatile();
};
var COMPONENT_CATALOGUE = false ? (() => {
  const buildable = componentDefs2.flatMap((d) => {
    if (d.figmaProperties?.notStandalone) return [];
    try {
      return [{ id: d.id, name: d.name, members: figmaAnatomySet(d, { swapTarget: "FPO-default-icon" }).length, components: d.figmaProperties?.emitAsComponents === true }];
    } catch {
      return [];
    }
  });
  const ids = new Set(buildable.map((b) => b.id));
  return {
    buildable,
    missing: componentDefs2.filter((d) => !ids.has(d.id)).map((d) => ({ name: d.name, reason: d.figmaProperties?.notStandalone ?? null }))
  };
})() : { buildable: [], missing: [] };
var FILE_SETUP_LABEL = "Set up file";
var renderComponentsPage = (host) => {
  const [title, lede] = PAGE_COPY.components;
  host.append(hero(title, lede));
  setVolatile([], () => {
  });
  if (!commit.isFigma) return;
  const fsSec = palSection(FILE_SETUP_LABEL, "Lays the file\u2019s page skeleton and builds its template assets.");
  const fsNote = el("p", "cw-note");
  fsNote.append(
    el("b", void 0, "Internal \u2014 experimental. "),
    document.createTextNode(
      "This creates the file\u2019s pages \u2014 Cover, section headers, Foundations and the Sandbox \u2014 and builds the two template assets onto the File Components page, so a component build has somewhere to land. It is idempotent: a re-run adds no page already present and rebuilds no asset already there. Known limits are tracked on #1554."
    )
  );
  fsSec.append(fsNote);
  const fsRow = el("div", "fs-row");
  fileSetupRow = fsRow;
  const fsBtn = el("button", "barbtn");
  fileSetupBtn = fsBtn;
  fsBtn.title = "Creates the file\u2019s pages and template assets. Safe to re-run \u2014 it never duplicates a page.";
  fsBtn.onclick = () => {
    fileSetupState = "pending";
    openDetail = null;
    renderBar();
    syncApplyDetail();
    syncFileSetupRow();
    commit.postFileSetup();
  };
  fsRow.append(fsBtn);
  syncFileSetupRow({ staged: true });
  fsSec.append(fsRow);
  host.append(fsSec);
  const sec = palSection("Build a component set", "Writes one component set onto the current Figma page.");
  const note = el("p", "cw-note");
  note.append(
    el("b", void 0, "Internal \u2014 experimental. "),
    document.createTextNode(
      "This exists to prove the component definition format can materialize, so it is not a supported way to get components into a file. Each variant takes about 162ms to write, in short bursts that leave Figma stuttering rather than frozen \u2014 so the cost is the variant count beside each set below. Figma then reconciles the new nodes after the result lands: that settle was measured at 1m10s on the 648-variant Button run, and it is not something this plugin can shorten. Known limits are tracked on #718."
    )
  );
  sec.append(note);
  const { buildable, missing } = COMPONENT_CATALOGUE;
  const declared = missing.filter((m) => m.reason);
  const threw = missing.filter((m) => !m.reason).map((m) => m.name);
  if (threw.length) {
    const gap = el("p", "cw-note");
    gap.append(
      document.createTextNode(
        `${threw.join(", ")} ${threw.length === 1 ? "is" : "are"} not offered here yet. The projector cannot build a Figma set from the definition yet, which is a limit in our own projector rather than something Figma cannot hold.`
      )
    );
    sec.append(gap);
  }
  for (const m of declared) {
    const gap = el("p", "cw-note");
    const prose = m.reason.replace(/^\S+:\s*/, "");
    gap.append(el("b", void 0, `${m.name} \u2014 `), document.createTextNode(prose));
    sec.append(gap);
  }
  const row = hook(el("div", "cw-row"), "components-row");
  componentRow = row;
  const sel = selectEl("cap");
  for (const b of buildable) {
    const unit = b.components ? "component" : "variant";
    const opt = el("option", void 0, `${b.name} \u2014 ${b.members} ${unit}${b.members === 1 ? "" : "s"}`);
    opt.value = b.id;
    if (b.id === "button") opt.selected = true;
    sel.append(opt);
  }
  componentSel = hook(sel, "components-def-picker");
  sel.title = "Which set to build. The variant count is the cost \u2014 about 162ms each.";
  row.append(sel);
  const compBtn = hook(el("button", "barbtn"), "components-build");
  componentBtn = compBtn;
  compBtn.title = "Builds the selected set on this page. Apply to Figma first \u2014 it binds those variables.";
  compBtn.onclick = () => {
    const def = sel.value;
    componentState = "pending";
    componentProgress = null;
    openDetail = null;
    renderBar();
    syncApplyDetail();
    syncComponentRow();
    commit.postComponents(def);
  };
  row.append(compBtn);
  syncComponentRow({ staged: true });
  sec.append(row);
  host.append(sec);
};
var componentRow = null;
var componentSel = null;
var componentBtn = null;
var syncComponentRow = (opts = {}) => {
  const row = componentRow;
  if (!row || !componentSel || !componentBtn) return;
  if (!opts.staged && !row.isConnected) return;
  const pending = componentState === "pending";
  componentBtn.textContent = pending ? "\u22EF Building\u2026" : "\u229E Build set";
  componentBtn.disabled = pending;
  componentSel.disabled = pending;
  row.querySelector(":scope > .bar-seed, :scope > .applystat")?.remove();
  if (componentState) row.prepend(renderApplyStatus(componentState, "components"));
};
var fileSetupRow = null;
var fileSetupBtn = null;
var syncFileSetupRow = (opts = {}) => {
  const row = fileSetupRow;
  if (!row || !fileSetupBtn) return;
  if (!opts.staged && !row.isConnected) return;
  const pending = fileSetupState === "pending";
  fileSetupBtn.textContent = pending ? "\u22EF Setting up\u2026" : `\u229E ${FILE_SETUP_LABEL}`;
  fileSetupBtn.disabled = pending;
  row.querySelector(":scope > .bar-seed, :scope > .applystat")?.remove();
  if (fileSetupState) row.prepend(renderApplyStatus(fileSetupState, "filesetup"));
};
var STYLE_GUIDE_LABEL = "Draw style guide";
var renderStyleGuidePage = (host) => {
  const [title, lede] = PAGE_COPY.styleGuide;
  host.append(hero(title, lede));
  setVolatile([], () => {
  });
  if (!commit.isFigma) return;
  const sec = palSection("Color tables", "Draws or updates one table per palette and one per role family.");
  const note = el("p", "cw-note");
  note.append(document.createTextNode("Needs the pages and cell components Set up file adds. A rerun updates each table in place."));
  sec.append(note);
  const det = hook(el("details", "contracts"), "style-guide-customize");
  const sum = el("summary", "contracts-sum");
  sum.append(el("span", "contracts-t", "Customize"), el("span", "contracts-hint", "value format \xB7 header \xB7 display style \xB7 columns"));
  det.append(sum);
  const pick = (key, opts, fallback) => {
    const s = selectEl();
    for (const [v, t] of opts) s.append(optionEl(v, t, (styleGuideOptions[key] ?? fallback) === v));
    s.onchange = () => {
      styleGuideOptions[key] = s.value;
    };
    return s;
  };
  det.append(
    hook(knob("Color value", pick("valueFormat", [["hex", "Hex"], ["rgba", "RGB-A"], ["hsl", "HSL"], ["hsb", "HSB"]], "hex"), "How each value cell prints the color. A translucent hex adds its alpha as a percentage."), "style-guide-value-format"),
    knob("Table header", pick("header", [["dark", "Dark"], ["light", "Light"]], "dark"), "The header row\u2019s fill."),
    hook(knob(
      "Display style",
      pick("display", [["auto", "From each token\u2019s role"], ["default", "Generic"], ["text", "Text color"], ["border", "Border color"], ["icon", "Icon color"], ["transparency", "Transparency"]], "auto"),
      "The specimen each row draws. By default a text role draws \u201CAa\u201D, a border role an outline, an icon role a diamond, and a translucent value a checkerboard."
    ), "style-guide-display"),
    knob("Aliases", toggleField(styleGuideOptions.aliases ?? true, (on) => {
      styleGuideOptions.aliases = on;
    }), "Show the primitive each value aliases, as a chip beside it."),
    knob("Description", toggleField(styleGuideOptions.description ?? true, (on) => {
      styleGuideOptions.description = on;
    }), "Add a column with each variable\u2019s description.")
  );
  sec.append(det);
  const row = hook(el("div", "fs-row"), "style-guide-row");
  styleGuideRow = row;
  const btn = hook(el("button", "barbtn"), "style-guide-draw");
  styleGuideBtn = btn;
  btn.title = "Draws the color tables from this file\u2019s variables. Safe to re-run \u2014 it updates tables in place.";
  btn.onclick = () => {
    styleGuideState = "pending";
    openDetail = null;
    renderBar();
    syncApplyDetail();
    syncStyleGuideRow();
    commit.postStyleGuide({ ...styleGuideOptions });
  };
  row.append(btn);
  syncStyleGuideRow({ staged: true });
  sec.append(row);
  host.append(sec);
};
var styleGuideRow = null;
var styleGuideBtn = null;
var syncStyleGuideRow = (opts = {}) => {
  const row = styleGuideRow;
  if (!row || !styleGuideBtn) return;
  if (!opts.staged && !row.isConnected) return;
  const pending = styleGuideState === "pending";
  styleGuideBtn.textContent = pending ? "\u22EF Drawing\u2026" : `\u25A6 ${STYLE_GUIDE_LABEL}`;
  styleGuideBtn.disabled = pending;
  row.querySelector(":scope > .bar-seed, :scope > .applystat")?.remove();
  if (styleGuideState) row.prepend(renderApplyStatus(styleGuideState, "styleguide"));
};
var KNOWN_WEIGHTS = {
  "Inter": [100, 200, 300, 400, 500, 600, 700, 800, 900],
  "Roboto": [100, 300, 400, 500, 700, 900],
  "Roboto Mono": [100, 200, 300, 400, 500, 600, 700],
  "Clash Display": [200, 300, 400, 500, 600, 700],
  "JetBrains Mono": [100, 200, 300, 400, 500, 600, 700, 800],
  "Helvetica": [400, 700],
  "Helvetica Neue": [400, 700],
  "Arial": [400, 700],
  "Georgia": [400, 700],
  "Times New Roman": [400, 700],
  "Space Grotesk": [300, 400, 500, 600, 700],
  "DM Sans": [400, 500, 700],
  "DM Mono": [300, 400, 500],
  "IBM Plex Sans": [100, 200, 300, 400, 500, 600, 700],
  "IBM Plex Mono": [100, 200, 300, 400, 500, 600, 700],
  "Work Sans": [100, 200, 300, 400, 500, 600, 700, 800, 900],
  "Manrope": [200, 300, 400, 500, 600, 700, 800],
  "Poppins": [100, 200, 300, 400, 500, 600, 700, 800, 900],
  "Montserrat": [100, 200, 300, 400, 500, 600, 700, 800, 900],
  "Lato": [100, 300, 400, 700, 900],
  "Open Sans": [300, 400, 500, 600, 700, 800],
  "Nunito": [200, 300, 400, 500, 600, 700, 800, 900],
  "Source Sans 3": [200, 300, 400, 500, 600, 700, 800, 900],
  "Source Serif 4": [200, 300, 400, 500, 600, 700, 800, 900]
};
var KNOWN_WEIGHTS_LC = Object.fromEntries(Object.entries(KNOWN_WEIGHTS).map(([k, v]) => [k.toLowerCase(), v]));
var knownWeightsOf = (fontName) => fontName ? KNOWN_WEIGHTS_LC[fontName.trim().toLowerCase()] ?? null : null;
var _fontProbe;
var fontAvailable = (name) => {
  if (!name) return false;
  if (_fontProbe === void 0) _fontProbe = document.createElement("canvas").getContext("2d");
  const ctx = _fontProbe;
  if (!ctx) return false;
  const probe = "mmmmmmmmmmlliWWWWWWjgq";
  return ["monospace", "sans-serif", "serif"].some((base) => {
    ctx.font = `72px ${base}`;
    const w0 = ctx.measureText(probe).width;
    ctx.font = `72px "${name}", ${base}`;
    return Math.abs(ctx.measureText(probe).width - w0) > 0.5;
  });
};
var faceStatus = (name) => {
  const rendersHere = fontAvailable(name);
  if (!hostFonts.length) {
    return {
      ok: rendersHere,
      label: rendersHere ? "\u2713 Installed" : "\u26A0 Not installed",
      title: rendersHere ? `${name} resolves on this device` : `${name} is not installed here \u2014 the preview falls back`,
      fallbackPreview: !rendersHere
    };
  }
  const styles = hostFontStyles.get(name);
  if (styles === void 0) {
    return {
      ok: false,
      label: "\u26A0 Figma lacks it",
      title: `This Figma cannot load "${name}", so every text style asking for it will be skipped. Spelling is exact \u2014 case and spaces included.`,
      fallbackPreview: true
    };
  }
  const label = styles > 0 ? `\u2713 ${styles.toLocaleString("en-US")} ${styles === 1 ? "style" : "styles"}` : "\u2713 Figma has it";
  return {
    ok: true,
    label,
    title: styles > 0 ? `Figma can load ${name} (${styles.toLocaleString("en-US")} styles). That settles the family \u2014 a text style still skips if the family lacks the specific weight it asks for.` : `Figma can load ${name}.`,
    fallbackPreview: !rendersHere
  };
};
var WEIGHT_NAME = {
  100: "Thin",
  200: "Extra Light",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "Semi Bold",
  700: "Bold",
  800: "Extra Bold",
  900: "Black"
};
var renderTypefaceLibrary = () => {
  const ty = theme.typography;
  const sec = palSection("Typefaces", "The faces this brand has, independent of what any of them does. A lone name auto-pads a system fallback stack; supply a full stack yourself and it is trusted verbatim. This is the only primitive on this tab you can edit.");
  const boundFace = (cat) => ty.families.find((f) => f.group === cat)?.stack[0] ?? "";
  sec.append(subHead("The library \u2014 one primitive per face"));
  const bindingOf = (name) => {
    const here = TYPE_GROUP_ORDER.filter((cat) => boundFace(cat) === name);
    if (here.length === TYPE_GROUP_ORDER.length) return { label: "Every category", unbound: false };
    if (here.length) return { label: here.join(" + "), unbound: false };
    const inModes = rp.modes.filter((m) => (ty.familiesByMode?.[m] ?? []).some((f) => f.stack[0] === name)).map((m) => MODE_LABEL[m] ?? m);
    if (inModes.length) return { label: `Only in ${inModes.join(", ")}`, unbound: false };
    if (ty.families.some((f) => f.stack[0] === name)) return { label: "A category", unbound: false };
    return { label: "Not bound \u2014 staged", unbound: true };
  };
  const library = () => getPath2(brandState, "typography.typefaceLibrary") ?? [];
  const inLibrary = (name) => library().some((n) => typefaceSlug(n) === typefaceSlug(name));
  const libBox = el("div", "mtbl");
  const libScroll = el("div", "mtbl-scroll");
  const libTbl = el("table", mix("mtbl-tbl", "tf-libtbl"));
  const libHead = el("thead"), libHtr = el("tr");
  libHtr.append(
    el("th", "mtbl-stick", "Face"),
    el("th", "mtbl-mode", hostFonts.length ? "In this Figma" : "On this device"),
    el("th", "mtbl-mode", "Used by"),
    el("th", "mtbl-fill mtbl-spec", "Specimen")
  );
  libHead.append(libHtr);
  libTbl.append(libHead);
  const libBody = el("tbody");
  let anyUnbound = false;
  for (const tf of ty.typefaces) {
    const bind = bindingOf(tf.name);
    anyUnbound = anyUnbound || bind.unbound;
    const tr = el("tr");
    const nc = el("td", "mtbl-stick");
    const nm = el("span", "tf-libname", tf.name);
    nm.title = tf.name;
    nc.append(nm);
    if (tf.variable) nc.append(el("span", "tf-vf", "Variable"));
    const pathWrap = el("span", "tf-libpath");
    pathWrap.append(tokenPill(`font.typeface.${tf.slug}`));
    nc.append(pathWrap);
    tr.append(nc);
    const st = faceStatus(tf.name);
    const sc = el("td", "mtbl-mode");
    sc.append(el("span", "tf-stat " + (st.ok ? "ok" : "no"), st.label));
    sc.title = st.title;
    tr.append(sc);
    const bc = el("td", "mtbl-mode");
    bc.append(el("span", "tf-usedby" + (bind.unbound ? " unbound" : ""), bind.label));
    if (!bind.unbound && inLibrary(tf.name))
      bc.title = `In the library and bound \u2014 re-point ${bind.label} to something else to make this removable.`;
    tr.append(bc);
    const pc = el("td", "mtbl-fill mtbl-spec");
    const prev = el("span", mix("mtbl-spec-t", "tf-prev"), "Ag 123");
    prev.style.fontFamily = `"${tf.name}", ${tf.slug.includes("mono") ? "monospace" : "sans-serif"}`;
    pc.append(prev);
    if (st.fallbackPreview && st.ok) {
      const fb = el("span", "tf-fbnote", "(fallback shown)");
      fb.title = `${tf.name} loads in Figma but is not installed on this device, so this specimen shows the fallback. The written text styles use the real face.`;
      pc.append(fb);
    }
    if (bind.unbound) {
      const rm = el("button", "tf-rm", "\xD7");
      rm.title = `Remove ${tf.name} from the library`;
      rm.setAttribute("aria-label", `Remove ${tf.name} from the library`);
      rm.onclick = () => {
        setPath2(brandState, "typography.typefaceLibrary", library().filter((n) => typefaceSlug(n) !== tf.slug));
        applyFull();
      };
      pc.append(rm);
    }
    pc.append(el(
      "span",
      "tf-fall",
      tf.stack.length > 1 ? `Falls back to ${tf.stack.slice(1).join(", ")}` : "No fallback stack"
    ));
    tr.append(pc);
    libBody.append(tr);
  }
  libTbl.append(libBody);
  libScroll.append(libTbl);
  libBox.append(libScroll);
  sec.append(libBox);
  const addRow = el("div", "tf-add");
  const addIn = el("input", "tf-in tf-addin");
  addIn.type = "text";
  addIn.spellcheck = false;
  addIn.placeholder = "Font family name";
  addIn.setAttribute("aria-label", "Add a face to the library");
  let addWrap = null;
  let comboKey = null;
  if (hostFonts.length) {
    addWrap = el("div", "tf-combo");
    const list = el("div", "tf-cbolist");
    list.id = "tf-font-list";
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", "Font families this Figma can load");
    list.hidden = true;
    addIn.setAttribute("role", "combobox");
    addIn.setAttribute("aria-controls", list.id);
    addIn.setAttribute("aria-autocomplete", "list");
    addIn.setAttribute("aria-expanded", "false");
    addIn.autocomplete = "off";
    let shown = [];
    let active = -1;
    const optId = (i) => `tf-font-o${i}`;
    const setActive = (i) => {
      const rows = Array.from(list.children);
      if (active >= 0 && rows[active]) {
        rows[active].classList.remove("on");
        rows[active].setAttribute("aria-selected", "false");
      }
      active = i;
      if (i < 0) {
        addIn.removeAttribute("aria-activedescendant");
        return;
      }
      const row = rows[i];
      if (!row) return;
      row.classList.add("on");
      row.setAttribute("aria-selected", "true");
      addIn.setAttribute("aria-activedescendant", optId(i));
      row.scrollIntoView({ block: "nearest" });
    };
    const close = () => {
      list.hidden = true;
      addIn.setAttribute("aria-expanded", "false");
      setActive(-1);
    };
    const open = () => {
      if (!shown.length) {
        close();
        return;
      }
      list.hidden = false;
      addIn.setAttribute("aria-expanded", "true");
      list.scrollIntoView({ block: "nearest" });
    };
    const paint = (q) => {
      const needle = q.trim().toLowerCase();
      const pre = [], mid = [];
      for (const f of hostFonts) {
        if (!needle) {
          pre.push(f);
          continue;
        }
        const at2 = f.toLowerCase().indexOf(needle);
        if (at2 === 0) pre.push(f);
        else if (at2 > 0) mid.push(f);
      }
      shown = pre.concat(mid);
      list.textContent = "";
      shown.forEach((f, i) => {
        const row = el("div", "tf-cbo", f);
        row.id = optId(i);
        row.setAttribute("role", "option");
        row.setAttribute("aria-selected", "false");
        row.onmousedown = (e) => {
          e.preventDefault();
          addIn.value = f;
          close();
          addIn.focus();
        };
        list.append(row);
      });
      setActive(-1);
    };
    paint("");
    addIn.oninput = () => {
      paint(addIn.value);
      open();
    };
    addIn.onfocus = () => {
      paint(addIn.value);
      open();
    };
    addIn.onblur = () => {
      close();
    };
    comboKey = (e) => {
      const open_ = !list.hidden;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!open_) {
          paint(addIn.value);
          open();
          if (shown.length) setActive(0);
          return true;
        }
        if (!shown.length) return true;
        const next = e.key === "ArrowDown" ? (active + 1) % shown.length : active <= 0 ? shown.length - 1 : active - 1;
        setActive(next);
        return true;
      }
      if (e.key === "Escape") {
        if (!open_) return false;
        close();
        return true;
      }
      if (e.key === "Enter" && open_ && active >= 0 && shown[active]) {
        addIn.value = shown[active];
        close();
        return true;
      }
      if (e.key === "Tab" && open_) {
        close();
        return false;
      }
      return false;
    };
    addWrap.append(addIn, list);
  }
  const addBtn = el("button", "tf-addbtn", "Add face");
  const addErr = el("p", "tf-adderr");
  addErr.hidden = true;
  const submit = () => {
    const name = addIn.value.trim();
    addErr.hidden = true;
    if (!name) {
      addErr.textContent = "Give the face a name.";
      addErr.hidden = false;
      addIn.focus();
      return;
    }
    const slug2 = typefaceSlug(name);
    const clash = ty.typefaces.find((t) => t.slug === slug2);
    if (clash) {
      addErr.textContent = inLibrary(clash.name) ? `${clash.name} is already in the library.` : `${clash.name} is already here \u2014 a category binds it, so it is in the library list already.`;
      addErr.hidden = false;
      addIn.focus();
      return;
    }
    setPath2(brandState, "typography.typefaceLibrary", [...library(), name]);
    applyFull();
  };
  addBtn.onclick = submit;
  addIn.onkeydown = (e) => {
    const ev = e;
    if (comboKey && comboKey(ev)) {
      ev.preventDefault();
      return;
    }
    if (ev.key === "Enter") {
      ev.preventDefault();
      submit();
    }
  };
  addRow.append(addWrap ?? addIn, addBtn);
  sec.append(addRow, addErr);
  const spell = el("p", "tf-note");
  spell.innerHTML = hostFonts.length ? "<b>Pick from the list, or type any name.</b> The field suggests the " + hostFonts.length.toLocaleString("en-US") + " font families this Figma can load, so a name chosen from it is spelled the way Figma spells it. That settles the family, not every weight: a text style still skips if the family lacks the specific weight it asks for. Typing a name that is not listed also works \u2014 a brand can specify a font this machine does not have \u2014 but nothing it needs will load here." : "<b>Exact spelling matters.</b> The name passes through to CSS and Figma untouched \u2014 there is no validation or auto-correct, so a near-miss silently falls back. Find the exact name in <b>macOS</b> Font Book, <b>Windows</b> Settings \u2192 Personalization \u2192 Fonts, or the foundry / Google Fonts specimen page.";
  sec.append(spell);
  sec.append(el("p", "tf-derivenote", anyUnbound ? "This list is a union: a face appears because a category on Semantics binds it, or because the brand input stages it in typography.typefaceLibrary. A staged face can sit here bound to nothing until you give it a job. Slugs come from the face name, so there is no rename to cascade." : "Every face here is bound by a category on Semantics \u2014 add a name and its primitive appears here, ready to bind. A brand can also stage a face with no category in typography.typefaceLibrary, in which case it sits here unbound until you give it a job. Slugs come from the face name, so there is no rename to cascade."));
  return sec;
};
var renderTypefaceBindings = () => {
  const ty = theme.typography;
  const modes = rp.modes;
  const multi = modes.length > 1;
  const sec = palSection("Typefaces", "Which face each category draws from. The font.family token for a category is what your codebase binds \u2014 swapping the face behind it leaves every reference intact, which is why a text style never names a face directly.");
  const baseFace = (cat) => ty.families.find((f) => f.group === cat)?.stack[0] ?? "";
  const isUnbound = (cat) => cat === "code" && getPath2(brandState, "typography.families.code") === null;
  const bulk = el("div", "tf-bulk");
  const bulkSel = selectEl("sm");
  bulkSel.append(optionEl("", "Choose a face\u2026", true));
  for (const t of ty.typefaces) bulkSel.append(optionEl(t.name, t.name, false));
  const bulkBtn = el("button", "tf-addbtn", "Apply to all");
  const BULK_CATS = TYPE_GROUP_ORDER.filter((g) => g !== "code");
  bulkBtn.onclick = () => {
    if (!bulkSel.value) return;
    for (const g of BULK_CATS) setPath2(brandState, `typography.families.${g}`, bulkSel.value);
    applyFull();
  };
  bulk.append(el("span", "tf-bulklab", `Set every text category to`), bulkSel, bulkBtn);
  sec.append(bulk, el("p", "tf-derivenote", "Code keeps whatever face it has \u2014 a monospace choice is a different decision, so it is set on its own row below."));
  const box = el("div", "mtbl");
  const scroll = el("div", "mtbl-scroll");
  const tbl = el("table", "mtbl-tbl");
  const thead = el("thead"), htr = el("tr");
  htr.append(el("th", "mtbl-stick", "Category"));
  if (multi) {
    for (const m of modes) {
      const th = el("th", "mtbl-mode");
      th.append(document.createTextNode(MODE_LABEL[m] ?? m));
      if (m === "light") th.append(el("span", "mtbl-ro", " baseline"));
      else if (!modeIsEditable(m)) th.append(el("span", "mtbl-ro", " auto"));
      htr.append(th);
    }
  } else {
    htr.append(el("th", "mtbl-mode", "Face"));
  }
  htr.append(el("th", "mtbl-fill mtbl-spec", "Specimen"));
  thead.append(htr);
  tbl.append(thead);
  const tb = el("tbody");
  for (const cat of TYPE_GROUP_ORDER) {
    const base = baseFace(cat);
    const unbound = isUnbound(cat);
    const tr = el("tr");
    const nc = el("td", "mtbl-stick");
    nc.append(el("span", "mtbl-name mono", cat));
    nc.append(el("div", "cs-count", TYPE_GROUP_BLURB[cat] ?? ""));
    tr.append(nc);
    const NONE = "__none__";
    for (const m of multi ? modes : ["light"]) {
      const td = el("td", "mtbl-mode");
      if (unbound && m !== "light") {
        td.append(el("span", "cs-count", "\u2014"));
        tr.append(td);
        continue;
      }
      if (m === "light") {
        const sel = selectEl("sm fill");
        const opts = ty.typefaces.map((t) => [t.name, t.name]);
        if (!opts.some(([v]) => v === base) && base) opts.push([base, base]);
        if (cat === "code") opts.push([NONE, "None \u2014 no code styles"]);
        for (const [v, label] of opts) sel.append(optionEl(v, label, v === (unbound ? NONE : base)));
        sel.title = base || "";
        sel.onchange = () => {
          if (sel.value === NONE) {
            setPath2(brandState, "typography.families.code", null);
            applyFull();
            return;
          }
          if (!sel.value) return;
          setPath2(brandState, `typography.families.${cat}`, sel.value);
          applyFull();
        };
        td.append(sel);
      } else if (!modeIsEditable(m)) {
        const self = el("span", "mtbl-selfval mono", base || "\u2014");
        self.title = `${MODE_LABEL[m] ?? m} is auto-derived from Light and Dark \u2014 it takes the baseline face and accepts no per-mode override. Turn the mode off in the brand menu\u2019s \u201CModes\u201D section if you don't want it generated.`;
        td.append(self);
      } else {
        const ovRaw = getModeLever(m, `families.${cat}`);
        const ovStr = Array.isArray(ovRaw) ? ovRaw[0] : ovRaw;
        const ovName = ovStr && ovStr !== base ? ovStr : void 0;
        const sel = selectEl(ovName ? "sm fill set" : "sm fill");
        sel.append(optionEl("", `Auto \u2014 ${base}`, !ovName));
        for (const t of ty.typefaces) {
          if (t.name === base) continue;
          sel.append(optionEl(t.name, t.name, ovName === t.name));
        }
        if (ovName && !ty.typefaces.some((t) => t.name === ovName)) sel.append(optionEl(ovName, ovName, true));
        sel.title = ovName ? `${MODE_LABEL[m] ?? m} overrides ${cat} to ${ovName}` : `${cat} follows the baseline (${base}) in ${MODE_LABEL[m] ?? m}`;
        sel.onchange = () => {
          setModeLever(m, `families.${cat}`, sel.value || void 0);
          applyFull();
        };
        td.append(sel);
      }
      tr.append(td);
    }
    const pc = el("td", "mtbl-fill mtbl-spec");
    if (unbound) {
      pc.append(el("span", "tf-unbound", "No code face \u2014 the code category is not generated."));
    } else {
      const prev = el("span", mix("mtbl-spec-t", "tf-prev"), "The quick brown fox jumps");
      prev.style.fontFamily = base ? `"${base}", ${cat === "code" ? "monospace" : "sans-serif"}` : "inherit";
      pc.append(prev);
    }
    pc.append(tokenPill(`font.family.${cat}`));
    tr.append(pc);
    tb.append(tr);
  }
  tbl.append(tb);
  scroll.append(tbl);
  box.append(scroll);
  sec.append(box);
  const local = el("p", "tf-note warn");
  local.innerHTML = hostFonts.length ? "<b>Previews in this table use fonts installed on this device; Figma loads more than that.</b> Figma\u2019s list mixes your installed fonts with its own cloud fonts, and this panel loads no webfonts \u2014 so a face Figma will happily write can still preview as the fallback here. The <b>In this Figma</b> column on <b>Primitives</b> reports what Figma can load, which is the fact that decides whether a text style applies. Your emitted tokens are unaffected; they carry the name you typed." : "<b>Preview reflects only fonts installed on this device.</b> The dashboard loads no webfonts, so a correctly-spelled family you don\u2019t have installed still previews as the fallback. The <b>Typefaces</b> table on <b>Primitives</b> flags which faces resolve here. Your emitted tokens are unaffected; they carry the name you typed.";
  sec.append(local);
  return sec;
};
var renderSizeLadder = () => {
  const ty = theme.typography;
  const sec = palSection("The size ladder", "Fixed and brand-invariant \u2014 22 rem steps, the raw material every heading size is chosen from. Which rungs the categories land on is set by Shape and Range, on Text styles.");
  sec.append(subHead("The ladder \u2014 largest first"));
  const used = new Set(ty.composites.map((c) => c.sizePx));
  const minUsed = new Set(ty.composites.map((c) => c.sizeMinPx));
  const displayStack = ty.families.find((f) => f.group === "display")?.stack.join(", ") ?? "inherit";
  const box = el("div", "mtbl");
  const scroll = el("div", mix("mtbl-scroll", "sl-tall"));
  const tbl = el("table", "mtbl-tbl");
  const thead = el("thead"), htr = el("tr");
  htr.append(
    el("th", "mtbl-stick", "Step"),
    el("th", "mtbl-mode", "rem"),
    el("th", "mtbl-mode", "Used by"),
    el("th", "mtbl-fill mtbl-spec", "Specimen")
  );
  thead.append(htr);
  tbl.append(thead);
  const tb = el("tbody");
  let firstBound = null;
  for (const px of [...ty.sizesPx].reverse()) {
    const inUse = used.has(px);
    const tr = el("tr");
    const nc = el("td", "mtbl-stick");
    nc.append(el("span", "mtbl-name mono", `${px}px`));
    tr.append(nc);
    const rc = el("td", "mtbl-mode");
    rc.append(el("span", "mtbl-selfval mono", `${+(px / 16).toFixed(4)}rem`));
    tr.append(rc);
    const who = [...new Set(ty.composites.filter((c) => c.sizePx === px).map((c) => c.group))];
    const wc = el("td", "mtbl-mode");
    wc.append(el(
      "span",
      "ltbl-who" + (inUse ? "" : " none"),
      inUse ? who.join(", ") : minUsed.has(px) ? "fluid floor only" : "not bound"
    ));
    tr.append(wc);
    const pc = el("td", "mtbl-fill mtbl-spec");
    const samp = el("div", "sl-samp", "Ag");
    samp.style.fontSize = `${px}px`;
    samp.style.fontFamily = displayStack;
    pc.append(samp);
    tr.append(pc);
    if (inUse && !firstBound) firstBound = tr;
    tb.append(tr);
  }
  tbl.append(tb);
  scroll.append(tbl);
  box.append(scroll);
  sec.append(box);
  requestAnimationFrame(() => {
    if (firstBound) scroll.scrollTop = Math.max(0, firstBound.offsetTop - 4);
  });
  return sec;
};
var renderRungLadders = () => {
  const ty = theme.typography;
  const sec = palSection("Leading & tracking ladders", "The steps every leading and tracking rung is chosen from. Fixed and brand-invariant, like the size ladder \u2014 the gaps are deliberate, so a value between two steps is not a value this system emits. Binding a rung to one of these is on Semantics.");
  const ladderTable = (caption, ladder, fmt, boundBy, preview) => {
    const box = el("div", "mtbl");
    box.append(el("p", "mtbl-cap", caption));
    const scroll = el("div", "mtbl-scroll");
    const tbl = el("table", "mtbl-tbl");
    const thead = el("thead");
    const htr = el("tr");
    htr.append(
      el("th", "mtbl-stick", "Step"),
      el("th", "mtbl-mode", "Used by"),
      el("th", "mtbl-mode", ""),
      el("th", "mtbl-fill mtbl-spec", "Specimen")
    );
    thead.append(htr);
    tbl.append(thead);
    const tb = el("tbody");
    for (const v of ladder) {
      const who = boundBy(v);
      const tr = el("tr");
      const nc = el("td", "mtbl-stick");
      nc.append(el("span", "mtbl-name mono", fmt(v)));
      tr.append(nc);
      const wc = el("td", "mtbl-mode");
      wc.append(el("span", "ltbl-who" + (who.length ? "" : " none"), who.length ? who.join(", ") : "not bound"));
      tr.append(wc);
      tr.append(el("td", "mtbl-mode"));
      const pc = el("td", "mtbl-fill mtbl-spec");
      const pv = el("div", "ltbl-samp");
      preview(pv, v);
      pc.append(pv);
      tr.append(pc);
      tb.append(tr);
    }
    tbl.append(tb);
    scroll.append(tbl);
    box.append(scroll);
    sec.append(box);
  };
  ladderTable(
    "Line height",
    LINE_HEIGHT_LADDER,
    (v) => `${v.toFixed(2)}\xD7`,
    (v) => ty.lineHeights.filter((l) => Math.abs(l.value - v) < 1e-9).map((l) => l.key),
    (host, v) => {
      host.textContent = "Typography is the craft of endowing human language with a durable visual form.";
      host.style.lineHeight = String(v);
    }
  );
  ladderTable(
    "Letter spacing",
    LETTER_SPACING_LADDER,
    (v) => `${v}em \xB7 ${emToPercentLabel(v)}`,
    (v) => ty.letterSpacings.filter((l) => Math.abs(l.em - v) < 1e-9).map((l) => l.key),
    (host, v) => {
      host.textContent = "Typography & tracking";
      host.style.letterSpacing = `${v}em`;
      host.style.fontSize = "16px";
    }
  );
  return sec;
};
var renderLeadingTracking = () => {
  const ty = theme.typography;
  const sec = palSection("Leading & tracking rungs", "Each named rung binds one step of the fixed ladders on Primitives. Re-point a rung here and every style using it reflows \u2014 one binding each, shared by every mode unless a mode re-points it below. Which rung a category lands on is chosen for you from its size and role, and nudged per category on Text styles.");
  const ramp = (caption, steps, globalKey, modeField, ladder, fmt, preview) => {
    const box = el("div", "mtbl");
    box.append(el("p", "mtbl-cap", caption));
    const scroll = el("div", "mtbl-scroll");
    const tbl = el("table", "mtbl-tbl");
    const thead = el("thead"), htr = el("tr");
    htr.append(
      el("th", "mtbl-stick", "Rung"),
      el("th", "mtbl-mode", "Value"),
      el("th", "mtbl-mode", "Used by"),
      el("th", "mtbl-fill mtbl-spec", "Specimen")
    );
    thead.append(htr);
    tbl.append(thead);
    const tb = el("tbody");
    steps.forEach((s, idx) => {
      const tr = el("tr");
      const nc = el("td", "mtbl-stick");
      nc.append(el("span", "mtbl-name mono", s.key));
      tr.append(nc);
      const vc = el("td", "mtbl-mode");
      const sel = selectEl(mix("sm", "ltbl-sel"));
      sel.setAttribute("aria-label", `${caption} ${s.key}`);
      const lo = idx > 0 ? steps[idx - 1].val : -Infinity;
      const hi = idx < steps.length - 1 ? steps[idx + 1].val : Infinity;
      for (const v of ladder) {
        const o = optionEl(String(v), fmt(v), Math.abs(v - s.val) < 1e-9);
        if (v < lo - 1e-9 || v > hi + 1e-9) {
          o.disabled = true;
          o.title = `Would cross ${v < lo ? steps[idx - 1].key : steps[idx + 1].key} \u2014 the rung names are a relative-emphasis ramp, so they stay in order`;
        }
        sel.append(o);
      }
      sel.onchange = () => {
        setPath2(brandState, `${globalKey}.${s.key}`, Number(sel.value));
        applyFull();
      };
      vc.append(sel);
      tr.append(vc);
      const who = [...new Set(ty.composites.filter((c) => (modeField === "lineHeights" ? c.lineHeight : c.tracking) === s.key).map((c) => c.group))];
      const wc = el("td", "mtbl-mode");
      wc.append(el("span", "ltbl-who" + (who.length ? "" : " none"), who.length ? who.join(", ") : "not currently used"));
      if (who.length) wc.title = who.join(", ");
      tr.append(wc);
      const pc = el("td", "mtbl-fill mtbl-spec");
      const pv = el("div", "ltbl-samp");
      preview(pv, s.val);
      pc.append(pv);
      tr.append(pc);
      tb.append(tr);
    });
    tbl.append(tb);
    scroll.append(tbl);
    box.append(scroll);
    sec.append(box);
  };
  ramp(
    "Line height",
    ty.lineHeights.map((l) => ({ key: l.key, val: l.value })),
    "typography.lineHeights",
    "lineHeights",
    LINE_HEIGHT_LADDER,
    (v) => `${v.toFixed(2)}\xD7`,
    (host, v) => {
      host.textContent = "Typography is the craft of endowing human language with a durable visual form.";
      host.style.lineHeight = String(v);
    }
  );
  ramp(
    "Letter spacing",
    ty.letterSpacings.map((l) => ({ key: l.key, val: l.em })),
    "typography.letterSpacings",
    "letterSpacings",
    LETTER_SPACING_LADDER,
    (v) => `${v}em \xB7 ${emToPercentLabel(v)}`,
    (host, v) => {
      host.textContent = "Typography & tracking";
      host.style.letterSpacing = `${v}em`;
      host.style.fontSize = "16px";
    }
  );
  return sec;
};
var stepCell = (o) => {
  const wrap = el("div", "mcell");
  const mk = (glyph, dir, enabled) => {
    const b = el("button", "mstep", glyph);
    b.disabled = !enabled;
    const to = o.step(dir);
    b.title = enabled && to !== void 0 ? `${o.px} \u2192 ${to}` : dir < 0 ? "Already at the lowest available" : "Already at the highest available";
    b.setAttribute("aria-label", `${o.label} ${dir < 0 ? "down" : "up"}`);
    b.onclick = () => o.write(o.step(dir));
    return b;
  };
  const val = el("span", "mval mono" + (o.pinned ? " pin" : ""), String(o.px));
  val.title = o.title ? o.title(o.px) : o.pinned ? "Set here" : "Following the baseline";
  wrap.append(mk("\u2212", -1, o.canDown), val, mk("+", 1, o.canUp));
  if (o.pinned) {
    const r = el("button", "mreset", "\u21BA");
    r.title = "Follow the baseline again";
    r.setAttribute("aria-label", `Reset ${o.label}`);
    r.onclick = () => o.write(void 0);
    wrap.append(r);
  } else wrap.append(el("span", "mreset-sp"));
  return wrap;
};
var WEIGHT_STEPS = [100, 200, 300, 400, 500, 600, 700, 800, 900];
var renderWeightTable = () => {
  const ty = theme.typography;
  const modes = rp.modes;
  const textStack = ty.families.find((f) => f.group === "body")?.stack.join(", ") ?? "inherit";
  const box = el("div", "mtbl");
  box.append(el("p", "mtbl-cap", "Weight roles"));
  const scroll = el("div", "mtbl-scroll");
  const tbl = el("table", "mtbl-tbl");
  const thead = el("thead"), htr = el("tr");
  htr.append(el("th", "mtbl-stick", "Role"));
  for (const m of modes) {
    const th = el("th", "mtbl-mode");
    th.append(document.createTextNode(MODE_LABEL[m] ?? m));
    if (m === "light") th.append(el("span", "mtbl-ro", " baseline"));
    else if (!modeIsEditable(m)) th.append(el("span", "mtbl-ro", " auto"));
    htr.append(th);
  }
  htr.append(el("th", "mtbl-fill"));
  thead.append(htr);
  tbl.append(thead);
  const tb = el("tbody");
  for (const w of ty.weightRoles) {
    const tr = el("tr");
    const nameCell = el("td", "mtbl-stick");
    nameCell.append(el("span", "mtbl-name mono", w.role));
    tr.append(nameCell);
    for (const m of modes) {
      const isBase = m === "light";
      const override = isBase ? getPath2(brandState, `typography.weightRoles.${w.role}`) : getModeLever(m, `weights.${w.role}`);
      const value = override ?? (ty.weightRolesByMode?.[m]?.find((x) => x.role === w.role)?.value ?? w.value);
      const spec = () => {
        const samp = el("span", mix("mtbl-spec-t", "tpw-samp", "wt-spec"), "Ag 123");
        samp.style.fontWeight = String(value);
        samp.style.fontFamily = textStack;
        return samp;
      };
      if (!isBase && !modeIsEditable(m)) {
        const td2 = el("td", "mtbl-mode");
        const self = el("span", "mtbl-selfval mono", String(value));
        self.title = `${MODE_LABEL[m] ?? m} is auto-derived from Light and Dark \u2014 it resolves to ${value} and accepts no per-mode override.`;
        td2.append(self, spec());
        tr.append(td2);
        continue;
      }
      const idx = WEIGHT_STEPS.indexOf(value);
      const step = (dir) => idx >= 0 ? WEIGHT_STEPS[idx + dir] : void 0;
      const td = el("td", "mtbl-mode");
      td.append(stepCell({
        px: value,
        // Ends of the scale only. Roles may cross each other — the engine allows it and the warning
        // below says so — so a neighbor bound here would be a rule the system does not actually have.
        canDown: step(-1) !== void 0,
        canUp: step(1) !== void 0,
        pinned: override !== void 0,
        label: `${w.role} weight${isBase ? "" : ` in ${m}`}`,
        title: (v) => `${v} \u2014 ${WEIGHT_NAME[v] ?? ""}`.trim(),
        step,
        write: (v) => {
          if (isBase) setPath2(brandState, `typography.weightRoles.${w.role}`, v);
          else setModeLever(m, `weights.${w.role}`, v);
          applyFull();
        }
      }), spec());
      tr.append(td);
    }
    tr.append(el("td", "mtbl-fill"));
    tb.append(tr);
  }
  tbl.append(tb);
  scroll.append(tbl);
  box.append(scroll);
  return box;
};
var renderWeightRoles = () => {
  const ty = theme.typography;
  const sec = palSection("Weight roles", "Each role maps to one CSS numeric, shared by every category \u2014 a relative-emphasis ladder from subtle to max. Per category you choose which roles ship, not what they weigh.");
  sec.append(renderWeightTable());
  const eff = ty.weightRoles.map((w) => w.value);
  if (eff.some((v, i) => i > 0 && v < eff[i - 1]))
    sec.append(hook(el("p", "te-order-warn", "\u26A0 A heavier role now resolves lighter than one below it \u2014 the names read as relative emphasis (subtle \u2192 strong), so keeping them in order stays honest. A warning, not a block."), "order-warning"));
  return sec;
};
var renderRepointTable = (caption, steps, fmt, modeField, options, rowLabel = "Rung", setBaseline) => {
  const opts = options ?? steps;
  const modes = rp.modes;
  const box = el("div", "mtbl");
  box.append(el("p", "mtbl-cap", caption));
  const scroll = el("div", "mtbl-scroll");
  const tbl = el("table", "mtbl-tbl");
  const thead = el("thead"), htr = el("tr");
  htr.append(el("th", "mtbl-stick", rowLabel));
  for (const m of modes) {
    const th = el("th", "mtbl-mode");
    th.append(document.createTextNode(MODE_LABEL[m] ?? m));
    if (m === "light") th.append(el("span", "mtbl-ro", " baseline"));
    else if (!modeIsEditable(m)) th.append(el("span", "mtbl-ro", " auto"));
    htr.append(th);
  }
  htr.append(el("th", "mtbl-fill"));
  thead.append(htr);
  tbl.append(thead);
  const tb = el("tbody");
  for (const s of steps) {
    const tr = el("tr");
    const nameCell = el("td", "mtbl-stick");
    nameCell.append(el("span", "mtbl-name mono", s.key));
    tr.append(nameCell);
    for (const m of modes) {
      const td = el("td", "mtbl-mode");
      if (m === "light" && setBaseline) {
        const sel = selectEl("sm");
        for (const t of opts) sel.append(optionEl(t.key, t.key, (s.base ?? s.key) === t.key));
        sel.setAttribute("aria-label", `${s.key} baseline`);
        sel.onchange = () => {
          setBaseline(s.key, sel.value);
          applyFull();
        };
        td.append(sel);
        const worth = opts.find((t) => t.key === (s.base ?? s.key));
        if (worth) td.append(el("span", "mtbl-worth mono", fmt(worth.val)));
      } else if (m === "light") {
        const self = el("span", "mtbl-selfval mono", fmt(s.val));
        self.title = `The baseline. Change which ladder step ${s.key} binds in the table above \u2014 it is one binding, shared by every mode.`;
        td.append(self);
      } else if (!modeIsEditable(m)) {
        const self = el("span", "mtbl-selfval mono", fmt(s.val));
        self.title = `${MODE_LABEL[m] ?? m} is auto-derived from Light and Dark \u2014 it keeps the ${s.key} rung and accepts no per-mode re-point.`;
        td.append(self);
      } else {
        const ov = getModeLever(m, `${modeField}.${s.key}`);
        const sel = selectEl(ov ? "sm set" : "sm");
        sel.append(optionEl("", "Auto", !ov));
        for (const t of opts) {
          if (t.key === (s.base ?? s.key)) continue;
          sel.append(optionEl(t.key, t.key, ov === t.key));
        }
        sel.setAttribute("aria-label", `${s.key} in ${MODE_LABEL[m] ?? m}`);
        sel.onchange = () => {
          setModeLever(m, `${modeField}.${s.key}`, sel.value || void 0);
          applyFull();
        };
        td.append(sel);
        const worth = opts.find((t) => t.key === (ov ?? s.base ?? s.key));
        if (worth) td.append(el("span", "mtbl-worth mono" + (ov ? " set" : ""), fmt(worth.val)));
      }
      tr.append(td);
    }
    tr.append(el("td", "mtbl-fill"));
    tb.append(tr);
  }
  tbl.append(tb);
  scroll.append(tbl);
  box.append(scroll);
  return box;
};
var renderRepoints = () => {
  if (rp.modes.length < 2) return null;
  const ty = theme.typography;
  const sec = palSection("Leading & tracking per mode", "A mode can swap one rung for another \u2014 a dark theme that wants everything a step looser, a compact mode that tightens. Rows are the rungs bound above, with what each is worth in the baseline column; every other column names the rung that mode substitutes. \u201CAuto\u201D keeps the rung itself.");
  sec.append(renderRepointTable("Line height", ty.lineHeights.map((l) => ({ key: l.key, val: l.value })), (v) => `${v}\xD7`, "lineHeights"));
  sec.append(renderRepointTable("Letter spacing", ty.letterSpacings.map((l) => ({ key: l.key, val: l.em })), (v) => `${v}em \xB7 ${emToPercentLabel(Number(v))}`, "letterSpacings"));
  return sec;
};
var renderCategorySetup = () => {
  const ty = theme.typography;
  const roleOrder = ty.weightRoles.map((w) => w.role);
  const sec = palSection("What each category is made of", "Choose the weight roles each category ships, nudge its leading and tracking, and decide whether it gets italic and underlined-link variants, or sets italic as its only cut. Each ticked weight multiplies out into a real style at every size in that category. The face is shown for context and set on Semantics.");
  sec.append(el("p", "te-shared-note", "Shared across every mode. These choices decide which styles exist, and a mode never adds or removes one \u2014 it only overrides values (face, weight numerics, sizes, rungs), which is done on Semantics and above."));
  const italicG = new Set(ty.composites.filter((c) => c.italic).map((c) => c.group));
  const italicDefG = new Set(ty.composites.filter((c) => c.italicDefault).map((c) => c.group));
  const linkG = new Set(ty.composites.filter((c) => c.link).map((c) => c.group));
  const wrap = el("div", "cs-wrap");
  const table = hook(el("table", "cs-table"), "category-table");
  const head = el("tr");
  head.append(el("th", void 0, "Category"), el("th", void 0, "Face"));
  const col = (t) => hook(el("th", "cs-c", t), "category-col");
  for (const r of roleOrder) head.append(col(r));
  head.append(col("Leading"), col("Tracking"), col("Italic default"), col("Italic"), col("Link"));
  table.append(head);
  const cb = (checked, onChange) => {
    const c = el("input");
    c.type = "checkbox";
    c.checked = checked;
    c.onchange = () => onChange(c.checked);
    return c;
  };
  const nudgeSteps = (group, field) => {
    const keys = field === "leadingShift" ? LINE_HEIGHT_KEYS : LETTER_SPACING_KEYS;
    const idx = ty.composites.filter((c) => c.group === group).map((c) => keys.indexOf(derivedRungFor(field, c.group, c.sizePx))).filter((i) => i >= 0);
    if (!idx.length) return [0];
    const lo = Math.max(-5, -Math.max(...idx));
    const hi = Math.min(5, keys.length - 1 - Math.min(...idx));
    const out = [];
    for (let v = lo; v <= hi; v++) out.push(v);
    return out;
  };
  const nudgeLabel = (v) => v === 0 ? "default" : `${v < 0 ? "\u2212" : "+"}${Math.abs(v)}`;
  const resolvedRungs = (group, field, shift) => {
    const keys = field === "leadingShift" ? LINE_HEIGHT_KEYS : LETTER_SPACING_KEYS;
    const idx = [...new Set(ty.composites.filter((c) => c.group === group).map((c) => keys.indexOf(shiftRung(keys, derivedRungFor(field, c.group, c.sizePx), shift))).filter((i) => i >= 0))].sort((a, b) => a - b);
    return idx.map((i) => keys[i]).join("\u2013");
  };
  const nudge = (group, field) => {
    const cur = getPath2(brandState, `typography.${field}.${group}`) ?? 0;
    const wrap2 = el("div", "cs-nudgew");
    const sel = selectEl("sm cs-nudge");
    const steps = nudgeSteps(group, field);
    for (const v of steps) sel.append(optionEl(String(v), nudgeLabel(v), v === cur));
    if (!steps.includes(cur)) sel.append(optionEl(String(cur), nudgeLabel(cur), true));
    const worth = el("span", "mtbl-worth mono" + (cur !== 0 ? " set" : ""), resolvedRungs(group, field, cur));
    sel.onchange = () => {
      const n = Number(sel.value);
      setPath2(brandState, `typography.${field}.${group}`, n === 0 ? void 0 : n);
      worth.textContent = resolvedRungs(group, field, n);
      worth.classList.toggle("set", n !== 0);
      apply();
    };
    wrap2.append(sel, worth);
    return wrap2;
  };
  for (const g of TYPE_GROUP_ORDER) {
    const comps = ty.composites.filter((c) => c.group === g);
    const tr = el("tr");
    const nameTd = el("td");
    nameTd.append(hook(el("div", "cs-name mono", g), "category-name"), hook(el("div", "cs-count", `${comps.length} ${comps.length === 1 ? "style" : "styles"}`), "category-count"));
    const catPill = tokenPill(`type.${g}`);
    catPill.title = `Every style in this category is emitted under type.${g} \u2014 ${comps.length} of them`;
    nameTd.append(catPill);
    tr.append(nameTd);
    const faceOf = (cat) => ty.families.find((f) => f.group === cat)?.stack[0] ?? "\u2014";
    const ftd = el("td");
    const fname = el("div", "cs-face", faceOf(g));
    fname.title = ty.families.find((f) => f.group === g)?.stack.join(", ") ?? "";
    ftd.append(fname);
    ftd.append(el("div", "cs-count", "Set on Semantics"));
    tr.append(ftd);
    const has = new Set(comps.map((c) => c.weightRole));
    const required = REQUIRED_WEIGHT_ROLES[g];
    for (const r of roleOrder) {
      const td = hook(el("td", "cs-c"), "category-cell");
      const box = cb(has.has(r), () => {
        const next = roleOrder.filter((x) => x === r ? !has.has(r) : has.has(x));
        setPath2(brandState, `typography.weights.${g}`, next.length ? next : void 0);
        applyFull();
      });
      if (has.has(r) && required?.role === r) {
        box.disabled = true;
        box.title = `${g[0].toUpperCase()}${g.slice(1)} always ships ${r} \u2014 ${required.why}.`;
      } else if (has.has(r) && has.size === 1) {
        box.disabled = true;
        box.title = "Every category ships at least one weight \u2014 tick another before clearing this one.";
      }
      td.append(box);
      tr.append(td);
    }
    const ltd = hook(el("td", "cs-c"), "category-cell");
    ltd.append(nudge(g, "leadingShift"));
    tr.append(ltd);
    const ttd = hook(el("td", "cs-c"), "category-cell");
    ttd.append(nudge(g, "trackingShift"));
    tr.append(ttd);
    const idtd = hook(el("td", "cs-c"), "category-cell");
    const idBox = cb(italicDefG.has(g), (v) => {
      const next = TYPE_GROUP_ORDER.filter((x) => x === g ? v : italicDefG.has(x));
      setPath2(brandState, "typography.italicDefault", next.length ? next : void 0);
      applyFull();
    });
    if (italicG.has(g)) {
      idBox.disabled = true;
      idBox.title = "This category ships -italic variants. Clear Italic first: an italic default replaces the upright cut those variants pair with.";
    } else if (!italicDefG.has(g) && Object.keys(getPath2(brandState, `typography.faces.${g}`) ?? {}).length) {
      idBox.disabled = true;
      idBox.title = "This category pins a cut. Clear its pinned cut first: an italic default sets the cut from the weight, and a pin would override it.";
    }
    idtd.append(idBox);
    tr.append(idtd);
    const itd = hook(el("td", "cs-c"), "category-cell");
    const iBox = cb(italicG.has(g), (v) => {
      const next = TYPE_GROUP_ORDER.filter((x) => x === g ? v : italicG.has(x));
      setPath2(brandState, "typography.italics", next);
      applyFull();
    });
    if (italicDefG.has(g)) {
      iBox.disabled = true;
      iBox.title = "This category is already italic by default, so an -italic variant would repeat each style. Clear Italic default first.";
    }
    itd.append(iBox);
    tr.append(itd);
    const ktd = hook(el("td", "cs-c"), "category-cell");
    ktd.append(cb(linkG.has(g), (v) => {
      const next = TYPE_GROUP_ORDER.filter((x) => x === g ? v : linkG.has(x));
      setPath2(brandState, "typography.links", next);
      apply();
    }));
    tr.append(ktd);
    table.append(tr);
  }
  wrap.append(table);
  sec.append(wrap);
  const nudgeNote = el("p", "sl-note");
  nudgeNote.innerHTML = "The leading and tracking nudges shift that category\u2019s whole curve: <b>+1 opens it by one rung, \u22121 tightens it</b>. Bigger headings keep tightening \u2014 they start from a different place. The line under each control names the rung the category lands on, or both rungs where it spans two size bands.";
  sec.append(nudgeNote);
  return sec;
};
var renderFacePins = () => {
  const ty = theme.typography;
  const sec = palSection("Pin a font cut", "Bind a verbatim Figma cut \u2014 a width like Condensed that a numeric weight cannot reach \u2014 to one weight-role slot. The face is fixed to the category\u2019s bound family; type only the style, exactly as Figma names it (for example, Light Condensed). Leave a slot blank to derive the style from its weight. Italic is set with the Italic columns above, not with a pin.");
  const boundFamily = (cat) => ty.families.find((f) => f.group === cat)?.stack[0];
  const roleOrder = ty.weightRoles.map((w) => w.role);
  const setPin = (cat, role, style) => {
    const faces = structuredClone(getPath2(brandState, "typography.faces") ?? {});
    const fam = boundFamily(cat);
    const trimmed = style.trim();
    if (trimmed && fam) {
      (faces[cat] ??= {})[role] = { family: fam, style: trimmed };
    } else if (faces[cat]) {
      delete faces[cat][role];
      if (!Object.keys(faces[cat]).length) delete faces[cat];
    }
    setPath2(brandState, "typography.faces", Object.keys(faces).length ? faces : void 0);
    apply();
  };
  const wrap = el("div", "cs-wrap");
  const table = hook(el("table", mix("cs-table", "pincut")), "pin-cut-table");
  const head = el("tr");
  head.append(el("th", void 0, "Slot"), el("th", void 0, "Face"), el("th", "cs-c", "Style pin"));
  table.append(head);
  let slots = 0;
  const italicDefault = new Set(ty.composites.filter((c) => c.italicDefault).map((c) => c.group));
  for (const g of TYPE_GROUP_ORDER) {
    const fam = boundFamily(g);
    if (!fam) continue;
    if (italicDefault.has(g)) continue;
    const shipped = roleOrder.filter((r) => ty.composites.some((c) => c.group === g && c.weightRole === r));
    for (const role of shipped) {
      slots++;
      const tr = hook(el("tr", "pincut-row"), "pin-cut-row");
      tr.setAttribute("data-cat", g);
      tr.setAttribute("data-role", role);
      const slotTd = el("td");
      slotTd.append(el("div", "cs-name mono", `${g} \xB7 ${role}`), el("div", "cs-count", "Every size in this category"));
      tr.append(slotTd);
      const fTd = el("td");
      const fName = hook(el("div", mix("cs-face", "pincut-face"), fam), "pin-cut-face");
      fName.title = ty.families.find((f) => f.group === g)?.stack.join(", ") ?? fam;
      fTd.append(fName);
      tr.append(fTd);
      const inTd = el("td", "cs-c");
      const cur = getPath2(brandState, `typography.faces.${g}.${role}`);
      const inp = hook(el("input", mix("tf-in", "pincut-in")), "pin-cut-input");
      inp.type = "text";
      inp.spellcheck = false;
      inp.placeholder = "Derived from weight";
      inp.value = cur?.style ?? "";
      inp.setAttribute("aria-label", `Style cut for ${g} ${role}`);
      inp.onchange = () => setPin(g, role, inp.value);
      inTd.append(inp);
      if (cur && cur.family !== fam)
        inTd.append(el("p", mix("tf-adderr", "pincut-stale"), `Pinned to \u201C${cur.family}\u201D, but this category now binds \u201C${fam}\u201D. Re-enter the style to re-bind, or the cut is dropped at export.`));
      tr.append(inTd);
      table.append(tr);
    }
  }
  wrap.append(table);
  sec.append(wrap);
  if (!slots) sec.append(el("p", "sl-note", "No pinnable slots yet \u2014 bind a face to a category on Semantics first."));
  if (italicDefault.size) {
    const cats = TYPE_GROUP_ORDER.filter((g) => italicDefault.has(g)).join(" and ");
    sec.append(el("p", "sl-note", `Not listed: ${cats}, which ${italicDefault.size === 1 ? "is" : "are"} italic by default. A pin binds its style verbatim, so it would override the italic. Clear Italic default above to pin a cut there.`));
  }
  return sec;
};
var neutralStepOptions = () => {
  const pal = theme.palettes.find((p) => p.palette === theme.roleToPalette.neutral);
  return (pal?.steps ?? []).map((s) => ({ value: Number(s.key), label: `${theme.roleToPalette.neutral} ${s.key}` }));
};
var sfRow = (o) => {
  const row = el("div", "sf-row");
  const sw = el("div", "sf-sw");
  sw.style.background = o.swatchHex;
  const id = el("div", "sf-id");
  id.append(el("div", "sf-name", o.name), tokenPill(o.tokenPath));
  if (o.desc) id.append(el("p", "sf-desc", o.desc));
  const right = el("div", "sf-right");
  right.append(o.example);
  if (o.badge) right.append(o.badge);
  if (o.railNote) right.append(el("span", "sf-railnote", o.railNote));
  row.append(sw, id, o.controls, el("div"), right);
  return row;
};
var sfCtl = (...blocks) => {
  const c = el("div", "sf-ctl");
  c.append(...blocks);
  return c;
};
var sfCtlBlock = (label, control) => {
  const b = el("div", "sf-ctlblock");
  b.append(el("span", "pfk", label), control);
  return b;
};
var sfExSurface = (bg, label, textHex) => {
  const ex = el("div", "sf-ex sf-ex-surface");
  ex.style.background = bg;
  specimen(ex).style.color = textHex;
  ex.append(el("span", void 0, label));
  return ex;
};
var sfExFill = (bg, label, fg) => {
  const ex = specimen(el("div", "sf-ex sf-ex-fill"));
  ex.style.background = bg;
  if (fg) ex.style.color = fg;
  ex.textContent = label;
  return ex;
};
var sfExText = (inkHex, sample, surfaceHex) => {
  const ex = el("div", "sf-ex sf-ex-text");
  ex.style.background = surfaceHex;
  specimen(ex).style.color = inkHex;
  ex.textContent = sample;
  return ex;
};
var sectionContrastRoles = (intro, roleLabels) => {
  const all = resolveAllModes(theme);
  const graded = ([role]) => all.some((m) => {
    const r = m.roles[role];
    return !!r && r.min != null && r.min > 0 && r.ratio != null;
  });
  const rows = roleLabels.filter(graded);
  if (!rows.length) return null;
  const det = el("details", "contracts");
  const sum = el("summary", "contracts-sum");
  sum.append(el("span", "contracts-t", "Contrast in this section"), el("span", "contracts-hint", `${rows.length} pairs \xB7 all modes \xB7 the full system table lives in Preview`));
  det.append(sum, el("p", "np-note", intro));
  const table = el("table", "ctable");
  const thead = el("tr");
  thead.append(el("th", void 0, "Role"));
  for (const m of rp.modes) thead.append(el("th", "mcol", MODE_LABEL[m] ?? m));
  table.append(thead);
  for (const [role, label] of rows) {
    const tr = el("tr");
    const td = el("td", "pair");
    td.append(el("span", "pair-path mono", colorPath(role)), el("span", "pair-sub", label));
    tr.append(td);
    for (const m of rp.modes) {
      const cell = el("td", "mcol");
      const r = all.find((x) => x.mode === m)?.roles[role];
      if (r && r.min != null && r.min > 0 && r.ratio != null) {
        const pass = r.ratio >= r.min;
        cell.append(el("span", `dot ${pass ? "ok" : "no"}`), el("span", "ratio", r.ratio.toFixed(2)));
      } else cell.textContent = "\u2014";
      tr.append(cell);
    }
    table.append(tr);
  }
  det.append(table);
  return det;
};
var renderSurfacesEditor = () => {
  const mode = currentMode;
  const label = MODE_LABEL[mode] ?? mode;
  const sec = hook(palSection("Backgrounds", `The surface ${label} paints on (Primary) and its contrasting Inverse band \u2014 both set per mode. Switch modes above to set each mode\u2019s surface.`), "section-backgrounds");
  const opt = (sel, v, t, on) => {
    sel.append(optionEl(v, t, on));
  };
  const roles = resolveAllModes(theme).find((x) => x.mode === mode)?.roles ?? {};
  const primHex = roles["background.primary"]?.hex ?? (mode === "dark" ? "#000000" : "#ffffff");
  const primText = roles["text.primary"]?.hex ?? (mode === "dark" ? "#f2f2f6" : "#191920");
  if (mode === "light" || mode === "dark") {
    const cur = brandState.surfaces?.[mode];
    const dflt = mode === "dark" ? "black" : "white";
    const baseVal = cur?.base ?? dflt;
    const nOpts = neutralStepOptions();
    const base = selectEl("cap");
    opt(base, "white", "White", baseVal === "white");
    opt(base, "black", "Black", baseVal === "black");
    for (const s of nOpts) opt(base, String(s.value), s.label, baseVal === s.value);
    base.onchange = () => {
      setPath2(brandState, `surfaces.${mode}.base`, base.value === "white" || base.value === "black" ? base.value : Number(base.value));
      applyFull();
    };
    const floorHint = "The worst-case neutral the engine validates bold fills against on this surface \u2014 the mode\u2019s contrast baseline. Auto derives it from the base surface; pin a step to force a specific reference.";
    const floor = selectEl("cap");
    floor.title = floorHint;
    const autoFloor = roles["foreground.brand"]?.against;
    opt(floor, "", autoFloor ? `Auto \xB7 ${autoFloor.replace(".", " ")}` : "Auto", cur?.floorStep == null);
    for (const s of nOpts) opt(floor, String(s.value), s.label, cur?.floorStep === s.value);
    floor.onchange = () => {
      setPath2(brandState, `surfaces.${mode}.floorStep`, floor.value === "" ? void 0 : Number(floor.value));
      applyFull();
    };
    const floorBlock = sfCtlBlock("Contrast floor", floor);
    floorBlock.firstChild.title = floorHint;
    sec.append(sfRow({
      swatchHex: primHex,
      name: "Primary",
      tokenPath: "color.background.primary",
      // The section head already says "the surface <mode> paints on"; the row says what it can be SET to
      // rather than repeating the definition three lines later.
      desc: "White, black, or a tinted neutral step.",
      controls: sfCtl(sfCtlBlock("Base surface", base), floorBlock),
      example: sfExSurface(primHex, "Primary background", primText)
    }));
  } else {
    sec.append(sfRow({
      swatchHex: primHex,
      name: "Primary",
      tokenPath: "color.background.primary",
      desc: "Seeded from this custom mode\u2019s base.",
      controls: sfCtl(sfCtlBlock("Base surface", el("span", "sf-derived", "Seeds from its base mode"))),
      example: sfExSurface(primHex, "Primary background", primText)
    }));
  }
  const invHex = roles["inverse.background.primary"]?.hex;
  if (invHex) {
    const invText = roles["inverse.text.primary"]?.hex ?? "#f2f2f6";
    const invRow = (controls, desc) => {
      sec.append(sfRow({
        // `colorPath`, not a hand-spelled path: an inverse role lives ONLY in the value tier, so the
        // literal `color.background.inverse.primary` this row carried has not resolved since #1013 —
        // the one pill on this page that was not asking the derivation the rest of them ask.
        swatchHex: invHex,
        name: "Inverse",
        tokenPath: colorPath("inverse.background.primary"),
        desc,
        controls,
        example: sfExSurface(invHex, "Primary Inverse Background", invText)
      }));
    };
    if (mode === "light" || mode === "dark") {
      const m2 = mode;
      const nPal = theme.roleToPalette.neutral;
      const cur = brandState.surfaces?.[m2]?.inverseBase;
      const curPal = cur != null && typeof cur === "object" ? cur.palette : nPal;
      const curStep = cur == null ? void 0 : String(typeof cur === "object" ? cur.step : cur);
      const bandPalettes = [nPal, ...theme.palettes.filter((p) => p.palette !== nPal && !STATUS_ROLES.includes(p.role) && !/alpha/.test(p.palette) && p.palette !== "white" && p.palette !== "black").map((p) => p.palette)];
      const writeBand = (v) => {
        setPath2(brandState, `surfaces.${m2}.inverseBase`, v);
        applyFull();
      };
      const palSel = selectEl("cap");
      for (const p of bandPalettes) palSel.append(optionEl(p, p === nPal ? "Neutral" : p, p === curPal));
      palSel.onchange = () => {
        const pal = palSel.value;
        if (pal === nPal) return writeBand(void 0);
        const st = stepsOf(pal);
        writeBand(st.length ? { palette: pal, step: Number(st[st.length - 1]) } : void 0);
      };
      const curSteps = stepsOf(curPal);
      const autoStep = curPal === nPal ? baselineStepOf("inverse.background.primary", mode) : String(curSteps[curSteps.length - 1] ?? "");
      const stepSel = stepPicker(
        curPal,
        curSteps,
        autoStep,
        curStep,
        (step) => writeBand(step == null ? void 0 : curPal === nPal ? Number(step) : { palette: curPal, step: Number(step) })
      );
      invRow(
        sfCtl(sfCtlBlock("Palette", palSel), sfCtlBlock("Step", stepSel)),
        "The contrasting band for dark heroes / inverse sections. Auto follows the generated pairing (a neutral near-extreme); pick Neutral, the brand, or a custom palette + a step to set a brand-colored band. Status palettes are excluded. Everything measured against the band re-derives, so a pick the ramp cannot serve is reported rather than silently absorbed."
      );
    } else {
      invRow(
        sfCtl(sfCtlBlock("Step", el("span", "sf-derived", "Seeds from its base mode"))),
        "The contrasting band for dark heroes / inverse sections. Seeded from this custom mode\u2019s base."
      );
    }
  }
  return sec;
};
var FG_ROLES = [["text.primary", "Primary text"], ["text.secondary", "Secondary text"], ["text.tertiary", "Tertiary text"]];
var TEXT_PALETTE_ROLES = [
  { role: "text.brand", label: "Brand ink", paletteKey: "brand", desc: "Brand-colored text \u2014 the ink form of the brand color, not the fill.", sample: "Brand emphasis" },
  { role: "text.success", label: "Success ink", paletteKey: "success", desc: "Success message text.", sample: "Saved successfully" },
  { role: "text.warning", label: "Warning ink", paletteKey: "warning", desc: "Warning message text.", sample: "Check this before continuing" },
  { role: "text.danger", label: "Danger ink", paletteKey: "danger", desc: "Error message text.", sample: "Something went wrong" },
  { role: "text.info", label: "Info ink", paletteKey: "info", desc: "Informational message text.", sample: "For your reference" },
  { role: "text.brand-subtle", label: "Brand ink, muted", paletteKey: "brand", desc: "The quiet variant \u2014 lower emphasis, held to the large-text / non-text bar (3:1, or 4.5:1 in high contrast) rather than the 4.5:1 the bold ink clears. Use it for large text and non-text accents, not body copy.", sample: "Brand, quietly" },
  // All five muted rows state the SAME contract, because the engine gives them the same one: they come
  // off one `T(\`${r}-subtle\`, …, p.tertiaryMin)` loop in `modes.ts`, so the bar is identical per role.
  // Four of them used to read "The quiet success variant." and so on (#578 nit 1) — never false, since
  // they claimed nothing about gating, but the brand row explained the large-text bar and its four
  // siblings didn't, so reading down the list you got the rule once and then four rows that looked like
  // a different kind of token. Stated per row rather than hoisted into the section blurb: the badge is
  // per row, and a reader checking one role should not have to scroll to learn what its bar is.
  { role: "text.success-subtle", label: "Success ink, muted", paletteKey: "success", desc: "The quiet success variant \u2014 lower emphasis, held to the large-text / non-text bar (3:1, or 4.5:1 in high contrast) rather than the 4.5:1 the bold ink clears. Use it for large text and non-text accents, not body copy.", sample: "Success, quietly" },
  { role: "text.warning-subtle", label: "Warning ink, muted", paletteKey: "warning", desc: "The quiet warning variant \u2014 lower emphasis, held to the large-text / non-text bar (3:1, or 4.5:1 in high contrast) rather than the 4.5:1 the bold ink clears. Use it for large text and non-text accents, not body copy.", sample: "Warning, quietly" },
  { role: "text.danger-subtle", label: "Danger ink, muted", paletteKey: "danger", desc: "The quiet danger variant \u2014 lower emphasis, held to the large-text / non-text bar (3:1, or 4.5:1 in high contrast) rather than the 4.5:1 the bold ink clears. Use it for large text and non-text accents, not body copy.", sample: "Danger, quietly" },
  { role: "text.info-subtle", label: "Info ink, muted", paletteKey: "info", desc: "The quiet info variant \u2014 lower emphasis, held to the large-text / non-text bar (3:1, or 4.5:1 in high contrast) rather than the 4.5:1 the bold ink clears. Use it for large text and non-text accents, not body copy.", sample: "Info, quietly" },
  { role: "text.link.default", label: "Link", paletteKey: "action", desc: "Link ink at rest. Hover and visited walk one and two steps from here, so this row moves all four.", sample: "A link in running text" }
];
var TEXT_DERIVED_ROLES = [
  { role: "text.on-brand", label: "On brand fill", from: "Follows the brand fill", why: "A near-black or near-white pick, whichever clears AA on the brand fill \u2014 repoint Foreground fills \u203A Brand to move it.", onRole: "foreground.brand", sample: "On brand" },
  { role: "text.on-success", label: "On success fill", from: "Follows the success fill", why: "A near-black or near-white pick, whichever clears AA on the success fill.", onRole: "foreground.success", sample: "On success" },
  { role: "text.on-warning", label: "On warning fill", from: "Follows the warning fill", why: "A near-black or near-white pick, whichever clears AA on the warning fill.", onRole: "foreground.warning", sample: "On warning" },
  { role: "text.on-danger", label: "On danger fill", from: "Follows the danger fill", why: "A near-black or near-white pick, whichever clears AA on the danger fill.", onRole: "foreground.danger", sample: "On danger" },
  { role: "text.on-info", label: "On info fill", from: "Follows the info fill", why: "A near-black or near-white pick, whichever clears AA on the info fill.", onRole: "foreground.info", sample: "On info" },
  { role: "inverse.text.primary", label: "On inverse surface", from: "Follows the inverse surface", why: "The strongest neutral against the inverse surface \u2014 repoint Backgrounds \u203A Inverse to move it.", onRole: "inverse.background.primary", sample: "On inverse" },
  { role: "text.link.hover", label: "Link \u2014 hover", from: "Link, one step on", why: "Link walked one palette step. Repoint Link above to move it.", sample: "Hovered link" },
  { role: "text.link.visited", label: "Link \u2014 visited", from: "Link, two steps on", why: "Link walked two palette steps. Repoint Link above to move it.", sample: "Visited link" },
  { role: "text.link.focused", label: "Link \u2014 focused", from: "Link, unchanged", why: "Identical to Link at rest by design \u2014 focus is carried by the ring, not a color shift.", sample: "Focused link" }
];
var TEXT_SAMPLE = { "text.primary": "Default body copy", "text.secondary": "Supporting detail", "text.tertiary": "Least-emphasis caption" };
var LINK_ROLES = ["text.link.default", "text.link.hover", "text.link.visited", "text.link.focused"];
var setLinkOverride = (palette, steps, step) => {
  if (step === void 0) {
    for (const r of LINK_ROLES) setFillOverride(r, palette, void 0);
    return;
  }
  const i = steps.indexOf(step);
  const at2 = (n) => steps[Math.min(i + n, steps.length - 1)];
  setFillOverride("text.link.default", palette, step);
  setFillOverride("text.link.hover", palette, at2(1));
  setFillOverride("text.link.visited", palette, at2(2));
  setFillOverride("text.link.focused", palette, step);
};
var renderForegroundEditor = () => {
  const sec = palSection("Text", `Every text color for ${MODE_LABEL[currentMode] ?? currentMode} \u2014 the neutral ladder, the semantic and link inks, and the derived inks that follow other decisions. \u201CAuto\u201D follows the generated, contrast-placed default; pick a step to override this mode (a pick below the text floor is warned, not blocked). Each row previews the ink on the surface it is rated against.`);
  const nPal = theme.roleToPalette.neutral;
  const nSteps = (theme.palettes.find((p) => p.palette === nPal)?.steps ?? []).map((s) => s.key);
  const roles = resolveAllModes(theme).find((x) => x.mode === currentMode)?.roles ?? {};
  const surfaceHex = roles["background.primary"]?.hex ?? (currentMode === "dark" ? "#000000" : "#ffffff");
  sec.append(subHead("Neutral ladder"));
  for (const [role, label] of FG_ROLES) {
    const r = roles[role];
    if (!r) continue;
    const cur = brandState.overrides?.[currentMode]?.[role]?.step;
    const sel = stepPicker(
      nPal,
      nSteps,
      baselineStepOf(role),
      typeof cur === "string" ? cur : void 0,
      (step) => setFillOverride(role, nPal, step)
    );
    sec.append(sfRow({
      swatchHex: r.hex,
      name: label,
      tokenPath: colorPath(role),
      controls: sfCtl(sfCtlBlock("Step", sel)),
      example: sfExText(r.hex, TEXT_SAMPLE[role] ?? "Sample text", surfaceHex),
      badge: r.min != null && r.min > 0 && r.ratio != null ? contrastBadge(r.ratio, r.min) : void 0
    }));
  }
  sec.append(subHead("Semantic & link ink"));
  for (const { role, label, paletteKey, desc, sample } of TEXT_PALETTE_ROLES) {
    const r = roles[role];
    if (!r) continue;
    const palette = theme.roleToPalette[paletteKey] ?? paletteKey;
    const steps = (theme.palettes.find((p) => p.palette === palette)?.steps ?? []).map((s) => s.key);
    if (!steps.length) continue;
    const cur = brandState.overrides?.[currentMode]?.[role]?.step;
    const sel = stepPicker(
      palette,
      steps,
      baselineStepOf(role),
      typeof cur === "string" ? cur : void 0,
      role === "text.link.default" ? (step) => setLinkOverride(palette, steps, step) : (step) => setFillOverride(role, palette, step)
    );
    sec.append(sfRow({
      swatchHex: r.hex,
      name: label,
      tokenPath: colorPath(role),
      desc,
      controls: sfCtl(sfCtlBlock("Step", sel)),
      example: sfExText(r.hex, sample, surfaceHex),
      // The muted variants are gated too now (#570), at the LARGE-TEXT bar rather than the 4.5:1 the
      // bold ink clears — so their badge carries that label. Without it the receipt is misleading in a
      // way a bare number cannot fix: muted's 3.20 ✓ sits directly beneath bold's 5.59 ✓, and a reader
      // comparing two green ticks has no way to tell they were measured against different bars. Naming
      // the bar is the whole point of the change; the badge is where the promise is actually read.
      badge: r.min != null && r.min > 0 && r.ratio != null ? contrastBadge(r.ratio, r.min, role.endsWith("-subtle") ? `large text ${r.min}:1` : void 0) : void 0
    }));
  }
  sec.append(subHead("Derived \u2014 not editable"));
  for (const { role, label, from, why, onRole, sample } of TEXT_DERIVED_ROLES) {
    const r = roles[role];
    if (!r) continue;
    const on = onRole ? roles[onRole]?.hex : void 0;
    sec.append(sfRow({
      swatchHex: r.hex,
      name: label,
      tokenPath: colorPath(role),
      desc: why,
      controls: sfCtl(sfCtlBlock("Source", el("span", "sf-derived", from))),
      example: sfExText(r.hex, sample, on ?? surfaceHex),
      badge: r.min != null && r.min > 0 && r.ratio != null ? contrastBadge(r.ratio, r.min) : void 0
    }));
  }
  const ct = sectionContrastRoles("The text-on-surface legibility pairs this section governs, computed on the resolved colors across every mode \u2014 the per-row badge verifies the active mode at the point of edit.", [
    ...FG_ROLES,
    ...TEXT_PALETTE_ROLES.map((t) => [t.role, t.label]),
    ...TEXT_DERIVED_ROLES.map((t) => [t.role, t.label])
  ]);
  if (ct) sec.append(ct);
  return sec;
};
var stepPicker = (paletteName, steps, autoStep, current, onPick, mark) => {
  const sel = selectEl("cap");
  sel.append(optionEl("", `Auto \xB7 ${paletteName} ${autoStep}${mark?.(autoStep) ?? ""}`, current == null));
  for (const s of steps) sel.append(optionEl(s, `${paletteName} ${s}${mark?.(s) ?? ""}`, current === s));
  sel.onchange = () => onPick(sel.value === "" ? void 0 : sel.value);
  return sel;
};
var FILL_ROLES = [
  { role: "foreground.brand", label: "Brand", paletteKey: "brand", desc: "The bold brand fill \u2014 filled badges, nav indicators, brand accents." },
  { role: "foreground.success", label: "Success", paletteKey: "success", desc: "The bold success fill." },
  { role: "foreground.warning", label: "Warning", paletteKey: "warning", desc: "The bold warning fill." },
  { role: "foreground.info", label: "Info", paletteKey: "info", desc: "The bold info fill." },
  { role: "foreground.danger", label: "Danger", paletteKey: "danger", desc: "The bold danger fill." },
  { role: "foreground.primary", label: "Surface \u2014 card", paletteKey: "neutral", desc: "The default raised surface \u2014 a card." },
  { role: "foreground.secondary", label: "Surface \u2014 panel", paletteKey: "neutral", desc: "The second surface tier \u2014 a panel." },
  { role: "foreground.tertiary", label: "Surface \u2014 nested", paletteKey: "neutral", desc: "The third surface tier \u2014 a nested container." }
];
var setFillOverride = (role, palette, step) => {
  const ov = brandState.overrides ?? (brandState.overrides = {});
  const forMode = ov[currentMode] ?? (ov[currentMode] = {});
  if (step === void 0) {
    delete forMode[role];
    if (!Object.keys(forMode).length) delete ov[currentMode];
    if (!Object.keys(ov).length) brandState.overrides = void 0;
  } else forMode[role] = { palette, step };
  applyFull();
};
var renderForegroundsEditor = () => {
  const sec = palSection("Foreground fills", `Bold semantic fills + neutral surface tiers for ${MODE_LABEL[currentMode] ?? currentMode} \u2014 \u201CAuto\u201D follows the generated, contrast-gated default; pick a step to override this mode (a pick below the fill's floor is warned, not blocked).`);
  const roles = resolveAllModes(theme).find((x) => x.mode === currentMode)?.roles ?? {};
  for (const { role, label, paletteKey, desc } of FILL_ROLES) {
    const r = roles[role];
    if (!r) continue;
    const palette = theme.roleToPalette[paletteKey] ?? paletteKey;
    const steps = (theme.palettes.find((p) => p.palette === palette)?.steps ?? []).map((s) => s.key);
    if (!steps.length) continue;
    const cur = brandState.overrides?.[currentMode]?.[role]?.step;
    const picker = stepPicker(palette, steps, baselineStepOf(role), typeof cur === "string" ? cur : void 0, (step) => setFillOverride(role, palette, step));
    const isSurface = paletteKey === "neutral";
    const tier = label.split("\u2014")[1]?.trim();
    const exLabel = isSurface ? tier ? tier[0].toUpperCase() + tier.slice(1) : "Surface" : `${label} fill`;
    sec.append(sfRow({
      swatchHex: r.hex,
      name: label,
      tokenPath: colorPath(role),
      desc,
      controls: sfCtl(sfCtlBlock("Step", picker)),
      example: sfExFill(r.hex, exLabel, isSurface ? legibleInkOn(r.hex) : void 0),
      badge: r.min != null && r.min > 0 && r.ratio != null ? contrastBadge(r.ratio, r.min) : void 0,
      railNote: isSurface ? "non-text \xB7 surface" : void 0
    }));
  }
  {
    const role = "field.fill";
    const fr = roles[role];
    if (fr) {
      const palette = theme.roleToPalette.neutral;
      const nSteps = theme.palettes.find((p) => p.palette === palette)?.steps ?? [];
      const inkHex = roles["text.primary"]?.hex;
      const cur = brandState.overrides?.[currentMode]?.[role]?.step;
      const transparent = cur == null;
      const mark = (step) => {
        const s = nSteps.find((x) => x.key === step);
        return inkHex && s && contrast(hexToRgb(s.hex), hexToRgb(inkHex)) >= 4.5 ? " \xB7 \u2713 4.5:1" : "";
      };
      const sel = selectEl("cap");
      sel.append(optionEl("", "Transparent (no paint)", transparent));
      for (const s of nSteps.map((x) => x.key)) sel.append(optionEl(s, `${palette} ${s}${mark(s)}`, cur === s));
      sel.onchange = () => setFillOverride(role, palette, sel.value === "" ? void 0 : sel.value);
      const pageHex = roles["background.primary"]?.hex ?? "#ffffff";
      const shown = transparent ? pageHex : fr.hex;
      sec.append(sfRow({
        swatchHex: shown,
        name: "Field fill",
        tokenPath: colorPath(role),
        desc: "Transparent by default \u2014 the border frames the field on any ground. Pick a neutral step for a solid, filled field.",
        controls: sfCtl(sfCtlBlock("Step", sel)),
        example: sfExFill(shown, "Field", legibleInkOn(shown)),
        railNote: transparent ? "transparent \xB7 no paint" : "non-text \xB7 surface"
      }));
    }
  }
  const ct = sectionContrastRoles("The on-fill legibility pairs this section governs, computed on the resolved colors across every mode \u2014 the per-row badge verifies the active mode at the point of edit.", FILL_ROLES.map((f) => [f.role, f.label]));
  if (ct) sec.append(ct);
  return sec;
};
var renderShadowEditor = (softness) => {
  const perMode = currentMode !== "light";
  const modeLabel = MODE_LABEL[currentMode] ?? currentMode;
  const wrap = palSection("Shadow", perMode ? `Blur softness + tint for ${modeLabel} \u2014 \u201CAuto\u201D follows the global shadow; a value overrides this mode (crisper/softer, warmer/cooler). The light\u2194dark reduction still applies on top.` : "Blur softness (crisp/product \u2192 soft/marketing) and a hue-shift of the shadow base off pure black. Tint amount 0 = pure black; higher = a richer, brand-hued near-black.");
  const gTint = theme.shadow.tint;
  const gSoft = theme.shadow.softness;
  const panel = wrap;
  if (perMode) {
    const mkPer = (label, min, max, step, unit, path, global) => {
      const ov = getModeLever(currentMode, path);
      const eff = ov ?? global;
      const knob2 = el("div", "knob");
      const head = el("div", "sh-knob-head");
      head.append(el("label", "knob-label", label));
      const auto = el("button", "sh-auto");
      const setAuto = (overriding) => {
        auto.textContent = overriding ? "\u21BA Auto" : `Auto (${global}${unit})`;
        auto.className = overriding ? "sh-auto on" : "sh-auto";
        auto.disabled = !overriding;
      };
      setAuto(ov !== void 0);
      auto.onclick = () => {
        setModeLever(currentMode, path, void 0);
        applyFull();
      };
      head.append(auto);
      knob2.append(head);
      const input = rangeInput({ min, max, step, value: eff });
      const val = el("span", "knob-val", `${eff}${unit}${ov !== void 0 ? "" : " \xB7 auto"}`);
      input.oninput = () => {
        const nv = Number(input.value);
        const overriding = nv !== global;
        setModeLever(currentMode, path, overriding ? nv : void 0);
        val.textContent = `${input.value}${unit}${overriding ? "" : " \xB7 auto"}`;
        setAuto(overriding);
        apply();
        refreshTintReadout?.();
      };
      const body = el("div", "knob-body");
      body.append(input, val);
      knob2.append(body);
      panel.append(knob2);
    };
    const sLever = softness;
    mkPer(sLever?.label ?? "Shadow softness", sLever?.min ?? 0, sLever?.max ?? 2, sLever?.step ?? 0.1, "", "shadow.softness", gSoft);
    mkPer("Tint hue", 0, 360, 1, "\xB0", "shadow.tint.hue", gTint.hue);
    mkPer("Tint amount", 0, 1, 0.05, "", "shadow.tint.amount", gTint.amount);
  } else {
    const cur = brandState.shadow?.tint;
    if (softness) panel.append(renderControl(softness));
    const mk = (key, label, min, max, step, unit) => {
      const knob2 = el("div", "knob");
      knob2.append(el("label", "knob-label", label));
      const input = rangeInput({ min, max, step, value: cur?.[key] ?? gTint[key] });
      const val = el("span", "knob-val", `${input.value}${unit}`);
      input.oninput = () => {
        setPath2(brandState, `shadow.tint.${key}`, Number(input.value));
        val.textContent = `${input.value}${unit}`;
        apply();
        refreshTintReadout?.();
      };
      const body = el("div", "knob-body");
      body.append(input, val);
      knob2.append(body);
      panel.append(knob2);
    };
    mk("hue", "Tint hue", 0, 360, 1, "\xB0");
    mk("amount", "Tint amount", 0, 1, 0.05, "");
  }
  panel.append(tintReadout());
  return wrap;
};
var refreshTintReadout = null;
var tintReadout = () => {
  const row = el("div", "sh-tintout");
  const swatch2 = (caption) => {
    const chip = el("div", "sh-tintchip");
    const fill = el("div", "sh-tintfill");
    chip.append(fill);
    const cell = el("div", "sh-tintcell");
    cell.append(chip, el("div", "sh-tintcap", caption));
    return { cell, fill };
  };
  const solid = swatch2("Tint color \xB7 100%");
  const painted = swatch2("In a shadow \xB7 12%");
  row.append(solid.cell, painted.cell);
  const note = el("div", "sh-tintnote");
  const hexLabel = el("b", void 0, "");
  const noteText = document.createTextNode("");
  note.append(hexLabel, noteText);
  const refresh = () => {
    const base = theme.shadow.shadowByMode?.[currentMode]?.colorRgb ?? theme.shadow.colorRgb;
    const baseHex = hex(base);
    const amount = theme.shadow.shadowByMode?.[currentMode]?.tint.amount ?? theme.shadow.tint.amount;
    solid.fill.style.backgroundColor = baseHex;
    painted.fill.style.backgroundColor = `${baseHex}1f`;
    hexLabel.textContent = baseHex.toUpperCase() + " ";
    noteText.nodeValue = amount === 0 ? "\u2014 pure black. Raise Tint amount to shift the shadow base off black." : "is the shadow base. Shadows paint it at 10\u201314% opacity, so the hue reads far subtler on the ramp than on the swatch above \u2014 that is the shadow doing its job, not the slider failing.";
  };
  refresh();
  refreshTintReadout = refresh;
  const wrap = el("div", "sh-tintblock");
  wrap.append(row, note);
  return wrap;
};
var TYPE_GROUP_ORDER = ["display", "title", "body", "label", "caption", "eyebrow", "code"];
var TYPE_GROUP_BLURB = {
  display: "Hero and marketing-scale statements.",
  title: "Section and page headings.",
  body: "Running copy and UI text.",
  label: "Form labels, buttons, dense UI.",
  caption: "Secondary and supporting text.",
  eyebrow: "Small uppercase kickers above headings.",
  code: "Inline code and tabular figures."
};
var RAMP_SAMPLE = "The quick brown fox";
var renderTypeRamp = () => {
  const ty = theme.typography;
  const modes = rp.modes;
  const lhOf = (k) => ty.lineHeights.find((l) => l.key === k)?.value ?? 1.5;
  const lsOf = (k) => ty.letterSpacings.find((l) => l.key === k)?.em ?? 0;
  const inMode = (c, m) => {
    const fams = ty.familiesByMode?.[m] ?? ty.families;
    const wrs = ty.weightRolesByMode?.[m] ?? ty.weightRoles;
    const lhKey = c.lineHeightByMode?.[m] ?? c.lineHeight;
    const lsKey = c.trackingByMode?.[m] ?? c.tracking;
    const sizePx = c.sizeByMode?.[m] ?? c.sizePx;
    const sizeMinPx = c.sizeMinByMode?.[m] ?? (c.sizeByMode?.[m] !== void 0 ? sizePx : c.sizeMinPx);
    return {
      sizePx,
      sizeMinPx,
      lhKey,
      lsKey,
      stack: fams.find((f) => f.group === c.group)?.stack.join(", ") ?? "inherit",
      weight: wrs.find((w) => w.role === c.weightRole)?.value ?? 400
    };
  };
  const sec = palSection("The full type ramp", `Every style the system generates \u2014 ${ty.composites.length} in total, grouped by category \u2014 resolved in all ${modes.length} ${modes.length === 1 ? "mode" : "modes"} side by side. This is what ships as tokens.`);
  for (const g of TYPE_GROUP_ORDER) {
    const comps = ty.composites.filter((c) => c.group === g).sort((a, b) => b.sizePx - a.sizePx);
    if (!comps.length) continue;
    const block = el("div", "tr-block");
    const band = el("div", "tr-band");
    band.append(
      el("span", "tr-band-n", g),
      el("span", "tr-band-c mono", `${comps.length} ${comps.length === 1 ? "style" : "styles"}`),
      el("span", "tr-band-d", TYPE_GROUP_BLURB[g] ?? "")
    );
    block.append(band);
    for (const c of comps) {
      const row = el("div", "tr-row");
      const meta = el("div", "tr-meta");
      meta.append(tokenPill(`type.${c.path}`));
      meta.append(el("span", "tr-attr mono", `${c.weightRole} \xB7 ${c.group}`));
      row.append(meta);
      const cols = el("div", "tr-modes");
      cols.style.gridTemplateColumns = `repeat(${modes.length}, minmax(220px, 1fr))`;
      for (const m of modes) {
        const v = inMode(c, m);
        const col = el("div", "tr-mode");
        col.append(el("span", "tr-mode-n", m));
        const fluidTag = v.sizeMinPx !== v.sizePx ? ` \xB7 fluid ${v.sizeMinPx}\u2192${v.sizePx}` : "";
        col.append(el("span", "tr-attr mono", `${v.sizePx}px \xB7 ${v.weight} \xB7 ${v.lhKey} ${lhOf(v.lhKey)}\xD7 \xB7 ${v.lsKey} ${lsOf(v.lsKey)}em${fluidTag}`));
        const samp = el("div", "tr-samp", RAMP_SAMPLE);
        samp.style.fontFamily = v.stack;
        samp.style.fontSize = `${v.sizePx}px`;
        samp.style.fontWeight = String(v.weight);
        samp.style.lineHeight = String(lhOf(v.lhKey));
        samp.style.letterSpacing = `${lsOf(v.lsKey)}em`;
        if (c.link) samp.style.textDecoration = "underline";
        if (c.italic || c.italicDefault) samp.style.fontStyle = "italic";
        if (c.textCase === "uppercase") samp.style.textTransform = "uppercase";
        col.append(samp);
        cols.append(col);
      }
      row.append(cols);
      block.append(row);
    }
    sec.append(block);
  }
  return sec;
};
var RADIUS_STEPS = ["none", "sm", "md", "lg", "round", "capsule"];
var paintRadiusPreview = (into) => {
  into.innerHTML = "";
  const consumers = {};
  for (const c of previewSpec.components) for (const v of c.variants) {
    const rref = v.bindings.radius;
    if (rref?.startsWith("radius.")) (consumers[rref.slice(7)] ??= /* @__PURE__ */ new Set()).add(c.id);
  }
  const byMode = theme.dims.radiusByMode?.[currentMode];
  const list = el("div", "rad-list");
  for (const step of RADIUS_STEPS) {
    const isCapsule = step === "capsule";
    const overridePx = byMode?.find((s) => s.name === step)?.px;
    const px = step === "none" ? 0 : overridePx ?? rp.dims[`radius.${step}`] ?? 0;
    const cell = el("div", "rad-cell");
    const sw = el("div", "rad-sw");
    sw.style.borderRadius = isCapsule ? "26px" : `${Math.min(px, 26)}px`;
    const cons = [...consumers[step] ?? []];
    const label = isCapsule ? `${step} \xB7 full` : `${step} \xB7 ${px}px`;
    cell.append(sw, el("div", "rad-lab mono", label), tokenPill(`radius.${step}`), el("div", "rad-cons", cons.length ? cons.join(", ") : "\u2014"));
    list.append(cell);
  }
  into.append(list);
};
var paintControlShapePreview = (into) => {
  into.innerHTML = "";
  const cur = String(getPath2(brandState, "controlShape") ?? "rounded");
  const roundedPx = rp.dims["radius.md"] ?? 0;
  const shapes = [
    { key: "boxed", label: "Boxed", radiusPx: 0, ref: "radius.none", note: "radius.none \xB7 0px, sharp" },
    { key: "hairline", label: "Hairline", radiusPx: 1, ref: "radius.hairline", note: "radius.hairline \xB7 1px, fixed" },
    { key: "rounded", label: "Rounded", radiusPx: roundedPx, ref: "radius.md", note: `radius.md \xB7 ${roundedPx}px` },
    { key: "pill", label: "Pill", radiusPx: 999, ref: "radius.capsule", note: "radius.capsule \xB7 height \xF7 2, any height" }
  ];
  const list = el("div", "rad-list rad-shapes");
  for (const s of shapes) {
    const on = s.key === cur;
    const cell = el("div", "rad-cell" + (on ? " on" : ""));
    const bar = el("div", "rad-sw");
    bar.style.width = "112px";
    bar.style.height = "52px";
    bar.style.borderRadius = `${s.radiusPx}px`;
    cell.append(bar, el("div", "rad-lab mono", `${s.label}${on ? " \xB7 selected" : ""}`), tokenPill(s.ref), el("div", "rad-cons", s.note));
    list.append(cell);
  }
  into.append(list);
};
var BUTTON_SIZES = [
  { size: "Small", step: "sm", icon: "xs", label: "sm" },
  { size: "Medium", step: "md", icon: "sm", label: "md" },
  { size: "Large", step: "lg", icon: "md", label: "lg" }
];
var paintButtonLayoutPreview = (into) => {
  into.innerHTML = "";
  const edges = (getPath2(brandState, "buttonIcons") ?? "attached") === "edges";
  const smaller = (getPath2(brandState, "buttonContentSize") ?? "match") === "smaller";
  const mult = Number(getPath2(brandState, "buttonMinWidthMultiplier") ?? DEFAULT_MIN_WIDTH_MULTIPLIER);
  const labelRole = (getPath2(brandState, "buttonLabelWeight") ?? "emphasis") === "default" ? "default" : "emphasis";
  const labelWeight = (theme.typography.weightRolesByMode?.[currentMode] ?? theme.typography.weightRoles).find((w) => w.role === labelRole).value;
  const sizes = theme.dims.sizesByMode?.[currentMode] ?? theme.dims.sizes;
  const radius = rp.dims["radius.md"] ?? 4;
  const spacePx = sizeRefPx(theme.dims.sizes);
  const list = el("div", "btnl-list");
  for (const b of BUTTON_SIZES) {
    const h = sizes.find((x) => x.name === b.step);
    if (!h) continue;
    const at2 = (k) => {
      const key = `size.${b.size.toLowerCase()}.${k}`;
      return spacePx(densitySpacingStep(key, BUTTON_SPACING[key], theme.dims.density)) ?? 0;
    };
    const z = { height: h.height, padX: at2("padding-x"), padXVisual: at2("padding-x-visual"), gap: at2("gap") };
    const off = smaller && b.step === "md";
    const iconPx = ICON_SIZES.find((i) => i.name === (off ? "xs" : b.icon))?.px ?? 16;
    const labelPx = theme.typography.composites.find((c) => c.group === "label" && c.variant === (off ? "sm" : b.label))?.sizePx ?? 14;
    const floor = buttonMinWidth(z.height, mult);
    const wide = Math.max(floor, 240);
    const button2 = (text, lead, trail, width) => {
      const btn = el("div", "btnl-btn");
      btn.style.height = `${z.height}px`;
      btn.style.minWidth = `${floor}px`;
      btn.style.borderRadius = `${radius}px`;
      btn.style.gap = `${z.gap}px`;
      const reserve = z.padXVisual + iconPx + z.gap;
      btn.style.paddingLeft = `${lead ? edges ? reserve : z.padXVisual : z.padX}px`;
      btn.style.paddingRight = `${trail ? edges ? reserve : z.padXVisual : z.padX}px`;
      if (width !== void 0) btn.style.width = `${width}px`;
      const glyph = (side) => {
        const g = el("span", "btnl-icon" + (edges ? " btnl-pinned" : ""));
        g.style.width = g.style.height = `${iconPx}px`;
        if (edges) g.style[side] = `${z.padXVisual}px`;
        return g;
      };
      const label = el("span", "btnl-label", text);
      label.style.fontSize = `${labelPx}px`;
      label.style.fontWeight = String(labelWeight);
      if (lead) btn.append(glyph("left"));
      btn.append(label);
      if (trail) btn.append(glyph("right"));
      return btn;
    };
    const row = el("div", "btnl-row");
    row.append(
      el("div", "btnl-lab mono", `${b.size} \xB7 ${z.height}px high \xB7 min ${floor}px${off ? " \xB7 small label & icon" : ""}`),
      button2("OK", false, false),
      button2("Continue", true, true, wide),
      button2("Continue", false, true, wide)
    );
    list.append(row);
  }
  into.append(list);
};
var SHADOW_STEPS = ["xs", "sm", "md", "lg", "xl", "2xl"];
var renderShadowSpecimen = () => {
  const wrap = palSection("Elevation ramp", "The shadow ramp xs\u21922xl \u2014 the softness + tint levers reshape every step, resolved for the mode in view (see the preview below for the mode-reduced dark shadow).");
  const m = currentMode;
  const list = el("div", "sh-list");
  for (const step of [...SHADOW_STEPS, "inset"]) {
    const css = rp.shadows[`shadow.${step}`]?.[m];
    if (!css) continue;
    const cell = el("div", "sh-cell");
    const card = el("div", "sh-card");
    card.style.boxShadow = css;
    cell.append(card, el("div", "sh-lab mono", step), tokenPill(`shadow.${step}`));
    list.append(cell);
  }
  wrap.append(list);
  return wrap;
};
var paintSizePreview = (into) => {
  into.innerHTML = "";
  const byMode = theme.dims.sizesByMode?.[currentMode];
  const sizes = byMode ?? theme.dims.sizes;
  const list = el("div", "sz-list");
  for (const z of sizes) {
    const cell = el("div", "sz-cell");
    const box = el("div", "sz-box", z.name);
    box.style.height = `${z.height}px`;
    box.style.padding = "0 8px";
    cell.append(box, el("div", "sz-lab mono", `${z.name} \xB7 ${z.height}px`), tokenPill(`size.${z.name}.height`));
    list.append(cell);
  }
  into.append(list);
};
var paintSpacingPreview = (into) => {
  into.innerHTML = "";
  const steps = theme.dims.space.map((s) => ({ ref: `space.${s.key}`, px: s.px }));
  const list = el("div", "sp-list");
  for (const { ref: k, px } of steps) {
    const cell = el("div", "sp-cell");
    const bar = el("div", "sp-bar");
    bar.style.width = `${px}px`;
    if (px === 0) addClass(bar, "zero");
    const lab = el("div", "sp-lab");
    lab.append(tokenPill(k), el("span", "sp-px mono", `${px}px`));
    cell.append(lab, bar);
    list.append(cell);
  }
  into.append(list);
};
var paintPrimitivesPreview = (into) => {
  into.innerHTML = "";
  const scale = (label, rows, wrapCls) => {
    const box = el("div", "pv-scale");
    box.append(el("div", "pv-scale-t", label));
    const list = el("div", wrapCls);
    for (const { ref, px } of rows) {
      const cell = el("div", "pv-cell");
      cell.append(tokenPill(ref), el("span", "sp-px mono", `${px}px`));
      list.append(cell);
    }
    box.append(list);
    return box;
  };
  const BW = [["none", 0], ["hairline", 1], ["thick", 2], ["heavy", 4]];
  const cols = el("div", "pv-cols");
  const left = el("div", "pv-col");
  const right = el("div", "pv-col");
  left.append(scale(`Dimension grid \u2014 ${theme.dims.grid.length} steps`, theme.dims.grid.map((px) => ({ ref: `dimension.${px}`, px })), "pv-rows"));
  right.append(
    scale("Border width", BW.map(([k, px]) => ({ ref: `border-width.${k}`, px })), "pv-rows"),
    scale("Icon size", theme.dims.icons.map((i) => ({ ref: `icon.size.${i.name}`, px: i.px })), "pv-rows")
  );
  cols.append(left, right);
  into.append(cols);
};
var paintBreakpointsPreview = (into) => {
  const ly = theme.layout;
  into.innerHTML = "";
  const ruler = el("div", "ly-ruler");
  const rulerMax = Math.max(...ly.breakpoints.map((b) => b.px), 1) * 1.06;
  for (const b of ly.breakpoints) {
    const tick = el("div", "ly-tick");
    tick.style.left = `${b.px / rulerMax * 100}%`;
    tick.append(el("span", "ly-tick-name", b.name), el("span", "ly-tick-px mono", `${b.px}px`));
    ruler.append(tick);
  }
  into.append(ruler);
  const table = el("table", "ly-table");
  const head = el("tr");
  head.append(el("th", void 0, "Breakpoint"), el("th", void 0, "Token"), el("th", void 0, "Min-width"), el("th", void 0, "Columns"), el("th", void 0, "Gutter"), el("th", void 0, "Margin"));
  table.append(head);
  for (const g of ly.grid) {
    const bp = ly.breakpoints.find((b) => b.name === g.bp);
    const tr = el("tr");
    const pillCell = el("td");
    pillCell.append(tokenPill(`breakpoint.${g.bp}`));
    tr.append(el("td", "mono", g.bp), pillCell, el("td", "mono", `${bp?.px ?? 0}px`), el("td", "mono", String(g.columns)), el("td", "mono", `${g.gutterPx}px`), el("td", "mono", `${g.marginPx}px`));
    table.append(tr);
  }
  const scroll = el("div", "ly-tscroll");
  scroll.append(table);
  into.append(scroll);
};
var paintColumnsPreview = (into) => {
  const ly = theme.layout;
  into.innerHTML = "";
  into.append(el("div", "ly-cap", `${ly.baseColumns}-column base grid`));
  const cols = el("div", "ly-cols");
  for (let i = 0; i < ly.baseColumns; i++) cols.append(el("div", "ly-col"));
  into.append(cols);
};
var perBreakpointColsNote = () => el(
  "p",
  "ic-modenote",
  "Each breakpoint\u2019s columns default to the base ladder (smallest 4, next 8, up to the base); gutter and margin default to their own ladders. Override one to pin its value for that breakpoint only; choose Auto to return it to the ladder. Columns are held to 4\u201324. Gutter and margin snap to the spacing scale \u2014 the menu runs down to 4px \u2014 so each stays a real spacing step and keeps aliasing the space tokens."
);
var paintPerBreakpointGrid = (into) => {
  const ly = theme.layout;
  const overrides = brandState.layout?.columnOverrides ?? {};
  const spaceSteps = theme.dims.space.map((s) => s.px);
  into.innerHTML = "";
  const table = el("table", "ly-table");
  const head = el("tr");
  head.append(el("th", void 0, "Breakpoint"), el("th", void 0, "Columns"), el("th", void 0, "Gutter"), el("th", void 0, "Margin"), el("th", void 0, "Override"));
  table.append(head);
  const gapEditor = (bp, field, resolvedPx, roAttr, selAttr) => {
    const cur = (brandState.layout?.[field] ?? {})[bp];
    const ro = el("div", "mono", `${resolvedPx}px`);
    ro.dataset[roAttr] = bp;
    const sel = selectEl("cap");
    sel.dataset[selAttr] = bp;
    sel.append(optionEl("auto", "Auto", cur === void 0));
    for (const px of spaceSteps) sel.append(optionEl(String(px), `${px}px`, cur === px));
    sel.onchange = () => {
      const next = { ...brandState.layout?.[field] ?? {} };
      if (sel.value === "auto") delete next[bp];
      else next[bp] = Number(sel.value);
      if (Object.keys(next).length) setPath2(brandState, `layout.${field}`, next);
      else if (brandState.layout) delete brandState.layout[field];
      apply();
    };
    const cell = el("td");
    cell.append(ro, sel);
    return cell;
  };
  for (const g of ly.grid) {
    const tr = el("tr");
    const colCell = el("td", "mono", String(g.columns));
    colCell.dataset.bpcol = g.bp;
    const sel = selectEl("cap");
    sel.dataset.bpsel = g.bp;
    const cur = overrides[g.bp];
    sel.append(optionEl("auto", "Auto", cur === void 0));
    for (const c of LAYOUT_COLUMN_CHOICES) sel.append(optionEl(String(c), String(c), cur === c));
    sel.onchange = () => {
      const next = { ...brandState.layout?.columnOverrides ?? {} };
      if (sel.value === "auto") delete next[g.bp];
      else next[g.bp] = Number(sel.value);
      if (Object.keys(next).length) setPath2(brandState, "layout.columnOverrides", next);
      else if (brandState.layout) delete brandState.layout.columnOverrides;
      apply();
    };
    const editCell = el("td");
    editCell.append(sel);
    tr.append(
      el("td", "mono", g.bp),
      colCell,
      gapEditor(g.bp, "gutterOverrides", g.gutterPx, "bpgut", "bpgutsel"),
      gapEditor(g.bp, "marginOverrides", g.marginPx, "bpmar", "bpmarsel"),
      editCell
    );
    table.append(tr);
  }
  const scroll = el("div", "ly-tscroll");
  scroll.append(table);
  into.append(scroll);
};
var paintContainersPreview = (into) => {
  const ly = theme.layout;
  into.innerHTML = "";
  const cont = el("div", "ly-cont");
  const viewport = Math.max(...ly.breakpoints.map((b) => b.px), ly.containerMax, 1);
  const bar = (path, px, label) => {
    const row = el("div", "ly-cont-row");
    const track = el("div", "ly-cont-track");
    const b = el("div", "ly-cont-bar");
    b.style.width = `${Math.max(6, Math.min(100, px / viewport * 100))}%`;
    track.append(b);
    const lab = el("div", "ly-cont-lab");
    lab.append(tokenPill(path), el("span", "ly-cont-val mono", label));
    row.append(lab, track);
    return row;
  };
  cont.append(
    bar("container.fluid", viewport, "100%"),
    bar("container.max", ly.containerMax, `${ly.containerMax}px`),
    bar("container.narrow", ly.containerNarrow, `${ly.containerNarrow}px`)
  );
  into.append(el("div", "ly-cap", `Relative widths at a ${viewport}px viewport \u2014 the widest breakpoint.`));
  into.append(cont);
};
var paintFluidPreview = (into) => {
  const ty = theme.typography;
  into.innerHTML = "";
  const seen = /* @__PURE__ */ new Set();
  const uniq = ty.composites.filter((c) => c.sizeMinPx !== c.sizePx).filter((c) => {
    const k = `${c.group}.${c.variant}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (!uniq.length) {
    into.append(el("p", "sl-note", "Nothing is scaling right now \u2014 every style resolves to a single size across the whole viewport range. Turn on fluid heading sizing to see the mobile floor and the generated clamp() for each style that scales."));
    return;
  }
  into.append(subHead(`What fluid does \u2014 ${uniq.length} scaling styles`));
  const maxPx = Math.max(...uniq.map((c) => c.sizePx));
  const list = el("div", "fz-list");
  for (const c of uniq) {
    const row = el("div", "fz-row");
    row.append(el("span", "fz-name mono", `${c.group}.${c.variant}`), el("span", "fz-pair mono", `${c.sizeMinPx} \u2192 ${c.sizePx}px`));
    const right = el("div", "fz-right");
    const bar = el("div", "fz-bar");
    const fill = el("div", "fz-fill");
    fill.style.left = `${c.sizeMinPx / maxPx * 100}%`;
    fill.style.width = `${(c.sizePx - c.sizeMinPx) / maxPx * 100}%`;
    bar.append(fill);
    const slope = (c.sizePx - c.sizeMinPx) / (ty.maxViewport - ty.minViewport);
    const intercept = (c.sizeMinPx - slope * ty.minViewport) / 16;
    const clamp = `clamp(${+(c.sizeMinPx / 16).toFixed(4)}rem, ${+intercept.toFixed(4)}rem + ${+(slope * 100).toFixed(4)}vw, ${+(c.sizePx / 16).toFixed(4)}rem)`;
    const cl = el("div", "fz-clamp mono", clamp);
    cl.title = clamp;
    right.append(bar, cl);
    row.append(right);
    list.append(row);
  }
  into.append(list);
  into.append(el("p", "sl-note", "The mobile floor is derived, not chosen: you set whether headings scale and the viewport range, but the floor comes from a fixed curve \u2014 titles drop about one rung, display converges hard so hero type stays usable on a phone."));
  const byFloor = /* @__PURE__ */ new Map();
  for (const c of uniq) {
    const k = c.sizeMinPx;
    byFloor.set(k, [...byFloor.get(k) ?? [], `${c.group}.${c.variant}`]);
  }
  const merged = [...byFloor.entries()].filter(([, v]) => v.length > 1);
  if (merged.length) {
    const w = el("p", "fz-warn");
    w.append(el("b", void 0, "Sizes that merge on mobile. "));
    w.append(document.createTextNode(`${merged.map(([px, v]) => `${v.join(" + ")} all land on ${px}px`).join("; ")} \u2014 distinct on desktop, identical on a phone. Fine if deliberate; a sign of more display steps than the mobile curve can express if not.`));
    into.append(w);
  }
};
var motionStageSvg = (bez) => {
  const W = 100, H = 100, P = 11.364;
  const x = (t) => P + t * (W - 2 * P);
  const y = (v) => H - P - v * (H - 2 * P);
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("class", "mo-stage-svg");
  const axis = document.createElementNS(SVGNS, "path");
  axis.setAttribute("d", `M${x(0)},${y(1)} L${x(0)},${y(0)} L${x(1)},${y(0)}`);
  axis.setAttribute("class", "mo-stage-axis");
  axis.setAttribute("fill", "none");
  const [x1, y1, x2, y2] = bez.length === 4 ? bez : [0.4, 0, 0.2, 1];
  const line = document.createElementNS(SVGNS, "path");
  line.setAttribute("d", `M${x(0)},${y(0)} C${x(x1)},${y(y1)} ${x(x2)},${y(y2)} ${x(1)},${y(1)}`);
  line.setAttribute("class", "mo-stage-line");
  line.setAttribute("fill", "none");
  svg.append(axis, line);
  return svg;
};
var MOTION_SLOWMO_OPTIONS = [1, 2, 4, 8];
var motionSlowmo = 4;
var renderMotionSpecimen = () => {
  const mo = theme.motion;
  const moByMode = mo.motionByMode?.[currentMode];
  const durOf = (role) => (moByMode?.duration ?? mo.duration)[role] ?? 0;
  const tempoLabel = moByMode?.tempo ?? mo.tempo;
  const wrap = palSection("Motion", `The semantic transitions at tempo '${tempoLabel}' \u2014 each stage traces the resolved duration + easing curve. Playback below is a legibility aid only (the ms label is always the real token value); reduce-motion is honored (the engine also derives a reduced ramp).`);
  const toolbar = el("div", "mo-toolbar");
  const slowmoLabel = el("label", "mo-slowmo");
  slowmoLabel.append(document.createTextNode("Playback "));
  const select2 = viewOnly(el("select", "mo-slowmo-sel"));
  for (const v of MOTION_SLOWMO_OPTIONS) {
    const opt = el("option", void 0, v === 1 ? "real speed" : `1/${v}\xD7`);
    opt.value = String(v);
    if (v === motionSlowmo) opt.selected = true;
    select2.append(opt);
  }
  select2.onchange = () => {
    motionSlowmo = Number(select2.value) || 1;
    paintVolatile();
  };
  slowmoLabel.append(select2);
  toolbar.append(slowmoLabel);
  wrap.append(toolbar);
  const grid = el("div", "mo-grid");
  const dots = [];
  for (const t of mo.transitions) {
    const ms = durOf(t.duration);
    const playMs = ms * motionSlowmo;
    const curveBez = mo.easing[t.easing] ?? mo.easing.standard;
    const bez = `cubic-bezier(${curveBez.join(", ")})`;
    const anim = `mo-trace-x ${playMs}ms linear both, mo-trace-y ${playMs}ms ${bez} both`;
    const col = el("div", "mo-col");
    const stage = el("div", "mo-stage");
    stage.append(motionStageSvg(curveBez));
    const dot = el("div", "mo-dot");
    dot.style.animation = anim;
    stage.append(dot);
    dots.push({ el: dot, anim });
    col.append(stage);
    const meta = el("div", "mo-colmeta");
    meta.append(el("div", "mo-colname", t.name));
    const metaRow = el("div", "spec-metarow");
    metaRow.append(tokenPillWrapping(`motion.transition.${t.name}`), el("span", "mo-meta mono", `${ms}ms \xB7 ${t.easing}`), tokenPill(`motion.duration.${t.duration}`), tokenPill(`motion.easing.${t.easing}`));
    meta.append(metaRow);
    if (motionSlowmo > 1) meta.append(el("div", "mo-playnote mono", `playing at ${playMs}ms (1/${motionSlowmo}\xD7)`));
    meta.append(el("div", "mo-coldesc", t.desc));
    col.append(meta);
    grid.append(col);
  }
  wrap.append(grid);
  const replay = el("button", "mo-replay", "Replay");
  replay.onclick = () => {
    for (const d of dots) {
      d.el.style.animation = "none";
      void d.el.offsetWidth;
      d.el.style.animation = d.anim;
    }
  };
  wrap.append(replay);
  return wrap;
};
var NEUTRAL_EMPHASES = [["subtle", "subtle \xB7 light gray"], ["strong", "strong \xB7 bold fill"]];
var DEFAULT_GRADIENT = () => ({
  name: "brand",
  kind: "linear",
  angle: 135,
  interpolation: "oklch",
  stops: [{ palette: "primary", step: 600, position: 0 }, { palette: "primary", step: 350, position: 1 }]
});
var readGradients = () => {
  const g = brandState.gradients;
  if (Array.isArray(g)) return g;
  if (g === true) return [DEFAULT_GRADIENT()];
  return [];
};
var writeGradients = (arr) => {
  brandState.gradients = arr.length ? arr : false;
  applyFull();
};
var gradStopHex = (palette, step) => theme.palettes.find((p) => p.palette === palette)?.steps.find((s) => s.num === step)?.hex ?? "#888888";
var inputGradientCss = (g) => {
  const stops = g.stops.slice().sort((a, b) => a.position - b.position).map((s) => `${gradStopHex(s.palette, s.step)} ${Math.round(s.position * 100)}%`).join(", ");
  const interp = g.interpolation ?? "oklch";
  return (g.kind ?? "linear") === "radial" ? `radial-gradient(${g.shape ?? "ellipse"} at ${Math.round((g.center?.[0] ?? 0.5) * 100)}% ${Math.round((g.center?.[1] ?? 0.5) * 100)}% in ${interp}, ${stops})` : `linear-gradient(${g.angle ?? 135}deg in ${interp}, ${stops})`;
};
var renderGradientsSection = (host) => {
  const on = !!brandState.gradients;
  const desc = leverByKey("gradients")?.description ?? "Ship one or more decorative brand gradients (opt-in). Stop colors alias the ramp and interpolate in OKLCH.";
  host.append(knob("Gradients", toggleField(on, (checked) => {
    brandState.gradients = checked;
    applyFull();
  }), desc));
  if (!on) return;
  const grads = readGradients();
  const palNames = theme.palettes.map((p) => p.palette);
  const grid = el("div", "gr-ed-list");
  grads.forEach((g, gi) => grid.append(renderGradientCard(g, gi, grads, palNames)));
  host.append(grid);
  const add = addButton("+ Add gradient", () => {
    const arr = readGradients();
    const used = new Set(arr.map((x) => x.name));
    let n = arr.length + 1, name = `gradient-${n}`;
    while (used.has(name)) name = `gradient-${++n}`;
    arr.push({ ...DEFAULT_GRADIENT(), name });
    writeGradients(arr);
  }, "gr-ed-add");
  host.append(add);
};
var renderGradientCard = (g, gi, all, palNames) => {
  const kind = g.kind ?? "linear";
  const card = el("div", "gr-ed-card");
  const head = el("div", "gr-ed-head");
  const nameInput = el("input", "gr-ed-nameinput");
  nameInput.value = g.name;
  nameInput.setAttribute("aria-label", "Gradient name");
  nameInput.onchange = () => {
    let v = nameInput.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!v) {
      nameInput.value = g.name;
      return;
    }
    const used = new Set(all.filter((_, i) => i !== gi).map((x) => x.name));
    while (used.has(v)) v = `${v}-2`;
    const arr = readGradients();
    arr[gi] = { ...arr[gi], name: v };
    writeGradients(arr);
  };
  head.append(nameInput, tokenPill(`gradient.${g.name}`));
  head.append(removeButton(() => {
    const arr = readGradients();
    arr.splice(gi, 1);
    writeGradients(arr);
  }, "Remove gradient"));
  card.append(head);
  const sw = el("div", "gr-ed-sw");
  sw.style.background = inputGradientCss(g);
  card.append(sw);
  const ctrls = el("div", "gr-ed-ctrls");
  const mut = (fn) => {
    const arr = readGradients();
    fn(arr[gi]);
    writeGradients(arr);
  };
  const labeledSelect = (label, opts, cur, onPick) => {
    const wrap = el("div", "gr-ed-field");
    wrap.append(el("label", "gr-ed-lab", label));
    const sel = selectEl("cap");
    for (const [v, t] of opts) sel.append(optionEl(v, t, v === cur));
    sel.onchange = () => onPick(sel.value);
    wrap.append(sel);
    return wrap;
  };
  ctrls.append(labeledSelect("Kind", [["linear", "Linear"], ["radial", "Radial"]], kind, (v) => mut((gg) => {
    gg.kind = v;
  })));
  if (kind === "linear") {
    const f = el("div", "gr-ed-field");
    f.append(el("label", "gr-ed-lab", `Angle \xB7 ${g.angle ?? 135}\xB0`));
    const range = rangeInput({ className: "gr-ed-range", min: 0, max: 360, step: 5, value: g.angle ?? 135 });
    range.oninput = () => {
      f.firstChild.textContent = `Angle \xB7 ${range.value}\xB0`;
      sw.style.background = inputGradientCss({ ...g, angle: Number(range.value) });
    };
    range.onchange = () => mut((gg) => {
      gg.angle = Number(range.value);
    });
    f.append(range);
    ctrls.append(f);
  } else {
    ctrls.append(labeledSelect("Shape", [["ellipse", "Ellipse"], ["circle", "Circle"]], g.shape ?? "ellipse", (v) => mut((gg) => {
      gg.shape = v;
    })));
    const center = g.center ?? [0.5, 0.5];
    const centerField = (label, idx) => {
      const f = el("div", "gr-ed-field");
      f.append(el("label", "gr-ed-lab", label));
      const num = numberField({ className: "gr-ed-num", min: 0, max: 100, step: 5, value: Math.round(center[idx] * 100) });
      num.onchange = () => mut((gg) => {
        const c = [...gg.center ?? [0.5, 0.5]];
        c[idx] = clampUnit(Number(num.value) / 100);
        gg.center = c;
      });
      f.append(num);
      return f;
    };
    ctrls.append(centerField("Center X %", 0), centerField("Center Y %", 1));
  }
  ctrls.append(labeledSelect("Interpolation", [["oklch", "OKLCH"], ["srgb", "sRGB"]], g.interpolation ?? "oklch", (v) => mut((gg) => {
    gg.interpolation = v;
  })));
  card.append(ctrls);
  card.append(el("h5", "gr-ed-stopsh", "Stops"));
  const stopsWrap = el("div", "gr-ed-stops");
  g.stops.forEach((st, si) => stopsWrap.append(renderGradientStop(g, gi, st, si, palNames, mut)));
  card.append(stopsWrap);
  const addStop = addButton("+ Add stop", () => mut((gg) => {
    const last = gg.stops[gg.stops.length - 1];
    gg.stops = [...gg.stops, { palette: last?.palette ?? palNames[0], step: last?.step ?? 500, position: 1 }];
  }), "gr-ed-addstop");
  card.append(addStop);
  return card;
};
var renderGradientStop = (g, gi, st, si, palNames, mut) => {
  const row = el("div", "gr-ed-stop");
  row.append(swatch(gradStopHex(st.palette, st.step), "gr-ed-stopsw"));
  const palSel = selectEl("fill");
  for (const p of palNames) palSel.append(optionEl(p, p, p === st.palette));
  palSel.onchange = () => mut((gg) => {
    const steps2 = theme.palettes.find((p) => p.palette === palSel.value)?.steps ?? [];
    const keep = steps2.find((s) => s.num === gg.stops[si].step)?.num ?? steps2.find((s) => s.num === 500)?.num ?? steps2[Math.floor(steps2.length / 2)]?.num ?? gg.stops[si].step;
    gg.stops[si] = { ...gg.stops[si], palette: palSel.value, step: keep };
  });
  const stepSel = selectEl("fill");
  const steps = theme.palettes.find((p) => p.palette === st.palette)?.steps ?? [];
  for (const s of steps) stepSel.append(optionEl(String(s.num), s.key, s.num === st.step));
  stepSel.onchange = () => mut((gg) => {
    gg.stops[si] = { ...gg.stops[si], step: Number(stepSel.value) };
  });
  const pos = numberField({ className: "gr-ed-num", min: 0, max: 100, step: 5, value: Math.round(st.position * 100), title: "Position %" });
  pos.onchange = () => mut((gg) => {
    gg.stops[si] = { ...gg.stops[si], position: clampUnit(Number(pos.value) / 100) };
  });
  row.append(palSel, stepSel, pos);
  if (g.stops.length > 2) {
    row.append(removeButton(() => mut((gg) => {
      gg.stops = gg.stops.filter((_, i) => i !== si);
    }), "Remove stop", "gr-ed-stoprm"));
  }
  return row;
};
var clampUnit = (n) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
var SVGNS = "http://www.w3.org/2000/svg";
var ICON_PATH = {
  bell: '<path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>',
  arrow: '<path d="M5 12h13M12 6l6 6-6 6"/>',
  search: '<circle cx="11" cy="11" r="7"/><line x1="20.5" y1="20.5" x2="16" y2="16"/>',
  dot: '<circle cx="12" cy="12" r="8"/>',
  star: '<path d="M12 3l2.6 5.6 6 .7-4.4 4.1 1.2 6L12 16.9 6.6 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5 5-5.5"/>',
  triangle: '<path d="M12 4l9 16H3z"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="12" y1="17" x2="12" y2="17.01"/>',
  x: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12" y2="8.01"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>'
};
var iconEl = (name, stroke) => {
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "22");
  svg.setAttribute("height", "22");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", stroke);
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.innerHTML = ICON_PATH[name] ?? ICON_PATH.dot;
  return svg;
};
var hero = (title, lede) => {
  const h = el("div", "hero");
  if (title) h.append(hook(el("h1", void 0, title), "page-title"));
  if (lede) h.append(el("p", "lede", lede));
  return h;
};
var app;
var mountApp = (root) => {
  app = root;
};
var workspace;
var modeStripHost;
var chromeHost;
var CHROME_SURFACES = [
  {
    key: "brand-bar",
    home: "root",
    views: ["app"],
    mount: () => {
      barHost = hook(el("div", "bar"), "bar");
      renderBar();
      return barHost;
    }
    // NO `sync`, deliberately. `renderBar()` rebuilds `barHost` wholesale, and that node holds the open
    // brand menu, the Pages menu and the export dialog — refreshing it on every knob edit would close
    // whatever the designer had open, mid-gesture. It re-renders on its own events instead (menu
    // toggles, apply state, brand load), which is the reason `sync` is optional at all.
  },
  {
    key: "error",
    home: "root",
    views: ["start", "app"],
    // THE SURFACE THIS MECHANISM IS NAMED AFTER (#388). It is the one entry scoped to every view, and
    // the start screen is in that list even though `lastError` is unreachable there today — nothing
    // calls `rebuild()` before an origin exists. Mounted anyway, because the EXEMPTION is what would
    // rot: the next pre-brand view that does touch the engine would inherit "no error surface" from a
    // list it never read, which is this ticket's defect with a different page in it. A hidden node
    // costs a div; the precedent costs the ticket. (Its own import validation stays where it is — see
    // the survey note in `renderStartScreen`.)
    mount: () => {
      globalErrHost = hook(el("div", "errbar errbar-global"), "error-bar");
      return globalErrHost;
    },
    sync: () => syncErrorBar()
  },
  {
    key: "apply-detail",
    home: "root",
    views: ["app"],
    // App-level write status, in the chrome for the same reason the error bar is (#483): a per-page or
    // popover home would either be forgotten by the next page or cover the CTA it describes. Minted
    // unconditionally — `renderApplyStatus` is plugin-only, so on web `applyState` stays null and the
    // sync keeps this hidden. Visibility is derived, never hardcoded at mount: page nav re-runs
    // `build()`, so a hardcoded "hidden" would collapse an open detail (and, one surface up, would drop
    // a live error the moment the user changed page — the hole #388 closed).
    mount: () => {
      applyDetailHost = hook(el("div", "applystat-detail"), "apply-detail");
      applyDetailHost.id = APPLY_DETAIL_ID;
      return applyDetailHost;
    },
    sync: () => syncApplyDetail()
  },
  {
    key: "mode-strip",
    home: "workspace",
    views: ["app"],
    // Page furniture, not header chrome (#432) — it scopes the CONTROLS, so it lives with them, and
    // this declaration does not move it back. What brings it into the list is its REFRESH, which was
    // hand-listed in `apply()`/`applyFull()` right beside `syncErrorBar()`: `currentMode`'s "on" state
    // and the derived-mode "view only" tag both track every edit. Its PLACEMENT stays in
    // `renderWorkspace`, which is the only code that knows where the page's hero (and, on Preview, its
    // view switcher) ended up — a position no declaration here could state.
    mount: () => {
      modeStripHost = el("div", "modebar");
      return modeStripHost;
    },
    sync: () => renderModeStrip(),
    // See `syncLast`. Since #771 this surface is also a reconcilable REGION, so its refresh has to come
    // after the page it sits on has landed as well as after the rest of the pass.
    syncLast: true
  }
];
var mountSurfaces = (home, view, host) => {
  for (const s of CHROME_SURFACES) {
    if (s.home !== home || !s.views.includes(view)) continue;
    if (host.querySelector(`:scope > [data-chrome="${s.key}"]`)) continue;
    const node = s.mount();
    node.setAttribute("data-chrome", s.key);
    host.append(node);
  }
};
var syncChrome = () => {
  for (const s of CHROME_SURFACES) if (!s.syncLast) s.sync?.();
  for (const s of CHROME_SURFACES) if (s.syncLast) s.sync?.();
};
var chromeRoster = (view) => CHROME_SURFACES.filter((s) => s.views.includes(view)).map((s) => s.key);
var mountView = (view, body) => {
  app.innerHTML = "";
  document.documentElement.dataset.chromeRoster = chromeRoster(view).join(" ");
  const chrome = el("header", "chrome");
  chromeHost = chrome;
  mountSurfaces("root", view, chrome);
  app.append(chrome, body());
  syncChrome();
  syncChromeHeight();
};
var chromedWorkspace = (ws) => {
  const missing = (document.documentElement.dataset.chromeRoster ?? "").split(" ").filter((k) => k && !document.querySelector(`[data-chrome="${k}"]`));
  if (missing.length) {
    console.error(`page chrome missing: ${missing.join(", ")} \u2014 an engine error may not be visible on this page (#772)`);
  }
  return ws;
};
var pageHasModeVaryingControl = () => {
  if (page === "layout") return false;
  if (page === "components") return false;
  if (page === "palettes") return false;
  if (page === "typography") return false;
  if (page === "preview") return previewView === "styleguide";
  return true;
};
function renderModeStrip() {
  if (!modeStripHost) return;
  modeStripHost.innerHTML = "";
  if (!firstRun() && pageHasModeVaryingControl()) modeStripHost.append(renderModeContext());
  modeStripHost.style.display = modeStripHost.childElementCount ? "" : "none";
  syncChromeHeight();
}
function syncChromeHeight() {
  if (chromeHost) document.documentElement.style.setProperty("--chrome-h", `${chromeHost.offsetHeight}px`);
}
var PAGE_RENDERERS = {
  palettes: renderPrimitives,
  surfaces: renderSurfacesPage,
  interactive: renderInteractivePage,
  typography: renderTypographyPage,
  elevation: renderElevationPage,
  sizeRadius: renderSizeRadiusPage,
  layout: renderLayoutPage,
  motion: renderMotionPage,
  preview: renderPreviewPage,
  styleGuide: renderStyleGuidePage,
  components: renderComponentsPage
};
var attachModeBadges = (root) => {
  if (!pageHasModeVaryingControl()) return;
  for (const sec of [...root.querySelectorAll(".psec")]) {
    if (sec.querySelector(".msb")) continue;
    const title = sec.querySelector(".psec-t")?.textContent?.trim();
    const scope = title ? SECTION_MODE_SCOPE[title] : void 0;
    if (!scope) continue;
    const hasControls = sec.querySelector(TOKEN_CONTROL_SEL) !== null;
    let head = sec.querySelector(".psec-head") ?? sec.querySelector(".psec-h");
    if (!head) {
      const built = el("div", "psec-head"), txt = el("div", "psec-txt");
      for (const n of [...sec.children])
        if (n.classList.contains("psec-t") || n.classList.contains("psec-d")) txt.append(n);
      built.append(txt);
      sec.prepend(built);
      head = built;
    }
    head.append(modeScopeBadge(scope, hasControls));
  }
};
var regionKey = (n, seen) => {
  const base = n.classList.contains("psec") ? `psec:${n.querySelector(".psec-t")?.textContent?.trim() ?? ""}` : `${n.tagName}.${n.className}`;
  const nth = (seen.get(base) ?? 0) + 1;
  seen.set(base, nth);
  return nth === 1 ? base : `${base}#${nth}`;
};
var regionSignature = (n) => {
  const live = [];
  for (const c of n.querySelectorAll("input,select,textarea")) {
    if (c instanceof HTMLSelectElement) live.push(`s${c.selectedIndex}${c.value}`);
    else if (c instanceof HTMLInputElement) live.push(`i${c.value}${c.checked ? 1 : 0}`);
    else live.push(`t${c.value}`);
  }
  return JSON.stringify(live) + n.outerHTML;
};
var carryDisclosure = (from, to) => {
  const a = from.querySelectorAll("details"), b = to.querySelectorAll("details");
  if (a.length !== b.length) return;
  for (let i = 0; i < a.length; i++) b[i].open = a[i].open;
};
var reconcileRegions = (host, want) => {
  const seen = /* @__PURE__ */ new Map();
  const live = /* @__PURE__ */ new Map();
  for (const n of [...host.children]) live.set(regionKey(n, seen), n);
  const keys = /* @__PURE__ */ new Map();
  let kept = 0, swapped = 0;
  let ref = host.firstElementChild;
  for (const fresh of want) {
    const key = regionKey(fresh, keys);
    const prev = live.get(key);
    live.delete(key);
    let place = fresh;
    if (prev === fresh) {
      place = prev;
      kept++;
    } else if (prev && !volatileHosts.some((h) => fresh === h || fresh.contains(h))) {
      const before = regionSignature(prev);
      carryDisclosure(prev, fresh);
      if (before === regionSignature(fresh)) {
        place = prev;
        kept++;
      } else swapped++;
    } else swapped++;
    if (place === ref) {
      ref = ref.nextElementSibling;
      continue;
    }
    if (prev && prev === ref) {
      ref = ref.nextElementSibling;
      prev.replaceWith(place);
      continue;
    }
    host.insertBefore(place, ref);
    if (prev && prev !== place) prev.remove();
  }
  for (const gone of live.values()) gone.remove();
  return { kept, swapped };
};
function renderWorkspace() {
  mountSurfaces("workspace", "app", workspace);
  const staged = el("div");
  PAGE_RENDERERS[page](chromedWorkspace(staged));
  attachModeBadges(staged);
  const regions = [...staged.children];
  const heroAt = regions.findIndex((n) => n.classList.contains("hero"));
  let barAt = heroAt < 0 ? 0 : heroAt + 1;
  if (heroAt >= 0 && regions[barAt]?.classList.contains("pvseg")) barAt++;
  regions.splice(barAt, 0, ...workspace.querySelectorAll(":scope > [data-chrome]"));
  reconcileRegions(workspace, regions);
  syncChrome();
  syncStuck();
}
function syncStuck() {
  if (!modeStripHost) return;
  const chromeH = chromeHost?.offsetHeight ?? 0;
  modeStripHost.classList.toggle("stuck", modeStripHost.getBoundingClientRect().top <= chromeH + 0.5);
}
var stuckBound = false;
var bindStuck = () => {
  if (stuckBound) return;
  stuckBound = true;
  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      syncStuck();
    });
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll, { passive: true });
};
var barHost;
var brandMenuOpen = false;
var exportMenuOpen = false;
var navMenuOpen = false;
var exportArtifact = "dtcg";
var exportSettings = defaultSettings();
var exportSource = "generated";
var importOpen = false;
var importErr = null;
var importText = "";
var pendingLoad = null;
var outsideBound = false;
var loadBrand = (input, origin) => {
  loadInput(input, origin);
  brandMenuOpen = false;
  importOpen = false;
  importErr = null;
  importText = "";
  pendingLoad = null;
  build();
};
var setModes = (dark, hc, wire) => {
  const m = ["light"];
  if (dark) m.push("dark");
  if (hc) {
    m.push("hc-light");
    if (dark) m.push("hc-dark");
  }
  if (wire) m.push("wireframe");
  brandState.modes = m;
  rebuild();
  if (!rp.modes.includes(currentMode)) setCurrentMode(rp.modes[0]);
  build();
};
var download = (filename, text, mime) => {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
var slug = () => String(lastGoodInput.id || "brand").trim().replace(/\s+/g, "-") || "brand";
var exportDesignMd = () => download(`${slug()}.design.md`, toDesignMd(lastGoodInput), "text/markdown");
var exportTokens = () => {
  ensureThemeFresh();
  const tree = buildTree(theme).tree;
  for (const file of projectDtcg(tree, slug(), exportSettings)) {
    download(file.name, file.text, "application/json");
  }
};
var MD_FILE_RE = /\.(md|markdown|txt)$/i;
var IMPORT_ACCEPT = ".md,.markdown,.txt,text/markdown,text/plain";
var validateDesignMd = (text) => {
  if (!text.trim()) return { error: "Nothing to import \u2014 the file is empty." };
  let std;
  try {
    std = parseStandardDesignMd(text);
  } catch (e) {
    return { error: `That doesn't read as a design.md: ${e.message}` };
  }
  const isStandard = isStandardDesignMd(std);
  let input;
  if (isStandard) {
    try {
      input = standardToBrandInput(std).input;
    } catch (e) {
      return { error: `Parsed as a standard-dialect design.md, but couldn't classify '${std.name}': ${e.message}` };
    }
  } else {
    try {
      input = parseDesignMd(text).input;
    } catch (e) {
      return { error: `That doesn't read as a design.md: ${e.message}` };
    }
  }
  try {
    brandTheme(input);
  } catch (e) {
    return { error: `Parsed, but the engine rejected it: ${e.message}` };
  }
  return { input };
};
var readDesignMdFile = (file) => {
  const okType = MD_FILE_RE.test(file.name) || /^text\//.test(file.type || "");
  if (!okType) return Promise.resolve({ error: `That's not a design.md \u2014 upload a .md file (got "${file.name}").` });
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve({ text: String(r.result ?? "") });
    r.onerror = () => resolve({ error: `Couldn't read "${file.name}".` });
    r.readAsText(file);
  });
};
var stageImport = (text) => {
  importText = text;
  const res = validateDesignMd(text);
  if ("error" in res) {
    importErr = res.error;
    pendingLoad = null;
    renderBar();
    return;
  }
  importErr = null;
  stageLoad(res.input, { kind: "import", label: String(res.input.id ?? "design.md") });
};
var stageLoad = (input, origin) => {
  if (!needsOverwriteConfirm(brandState, provenance)) {
    loadBrand(input, origin);
    return;
  }
  pendingLoad = { input, origin };
  renderBar();
};
var originLabel = (o, where) => {
  switch (o.kind) {
    case "none":
      return "this brand";
    case "example":
      return `the ${o.id} example`;
    case "new":
      return where === "arriving" ? "a new brand" : "this new brand";
    case "import":
      return `\u201C${o.label}\u201D`;
    case "file":
      return "this file\u2019s brand";
  }
};
var renderOverwriteConfirm = (pending) => {
  const box = el("div", "bm-import");
  box.append(hook(el("p", "bm-confirm", `Replace the current brand with ${originLabel(pending.origin, "arriving")}? Your edits to ${originLabel(provenance.origin, "atRisk")} are not saved anywhere else.`), "overwrite-confirm"));
  const row = el("div", "bm-confirm-row");
  const rep = hook(el("button", "bm-load", "Replace brand"), "overwrite-replace");
  rep.onclick = () => {
    pendingLoad = null;
    loadBrand(pending.input, pending.origin);
  };
  const can = hook(el("button", "bm-cancel", "Cancel"), "overwrite-cancel");
  can.onclick = () => {
    pendingLoad = null;
    renderBar();
  };
  row.append(rep, can);
  box.append(row);
  return box;
};
var renderBrandMenu = () => {
  const menu = hook(el("div", "brandmenu"), "brand-menu");
  menu.append(el("div", "bm-cap", "Current brand"));
  const field = (label, value, mono, role, oninput) => {
    const f = el("label", "bm-field");
    f.append(el("span", "bm-lab", label));
    const inp = hook(el("input", "bm-in" + (mono ? " mono" : "")), role);
    inp.value = value;
    inp.spellcheck = false;
    inp.oninput = () => oninput(inp.value, inp);
    f.append(inp);
    return f;
  };
  const isCurrentExample = (name) => name === brandState.id;
  const exampleItems = [];
  const markCurrentExample = () => {
    for (const [name, b] of exampleItems) b.classList.toggle("cur", isCurrentExample(name));
  };
  menu.append(field("Name", brandState.id, false, "brand-menu-name", (v) => {
    brandState.id = v.trim() || "untitled";
    barHost.querySelector(".bs-name").textContent = brandState.id;
    markCurrentExample();
    syncIdentity();
  }));
  const nsHint = el("p", "bm-hint");
  const setHint = () => {
    nsHint.textContent = `Tokens emit under ${brandState.root ?? "prism"}.*`;
  };
  menu.append(field("Namespace", brandState.root ?? "prism", true, "brand-menu-namespace", (v, inp) => {
    const t = v.trim();
    if (ROOT_RE.test(t)) {
      brandState.root = t;
      inp.classList.remove("bad");
      setHint();
      syncIdentity();
    } else inp.classList.add("bad");
  }));
  setHint();
  menu.append(nsHint);
  menu.append(el("div", "bm-div"));
  menu.append(el("div", "bm-cap", "Modes"));
  menu.append(renderModeSetMenu(renderBar, true));
  menu.append(el("div", "bm-div"));
  menu.append(el("div", "bm-cap", "Examples"));
  for (const name of Object.keys(BRANDS)) {
    const b = hook(el("button", "bm-item" + (isCurrentExample(name) ? " cur" : "")), "brand-menu-example");
    exampleItems.push([name, b]);
    const d = el("span", "bm-dot");
    d.style.background = hex(oklchToRgb(BRANDS[name].primary));
    b.append(d, el("span", void 0, name));
    b.onclick = () => stageLoad(BRANDS[name], { kind: "example", id: name });
    menu.append(b);
  }
  if (pendingLoad?.origin.kind === "example") menu.append(renderOverwriteConfirm(pendingLoad));
  menu.append(el("div", "bm-div"));
  const nb = hook(el("button", "bm-item", "+ New brand"), "brand-menu-new");
  nb.onclick = () => {
    brandMenuOpen = false;
    clearOrigin();
    build();
  };
  menu.append(nb);
  const imp = hook(el("button", "bm-item", "\u2191 Import design.md\u2026"), "brand-menu-import");
  imp.onclick = () => {
    importOpen = !importOpen;
    importErr = null;
    pendingLoad = null;
    renderBar();
  };
  menu.append(imp);
  if (importOpen) menu.append(renderImportBox());
  return menu;
};
var renderImportBox = () => {
  if (pendingLoad?.origin.kind === "import") return renderOverwriteConfirm(pendingLoad);
  const box = el("div", "bm-import");
  const ta = hook(el("textarea", "bm-ta"), "import-text");
  ta.placeholder = "Paste a design.md \u2014 --- YAML frontmatter --- then prose\u2026";
  ta.spellcheck = false;
  ta.value = importText;
  ta.oninput = () => {
    importText = ta.value;
  };
  box.append(ta);
  if (importErr) box.append(el("p", "bm-err", importErr));
  const row = el("div", "bm-import-row");
  const up = el("label", "bm-upload");
  const fi = el("input", "bm-file");
  fi.type = "file";
  fi.accept = IMPORT_ACCEPT;
  fi.onchange = async () => {
    const f = fi.files?.[0];
    if (!f) return;
    const read = await readDesignMdFile(f);
    if ("error" in read) {
      importErr = read.error;
      pendingLoad = null;
      renderBar();
      return;
    }
    stageImport(read.text);
  };
  up.append(el("span", void 0, "\u2191 Upload .md"), fi);
  const load = hook(el("button", "bm-load", "Load"), "import-load");
  load.onclick = () => stageImport(ta.value);
  row.append(up, load);
  box.append(row);
  return box;
};
var renderExportDialog = () => {
  const wrap = el("div", "exdlg-scrim");
  const dlg = hook(el("div", "exdlg"), "export-dialog");
  dlg.setAttribute("role", "dialog");
  dlg.setAttribute("aria-modal", "true");
  dlg.setAttribute("aria-label", "Export");
  const head = el("div", "exdlg-head");
  head.append(el("h2", "exdlg-t", "Export"));
  const close = el("button", "exdlg-x", "\u2715");
  close.setAttribute("aria-label", "Close");
  close.onclick = () => {
    exportMenuOpen = false;
    renderBar();
  };
  head.append(close);
  dlg.append(head);
  const body = el("div", "exdlg-body");
  const left = el("div", "exdlg-col");
  const right = el("div", "exdlg-out");
  const seg = el("div", mix("seg", "exdlg-seg"));
  for (const a of ARTIFACTS) {
    const b = el("button", "seg-b" + (a.id === exportArtifact ? " on" : ""), a.label);
    b.setAttribute("aria-pressed", String(a.id === exportArtifact));
    b.onclick = () => {
      exportArtifact = a.id;
      renderBar();
    };
    seg.append(b);
  }
  left.append(seg);
  const artifact = ARTIFACTS.find((a) => a.id === exportArtifact);
  left.append(el("p", "exdlg-desc", artifact.desc));
  const settings = visibleSettings(exportArtifact, exportSource);
  if (settings.length) {
    left.append(el("div", "exdlg-div"));
    for (const s of settings) {
      const row = el("div", "exdlg-set");
      row.append(el("div", "exdlg-lab", s.label));
      const sseg = el("div", mix("seg", "exdlg-oseg"));
      for (const o of s.options) {
        const on = exportSettings[s.key] === o.value;
        const b = el("button", "seg-b" + (on ? " on" : ""), o.label);
        b.setAttribute("aria-pressed", String(on));
        b.setAttribute("aria-label", `${s.label}: ${o.label}`);
        b.onclick = () => {
          exportSettings = { ...exportSettings, [s.key]: o.value };
          renderBar();
        };
        sseg.append(b);
      }
      row.append(sseg);
      row.append(el("p", "exdlg-sdesc", s.desc));
      left.append(row);
    }
  } else {
    left.append(el("p", "exdlg-none", "Nothing to set \u2014 the brief is written one way."));
  }
  body.append(left);
  if (exportArtifact === "dtcg") {
    ensureThemeFresh();
    const tree = buildTree(theme).tree;
    const files = fileNames(tree, slug(), exportSettings);
    right.append(el("div", "exdlg-cap", files.length === 1 ? "You get 1 file" : `You get ${files.length} files`));
    const list = el("p", "exdlg-files");
    list.textContent = files.length <= 4 ? files.join("\n") : `${files.slice(0, 3).join("\n")}
+${files.length - 3} more`;
    list.title = files.join("\n");
    right.append(list);
    right.append(el("div", "exdlg-cap", "A few tokens, shaped by these settings"));
    const prev = previewFiles(tree, slug(), exportSettings);
    const box = el("div", "exdlg-prevs");
    for (const f of prev) {
      if (prev.length > 1) box.append(el("div", "exdlg-pname", f.name));
      const pre = el("pre", "exdlg-pre");
      pre.textContent = f.text;
      box.append(pre);
    }
    right.append(box);
  } else {
    right.append(el("div", "exdlg-cap", "You get 1 file"));
    right.append(el("p", "exdlg-files", `${slug()}.design.md`));
    right.append(el("p", "exdlg-sdesc", "A handful of anchors \u2014 the color, the type, the few decisions this brand is built from. The engine regrows the rest."));
  }
  body.append(right);
  dlg.append(body);
  const foot = el("div", "exdlg-foot");
  const go = hook(el("button", "exdlg-go"), "dialog-confirm");
  go.textContent = exportArtifact === "design-md" ? "\u2193 Download brief" : "\u2193 Download tokens";
  go.onclick = () => {
    exportMenuOpen = false;
    renderBar();
    if (exportArtifact === "design-md") exportDesignMd();
    else exportTokens();
  };
  const cancel = el("button", "bm-cancel", "Cancel");
  cancel.onclick = () => {
    exportMenuOpen = false;
    renderBar();
  };
  foot.append(cancel, go);
  dlg.append(foot);
  const slots = availableImportSlots();
  if (slots.length) {
    const imp = el("div", "exdlg-import");
    imp.append(el("div", "exdlg-div"));
    imp.append(el("div", "exdlg-cap", "Import"));
    for (const slot of slots) {
      const b = el("button", "bm-item", `\u2191 ${slot.label}\u2026`);
      b.onclick = () => {
        importOpen = !importOpen;
        importErr = null;
        pendingLoad = null;
        renderBar();
      };
      imp.append(b);
      imp.append(el("p", "exdlg-sdesc", slot.desc));
    }
    if (importOpen) imp.append(renderImportBox());
    dlg.append(imp);
  }
  wrap.onmousedown = (e) => {
    if (e.target === wrap) {
      exportMenuOpen = false;
      renderBar();
    }
  };
  wrap.append(dlg);
  return wrap;
};
var renderPruneDialog = () => {
  const p = prunePreview;
  const wrap = el("div", "exdlg-scrim");
  const dlg = hook(el("div", "exdlg"), "prune-dialog");
  dlg.setAttribute("role", "dialog");
  dlg.setAttribute("aria-modal", "true");
  dlg.setAttribute("aria-label", "Prune stale items");
  const head = el("div", "exdlg-head");
  head.append(el("h2", "exdlg-t", "Prune stale items"));
  const close = el("button", "exdlg-x", "\u2715");
  close.setAttribute("aria-label", "Close");
  close.onclick = () => {
    prunePreview = null;
    renderBar();
  };
  head.append(close);
  dlg.append(head);
  const col = el("div", "exdlg-col");
  col.append(el("p", "exdlg-desc", p.summary));
  dlg.append(col);
  const foot = el("div", "exdlg-foot");
  const cancel = el("button", "barbtn", "Cancel");
  cancel.onclick = () => {
    prunePreview = null;
    renderBar();
  };
  const del = hook(el("button", "exdlg-go", `Delete ${p.count} item${p.count === 1 ? "" : "s"}`), "dialog-confirm");
  del.onclick = () => {
    pruneBusy = "delete";
    prunePreview = null;
    renderBar();
    commit.postPrune(lastGoodInput, true);
  };
  foot.append(cancel, del);
  dlg.append(foot);
  wrap.onmousedown = (e) => {
    if (e.target === wrap) {
      prunePreview = null;
      renderBar();
    }
  };
  wrap.append(dlg);
  return wrap;
};
var componentPendingText = () => {
  const p = componentProgress;
  if (!p) return "Building the Button set\u2026";
  if (p.phase === "retry") return "Retrying property links\u2026";
  const label = p.phase === "build" ? "Building members" : "Wiring references";
  return `${label}\u2026 ${p.done} of ${p.total}`;
};
var componentPendingEls = /* @__PURE__ */ new Set();
function renderSeedPill(o) {
  if (o.state === "error") {
    const pill2 = hook(el("span", "bar-seed bad", o.message), "status-pill");
    pill2.title = o.message;
    return pill2;
  }
  if (o.state === "absent") return hook(el("span", "bar-seed", "No existing Prism3 theme in this file \u2014 start from the knobs."), "status-pill");
  const text = isUnrecoverable(o) ? `${o.detail} \u2014 knobs not stored in this file, so these are defaults` : o.detail;
  const pill = hook(el("span", "bar-seed" + (o.contractOk ? "" : " bad"), text), "status-pill");
  pill.title = text;
  return pill;
}
function renderApplyStatus(state, which) {
  const noun = which === "apply" ? "apply" : which === "filesetup" ? "file setup" : which === "styleguide" ? "style guide" : "component build";
  if (state === "pending") {
    if (which === "apply") return hook(el("span", "bar-seed", "Writing to Figma\u2026"), "status-pill");
    if (which === "filesetup") return hook(el("span", "bar-seed", "Setting up file\u2026"), "status-pill");
    if (which === "styleguide") return hook(el("span", "bar-seed", "Drawing the style guide\u2026"), "status-pill");
    const node = hook(el("span", "bar-seed", componentPendingText()), "status-pill");
    componentPendingEls.add(node);
    return node;
  }
  const open = openDetail === which;
  const cls = "applystat" + (state.ok ? " ok" : " bad") + (open ? " open" : "");
  const btn = hook(el("button", cls), "status-verdict");
  btn.append(document.createTextNode(state.headline), el("span", "caret", open ? "\u25B4" : "\u25BE"));
  btn.setAttribute("aria-expanded", open ? "true" : "false");
  btn.setAttribute("aria-controls", APPLY_DETAIL_ID);
  btn.setAttribute("aria-label", `${state.headline} \u2014 ${noun} details`);
  btn.onclick = () => {
    openDetail = open ? null : which;
    renderBar();
    syncApplyDetail();
  };
  return btn;
}
var APPLY_DETAIL_ID = "apply-detail";
var applyDetailHost = null;
var syncApplyDetail = () => {
  if (!applyDetailHost) return;
  const state = openDetail === "apply" ? applyState : openDetail === "components" ? componentState : openDetail === "filesetup" ? fileSetupState : openDetail === "styleguide" ? styleGuideState : null;
  const show = state !== null && state !== "pending";
  applyDetailHost.style.display = show ? "" : "none";
  if (show) applyDetailHost.textContent = state.summary;
  syncChromeHeight();
};
function renderBar() {
  barHost.innerHTML = "";
  const mark = el("div", "brandmark");
  mark.append(el("span", "logo"), el("span", "wordmark", "Prism3"), el("span", "studio", "Theme studio"));
  barHost.append(mark);
  const actions = el("div", "bar-actions");
  const bWrap = el("div", "barmenu-wrap");
  const sel = hook(el("button", "brandsel" + (brandMenuOpen ? " open" : "")), "brand-switcher");
  const dot = el("span", "dot");
  dot.style.background = hex(oklchToRgb(brandState.primary));
  sel.append(dot, el("span", "bs-name", brandState.id), el("span", "caret", "\u25BE"));
  sel.onclick = (e) => {
    e.stopPropagation();
    brandMenuOpen = !brandMenuOpen;
    exportMenuOpen = false;
    if (!brandMenuOpen) {
      importOpen = false;
      pendingLoad = null;
      addModeOpen = false;
      addModeName = "";
    }
    renderBar();
  };
  bWrap.append(sel);
  if (brandMenuOpen) bWrap.append(renderBrandMenu());
  actions.append(bWrap);
  const eWrap = el("div", "barmenu-wrap");
  const exp = hook(el("button", "barbtn" + (exportMenuOpen ? " open" : "")), "export-open");
  const expText = el("span");
  expText.append(document.createTextNode("\u2193"), el("span", "barbtn-lab", " Export"));
  exp.append(expText);
  exp.setAttribute("aria-label", "Export");
  exp.setAttribute("aria-haspopup", "dialog");
  exp.setAttribute("aria-expanded", String(exportMenuOpen));
  exp.onclick = (e) => {
    e.stopPropagation();
    exportMenuOpen = !exportMenuOpen;
    brandMenuOpen = false;
    importOpen = false;
    renderBar();
  };
  eWrap.append(exp);
  actions.append(eWrap);
  const nWrap = el("div", "barmenu-wrap");
  const nav = el("button", mix("barbtn", "navbtn", navMenuOpen ? "open" : ""));
  const curPage = NAV.find((s) => s.key === page);
  const navText = el("span");
  navText.append(document.createTextNode("\u2630"), el("span", "navbtn-lab", " " + (curPage?.label ?? "Pages")));
  nav.append(navText, el("span", "caret", "\u25BE"));
  nav.setAttribute("aria-label", "Pages");
  nav.onclick = (e) => {
    e.stopPropagation();
    navMenuOpen = !navMenuOpen;
    brandMenuOpen = false;
    exportMenuOpen = false;
    importOpen = false;
    renderBar();
  };
  nWrap.append(nav);
  if (navMenuOpen) nWrap.append(renderNavMenu());
  actions.append(nWrap);
  if (commit.isFigma) {
    if (restoreError) {
      const pill = hook(el("span", "bar-seed bad", `Saved brand not restored \u2014 ${restoreError}`), "status-pill");
      pill.title = restoreError;
      actions.append(pill);
    }
    if (applyState) actions.append(renderApplyStatus(applyState, "apply"));
    else if (seedOutcome) actions.append(renderSeedPill(seedOutcome));
    const pending = applyState === "pending";
    const applyBtn = el("button", "barbtn primary", pending ? "\u22EF Applying\u2026" : "Apply to Figma");
    applyBtn.disabled = pending;
    applyBtn.onclick = () => {
      applyState = "pending";
      openDetail = null;
      renderBar();
      syncApplyDetail();
      commit.postTheme(lastGoodInput);
    };
    actions.append(applyBtn);
    if (componentState) actions.append(renderApplyStatus(componentState, "components"));
    if (pruneVerdict) {
      const pill = hook(el("span", "bar-seed" + (pruneVerdict.ok ? "" : " bad"), pruneVerdict.summary), "status-pill");
      pill.title = pruneVerdict.summary;
      actions.append(pill);
    }
    const pruneBtn = el("button", "barbtn", pruneBusy === "preview" ? "\u22EF Checking\u2026" : pruneBusy === "delete" ? "\u22EF Removing\u2026" : "Prune stale");
    pruneBtn.disabled = !!pruneBusy || applyState === "pending";
    pruneBtn.title = "Removes the styles, modes and variables this config no longer emits. Shows the count before deleting, and names the modes.";
    pruneBtn.onclick = () => {
      pruneBusy = "preview";
      pruneVerdict = null;
      prunePreview = null;
      renderBar();
      commit.postPrune(lastGoodInput, false);
    };
    actions.append(pruneBtn);
  }
  barHost.append(actions);
  if (exportMenuOpen) barHost.append(renderExportDialog());
  if (prunePreview) barHost.append(renderPruneDialog());
  if (!outsideBound) {
    document.addEventListener("mousedown", (e) => {
      if ((brandMenuOpen || navMenuOpen) && !e.target.closest(".barmenu-wrap")) {
        brandMenuOpen = false;
        navMenuOpen = false;
        importOpen = false;
        pendingLoad = null;
        addModeOpen = false;
        addModeName = "";
        renderBar();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && exportMenuOpen) {
        exportMenuOpen = false;
        importOpen = false;
        renderBar();
      } else if (e.key === "Escape" && prunePreview) {
        prunePreview = null;
        renderBar();
      }
    });
    outsideBound = true;
  }
}
var renderNavMenu = () => {
  const menu = el("div", mix("brandmenu", "navmenu"));
  menu.append(el("div", "bm-cap", "Pages"));
  const nav = railNav();
  nav.forEach((s, i) => {
    if (isFirstView(nav, i)) menu.append(el("div", "bm-div"));
    const it = el("button", "nav-item" + (s.key === page ? " cur" : ""));
    const t = el("span", "stage-t");
    t.append(el("b", void 0, s.label), el("small", void 0, s.sub));
    it.append(t);
    it.onclick = () => {
      navMenuOpen = false;
      if (page !== s.key) {
        setPage(s.key);
        build();
      } else renderBar();
    };
    menu.append(it);
  });
  menu.append(el("p", "rail-note", "Ordered the way a theme composes \u2014 palettes first, then how they\u2019re applied to surfaces and interaction, then type and form. Preview renders the whole system."));
  return menu;
};
var seedFromColor = (hexVal) => {
  const o = rgbToOklch(hexToRgb(hexVal));
  return { ...NEW_BRAND(), primary: o, neutral: { hue: o.h, chroma: 6e-3 } };
};
var renderStartScreen = () => {
  const view = hook(el("div", "startview"), "start-screen");
  const col = hook(el("div", "start-col"), "start-column");
  const mark = el("div", "start-mark");
  mark.append(el("span", "logo"), el("span", "wordmark", "Prism3"), el("span", "studio", "Theme studio"));
  col.append(mark);
  col.append(hook(el("h1", "start-h", "Start a new brand."), "start-heading"));
  col.append(el("p", "start-lede", "One brand color is enough \u2014 the engine grows a full, contrast-checked system you can steer. Pick a starting point."));
  const enter = (input, origin) => loadBrand(input, origin);
  const c1 = hook(el("div", "start-card start-hero"), "start-path");
  c1.append(el("h2", "start-ct", "Start from your color"));
  c1.append(el("p", "start-cd", "Your primary brand color; everything else takes smart defaults you can tune."));
  const row = el("div", "start-color-row");
  const swatch2 = el("input", "start-swatch");
  swatch2.type = "color";
  swatch2.value = "#5e4bc3";
  const hexIn = el("input", "start-hex");
  hexIn.type = "text";
  hexIn.value = "#5e4bc3";
  hexIn.setAttribute("aria-label", "Brand color hex");
  const HEX = /^#[0-9a-f]{6}$/i;
  swatch2.oninput = () => {
    hexIn.value = swatch2.value;
  };
  hexIn.oninput = () => {
    if (HEX.test(hexIn.value)) swatch2.value = hexIn.value;
  };
  const go = hook(el("button", "start-go", "Create theme \u2192"), "start-go");
  go.onclick = () => enter(seedFromColor(HEX.test(hexIn.value) ? hexIn.value : swatch2.value), { kind: "new" });
  row.append(swatch2, hexIn, go);
  c1.append(row);
  col.append(c1);
  const c2 = hook(el("div", "start-card start-row2"), "start-path");
  const t2 = el("div", "start-c2t");
  t2.append(el("h2", "start-ct", "Start with a neutral default"), el("p", "start-cd", "An unopinionated starting theme \u2014 jump in and set your color later."));
  const b2 = hook(el("button", "start-alt", "Start blank"), "start-blank");
  b2.onclick = () => enter(NEW_BRAND(), { kind: "new" });
  c2.append(t2, b2);
  col.append(c2);
  const c3 = hook(el("div", "start-card"), "start-path");
  c3.append(el("h2", "start-ct", "Explore an example"));
  c3.append(el("p", "start-cd", "Open a fully-built example to see what the engine produces from a brand."));
  const chips = el("div", "start-chips");
  for (const name of Object.keys(BRANDS)) {
    const chip = hook(el("button", "start-chip"), "start-example");
    const d = el("span", "dot");
    d.style.background = hex(oklchToRgb(BRANDS[name].primary));
    chip.append(d, el("span", void 0, name));
    chip.onclick = () => enter(BRANDS[name], { kind: "example", id: name });
    chips.append(chip);
  }
  c3.append(chips);
  col.append(c3);
  const c4 = hook(el("div", "start-card start-row2"), "start-path");
  const t4 = el("div", "start-c2t");
  t4.append(el("h2", "start-ct", "Import a design.md"), el("p", "start-cd", "Already have a design.md? Upload it to load the full brand."));
  const err4 = el("p", "start-imp-err");
  t4.append(err4);
  const up4 = hook(el("label", "start-alt start-upload"), "start-upload");
  const fi4 = hook(el("input", "start-file"), "start-file");
  fi4.type = "file";
  fi4.accept = IMPORT_ACCEPT;
  fi4.onchange = async () => {
    err4.textContent = "";
    const f = fi4.files?.[0];
    if (!f) return;
    const read = await readDesignMdFile(f);
    if ("error" in read) {
      err4.textContent = read.error;
      return;
    }
    const res = validateDesignMd(read.text);
    if ("error" in res) {
      err4.textContent = res.error;
      return;
    }
    enter(res.input, { kind: "import", label: String(res.input.id ?? f.name) });
  };
  up4.append(el("span", void 0, "\u2191 Upload\u2026"), fi4);
  c4.append(t4, up4);
  col.append(c4);
  view.append(col);
  return view;
};
var build = () => {
  if (firstRun()) {
    mountView("start", () => renderStartScreen());
    return;
  }
  const shell = el("div", "shell");
  const rail = el("nav", "rail");
  const nav = railNav();
  nav.forEach((s, i) => {
    if (isFirstView(nav, i)) rail.append(el("div", "rail-div"));
    const it = hook(el("button", "stage" + (s.key === page ? " active" : "")), `rail-page-${s.key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`);
    const t = el("span", "stage-t");
    t.append(hook(el("b", void 0, s.label), "rail-item-label"), el("small", void 0, s.sub));
    it.append(t);
    it.onclick = () => {
      if (page !== s.key) {
        setPage(s.key);
        build();
      }
    };
    rail.append(it);
  });
  rail.append(el("p", "rail-note", "Ordered the way a theme composes \u2014 palettes first, then how they\u2019re applied to surfaces and interaction, then type and form. Preview renders the whole system."));
  const stamp = el("p", "rail-build");
  stamp.append(el("span", void 0, `engine ${ENGINE_VERSION}`), el("span", "rail-build-b", buildChip("5479b4d")));
  stamp.title = buildTitle("5479b4d");
  rail.append(stamp);
  shell.append(rail);
  workspace = hook(el("section", "ws"), "workspace");
  shell.append(workspace);
  mountView("app", () => shell);
  bindStuck();
  renderWorkspace();
};
var NON_BOX_PROP = /^(font(-[a-z-]+)?|color|letter-spacing)$/;
var installStyles = (css) => {
  const decls = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const owns = /* @__PURE__ */ new Map();
  for (const m of decls.matchAll(/^((?:\.[a-z][a-z0-9-]*\s*,\s*)*\.[a-z][a-z0-9-]*)\s*\{([^}]*)\}/gm)) {
    for (const sel of m[1].split(",")) owns.set(sel.trim().slice(1), m[2]);
  }
  if (owns.size === 0) {
    throw new Error("apps/studio: the stylesheet declares no top-level class rules \u2014 it moved or changed shape (#770).");
  }
  const shared = [...owns.keys()].filter((c) => FREE.has(c) && !UTILITIES.includes(c));
  if (shared.length) {
    throw new Error(
      `apps/studio: ${shared.map((c) => `'.${c}'`).join(", ")} key a top-level rule while listed as a shared state. A shared token that carries a declaration reaches every element wearing it, from any surface \u2014 that is the #464 defect. Give the rule a scope, or drop the name from STATES (#770).`
    );
  }
  for (const u of UTILITIES) {
    const body = owns.get(u);
    if (body === void 0) {
      throw new Error(`apps/studio: UTILITIES lists '.${u}', which has no top-level rule to verify (#770).`);
    }
    const boxy = body.split(";").map((d) => d.split(":")[0].trim()).filter(Boolean).filter((p) => !NON_BOX_PROP.test(p));
    if (boxy.length) {
      throw new Error(
        `apps/studio: UTILITIES class '.${u}' declares ${boxy.join(", ")}. A utility is worn by any scope, so it must carry no layout its host could fight. Remove the property, or make it a scope of its own (#770).`
      );
    }
  }
  const styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.append(styleEl);
};

// src/styles.css
var styles_default = "/**\n * Studio chrome stylesheet.\n *\n * Extracted from a 1,462-line template literal in `src/main.ts` (#769). It lived there so the\n * bundle would stay SELF-CONTAINED \u2014 the Figma plugin iframe ships `allowedDomains:[\"none\"]` and has\n * no server to fetch a second file from \u2014 and that property is unchanged: `main.ts` imports this\n * file through esbuild's `text` loader, so the CSS still travels inside the one JS bundle and is\n * still injected into <head> at boot. What changed is the AUTHORING surface, which is the whole\n * point of the move: a backtick in a CSS comment used to close the enclosing JS string and report\n * `TS1005` thousands of lines from the edit, four times over. A .css file has no such trap.\n *\n * Every esbuild entry that bundles `apps/studio/src` therefore needs `--loader:.css=text`\n * (`dev`, `build`, `build-site.mjs`, `vercel-ignore-check.mjs`, `apps/plugin/build.mjs`). Two of\n * those build with no output path configured, so a missing loader is a hard esbuild error there;\n * `main.ts` carries a boot-time guard for the rest.\n *\n * ONE GATE READS THIS FILE BY PATH, and it fails closed when it finds nothing to scan:\n *   - `lint-contrast.mjs` \u2014 the `:root` token values, for the chrome contrast floors (#514)\n * Moving or restructuring the CSS means repointing it in the same change. `lint-classes.mjs` used to\n * read it too, for the class-collision check (#515); #770 retired that gate, and `main.ts`'s\n * `installStyles` now checks the SHIPPED text instead \u2014 see the `scoped styles` section there for the\n * law this file is held to, and what a violation refuses to do.\n *\n * The prose in here is GATED. It ships verbatim in `apps/studio/dist/main.js`, which is the surface\n * `lint-us-english.ts` and `lint-voice.ts` scan, so comments below are held to US English and to\n * voice-standard \xA72 the same as any other shipped text.\n */\n:root{\n  /* #355 \u2014 the two lightest tiers failed AA 4.5:1 on --paper (--faint 2.31:1, --muted 4.36:1), which is\n     the dashboard failing the same bar it enforces on generated brand output. Both moved DOWN rather than\n     the convention being re-scoped: every one of the 143 uses is 9-15px text, and WCAG large text starts\n     at 18.66px bold / 24px regular, so nothing here qualified for the 3:1 large-text allowance (SC 1.4.3,\n     the same text-vs-non-text distinction #352 is drawing in the engine).\n     The ramp is SHIFTED, not collapsed: --faint parks on the AA floor (the lightest legal value on this\n     paper) and --muted moves clear of it, so four visually distinct tiers survive. Darkening --faint alone\n     to 4.63:1 would have landed it on #6d6d74 while a minimal --muted fix lands on #6e6e76 \u2014 the same\n     color, silently deleting a tier. Contrast is stated against --paper, the WORSE of the two surfaces\n     (--panel is lighter, so every pairing clears by more there). */\n  --ink:#18181b; --ink2:#3d3d44; --muted:#55555a; --faint:#6d6d74;\n  /* #285 \u2014 the STATUS set. There was no set before this: three different greens (#1f9d63 / #1a9c52 /\n     #1a7f4b) and three different reds (#c9342f / #dd3322 / #b0341a) for two concepts, scattered as\n     literals. That is why nobody noticed two greens, one red and the amber were all under AA \u2014 nothing\n     held them to a shared bar. Every value below clears 4.5:1 on --paper and --panel, the two grounds\n     lint-contrast.mjs checks them against; see that file's PAIRS for the exact set held to the bar. */\n  --ok:#1a7f4b; --warn:#a35e00; --danger:#c9342f;\n  /* #446 \u2014 the TINT grounds. Two verdict badges each invented their own tinted background with its\n     own hardcoded darker green/red, because #285 audited the status set against --paper and --panel\n     and never against a tint of the status color itself. Measured: on --paper a tint of --ok fails\n     AA at EVERY percentage (5% is already 4.24), because --ok on plain --paper is 4.53 \u2014 at the\n     floor, so any darkening of the ground goes under. Both badges in fact sit inside a white\n     --panel, where 6% clears with margin: --ok 4.63, --danger 4.79.\n     6% is therefore a CEILING, not a preference, and these tokens are only safe on --panel.\n     Darkening --ok/--danger instead was rejected: #285 already tuned them to clear 4.5:1 on --paper\n     and --panel (see above), and moving them would spend that margin for no gain here.\n     Hex first, color-mix second: if an engine lacks color-mix the first declaration stands, so the\n     shared plugin webview degrades to the same value rather than to no background. */\n  --ok-tint:#f1f7f4;      --ok-tint:color-mix(in srgb, var(--ok) 6%, #fff);\n  --ok-edge:#bfdbcd;      --ok-edge:color-mix(in srgb, var(--ok) 28%, #fff);\n  --danger-tint:#fcf3f3;  --danger-tint:color-mix(in srgb, var(--danger) 6%, #fff);\n  --danger-edge:#f0c6c5;  --danger-edge:color-mix(in srgb, var(--danger) 28%, #fff);\n  --paper:#f2f3f6; --panel:#ffffff; --line:#e7e8ec; --line2:#dcdde2;\n  --r:10px; --r-sm:7px; --r-xs:6px;\n  /* Per-mode table geometry \u2014 shared so tables stack down the page on the same grid. The SIZE table\n     sets these because it is the widest case: its stepper cell needs ~132px where a weight select\n     needs ~90px and a leading select ~130px, and its row labels are the shortest. Future tables\n     (weights, leading, tracking) consume these rather than choosing their own, so the columns cannot\n     drift apart. Change here, not per table. */\n  /* Shared vertical padding for the full-size form controls, so a select and a .seg standing side by\n     side in one control bar come out the same height. They did not: the select measured 40.9px and\n     the segmented control 46.9px, a visible 6px step between two fields on the same row.\n     The 6px was not arbitrary and not in the buttons \u2014 a .seg is a TRACK around its buttons, and its\n     inner button already matched the select exactly (40.9px both). The extra height is the track:\n     both controls carry a 1px border, but only the seg adds 2px of padding on each side, so it runs\n     4px taller before the button is even measured. Hence .seg-b subtracts 2px per side, NOT 3 \u2014\n     subtracting the border as well double-counts it and lands the seg 2px SHORT, which is what the\n     first attempt did (38.9 against 40.9). Measured both times; the arithmetic is easy to get wrong\n     in the confident direction.\n     State the padding once here and both stay locked together if it ever moves. .select.sm sets its\n     own padding and is deliberately untouched \u2014 it is the compact variant, a different size. */\n  --ctl-py:9px;\n  --tbl-col-name:112px; --tbl-col-mode:148px;\n  --sans:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,Roboto,sans-serif;\n  --mono:ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace;\n}\n*{box-sizing:border-box}\nhtml,body{margin:0}\nbody{background:var(--paper);color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased;font-size:14px;line-height:1.55}\n.mono{font-family:var(--mono);font-variant-numeric:tabular-nums;letter-spacing:-0.01em}\n.faint{color:var(--faint)}\n/* WCAG 2.2 SC 2.5.8 Target Size (Minimum) convention (#559): decouples the optical (painted) box\n * from a >=24 CSS px HIT box via an unpainted ::before. The pseudo is position:absolute \u2014 out\n * of flow \u2014 so it never shifts layout or grows what's actually painted; it only widens where clicks\n * register. max(24px,100%) floors each dimension at 24px but never shrinks below the host's own\n * box, so a control already past the floor (.toggle's 38px width) gets no hit-area padding it\n * doesn't need \u2014 the pseudo exactly overlays it on that axis instead of narrowing it to 24px.\n * --hit-dx/--hit-dy (CSS px, default 0 = centered) bias the box off-center for a host packed too\n * tightly to expand symmetrically without eating a neighboring target's edge. .adv-x is why these\n * exist: only 2px of clearance to its OWN input on one side vs. 8px to the next breakpoint cell on\n * the other \u2014 22.77px of whitespace total, 1.23px short of the 24px floor even before any bias, so\n * some encroachment on a neighbor's box is unavoidable. Biased fully toward the roomier side (see\n * .adv-x below), measured live (#559) at zero overlap into the paired input and ~1.2px into the\n * FAR edge of the next cell's input \u2014 never the input this button's own row belongs to. */\n.hit-min{position:relative}\n.hit-min::before{content:'';position:absolute;top:50%;left:50%;width:max(24px,100%);height:max(24px,100%);transform:translate(calc(-50% + var(--hit-dx,0px)),calc(-50% + var(--hit-dy,0px)))}\n#app{max-width:1200px;margin:0 auto;padding:0 40px 120px}\n\n/* First-run start screen */\n.startview{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:48px 24px;background:var(--paper)}\n.start-col{width:100%;max-width:560px;display:flex;flex-direction:column;gap:14px}\n.start-mark{display:flex;align-items:center;gap:9px;margin-bottom:6px}\n.start-h{margin:0;font-size:34px;font-weight:680;letter-spacing:-0.025em;color:var(--ink)}\n.start-lede{margin:0 0 6px;font-size:15px;line-height:1.55;color:var(--muted);max-width:48ch}\n.start-card{border:1px solid var(--line);border-radius:var(--r);background:var(--panel);padding:20px}\n.start-hero{border-color:var(--line2);box-shadow:0 1px 2px rgba(24,24,27,.05)}\n.start-ct{margin:0 0 4px;font-size:15px;font-weight:620;color:var(--ink)}\n.start-cd{margin:0;font-size:13px;line-height:1.5;color:var(--faint)}\n.start-color-row{display:flex;align-items:center;gap:10px;margin-top:15px}\n.start-swatch{width:44px;height:38px;padding:0;border:1px solid var(--line2);border-radius:var(--r-xs);background:none;cursor:pointer}\n.start-hex{width:108px;padding:8px 10px;border:1px solid var(--line2);border-radius:var(--r-xs);font:inherit;font-variant-numeric:tabular-nums;background:var(--paper);color:var(--ink)}\n.start-go{margin-left:auto;padding:9px 16px;border:none;border-radius:var(--r-sm);background:var(--ink);color:#fff;font:inherit;font-size:13px;font-weight:560;cursor:pointer}\n.start-go:hover{background:#000}\n.start-row2{display:flex;align-items:center;justify-content:space-between;gap:16px}\n.start-c2t{min-width:0}\n.start-alt{flex:none;padding:9px 15px;border:1px solid var(--line2);border-radius:var(--r-sm);background:var(--panel);color:var(--ink);font:inherit;font-size:13px;font-weight:540;cursor:pointer}\n.start-alt:hover{border-color:var(--ink)}\n.start-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:15px}\n.start-chip{display:flex;align-items:center;gap:8px;padding:7px 13px 7px 9px;border:1px solid var(--line2);border-radius:999px;background:var(--panel);font:inherit;font-size:13px;color:var(--ink);cursor:pointer}\n.start-chip:hover{border-color:var(--ink)}\n.start-chip .dot{width:12px;height:12px;border-radius:50%;flex:none}\n\n.chrome{position:sticky;top:0;z-index:20;background:var(--paper)}\n.bar{display:flex;align-items:center;justify-content:space-between;padding:26px 2px 12px}\n/* Sticky at the chrome's lower edge so the mode context still never scrolls away \u2014 the property\n   it had as tier 2 of the header, preserved through the move (#432). Background is required:\n   page content scrolls underneath it. z-index sits below .chrome (20) so it tucks, not overlaps. */\n.modebar{position:sticky;top:var(--chrome-h,120px);z-index:15;background:var(--paper);padding:10px 2px 14px;transition:box-shadow .16s ease}\n/* Only while actually stuck \u2014 see syncStuck. Soft and short-throw: it should read as the bar\n   sitting above the page, not as a drop shadow on a card. */\n.modebar.stuck{box-shadow:0 10px 14px -12px rgba(20,22,30,.42)}\n@media(prefers-reduced-motion:reduce){.modebar{transition:none}}\n.brandmark{display:flex;align-items:center;gap:11px}\n.logo{width:18px;height:18px;border-radius:var(--r-xs);background:conic-gradient(from 210deg,#5e4bc3,#0088be,#2f6833,#a13731,#5e4bc3)}\n.wordmark{font-weight:640;letter-spacing:-0.02em;font-size:16px}\n.studio{color:var(--muted);font-size:13px;border-left:1px solid var(--line2);padding-left:11px}\n.bar-actions{display:flex;align-items:center;gap:10px}\n.barmenu-wrap{position:relative}\n.brandsel,.barbtn{display:flex;align-items:center;gap:9px;font:inherit;font-weight:560;border:1px solid var(--line2);background:var(--panel);padding:8px 13px;border-radius:var(--r-sm);font-size:13.5px;cursor:pointer;color:var(--ink);white-space:nowrap}\n.brandsel.open,.barbtn.open,.barbtn:hover,.brandsel:hover{border-color:var(--ink2)}\n.brandsel .dot{width:12px;height:12px;border-radius:4px}\n.brandsel .caret,.barbtn .caret{color:var(--faint);margin-left:2px}\n.barbtn.primary{background:var(--ink);color:#fff;border-color:var(--ink)}\n.barbtn.primary:hover{background:var(--ink2);border-color:var(--ink2)}\n/* Off by default; the max-width:900 rule below turns it on where the rail turns off. This base\n   declaration must come BEFORE that rule \u2014 a media query adds no specificity, so a later\n   .navbtn{display:none} would simply win at every width and the control would never appear. */\n.navbtn{display:none}\n.bar-seed{font-size:11.5px;color:var(--muted);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.bar-seed.bad{color:#a12}\n/* The apply status pill + its detail row. The pill is bounded and single-line like .bar-seed \u2014 that\n   constraint is fine for a \u226424-char headline and was only wrong for the 150-char summary, which now\n   lives in the detail row below the bar. Colors come from the #285 status set on the #446 tint grounds:\n   that exact pairing (--ok on --ok-tint, --danger on --danger-tint) is what lint:contrast already\n   measures, so the pill inherits a checked ratio instead of inventing a green. */\n.applystat{display:flex;align-items:center;gap:7px;font:inherit;font-size:11.5px;font-weight:560;border:1px solid var(--line2);background:var(--panel);border-radius:999px;padding:5px 10px;cursor:pointer;color:var(--ink2);white-space:nowrap}\n.applystat.ok{background:var(--ok-tint);border-color:var(--ok-edge);color:var(--ok)}\n.applystat.bad{background:var(--danger-tint);border-color:var(--danger-edge);color:var(--danger)}\n.applystat .caret{color:currentColor;opacity:.65;margin-left:0}\n/* Wrapped, not clipped \u2014 the whole point of the row. IN FLOW inside the chrome, deliberately not an\n   absolutely-positioned popover: at the narrow tier the bar wraps to two rows, and a panel hanging off\n   the pill covered the Apply button it was reporting on (measured at 480). In flow it pushes content\n   instead, so it cannot overlap anything at any width and needs no z-index. Same reasoning and same\n   home as .errbar-global (#388), and unlike that one it does carry its own rules. */\n.applystat-detail{background:var(--panel);border:1px solid var(--line2);border-radius:var(--r-sm);padding:10px 12px;margin-bottom:16px;font-size:12px;line-height:1.55;color:var(--ink2)}\n/* #718 \u2014 the Components page's internal notice and its control row.\n   --muted on --paper, NOT --faint: at 13px this is a paragraph to read rather than a caption to\n   glance at, and lint:contrast holds --muted on --paper (the worse of the two grounds) to 4.5:1.\n   Modeled on .sl-note / .tf-note, which are the same shape \u2014 an inset explanatory block inside a\n   .psec \u2014 so this adds a rule and not a third pattern. The bold lifts only the \"Internal \u2014\n   experimental.\" lead-in to --ink2, which lint:contrast also holds at 4.5:1 on both grounds. */\n.cw-note{font-size:13px;color:var(--muted);background:var(--paper);border:1px solid var(--line);border-radius:var(--r-sm);padding:11px 13px;line-height:1.55;margin:14px 0 0}\n.cw-note b{color:var(--ink2);font-weight:640}\n/* The status pill and the button on one line. align-items:center rather than baseline: the pill is a\n   999px capsule with its own padding, so its text baseline sits above the button's and aligning on\n   that baseline would push the capsule visibly high. */\n.cw-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:16px 0 0}\n/* The file-setup button + its status pill on one line (#1558). Its own scope rather than reusing .cw-row\n   so the build-verdict smoke suite's `.cw-row button.barbtn` selector still resolves to the build button\n   alone. Same layout as .cw-row \u2014 align-items:center for the same reason (the pill is a padded capsule). */\n.fs-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:16px 0 0}\n/* max-height + scroll: the menu had neither, which was survivable while it was short. Folding the\n   mode set in (#432) pushed it to ~716px, and at a 700px-tall window it ran 89px past the bottom\n   of the viewport with the last items simply unreachable. Bounded to the space below the header. */\n.brandmenu{position:absolute;top:calc(100% + 8px);right:0;width:288px;max-height:calc(100vh - var(--chrome-h, 120px) - 24px);overflow-y:auto;background:var(--panel);border:1px solid var(--line2);border-radius:var(--r);padding:12px;z-index:20;display:flex;flex-direction:column;gap:2px;box-shadow:0 12px 32px -8px rgba(24,24,27,.20),0 4px 12px -4px rgba(24,24,27,.12)}\n\n/* The export dialog (#723), replacing .exportmenu's 232px dropdown. Not a <dialog>: the app uses no\n   native dialogs (same call as the color pickers and the confirm rows), so this is the app's own\n   pattern rather than a second one. z-index sits above .brandmenu's 20 \u2014 the two are mutually\n   exclusive in practice, but a modal that could render UNDER a dropdown is a bug waiting for the one\n   state that allows both. --scrim is not used: this is chrome, and the token is the brand's. */\n/* Vertically centered, NOT hung below the bar. The dropdowns are anchored to their triggers because\n   they belong to them; a modal does not, and top-aligning this one under the chrome cost ~110px that\n   the settings column needed \u2014 measured, not guessed: the left column wants 634px and was given 524,\n   which clipped the fourth setting's label mid-word. */\n.exdlg-scrim{position:fixed;inset:0;z-index:40;background:rgba(24,24,27,.34);display:flex;align-items:center;justify-content:center;padding:20px}\n/* Bounded height with the BODY scrolling, not the panel: the head keeps the title and the close button\n   reachable, and the footer keeps the download button reachable, however long the preview runs. That is\n   the same failure .brandmenu's max-height fixed (#432) \u2014 here it would have put the primary action\n   below the fold on a 700px window. */\n.exdlg{width:min(880px,100%);max-height:calc(100vh - 40px);display:flex;flex-direction:column;background:var(--panel);border:1px solid var(--line2);border-radius:var(--r);box-shadow:0 24px 64px -12px rgba(24,24,27,.30),0 8px 20px -8px rgba(24,24,27,.16)}\n.exdlg-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px 12px;border-bottom:1px solid var(--line)}\n.exdlg-t{margin:0;font-size:15px;font-weight:600;color:var(--ink)}\n.exdlg-x{border:0;background:none;font:inherit;font-size:14px;color:var(--faint);cursor:pointer;padding:4px 6px;border-radius:var(--r-xs);line-height:1}\n.exdlg-x:hover{background:var(--paper);color:var(--ink)}\n/* Settings left, output right. The columns scroll INDEPENDENTLY (each is its own overflow region): a\n   single scroller would move the settings out of view while reading the preview, which is the pairing\n   the two-column layout exists to hold together. */\n.exdlg-body{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0;min-height:0;overflow:hidden}\n/* gap:0 on purpose \u2014 every child here carries its own margin, and a flex gap on top of that is a second\n   spacing system for the same axis. It also cost real room: gap+margin together overflowed the column by\n   33px at an 869px viewport, clipping the fourth setting's description mid-line. The column still scrolls\n   (it must \u2014 #720 can add settings, and no fixed height survives that), but the default four now fit. */\n.exdlg-col{padding:14px 18px 12px;overflow-y:auto;display:flex;flex-direction:column;gap:0;min-width:0}\n/* The output column is the quieter surface \u2014 it reports rather than accepts input, and the tint is what\n   says so without a heading announcing it. */\n.exdlg-out{padding:16px 18px;overflow-y:auto;background:var(--paper);border-left:1px solid var(--line);display:flex;flex-direction:column;min-width:0}\n/* Below 720 two columns are each too narrow to read: the preview is mono at 11px and the descriptions\n   are full sentences. One column, settings first, preview after \u2014 the same order the single-column\n   build had, which is the right degradation rather than a compromise. */\n@media (max-width:720px){\n  .exdlg-body{grid-template-columns:minmax(0,1fr);overflow-y:auto}\n  .exdlg-col,.exdlg-out{overflow:visible}\n  .exdlg-out{border-left:0;border-top:1px solid var(--line)}\n}\n.exdlg-seg{align-self:flex-start}\n.exdlg-desc{margin:9px 2px 0;font-size:12.5px;line-height:1.55;color:var(--ink2)}\n.exdlg-div{height:1px;background:var(--line);margin:13px 0 12px}\n/* A setting is label / control / description stacked, not label-beside-control: the descriptions are a\n   full line each (#618 allows them to carry real vocabulary, which costs width), and four rows of\n   right-aligned controls with prose underneath reads as two competing columns. */\n.exdlg-set{display:flex;flex-direction:column;gap:6px;margin-bottom:13px}\n.exdlg-set:last-child{margin-bottom:0}\n.exdlg-lab{font-size:12.5px;font-weight:560;color:var(--ink)}\n.exdlg-oseg{align-self:flex-start;max-width:100%;flex-wrap:wrap}\n/* The option labels are token names on purpose (color.on-fill) \u2014 the control demonstrating itself\n   rather than describing itself. Mono is what makes that read as a name rather than as prose. */\n.exdlg-oseg .seg-b{font-family:var(--mono);font-size:12px}\n.exdlg-sdesc{margin:0 2px;font-size:11.5px;line-height:1.55;color:var(--muted)}\n.exdlg-none{margin:2px;font-size:12.5px;color:var(--muted)}\n.exdlg-cap{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--faint);font-weight:600;margin:2px 2px 6px}\n/* pre-line, not nowrap: the file list is one name per line and a long brand id should wrap rather than\n   push the column wider or clip. */\n.exdlg-files{margin:0 2px 14px;font-family:var(--mono);font-size:11.5px;line-height:1.7;color:var(--ink2);word-break:break-all;white-space:pre-line}\n/* The preview is the real projection, so it is as tall as the tokens are \u2014 scrollable rather than\n   trimmed, because trimming would show something the download does not contain.\n   One pre per file. With a split there are several, so THIS is the scroll region and each pre keeps its\n   natural height; with one file the lone pre takes the remaining height itself (:only-child), so a\n   single document still fills the panel instead of sitting in a short box with dead space under it. */\n.exdlg-prevs{flex:1;min-height:0;display:flex;flex-direction:column;gap:3px;overflow:auto}\n.exdlg-pname{font-family:var(--mono);font-size:10.5px;color:var(--faint);margin:5px 2px 1px;word-break:break-all}\n.exdlg-pname:first-child{margin-top:0}\n.exdlg-pre{margin:0;flex:none;overflow:auto;padding:11px 12px;background:var(--panel);border:1px solid var(--line2);border-radius:var(--r-xs);font-family:var(--mono);font-size:11px;line-height:1.55;color:var(--ink2);white-space:pre}\n.exdlg-pre:only-child{flex:1;min-height:120px}\n@media (max-width:720px){ .exdlg-prevs{flex:none;max-height:300px} }\n.exdlg-foot{display:flex;align-items:center;justify-content:flex-end;gap:9px;padding:12px 18px 16px;border-top:1px solid var(--line)}\n.exdlg-go{border:1px solid var(--ink);background:var(--ink);color:#fff;border-radius:var(--r-xs);padding:8px 17px;font:inherit;font-size:13px;font-weight:560;cursor:pointer}\n/* Import sits BELOW the footer \u2014 outside the export conversation but in the same dialog, which is the\n   relationship: the brief that comes out here is the one that goes back in. Its own surface tint keeps\n   it from reading as a third export option. */\n.exdlg-import{padding:0 18px 16px;background:var(--paper);border-top:1px solid var(--line);border-radius:0 0 var(--r) var(--r)}\n.exdlg-import .exdlg-div{margin-top:0}\n.exdlg-import .bm-ta{height:96px}\n.bm-cap{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--faint);font-weight:600;margin:4px 2px 6px}\n.bm-field{display:flex;align-items:center;gap:10px;padding:4px 2px}\n.bm-lab{font-size:12.5px;color:var(--ink2);width:78px;flex:none}\n/* A TEXT-ENTRY CONTROL PAIRS `background` WITH `color` (#1031). An `<input>` inherits neither from its\n   parent by UA default, so a rule that sets one and not the other hands half the pairing to the UA \u2014 and\n   the UA answers from the resolved `color-scheme`, which is the host's to decide, not this stylesheet's.\n   The plugin panel used to declare `light dark`; the four rules here that set a light `background` and no\n   `color` then rendered near-white ink on it in Figma's dark theme (`.bm-in` at 1.11:1). The root fix is\n   in `apps/plugin/src/ui/index.html`; these four make each control's own contract complete, so the pairing\n   survives the panel one day genuinely adapting. Five sibling rules already did it this way\n   (`.start-hex`, `.pname-input`, `.select`, `.gr-ed-nameinput`, `.tf-in`) \u2014 this is the convention, not a\n   new one. `.te-font` (line ~501) has the same omission and is deliberately left: it has no call site in\n   `main.ts`, and giving dead CSS a fix implies a control that is not there. */\n.bm-in{flex:1;min-width:0;padding:6px 9px;border:1px solid var(--line2);border-radius:var(--r-xs);font:inherit;font-size:13px;background:var(--paper);color:var(--ink)}\n.bm-in.bad{border-color:#d23;background:#fdecec}\n.bm-hint{margin:2px 2px 4px;font-size:11px;color:var(--faint);font-family:var(--mono)}\n.bm-div{height:1px;background:var(--line);margin:8px 0}\n.bm-item{display:flex;align-items:center;gap:9px;width:100%;text-align:left;border:0;background:none;font:inherit;font-size:13px;color:var(--ink2);padding:8px 8px;border-radius:var(--r-xs);cursor:pointer}\n.bm-item:hover{background:var(--paper)}\n.bm-item.cur{color:var(--ink);font-weight:600}\n.bm-dot{width:11px;height:11px;border-radius:3px;flex:none}\n.bm-import{margin-top:6px;display:flex;flex-direction:column;gap:8px}\n.bm-ta{width:100%;height:120px;resize:vertical;padding:9px;border:1px solid var(--line2);border-radius:var(--r-xs);font-family:var(--mono);font-size:12px;background:var(--paper);color:var(--ink);line-height:1.5}\n.bm-err{margin:0;font-size:11.5px;color:#a12;line-height:1.5}\n.bm-load{align-self:flex-start;border:1px solid var(--ink);background:var(--ink);color:#fff;border-radius:var(--r-xs);padding:7px 16px;font:inherit;font-size:13px;font-weight:560;cursor:pointer}\n.bm-file,.start-file{display:none}\n.bm-import-row,.bm-confirm-row{display:flex;align-items:center;gap:8px}\n.bm-upload{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line2);background:var(--paper);border-radius:var(--r-xs);padding:7px 12px;font-size:12.5px;color:var(--muted);cursor:pointer;white-space:nowrap}\n.bm-upload:hover{border-color:var(--ink);color:var(--ink)}\n.bm-cancel{border:1px solid var(--line2);background:var(--panel);border-radius:var(--r-xs);padding:7px 14px;font:inherit;font-size:13px;color:var(--ink2);cursor:pointer}\n.bm-cancel:hover{border-color:var(--ink)}\n.bm-confirm{margin:2px 2px 8px;font-size:12.5px;line-height:1.55;color:var(--ink2)}\n.start-upload{display:inline-flex;align-items:center;gap:6px}\n.start-imp-err{margin:9px 0 0;font-size:12px;color:#a12;line-height:1.5}\n\n.shell{display:grid;grid-template-columns:210px minmax(0,1fr);gap:60px;align-items:start;margin-top:20px}\n.rail{position:sticky;top:calc(var(--chrome-h, 120px) + 10px);display:flex;flex-direction:column;gap:4px}\n.rail-div{height:1px;background:var(--line);margin:10px 10px}\n.stage{display:flex;align-items:center;gap:13px;text-align:left;border:1px solid transparent;background:none;font:inherit;padding:11px 12px;border-radius:var(--r-sm);cursor:pointer;color:var(--ink2)}\n.stage:hover{background:var(--panel)}\n.stage.active{background:var(--panel);border-color:var(--line2)}\n.stage-t{display:flex;flex-direction:column;line-height:1.3;gap:2px}\n.stage-t b{font-weight:600;font-size:13.5px}\n.stage.active .stage-t b{color:var(--ink)}\n.stage-t small{color:var(--faint);font-size:11.5px}\n.rail-note{color:var(--muted);font-size:12px;line-height:1.6;margin:22px 8px 0;padding-top:20px;border-top:1px solid var(--line)}\n/* Build identity (#474) \u2014 quiet by default, legible when you go looking for it. */\n.rail-build{display:flex;flex-wrap:wrap;gap:8px;align-items:baseline;color:var(--faint);font-size:11px;margin:12px 8px 0;user-select:text}\n/* `overflow-wrap:anywhere` because since #836 this field holds a checkout's directory name, not a fixed\n   literal \u2014 `p3-buildid` fits the 210px rail and a longer branch name does not, and a flex item's default\n   `min-width:auto` lets an unbreakable token overflow the rail rather than wrap inside it. */\n.rail-build-b{font-family:var(--mono,ui-monospace,SFMono-Regular,Menlo,monospace);color:var(--muted);overflow-wrap:anywhere}\n\n.hero{padding:6px 0 4px}\n.hero h1{margin:0;font-size:40px;font-weight:660;letter-spacing:-0.03em;line-height:1.08}\n.lede{color:var(--muted);max-width:60ch;margin:18px 0 0;font-size:16px;line-height:1.65}\n\n/* Each primitive section pairs its control card (left) with the ramps it drives (right),\n   so a change to the card is always visible in the palette beside it (#158). */\n/* ---- Palettes page (#59): per-role section containers + full-width palette rows ---- */\n.psec{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:20px 24px 22px;margin-top:22px}\n.psec:first-of-type{margin-top:8px}\n/* The head becomes a row so the mode badge can sit top-right; .psec-txt keeps the title+description\n   stacked as before, so nothing about their own spacing moves. */\n.psec-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}\n.psec-txt{min-width:0}\n.psec-t{margin:0;font-size:13px;font-weight:680;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted)}\n/* Label + scope: the label is small, letterspaced and muted; the scope is heavier and darker, so the\n   eye lands on the part that actually changes. Achromatic by design \u2014 see modeScopeBadge. */\n.msb{display:inline-flex;align-items:baseline;gap:6px;flex:none;border-radius:99px;padding:4px 11px;\n     border:1px dashed var(--line2);background:transparent;white-space:nowrap}\n.msb.on{border-style:solid;border-color:transparent;background:var(--paper)}\n.msb-k{font-size:9.5px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--faint)}\n.msb-v{font-size:11px;font-weight:700;letter-spacing:.03em;color:var(--muted)}\n.msb.on .msb-v{color:var(--ink)}\n@media(max-width:720px){.psec-head{flex-direction:column;gap:8px}}\n.psec-d{margin:4px 0 0;color:var(--faint);font-size:13px;line-height:1.5}\n.prow{padding:20px 0 6px}\n.prow+.prow{border-top:1px solid var(--line);margin-top:4px}\n.phead{display:flex;align-items:center;gap:22px;margin-bottom:16px;flex-wrap:wrap}\n.pident{display:flex;align-items:center;gap:14px;min-width:0}\n.pswrap{position:relative;flex:none;line-height:0}\n.pswatch{width:56px;height:56px;flex:none;border-radius:var(--r-sm);border:1px solid var(--line2);padding:0;background:none;overflow:hidden;cursor:default}\n.prow.authored .pswatch{cursor:pointer}\n.prow.authored .pswatch:hover{box-shadow:0 0 0 3px var(--line)}\n.plock{position:absolute;right:-5px;top:-5px;width:20px;height:20px;border-radius:6px;background:var(--ink);border:1px solid var(--ink);display:flex;align-items:center;justify-content:center}\n.plock svg{width:11px;height:11px;stroke:var(--panel);fill:none;stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round}\n.pidcol{min-width:0;display:flex;flex-direction:column;gap:5px}\n.pname{font-size:16px;font-weight:620;letter-spacing:-0.01em;text-transform:capitalize}\n.pname-input{width:130px;max-width:130px;padding:5px 8px;border:1px solid var(--line2);border-radius:var(--r-xs);font-size:14px;background:var(--paper);color:var(--ink)}\n.psub{display:flex;align-items:center;gap:9px;flex-wrap:wrap;min-height:20px}\n.phex{color:var(--muted);font-size:12.5px}\n.prow:not(.show-hex) .phex{display:none}\n.prole{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:var(--ink2);background:var(--paper);border:1px solid var(--line2);border-radius:999px;padding:2px 10px}\n.prole-dot{width:8px;height:8px;border-radius:50%;flex:none;box-shadow:inset 0 0 0 1px rgba(0,0,0,.15)}\n.prm{margin-left:2px}\n/* Every field is a TWO-ROW grid: the label in a row that sizes to it, the control in a common band\n   below, centered. Bottom-aligning instead (the previous align-items:flex-end) made each field hang\n   from its own baseline, so a 55px Source field and a 66px slider field put their labels 10.6px\n   apart and their controls 1.3px apart -- the ragged look #67 tried to fix by equalizing heights,\n   which only holds while every control happens to be the same height. Aligning the two ROWS is\n   height-independent. Row 2 is minmax(33px,auto) -- at least as tall as the tallest control\n   (select 33, range 32) so the controls share a band, and free to grow so a taller control on any\n   other surface using pfield is never clipped.\n   HISTORY, because the trap it names is closed rather than still lurking: this field's range input\n   used to be minted as `range psl-range`, and .range -- an unrelated knob-slider rule further down --\n   reached it with margin-top:10px, inflating grid row 2 to 44px, making the field 66px and sending\n   the control mid-line 25.6px off. Two passes at the alignment \"failed\" while looking correct in the\n   stylesheet, because it was never an alignment problem. It was neutralized here by out-specifying\n   the single-class original, and #516 removed the equivalent .slider{margin-top:16px} outright.\n   #770 removed the cause instead: the input is minted `psl-range` and nothing else, and the scope\n   law makes a bare .range unable to reach it at all. The margin:0 below is now inert and kept only\n   so the rule states this element's full box in one place. */\n/* gap:20 not 22 (#394 follow-up): under Pinned color the ident column grows about 61px wider (the hex\n   readout only Pinned shows, .show-hex), and at that width ident+origin+anchor's natural sizes summed\n   to 800.45px against an 800px row -- 0.45px over. flex-wrap is all-or-nothing, so that sub-pixel\n   overflow forced the WHOLE line to break, dropping Anchor onto its own row under a completely\n   different top edge than Source/Hue/Chroma, which is worse than the height mismatch this issue\n   started from. This only has one consumer with more than one field in .porigin (the neutral row's\n   Source+Hue+Chroma; every statusRow origin holds a lone Source pfield, where an internal gap is a\n   no-op), so tightening it here doesn't touch statusRow spacing. -2px per gap (2 internal gaps) reclaims\n   4px, comfortably clearing the 0.45px deficit with margin for font-rendering variance. */\n.porigin{display:flex;align-items:flex-start;gap:20px;flex-wrap:wrap}\n.pfield{display:grid;grid-template-rows:auto minmax(33px,auto);gap:7px}\n.pfield > :nth-child(2){align-self:center}\n.pfield.r{margin-left:auto;justify-items:end}\n.pfk{font-size:9.5px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--faint)}\n.panchor{display:inline-flex;align-items:center;height:31px;padding:0 11px;border:1px solid var(--line2);border-radius:var(--r-xs);background:var(--paper);font-size:13px;color:var(--ink)}\n.panchor.dia::before{content:\"\u25C6\";color:var(--ink2);font-size:9px;margin-right:6px}\n.panchor.none,.panchor.note{color:var(--muted)}\n/* Neutral row: row 1 is the label paired with its live readout. It sizes itself, so it comes out the\n   same height as the plain .pfk row the other fields have and the Source / Hue / Chroma labels share\n   one top edge \u2014 the previous fixed height:15px was 0.3px taller than the label it contained.\n   Centered, not baseline: under align-items:baseline the 12px readout has the greater top-to-baseline\n   distance, so IT sets the row baseline and the 9.5px label gets pushed 1px down \u2014 measured. Which\n   of the two wins is a function of the font metrics, so centering is the stable choice here. */\n.pfield.slider .psl-top{display:flex;align-items:center;justify-content:space-between;gap:10px}\n.psl-val{color:var(--muted);font-size:12px;line-height:1}\n.pfield.slider .psl-range{width:150px;accent-color:var(--ink);height:32px;margin:0}\n.pfield.slider.ro{opacity:.5}\n.pramp{display:flex;flex-direction:column}\n/* #334 \u2014 container, not viewport: .pramp-wrap is the ramp's true available width (viewport minus the\n   210px rail + 60px gap the >900px sidebar layout charges against it, minus #app's + .psec's own\n   padding) \u2014 the quantity the narrow-tier rules below actually care about. A plain @media(max-width)\n   query can only read viewport width, which is why the existing #315 tiers (640px / 480px, see below)\n   went numb the moment the sidebar appeared at 901px: 901px of viewport is LESS ramp room than 900px,\n   once the rail switches on, and no viewport-width query can express that inversion. Establishing a\n   containment context here \u2014 inline-size only, so it does not also make .pramp-wrap's own height\n   independent of content \u2014 lets the @container rules under .lab / .lab-hex below key off the same\n   512px / 352px thresholds the viewport queries use, but evaluated against the box the ramp actually\n   has, sidebar or not. Kept ADDITIVE to the #315 media queries rather than replacing them: below 900px\n   (no sidebar) the two mechanisms agree and either one alone would fire; removing the older one would\n   be an unrelated cleanup this fix doesn't need to make. */\n.pramp-wrap{container-type:inline-size}\n.panel{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:20px 22px}\n.panel-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px}\n.panel-head h2{margin:0;font-size:15px;font-weight:620;letter-spacing:-0.01em}\n/* A segmented control is a FORM CONTROL, not a rung on the navigation ladder (#439). It was the last\n   user of the solid --ink selected fill that the mode chip just gave up \u2014 which left the loudest\n   selection treatment in the app governing whether a path prints long or short, the least\n   consequential choice on the page. Its own row is the evidence for what it is: Show (select) \xB7\n   Alias path (segmented) \xB7 Category (select), three controls of equal rank, with doc 26's existing\n   rule picking the form (3+ options -> select, binary -> segmented).\n   So it reads at the weight of the select beside it: a recessed --paper track with a raised\n   --panel thumb, matching the select's fill and type size rather than out-shouting the page.\n   The principle this states: selection weight tracks SCOPE, and a display preference has none. */\n.seg{display:flex;border:1px solid var(--line2);border-radius:var(--r-xs);padding:2px;gap:2px;background:var(--paper)}\n.seg-b{border:0;background:none;font:inherit;font-size:13.5px;color:var(--muted);padding:calc(var(--ctl-py) - 2px) 12px;border-radius:5px;cursor:pointer}\n.seg-b:hover{color:var(--ink)}\n.seg-b.on{background:var(--panel);color:var(--ink);font-weight:560;box-shadow:0 1px 2px rgba(20,22,30,.10)}\n\n/* Native color inputs: strip the browser's swatch inset so the color fills the whole control (no white gutter). */\ninput[type=color]::-webkit-color-swatch-wrapper{padding:0}\ninput[type=color]::-webkit-color-swatch{border:none;border-radius:inherit}\ninput[type=color]::-moz-color-swatch{border:none;border-radius:inherit}\n.rx{width:28px;height:28px;flex:none;border:1px solid var(--line2);background:var(--panel);border-radius:var(--r-xs);color:var(--faint);cursor:pointer;font-size:15px;line-height:1}\n.rx:hover{background:#fdecec;color:#a12;border-color:#f2c6c6}\n.addbtn{margin-top:14px;border:1px dashed var(--line2);background:none;border-radius:var(--r-sm);padding:9px 15px;font:inherit;font-size:13px;color:var(--muted);cursor:pointer;width:100%}\n.addbtn:hover{border-color:var(--ink);color:var(--ink)}\n\n.slider-top{display:flex;align-items:baseline;justify-content:space-between;font-size:13px;color:var(--ink2)}\n.slider-top .val{color:var(--muted);font-size:12.5px}\n/* `.range` stood here \u2014 the knob-slider rule whose margin-top:10px reached the palette row's\n   `psl-range` and cost three passes at the wrong problem (#464, see .pfield above). #770 removed its\n   last consumer, so the rule has no elements left; deleted rather than left as an unreferenced name\n   the scope law would then hand to whoever wanted a component called `range`. The knob-context\n   sliders are styled by `.knob input[type=range]`, which is where they always actually came from. */\n.np-note{color:var(--faint);font-size:12px;line-height:1.55;margin:16px 0 0}\n\n\n.band{margin-bottom:16px}\n.band:last-child{margin-bottom:0}\n.strip{display:flex;border-radius:var(--r-sm);overflow:hidden;border:1px solid var(--line2)}\n.sw{flex:1;height:72px;position:relative}\n.sw.is-anchor::after{content:\"\";position:absolute;inset:0;border:2.5px solid var(--ink);border-radius:2px;pointer-events:none}\n.labs{display:flex;margin-top:9px}\n/* min-width:0 overrides the flex-item default (min-width:auto, i.e. \"never shrink below my content's\n   min-content size\") \u2014 without it, ten unbreakable hex strings like \"#e2e2e2\" set a floor under .lab\n   that flex:1 cannot shrink past, and the row pushes .labs (then the page) wider rather than yielding.\n   That floor is what #334's overflow actually was: not specific to the 901-919px band, just most\n   visible there because the @container rule below still had headroom above it. .lab-hex pairs the\n   shrink with text-overflow:ellipsis so a genuinely too-narrow hex elides instead of vanishing or\n   smearing into its neighbor \u2014 the same elision pattern .tpill already uses (#289) \u2014 and keeps the\n   full value in \"title\" for hover, same reasoning as .tpill's. */\n.lab{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;padding:0 6px}\n.lab-step{font-size:12px;font-weight:600;color:var(--ink2)}\n.lab-step.on{color:var(--ink);font-weight:700}\n.lab-step.on::before{content:\"\u25C6 \";font-size:8px;color:var(--ink2);vertical-align:1px}\n.lab-hex{font-size:11px;color:var(--faint);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n/* Same two tiers as the #315 media queries below (padding at 512px, hex dropped at 480px viewport =\n   352px of content once #app's 40px sides + .psec's 24px sides are subtracted) \u2014 evaluated against the\n   .pramp-wrap container's own width instead of the viewport, so the 901px sidebar transition lands in\n   the tier its available space actually calls for. */\n@container(max-width:512px){.lab{padding:0 3px}}\n@container(max-width:352px){.lab-hex{display:none}}\n/* The dashboard <select> component (doc 24 C1) \u2014 one base class owns every dropdown's cosmetics + the\n   consistent chevron; sm / fill / cap are additive size/context modifiers. */\n.select{appearance:none;-webkit-appearance:none;font:inherit;font-size:13.5px;padding:var(--ctl-py) 11px;padding-right:28px;border:1px solid var(--line2);border-radius:var(--r-xs);background:var(--paper);color:var(--ink);cursor:pointer;\n  background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 4.5 6 8l3.5-3.5' fill='none' stroke='%2371717a' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\");\n  background-repeat:no-repeat;background-position:right 9px center;background-size:11px}\n.select:disabled{opacity:.6}\n.select.sm{font-size:12.5px;padding:6px 9px;padding-right:26px}\n.select.fill{flex:1;min-width:0}\n.select.cap{max-width:260px}\n\n.sub-lab{margin:34px 0 12px}\n.sub-lab:first-child{margin-top:8px}\n.sub-t{font-size:12.5px;font-weight:680;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);margin:0}\n.knob{padding:14px 0;border-bottom:1px solid var(--line)}\n.knob:last-child{border-bottom:0}\n.knob-label{display:block;font-weight:600;font-size:13.5px}\n.knob-body{display:flex;align-items:center;gap:10px}\n.knob > .knob-body{margin-top:8px}\n.knob input[type=range]{flex:1;accent-color:var(--ink)}\n/* Toggle rendered as a switch (pill track + sliding thumb), not a native checkbox. */\ninput.toggle{appearance:none;-webkit-appearance:none;flex:none;width:38px;height:22px;margin:0;border-radius:999px;background:var(--line2);position:relative;cursor:pointer;transition:background .15s ease}\ninput.toggle::after{content:'';position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s ease}\ninput.toggle:checked{background:var(--ink)}\ninput.toggle:checked::after{transform:translateX(16px)}\ninput.toggle:disabled{opacity:.5;cursor:default}\n.knob input:disabled{opacity:.5}\n.knob .select{margin-top:8px}\n.knob-val{font-variant-numeric:tabular-nums;color:var(--muted);font-size:12.5px}\n.knob-val.ro{margin-top:6px}\n.knob-desc{margin:7px 0 0;font-size:12px;color:var(--faint);line-height:1.5}\n.type-editor{margin-bottom:8px}\n.te-font{width:100%;margin-top:8px;padding:7px 9px;border:1px solid var(--line2);border-radius:var(--r-xs);font:inherit;background:var(--paper)}\n.te-wrow{display:flex;align-items:center;justify-content:space-between;gap:12px}\n/* The number-input component (doc 24 C2) \u2014 .num owns the shared field cosmetics; the context classes\n   below carry only width / size / alignment deltas. */\n.num{padding:6px 8px;border:1px solid var(--line2);border-radius:var(--r-xs);font:inherit;background:var(--paper);color:var(--ink)}\n.te-weight{width:88px;font-variant-numeric:tabular-nums;text-align:right}\n.te-cat-wrap{overflow-x:auto;margin-top:12px}\n.te-cat{border-collapse:collapse;width:100%;font-size:12.5px}\n.te-cat th,.te-cat td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:center;white-space:nowrap}\n.te-cat th{font-size:11px;font-weight:600;color:var(--muted);text-transform:lowercase;letter-spacing:0.02em}\n.te-cat tr:last-child td{border-bottom:none}\n.te-cat th:first-child,.te-cat td:first-child,.te-cat th:nth-child(2),.te-cat td:nth-child(2){text-align:left}\n.te-cat-name{color:var(--ink);font-size:12px}\n.te-c{width:1%}\n.te-cat input[type=checkbox]{width:15px;height:15px;accent-color:var(--ink);cursor:pointer}\n.te-cbwrap{position:relative;display:inline-flex;align-items:center;justify-content:center}\n.te-warn{position:absolute;top:-7px;right:-9px;font-size:10px;line-height:1;pointer-events:none}\n.te-cat td.unavail input[type=checkbox]{opacity:.32}\n.te-cat td.unavail{background:repeating-linear-gradient(-45deg,transparent,transparent 4px,rgba(120,120,130,.06) 4px,rgba(120,120,130,.06) 5px)}\n.te-cat-note{margin:10px 2px 0;font-size:11.5px;line-height:1.5;color:var(--faint)}\n/* D (typography) \u2014 per-mode notes + shared read-only markers. */\n.te-order-warn{margin:10px 2px 0;font-size:12px;color:#a12;line-height:1.5}\n.te-shared-note{margin:4px 2px 10px;font-size:12px;color:var(--faint);line-height:1.5}\n.te-shared-ro{margin:6px 0 0;font-size:13.5px;font-weight:560;color:var(--ink2)}\n.te-cat select:disabled,.te-cat input:disabled{opacity:.55;cursor:not-allowed}\n/* D (typography) \u2014 the per-mode leading/tracking ramps (read-only chips in Light, inputs in a mode). */\n.te-shared-ro-note{margin:4px 2px 10px;font-size:12px;color:var(--faint);line-height:1.5}\n.te-ramp{display:flex;flex-wrap:wrap;gap:8px}\n.te-ramp-cell{display:flex;flex-direction:column;gap:4px;min-width:74px}\n.te-ramp-key{font-size:11px;color:var(--muted)}\n.te-ramp-in{width:74px;padding:5px 7px;font-size:12px}\n.te-ramp-ro{font-size:13px;color:var(--ink2);padding:5px 0}\n/* D (shadow) \u2014 per-mode softness/tint: the knob header carries an Auto/reset affordance. */\n.sh-knob-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px}\n.sh-auto{font:inherit;font-size:11px;color:var(--muted);background:none;border:none;padding:0;cursor:default}\n.sh-auto.on{color:var(--ink2);cursor:pointer;text-decoration:underline}\n/* #305 tint read-out \u2014 the tint color at full opacity beside the same color at a mid-ramp 12%.\n   The checkerboard under the 12% chip is what makes a translucent near-black legible as translucent;\n   on a flat panel it would just read as a slightly different flat gray. */\n.sh-tintblock{margin-top:14px;padding-top:14px;border-top:1px dashed var(--line2)}\n.sh-tintout{display:flex;gap:14px}\n.sh-tintcell{display:flex;flex-direction:column;gap:6px;min-width:0}\n.sh-tintchip{width:76px;height:44px;border-radius:var(--r-xs);border:1px solid var(--line2);overflow:hidden;\n  background-color:#fff;\n  background-image:linear-gradient(45deg,#e6e6e8 25%,transparent 25%,transparent 75%,#e6e6e8 75%),linear-gradient(45deg,#e6e6e8 25%,transparent 25%,transparent 75%,#e6e6e8 75%);\n  background-size:10px 10px;background-position:0 0,5px 5px}\n.sh-tintfill{width:100%;height:100%}\n.sh-tintcap{font-family:var(--mono);font-size:9px;letter-spacing:.06em;text-transform:uppercase;color:var(--faint)}\n.sh-tintnote{margin-top:10px;font-size:11.5px;line-height:1.5;color:var(--faint)}\n.sh-tintnote b{font-family:var(--mono);font-size:11px;color:var(--ink2)}\n/* Specimen meta row \u2014 a mono label + its token pill(s) inline (type / motion specimens). */\n.spec-metarow{display:flex;gap:10px;align-items:center;flex-wrap:wrap}\n.obj-row{display:flex;gap:8px;margin-top:8px}\n\n.stage-vol{display:flex;flex-direction:column}\n.pvhost{display:flex;flex-direction:column;gap:16px}\n.pv-tscroll{overflow-x:auto;margin-top:8px}\n/* Contract tally \u2014 the one number this view exists to produce, stated before the 32 rows rather than\n   left to be scanned out of them. */\n.pv-tally{font-size:12.5px;font-weight:600;margin:10px 0 0;padding:9px 12px;border-radius:var(--r-sm);border:1px solid var(--line)}\n.pv-tally.ok{color:var(--ok);background:var(--panel)}\n.pv-tally.no{color:var(--danger);background:var(--panel)}\n/* Shadow and typography values are long single-line strings in a table whose Token column is narrow and\n   whose row has slack to spare. Let the value column take that slack and wrap, so the exhaustive dump\n   is actually exhaustive \u2014 the title attribute was carrying content the view is supposed to SHOW. */\n.toktable td.mcol .tok-hexv{white-space:normal;word-break:break-word}\n.toktable td.pair{white-space:nowrap;width:1%}\n.type-spec{margin-bottom:8px}\n.ts-list{display:flex;flex-direction:column;gap:22px;padding:14px 0 2px}\n.ts-row{display:flex;flex-direction:column;gap:8px;min-width:0}\n.ts-meta{font-size:11.5px;color:var(--faint)}\n.ts-sample{color:var(--ink);letter-spacing:-0.02em;line-height:1.1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n/* Type-specimen variants strip \u2014 the weights each group ships + italic/link/size-range (the type sub-levers). */\n.ts-variants{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 14px;margin-top:2px}\n.ts-var{font-size:14px;color:var(--ink2);line-height:1.2}\n.ts-var-range{font-size:11px;color:var(--faint);align-self:center}\n.shadow-spec{margin-bottom:8px}\n.sh-list{display:flex;flex-wrap:wrap;gap:28px;border-radius:var(--r-sm);padding:24px 20px;background:var(--paper);margin-top:14px}\n.sh-cell .tpill{margin-top:2px}\n.sh-cell{display:flex;flex-direction:column;align-items:center;gap:10px}\n.sh-card{width:64px;height:64px;border-radius:10px;background:#fff}\n.sh-lab{font-size:11.5px;color:#5b6472}\n.motion-spec{margin-bottom:8px}\n/* Top clearance as PADDING, matching .prow's padding:20px 0 6px \u2014 the convention every other\n   palSection follows, since .psec-d carries no bottom margin and the next element owns the gap.\n   The old margin:-4px pulled the row UP by more than .psec-d's entire 4px top margin, so the\n   select sat tighter to the description than a plain 0-margin element would have. */\n/* Duration ramp / easing set / springs \u2014 read-only tiers. Reuse .ctable (the dense read-only table\n   component) rather than minting a fourth table style; the Layout pass just retired a third one. */\n.mo-ramp{margin-top:10px}\n.mo-ramp td:nth-child(2),.mo-ramp td:nth-child(4){white-space:nowrap}\n.mo-ramp-name{font-size:12.5px;font-weight:640;color:var(--ink);margin-right:8px}\n.mo-ramp-ms{margin-right:8px}\n.mo-ramp-note{font-size:11px;color:var(--faint)}\n.mo-ramp-foot{display:flex;align-items:center;gap:9px;margin-top:12px;font-size:12px}\n.mo-ms-strip{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}\n.mo-ms-chip{display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:8px 10px;border:1px solid var(--line);border-radius:var(--r-sm);background:var(--panel)}\n.mo-ms-val{font-size:13px;font-weight:640;color:var(--ink)}\n.mo-ez-strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:12px;margin-top:8px}\n.mo-ez-card{display:flex;flex-direction:column;align-items:flex-start;gap:6px;min-width:0}\n/* position:relative is LOAD-BEARING. .mo-stage-svg is absolutely positioned (the specimen's .mo-stage\n   is relative and contains it); a static parent lets it escape to the viewport, and six curves then\n   render at 1500x1500 as giant diagonal strokes across the whole page. overflow:hidden does not save\n   you \u2014 an abspos descendant whose containing block is outside the element is not clipped by it.\n   Every DOM assertion passed while this was happening; only a screenshot showed it. */\n.mo-ez-stage{position:relative;width:100%;height:82px;border:1px solid var(--line);border-radius:var(--r-sm);background:var(--panel);overflow:hidden}\n/* Card pills WRAP rather than elide. Six curves in one row makes a ~123px card, and\n   motion.easing.expressive needs ~225px \u2014 no column width fixes that, so the label takes a second\n   line. tokenPill's <wbr> keeps the break on a dot. (Same call as the Preview gallery's card pills.) */\n.mo-ez-card .tpill,.mo-spring-card .tpill,.mo-ms-chip .tpill,.mo-colmeta .tpill{white-space:normal;overflow:visible;direction:ltr;word-break:break-word;max-width:100%}\n.mo-ez-name{font-size:13px;font-weight:640;color:var(--ink)}\n.mo-ez-bez{font-size:10.5px;color:var(--faint)}\n.mo-spring-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-top:8px}\n.mo-spring-card{display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:14px;border:1px solid var(--line);border-radius:var(--r-sm);background:var(--panel)}\n.mo-spring-nums{display:flex;flex-direction:column;gap:2px;font-size:11.5px;color:var(--muted)}\n.mo-toolbar{display:flex;justify-content:flex-end;margin:0 0 4px;padding-top:20px}\n.mo-slowmo{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--faint)}\n.mo-slowmo-sel{font:inherit;font-size:12px;color:var(--ink2);background:var(--panel);border:1px solid var(--line2);border-radius:var(--r-xs);padding:4px 8px;cursor:pointer}\n.mo-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;padding:14px 0 2px}\n@media(max-width:760px){.mo-grid{grid-template-columns:repeat(2,1fr)}}\n.mo-col{display:flex;flex-direction:column;gap:12px;min-width:0}\n.mo-stage{position:relative;aspect-ratio:1;background:var(--paper);border:1px solid var(--line);border-radius:var(--r);overflow:hidden}\n.mo-stage-svg{position:absolute;inset:0;width:100%;height:100%}\n.mo-stage-axis{stroke:var(--line2);stroke-width:1.5}\n.mo-stage-line{stroke:var(--line2);stroke-width:2.5;stroke-linecap:round}\n.mo-dot{position:absolute;width:10px;height:10px;border-radius:50%;background:var(--ink);left:11.364%;top:88.636%;transform:translate(-50%,-50%);animation-iteration-count:1;animation-fill-mode:both}\n@keyframes mo-trace-x{from{left:11.364%}to{left:88.636%}}\n@keyframes mo-trace-y{from{top:88.636%}to{top:11.364%}}\n.mo-colmeta{display:flex;flex-direction:column;gap:4px}\n.mo-colname{font-size:13px;font-weight:700}\n.mo-meta{font-size:11.5px;color:var(--faint)}\n/* #555 \u2014 --faint is already tuned to the AA floor on --paper (#355); fading it further with\n   opacity multiplies its already-floor ratio down below the gate (measured 3.12:1 rendered),\n   invisible to lint:contrast because the gate checks the token value, not the composited render.\n   De-emphasis here comes from a darker ink at full opacity instead, never from fading a floor value. */\n.mo-playnote{font-size:10.5px;color:var(--muted)}\n.mo-coldesc{font-size:11.5px;color:var(--muted)}\n.mo-replay{margin-top:14px;border:1px solid var(--line2);background:var(--panel);border-radius:var(--r-sm);padding:7px 14px;font:inherit;font-size:12.5px;color:var(--ink2);cursor:pointer}\n.mo-replay:hover{border-color:var(--ink);color:var(--ink)}\n@media (prefers-reduced-motion:reduce){.mo-dot{animation:none!important;left:88.636%!important;top:11.364%!important}}\n.radius-spec{margin-bottom:8px}\n.rad-list{display:flex;flex-wrap:wrap;gap:24px;border-radius:var(--r-sm);padding:24px 20px;background:var(--paper);margin-top:14px}\n.rad-cell{display:flex;flex-direction:column;align-items:center;gap:9px;min-width:72px}\n.rad-sw{width:72px;height:52px;background:var(--ink);opacity:.85}\n.rad-lab{font-size:11.5px;color:var(--muted)}\n.rad-cons{font-size:11px;color:var(--faint);text-align:center;max-width:88px;line-height:1.35}\n/* #1477 \u2014 the SELECTED control-shape preset card follows the #439 selection pattern (the mode chip,\n   :823): a panel ground with an ink border plus an INSET 1px ring, never the outset ring it used to\n   draw. An outline is painted OUTSIDE the border box, so at 2px it sat tight against the silhouette\n   and the next cell and read as a stray focus ring, colliding with the preview (owner QA). Inset\n   paints the 2px of contiguous ink (1px border + 1px ring) ENTIRELY within the border box, so it\n   cannot touch content and changes no outer dimension. The base cell reserves the same 1px border\n   (transparent) + padding, so selecting a card shifts no layout. Scoped to .rad-shapes so the\n   corner-radius ramp above \u2014 which shares .rad-* but has no selected state \u2014 is untouched. */\n.rad-shapes .rad-cell{border:1px solid transparent;border-radius:var(--r-sm);padding:11px 13px}\n.rad-shapes .rad-cell.on{background:var(--panel);border-color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink)}\n/* D (density) \u2014 the control-size specimen: mini controls at their resolved height + padding. */\n.sz-list{display:flex;flex-wrap:wrap;align-items:flex-end;gap:20px;border-radius:var(--r-sm);padding:24px 20px;background:var(--paper);margin-top:14px}\n.sz-cell{display:flex;flex-direction:column;align-items:center;gap:9px}\n.sz-box{display:flex;align-items:center;justify-content:center;min-width:44px;background:var(--ink);color:var(--panel);border-radius:6px;font-size:12px;font-weight:560}\n.sz-lab{font-size:11px;color:var(--muted);white-space:nowrap}\n/* #1667 button-layout specimen \u2014 geometry only, in the page ink. `.btnl-pinned` is Locked to edges: the icon\n   is out of flow at the visual padding, and the button pads that side by padding + icon + gap (set inline). */\n.btnl-list{display:flex;flex-direction:column;gap:18px;border-radius:var(--r-sm);padding:24px 20px;background:var(--paper);margin-top:14px}\n.btnl-row{display:flex;flex-wrap:wrap;align-items:center;gap:14px}\n.btnl-lab{flex:0 0 100%;font-size:11px;color:var(--muted)}\n.btnl-btn{position:relative;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;max-width:100%;background:var(--ink);color:var(--panel);font-weight:600;white-space:nowrap}\n.btnl-icon{flex:none;border-radius:2px;background:currentColor;opacity:.7}\n.btnl-label{flex:none}\n.btnl-icon.btnl-pinned{position:absolute;top:50%;transform:translateY(-50%)}\n/* Spacing ramp preview (#265) \u2014 the space.* steps as proportional bars (spacing has no other payoff). */\n.sp-list{display:flex;flex-direction:column;gap:7px;border-radius:var(--r-sm);padding:22px 20px;background:var(--paper);margin-top:14px}\n/* Label and bar on ONE row. Stacked, the 18 steps ran ~950px tall while the bars \u2014 now drawn at their\n   true px \u2014 used a fraction of the width the section had just gained. A fixed label column keeps every\n   bar starting at the same x, which is what makes the ramp readable as a ramp. */\n.sp-cell{display:flex;align-items:center;gap:14px;min-height:20px}\n.sp-cell .sp-lab{width:142px;flex:none;justify-content:flex-start}\n/* The read-only primitive scales (review). Dense wrap for the 36-step grid; one-per-row for the two\n   short alias scales, which read as lists rather than as a ladder. */\n.pv-scale{margin-bottom:16px}\n.pv-scale:last-child{margin-bottom:0}\n.pv-scale-t{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:7px}\n.pv-rows{display:flex;flex-direction:column;gap:5px}\n.pv-cell{display:flex;align-items:center;gap:6px}\n.sp-lab{font-size:11px;color:var(--muted);display:flex;align-items:center;gap:7px}\n.sp-px{font-size:11px;color:var(--faint);flex:none}\n/* Alpha & opacity \u2014 reuses the palette row + band components; only the checkerboard ground and the\n   inner fill are new. The GROUND is the swatch and the alpha goes on an inner .ao-fill: coloring the\n   swatch itself REPLACES the ground, which is how #442 shipped ten identical white steps. */\n.ao-chk{background-image:linear-gradient(45deg,#d8d8dc 25%,transparent 25%),linear-gradient(-45deg,#d8d8dc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d8d8dc 75%),linear-gradient(-45deg,transparent 75%,#d8d8dc 75%);\n  background-size:10px 10px;background-position:0 0,0 5px,5px -5px,-5px 0;background-color:var(--paper)}\n.ao-chk.dark{background-image:linear-gradient(45deg,#4a4a52 25%,transparent 25%),linear-gradient(-45deg,#4a4a52 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#4a4a52 75%),linear-gradient(-45deg,transparent 75%,#4a4a52 75%);background-color:#2a2a31}\n.ao-fill{position:absolute;inset:0}\n.pswatch.ao-chk{position:relative}\n/* Focus ring (review) \u2014 the numbers beside a live specimen; 2px at 2px offset is judged by eye. */\n.fr-wrap{display:flex;gap:26px;flex-wrap:wrap;align-items:flex-start;margin-top:10px}\n.fr-list{display:flex;flex-direction:column;gap:7px;min-width:0}\n.fr-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}\n.fr-v{font-size:11.5px;color:var(--ink2);font-weight:600}\n.fr-why{font-size:11.5px;color:var(--faint)}\n.fr-ex{display:flex;gap:22px;padding:6px 4px}\n.fr-excell{display:flex;flex-direction:column;gap:9px;align-items:center}\n.fr-btn{padding:7px 14px;border-radius:var(--r-xs);background:var(--panel);border:1px solid var(--line2);font-size:12.5px;color:var(--ink)}\n.fr-exlab{font-size:10.5px;color:var(--faint)}\n/* No min-width: the bar is drawn at its real px, so a floor would re-introduce exactly the lie this\n   fixed (0px and 2px rendering the same). space.0 draws nothing and says so in its label. */\n.sp-bar{height:12px;background:var(--ink);opacity:.55;border-radius:3px}\n.sp-bar.zero{width:0;border-left:1px dashed var(--line2);height:12px;opacity:1}\n/* A stacked block: the specimen owns the section's full width instead of a ~490px right column. */\n.cs-preview-full{margin-top:14px}\n/* Primitive scales: the long grid beside the two short alias lists. */\n.pv-cols{display:grid;grid-template-columns:1fr 1fr;gap:26px;align-items:start}\n.pv-col{min-width:0;display:flex;flex-direction:column;gap:20px}\n@media(max-width:760px){.pv-cols{grid-template-columns:1fr}}\n/* Manifest-advanced scalar/enum levers \u2014 exposed as a normal panel (no disclosure). */\n.adv-panel{margin-top:12px}\n/* Advanced object/list bespoke editors (responsive type, breakpoints, emphasized easing). */\n.adv-row{display:flex;align-items:center;gap:10px;margin-top:8px;font-size:12.5px;color:var(--ink2)}\n.adv-row-lab{min-width:150px}\n.adv-num{width:88px;padding:5px 7px;font-size:12px}\n.adv-unit{font-size:11px;color:var(--faint)}\n.adv-bplist{display:flex;flex-wrap:wrap;gap:8px;align-items:center}\n.adv-bp{display:flex;align-items:center;gap:2px}\n/* --hit-dx:4px (see .hit-min above) shifts the 24px hit box entirely rightward, into the 8px flex\n   gap toward the NEXT breakpoint cell rather than the 2px gap to this button's own input \u2014 measured\n   live to land at 0px overlap on the paired input, ~1.2px on the far edge of the next cell's input. */\n.adv-x{border:none;background:none;color:var(--faint);cursor:pointer;font-size:15px;line-height:1;padding:0 2px;--hit-dx:4px}\n.adv-x:hover{color:#a12}\n.adv-add{border:1px dashed var(--line2);background:none;color:var(--muted);cursor:pointer;font:inherit;font-size:12px;border-radius:var(--r-xs);padding:5px 10px}\n/* Layout specimen \u2014 breakpoint/grid table + column preview + container bars. */\n.layout-spec{margin-bottom:8px}\n.ly-table{border-collapse:collapse;width:100%;font-size:12px;border:1px solid var(--line);border-radius:var(--r);overflow:hidden;margin-bottom:16px}\n/* 7px/8px is .ctable's padding. At 12px the six columns plus nowrap headers overran the 492px preview\n   pane and clipped the Margin column \u2014 the 12px header fixed one wrap by creating a worse defect. */\n.ly-table th,.ly-table td{padding:7px 8px;border-bottom:1px solid var(--line);text-align:right}\n.ly-table th:first-child,.ly-table td:first-child{text-align:left}\n/* Header typography matches .ctable \u2014 12px/700, sentence case. It was 11px/600 and, uniquely in the\n   whole app, text-transform: lowercase \u2014 a third header treatment beside .mtbl-tbl's 9.5px uppercase\n   and .ctable's 12px sentence case, on a table that is doing exactly .ctable's job (dense, read-only).\n   Measured across all nine pages before changing it \u2014 the Typography pass produced a casing FALSE\n   positive by comparing textContent, so this compares the computed textTransform instead.\n   The right-aligned numerics and the bordered shell stay: those are earning their difference. */\n.ly-table th{font-size:12px;font-weight:700;color:var(--muted);letter-spacing:normal;background:var(--panel);white-space:nowrap}\n.ly-table tr:last-child td{border-bottom:none}\n/* The table's scroll pane. margin-bottom moves off .ly-table onto the wrapper so the spacing below the\n   table is unchanged; the table keeps width:100% and simply overflows this box when it must. */\n.ly-tscroll{overflow-x:auto;margin-bottom:16px}\n.ly-tscroll>.ly-table{margin-bottom:0}\n.ly-cap{font-size:11.5px;color:var(--muted);margin:0 2px 8px}\n.ly-ruler{position:relative;height:44px;margin:2px 2px 22px;border-bottom:2px solid var(--line2)}\n.ly-tick{position:absolute;bottom:0;display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding-left:5px}\n.ly-tick::before{content:'';position:absolute;left:0;bottom:0;width:2px;height:11px;background:var(--ink2)}\n.ly-tick-name{font-size:10.5px;font-weight:640;color:var(--ink2);line-height:1}\n.ly-tick-px{font-size:9.5px;color:var(--faint);line-height:1}\n.ly-cols{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px;height:44px;margin-bottom:18px}\n.ly-col{background:var(--ink);opacity:.14;border-radius:3px}\n.ly-cont{display:flex;flex-direction:column;gap:8px}\n.ly-cont-row{display:flex;align-items:center;gap:12px}\n/* 172px, not 150: at 150 the widest pill (container.narrow, 115px) plus its value left no room, so the\n   two ran together \u2014 \"container.narrow720px\" was literally the row's text content. */\n.ly-cont-lab{font-size:11.5px;color:var(--muted);min-width:172px;display:flex;align-items:center;gap:7px}\n/* margin-left:auto right-aligns the three values into a column against the track, instead of letting\n   each one start wherever its pill happens to end (100% / 1440px / 720px read ragged otherwise). */\n.ly-cont-val{flex:none;margin-left:auto}\n/* The track is what a bar's percentage resolves against. Without it, 100% meant the whole row \u2014\n   including the label \u2014 and only the bar wide enough to overflow got shrunk back to reality. */\n.ly-cont-track{flex:1;min-width:0}\n.ly-cont-bar{height:16px;background:var(--ink);opacity:.55;border-radius:3px}\n/* fluid is the uncapped default \u2014 drawn as an outline so it reads as \"no cap\" rather than as a third\n   solid bar competing with the two that ARE caps. */\n.ly-cont-row:first-child .ly-cont-bar{background:transparent;opacity:1;border:1px dashed var(--line2)}\n/* Controls-beside-previews pages (#264 Layout, #265 Size & radius): each control sits next to its live\n   preview, so a change is visible without scrolling. The control column is fixed-narrow (no full-width\n   sliders); the preview takes the rest and wraps under the controls on a narrow viewport. */\n.cs-split{display:grid;grid-template-columns:minmax(220px,280px) 1fr;gap:28px;align-items:start}\n@media(max-width:820px){.cs-split{grid-template-columns:1fr;gap:18px}}\n.cs-ctl-col{display:flex;flex-direction:column;gap:16px;min-width:0}\n.cs-preview{min-width:0}\n.cs-ctl-stack{display:flex;flex-direction:column;gap:18px}\n.cs-ctl{display:flex;flex-direction:column;gap:8px}\n.cs-ctl-top{display:flex;align-items:baseline;justify-content:space-between;gap:10px}\n.cs-ctl-lab{font-weight:600;font-size:13px;color:var(--ink)}\n.cs-ctl-val{font-variant-numeric:tabular-nums;color:var(--muted);font-size:12.5px}\n.cs-range{width:100%;accent-color:var(--ink)}\n.gradient-spec{margin-bottom:8px}\n.gr-list{display:flex;flex-wrap:wrap;gap:22px;border:1px solid var(--line);border-radius:var(--r);padding:24px;background:var(--panel)}\n.gr-cell{display:flex;flex-direction:column;gap:10px}\n.gr-sw{width:200px;height:96px;border-radius:var(--r-xs);border:1px solid var(--line)}\n.gr-lab{font-size:11.5px;color:var(--muted)}\n/* Gradient editor (docs/23 \xA72) \u2014 one card per gradient. */\n.gr-ed-list{display:flex;flex-direction:column;gap:14px;margin-top:12px}\n.gr-ed-card{border:1px solid var(--line);border-radius:var(--r);background:var(--panel);padding:22px}\n.gr-ed-head{display:flex;align-items:center;gap:10px;margin-bottom:14px}\n.gr-ed-name{margin:0;font-size:15px;font-weight:620;color:var(--ink)}\n.gr-ed-head .rx{margin-left:auto}\n.gr-ed-sw{width:100%;height:120px;border-radius:var(--r-sm);border:1px solid var(--line);margin-bottom:16px}\n.gr-ed-ctrls{display:flex;flex-wrap:wrap;gap:16px 20px;align-items:flex-end}\n.gr-ed-field{display:flex;flex-direction:column;gap:6px}\n.gr-ed-lab{font-size:12px;font-weight:560;color:var(--muted)}\n.gr-ed-range{width:180px;accent-color:var(--ink)}\n.gr-ed-num{width:96px;padding:9px 11px;font-size:13.5px}\n.gr-ed-stopsh{margin:20px 0 10px;font-size:12.5px;font-weight:600;color:var(--muted);letter-spacing:.02em}\n.gr-ed-stops{display:flex;flex-direction:column;gap:10px}\n.gr-ed-stop{display:flex;align-items:center;gap:10px}\n.gr-ed-stopsw{width:34px;height:34px;flex:none;border-radius:var(--r-xs);border:1px solid var(--line2)}\n.gr-ed-stop .gr-ed-num{flex:none}\n.gr-ed-stoprm{flex:none}\n.gr-ed-addstop{margin-top:12px;width:auto;padding:7px 13px;font-size:12px}\n.gr-ed-add{margin-top:14px}\n.gr-ed-nameinput{font:inherit;font-size:15px;font-weight:620;color:var(--ink);background:var(--paper);border:1px solid var(--line2);border-radius:var(--r-xs);padding:6px 10px;width:150px}\n/* Mode-context strip (#171) \u2014 one mode at a time; sticky so the context stays reachable while\n   scrolling the stage. The whole stage below reflects the selected mode. */\n.modectx{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0;padding:0}\n/* Control bars are BARE (#485). A white card is what a CONTENT section looks like, so a control bar\n   wearing one reads as a sibling of the thing it operates rather than as the operator: .tok-ctrls\n   rendered background #ffffff / border 1px / radius 10, byte-for-byte the section card directly\n   below it. Stripping the card leaves cards meaning exactly one thing. Safe for the sticky bar\n   because the opaque ground lives on .modebar, the sticky HOST, not on .modectx -- scrolled content\n   is still occluded and .stuck still carries the shadow. */\n/* Scroll, never wrap. Wrapping was affordable in the header, where the bar owned the full window\n   width; in the content column it is narrower, so a brand with several modes wrapped to a second\n   row and spent real vertical space on every page \u2014 worst on mobile, where it was already a\n   second sticky strip. Overflow scrolls instead, so the bar's height is constant at any mode count. */\n.mctx-modes{display:flex;align-items:center;gap:6px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:thin}\n.mctx-modes>*{flex:none}\n.mctx-cap{font-size:11px;font-weight:640;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-right:6px}\n.mctx-b{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line2);background:var(--paper);border-radius:var(--r-sm);padding:5px 11px;font:inherit;font-size:13px;color:var(--ink2);cursor:pointer}\n.mctx-b:hover{border-color:var(--ink)}\n/* #439 \u2014 the selected chip is a WHITE ground with an ink border plus a 1px ring, not a solid ink\n   fill. Mode is a SCOPE, not a destination: dressing it as the loudest tab on the page made it\n   heavier than the rail that chooses the page, which only got worse when the bar moved into the\n   content column (#432). The ring keeps it findable without it shouting.\n   The read-only marker no longer needs a white-on-dark variant either. */\n/* INSET ring, not an outset one. An outset ring is painted OUTSIDE the border box, and this chip\n   lives in .mctx-modes, which scrolls (#432). Setting overflow-x:auto makes overflow-y compute\n   to auto as well -- per spec, visible on one axis becomes auto when the other is not visible --\n   so the strip clips vertically, and the strip is exactly as tall as its chips. Measured: chip\n   box 116.9-149.1, ring wanted 115.9-150.1, clipped top AND bottom, leaving the sides only.\n   Inset paints the same 2px of contiguous ink (1px border + 1px ring) entirely within the\n   border box, so it looks the same, cannot be clipped, and changes no outer dimension. */\n.mctx-b.on{background:var(--panel);color:var(--ink);border-color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink);font-weight:560}\n/* \"View only\", not \"auto\": these modes are derived and the engine REFUSES per-mode levers on them,\n   so the honest fact is that you cannot edit here \u2014 which is what a user needs, where \"auto\" only\n   described how the mode was produced. Sits inside the chip rather than as a caption beneath it:\n   after the wrap-to-scroll change (#432) the bar spends width freely and height not at all. */\n.mctx-vo{font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;font-weight:600;color:var(--faint);border:1px solid var(--line2);border-radius:4px;padding:0 4px;line-height:1.5;white-space:nowrap}\n/* Inline variant (#432): the same editor embedded in the brand menu, which is itself a popover \u2014\n   so it drops the positioning, shadow, border and fixed width and simply flows in the parent. */\n.mctx-menu.inline{position:static;width:auto;padding:0;background:none;border:0;box-shadow:none;z-index:auto}\n.mctx-menu{position:absolute;right:0;top:calc(100% + 7px);width:264px;background:var(--panel);border:1px solid var(--line2);border-radius:var(--r);box-shadow:0 10px 30px rgba(20,22,30,.14);padding:10px;z-index:20}\n.mctx-mcap{font-size:11px;font-weight:640;text-transform:uppercase;letter-spacing:.045em;color:var(--faint);padding:4px 6px 8px}\n.mctx-opt{display:flex;align-items:center;gap:9px;width:100%;border:0;background:none;font:inherit;font-size:13.5px;color:var(--ink2);padding:7px 6px;border-radius:var(--r-xs);cursor:pointer;text-align:left}\n.mctx-opt:hover{background:var(--paper)}\n.mctx-box{width:16px;height:16px;flex:none;border:1px solid var(--line2);border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;color:#fff}\n.mctx-opt.on .mctx-box{background:var(--ink);border-color:var(--ink)}\n/* #57 \u2014 Light row is locked (base mode): muted, grayed check, no hover \u2014 reads as non-interactive. */\n/* #1770 \u2014 locked, not faded: the lock glyph says so, and the row's text keeps its full ink (a .72 fade took\n   `--faint` \"always\" from 5.13:1 to 2.95:1). */\n.mctx-opt.fixed{cursor:default}\n.mctx-lock{width:13px;height:13px;flex:none}\n.mctx-opt.fixed:hover{background:none}\n.mctx-opt.fixed .mctx-box{background:var(--muted);border-color:var(--muted)}\n.mctx-always{margin-left:auto;font-size:10px;text-transform:uppercase;letter-spacing:.03em;color:var(--faint)}\n.mctx-opt.disabled{color:var(--faint);cursor:not-allowed}\n.mctx-opt.disabled:hover{background:none}\n.mctx-div{height:1px;background:var(--line);margin:8px 4px}\n.mctx-note{font-size:11.5px;line-height:1.5;color:var(--faint);margin:6px 6px 2px}\n/* C2 \u2014 custom-mode rows + add form in the Edit-modes popover. */\n.mctx-custom{display:flex;align-items:center;gap:8px;padding:6px 6px;font-size:13px;color:var(--ink2)}\n.mctx-cname{font-weight:560}\n.mctx-cbase{font-size:11px;color:var(--faint)}\n.mctx-crm{margin-left:auto;width:22px;height:22px;flex:none;border:1px solid var(--line2);background:var(--panel);border-radius:var(--r-xs);color:var(--faint);cursor:pointer;font-size:14px;line-height:1}\n.mctx-crm:hover{background:#fdecec;color:#a12;border-color:#f2c6c6}\n.mctx-addform{display:flex;flex-direction:column;gap:10px;padding:8px 6px}\n/* #56 \u2014 labeled add-mode fields (name + base). */\n.mctx-addfield{display:flex;flex-direction:column;gap:4px}\n.mctx-addlab{font-size:11px;font-weight:560;color:var(--muted);letter-spacing:.01em}\n.mctx-addname{padding:7px 9px;border:1px solid var(--line2);border-radius:var(--r-xs);font:inherit;font-size:13px;background:var(--paper);color:var(--ink)}\n.mctx-adderr{margin:0;font-size:11.5px;color:#a12;line-height:1.4}\n.mctx-adderr:empty{display:none}\n.mctx-addbtns{display:flex;gap:8px}\n.mctx-addbtn{border:1px solid var(--ink);background:var(--ink);color:#fff;border-radius:var(--r-xs);padding:6px 14px;font:inherit;font-size:13px;font-weight:560;cursor:pointer}\n.mctx-addcancel{border:1px solid var(--line2);background:var(--panel);border-radius:var(--r-xs);padding:6px 12px;font:inherit;font-size:13px;color:var(--ink2);cursor:pointer}\n/* A2a \u2014 generated-mode (HC/wireframe) read-only view: an explanation + a per-mode contract verdict. */\n.genview{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:22px 24px;margin:8px 0 0}\n.genview-t{margin:0;font-size:16px;font-weight:640;letter-spacing:-0.01em}\n.genview-d{margin:10px 0 0;color:var(--muted);font-size:14px;line-height:1.6;max-width:64ch}\n.genview-chip{display:inline-flex;align-items:center;gap:8px;margin-top:16px;padding:7px 12px;border-radius:var(--r-sm);font-size:13px;font-weight:540}\n.genview-chip.ok{background:var(--ok-tint);color:var(--ok);border:1px solid var(--ok-edge)}\n.genview-chip.no{background:var(--danger-tint);color:var(--danger);border:1px solid var(--danger-edge)}\n.gv-mark{font-weight:700}\n.genview-hint{margin:14px 0 0;color:var(--faint);font-size:12.5px;line-height:1.55}\n.cbadge{display:inline-flex;align-items:center;gap:6px;padding:3px 8px;border-radius:999px;font-size:11px;border:1px solid var(--line2)}\n.cbadge.ok{background:var(--ok-tint);border-color:var(--ok-edge)}\n.cbadge.no{background:var(--danger-tint);border-color:var(--danger-edge)}\n.cb-lab{color:var(--muted)}\n.cb-ratio{font-variant-numeric:tabular-nums;font-weight:600}\n.cbadge.ok .cb-mark{color:var(--ok)}.cbadge.no .cb-mark{color:var(--danger)}\n.tpill{font-size:10.5px;padding:2px 7px;border-radius:5px;background:var(--panel);border:1px solid var(--line);color:var(--faint)}\n/* #289 \u2014 long paths elide rather than wrapping. Applied to .tpill itself, not to the two\n   containers that happened to be reported: the pill is used in 27 places and any narrow one has the\n   same problem, so per-context rules would just wait for the next narrow column. max-width:100% plus\n   a min-width:0 parent is what lets it shrink; where the pill has room, nothing changes. */\n.tpill{display:inline-block;position:relative;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:top;direction:rtl;text-align:left}\n/* direction:rtl moves the ellipsis to the START, so the ELIDED end is the shared namespace prefix and\n   the visible end is the tail that distinguishes siblings \u2014 color.foreground.brand vs\n   color.foreground.brand-subtle stay tellable apart, where a right-side ellipsis renders both as the\n   same stub. The path is pure-ASCII with no trailing punctuation, so bidi reordering is a no-op on it\n   (asserted in the audit: every pill's text node still equals its title). */\n/* #1147 \u2014 the `inverse` badge rides BESIDE the pill, outside its overflow box, because the rule above\n   elides the START of the path and #1141 put the inverse discriminator there. A wrapper rather than\n   anything inside .tpill: inline content would be elided by the same rule, and text content would\n   change what a copied path yields (the two measured regressions tokenPill's comment records).\n   min-width:0 on both is the standard guard against a flex item's min-content floor, and it is a GUARD\n   rather than an observed fix \u2014 dropping it changes nothing measurable at 1440px or at 380px (the\n   plugin's own MIN_SIZE.width): no container the studio renders is narrow enough to push a wrapper\n   past its parent, so the floor never applies. Measured both ways for #1147, which is also why the\n   smoke suite asserts nothing about it \u2014 the assertion would pass with the line deleted. It stays\n   because the day a container does narrow, a flex item that cannot shrink stops eliding entirely. */\n.tpill-wrap{display:inline-flex;align-items:baseline;gap:5px;max-width:100%;min-width:0;vertical-align:top}\n.tpill-wrap .tpill{min-width:0}\n.tpill-inv{flex:none;font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 5px;border-radius:4px;background:var(--panel);border:1px solid var(--line2);color:var(--muted)}\n.sg-failpill{padding-right:19px}\n.sg-failpill .sg-fx{position:absolute;right:6px;top:2px;margin:0}\n/* Interactive & action colors \u2014 per-mode note + add-accent row (#69). */\n.ic-modenote{margin:0 0 14px;font-size:12.5px;color:var(--muted);line-height:1.55;padding:10px 13px;background:var(--paper);border:1px solid var(--line);border-radius:var(--r-sm)}\n/* A2c \u2014 per-mode foreground/text override rows. */\n.fg-row{display:flex;align-items:center;gap:12px;margin-top:10px}\n.fg-sw{width:34px;height:34px;flex:none;border-radius:var(--r-xs);border:1px solid var(--line2)}\n.ic-add{display:flex;align-items:center;gap:12px;margin-top:14px}\n.ic-addbtn{width:auto;margin-top:0;flex:none}\n.ic-addhint{font-size:13px;color:var(--muted)}\n/* Backgrounds card \u2014 the contrast-floor sub-control appended below the card body. */\n/* Backgrounds Inverse card \u2014 the derived, read-only surface (docs/24 #61). */\n.bg-derived{font-size:12.5px;color:var(--faint);font-style:italic}\n.bg-floor{display:flex;align-items:center;gap:10px;margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}\n.bg-floor-lab{font-size:12.5px;font-weight:560;color:var(--muted)}\n.bg-floor .select{margin-left:auto}\n/* Interactive matrix (#69) \u2014 global-behavior caption, per-palette section header, slot rows, states. */\n.gcap{margin:8px 0 2px;padding:0 2px}\n.gcap-t{margin:0;font-size:12.5px;font-weight:680;text-transform:uppercase;letter-spacing:.06em;color:var(--faint)}\n.gcap-d{margin:4px 0 0;color:var(--faint);font-size:12.5px;line-height:1.5;max-width:660px}\n.psec-h{display:flex;align-items:center;justify-content:space-between;gap:12px}\n.arow{padding:26px 2px}\n.arow+.arow{border-top:1px solid var(--line)}\n.arow-main{display:grid;grid-template-columns:56px minmax(0,1fr) 300px;gap:20px;align-items:start}\n.arow-lead .arow-main{grid-template-columns:minmax(0,1fr) 300px}\n.asw{width:56px;height:56px;flex:none;border-radius:var(--r-sm);border:1px solid var(--line2)}\n.amid{min-width:0;display:flex;flex-direction:column;gap:9px;align-items:flex-start}\n.alabel{font-size:14px;font-weight:640;line-height:1.2;color:var(--ink)}\n.amid .sf-ctlblock{width:100%}\n.amid .select{max-width:300px}\n.amid .tpill{line-height:1.4}\n.adesc{font-size:11.5px;color:var(--faint);line-height:1.45;max-width:340px}\n.aex{width:300px;justify-self:end;display:flex;flex-direction:column;align-items:stretch;gap:8px}\n.aex .cbadge{align-self:flex-end}\n/* Its own display:flex, no longer inherited from .aex: the two-up row is now nested INSIDE the .aex\n   column rather than sharing an element with it, so the column can stack a contrast receipt beneath. */\n.aex-two{display:flex;flex-direction:row;gap:14px}\n.aex-spec{flex:1;min-width:0;display:flex;flex-direction:column;gap:7px;align-items:center}\n.exbox{width:100%;min-height:72px;border-radius:var(--r-sm);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;padding:14px 16px;overflow:hidden}\n/* #555 \u2014 background is set inline per element (exGround, mode-resolved); this is only the fallback\n   for the instant before JS runs, and the border override for the (now inline-dark) box. */\n.exbox.dark{background:#0d0d10;border-color:transparent}\n/* #576 \u2014 the outline edge is a custom property, not the inline `border` shorthand `exOutline` used to\n   set. An inline shorthand beats `.ibtn:hover`, so a stateful border set that way could never move; the\n   states now ride the same var-fallback chain the background already uses. `--ibtn-bw` is set by\n   `exOutline` alone, so every other specimen falls back to 0 and a filled button grows no border. */\n.ibtn{display:inline-flex;align-items:center;gap:7px;border-radius:8px;padding:9px 16px;font-size:13.5px;font-weight:600;white-space:nowrap;background:var(--ibtn-bg);border:var(--ibtn-bw,0) solid var(--ibtn-bd,transparent)}\n.ibtn:hover{background:var(--ibtn-hbg,var(--ibtn-bg));border-color:var(--ibtn-hbd,var(--ibtn-bd,transparent))}\n.ibtn.is-pressed,.ibtn.is-pressed:hover{background:var(--ibtn-pbg,var(--ibtn-hbg,var(--ibtn-bg)));border-color:var(--ibtn-pbd,var(--ibtn-hbd,var(--ibtn-bd,transparent)))}\n.ibtn svg{width:16px;height:16px}\n.ilink{font-size:15px;font-weight:600;text-decoration:underline;text-underline-offset:3px;color:var(--ilink-fg)}\n.ilink:hover{color:var(--ilink-hfg,var(--ilink-fg))}\n.ilink.is-pressed,.ilink.is-pressed:hover{color:var(--ilink-pfg,var(--ilink-hfg,var(--ilink-fg)))}\n/* #291 \u2014 live hover/pressed on interactive examples: :hover is CSS-native; pressed is click-to-pin\n   (see wirePress) since a bare :active vanishes on mouse-up, too fleeting to evaluate a color. */\n.pinnable{cursor:pointer}\n.pinnable.is-pressed{outline:2px solid var(--ink2);outline-offset:2px}\n.inote{display:inline-flex;align-items:center;gap:7px;font-size:14px}\n.inote-ic{display:inline-flex}\n.inote-ic svg{width:17px;height:17px}\n.astates{margin-top:16px;padding-top:14px;border-top:1px dashed var(--line2);margin-left:76px}\n.astates-h{font-family:var(--mono);font-size:9px;letter-spacing:.07em;text-transform:uppercase;color:var(--faint);margin-bottom:10px}\n.astates-g{display:grid;grid-template-columns:1fr 1fr;gap:14px}\n.astate{border:1px solid var(--line);border-radius:var(--r-xs);background:var(--paper);padding:11px 12px;display:flex;flex-direction:column;gap:9px}\n.astate-h{display:flex;align-items:center;gap:10px}\n.astate-sw{width:30px;height:30px;border-radius:6px;flex:none;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}\n.astate-n{font-size:12.5px;font-weight:600;color:var(--ink)}\n.astate .select{width:100%;font-size:12px;padding:6px 9px;padding-right:26px}\n/* .aex-two had its own grid-column:1/-1 here; it is now nested inside .aex, which carries the span,\n   so the nested copy applied to a non-grid child and did nothing. */\n@media(max-width:900px){.arow-main{grid-template-columns:56px 1fr}.arow-lead .arow-main{grid-template-columns:1fr}.aex{width:100%;grid-column:1/-1}.astates-g{grid-template-columns:1fr}.astates{margin-left:0}}\n/* #560 \u2014 between the 900px stack breakpoint and #app's 1200px cap, .arow-main's middle (mid) column is\n   exactly viewport minus 800px (the 56px swatch + two 20px gaps + 300px .aex are fixed; the mid column\n   absorbs 100% of any remaining slack via minmax(0,1fr), so the relationship is 1:1). The two longest\n   token paths in the system AT THE TIME (\u2026on-inverse.fill.rest / \u2026on-inverse.text.rest, 49 characters,\n   both 325px at the pill's font) needed the mid column at 327px (325 + the pill's 1px+1px border) to\n   render unclipped \u2014 which needs\n   viewport 1127px or wider. Below that, from ~1114px up to ~1126px, those two are the ONLY pills that\n   still clip (every shorter path already fits); 1120px sits inside that narrow band. Trimming the .aex\n   example column by 12px in this same band moves the cure threshold down to viewport 1115px, which\n   covers the whole 1114-1126px band with margin \u2014 the pill needs 7 more px, this gives it 12. Scoped to\n   .arow:not(.arow-lead) because lead rows (Action palette, Button emphasis, ...) use a different grid\n   template with no swatch column and never carry a pill \u2014 touching .arow-lead's copy of .aex would only\n   leave dead space in its 300px track, so it stays out of the selector rather than being ignored by\n   coincidence. Below 900px this is moot (.aex already goes full-width); above 1200px #app's own\n   max-width caps further viewport growth from helping anyway, so the band stops there.\n\n   THE 325px IS A COMMIT-PINNED MEASUREMENT AND HAS SINCE BEEN OUTGROWN \u2014 flagged, not fixed here.\n   #576 gave the outline edge states AFTER this was written, and `\u2026destructive.on-inverse.border.pressed`\n   (55 characters) was longer than either path measured above from that moment on. #891's rename takes\n   the longest to `color.interactive.destructive.inverse.border.pressed` at 52 characters \u2014 still 3\n   longer than the 49 this comment measured, so the true requirement is ABOVE 327px and this rule is a\n   partial cure at some viewports in the band. The rename can only have helped: every path in the family\n   shrank by exactly 3 characters, so the threshold moved down, never up. Re-measuring needs a browser at\n   the pill's font and is filed rather than guessed \u2014 a px number invented here would be the exact defect\n   this file has been fixing all week. Filed as #902, which also proposes asserting it in the smoke\n   suite against the longest path READ FROM THE TREE, so the calibration cannot rot a third time. */\n@media(min-width:901px) and (max-width:1199px){.arow:not(.arow-lead) .arow-main{grid-template-columns:56px minmax(0,1fr) 288px}.arow:not(.arow-lead) .aex{width:288px}}\n/* Surfaces & fills \u2014 full-width rows (Layout A, #68): controls LEFT \xB7 whitespace \xB7 example RIGHT, contrast below */\n/* The identity track is 256px, not 168px, because the token PATH has to be readable. At 168px three of\n   the page's thirteen paths elided \u2014 and #289's rtl elision keeps the tail, so\n   color.background.inverse.primary rendered as an unreadable \"\u2026kground.inverse.primary\". The widest\n   path this page can show measures 252px at the pill's font; 256 clears it with slack. The width comes\n   out of track 4, which is the deliberate whitespace spacer \u2014 breathing room is not worth buying with\n   an identifier the row exists to name. */\n.sf-row{display:grid;grid-template-columns:56px 256px 172px 1fr 228px;gap:20px;align-items:start;padding:24px 0}\n.sf-row+.sf-row{border-top:1px solid var(--line)}\n.sf-sw{width:56px;height:56px;flex:none;border-radius:var(--r-sm);border:1px solid var(--line2)}\n.sf-id{min-width:0;padding-top:2px}\n.sf-name{font-size:14.5px;font-weight:620;letter-spacing:-.01em;line-height:1.25;color:var(--ink)}\n.sf-id .tpill{margin-top:7px;line-height:1.4}\n.sf-desc{font-size:12px;color:var(--faint);margin-top:7px;line-height:1.45}\n.sf-ctl{display:flex;flex-direction:column;gap:12px;min-width:0}\n.sf-ctlblock{display:flex;flex-direction:column;gap:6px}\n.sf-ctlblock .select{width:100%}\n.sf-derived{font-size:12px;color:var(--faint);font-style:italic;height:36px;display:flex;align-items:center}\n.sf-right{grid-column:5;display:flex;flex-direction:column;align-items:flex-end;gap:8px}\n.sf-ex{width:228px;height:52px;border-radius:var(--r-sm);border:1px solid var(--line);display:flex;align-items:center;padding:0 16px;overflow:hidden}\n.sf-ex-surface{gap:11px;font-size:13px}\n.sf-ex-fill{color:#fff;font-weight:600;font-size:13.5px}\n.sf-ex-text{font-size:14.5px}\n.sf-railnote{font-size:10.5px;color:var(--faint)}\n/* Collapses at 1208px, not 900px. The five-column layout has a HARD floor: four of its tracks are\n   fixed (56+256+172+228) and the gaps add 80, so it needs 792px of row box and cannot shrink an\n   inch below that. The row box runs viewport-400, so 792 is not available until ~1192px \u2014 every\n   width below that renders a layout that cannot fit, pushing .sf-ex past the panel edge and\n   scrolling the document. 1208 leaves the spacer track a little width at the boundary rather than\n   exactly zero. (Was 1120 against a 704px floor, before the identity track widened to fit the paths.) */\n@media(max-width:1208px){.sf-row{grid-template-columns:56px 1fr;gap:14px}.sf-row .sf-ctl,.sf-right{grid-column:1/-1;align-items:flex-start}.sf-ex{width:100%}}\n.contracts{border:1px solid var(--line);border-radius:var(--r);background:var(--panel);padding:18px 20px}\n.contracts-sum{list-style:none;cursor:pointer;display:flex;align-items:baseline;gap:10px}\n.contracts-sum::-webkit-details-marker{display:none}\n.contracts-sum::before{content:'\u25B8';color:var(--faint);font-size:11px;align-self:center;transition:transform .12s ease}\n.contracts[open] .contracts-sum::before{transform:rotate(90deg)}\n.contracts-t{font-size:15px;font-weight:620;color:var(--ink)}\n.contracts-hint{font-size:11.5px;font-weight:500;color:var(--faint)}\n.contracts:not([open]) .np-note{display:none}\n.ctable{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}\n.ctable th,.ctable td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--line)}\n.ctable .mcol{text-align:center}\n/* Token list: value columns read best flush-left (swatch+hex / px), overriding the shared centring. */\n.toktable .mcol{text-align:left}\n.pair{color:var(--ink2)}\n.pair-path{display:block;color:var(--ink2)}\n.pair-sub{display:block;font-size:11px;color:var(--faint);margin-top:1px}\n.pvseg{display:inline-flex;gap:2px;padding:3px;background:var(--panel);border:1px solid var(--line);border-radius:var(--r-sm);margin:2px 0 22px}\n.pvseg-b{font:inherit;font-size:13px;padding:7px 15px;border:none;background:none;color:var(--ink2);border-radius:var(--r-xs);cursor:pointer}\n.pvseg-b:hover{color:var(--ink)}\n.pvseg-b.on{background:var(--paper);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.06)}\n.tok-val{display:inline-flex;align-items:center;gap:7px}\n.tok-sw{display:inline-block;width:14px;height:14px;border-radius:3px;border:1px solid var(--line2);flex:none}\n.tok-shadow{display:inline-block;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom;color:var(--muted)}\n/* Token list, tier split (#390). The two-line cell is the both-Show state: alias over value. */\n/* L3 of the selection ladder (#439): a tab group NESTED inside another tab group. The token list's\n   Primitives/Semantics segment sits directly under Preview's own Style guide/Contrast/Token list\n   segment, and both were rendering the identical filled treatment 67px apart -- nothing said the\n   second row lived INSIDE the first.\n   Underline rather than a second gray: a third fill would need a value quieter than --paper but\n   louder than transparent, i.e. a three-step gray ramp inside one component, and it would break\n   again the moment anyone retuned those grays. Changing the KIND of emphasis cannot collide.\n   The track chrome goes too -- a nested group is not a control surface of its own. */\n.tok-seg{margin:2px 0 0;background:none;border:0;padding:0;gap:18px;border-radius:0}\n.tok-seg .pvseg-b{padding:7px 1px;border-radius:0;color:var(--muted);box-shadow:inset 0 -2px 0 transparent}\n.tok-seg .pvseg-b:hover{color:var(--ink)}\n.tok-seg .pvseg-b.on{background:none;color:var(--ink);font-weight:560;box-shadow:inset 0 -2px 0 var(--ink)}\n.tok-ctrls{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-end;margin:18px 0 8px}\n.tok-two{display:flex;flex-direction:column;gap:3px}\n.tok-stack{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;align-items:baseline}\n.tok-alias{color:var(--ink2);font-size:11.5px;white-space:nowrap}\n.tok-chain{color:var(--faint);cursor:help}\n.tok-hexv{color:var(--faint);font-size:11.5px;white-space:nowrap;display:inline-block;max-width:260px;overflow:hidden;text-overflow:ellipsis;vertical-align:bottom}\n.tok-callout{margin:10px 0 0;padding:7px 10px;background:var(--paper);border-radius:var(--r-xs);color:var(--muted);font-size:11.5px;line-height:1.5}\n.tok-empty{color:var(--faint);font-size:13px;padding:16px 2px}\n.dot{display:inline-block;width:8px;height:8px;border-radius:999px;margin-right:5px;vertical-align:middle}\n/* Status DOTS are non-text (SC 1.4.11, 3:1) and already cleared that bar \u2014 they join the set for\n   consistency, not compliance. One status green should be one green. */\n.ratio{font-variant-numeric:tabular-nums;color:var(--muted)}\n/* The global bar (#388) carries .errbar-global as a marker only \u2014 it deliberately has NO rules of its\n   own. A full-bleed variant was written first and was silently inert: it sat above .errbar at equal\n   specificity, so every declaration lost the source-order tiebreak. Rendered, the plain .errbar card\n   matches the mode bar it sits under, so the right fix was to delete the override, not to reorder it.\n   (No backticks in this stylesheet \u2014 it is a template literal; see #366.)\n   .errbar now has exactly ONE mint (#772): the Color page's own copy was folded into the declared\n   chrome, and `.psec .errbar{margin-top:16px}` went with it rather than being left as a rule reserved\n   against an element nothing renders. */\n.errbar{border:1px solid #f2c6c6;background:#fdecec;color:#a12;border-radius:var(--r-sm);padding:10px 14px;font-size:13px;margin-bottom:16px}\n\n/* Style guide (Preview \u2192 Style guide) \u2014 specimen layout; shell/pill come from .psec/.sub-lab/.tpill */\n/* The surface picker \u2014 one control for the whole view, above the sections it governs. */\n.sg-surfbar{display:flex;flex-direction:column;gap:6px;margin:18px 0 8px}\n/* Asymmetric on purpose, matching .tok-ctrls: more room above than below, so proximity groups the\n   bar with the content it scopes. The old 12/10 was near-symmetric and left it floating between. */\n.sg-surfrow{display:flex;align-items:stretch;gap:10px;flex-wrap:wrap}\n.sg-surfstack{display:flex;flex-direction:column;gap:8px;align-items:flex-start}\n/* HEIGHT comes from the row, not from a number: align-self:stretch takes the swatch to whatever the\n   select beside it measures. A hard 33px was 8px short of the select and reproduced, in a brand new\n   control, the exact mismatch #484 had just removed from the segmented one \u2014 so the dimension that\n   was complained about is the one that must not be hand-set.\n   WIDTH is stated, because it cannot be derived: aspect-ratio:1 does not resolve a flex item's main\n   size from a STRETCHED cross size, and trying it collapsed the swatch to 2px (the borders alone).\n   A width that drifts a little from square if the control height changes is cosmetic; a height that\n   drifts from its neighbor is the bug.\n   No inner ring. One was added to \"keep a near-white ground from vanishing into the field it sits next\n   to\", and it cannot do that: composited at .55 over a white fill it resolves to 255, byte-identical to\n   the fill it was meant to distinguish. Over the inverse ground it computes to 146 and IS visible, which\n   is the one ground that never needed help. The --line2 border is what actually separates the swatch\n   from the field, on every ground, and it was already there \u2014 measured 1.118:1 border-vs-swatch on the\n   Page ground, against the ~1.05 the ring would have contributed (#504 review).\n   No backticks in this block: it lives inside a TS template literal, so one closes the CSS string. */\n.sg-surfsw{align-self:stretch;width:41px;border-radius:var(--r-xs);border:1px solid var(--line2);\n  flex:none}\n.sg-surfbar .pfk{flex:none}\n/* The mode's own canvas behind the specimens. Inset from the .psec so the studio shell still reads as\n   the frame; the re-scoped custom properties (set inline) carry the theme to everything inside. */\n.sg-ground{margin-top:14px;padding:18px 18px 20px;border-radius:var(--r);border:1px solid var(--line);\n  color:var(--ink);transition:background .12s ease}\n.sg-ground .sub-t{color:var(--muted)}\n.sg-grid{display:grid;gap:14px;margin-top:2px}\n.sg-g3{grid-template-columns:repeat(3,1fr)}.sg-g5{grid-template-columns:repeat(5,1fr)}\n.sg-cw{display:flex;flex-direction:column;gap:8px;min-width:0}\n/* Gallery pills WRAP instead of eliding. #289's elision is right in a table cell, where a column can\n   only be so wide and siblings differ by their tail; here the grid width is fixed by the semantic set\n   (five status columns), so a ~148px card could never fit color.foreground.warning and every semantic\n   pill in the Bold and Subtle rows rendered as \"\u2026r.foreground.warning\". A pill under a card has the\n   vertical room a table cell does not, so it takes a second line and stays readable. */\n.sg-pills{display:flex;gap:6px;flex-wrap:wrap}\n.sg-pills .tpill{white-space:normal;overflow:visible;direction:ltr;word-break:break-word}\n.sg-card{position:relative;min-height:118px;border-radius:var(--r);border:1px solid var(--line);padding:14px;display:flex;flex-direction:column;align-items:flex-start;gap:4px}\n.sg-bcard{background:transparent!important}\n.sg-mid{justify-content:center}\n.sg-icard{min-height:104px;align-items:center;justify-content:center;background:var(--paper)}\n/* Scrim: the card is the page surface, the dim layer carries the alpha over all of it, and a small\n   panel floats on top \u2014 the token doing its real job. Padding is zeroed because the dim layer runs to\n   the card's edge. */\n.sg-scrimcard{padding:0;overflow:hidden}\n.sg-scrimdim{width:100%;flex:1;display:flex;align-items:center;justify-content:center}\n.sg-scrimpanel{border-radius:var(--r-sm);padding:14px 20px;box-shadow:0 6px 18px rgba(0,0,0,.22)}\n.sg-ico svg{width:26px;height:26px;display:block}\n.sg-lab{font-weight:640;font-size:14px;line-height:1.2}\n.sg-sub{font-size:12px;opacity:.9}\n.sg-failmk{position:absolute;top:8px;right:8px;width:15px;height:15px;border-radius:50%;background:#d21b1b;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center}\n.sg-failpill{border-color:#e6a2a2!important;color:#b42318!important}\n.sg-fx{color:#d23;font-weight:800;margin-left:3px}\n/* Token column 244px, not 190px: the longest path here (color.text.warning-subtle) needs 211px plus the\n   cell's 30px of padding, and at 190 the -subtle and link rows wrapped to two lines while their\n   siblings did not \u2014 ragged row heights for no gain. The width comes off the two specimen columns,\n   which hold a single word each and have it to spare. */\n.sg-tcg{display:grid;grid-template-columns:1fr 1fr minmax(150px,244px);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;margin-top:2px}\n.sg-tc{padding:10px 15px;display:flex;align-items:center;min-height:44px}\n.sg-tc.sg-l{background:var(--lbg)}.sg-tc.sg-r{background:var(--dbg)}.sg-tc.sg-t{background:var(--panel);border-left:1px solid var(--line)}\n.sg-tchd{font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;min-height:0;padding-top:8px;padding-bottom:8px}\n.sg-samp{font-size:15px;font-weight:600}\n.sg-tcrow{box-shadow:inset 0 1px 0 rgba(128,128,128,.14)}\n.sg-pblock{margin-top:30px}.sg-pblock:first-of-type{margin-top:6px}\n.sg-phd{display:flex;align-items:center;gap:9px;margin-bottom:6px}\n.sg-rn{font-weight:660;font-size:14.5px}\n.sg-trow{display:grid;grid-template-columns:120px 1fr;gap:22px;align-items:start;padding:20px 0;border-top:1px solid var(--line)}\n.sg-tlab{font-size:12.5px;font-weight:640}\n.sg-tlfoot{margin-top:8px;display:flex;flex-direction:column;gap:5px;align-items:flex-start;font-size:10.5px;color:var(--muted)}\n.sg-foothint{display:inline-flex;align-items:center;gap:6px}\n.sg-btns{display:flex;gap:24px;flex-wrap:wrap}\n.sg-btns.sg-inv{background:var(--sg-invp);border-radius:9px;padding:16px 18px;margin:-9px 0}\n.sg-bcol{display:flex;flex-direction:column;gap:8px;align-items:flex-start}\n.sg-st{font-size:10.5px;color:var(--muted);text-transform:capitalize;font-weight:600}\n.sg-btns.sg-inv .sg-st{color:var(--sg-invp-ink)}\n.sg-btn{font:inherit;font-size:13px;font-weight:600;border-radius:8px;padding:8px 14px;border:1.5px solid transparent;min-width:96px;text-align:center;cursor:default;white-space:nowrap}\n.sg-callout{font-size:12.5px;color:var(--muted);background:var(--paper);border:1px solid var(--line);border-radius:var(--r-sm);padding:10px 13px;margin-top:16px;line-height:1.5}\n.tpill[data-sgtip]{position:relative}\n.tpill[data-sgtip]:hover::after{content:attr(data-sgtip);position:absolute;z-index:40;left:50%;bottom:calc(100% + 8px);transform:translateX(-50%);background:#111417;color:#f2f4f5;font-family:var(--mono);font-size:11px;font-weight:500;white-space:nowrap;padding:6px 9px;border-radius:7px;box-shadow:0 6px 20px rgba(0,0,0,.28);pointer-events:none}\n.tpill[data-sgtip]:hover::before{content:\"\";position:absolute;z-index:40;left:50%;bottom:calc(100% + 3px);transform:translateX(-50%);border:5px solid transparent;border-top-color:#111417;pointer-events:none}\n@media(max-width:760px){.sg-g3,.sg-g5{grid-template-columns:repeat(2,1fr)}}\n/* Heading sizes \u2014 shape cards, range, and the per-size table (#328 follow-through) */\n/* Label + description, then controls. The gap under the description is what was missing: the cards\n   sat hard against the heading with the explanation stranded below them. */\n.tsz-field{margin-top:22px}\n.tsz-field:first-of-type{margin-top:6px}\n.tsz-flabel{display:block;font-weight:600;font-size:13.5px;color:var(--ink)}\n.tsz-fdesc{margin:3px 0 12px;font-size:12.5px;color:var(--muted);line-height:1.5;max-width:72ch}\n\n/* Option cards: a select cannot carry a sentence per option, and the shape is a foundational choice\n   made once. Deviation from doc 26 (3+ options \u2192 select) \u2014 the rule that earns it is in doc 24. */\n.shape-cards{display:grid;gap:9px;grid-template-columns:repeat(auto-fit,minmax(184px,1fr));width:100%}\n.shape-card{text-align:left;font:inherit;cursor:pointer;background:var(--paper);border:1px solid var(--line2);border-radius:var(--r-sm);padding:12px 13px 13px;display:flex;flex-direction:column;gap:3px}\n.shape-card:hover:not(:disabled){border-color:var(--muted)}\n.shape-card:focus-visible{outline:2px solid var(--ink2);outline-offset:1px}\n.shape-card.on{border-color:var(--ink);background:var(--panel);box-shadow:0 0 0 1px var(--ink)}\n.shape-card:disabled{opacity:.5;cursor:not-allowed}\n.shape-card b{font-size:13px;color:var(--ink)}\n.shape-card.on b::after{content:' \u2713';font-size:11px}\n.shape-blurb{font-size:11.5px;color:var(--muted);line-height:1.4}\n.shape-nums{font-size:10.5px;color:var(--faint);margin-top:2px}\n.shape-blocked{grid-column:1/-1;display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12px;color:var(--ink2);background:var(--paper);border:1px solid var(--line2);border-radius:var(--r-sm);padding:9px 11px}\n.shape-release{font:inherit;font-size:12px;padding:4px 10px;border:1px solid var(--line2);border-radius:var(--r-xs);background:var(--panel);color:var(--ink);cursor:pointer}\n.shape-release:hover{border-color:var(--muted)}\n.shape-release:focus-visible{outline:2px solid var(--ink2);outline-offset:1px}\n\n/* Range \u2014 the two fields align on their CONTROLS, not their labels, so the select and the toggle\n   sit on one line however tall the labels wrap. */\n.range-row{display:flex;gap:28px;flex-wrap:wrap;align-items:flex-start;width:100%}\n.range-f{display:flex;flex-direction:column;gap:6px}\n.range-f > .pfk{line-height:1.2}\n.range-f .select{min-width:158px}\n.range-tg{display:flex;align-items:center;min-height:31px}\n.range-tglab{font-size:12.5px;color:var(--ink);white-space:nowrap}\n\n.szt-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}\n.szt-headlab{font-size:13px;font-weight:620;color:var(--ink)}\n.szt-badge{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 8px;border-radius:100px;background:var(--paper);border:1px solid var(--line2);color:var(--ink2)}\n.mtbl{margin-top:18px}\n.mtbl-cap{margin:0 0 7px;font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}\n/* Wide tables scroll in their own container so the page body never does (doc 26). The size column is\n   pinned so the names survive that scroll. A trailing FILLER column absorbs any slack, which is what\n   keeps the size column and every mode column at a fixed width whether the brand has one mode or six\n   \u2014 without it width:100% hands all the spare width to the single-mode case. */\n.mtbl-scroll{overflow-x:auto;border:1px solid var(--line);border-radius:var(--r-sm)}\n.mtbl-tbl{border-collapse:separate;border-spacing:0;width:100%;font-size:12.5px}\n.mtbl-tbl th,.mtbl-tbl td{padding:6px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle}\n.mtbl-tbl thead th{font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);background:var(--paper)}\n.mtbl-tbl tbody tr:last-child td{border-bottom:0}\n.mtbl-stick{position:sticky;left:0;background:var(--panel);z-index:2;border-right:1px solid var(--line);width:var(--tbl-col-name);min-width:var(--tbl-col-name)}\n.mtbl-tbl thead .mtbl-stick{z-index:3;background:var(--paper)}\n/* Mode columns are equal and fixed: past roughly five modes the total exceeds the pane and the\n   container scrolls, rather than the columns compressing until the steppers stop fitting. */\n.mtbl-mode{width:var(--tbl-col-mode);min-width:var(--tbl-col-mode)}\n.mtbl-fill{width:auto;padding:0 !important;border-bottom-color:var(--line)}\n.mtbl-fill.mtbl-spec{padding:6px 12px !important;min-width:150px}\n.mtbl-spec-t{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink2);font-size:14px}\n.mtbl-name{font-size:12.5px;font-weight:600;color:var(--ink)}\n/* Out-of-range rows stay VISIBLE rather than disappearing \u2014 a size the ramp could have is a fact\n   worth showing, and its absence from the table was reading as \"this brand has no lg display\". */\n.mtbl-off td{background:repeating-linear-gradient(135deg,transparent,transparent 5px,rgba(24,24,27,.028) 5px,rgba(24,24,27,.028) 10px)}\n.mtbl-off .mtbl-stick{background:var(--panel)}\n.mtbl-off .mtbl-name{color:var(--faint);text-decoration:line-through;text-decoration-thickness:1px}\n.mtbl-offval{font-size:12.5px;color:var(--faint)}\n/* Light's cell in a re-point table: it can only name itself, so it is text rather than a select. */\n.mtbl-selfval{font-size:12.5px;color:var(--muted);white-space:nowrap}\n/* What a rung is WORTH in this mode (#388) \u2014 a second line under the per-mode select, not option text.\n   display:block is what keeps it off the select's line, so the column width is untouched; the .set tier\n   matches the select's own set-state so a scan down a column finds the overrides in one pass.\n   (No backticks in this stylesheet \u2014 it is a template literal; see #366.) */\n.mtbl-worth{display:block;margin-top:3px;font-size:11px;color:var(--faint);white-space:nowrap}\n.mtbl-worth.set{color:var(--ink2);font-weight:600}\n/* A select's intrinsic min-width is its WIDEST OPTION, and the table is auto-layout, so a long rung\n   label silently pushed the mode column past the shared token (166px against the stepper tables'\n   148px) and broke the down-page column parity these tables exist to hold. Clamp the control to the\n   column and let the closed select ellipsis instead. 24px is the cell's horizontal padding. */\n.mtbl-mode .select{width:calc(var(--tbl-col-mode) - 24px);min-width:0;text-overflow:ellipsis}\n.mtbl-mode .select.set{font-weight:650;border-color:var(--ink2)}\n.mtbl-ro{font-size:10px;color:var(--faint);font-weight:400;text-transform:none;letter-spacing:0}\n/* #1587 \u2014 the two viewport endpoints stacked in the base column: a Desktop stepper over a Mobile\n   stepper, each under a small caption. Captions sit ABOVE their stepper (display:block) so the fixed\n   mode-column width is untouched \u2014 the same width discipline .mtbl-mode .select documents above.\n   (No backticks in this stylesheet \u2014 it is a template literal; see #366.) */\n.mtbl-vpstack{display:flex;flex-direction:column;gap:2px}\n.mtbl-vplab{display:block;font-size:10px;color:var(--faint);font-weight:400;line-height:1.3}\n/* The stepper states the constraint: a disabled \u2212/+ means this size has no room that way, where a\n   filtered dropdown just omitted the option and never said why. */\n.mcell{display:inline-flex;align-items:center;gap:4px}\n.mstep{font:inherit;font-size:13px;line-height:1;width:22px;height:24px;border:1px solid var(--line2);border-radius:var(--r-xs);background:var(--paper);color:var(--ink);cursor:pointer;flex:none}\n.mstep:hover:not(:disabled){border-color:var(--muted)}\n.mstep:disabled{opacity:.32;cursor:not-allowed}\n.mstep:focus-visible{outline:2px solid var(--ink2);outline-offset:1px}\n.mval{font-size:12.5px;min-width:32px;text-align:center;color:var(--muted)}\n.mval.pin{color:var(--ink);font-weight:650}\n.mreset{font:inherit;font-size:12px;line-height:1;width:20px;height:24px;border:1px solid transparent;border-radius:var(--r-xs);background:none;color:var(--faint);cursor:pointer;flex:none}\n.mreset:hover{color:var(--ink2)}\n.mreset:focus-visible{outline:2px solid var(--ink2);outline-offset:1px}\n.mreset-sp{display:inline-block;width:20px;flex:none}\n\n/* Typography Preview tab \u2014 read-only specimens at size, in every mode. */\n.tp-fam{font-size:12.5px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}\n/* Same 112px / 148px as the tables, from the shared tokens, so the page reads on one grid even\n   where the content is a specimen rather than a control. */\n\n/* Typography \u2014 the four tier tabs (#272, resplit in #388 part B) */\n.tabnote{font-size:12.5px;color:var(--faint);margin:10px 0 0}\n/* #415 \u2014 the three-card binding grid (.tf-grid/.tf-card/.tf-role/.tf-desc) is gone with the three\n   family roles it was sized for; seven categories read as a table on the tab's shared grid. Deleted\n   rather than left inert, which is the .errbar-global lesson from #388. */\n/* The bulk-set: one action for the single-face brand, which the collapse would otherwise make a\n   seven-field chore. flex:none on the button keeps its intrinsic width out of the row's sizing \u2014\n   the trap #369/#388 kept hitting. */\n.tf-bulk{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin:2px 0 0}\n.tf-bulklab{font-size:12.5px;color:var(--ink2);font-weight:560}\n/* #558 \u2014 .tf-addbtn's base padding/font-size (7px 16px / 13px) is tuned to match .tf-in (36.1px),\n   its OTHER pairing below in \"Add face\". Here it instead sits beside .select.sm (33.4px, the compact\n   variant \u2014 correct and unchanged everywhere else it's used standalone). Scoped so only this row's\n   button drops to .select.sm's own padding-block (6px) and font-size (12.5px), landing both controls\n   at the same 33.4px rather than inventing a third height for the row. */\n.tf-bulk .tf-addbtn{padding:6px 16px;font-size:12.5px}\n.tf-in{width:100%;padding:7px 9px;border:1px solid var(--line2);border-radius:var(--r-xs);font:inherit;font-size:13px;background:var(--paper);color:var(--ink);min-width:0}\n.tf-stat{font-size:11px;font-weight:600}\n/* A token pill is white-space:nowrap, so its full single-line width is its MIN-CONTENT contribution\n   and the 148px column width property is only a hint it happily blows past \u2014 the intrinsic-width trap\n   #360/#369/#388, measured again here at 829px vs the shared 798px grid. An explicit px cap clamps\n   the intrinsic contribution; the pill already ellipsizes and carries the full path in its title attribute. */\n.mtbl-mode .tpill{max-width:124px}\n/* NOT a contrast verdict, despite the ok/no class names \u2014 this renders the font-status column\n   (\"\u2713 36 styles\" / \"\u26A0 Figma lacks it\" in the plugin, \"\u2713 Installed\" / \"\u26A0 Not installed\" on web).\n   An unloadable face is a WARNING, not a failure, so --warn is deliberate. Do not fold it into\n   the verdict palette. */\n.tf-stat.ok{color:var(--ok)}.tf-stat.no{color:var(--warn)}\n/* The specimen's own caveat, shown only when Figma can load a face this device cannot render \u2014 so\n   \"Ag 123\" is the fallback while the status column truthfully reads \u2713. Faint and inline beside the\n   specimen because it qualifies THAT cell; promoting it would read as an error, which it is not. */\n.tf-fbnote{margin-left:8px;font-size:11px;color:var(--faint);white-space:nowrap;vertical-align:2px}\n/* The specimen is display:block in this table, which would push the note onto its own line. Only\n   inside .mtbl-spec, and only so the note can sit BESIDE \"Ag 123\" as approved \u2014 measured at 560px\n   (a narrow plugin panel) with no cell overflow and no horizontal scroll beyond the pre-existing 146px. */\n.mtbl-spec .tf-prev{display:inline-block;vertical-align:baseline}\n/* line-height must exceed the font's em box (~1.2) or descenders clip */\n.tf-prev{border-top:1px solid var(--line);padding-top:10px;font-size:26px;line-height:1.4;overflow:hidden;white-space:nowrap}\n/* #415 \u2014 the resolved face per category on Text styles: a READING, not a control. Same type\n   treatment as .cs-name so the row's two identity cells sit on one baseline. */\n.cs-face{font-size:12.5px;font-weight:600;color:var(--ink);line-height:1.3;overflow-wrap:anywhere}\n.tf-note{font-size:12.5px;color:var(--muted);background:var(--paper);border:1px solid var(--line);border-radius:var(--r-sm);padding:11px 13px;line-height:1.55;margin:14px 0 0}\n.tf-note b{color:var(--ink2)}\n.tf-note.warn{background:#fff8ed;border-color:#f0d9b5;color:#7a5320}\n.tf-note.warn b{color:#5c3d16}\n/* Typeface library (#269) \u2014 the primitive tier as full-width rows: identity left, the\n   derived facts in the middle, specimen right. Full-width rather than cards because the\n   list grows with the brand and the fallback stack needs the horizontal room. */\n/* The typeface library as a table (#363), on the same column grid as the rung tables above. */\n/* The ONE table on this tab whose Face column is not the shared 112px: the token path now reads as a\n   subtitle under the face name, and font.typeface.jetbrains-mono is 190px on one line. Scoped by class\n   rather than by moving --tbl-col-name, because that token holds this tab's four tables on one column\n   grid (#363/#404) and three of them are read-only ladders with nothing to widen FOR. Two measured\n   costs, both accepted: this table's mode columns now start at 552 where the ladders' start at 448, so\n   the Face column is the only one that no longer lines up down the page; and in a 560px plugin panel\n   the container's existing horizontal overflow goes 146px \u2192 186px, +40. The pinned column is what makes\n   the second one tolerable \u2014 scrolled fully right, the face name and its path are still both visible.\n   The alternative was a four-line path pill in a 112px cell (tried; less readable than an elided one). */\n.tf-libtbl .mtbl-stick{width:216px;min-width:216px}\n/* Both were capped at 88px for the 112px column; at 216 they can use it. Still capped rather than\n   free: the cell is auto-layout, so an uncapped nowrap pill would push the column past 216 on a long\n   slug \u2014 the intrinsic-width trap .mtbl-mode .tpill documents. 192 = 216 \u2212 24 of cell padding, which\n   fits every realistic path on one line (jetbrains-mono 190); a longer one elides from the FRONT,\n   keeping the slug that identifies it, and carries the full path in its title. */\n.tf-libname{display:block;font-size:12.5px;font-weight:650;color:var(--ink);max-width:192px;line-height:1.3;overflow-wrap:anywhere}\n.tf-vf{display:block;margin-top:3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}\n.tf-libpath{display:block;margin-top:5px}\n.tf-libpath .tpill{max-width:192px}\n.tf-usedby{font-size:11.5px;color:var(--ink2);display:block;max-width:124px;line-height:1.35;overflow-wrap:anywhere}\n/* An unbound face is a real state since #287, not an error \u2014 muted, never warning-colored. */\n.tf-usedby.unbound{color:var(--faint);font-style:italic}\n.tf-fall{display:block;margin-top:4px;font-size:11px;color:var(--faint);line-height:1.5;overflow-wrap:anywhere}\n.mtbl-spec .tf-prev{border-top:0;padding-top:0;font-size:22px;line-height:1.25}\n.tf-derivenote{font-size:12px;color:var(--faint);line-height:1.55;margin:11px 0 0}\n/* Staging a face (#287 follow-up). The remove control sits in the FILL column so no fixed-width cell\n   grows past its token \u2014 that is what keeps the tier tables on one 112/148/148 grid. */\n.tf-rm{float:right;border:none;background:none;color:var(--faint);cursor:pointer;font-size:16px;line-height:1;padding:0 2px;margin-left:8px}\n.tf-rm:hover{color:var(--ink)}\n.tf-add{display:flex;align-items:center;gap:8px;margin-top:12px}\n.tf-addin{flex:0 1 260px;width:auto;min-width:0}\n/* #113 follow-up \u2014 the font combobox. The datalist this replaces was browser CHROME: dark in\n   Figma's iframe, flipped UP over the field, and unscrollable at 2,334 options. Page DOM instead, on\n   the .brandmenu popover model (max-height + overflow-y:auto), which is what makes it themeable,\n   positionable and scrollable at all. The wrapper carries .tf-addin's flex basis because the INPUT is\n   now nested inside it \u2014 leaving it on the input alone would collapse the field to content width. */\n.tf-combo{position:relative;flex:0 1 260px;min-width:0}\n.tf-combo .tf-addin{flex:none;width:100%}\n.tf-cbolist{position:absolute;top:calc(100% + 4px);left:0;right:0;max-height:264px;overflow-y:auto;background:var(--panel);border:1px solid var(--line2);border-radius:var(--r-sm);padding:4px;z-index:20;box-shadow:0 12px 32px -8px rgba(24,24,27,.20),0 4px 12px -4px rgba(24,24,27,.12);overscroll-behavior:contain}\n/* Names render in the UI face by design (owner call): the host list mixes locally-installed families\n   with Figma CLOUD fonts, and networkAccess:none means a cloud face would fall back and read as\n   broken. One face is honest; a half-working specimen is not. */\n.tf-cbo{padding:6px 9px;border-radius:var(--r-xs);font-size:13px;color:var(--ink);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.tf-cbo:hover,.tf-cbo.on{background:var(--paper)}\n.tf-cbo.on{box-shadow:inset 0 0 0 1px var(--line2)}\n.tf-adderr{font-size:12px;color:var(--danger);margin:8px 0 0}\n/* #405 \u2014 the add-face SUBMIT CTA, modeled on .bm-load (the app's existing inline solid button) so it\n   reads as \"commit this\" rather than borrowing .adv-add's dashed reveal look. flex:none keeps its\n   intrinsic width out of the row's sizing, the trap #369/#388 kept hitting. White on --ink is\n   17.72:1. */\n.tf-addbtn{flex:none;border:1px solid var(--ink);background:var(--ink);color:#fff;border-radius:var(--r-xs);padding:7px 16px;font:inherit;font-size:13px;font-weight:560;cursor:pointer}\n.tf-addbtn:hover{background:#000;border-color:#000}\n.tf-unbound{font-size:11.5px;color:var(--muted);border-top:1px solid var(--line);padding-top:10px;line-height:1.45}\n.sl-note{font-size:12.5px;color:var(--muted);background:var(--paper);border:1px solid var(--line);border-radius:var(--r-sm);padding:10px 13px;line-height:1.5;margin:12px 0 0}\n/* position:relative makes the ladder the offsetParent, so a row's offsetTop is relative to\n   it \u2014 without it the open-on-first-in-use-rung scroll overshoots to the bottom. */\n/* #404 \u2014 the size ladder moved onto the shared table, so the bespoke row grid, the dimming, the\n   levered-rung dot and the three-key legend are all gone. Everything they styled went with them\n   rather than being left as dead rules (the .errbar-global lesson from #388). Two survive:\n   .sl-samp is the big Ag specimen, and .sl-tall keeps the 460px scroll box the 22 full-size rows\n   still need \u2014 .mtbl-scroll only handles the horizontal axis. */\n.sl-samp{line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.sl-tall{max-height:460px;overflow-y:auto}\n/* The header has to STICK here and nowhere else: this is the only tier table that scrolls\n   vertically, and 22 rows of full-size specimens scroll the column labels away within one row.\n   The corner cell outranks the rest because .mtbl-stick is already sticky on the left axis \u2014\n   without the bump it slides under its own row headers at the intersection. */\n.sl-tall thead th{position:sticky;top:0;z-index:2}\n.sl-tall thead .mtbl-stick{z-index:4}\n/* The availability marks, carried over from the deleted primitive weight scale (#362) \u2014 the mark\n   vocabulary is unchanged, only its home. tpw-samp overrides the shared specimen size down, since\n   this cell holds a mark beside it in a face column rather than owning a full-width row.\n   (No backticks in here \u2014 this whole block is a template literal.) */\n.tpw-mark{font-size:12px;margin-right:7px}\n.tpw-mark.yes{color:var(--ink)}/* Also not a verdict: \u25CF / \u25CB / ? for whether a typeface SHIPS a weight. \"no\" is absence, not\n   failure, so --faint is right \u2014 coloring it --danger would read as an error the user caused. */\n.tpw-mark.no{color:var(--faint)}\n/* #555 \u2014 was var(--line2), a border-hairline color (~1.36:1 on white), reused here as text. The \"?\"\n   needs its own text-legible tier distinct from \"no\"'s --faint; --muted is the next tier up. */\n.tpw-mark.unknown{color:var(--muted)}\n.tpw-samp{display:inline;font-size:15px}\n/* #422 \u2014 the weight-roles-per-mode specimen. Same \"Ag 123\" sample as the by-face table's .tpw-samp,\n   but a second LINE under the stepper/reading rather than inline beside it \u2014 matching .mtbl-worth's\n   \"second line under the per-mode control\" pattern, since the stepper's four glyphs already fill most\n   of the 148px column and an inline specimen would wrap mid-cell instead of stacking cleanly. */\n.wt-spec{display:block;margin-top:4px}\n/* Leading & tracking rungs in the shared table format (#363). The value control is width-BOUNDED, not\n   auto: a control that sizes to its content is what breaks column parity in an auto-layout table.\n   #388 swapped the number input for a ladder select and the bound has to come with it \u2014 a closed\n   select's intrinsic width is its WIDEST OPTION (#360's trap), so left auto it would be sized by\n   whichever label happens to be longest today (-0.015em) and would silently re-size the column the\n   day a ladder label grows. 124px is measured against that widest label, not picked. */\n.ltbl-sel{width:124px;max-width:100%}\n.ltbl-who{font-size:11px;color:var(--ink2);display:block;max-width:124px;line-height:1.35}\n.ltbl-who.none{color:var(--faint);font-style:italic}\n/* The one specimen on the page that must WRAP \u2014 leading is invisible on a single line, so this\n   deliberately does not inherit .mtbl-spec-t's nowrap+ellipsis. */\n.ltbl-samp{font-size:13px;color:var(--ink2);line-height:inherit;max-width:52ch}\n.wr-row{display:grid;grid-template-columns:96px 168px 1fr auto;gap:14px;align-items:center;padding:11px 0;border-top:1px solid var(--line)}\n.wr-row:first-of-type{border-top:0}\n.wr-name{font-size:13px;font-weight:640}\n.wr-samp{font-size:20px;line-height:1.4;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}\n.cs-wrap{overflow-x:auto}\n.cs-table{border-collapse:separate;border-spacing:0;width:100%;font-size:12.5px}\n.cs-table th{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);text-align:left;padding:0 9px 10px;white-space:nowrap}\n.cs-table th.cs-c,.cs-table td.cs-c{text-align:center}\n.cs-table td{padding:9px;border-top:1px solid var(--line);vertical-align:middle}\n.cs-name{font-size:12px;font-weight:640}\n.cs-count{font-size:10.5px;color:var(--faint)}\n.cs-table input[type=checkbox]{width:15px;height:15px;accent-color:var(--ink);cursor:pointer;margin:0}\n/* 11 columns in an 850px content column \u2014 keep the selects tight so the table fits without\n   relying on the horizontal scroll, which hides the italic/link toggles at the right edge. */\n.cs-table td{padding:9px 6px}\n.cs-table th{padding:0 6px 10px}\n.cs-table .select{max-width:100px}\n/* 92px was measured against the old word-form labels (\"2 tighter\", \"much tighter\") before #411\n   replaced them with signed deltas. The widest label today is \"default\" (the zero case; every other\n   value is a short +N/-N), well inside this box, so there is slack rather than a tight fit \u2014 this\n   table still has only ~8px of slack per nudge column before it exceeds the 800px pane and .cs-wrap\n   starts scrolling the LINK column out of sight, but the value control itself is no longer the\n   constraint that set 92px. Left wide rather than re-measured down: shrinking it is a real change,\n   not a comment fix. */\n.cs-table .select.cs-nudge{max-width:92px}\n/* #1467 \u2014 the facePin (Pin a cut) section. The style input reuses .tf-in's field treatment; capped so\n   it reads as one control in the Style-pin column rather than stretching the full table width. The\n   stale-pin note reuses .tf-adderr (danger ink) but sits under the field it qualifies. */\n.pincut .pincut-in{max-width:240px}\n.pincut .pincut-stale{max-width:280px;line-height:1.45;white-space:normal}\n.fz-list{border:1px solid var(--line);border-radius:var(--r);overflow:hidden;margin-top:4px}\n.fz-row{display:grid;grid-template-columns:150px 96px 1fr;gap:12px;padding:9px 13px;border-top:1px solid var(--line);align-items:center;font-size:12px}\n.fz-row:first-child{border-top:0}\n.fz-name{font-size:11px}\n.fz-pair{font-size:11px;color:var(--muted)}\n.fz-bar{position:relative;height:7px;background:var(--paper);border-radius:4px;border:1px solid var(--line)}\n.fz-fill{position:absolute;top:0;bottom:0;background:var(--ink2);border-radius:4px;opacity:.75}\n.fz-clamp{font-size:10px;color:var(--faint);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.fz-warn{font-size:12.5px;background:#fff8ed;border:1px solid #f0d9b5;color:#7a5320;border-radius:var(--r-sm);padding:10px 13px;line-height:1.5;margin:10px 0 0}\n.tr-block{margin-top:34px}.tr-block:first-of-type{margin-top:4px}\n.tr-band{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;background:var(--paper);border:1px solid var(--line);border-radius:var(--r-sm);padding:9px 13px;margin-bottom:6px}\n.tr-band-n{font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--ink2)}\n.tr-band-c{font-size:10.5px;color:var(--muted)}\n.tr-band-d{font-size:11.5px;color:var(--faint)}\n.tr-row{display:grid;gap:6px;padding:14px 0;border-top:1px solid var(--line)}\n.tr-row:first-of-type{border-top:0}\n.tr-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap}\n.tr-attr{font-size:10.5px;color:var(--faint)}\n/* true size; padding keeps descenders inside the clip box even at tight leading */\n.tr-samp{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-bottom:.24em;margin-top:2px}\n/* Per-mode ramp columns \u2014 one per mode, side by side. Scrolls horizontally rather than wrapping: a\n   wrapped column reads as a new row, which is the confusion the side-by-side table exists to remove.\n   min-width:0 on the column is what actually lets the sample's ellipsis work inside a grid track. */\n.tr-modes{display:grid;gap:14px;overflow-x:auto;padding-bottom:2px}\n.tr-mode{min-width:0;border-left:1px solid var(--line);padding-left:11px}\n.tr-mode:first-child{border-left:0;padding-left:0}\n.tr-mode-n{display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--ink2);margin-bottom:2px}\n@media(max-width:760px){.tf-bulk{align-items:stretch;flex-direction:column}}\n/* minmax(0,1fr), not a bare 1fr \u2014 a grid item's automatic minimum is min-content, so a bare\n   1fr track never clamps and the widest child drags the whole column past the viewport.\n   The desktop rule above already uses the idiom; the collapse override had lost it (#144). */\n/* Below 900 the rail is not a sidebar. It used to become a static stack, which measured ~690px tall\n   and pushed every page's content below the fold; it is now hidden and its destinations move into\n   the Pages menu in the bar, which costs 0px of vertical space. The two must switch together \u2014\n   whichever way this breakpoint moves, exactly one of rail/navbtn is visible at any width. */\n@media(max-width:900px){.shell{grid-template-columns:minmax(0,1fr);gap:40px}.rail{display:none}.navbtn{display:flex}.phead{gap:16px}.pfield.r{margin-left:0}}\n/* Narrow viewports (#144). The plugin iframe runs this same UI, so its window lands here:\n   gutters, hero and chrome all shrink, and nothing is allowed to overflow horizontally. */\n/* The bar's dropdowns are anchored right:0 to their wrapper, which is only safe while the wrapper\n   sits at the viewport's right edge. When the bar wraps, the actions land at the LEFT and a 288px\n   panel hangs ~152px off-screen \u2014 invisible to an overflow sweep, because a closed menu isn't in\n   the DOM at all. margin-left:auto keeps the actions right-aligned on their own wrapped row, which\n   fixes the cause; the max-width is the belt-and-braces cap for viewports under ~312px. */\n/* Right-aligning the row is necessary but not sufficient: each menu anchors to its OWN wrapper,\n   and the brand button is not the rightmost item, so its panel still started ~122px short of the\n   edge and hung 9px off at 360px. Dropping the wrappers to static makes the actions row itself the\n   containing block, so both panels align to the row's right edge \u2014 the one edge that is always\n   flush with the viewport gutter, whatever the buttons ahead of them are doing. */\n@media(max-width:640px){#app{padding:0 16px 72px}.bar{flex-wrap:wrap;gap:10px;padding:16px 2px 10px}.bar-actions{flex-wrap:wrap;margin-left:auto;position:relative}.barmenu-wrap{position:static}.brandmenu{max-width:calc(100vw - 24px)}.hero h1{font-size:28px;letter-spacing:-0.02em}.lede{font-size:15px;margin-top:14px}.shell{gap:28px}.lab{padding:0 3px}}\n/* Compact bar. Full labels need ~455px and the row has 456 at 480px \u2014 i.e. it only \"fits\" by a\n   pixel, so the treatment starts before the numbers get tight. Dropping the \"Theme studio\"\n   descriptor and the Export word (the \u2193 and caret stay, and aria-label keeps the accessible name)\n   takes the row to ~278px, which is a single line down to ~312px of viewport. */\n@media(max-width:560px){.studio{display:none}.barbtn-lab{display:none}}\n/* The Pages control. Hidden by default \u2014 the 900 rule above turns it on exactly where the rail\n   turns off. It keeps the current page name while there is room for it (159\u2013173px of bar slack at\n   480\u2013900), which is the orientation a bare glyph cannot give; below 480 it degrades to the glyph.\n   Below 380 the wordmark goes too: a third control needs ~54px and the bar has only 53px of slack\n   at 360 and 13px at 320, so without this the row wraps back to two lines on small phones. */\n@media(max-width:480px){.navbtn-lab{display:none}}\n@media(max-width:380px){.wordmark{display:none}}\n.navmenu{width:300px;max-height:calc(100vh - 130px);overflow-y:auto}\n.nav-item{display:flex;width:100%;text-align:left;border:0;background:none;font:inherit;padding:9px 8px;border-radius:var(--r-xs);cursor:pointer;color:var(--ink2)}\n.nav-item:hover{background:var(--paper)}\n.nav-item.cur{background:var(--paper)}\n.nav-item.cur .stage-t b{color:var(--ink)}\n.navmenu .rail-note{margin:14px 8px 2px;padding-top:12px}\n/* Below ~480 the 10 hex read-outs under a ramp cannot fit (each needs ~45px, the row has ~406):\n   drop the hex and keep the step number, so labels stay 1:1 under their swatches. Wrapping or\n   scrolling the row would break that alignment, which is the whole point of a ramp. */\n/* The contrast + breakpoint tables have more columns than 456px can hold, and neither shrinks:\n   ly-table pushed the page 57px, ctable was silently clipped by an ancestor (worse \u2014 the cells\n   were unreadable rather than reachable). display:block turns each into its own scroll box, so\n   the table scrolls and the page does not. Applied only here; both fit unaided at 640+. */\n@media(max-width:480px){#app{padding:0 12px 64px}.hero h1{font-size:24px}.lab-hex{display:none}.ctable,.ly-table{display:block;overflow-x:auto}}\n/* Plugin resize grip (#144) \u2014 plugin-only; a Figma iframe has no window chrome of its own.\n   touch-action:none so the pointer capture owns the gesture instead of the page scrolling. */\n.resize-grip{position:fixed;right:0;bottom:0;width:16px;height:16px;z-index:60;cursor:nwse-resize;touch-action:none;color:var(--faint)}\n.resize-grip::after{content:\"\";position:absolute;right:3px;bottom:3px;width:9px;height:9px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;border-bottom-right-radius:2px;opacity:.45}\n.resize-grip:hover::after{opacity:.9}\n";

// src/entry.ts
var bootBrand = () => {
  if (true) {
    const restored = restoreInput(localStorage);
    if (restored) {
      try {
        brandTheme(restored);
        return { input: restored, origin: { kind: "file" } };
      } catch {
      }
    }
    return { input: structuredClone(BRANDS[BOOT_BRAND]), origin: { kind: "none" } };
  }
  return { input: structuredClone(BRANDS[BOOT_BRAND]), origin: { kind: "example", id: BOOT_BRAND } };
};
var boot = bootBrand();
initSession(boot.input, boot.origin);
if (true) setPersist((input) => persistInput(localStorage, input));
commit.onHostMessage(handleHostMessage);
mountApp(document.getElementById("app"));
if (typeof styles_default !== "string" || styles_default.length < 1e3) {
  throw new Error(
    'apps/studio: styles.css did not arrive as text. The esbuild entry that produced this bundle is missing `--loader:.css=text` (or `loader: { ".css": "text" }`), so the stylesheet is absent.'
  );
}
installStyles(styles_default);
if (false) mountResizeGrip();
build();
//# sourceMappingURL=main.js.map
