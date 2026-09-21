import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = [
  'assets/hero/lake-district-soft.png',
  'assets/hero/london-golden-hour-v2.png',
  'assets/hero/tower-bridge-premium.png',
  'assets/theme/banner-dark.png',
  'assets/theme/banner-warm.png',
  'assets/theme/onboarding-illustration.png',
];

for (const relativeInput of assets) {
  const input = path.join(workspace, relativeInput);
  const output = input.replace(/\.png$/i, '.webp');
  await sharp(input).webp({ quality: 80, effort: 6 }).toFile(output);
  console.log(`${relativeInput} -> ${path.relative(workspace, output)}`);
}
