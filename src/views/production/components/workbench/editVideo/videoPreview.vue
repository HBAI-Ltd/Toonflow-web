<template>
  <div class="videoPreview">
    <!-- AVCanvas 视频预览区域 -->
    <div ref="canvasContainer" class="previewScreen">
      <div v-if="!hasSprites" class="previewScreenPlaceholder">
        <div class="placeholderIcon"><i-film theme="outline" size="48" fill="#999" /></div>
        <div class="placeholderText">视频预览区域</div>
        <div class="placeholderTime">{{ formatTime(currentTimeInSeconds) }}</div>
      </div>

      <!-- 播放指示器 -->
      <div v-if="isPlaying && !hasSprites" class="previewScreenPlaying">
        <div class="playingIndicator"><i-play theme="outline" size="36" fill="#000000" /></div>
      </div>
    </div>

    <!-- 播放进度条 -->
    <div class="previewProgress">
      <input type="range" min="0" :max="durationInSeconds" :value="currentTimeInSeconds" step="0.01" class="progressSlider" @input="handleSeek" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { AVCanvas } from "@webav/av-canvas";
import { MP4Clip, AudioClip, ImgClip, VisibleSprite, renderTxt2ImgBitmap } from "@webav/av-cliper";
import { usePlaybackStore, useTracksStore } from "vue-clip-track";
import type { Clip, MediaClip, SubtitleClip, TextClip, TransitionClip, Track } from "vue-clip-track";
import { getTransitionRenderer } from "./utils/transitionRenderers";
import {
  type ActiveFilter,
  type ActiveEffect,
  getActiveFiltersAtTime as _getActiveFiltersAtTime,
  getActiveEffectsAtTime as _getActiveEffectsAtTime,
  buildCSSFilter,
  applyEffectsToFrame,
} from "./utils/filterEffect";
import { formatTime } from "./utils/clipMeta";

const props = withDefaults(
  defineProps<{
    canvasWidth?: number;
    canvasHeight?: number;
  }>(),
  {
    canvasWidth: 1920,
    canvasHeight: 1080,
  },
);

// 转场信息（用于关联两个视频 clip）
interface TransitionInfo {
  transitionClip: TransitionClip;
  beforeClipId: string; // 转场前的视频 clip ID
  afterClipId: string; // 转场后的视频 clip ID
  transitionType: string; // 转场类型
  startTime: number; // 转场开始时间（秒）
  endTime: number; // 转场结束时间（秒）
  duration: number; // 转场时长（秒）
}

// 定义事件
const emit = defineEmits<{
  (e: "play"): void;
  (e: "pause"): void;
}>();

// AVCanvas 调试数据类型
export interface AVCanvasDebugData {
  initialized: boolean;
  canvasWidth: number;
  canvasHeight: number;
  isPlaying: boolean;
  currentTime: number; // 微秒
  duration: number; // 微秒
  playbackSpeed: number;
  spriteCount: number;
  sprites: Array<{
    clipId: string;
    type: string;
    offset: number;
    duration: number;
    visible: boolean;
    opacity: number;
    rect: { x: number; y: number; w: number; h: number; angle: number };
    zIndex: number;
  }>;
}

// 扩展 Clip 类型，包含新增的空间属性
type ExtendedClipProps = {
  rect?: {
    x: number;
    y: number;
    w: number;
    h: number;
    angle: number;
    fixedAspectRatio?: boolean;
    fixedScaleCenter?: boolean;
  };
  visible?: boolean;
  opacity?: number;
  flip?: "horizontal" | "vertical" | null;
  zIndex?: number;
};

type ExtendedClip = Clip & ExtendedClipProps;

const playbackStore = usePlaybackStore();
const tracksStore = useTracksStore();
const playbackSpeed = ref(1);

// AVCanvas 相关
const canvasContainer = ref<HTMLElement | null>(null);
let avCanvas: AVCanvas | null = null;
const hasSprites = ref(false);
const isPlaying = ref(false);
const currentTime = ref(0); // 微秒
const duration = ref(playbackStore.duration * 1e6); // 转换为微秒

// 防止循环更新的标志
let isUpdatingFromCanvas = false;
let isUpdatingFromStore = false;

// 防止并发同步的标志
let isSyncing = false;
let pendingSync = false;

// Canvas 尺寸（来自 props）
const CANVAS_WIDTH = computed(() => props.canvasWidth);
const CANVAS_HEIGHT = computed(() => props.canvasHeight);

// 存储 clip ID 与 sprite 的映射关系
const clipSpriteMap = new Map<string, VisibleSprite>();
// 存储 sprite 事件取消监听函数
const spriteListenerMap = new Map<string, () => void>();
// 存储 clip 的关键属性快照（用于检测需要重建 sprite 的变化）
const clipSnapshotMap = new Map<
  string,
  {
    trimStart: number;
    trimEnd: number;
    playbackRate: number;
    sourceUrl: string;
    text?: string;
    volume: number;
  }
>();

// 存储 clip 所属轨道的信息（用于计算 zIndex）
const clipTrackMap = new Map<string, { trackId: string; trackOrder: number }>();

// 存储转场信息（transitionClipId -> TransitionInfo）
const transitionInfoMap = new Map<string, TransitionInfo>();
// 存储 clip 关联的转场信息（videoClipId -> TransitionInfo[]）
// 一个视频 clip 可能同时是某个转场的 beforeClip 和另一个转场的 afterClip
const clipTransitionsMap = new Map<string, TransitionInfo[]>();
// 缓存转场渲染需要的帧数据
const transitionFrameCache = new Map<
  string,
  {
    canvas: OffscreenCanvas;
    ctx: OffscreenCanvasRenderingContext2D;
  }
>();

// 当前激活的滤镜列表
const activeFilters = ref<ActiveFilter[]>([]);
// 当前激活的特效列表
const activeEffects = ref<ActiveEffect[]>([]);

// AVCanvas 调试数据
const avCanvasDebugData = reactive<AVCanvasDebugData>({
  initialized: false,
  canvasWidth: CANVAS_WIDTH.value,
  canvasHeight: CANVAS_HEIGHT.value,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackSpeed: 1,
  spriteCount: 0,
  sprites: [],
});

// 提供调试数据给子组件
provide("avCanvasDebugData", avCanvasDebugData);

// 更新调试数据中的 sprites 信息
function updateDebugSprites() {
  const sprites: AVCanvasDebugData["sprites"] = [];
  for (const [clipId, sprite] of clipSpriteMap) {
    const clip = findClipById(clipId);
    sprites.push({
      clipId,
      type: clip?.type || "unknown",
      offset: sprite.time.offset,
      duration: sprite.time.duration,
      visible: sprite.visible,
      opacity: sprite.opacity,
      rect: {
        x: sprite.rect.x,
        y: sprite.rect.y,
        w: sprite.rect.w,
        h: sprite.rect.h,
        angle: sprite.rect.angle,
      },
      zIndex: sprite.zIndex,
    });
  }
  avCanvasDebugData.sprites = sprites;
  avCanvasDebugData.spriteCount = sprites.length;
}

// 计算所有 sprites 的最大结束时间（用于获取实际可播放时长）
function getMaxSpriteDuration(): number {
  let maxEndTime = 0;
  for (const sprite of clipSpriteMap.values()) {
    const endTime = sprite.time.offset + sprite.time.duration;
    if (endTime > maxEndTime) {
      maxEndTime = endTime;
    }
  }
  return maxEndTime;
}

// 获取有效的播放时长（优先使用 sprites 计算，否则使用 playbackStore）
function getEffectiveDuration(): number {
  const spriteDuration = getMaxSpriteDuration();
  const storeDuration = playbackStore.duration * 1e6;
  // 使用两者中的较大值，确保有有效时长
  return Math.max(spriteDuration, storeDuration, 0);
}

// 计算属性：将微秒转换为秒
const currentTimeInSeconds = computed(() => currentTime.value / 1e6);
const durationInSeconds = computed(() => duration.value / 1e6);

// 根据 clipId 查找 clip（提前定义，供后续函数使用）
function findClipById(clipId: string): Clip | null {
  for (const track of tracksStore.tracks) {
    for (const clip of track.clips) {
      if (clip.id === clipId) {
        return clip;
      }
    }
  }
  return null;
}

// ============ 轨道 zIndex 计算 ============
// 根据轨道顺序计算 zIndex，轨道 order 越小（越靠上），zIndex 越大（显示在上层）
// 字幕轨道始终显示在所有画面之上
function calculateZIndexFromTrackOrder(trackOrder: number, isSubtitleTrack: boolean = false): number {
  const maxTracks = 100; // 假设最多 100 个轨道
  const baseZIndex = (maxTracks - trackOrder) * 10; // 每个轨道之间留 10 的间隔

  // 字幕轨道额外增加 1000 的基础值，确保始终在画面之上
  // 字幕轨道之间仍然按照轨道关系确定层级
  if (isSubtitleTrack) {
    return baseZIndex + 1000;
  }

  return baseZIndex;
}

// 获取 clip 所属轨道的 order
function getTrackOrderForClip(clipId: string): number {
  const trackInfo = clipTrackMap.get(clipId);
  if (trackInfo) {
    return trackInfo.trackOrder;
  }
  // 如果没有记录，尝试查找
  const clip = findClipById(clipId);
  if (clip) {
    const track = tracksStore.tracks.find((t) => t.id === clip.trackId);
    if (track) {
      return track.order;
    }
  }
  return 0;
}

// ============ 滤镜处理 ============
function getActiveFiltersAtTime(timeInSeconds: number): ActiveFilter[] {
  return _getActiveFiltersAtTime(tracksStore.tracks, timeInSeconds);
}

function getActiveEffectsAtTime(timeInSeconds: number): ActiveEffect[] {
  return _getActiveEffectsAtTime(tracksStore.tracks, timeInSeconds);
}

// ============ 转场处理 ============

// 检测并建立转场关联关系
function detectTransitions(): void {
  // 清除旧的转场信息
  transitionInfoMap.clear();
  clipTransitionsMap.clear();

  for (const track of tracksStore.tracks) {
    if (track.visible === false) continue;

    // 找出该轨道中的所有转场 clip
    const transitionClips = track.clips.filter((c) => c.type === "transition") as TransitionClip[];
    // 找出该轨道中的所有视频 clip
    const videoClips = track.clips.filter((c) => c.type === "video") as MediaClip[];

    for (const transitionClip of transitionClips) {
      // 转场时间范围
      const transStart = transitionClip.startTime;
      const transEnd = transitionClip.endTime;
      const transMidPoint = (transStart + transEnd) / 2;

      // 查找转场前的视频 clip（beforeClip）
      // 策略：找到 endTime 在转场时间范围内或刚好在转场中点之后的视频
      // 典型情况：Video1 结束于 5s，转场从 4.5s-5.5s，中点 5s
      let beforeClip: MediaClip | null = null;
      let beforeClipScore = -Infinity;
      for (const vc of videoClips) {
        // 条件：视频的结束时间落在 [transStart, transEnd] 区间内或附近
        // 允许 1s 的容差来处理边界情况
        const tolerance = 1.0;
        if (vc.endTime >= transStart - tolerance && vc.endTime <= transEnd + tolerance) {
          // 评分：结束时间越接近转场中点越好
          const score = -Math.abs(vc.endTime - transMidPoint);
          if (score > beforeClipScore) {
            beforeClip = vc;
            beforeClipScore = score;
          }
        }
      }

      // 查找转场后的视频 clip（afterClip）
      // 策略：找到 startTime 在转场时间范围内或刚好在转场中点之前的视频
      // 典型情况：Video2 开始于 5s，转场从 4.5s-5.5s，中点 5s
      let afterClip: MediaClip | null = null;
      let afterClipScore = -Infinity;
      for (const vc of videoClips) {
        // 条件：视频的开始时间落在 [transStart, transEnd] 区间内或附近
        const tolerance = 1.0;
        if (vc.startTime >= transStart - tolerance && vc.startTime <= transEnd + tolerance) {
          // 评分：开始时间越接近转场中点越好
          const score = -Math.abs(vc.startTime - transMidPoint);
          if (score > afterClipScore) {
            afterClip = vc;
            afterClipScore = score;
          }
        }
      }

      // 如果找到了前后两个视频 clip，建立转场关联
      if (beforeClip && afterClip && beforeClip.id !== afterClip.id) {
        const transitionInfo: TransitionInfo = {
          transitionClip,
          beforeClipId: beforeClip.id,
          afterClipId: afterClip.id,
          transitionType: transitionClip.transitionType || "fade",
          startTime: transStart,
          endTime: transEnd,
          duration: transEnd - transStart,
        };

        transitionInfoMap.set(transitionClip.id, transitionInfo);

        // 为两个视频 clip 添加转场关联
        const beforeTransitions = clipTransitionsMap.get(beforeClip.id) || [];
        beforeTransitions.push(transitionInfo);
        clipTransitionsMap.set(beforeClip.id, beforeTransitions);

        const afterTransitions = clipTransitionsMap.get(afterClip.id) || [];
        afterTransitions.push(transitionInfo);
        clipTransitionsMap.set(afterClip.id, afterTransitions);

        // console.log( `[Transition] Detected: ${transitionClip.transitionType} between ${beforeClip.id}(ends@${beforeClip.endTime}s) and ${afterClip.id}(starts@${afterClip.startTime}s), transition: ${transStart}s - ${transEnd}s`, );
      } else {
        // console.warn(`[Transition] Could not find valid video clips for transition ${transitionClip.id}`, { beforeClip: beforeClip?.id, afterClip: afterClip?.id, });
      }
    }
  }
}

// 获取当前时间点的激活转场信息
// 转场渲染策略：
// - 在 beforeClip 播放期间（transition.startTime 到 beforeClip.endTime）：beforeClip 渐隐
// - 在 afterClip 播放期间（afterClip.startTime 到 transition.endTime）：afterClip 渐显并混合 beforeClip 的缓存帧
function getActiveTransitionAtTime(
  timeInSeconds: number,
  clipId: string,
): {
  transition: TransitionInfo;
  progress: number;
  isBeforeClip: boolean;
} | null {
  const transitions = clipTransitionsMap.get(clipId);
  if (!transitions || transitions.length === 0) return null;

  for (const transition of transitions) {
    const isBeforeClip = transition.beforeClipId === clipId;

    // 查找关联的 clip 信息
    const beforeClip = findClipById(transition.beforeClipId);
    const afterClip = findClipById(transition.afterClipId);

    if (!beforeClip || !afterClip) continue;

    if (isBeforeClip) {
      // 对于 beforeClip：在 transition.startTime 到 beforeClip.endTime 期间生效
      // progress: 0 (刚开始转场) -> 1 (beforeClip 结束)
      if (timeInSeconds >= transition.startTime && timeInSeconds <= beforeClip.endTime) {
        const effectiveDuration = beforeClip.endTime - transition.startTime;
        const progress = effectiveDuration > 0 ? (timeInSeconds - transition.startTime) / effectiveDuration : 0;
        return { transition, progress: Math.min(1, progress), isBeforeClip: true };
      }
    } else {
      // 对于 afterClip：在 afterClip.startTime 到 transition.endTime 期间生效
      // progress: 0 (afterClip 刚开始) -> 1 (转场结束)
      if (timeInSeconds >= afterClip.startTime && timeInSeconds <= transition.endTime) {
        const effectiveDuration = transition.endTime - afterClip.startTime;
        const progress = effectiveDuration > 0 ? (timeInSeconds - afterClip.startTime) / effectiveDuration : 0;
        return { transition, progress: Math.min(1, progress), isBeforeClip: false };
      }
    }
  }

  return null;
}

// 获取另一个 clip 的当前帧（用于转场混合）
async function getOtherClipFrame(clipId: string, globalTimeInSeconds: number): Promise<ImageBitmap | null> {
  const sprite = clipSpriteMap.get(clipId);
  if (!sprite) {
    // console.warn(`[Transition] Cannot find sprite for clip ${clipId}`);
    return null;
  }

  try {
    // 计算该 clip 内部的时间偏移
    const clip = findClipById(clipId);
    if (!clip) return null;

    // 内部时间 = 全局时间 - clip 开始时间
    const internalTimeInSeconds = globalTimeInSeconds - clip.startTime;
    if (internalTimeInSeconds < 0) return null;

    // 由于 @webav/av-cliper 的 sprite 没有直接提供获取帧的方法
    // 我们需要使用缓存的方式：在 tickInterceptor 中缓存最近的帧
    // 这里暂时返回 null，实际帧数据会在渲染时直接获取
    return null;
  } catch (error) {
    // console.warn(`[Transition] Failed to get frame for clip ${clipId}:`, error);
    return null;
  }
}

// 帧缓存：用于存储每个 clip 最近渲染的帧（用于转场混合）
const clipFrameCache = new Map<string, ImageBitmap>();

// 创建带滤镜和转场的 tickInterceptor
// 注意：time 参数是 clip 内部的相对时间（微秒），需要转换为全局时间轴时间
function createFilteredTickInterceptor(originalClip: Clip): ((time: number, tickRet: any) => Promise<any>) | undefined {
  // 如果不是视频、图片或贴纸，不需要滤镜
  if (originalClip.type !== "video" && (originalClip as any).type !== "image" && originalClip.type !== "sticker") {
    return undefined;
  }

  // 获取播放倍速（用于时间转换）
  const mediaClip = originalClip as MediaClip;
  const playbackRate = mediaClip.playbackRate || 1;

  // 缓存 canvas 和 context，避免每帧创建
  let cachedCanvas: OffscreenCanvas | null = null;
  let cachedCtx: OffscreenCanvasRenderingContext2D | null = null;
  let cachedWidth = 0;
  let cachedHeight = 0;

  // 转场专用的 canvas（用于混合两帧）
  let transitionCanvas: OffscreenCanvas | null = null;
  let transitionCtx: OffscreenCanvasRenderingContext2D | null = null;

  return async (time: number, tickRet: any) => {
    if (!tickRet.video) return tickRet;

    // 计算全局时间轴时间
    // time 是 clip 内部的相对时间（微秒），这是视频素材内部的时间
    // 当有倍速时，视频内部时间流逝更快（playbackRate > 1）或更慢（playbackRate < 1）
    // 在时间轴上，clip 的持续时间 = 视频实际时长 / playbackRate
    // 因此：时间轴上经过的时间 = (内部时间 / playbackRate)
    // 全局时间 = clip.startTime + (内部时间 / playbackRate)
    const elapsedTimeOnTimeline = time / 1e6 / playbackRate;
    const globalTimeInSeconds = originalClip.startTime + elapsedTimeOnTimeline;

    const frame = tickRet.video as VideoFrame | ImageBitmap;
    const width = "displayWidth" in frame ? frame.displayWidth : frame.width;
    const height = "displayHeight" in frame ? frame.displayHeight : frame.height;

    // 检查当前是否处于转场时间段
    const transitionState = getActiveTransitionAtTime(globalTimeInSeconds, originalClip.id);

    // 获取当前激活的滤镜和特效
    const filters = getActiveFiltersAtTime(globalTimeInSeconds);
    const effects = getActiveEffectsAtTime(globalTimeInSeconds);

    // 辅助函数：更新帧缓存（用于转场混合）
    const updateFrameCache = async (frameToCache: VideoFrame | ImageBitmap) => {
      try {
        const frameCopy = await createImageBitmap(frameToCache);
        const oldCache = clipFrameCache.get(originalClip.id);
        if (oldCache) {
          oldCache.close();
        }
        clipFrameCache.set(originalClip.id, frameCopy);
      } catch (e) {
        // 忽略缓存错误
      }
    };

    // 如果处于转场中且当前 clip 是转场后的视频（afterClip），进行混合渲染
    if (transitionState && !transitionState.isBeforeClip) {
      const { transition, progress } = transitionState;
      const beforeClipFrame = clipFrameCache.get(transition.beforeClipId);

      if (beforeClipFrame) {
        try {
          // 创建或复用转场 canvas
          if (!transitionCanvas || transitionCanvas.width !== width || transitionCanvas.height !== height) {
            transitionCanvas = new OffscreenCanvas(width, height);
            transitionCtx = transitionCanvas.getContext("2d");
          }

          if (transitionCtx) {
            // 获取转场渲染器
            const renderer = getTransitionRenderer(transition.transitionType);

            // 渲染转场效果
            renderer.render(
              transitionCtx,
              beforeClipFrame, // 前一个 clip 的帧
              frame, // 当前 clip 的帧（后一个）
              progress,
              width,
              height,
            );

            // 如果原始帧是 VideoFrame，需要关闭它以释放内存
            if ("close" in frame && typeof frame.close === "function") {
              frame.close();
            }

            // 创建混合后的帧
            const transitionedFrame = await createImageBitmap(transitionCanvas);

            // console.log(`[Transition] Rendered ${transition.transitionType} at progress ${progress.toFixed(2)}`);

            return {
              ...tickRet,
              video: transitionedFrame,
            };
          }
        } catch (error) {
          // console.warn("[Transition] Failed to render transition:", error);
          // 失败时继续正常渲染
        }
      }
    }

    // 如果处于转场中且当前 clip 是转场前的视频（beforeClip）
    // beforeClip 需要应用滤镜后缓存帧（供 afterClip 混合使用）
    // 同时应用淡出效果，让视觉上逐渐消失
    if (transitionState && transitionState.isBeforeClip) {
      const { progress } = transitionState;

      // 复用或创建 canvas
      if (!cachedCanvas || cachedWidth !== width || cachedHeight !== height) {
        cachedCanvas = new OffscreenCanvas(width, height);
        cachedCtx = cachedCanvas.getContext("2d");
        cachedWidth = width;
        cachedHeight = height;
      }

      if (cachedCtx) {
        cachedCtx.clearRect(0, 0, width, height);
        cachedCtx.setTransform(1, 0, 0, 1, 0, 0);
        cachedCtx.filter = "none";
        cachedCtx.globalAlpha = 1;

        // 应用 CSS 滤镜（如果有）
        if (filters.length > 0) {
          cachedCtx.filter = buildCSSFilter(filters);
        }

        // 应用特效（透明度部分）
        let effectOpacity = 1;
        if (effects.length > 0) {
          const effectResult = applyEffectsToFrame(effects, frame, time);
          effectOpacity = effectResult.opacity;
        }

        // 先以完整透明度绘制帧（用于缓存）
        cachedCtx.globalAlpha = effectOpacity;
        cachedCtx.drawImage(frame, 0, 0);

        // 缓存应用滤镜后的帧（不含淡出效果，供转场混合使用）
        const frameForCache = await createImageBitmap(cachedCanvas);
        await updateFrameCache(frameForCache);

        // 如果需要淡出效果，重新绘制
        if (progress > 0) {
          cachedCtx.clearRect(0, 0, width, height);
          cachedCtx.filter = filters.length > 0 ? buildCSSFilter(filters) : "none";
          // 应用淡出效果：随着 progress 增加，透明度降低
          cachedCtx.globalAlpha = effectOpacity * (1 - progress);
          cachedCtx.drawImage(frame, 0, 0);
        }

        cachedCtx.globalAlpha = 1;
        cachedCtx.filter = "none";

        // 如果原始帧是 VideoFrame，需要关闭它以释放内存
        if ("close" in frame && typeof frame.close === "function") {
          frame.close();
        }

        const fadedFrame = await createImageBitmap(cachedCanvas);
        return {
          ...tickRet,
          video: fadedFrame,
        };
      }
    }

    // 如果没有滤镜、特效和转场，缓存原始帧并直接返回
    if (filters.length === 0 && effects.length === 0) {
      // 缓存原始帧
      await updateFrameCache(frame);
      return tickRet;
    }

    try {
      const frame = tickRet.video as VideoFrame | ImageBitmap;
      const width = "displayWidth" in frame ? frame.displayWidth : frame.width;
      const height = "displayHeight" in frame ? frame.displayHeight : frame.height;

      // 复用或创建 canvas（性能优化）
      if (!cachedCanvas || cachedWidth !== width || cachedHeight !== height) {
        cachedCanvas = new OffscreenCanvas(width, height);
        cachedCtx = cachedCanvas.getContext("2d");
        cachedWidth = width;
        cachedHeight = height;
      }

      const ctx = cachedCtx;
      if (!ctx) return tickRet;

      // 清除之前的内容
      ctx.clearRect(0, 0, width, height);

      // 重置变换和滤镜
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.filter = "none";
      ctx.globalAlpha = 1;

      // 应用 CSS 滤镜
      if (filters.length > 0) {
        ctx.filter = buildCSSFilter(filters);
      }

      // 应用特效（透明度部分）
      const effectResult = applyEffectsToFrame(effects, frame, time);
      ctx.globalAlpha = effectResult.opacity;

      // 绘制帧
      ctx.drawImage(frame, 0, 0);

      // 如果原始帧是 VideoFrame，需要关闭它以释放内存
      if ("close" in frame && typeof frame.close === "function") {
        frame.close();
      }

      // 创建新的 ImageBitmap
      const newFrame = await createImageBitmap(cachedCanvas);

      // 缓存应用滤镜后的帧（用于转场混合）
      await updateFrameCache(newFrame);

      return {
        ...tickRet,
        video: newFrame,
      };
    } catch (error) {
      // console.warn("Failed to apply filters/effects:", error);
      return tickRet;
    }
  };
}

// 计算 sprite 在 canvas 中的位置和尺寸（保持宽高比居中显示）
function calculateSpriteRect(mediaWidth: number, mediaHeight: number) {
  const mediaAspect = mediaWidth / mediaHeight;
  const canvasAspect = CANVAS_WIDTH.value / CANVAS_HEIGHT.value;

  let w: number, h: number, x: number, y: number;

  if (mediaAspect > canvasAspect) {
    // 媒体更宽，以宽度为基准
    w = CANVAS_WIDTH.value;
    h = CANVAS_WIDTH.value / mediaAspect;
    x = 0;
    y = (CANVAS_HEIGHT.value - h) / 2;
  } else {
    // 媒体更高，以高度为基准
    h = CANVAS_HEIGHT.value;
    w = CANVAS_HEIGHT.value * mediaAspect;
    x = (CANVAS_WIDTH.value - w) / 2;
    y = 0;
  }

  return { x, y, w, h };
}

// 获取 clip 的关键属性快照（用于检测是否需要重建 sprite）
function getClipSnapshot(clip: Clip) {
  const mediaClip = clip as MediaClip;
  const textClip = clip as SubtitleClip | TextClip;
  return {
    trimStart: mediaClip.trimStart || 0,
    trimEnd: mediaClip.trimEnd || 0,
    playbackRate: mediaClip.playbackRate || 1,
    sourceUrl: mediaClip.sourceUrl || "",
    text: textClip.text || "",
    volume: (mediaClip as any).volume ?? 1, // 音量变化需要重建 sprite
  };
}

// 检查 clip 的关键属性是否发生变化（需要重建 sprite）
function needsRebuildSprite(clip: Clip): boolean {
  const oldSnapshot = clipSnapshotMap.get(clip.id);
  if (!oldSnapshot) return true; // 没有快照，需要创建

  const newSnapshot = getClipSnapshot(clip);

  // 比较关键属性
  return (
    oldSnapshot.trimStart !== newSnapshot.trimStart ||
    oldSnapshot.trimEnd !== newSnapshot.trimEnd ||
    oldSnapshot.playbackRate !== newSnapshot.playbackRate ||
    oldSnapshot.sourceUrl !== newSnapshot.sourceUrl ||
    oldSnapshot.text !== newSnapshot.text ||
    oldSnapshot.volume !== newSnapshot.volume // 音量变化需要重建
  );
}

// 同步 sprite 属性到 clip
function syncSpriteToClip(clipId: string, sprite: VisibleSprite) {
  const clip = findClipById(clipId);
  if (!clip) return;

  // 防止循环更新
  isUpdatingFromCanvas = true;

  // 更新 clip 的 rect 属性
  tracksStore.updateClip(clipId, {
    rect: {
      x: sprite.rect.x,
      y: sprite.rect.y,
      w: sprite.rect.w,
      h: sprite.rect.h,
      angle: sprite.rect.angle,
      fixedAspectRatio: sprite.rect.fixedAspectRatio,
      fixedScaleCenter: sprite.rect.fixedScaleCenter,
    },
    opacity: sprite.opacity,
    visible: sprite.visible,
    flip: sprite.flip,
    zIndex: sprite.zIndex,
  });

  // console.log(`[Sync] Sprite -> Clip ${clipId}:`, { rect: { x: sprite.rect.x, y: sprite.rect.y, w: sprite.rect.w, h: sprite.rect.h, angle: sprite.rect.angle }, opacity: sprite.opacity, });

  setTimeout(() => {
    isUpdatingFromCanvas = false;
  }, 0);
}

// 为 sprite 设置属性变化监听
function setupSpriteListeners(clipId: string, sprite: VisibleSprite) {
  // 移除旧的监听器
  const oldUnsubscribe = spriteListenerMap.get(clipId);
  if (oldUnsubscribe) {
    oldUnsubscribe();
  }

  // 监听 rect 属性变化
  const unsubscribeRect = sprite.rect.on("propsChange", (changedProps) => {
    if (isUpdatingFromStore) return;
    // console.log(`[Event] Sprite rect changed for clip ${clipId}:`, changedProps);
    syncSpriteToClip(clipId, sprite);
  });

  // 监听 sprite 属性变化（zIndex 等）
  const unsubscribeSprite = sprite.on("propsChange", (changedProps) => {
    if (isUpdatingFromStore) return;
    // console.log(`[Event] Sprite props changed for clip ${clipId}:`, changedProps);
    syncSpriteToClip(clipId, sprite);
  });

  // 合并取消监听函数
  spriteListenerMap.set(clipId, () => {
    unsubscribeRect();
    unsubscribeSprite();
  });
}

// 根据 clip 创建对应的 Sprite
async function createSpriteFromClip(clip: Clip, track: Track): Promise<VisibleSprite | null> {
  try {
    const mediaClip = clip as MediaClip;
    const extClip = clip as ExtendedClip; // 类型转换以访问新属性
    let sprite: VisibleSprite | null = null;
    let originalWidth = 0;
    let originalHeight = 0;

    // 安全边界阈值（秒），避免在边界处 split 导致找不到采样点
    const SPLIT_SAFETY_MARGIN = 0.1;

    if (clip.type === "video" && mediaClip.sourceUrl) {
      // 创建视频 Sprite
      const response = await fetch(mediaClip.sourceUrl);
      if (!response.ok) {
        // console.warn(`Failed to fetch video: ${mediaClip.sourceUrl}`);
        return null;
      }
      // 获取视频音量设置（默认为 1）
      const volume = (mediaClip as any).volume ?? 1;
      let mp4Clip = new MP4Clip(response.body!, { audio: { volume } });
      await mp4Clip.ready;
      originalWidth = mp4Clip.meta.width;
      originalHeight = mp4Clip.meta.height;

      // 处理 trimStart 和 trimEnd
      // trimStart: 视频素材内部的起始时间（秒）
      // trimEnd: 视频素材内部的结束时间（秒）
      const trimStart = mediaClip.trimStart || 0;
      const trimEnd = mediaClip.trimEnd || mp4Clip.meta.duration / 1e6; // 转换为秒
      const playbackRate = mediaClip.playbackRate || 1;
      const originalDuration = mp4Clip.meta.duration / 1e6; // 秒

      // 使用 split 方法处理 trim
      // trimStart: 从视频的第 trimStart 秒开始播放
      // trimEnd: 播放到视频的第 trimEnd 秒
      // 只有当 trimStart > 安全边界 时才需要分割前面的部分
      if (trimStart > SPLIT_SAFETY_MARGIN && trimStart < originalDuration - SPLIT_SAFETY_MARGIN) {
        // console.log(`[Video] Splitting at trimStart=${trimStart}s (${trimStart * 1e6} us)`);
        try {
          const [beforePart, afterPart] = await mp4Clip.split(trimStart * 1e6);
          beforePart.destroy(); // 销毁前面不需要的部分
          mp4Clip = afterPart;
          await mp4Clip.ready;
          // console.log(`[Video] After trimStart split, new duration=${mp4Clip.meta.duration / 1e6}s`);
        } catch (splitError) {
          // console.warn(`[Video] Failed to split at trimStart, using original clip:`, splitError);
        }
      }

      // 计算需要保留的时长（从新 clip 的起始算起）
      const keepDuration = trimEnd - trimStart;
      const currentDuration = mp4Clip.meta.duration / 1e6;
      // 只有当需要裁剪的时长明显小于当前时长时才分割（留出安全边界）
      if (keepDuration > SPLIT_SAFETY_MARGIN && keepDuration < currentDuration - SPLIT_SAFETY_MARGIN) {
        // console.log(`[Video] Splitting to keep duration=${keepDuration}s`);
        try {
          const [keepPart, discardPart] = await mp4Clip.split(keepDuration * 1e6);
          discardPart.destroy(); // 销毁后面不需要的部分
          mp4Clip = keepPart;
          await mp4Clip.ready;
          // console.log(`[Video] After trimEnd split, final duration=${mp4Clip.meta.duration / 1e6}s`);
        } catch (splitError) {
          // console.warn(`[Video] Failed to split at trimEnd, using current clip:`, splitError);
        }
      }

      // 设置滤镜和特效的 tickInterceptor
      const interceptor = createFilteredTickInterceptor(clip);
      if (interceptor) {
        mp4Clip.tickInterceptor = interceptor;
      }

      sprite = new VisibleSprite(mp4Clip);

      // sprite.time.offset: 在时间轴上开始显示的时间（微秒）
      // sprite.time.duration: 在时间轴上的持续时间（微秒）
      sprite.time.offset = clip.startTime * 1e6;
      sprite.time.duration = (clip.endTime - clip.startTime) * 1e6;
      sprite.time.playbackRate = playbackRate;

      // console.log( `[Video] Clip ${clip.id}: trimStart=${trimStart}s, trimEnd=${trimEnd}s, playbackRate=${playbackRate}, effective duration=${mp4Clip.meta.duration / 1e6}s`, );
    } else if (clip.type === "audio" && mediaClip.sourceUrl) {
      // 创建音频 Sprite（音频无可视区域）
      const response = await fetch(mediaClip.sourceUrl);
      if (!response.ok) {
        // console.warn(`Failed to fetch audio: ${mediaClip.sourceUrl}`);
        return null;
      }
      // 获取音量设置（默认为 1）
      const volume = (mediaClip as any).volume ?? 1;
      let audioClip = new AudioClip(response.body!, { volume });
      await audioClip.ready;

      // 处理音频的 trim
      const trimStart = mediaClip.trimStart || 0;
      const trimEnd = mediaClip.trimEnd || audioClip.meta.duration / 1e6;
      const playbackRate = mediaClip.playbackRate || 1;
      const originalDuration = audioClip.meta.duration / 1e6;

      // 使用 split 方法处理 trim（带安全边界检查）
      if (trimStart > SPLIT_SAFETY_MARGIN && trimStart < originalDuration - SPLIT_SAFETY_MARGIN) {
        try {
          const [beforePart, afterPart] = await audioClip.split(trimStart * 1e6);
          beforePart.destroy();
          audioClip = afterPart;
          await audioClip.ready;
        } catch (splitError) {
          // console.warn(`[Audio] Failed to split at trimStart, using original clip:`, splitError);
        }
      }

      const keepDuration = trimEnd - trimStart;
      const currentDuration = audioClip.meta.duration / 1e6;
      if (keepDuration > SPLIT_SAFETY_MARGIN && keepDuration < currentDuration - SPLIT_SAFETY_MARGIN) {
        try {
          const [keepPart, discardPart] = await audioClip.split(keepDuration * 1e6);
          discardPart.destroy();
          audioClip = keepPart;
          await audioClip.ready;
        } catch (splitError) {
          // console.warn(`[Audio] Failed to split at trimEnd, using current clip:`, splitError);
        }
      }

      sprite = new VisibleSprite(audioClip);

      sprite.time.offset = clip.startTime * 1e6;
      sprite.time.duration = (clip.endTime - clip.startTime) * 1e6;
      sprite.time.playbackRate = playbackRate;

      // console.log(`[Audio] Clip ${clip.id}: trimStart=${trimStart}s, trimEnd=${trimEnd}s, effective duration=${audioClip.meta.duration / 1e6}s`);
    } else if (clip.type === "sticker" && mediaClip.sourceUrl) {
      // 创建图片/贴纸 Sprite
      const response = await fetch(mediaClip.sourceUrl);
      if (!response.ok) {
        // console.warn(`Failed to fetch image: ${mediaClip.sourceUrl}`);
        return null;
      }
      const blob = await response.blob();
      const imageBitmap = await createImageBitmap(blob);
      const imgClip = new ImgClip(imageBitmap);
      await imgClip.ready;

      // 设置滤镜和特效的 tickInterceptor
      const interceptor = createFilteredTickInterceptor(clip);
      if (interceptor) {
        imgClip.tickInterceptor = interceptor;
      }

      sprite = new VisibleSprite(imgClip);
      originalWidth = imageBitmap.width;
      originalHeight = imageBitmap.height;

      sprite.time.offset = clip.startTime * 1e6;
      sprite.time.duration = (clip.endTime - clip.startTime) * 1e6;
    } else if ((clip as any).type === "image" && mediaClip.sourceUrl) {
      // 创建图片 Sprite
      const response = await fetch(mediaClip.sourceUrl);
      if (!response.ok) {
        // console.warn(`Failed to fetch image: ${mediaClip.sourceUrl}`);
        return null;
      }
      const blob = await response.blob();
      const imageBitmap = await createImageBitmap(blob);
      const imgClip = new ImgClip(imageBitmap);
      await imgClip.ready;

      // 设置滤镜和特效的 tickInterceptor
      const interceptor = createFilteredTickInterceptor(clip);
      if (interceptor) {
        imgClip.tickInterceptor = interceptor;
      }

      sprite = new VisibleSprite(imgClip);
      originalWidth = imageBitmap.width;
      originalHeight = imageBitmap.height;

      sprite.time.offset = clip.startTime * 1e6;
      sprite.time.duration = (clip.endTime - clip.startTime) * 1e6;

      // console.log(`[Image] Created sprite for clip ${clip.id}: ${originalWidth}x${originalHeight}`);
    } else if (clip.type === "subtitle" || clip.type === "text") {
      // 创建字幕/文本 Sprite
      const textClip = clip as SubtitleClip | TextClip;
      const text = textClip.text || "";
      if (!text) return null;

      // 构建 CSS 样式
      const fontSize = ("fontSize" in textClip ? textClip.fontSize : 48) || 48;
      const fontFamily = ("fontFamily" in textClip ? textClip.fontFamily : "Arial") || "Arial";
      const color = ("color" in textClip ? textClip.color : "white") || "white";
      const backgroundColor = ("backgroundColor" in textClip ? textClip.backgroundColor : "") || "";
      const textAlign = ("textAlign" in textClip ? textClip.textAlign : "center") || "center";

      let cssText = `
        font-size: ${fontSize}px;
        font-family: ${fontFamily};
        color: ${color};
        text-align: ${textAlign};
        white-space: pre-wrap;
        padding: 8px 16px;
      `;
      if (backgroundColor) {
        cssText += `background-color: ${backgroundColor};`;
      }

      try {
        const imgBitmap = await renderTxt2ImgBitmap(text, cssText);
        const imgClip = new ImgClip(imgBitmap);
        await imgClip.ready;
        sprite = new VisibleSprite(imgClip);
        originalWidth = imgBitmap.width;
        originalHeight = imgBitmap.height;

        // 字幕默认位置：底部居中
        if (!extClip.rect || extClip.rect.w <= 0 || extClip.rect.h <= 0) {
          const x = (CANVAS_WIDTH.value - originalWidth) / 2;
          const y = CANVAS_HEIGHT.value - originalHeight - 80; // 距离底部 80px
          sprite.rect.x = x;
          sprite.rect.y = y;
          sprite.rect.w = originalWidth;
          sprite.rect.h = originalHeight;
        }

        sprite.time.offset = clip.startTime * 1e6;
        sprite.time.duration = (clip.endTime - clip.startTime) * 1e6;

        // console.log(`[Subtitle] Created for clip ${clip.id}: "${text.substring(0, 20)}..." at ${sprite.rect.x}, ${sprite.rect.y}`);
      } catch (error) {
        // console.error(`Failed to render text for clip ${clip.id}:`, error);
        return null;
      }
    }

    if (!sprite) return null;

    // 设置 sprite 的空间属性（如果已保存）
    if (extClip.rect && extClip.rect.w > 0 && extClip.rect.h > 0) {
      sprite.rect.x = extClip.rect.x;
      sprite.rect.y = extClip.rect.y;
      sprite.rect.w = extClip.rect.w;
      sprite.rect.h = extClip.rect.h;
      sprite.rect.angle = extClip.rect.angle || 0;
      if (extClip.rect.fixedAspectRatio !== undefined) {
        sprite.rect.fixedAspectRatio = extClip.rect.fixedAspectRatio;
      }
      if (extClip.rect.fixedScaleCenter !== undefined) {
        sprite.rect.fixedScaleCenter = extClip.rect.fixedScaleCenter;
      }
      // console.log(`[Sprite] Using saved rect for clip ${clip.id}:`, extClip.rect);
    } else if (originalWidth > 0 && originalHeight > 0 && clip.type !== "subtitle" && clip.type !== "text") {
      // 非字幕类型：根据原始尺寸计算默认 rect（居中显示）
      const rect = calculateSpriteRect(originalWidth, originalHeight);
      sprite.rect.x = rect.x;
      sprite.rect.y = rect.y;
      sprite.rect.w = rect.w;
      sprite.rect.h = rect.h;
      // console.log( `[Sprite] Created default rect for clip ${clip.id}: original ${originalWidth}x${originalHeight}, display ${rect.w}x${rect.h} at (${rect.x}, ${rect.y})`, );
    }

    // 设置其他属性
    if (extClip.opacity !== undefined) {
      sprite.opacity = extClip.opacity;
    }
    if (extClip.visible !== undefined) {
      sprite.visible = extClip.visible;
    }
    if (extClip.flip) {
      sprite.flip = extClip.flip;
    }

    // 设置 zIndex：优先使用 clip 自身的 zIndex，否则根据轨道顺序计算
    // 轨道 order 越小（越靠上），zIndex 越大（显示在上层）
    // 字幕轨道（subtitle/text）始终显示在所有画面之上
    const isSubtitleTrack = track.type === "subtitle" || track.type === "text";
    if (extClip.zIndex !== undefined) {
      // 如果是字幕且有自定义 zIndex，也要加上字幕基础值
      sprite.zIndex = isSubtitleTrack ? extClip.zIndex + 1000 : extClip.zIndex;
    } else {
      // 根据轨道顺序计算 zIndex
      sprite.zIndex = calculateZIndexFromTrackOrder(track.order, isSubtitleTrack);
    }

    // 记录 clip 和轨道的映射关系
    clipTrackMap.set(clip.id, { trackId: track.id, trackOrder: track.order });

    // console.log(`[Sprite] Set zIndex for clip ${clip.id}: ${sprite.zIndex} (track order: ${track.order})`);

    return sprite;
  } catch (error) {
    // console.error(`Failed to create sprite for clip ${clip.id}:`, error);
    return null;
  }
}

// 同步轨道中的 clips 到 AVCanvas
async function syncClipsToCanvas() {
  if (!avCanvas) return;

  // 如果正在同步，标记需要再次同步
  if (isSyncing) {
    pendingSync = true;
    return;
  }
  isSyncing = true;

  // 首先检测转场关联关系
  detectTransitions();

  // 收集所有需要处理的 clips 及其所属轨道
  const allClipsWithTrack: { clip: Clip; track: Track }[] = [];
  for (const track of tracksStore.tracks) {
    // 跳过隐藏的轨道 - 隐藏轨道中的 clip 不在播放器中显示
    if (track.visible === false) {
      continue;
    }
    for (const clip of track.clips) {
      // 处理视频、音频、图片、贴纸、字幕、文本类型
      if (["video", "audio", "image", "sticker", "subtitle", "text"].includes(clip.type)) {
        allClipsWithTrack.push({ clip, track });
      }
    }
  }

  // 获取当前已有的 clip IDs
  const currentClipIds = new Set(allClipsWithTrack.map((item) => item.clip.id));

  // 移除不再存在的 sprites、监听器和快照
  for (const [clipId, sprite] of clipSpriteMap) {
    if (!currentClipIds.has(clipId)) {
      // 移除监听器
      const unsubscribe = spriteListenerMap.get(clipId);
      if (unsubscribe) {
        unsubscribe();
        spriteListenerMap.delete(clipId);
      }
      avCanvas.removeSprite(sprite);
      clipSpriteMap.delete(clipId);
      clipSnapshotMap.delete(clipId);
      clipTrackMap.delete(clipId);
      // console.log(`Removed sprite for clip: ${clipId}`);
    }
  }

  // 添加新的 sprites 或更新现有的
  for (const { clip, track } of allClipsWithTrack) {
    const extClip = clip as ExtendedClip;
    const existingSprite = clipSpriteMap.get(clip.id);

    // 检查是否需要重建 sprite（关键属性变化）
    const shouldRebuild = existingSprite && needsRebuildSprite(clip);

    if (shouldRebuild && existingSprite) {
      // 需要重建 sprite：移除旧的
      // console.log(`[Rebuild] Clip ${clip.id} needs rebuild due to trim/playback changes`);
      const unsubscribe = spriteListenerMap.get(clip.id);
      if (unsubscribe) {
        unsubscribe();
        spriteListenerMap.delete(clip.id);
      }
      avCanvas.removeSprite(existingSprite);
      clipSpriteMap.delete(clip.id);
      clipSnapshotMap.delete(clip.id);
      clipTrackMap.delete(clip.id);
    }

    const currentSprite = clipSpriteMap.get(clip.id);

    if (currentSprite) {
      // 更新现有 sprite 的时间（来自 store 的更新，设置标志防止循环）
      if (!isUpdatingFromCanvas) {
        isUpdatingFromStore = true;
        currentSprite.time.offset = clip.startTime * 1e6;
        currentSprite.time.duration = (clip.endTime - clip.startTime) * 1e6;

        // 同步其他属性（如果来自 store 更新）
        if (extClip.rect && extClip.rect.w > 0 && extClip.rect.h > 0) {
          currentSprite.rect.x = extClip.rect.x;
          currentSprite.rect.y = extClip.rect.y;
          currentSprite.rect.w = extClip.rect.w;
          currentSprite.rect.h = extClip.rect.h;
          currentSprite.rect.angle = extClip.rect.angle || 0;
        }
        if (extClip.opacity !== undefined) {
          currentSprite.opacity = extClip.opacity;
        }
        if (extClip.visible !== undefined) {
          currentSprite.visible = extClip.visible;
        }
        if (extClip.flip !== undefined) {
          currentSprite.flip = extClip.flip;
        }

        // 更新 zIndex（如果轨道顺序变化）
        const oldTrackInfo = clipTrackMap.get(clip.id);
        if (oldTrackInfo && oldTrackInfo.trackOrder !== track.order) {
          // 轨道顺序变化，更新 zIndex
          const newZIndex = extClip.zIndex !== undefined ? extClip.zIndex : calculateZIndexFromTrackOrder(track.order);
          currentSprite.zIndex = newZIndex;
          clipTrackMap.set(clip.id, { trackId: track.id, trackOrder: track.order });
          // console.log( `[Sprite] Updated zIndex for clip ${clip.id}: ${newZIndex} (track order changed: ${oldTrackInfo.trackOrder} -> ${track.order})`, );
        } else if (extClip.zIndex !== undefined) {
          currentSprite.zIndex = extClip.zIndex;
        }

        setTimeout(() => {
          isUpdatingFromStore = false;
        }, 0);
      }
    } else {
      // 创建新的 sprite（传递 track 参数）
      const sprite = await createSpriteFromClip(clip, track);
      if (sprite) {
        await avCanvas.addSprite(sprite);
        clipSpriteMap.set(clip.id, sprite);
        // 保存 clip 的关键属性快照
        clipSnapshotMap.set(clip.id, getClipSnapshot(clip));
        // 设置属性变化监听
        setupSpriteListeners(clip.id, sprite);
        // console.log(`Added sprite for clip: ${clip.id}`);
      }
    }
  }

  hasSprites.value = clipSpriteMap.size > 0;

  // 更新调试数据
  updateDebugSprites();

  // 更新有效播放时长
  const effectiveDuration = getEffectiveDuration();
  if (effectiveDuration > 0) {
    duration.value = effectiveDuration;
    avCanvasDebugData.duration = effectiveDuration;
  }

  isSyncing = false;

  // 如果有待处理的同步请求，再次同步
  if (pendingSync) {
    pendingSync = false;
    await syncClipsToCanvas();
  }
}

// 初始化 AVCanvas
onMounted(async () => {
  if (canvasContainer.value) {
    try {
      avCanvas = new AVCanvas(canvasContainer.value, {
        bgColor: "#000000",
        width: CANVAS_WIDTH.value,
        height: CANVAS_HEIGHT.value,
      });

      // 监听时间更新事件
      avCanvas.on("timeupdate", (time: number) => {
        currentTime.value = time;
        avCanvasDebugData.currentTime = time;
        // 同步到 playbackStore，设置标志防止循环
        isUpdatingFromCanvas = true;
        playbackStore.seekTo(time / 1e6);
        // 使用 nextTick 或 setTimeout 重置标志
        setTimeout(() => {
          isUpdatingFromCanvas = false;
        }, 0);
      });

      // 监听播放状态事件
      avCanvas.on("playing", () => {
        isPlaying.value = true;
        avCanvasDebugData.isPlaying = true;
        isUpdatingFromCanvas = true;
        playbackStore.play();
        emit("play"); // 发出播放事件
        setTimeout(() => {
          isUpdatingFromCanvas = false;
        }, 0);
      });

      avCanvas.on("paused", () => {
        isPlaying.value = false;
        avCanvasDebugData.isPlaying = false;
        isUpdatingFromCanvas = true;
        playbackStore.pause();
        emit("pause"); // 发出暂停事件
        setTimeout(() => {
          isUpdatingFromCanvas = false;
        }, 0);
      });

      // 监听活动 sprite 变化（用户选择/取消选择 sprite）
      avCanvas.on("activeSpriteChange", (sprite: VisibleSprite | null) => {
        if (sprite) {
          // 查找对应的 clipId
          for (const [clipId, s] of clipSpriteMap) {
            if (s === sprite) {
              // console.log(`[Event] Active sprite changed to clip: ${clipId}`);
              // 同步最新属性到 clip
              syncSpriteToClip(clipId, sprite);
              // 选中对应的轨道 clip
              tracksStore.selectClip(clipId);
              break;
            }
          }
        } else {
          // 取消选中所有 clip
          tracksStore.clearSelection();
        }
      });

      // console.log("AVCanvas initialized successfully");
      avCanvasDebugData.initialized = true;

      // 初始化时同步现有的 clips
      await syncClipsToCanvas();

      // 显示第一帧
      if (clipSpriteMap.size > 0) {
        avCanvas.previewFrame(0);
      }
    } catch (error) {
      // console.error("Failed to initialize AVCanvas:", error);
    }
  }
});

// 监听轨道数据变化
watch(
  () => tracksStore.tracks,
  async () => {
    // 清除帧缓存，确保删除滤镜/特效后画面立即更新
    for (const frame of clipFrameCache.values()) {
      frame.close();
    }
    clipFrameCache.clear();

    await syncClipsToCanvas();
    // 同步后显示当前帧
    if (avCanvas && clipSpriteMap.size > 0 && !isPlaying.value) {
      avCanvas.previewFrame(currentTime.value);
    }
  },
  { deep: true },
);

// 监听 playbackStore 的时间变化（来自轨道编辑器的 seek）
watch(
  () => playbackStore.currentTime,
  (newTime) => {
    // 如果是从 canvas 更新的，跳过
    if (isUpdatingFromCanvas) return;

    const timeInMicroseconds = newTime * 1e6;
    currentTime.value = timeInMicroseconds;

    // 如果没有在播放，预览该帧
    if (avCanvas && !isPlaying.value) {
      isUpdatingFromStore = true;
      avCanvas.previewFrame(timeInMicroseconds);
      setTimeout(() => {
        isUpdatingFromStore = false;
      }, 0);
    }
  },
);

// 监听 playbackStore 的播放状态变化
watch(
  () => playbackStore.isPlaying,
  (newIsPlaying) => {
    // 如果是从 canvas 更新的，跳过
    if (isUpdatingFromCanvas) return;

    if (!avCanvas) return;

    if (newIsPlaying && !isPlaying.value) {
      // 开始播放
      const effectiveDuration = getEffectiveDuration();
      if (effectiveDuration <= 0) {
        // console.warn("[Playback] No valid duration, cannot play");
        return;
      }

      // 如果已到结尾，从头开始
      if (currentTime.value >= effectiveDuration - 1000) {
        currentTime.value = 0;
      }

      isUpdatingFromStore = true;
      avCanvas.play({
        start: currentTime.value,
        end: effectiveDuration,
        playbackRate: playbackSpeed.value,
      });
      isPlaying.value = true;
      setTimeout(() => {
        isUpdatingFromStore = false;
      }, 0);
    } else if (!newIsPlaying && isPlaying.value) {
      // 暂停播放
      isUpdatingFromStore = true;
      avCanvas.pause();
      isPlaying.value = false;
      setTimeout(() => {
        isUpdatingFromStore = false;
      }, 0);
    }
  },
);

// 监听 playbackStore 的 duration 变化
watch(
  () => playbackStore.duration,
  (newDuration) => {
    duration.value = newDuration * 1e6;
    avCanvasDebugData.duration = newDuration * 1e6;
  },
);

// 清理 AVCanvas
onUnmounted(() => {
  // 清理所有监听器
  for (const unsubscribe of spriteListenerMap.values()) {
    unsubscribe();
  }
  spriteListenerMap.clear();
  clipSpriteMap.clear();
  clipSnapshotMap.clear();
  clipTrackMap.clear();

  // 清理转场相关数据
  transitionInfoMap.clear();
  clipTransitionsMap.clear();

  // 清理帧缓存
  for (const frame of clipFrameCache.values()) {
    frame.close();
  }
  clipFrameCache.clear();

  // 清理转场帧缓存
  transitionFrameCache.clear();

  if (avCanvas) {
    avCanvas.destroy();
    avCanvas = null;
  }
});

function handleSeek(event: Event) {
  const target = event.target as HTMLInputElement;
  const timeInSeconds = parseFloat(target.value);
  const timeInMicroseconds = timeInSeconds * 1e6;

  currentTime.value = timeInMicroseconds;
  isUpdatingFromCanvas = true;
  playbackStore.seekTo(timeInSeconds);
  setTimeout(() => {
    isUpdatingFromCanvas = false;
  }, 0);

  if (avCanvas) {
    avCanvas.previewFrame(timeInMicroseconds);
  }
}

// 导出视频
async function exportVideo() {
  if (!avCanvas) {
    throw new Error("AVCanvas 尚未初始化");
  }
  if (clipSpriteMap.size === 0) {
    throw new Error("没有可导出的内容");
  }

  // 导出前暂停播放
  if (isPlaying.value) {
    avCanvas.pause();
    isPlaying.value = false;
    playbackStore.pause();
  }

  const combinator = await avCanvas.createCombinator();
  const chunks: Uint8Array[] = [];
  const reader = combinator.output().getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const blob = new Blob(chunks as BlobPart[], { type: "video/mp4" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `WebAV-export-${Date.now()}.mp4`;
  a.click();
  URL.revokeObjectURL(url);
}

// 暴露 AVCanvas 实例供外部使用
defineExpose({
  avCanvas: computed(() => avCanvas),
  exportVideo,
  addSprite: async (sprite: any) => {
    if (avCanvas) {
      await avCanvas.addSprite(sprite);
      hasSprites.value = true;
    }
  },
  removeSprite: (sprite: any) => {
    if (avCanvas) {
      avCanvas.removeSprite(sprite);
    }
  },
});
</script>

<style lang="scss" scoped>
%flexCenter {
  display: flex;
  align-items: center;
  justify-content: center;
}

.videoPreview {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  overflow: hidden;

  .previewScreen {
    width: 100%;
    flex: 1;
    min-height: 0;
    @extend %flexCenter;
    position: relative;
    overflow: hidden;

    .previewScreenPlaceholder {
      @extend %flexCenter;
      flex-direction: column;
      gap: 12px;
      color: #999;
      position: absolute;
      z-index: 1;

      .placeholderIcon {
        @extend %flexCenter;
      }

      .placeholderText {
        font-size: 14px;
        color: #999;
        font-weight: 500;
      }

      .placeholderTime {
        font-size: 24px;
        color: #000000;
        font-family: "Courier New", monospace;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }
    }

    .previewScreenPlaying {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 2;

      .playingIndicator {
        @extend %flexCenter;
        animation: pulse 1.5s ease-in-out infinite;
      }
    }
  }

  .previewProgress {
    flex-shrink: 0;
    padding: 10px 16px 12px;
    background: rgba(255, 255, 255, 0.95);
    border-top: 1px solid #e8e8e8;

    .progressSlider {
      width: 100%;
      height: 6px;
      -webkit-appearance: none;
      appearance: none;
      background: #e8e8e8;
      border-radius: 3px;
      outline: none;
      cursor: pointer;

      &::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        background: #fff;
        border: 2px solid #000000;
        border-radius: 50%;
        cursor: pointer;
        transition: transform 0.15s;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);

        &:hover {
          transform: scale(1.2);
        }
      }

      &::-moz-range-thumb {
        width: 14px;
        height: 14px;
        background: #fff;
        border: 2px solid #000000;
        border-radius: 50%;
        cursor: pointer;
        transition: transform 0.15s;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);

        &:hover {
          transform: scale(1.2);
        }
      }
    }
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.6;
    transform: scale(1);
  }

  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}
</style>
