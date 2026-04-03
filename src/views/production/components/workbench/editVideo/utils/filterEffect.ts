import type { FilterClip, EffectClip, Track } from "vue-clip-track";

/** 当前时间应用的滤镜 */
export interface ActiveFilter {
  clipId: string;
  trackId: string;
  filterType: string;
  filterValue: number | Record<string, number>;
}

/** 当前时间应用的特效 */
export interface ActiveEffect {
  clipId: string;
  trackId: string;
  effectType: string;
  progress: number;
}

/** 获取当前时间点激活的滤镜 */
export function getActiveFiltersAtTime(tracks: Track[], timeInSeconds: number): ActiveFilter[] {
  const filters: ActiveFilter[] = [];

  for (const track of tracks) {
    if (track.visible === false) continue;
    if (track.type !== "filter") continue;

    for (const clip of track.clips) {
      const filterClip = clip as FilterClip;
      if (filterClip.type === "filter" && timeInSeconds >= filterClip.startTime && timeInSeconds <= filterClip.endTime) {
        filters.push({
          clipId: filterClip.id,
          trackId: filterClip.trackId,
          filterType: filterClip.filterType,
          filterValue: filterClip.filterValue,
        });
      }
    }
  }

  return filters;
}

/** 获取当前时间点激活的特效 */
export function getActiveEffectsAtTime(tracks: Track[], timeInSeconds: number): ActiveEffect[] {
  const effects: ActiveEffect[] = [];

  for (const track of tracks) {
    if (track.visible === false) continue;
    if (track.type !== "effect") continue;

    for (const clip of track.clips) {
      const effectClip = clip as EffectClip;
      if (effectClip.type === "effect" && timeInSeconds >= effectClip.startTime && timeInSeconds <= effectClip.endTime) {
        const effectTotalDuration = effectClip.endTime - effectClip.startTime;
        const elapsedTime = timeInSeconds - effectClip.startTime;
        const progress = Math.min(elapsedTime / effectTotalDuration, 1);

        effects.push({
          clipId: effectClip.id,
          trackId: effectClip.trackId,
          effectType: effectClip.effectType,
          progress,
        });
      }
    }
  }

  return effects;
}

/** 将滤镜列表转换为 CSS filter 字符串 */
export function buildCSSFilter(filters: ActiveFilter[]): string {
  const filterParts: string[] = [];

  for (const filter of filters) {
    let value: number;
    if (typeof filter.filterValue === "number") {
      value = filter.filterValue;
    } else if (typeof filter.filterValue === "object" && filter.filterValue !== null) {
      value = (filter.filterValue as Record<string, number>).value ?? Object.values(filter.filterValue).find((v) => typeof v === "number") ?? 0;
    } else {
      value = 0;
    }

    switch (filter.filterType) {
      case "blur":
        filterParts.push(`blur(${value}px)`);
        break;
      case "brightness":
        filterParts.push(`brightness(${Math.max(0, value)})`);
        break;
      case "contrast":
        filterParts.push(`contrast(${Math.max(0, value)})`);
        break;
      case "saturate":
      case "saturation":
        filterParts.push(`saturate(${Math.max(0, value)})`);
        break;
      case "grayscale":
        filterParts.push(`grayscale(${Math.min(Math.max(0, value), 1)})`);
        break;
      case "sepia":
        filterParts.push(`sepia(${Math.min(Math.max(0, value), 1)})`);
        break;
      case "invert":
        filterParts.push(`invert(${Math.min(Math.max(0, value), 1)})`);
        break;
      case "hue-rotate":
        filterParts.push(`hue-rotate(${value}deg)`);
        break;
      case "opacity":
        filterParts.push(`opacity(${Math.min(Math.max(0, value), 1)})`);
        break;
      case "drop-shadow":
        if (typeof filter.filterValue === "object" && filter.filterValue !== null) {
          const fv = filter.filterValue as Record<string, any>;
          const offsetX = fv.offsetX ?? 4;
          const offsetY = fv.offsetY ?? 4;
          const blurRadius = fv.blurRadius ?? 2;
          const color = fv.color ?? "black";
          filterParts.push(`drop-shadow(${offsetX}px ${offsetY}px ${blurRadius}px ${color})`);
        }
        break;
      default:
        console.warn(`Unknown filter type: ${filter.filterType}`);
    }
  }

  return filterParts.join(" ");
}

/** 应用特效到帧数据，返回透明度和变换 */
export function applyEffectsToFrame(
  effects: ActiveEffect[],
  _frame: VideoFrame | ImageBitmap,
  _time: number,
): { opacity: number; transform: string } {
  let opacity = 1;
  let transform = "";

  for (const effect of effects) {
    switch (effect.effectType) {
      case "fadeIn":
        opacity *= effect.progress;
        break;
      case "fadeOut":
        opacity *= 1 - effect.progress;
        break;
      case "flash": {
        const flashFrequency = 4;
        opacity *= 0.5 + 0.5 * Math.sin(effect.progress * Math.PI * 2 * flashFrequency);
        break;
      }
      case "pulse": {
        const pulseScale = 1 + 0.1 * Math.sin(effect.progress * Math.PI * 4);
        transform += ` scale(${pulseScale})`;
        break;
      }
      case "shake": {
        const shakeIntensity = 10;
        const shakeX = Math.sin(effect.progress * Math.PI * 20) * shakeIntensity * (1 - effect.progress);
        const shakeY = Math.cos(effect.progress * Math.PI * 20) * shakeIntensity * (1 - effect.progress);
        transform += ` translate(${shakeX}px, ${shakeY}px)`;
        break;
      }
      case "zoomIn": {
        const zoomInScale = 0.5 + 0.5 * effect.progress;
        opacity *= effect.progress;
        transform += ` scale(${zoomInScale})`;
        break;
      }
      case "zoomOut": {
        const zoomOutScale = 1 + 0.5 * effect.progress;
        opacity *= 1 - effect.progress;
        transform += ` scale(${zoomOutScale})`;
        break;
      }
      case "slideInLeft": {
        const slideLeftX = -100 * (1 - effect.progress);
        transform += ` translateX(${slideLeftX}%)`;
        break;
      }
      case "slideInRight": {
        const slideRightX = 100 * (1 - effect.progress);
        transform += ` translateX(${slideRightX}%)`;
        break;
      }
      case "rotateIn": {
        const rotateAngle = 360 * (1 - effect.progress);
        opacity *= effect.progress;
        transform += ` rotate(${rotateAngle}deg)`;
        break;
      }
      case "blur-in":
        opacity *= effect.progress;
        break;
      case "blur-out":
        opacity *= 1 - effect.progress;
        break;
      default:
        console.warn(`Unknown effect type: ${effect.effectType}`);
    }
  }

  return { opacity: Math.max(0, Math.min(1, opacity)), transform };
}
