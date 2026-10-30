export type CameraQuality = "good" | "dark" | "glare" | "blur";
export function cameraQuality(data: Uint8ClampedArray, width: number, height: number): CameraQuality {
 if (width < 8 || height < 8 || data.length !== width * height * 4) return "blur";
 const luma = new Float32Array(width * height); let sum = 0, square = 0, clipped = 0;
 for (let i = 0; i < luma.length; i++) { const n = .2126 * data[i*4] + .7152 * data[i*4+1] + .0722 * data[i*4+2]; luma[i] = n; sum += n; square += n*n; if (n > 248) clipped++; }
 const mean = sum / luma.length, contrast = Math.sqrt(Math.max(0, square/luma.length - mean*mean));
 if (mean < 38 && contrast < 28) return "dark";
 if (mean > 232 && clipped/luma.length > .55) return "glare";
 let edges = 0, count = 0;
 for (let y=1;y<height-1;y++) for(let x=1;x<width-1;x++){const i=y*width+x;const lap=4*luma[i]-luma[i-1]-luma[i+1]-luma[i-width]-luma[i+width];edges+=lap*lap;count++;}
 return edges/Math.max(1,count)<12 && contrast<38 ? "blur" : "good";
}
export const cameraQualityMessage = (quality: CameraQuality) => quality === "dark" ? "Move into better light, facing a window or lamp" : quality === "glare" ? "Move away from direct light or glare" : quality === "blur" ? "Clean the camera lens and hold your phone steady" : "";
