import { facePose, matchesPose, type Point, type Pose } from "./liveIdentity";
export type Frame = { faces: number; box?: { x: number; y: number; width: number; height: number }; points?: Point[]; width: number; height: number };
export type Hold = { since: number; last: number; frames: number };
export function checkDriverFrame(frame: Frame, target: Pose): "missing" | "multiple" | "position" | "turn" | "hold" {
 if (frame.faces !== 1) return frame.faces > 1 ? "multiple" : "missing";
 const b = frame.box, w = frame.width, h = frame.height;
 if (!b || !w || !h || [b.x,b.y,b.width,b.height,w,h].some(n => !Number.isFinite(n))) return "position";
 if (b.width < w * .2 || b.width > w * .8 || b.height < h * .22 || b.x < w * .03 || b.x+b.width > w * .97 || b.y < 0 || b.y+b.height > h) return "position";
 const cx=(b.x+b.width/2)/w,cy=(b.y+b.height/2)/h;
 if (Math.abs(cx-.5)>.22 || cy<.25 || cy>.75) return "position";
 if (frame.points && frame.points.length>=68) {
  const left=frame.points.slice(36,42).reduce((v,p)=>({x:v.x+p.x/6,y:v.y+p.y/6}),{x:0,y:0});
  const right=frame.points.slice(42,48).reduce((v,p)=>({x:v.x+p.x/6,y:v.y+p.y/6}),{x:0,y:0});
  if (Math.abs(right.y-left.y)>Math.abs(right.x-left.x)*.3) return "position";
 }
 // Camera images are unmirrored at inference. Anatomical left moves the nose
 // right in the source image; front-camera mirroring is presentation only.
 const yaw = frame.points ? facePose(frame.points) : null;
 return matchesPose(yaw === null ? null : -yaw, target) ? "hold" : "turn";
}
export function updateDriverHold(previous: Hold | null, acceptable: boolean, now: number): { hold: Hold | null; reached: boolean } {
 if (!acceptable) return { hold: null, reached: false };
 const hold = previous && now - previous.last < 1200 ? { ...previous, last: now, frames: previous.frames + 1 } : { since: now, last: now, frames: 1 };
 return { hold, reached: hold.frames >= 3 && now-hold.since >= 350 };
}
