import { readFile, readdir, mkdir, writeFile, rename } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { createHash } from 'node:crypto';
const root = resolve('public/images/truck-models');
let count = 0;
for (const name of (await readdir('data/truck-photo-assets')).filter(value => /^photo-pack-\d+\.json$/.test(value)).sort()) {
  const photos = JSON.parse(await readFile(resolve('data/truck-photo-assets', name), 'utf8'));
  for (const photo of photos) {
    const destination = resolve('public', photo.path.replace(/^\//, ''));
    if (!destination.startsWith(root + sep) || !/^\/images\/truck-models\/(asia|europe|other)\/[a-z0-9-]+\.webp$/.test(photo.path)) throw new Error('Invalid truck photograph path');
    const bytes = Buffer.from(photo.base64, 'base64');
    if (bytes.length < 1024 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP' || createHash('sha256').update(bytes).digest('hex') !== photo.sha256) throw new Error(`Truck photograph checksum mismatch: ${photo.path}`);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination + '.tmp', bytes);
    await rename(destination + '.tmp', destination);
    count += 1;
  }
}
console.log(`Verified ${count} real truck photograph assets`);
