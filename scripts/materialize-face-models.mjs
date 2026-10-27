import { mkdir, copyFile } from 'node:fs/promises';
const source = 'node_modules/@vladmandic/face-api';
await mkdir('public/models/identity-v1', { recursive: true });
for (const model of ['tiny_face_detector', 'face_landmark_68', 'face_recognition']) {
  for (const suffix of ['_model.bin', '_model-weights_manifest.json']) {
    await copyFile(`${source}/model/${model}${suffix}`, `public/models/identity-v1/${model}${suffix}`);
  }
}
await copyFile(`${source}/LICENSE`, 'public/models/identity-v1/LICENSE.txt');
console.log('Materialized pinned face comparison models (identity-v1).');
