/** 媒体素材接口 */
export interface MediaItem {
  id: string;
  type: "video" | "audio" | "image";
  name: string;
  duration: number;
  icon: string;
  color: string;
  url: string;
  thumbnail?: string;
  thumbnails?: string[];
  waveformData?: number[];
  loading?: boolean;
}

/** 音频素材接口 */
export interface AudioItem {
  id: string;
  type: "audio";
  name: string;
  duration: number;
  url: string;
  waveformData?: number[];
  loading?: boolean;
}

/** 字幕/文本列表 */
export function getTextItems() {
  return [
    { id: "text-1", type: "subtitle", name: $t('workbench.production.media.titleText'), preview: "Aa", duration: 3 },
    { id: "text-2", type: "subtitle", name: $t('workbench.production.media.subtitleText'), preview: $t('workbench.production.media.subtitlePreview'), duration: 3 },
    { id: "text-3", type: "text", name: $t('workbench.production.media.customText'), preview: "Text", duration: 3 },
  ];
}

/** 转场效果列表 */
export function getTransitionItems() {
  return [
    { id: "trans-1", type: "transition", subType: "fade", name: $t('workbench.production.transition.fade'), icon: "i-round" },
    { id: "trans-2", type: "transition", subType: "slide", name: $t('workbench.production.transition.slide'), icon: "i-right" },
    { id: "trans-3", type: "transition", subType: "wipe", name: $t('workbench.production.transition.wipe'), icon: "i-erase" },
    { id: "trans-4", type: "transition", subType: "dissolve", name: $t('workbench.production.transition.dissolve'), icon: "i-platte" },
    { id: "trans-5", type: "transition", subType: "zoom", name: $t('workbench.production.transition.zoom'), icon: "i-zoom-in" },
    { id: "trans-6", type: "transition", subType: "rotate", name: $t('workbench.production.transition.rotate'), icon: "i-redo" },
  ];
}

/** 特效列表 */
export function getEffectItems() {
  return [
    { id: "fadeIn", type: "effect", effectType: "fadeIn", name: $t('workbench.production.effect.fadeIn'), icon: "i-sun-one" },
    { id: "fadeOut", type: "effect", effectType: "fadeOut", name: $t('workbench.production.effect.fadeOut'), icon: "i-moon" },
    { id: "flash", type: "effect", effectType: "flash", name: $t('workbench.production.effect.flash'), icon: "i-flashlamp" },
    { id: "shake", type: "effect", effectType: "shake", name: $t('workbench.production.effect.shake'), icon: "i-shake" },
    { id: "zoomIn", type: "effect", effectType: "zoomIn", name: $t('workbench.production.effect.zoomIn'), icon: "i-zoom-in" },
    { id: "zoomOut", type: "effect", effectType: "zoomOut", name: $t('workbench.production.effect.zoomOut'), icon: "i-zoom-out" },
    { id: "pulse", type: "effect", effectType: "pulse", name: $t('workbench.production.effect.pulse'), icon: "i-heartbeat" },
    { id: "rotateIn", type: "effect", effectType: "rotateIn", name: $t('workbench.production.effect.rotateIn'), icon: "i-redo" },
    { id: "sticker-1", type: "sticker", name: $t('workbench.production.effect.sticker1'), icon: "i-emotion-happy" },
    { id: "sticker-2", type: "sticker", name: $t('workbench.production.effect.sticker2'), icon: "i-star" },
  ];
}

/** 滤镜列表 */
export function getFilterItems() {
  return [
    { id: "grayscale", type: "filter", filterType: "grayscale", filterValue: 1, name: $t('workbench.production.filter.grayscale'), icon: "i-dark-mode" },
    { id: "sepia", type: "filter", filterType: "sepia", filterValue: 1, name: $t('workbench.production.filter.sepia'), icon: "i-camera-one" },
    { id: "warm", type: "filter", filterType: "sepia", filterValue: 0.3, name: $t('workbench.production.filter.warm'), icon: "i-fire" },
    { id: "cool", type: "filter", filterType: "hue-rotate", filterValue: 180, name: $t('workbench.production.filter.cool'), icon: "i-snowflake" },
    { id: "saturate", type: "filter", filterType: "saturate", filterValue: 2, name: $t('workbench.production.filter.vivid'), icon: "i-brightness" },
    { id: "brightness", type: "filter", filterType: "brightness", filterValue: 1.3, name: $t('workbench.production.filter.bright'), icon: "i-sun-one" },
    { id: "contrast", type: "filter", filterType: "contrast", filterValue: 1.5, name: $t('workbench.production.filter.highContrast'), icon: "i-contrast-view" },
    { id: "blur", type: "filter", filterType: "blur", filterValue: 3, name: $t('workbench.production.filter.blur'), icon: "i-fog" },
    { id: "invert", type: "filter", filterType: "invert", filterValue: 1, name: $t('workbench.production.filter.invert'), icon: "i-reverse-rotation" },
    { id: "opacity", type: "filter", filterType: "opacity", filterValue: 0.5, name: $t('workbench.production.filter.semiTransparent'), icon: "i-ghost" },
  ];
}

/** 资源库 Tab 配置 */
export function getLibraryTabs() {
  return [
    { id: "media", label: $t('workbench.production.media.media'), icon: "i-video" },
    { id: "image", label: $t('workbench.production.media.image'), icon: "i-pic" },
    { id: "audio", label: $t('workbench.production.media.audio'), icon: "i-music" },
    { id: "text", label: $t('workbench.production.media.subtitle'), icon: "i-text" },
    { id: "transition", label: $t('workbench.production.media.transition'), icon: "i-switch-themes" },
    { id: "effect", label: $t('workbench.production.media.effect'), icon: "i-magic" },
    { id: "filter", label: $t('workbench.production.media.filter'), icon: "i-color-filter" },
  ];
}

/** 格式化时长 */
export function formatDuration(seconds: number): string {
  if (seconds === 0) return $t('workbench.production.media.loading');
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
  return `${secs.toFixed(1)}s`;
}

/** 在 canvas 上绘制迷你波形图 */
export function drawMiniWaveform(audioId: string, waveformData: number[]) {
  const canvas = document.querySelector(`canvas[data-audio-id="${audioId}"]`) as HTMLCanvasElement;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  const barWidth = width / waveformData.length;
  ctx.fillStyle = "rgba(16, 185, 129, 0.8)";

  for (let i = 0; i < waveformData.length; i++) {
    const barHeight = waveformData[i] * height * 0.9;
    const x = i * barWidth;
    const y = (height - barHeight) / 2;
    ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
  }
}
