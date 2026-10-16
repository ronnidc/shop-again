/**
 * Poppins (SIL Open Font License 1.1) for the mark, the wordmark and the
 * store pictures, fetched from Google Fonts into the system temp directory
 * on the first use, so the repo carries no font files.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SOURCE = 'https://github.com/google/fonts/raw/main/ofl/poppins/';
export const FONT_DIR = join(tmpdir(), 'shop-again-fonts');

/** The bytes of one Poppins file, such as `Poppins-Bold.ttf`. */
export async function font(file) {
  const path = join(FONT_DIR, file);
  try {
    return await readFile(path);
  } catch {
    const response = await fetch(SOURCE + file);
    if (!response.ok) throw new Error(`${SOURCE}${file}: ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    await mkdir(FONT_DIR, { recursive: true });
    await writeFile(path, bytes);
    return bytes;
  }
}
