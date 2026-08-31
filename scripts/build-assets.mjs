/**
 * Asset pipeline — spec §4, §11.
 *
 * Two files, and only two, are ever downloaded by a visitor's phone:
 *
 *   - the background, re-encoded to WebP (~650 KB JPG -> ~250 KB)
 *   - the Silkscreen webfont
 *
 * The other three files in `Game Assets/` are reference only: a flat JPG
 * frame cannot hold copy that changes length at every node, so the dialogue
 * box, choice panel and form are rebuilt in CSS.
 *
 * The font is self-hosted rather than pulled from Google Fonts because the
 * service worker must precache it. The fallback stack is not metrically
 * identical, and the copy budget assumes the webfont loaded.
 *
 * Run: npm run assets
 */

import { mkdir, writeFile, access, stat } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const SOURCE_BG = join(ROOT, 'Game Assets', 'Background Screen.jpg');
const OUT_IMG = join(ROOT, 'public', 'assets', 'background.webp');
const OUT_FONT = join(ROOT, 'public', 'fonts', 'silkscreen.woff2');

// Silkscreen, SIL Open Font License. Pinned to the exact latin subset so a
// re-run cannot silently swap the metric the copy budget is measured
// against.
//
// Regular only. Nothing in the visitor UI sets a pixel bold — the form
// labels that are bold are Noto Sans — and a second face would be dead
// weight in the precache against a 1.2 MB cold-load budget.
const FONT_URL =
  'https://fonts.gstatic.com/s/silkscreen/v6/m8JXjfVPf62XiF7kO-i9YLNlaw.woff2';

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function buildBackground() {
  if (!(await exists(SOURCE_BG))) {
    throw new Error(`Missing source art: ${SOURCE_BG}`);
  }
  await mkdir(join(ROOT, 'public', 'assets'), { recursive: true });

  // Phone-sized. The art is displayed full-bleed at object-fit: cover, so
  // a 1080px-wide encode is past the point any booth phone can resolve.
  await sharp(SOURCE_BG)
    .resize({ width: 1080, withoutEnlargement: true })
    .webp({ quality: 78, effort: 6 })
    .toFile(OUT_IMG);

  const [before, after] = await Promise.all([stat(SOURCE_BG), stat(OUT_IMG)]);
  const kb = (n) => `${Math.round(n / 1024)} KB`;
  console.log(`background.webp  ${kb(before.size)} -> ${kb(after.size)}`);

  if (after.size > 400 * 1024) {
    throw new Error(
      `Background is ${kb(after.size)}; the cold-load budget is 1.2 MB total.`,
    );
  }
}

async function fetchFont() {
  await mkdir(join(ROOT, 'public', 'fonts'), { recursive: true });

  if (await exists(OUT_FONT)) {
    const { size } = await stat(OUT_FONT);
    console.log(`silkscreen.woff2  already present (${size} bytes)`);
    return;
  }

  const response = await fetch(FONT_URL, {
    headers: {
      // gstatic serves woff2 only to a UA it believes supports it.
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    },
  });
  if (!response.ok) {
    throw new Error(`Font fetch failed: ${response.status}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(OUT_FONT, bytes);
  console.log(`silkscreen.woff2  ${bytes.length} bytes`);
}

await buildBackground();
await fetchFont();
