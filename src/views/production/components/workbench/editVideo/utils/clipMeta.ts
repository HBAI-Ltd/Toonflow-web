import type { Clip } from "vue-clip-track";

const CLIP_ICONS: Record<string, string> = {
  video: "i-video",
  audio: "i-music",
  subtitle: "i-editor",
  transition: "i-exchange",
  sticker: "i-pic",
  filter: "i-filter",
  effect: "i-flash",
};

const CLIP_TYPE_KEYS: Record<string, string> = {
  video: 'workbench.production.clipType.video',
  audio: 'workbench.production.clipType.audio',
  subtitle: 'workbench.production.clipType.subtitle',
  transition: 'workbench.production.clipType.transition',
  sticker: 'workbench.production.clipType.sticker',
  filter: 'workbench.production.clipType.filter',
  effect: 'workbench.production.clipType.effect',
};

/** 获取 clip 类型对应的图标 */
export function getClipIcon(clip: Clip): string {
  return CLIP_ICONS[clip.type] || "i-file-text";
}

/** 获取 clip 类型的名称 */
export function getClipTypeName(type: string): string {
  const key = CLIP_TYPE_KEYS[type];
  return key ? $t(key) : type;
}

/** 格式化时间为 MM:SS.ms 格式 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}
