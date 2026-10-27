// Loaded only after the user elects to start a camera check. No demographic models.
let loading: Promise<typeof import('@vladmandic/face-api')> | null = null;
export function loadFaceComparison() {
  loading ??= (async () => {
    const api = await import('@vladmandic/face-api');
    await Promise.all([
      api.nets.tinyFaceDetector.loadFromUri('/models/identity-v1'),
      api.nets.faceLandmark68Net.loadFromUri('/models/identity-v1'),
      api.nets.faceRecognitionNet.loadFromUri('/models/identity-v1'),
    ]);
    return api;
  })().catch(error => { loading = null; throw error; });
  return loading;
}
