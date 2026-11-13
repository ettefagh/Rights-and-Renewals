import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import sharp from 'sharp';
import { loadCanonicalPolicies } from './policy-catalog.mjs';

const logoSource = new URL('../../../packages/core/src/data/brandLogos.ts', import.meta.url);
const assetDirectory = new URL('../public/brand-logos/', import.meta.url);

const attribution = {
  'developer-icons': 'Source: developer-icons, revision 4a10a1bdb1cc799956c089fc897332511d80ad52; MIT, copyright Sandesh Katwal aka xandemon, 2024.',
  'simple-icons': 'Source: Simple Icons 16.36.0 via @iconify-json/simple-icons 1.2.101; CC0 1.0 Universal.',
  'dashboard-icons': 'Source: dashboard-icons, revision d767d7327db7f8ebd3715b552523f61889eea41c; Apache-2.0. Brand trademarks remain their respective owners.',
};

const officialSources = {
  gymshark: 'https://www.gymshark.com/apple-touch-icon.png',
  mindfactory: 'https://www.mindfactory.de/templates/mindfactory_new/images/squares/favicon-96x96.png',
  mcfit: 'https://www.mcfit.com/favicon/apple-icon-72x72.png',
  'urban-sports-club': 'https://urbansportsclub.com/favicon-dark.ico',
};

function getIcoPng(bytes) {
  if (bytes.length < 6 || bytes.readUInt16LE(0) !== 0 || bytes.readUInt16LE(2) !== 1) {
    throw new Error('Unsupported ICO header in Urban Sports Club logo.');
  }
  const count = bytes.readUInt16LE(4);
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const entries = [];
  for (let index = 0; index < count; index++) {
    const offset = 6 + index * 16;
    if (offset + 16 > bytes.length) throw new Error('Truncated ICO directory.');
    const width = bytes[offset] || 256;
    const height = bytes[offset + 1] || 256;
    const size = bytes.readUInt32LE(offset + 8);
    const imageOffset = bytes.readUInt32LE(offset + 12);
    const end = imageOffset + size;
    if (size > 0 && end <= bytes.length && bytes.subarray(imageOffset, imageOffset + 8).equals(pngSignature)) {
      entries.push({ width, height, imageOffset, end });
    }
  }
  entries.sort((a, b) => b.width * b.height - a.width * a.height);
  if (!entries.length) throw new Error('ICO has no embedded PNG frame; refusing an unverified conversion.');
  const selected = entries[0];
  return bytes.subarray(selected.imageOffset, selected.end);
}

async function loadBrandLogoLookup() {
  const source = await readFile(logoSource, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`;
  return import(moduleUrl);
}

function sourceCredit(slug, record) {
  if (record.source === 'official-site') {
    const sourceUrl = officialSources[slug];
    if (!sourceUrl) throw new Error(`Missing official logo source attribution for ${slug}.`);
    return `Source: brand-owned site identity asset ${sourceUrl}; brand remains copyright/trademark holder.`;
  }
  const credit = attribution[record.source];
  if (!credit) throw new Error(`Missing source attribution for logo ${slug}.`);
  return credit;
}

/** Load canonical logo files and make upload-safe PNG media bytes. */
export async function loadBrandLogoAssets({ convert = (input) => sharp(input, { density: 384 }) } = {}) {
  const { getBrandLogo } = await loadBrandLogoLookup();
  const policies = await loadCanonicalPolicies();
  const entries = [];
  for (const policy of policies) {
    const logo = getBrandLogo(policy.slug);
    if (!logo?.file) throw new Error(`Canonical policy ${policy.slug} has no authoritative local logo file.`);
    const sourceBytes = await readFile(new URL(logo.file, assetDirectory));
    const originalSha256 = createHash('sha256').update(sourceBytes).digest('hex');
    const extension = logo.file.toLowerCase().split('.').pop();
    const input = extension === 'ico' ? getIcoPng(sourceBytes) : sourceBytes;
    const bytes = await convert(input)
      .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();
    const derivativeSha256 = createHash('sha256').update(bytes).digest('hex');
    const caption = `${sourceCredit(policy.slug, logo)} Original asset: apps/showcase/public/brand-logos/${logo.file}; SHA-256 ${originalSha256}. Imported PNG derivative SHA-256 ${derivativeSha256}; ${extension === 'svg' || extension === 'ico' ? 'rasterized locally' : 'normalized locally'}; source file retained unchanged.`;
    entries.push({
      slug: policy.slug,
      asset: {
        filename: `brand-${policy.slug}-logo-${originalSha256.slice(0, 16)}-${derivativeSha256.slice(0, 16)}.png`,
        mimeType: 'image/png',
        width: 512,
        height: 512,
        alt: logo.name,
        caption,
        bytes,
      },
    });
  }
  return entries;
}

export { getIcoPng };
