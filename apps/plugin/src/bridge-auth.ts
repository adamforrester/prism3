/**
 * THE DESKTOP BRIDGE'S PAIRING (#3204, the owner's Q3204.1 A) — the constants both ends share, and the plugin side's
 * HMAC-SHA-256.
 *
 * WHY PAIRING. The bridge (`tools/figma-bridge/server.ts`) refuses an upgrade whose `Origin` is not `null`, but `null` is
 * not Figma's alone: any web page can open a sandboxed iframe, whose origin is opaque too, and pose as the plugin. Nothing
 * in a browser's WebSocket upgrade tells the two apart, so the plugin proves a secret instead.
 *
 * THE FLOW.
 *   1. The server keeps a random secret in a user-only file (mode 0600) and prints a one-time pairing CODE when it starts:
 *      eight characters from `CODE_ALPHABET`, 30^8 ≈ 2^39, shown as `XXXX-XXXX`.
 *   2. Every connection opens with the server's `{ type: 'challenge', nonce }`. Until the plugin proves itself the
 *      connection is not "the plugin": it is sent no command and evicts no one.
 *   3. A plugin with no token asks the person for the code once per machine and answers
 *      `{ type: 'pair', proof: HMAC(code, PAIR_LABEL + nonce) }`. A right code gets `{ type: 'paired', token }`, and the
 *      code is spent. A wrong one closes the socket with `CLOSE.wrongCode`; after a few, the server retires the code and
 *      prints a new one.
 *   4. A plugin with a token answers `{ type: 'hello', …, proof: HMAC(token, HELLO_LABEL + nonce) }`. A right proof gets
 *      `{ type: 'welcome' }` and the connection becomes the plugin. A missing or wrong proof closes it with
 *      `CLOSE.notPaired`, before any command.
 * The token lives in `figma.clientStorage` (per person, per machine), never in the file or its plugin data.
 *
 * THE HASH IS WRITTEN HERE, not borrowed. The UI iframe's origin is opaque, and whether `crypto.subtle` is there depends on
 * the host treating that frame as a secure context; a dependency-free SHA-256 (FIPS 180-4) and HMAC (RFC 2104) needs no
 * such luck and runs the same in Node. The server uses `node:crypto` for its side, so the pairing test compares two
 * independent implementations (docs/34 shape 1).
 */

/** Unambiguous: digits 2–9 and the letters without I, L, O and U. 30 symbols. */
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
export const CODE_LENGTH = 8;
export const PAIR_LABEL = 'prism3-bridge-pair-v1:';
export const HELLO_LABEL = 'prism3-bridge-hello-v1:';
export const TOKEN_LABEL = 'prism3-bridge-token-v1';
/** WebSocket close codes in the private range (RFC 6455 §7.4.2). `held` (#3297): the connection proved its token, but
 *  another paired plugin instance holds the bridge — the server closed the older one for a newer connection, or refused a
 *  `yield` hello while one is attached. Not a pairing refusal: the token stands. */
export const CLOSE = { notPaired: 4401, wrongCode: 4403, timedOut: 4408, held: 4409 } as const;

/** What a person typed → the code's canonical form: upper case, separators and spaces dropped. */
export const normalizeCode = (s: string): string => s.toUpperCase().replace(/[^0-9A-Z]/g, '');
/** A canonical code shown in two groups of four. */
export const formatCode = (code: string): string => `${code.slice(0, 4)}-${code.slice(4)}`;
/** Whether a typed code could be one: the right length, every character from the alphabet. */
export const codeShaped = (s: string): boolean => {
  const c = normalizeCode(s);
  return c.length === CODE_LENGTH && [...c].every((ch) => CODE_ALPHABET.includes(ch));
};

/* ── SHA-256 and HMAC, dependency-free ─────────────────────────────────────────────────────────────── */

/** The round constants. `@__PURE__` lets a bundle that never hashes (the offline build) drop this module whole. */
const K = /* @__PURE__ */ new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** UTF-8 bytes of a string (no `TextEncoder` assumption). */
export const utf8 = (s: string): Uint8Array => {
  const out: number[] = [];
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return Uint8Array.from(out);
};

export const sha256 = (msg: Uint8Array): Uint8Array => {
  const bitLen = msg.length * 8;
  const padded = new Uint8Array(((msg.length + 9 + 63) >> 6) << 6);
  padded.set(msg);
  padded[msg.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000));
  view.setUint32(padded.length - 4, bitLen >>> 0);
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const W = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) W[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
  }
  const out = new Uint8Array(32);
  const ov = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) ov.setUint32(i * 4, H[i]);
  return out;
};

const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

/** HMAC-SHA-256 (RFC 2104) of a UTF-8 message under a UTF-8 key, as lower-case hex. */
export const hmacHex = (key: string, message: string): string => {
  let k = utf8(key);
  if (k.length > 64) k = sha256(k);
  const ipad = new Uint8Array(64), opad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) { ipad[i] = (k[i] ?? 0) ^ 0x36; opad[i] = (k[i] ?? 0) ^ 0x5c; }
  const m = utf8(message);
  const inner = new Uint8Array(64 + m.length); inner.set(ipad); inner.set(m, 64);
  const ih = sha256(inner);
  const outer = new Uint8Array(96); outer.set(opad); outer.set(ih, 64);
  return hex(sha256(outer));
};

/** The plugin's answers to a challenge. */
export const pairProof = (code: string, nonce: string): string => hmacHex(normalizeCode(code), PAIR_LABEL + nonce);
export const helloProof = (token: string, nonce: string): string => hmacHex(token, HELLO_LABEL + nonce);
