// news-image-20261119 — one image summing up Thursday 19 November 2026.
//
// The program draws a newspaper front page entirely from code: a masthead,
// a big date banner, and six story panels. Every story below was first
// reported, or happened, on 19 November 2026 (checked against BBC, Reuters,
// AP, The Hindu / IMD and the ICJ sitting list on the morning of the 19th):
//   1. The ICJ delivers its Rohingya genocide-case verdict in The Hague.
//   2. Grand Theft Auto VI unlocks at midnight local time around the world.
//   3. Anthropic starts trading on Nasdaq as ANT.
//   4. The Crimean Bridge is hit a third time this week; traffic halted.
//   5. A Van Gogh sells at auction for a record $190.4m.
//   6. Cyclone Akvan nears India's east coast; red alerts in force.
// The ICJ panel names the verdict, not its outcome: at build time the court
// had not yet read it out, so no outcome is claimed anywhere in the image.
//
// No network, no dependencies: Node 22 stdlib only. The output is fully
// deterministic — the same bytes on every run.

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------
const PAPER = [247, 243, 232];
const INK = [17, 17, 17];
const RED = [178, 34, 34];
const NAVY = [24, 48, 89];
const TEAL = [14, 110, 110];
const OCHRE = [176, 124, 22];
const PLUM = [110, 44, 92];
const SLATE = [70, 84, 96];
const WHITE = [255, 255, 255];
const PANEL = [255, 255, 255];
const RULE = [200, 192, 172];

// ---------------------------------------------------------------------------
// Canvas: a plain RGB buffer with rect / line / circle helpers.
// ---------------------------------------------------------------------------
const px = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  px[i * 3] = PAPER[0];
  px[i * 3 + 1] = PAPER[1];
  px[i * 3 + 2] = PAPER[2];
}

function setPixel(x: number, y: number, c: number[]): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 3;
  px[o] = c[0];
  px[o + 1] = c[1];
  px[o + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: number[]): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPixel(xx, yy, c);
  }
}

function frameRect(x: number, y: number, w: number, h: number, c: number[], t: number): void {
  fillRect(x, y, w, t, c);
  fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c);
  fillRect(x + w - t, y, t, h, c);
}

function drawLine(x0: number, y0: number, x1: number, y1: number, c: number[]): void {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  for (;;) {
    setPixel(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

function drawCircle(cx: number, cy: number, r: number, c: number[]): void {
  for (let a = 0; a < 360; a += 2) {
    const rad = (a * Math.PI) / 180;
    setPixel(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), c);
  }
}

// ---------------------------------------------------------------------------
// A small 5x7 bitmap font, drawn from rows I wrote by hand. Uppercase only;
// the whole page is set in capitals, as a newspaper front page would be.
// ---------------------------------------------------------------------------
const GLYPHS: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "00000", "01100"],
  ",": ["00000", "00000", "00000", "00000", "00100", "00100", "01000"],
  "'": ["00100", "00100", "00000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  ":": ["00000", "00100", "00000", "00000", "00000", "00100", "00000"],
  ";": ["00000", "00100", "00000", "00000", "00100", "00100", "01000"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
};

const CHAR_W = 5;
const CHAR_H = 7;

function textWidth(text: string, scale: number): number {
  return text.length * (CHAR_W + 1) * scale - scale;
}

function drawText(x: number, y: number, text: string, scale: number, c: number[]): void {
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const g = GLYPHS[ch] ?? GLYPHS["?"];
    for (let r = 0; r < CHAR_H; r++) {
      for (let col = 0; col < CHAR_W; col++) {
        if (g[r][col] === "1") {
          fillRect(cx + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    cx += (CHAR_W + 1) * scale;
  }
}

function drawCentred(y: number, text: string, scale: number, c: number[]): void {
  drawText(Math.round((W - textWidth(text, scale)) / 2), y, text, scale, c);
}

// Greedy word wrap: returns lines that fit maxWidth at the given scale.
function wrap(text: string, scale: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur === "" ? w : cur + " " + w;
    if (textWidth(test, scale) <= maxWidth) {
      cur = test;
    } else {
      if (cur !== "") lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------------------
// The six stories of 19 November 2026.
// ---------------------------------------------------------------------------
interface Story {
  num: string;
  tag: string;
  colour: number[];
  headline: string;
  body: string;
}

const STORIES: Story[] = [
  {
    num: "1",
    tag: "JUSTICE - THE HAGUE",
    colour: NAVY,
    headline: "WORLD COURT RULES ON ROHINGYA CASE",
    body: "The Hague delivers its verdict today in The Gambia's genocide case against Myanmar over the 2017 crackdown.",
  },
  {
    num: "2",
    tag: "GAMES - WORLDWIDE",
    colour: PLUM,
    headline: "GTA VI ARRIVES AFTER 13 YEARS",
    body: "Rockstar's blockbuster unlocks at midnight local time, rolling around the world from New Zealand.",
  },
  {
    num: "3",
    tag: "MARKETS - NEW YORK",
    colour: TEAL,
    headline: "ANTHROPIC DEBUTS ON NASDAQ",
    body: "The Claude maker's shares start trading as ANT, valued near $1.4 trillion fully diluted.",
  },
  {
    num: "4",
    tag: "WAR - UKRAINE",
    colour: RED,
    headline: "CRIMEA BRIDGE HIT A THIRD TIME",
    body: "Traffic halted again after an overnight strike on the Kerch crossing, Russian officials say.",
  },
  {
    num: "5",
    tag: "ARTS - AUCTION",
    colour: OCHRE,
    headline: "VAN GOGH SELLS FOR $190.4M",
    body: "A record price at auction after a dispute over the painting's Nazi-era history.",
  },
  {
    num: "6",
    tag: "WEATHER - INDIA",
    colour: SLATE,
    headline: "CYCLONE AKVAN NEARS INDIA",
    body: "Red alerts on the east coast as the severe storm closes in. Schools shut; landfall due Friday.",
  },
];

// ---------------------------------------------------------------------------
// Layout: masthead, date banner, six panels, footer.
// ---------------------------------------------------------------------------
function drawPage(): void {
  // Thin double rule under the top edge, like a newspaper.
  fillRect(0, 0, W, 6, INK);
  fillRect(0, 10, W, 2, INK);

  // Masthead.
  drawCentred(26, "THE WORLD IN ONE DAY", 4, INK);
  drawCentred(66, "SIX STORIES THAT DEFINED THE DAY", 2, SLATE);

  // Date banner: the day itself, as large as the page allows.
  fillRect(28, 104, W - 56, 96, RED);
  drawCentred(112, "THURSDAY", 2, WHITE);
  drawCentred(140, "19 NOVEMBER 2026", 7, WHITE);

  // Standfirst.
  drawCentred(216, "FROM THE HAGUE TO VICE CITY - THURSDAY'S NEWS, IN ONE PICTURE", 2, INK);
  fillRect(28, 244, W - 56, 2, RULE);

  // Six panels: two columns, three rows.
  const margin = 28;
  const gap = 16;
  const colW = Math.floor((W - margin * 2 - gap) / 2);
  const rowH = 224;
  const top = 262;
  for (let i = 0; i < STORIES.length; i++) {
    const s = STORIES[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * (colW + gap);
    const y = top + row * (rowH + gap);
    fillRect(x, y, colW, rowH, PANEL);
    frameRect(x, y, colW, rowH, RULE, 2);
    // Tag bar with the story number.
    fillRect(x, y, colW, 34, s.colour);
    drawText(x + 12, y + 8, s.num + "  " + s.tag, 2, WHITE);
    // Headline, wrapped to two lines.
    const headLines = wrap(s.headline, 3, colW - 24);
    let hy = y + 48;
    for (const ln of headLines.slice(0, 2)) {
      drawText(x + 12, hy, ln, 3, INK);
      hy += 30;
    }
    // Short rule, then the summary.
    fillRect(x + 12, hy + 4, 64, 3, s.colour);
    const bodyLines = wrap(s.body, 2, colW - 24);
    let by = hy + 18;
    for (const ln of bodyLines.slice(0, 4)) {
      drawText(x + 12, by, ln, 2, [52, 52, 52]);
      by += 20;
    }
  }

  // Footer: sources, so a reader can check every story.
  const footY = top + 3 * rowH + 2 * gap + 12;
  fillRect(28, footY, W - 56, 2, INK);
  drawCentred(footY + 10, "SOURCES: BBC, REUTERS, AP, THE HINDU, IMD, ICJ - 19 NOV 2026", 2, SLATE);
}

// ---------------------------------------------------------------------------
// Minimal PNG writer: RGB, no filtering, zlib stream, CRC32.
// ---------------------------------------------------------------------------
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePng(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Entry point.
// ---------------------------------------------------------------------------
function main(): void {
  drawPage();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const png = encodePng();
  writeFileSync(join(outDir, "entry.png"), png);
}

main();
