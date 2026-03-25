<template>
  <div class="editVideo">
    <splitpanes class="default-theme content" horizontal :push-other-panes="false">
      <pane size="60">
        <splitpanes :push-other-panes="false">
          <pane size="20" min-size="10">
            <mediaLibrary
              :initial-media-items="initialMediaItems"
              :initial-audio-items="initialAudioItems"
              :initial-image-items="initialImageItems" />
          </pane>
          <pane size="60" min-size="20">
            <div ref="previewWrapperRef" class="previewWrapper">
              <videoPreview ref="videoPreviewRef" :canvas-width="canvasWidth" :canvas-height="canvasHeight" :style="previewStyle" />
            </div>
          </pane>
          <pane size="20" min-size="10">
            <propertyPanel />
          </pane>
        </splitpanes>
      </pane>
      <pane size="40" class="pr">
        <VideoTrack
          :theme="theme"
          class="videoTrack"
          ref="videoTrackRef"
          :operation-buttons="operationButtons"
          :scale-config-buttons="scaleConfigButtons"
          :track-types="trackTypes"
          :clip-configs="clipConfigs"
          :enable-main-track-mode="true"
          :enable-cross-track-drag="true"
          :enable-snap="true"
          :default-scale="1"
          @add-transition="handleAddTransitionFromClick"
          @drop-media="handleDropMedia"
          @transition-added="onTransitionAdded">
          <!-- 自定义操作按钮 -->
          <template #custom-operation-reset>
            <t-button variant="text" size="small" @click="videoTrackRef?.reset()" :title="$t('workbench.production.editVideo.reset')">
              <template #icon><i-refresh size="16" /></template>
              {{ $t('workbench.production.editVideo.reset') }}
            </t-button>
          </template>

          <template #custom-operation-undo>
            <t-button variant="text" size="small" :disabled="!historyStore.canUndo" @click="historyStore.undo()" :title="$t('workbench.production.editVideo.undo')">
              <template #icon><i-undo size="16" /></template>
              {{ $t('workbench.production.editVideo.undo') }}
            </t-button>
          </template>

          <template #custom-operation-redo>
            <t-button variant="text" size="small" :disabled="!historyStore.canRedo" @click="historyStore.redo()" :title="$t('workbench.production.editVideo.redo')">
              <template #icon><i-redo size="16" /></template>
              {{ $t('workbench.production.editVideo.redo') }}
            </t-button>
          </template>

          <template #custom-operation-split>
            <t-button variant="text" size="small" :disabled="tracksStore.selectedClipIds.size === 0" @click="handleSplit" :title="$t('workbench.production.editVideo.split')">
              <template #icon><i-cutting-one size="16" /></template>
              {{ $t('workbench.production.editVideo.split') }}
            </t-button>
          </template>

          <template #custom-operation-delete>
            <t-button variant="text" size="small" @click="handleDeleteClips" :title="$t('workbench.production.editVideo.delete')">
              <template #icon><i-delete size="16" /></template>
              {{ $t('workbench.production.editVideo.delete') }}
            </t-button>
          </template>
          <!-- <template #custom-operation-import>
            <t-button variant="text" size="small" @click="handleImport" title="导入项目">
              <template #icon><i-folder-open size="16" /></template>
              导入
            </t-button>
          </template> -->
          <template #scale-append>
            <t-button theme="danger" @click="handleExport" :loading="isExporting" :title="$t('workbench.production.editVideo.exportProject')">
              <template #icon><i-export size="16" style="margin-right: 4px" /></template>
              {{ isExporting ? $t('workbench.production.editVideo.rendering') : $t('workbench.production.editVideo.exportVideo') }}
            </t-button>
          </template>
        </VideoTrack>
      </pane>
    </splitpanes>
  </div>
</template>

<script setup lang="ts">
import mediaLibrary from "./mediaLibrary.vue";
import videoPreview from "./videoPreview.vue";
import propertyPanel from "./propertyPanel.vue";
import { Splitpanes, Pane } from "splitpanes";
import "splitpanes/dist/splitpanes.css";
import "vue-clip-track/style.css";
import {
  VideoTrack,
  useTracksStore,
  usePlaybackStore,
  useHistoryStore,
  generateId,
  normalizeTime,
  type OperationButton,
  type ScaleConfigButton,
  type TrackTypeConfig,
  type Track,
  type Clip,
  type MediaClip,
} from "vue-clip-track";

import type { MediaItem, AudioItem } from "./utils/mediaData";
import { getDefaultDuration, findOrCreateTrackWithSpace } from "./utils/trackHelper";
import { loadVideoClipThumbnails, loadAudioClipWaveform, loadInitialAudioWaveforms } from "./utils/mediaLoader";
import { findAdjacentClipsAtTime, addTransitionBetweenClips } from "./utils/transitionHelper";

const props = withDefaults(
  defineProps<{
    initialTracks?: Track[];
    initialMediaItems?: MediaItem[];
    initialAudioItems?: AudioItem[];
    initialImageItems?: MediaItem[];
    canvasWidth?: number;
    canvasHeight?: number;
  }>(),
  {
    initialTracks: () => [],
    initialMediaItems: () => [],
    initialAudioItems: () => [],
    initialImageItems: () => [],
    canvasWidth: 1920,
    canvasHeight: 1080,
  },
);

const aspectRatio = computed(() => props.canvasWidth / props.canvasHeight);

// 预览区域自适应尺寸
const previewWrapperRef = ref<HTMLElement>();
const wrapperSize = reactive({ width: 0, height: 0 });
let resizeObserver: ResizeObserver | null = null;

const previewStyle = computed(() => {
  const { width: cw, height: ch } = wrapperSize;
  if (cw <= 0 || ch <= 0) return {};
  const ratio = aspectRatio.value;
  if (cw / ch > ratio) {
    return { height: ch + "px", width: Math.floor(ch * ratio) + "px" };
  }
  return { width: cw + "px", height: Math.floor(cw / ratio) + "px" };
});

const tracksStore = useTracksStore();
const playbackStore = usePlaybackStore();
const historyStore = useHistoryStore();

const operationButtons = ref<OperationButton[]>([
  { type: "custom", key: "reset" },
  { type: "custom", key: "undo" },
  { type: "custom", key: "redo" },
  { type: "custom", key: "split" },
  { type: "custom", key: "delete" },
  { type: "custom", key: "import" },
]);

const scaleConfigButtons = ref<ScaleConfigButton[]>(["snap"]);

const trackTypes = ref<TrackTypeConfig>({
  video: { max: 5 },
  image: { max: 3 },
  audio: { max: 3 },
  subtitle: { max: 2 },
  text: { max: 2 },
  sticker: { max: 2 },
  filter: { max: 1 },
  effect: { max: 2 },
});

const clipConfigs = ref({
  video: {
    backgroundColor: "linear-gradient(45deg, #667eea 0%, #764ba2 100%)",
    borderColor: "#000000",
    height: 60,
    selected: {
      borderColor: "#ff6b6b",
      boxShadow: "0 0 0 3px rgba(255, 107, 107, 0.3)",
    },
  },
  audio: {
    backgroundColor: "linear-gradient(45deg, #f093fb 0%, #f5576c 100%)",
    height: 36,
    selected: {
      borderColor: "#4ecdc4",
    },
  },
  image: {
    backgroundColor: "linear-gradient(45deg, #43e97b 0%, #38f9d7 100%)",
    borderColor: "#43e97b",
    height: 60,
    selected: {
      borderColor: "#ff6b6b",
      boxShadow: "0 0 0 3px rgba(255, 107, 107, 0.3)",
    },
  },
});

const videoTrackRef = ref();
const videoPreviewRef = ref<InstanceType<typeof videoPreview>>();
const isExporting = ref(false);

async function handleExport() {
  if (!videoPreviewRef.value) return;
  if (isExporting.value) return;
  isExporting.value = true;
  try {
    await videoPreviewRef.value.exportVideo();
    window.$message.success($t('workbench.production.editVideo.exportSuccess'));
  } catch (error: any) {
    if (error.name === "AbortError") return; // 用户取消保存
    window.$message.error(error.message || $t('workbench.production.editVideo.exportFailed'));
  } finally {
    isExporting.value = false;
  }
}

function handleSplit() {
  const selectedIds = Array.from(tracksStore.selectedClipIds);
  if (selectedIds.length === 0) return;
  const currentTime = playbackStore.currentTime;
  selectedIds.forEach((id) => {
    const clip = tracksStore.getClip(id);
    if (!clip || currentTime <= clip.startTime || currentTime >= clip.endTime) return;
    tracksStore.splitClip(id, currentTime);
  });
  historyStore.pushSnapshot($t('workbench.production.editVideo.splitClip'));
}

function handleDeleteClips() {
  const selectedIds = Array.from(tracksStore.selectedClipIds);
  if (selectedIds.length === 0) return;
  tracksStore.removeClips(selectedIds);
  historyStore.pushSnapshot($t('workbench.production.editVideo.deleteClip'));
}

// 处理从资源库拖拽媒体到轨道
async function handleDropMedia(mediaData: any, trackId: string, startTime: number) {
  try {
    if (mediaData.type === "transition") {
      handleDropTransition(mediaData, trackId, startTime);
      return;
    }

    const duration = getDefaultDuration(mediaData.type, mediaData);
    const { track } = findOrCreateTrackWithSpace(tracksStore, mediaData.type, startTime, duration, trackId);
    if (!track) return;

    let clip: Partial<Clip> = {
      id: generateId("clip-"),
      trackId: track.id,
      startTime: normalizeTime(startTime),
      selected: false,
    };

    if (mediaData.type === "video") {
      const sourceUrl = mediaData.sourceUrl || mediaData.url || mediaData.id;
      clip = {
        ...clip,
        type: "video",
        name: mediaData.name,
        endTime: normalizeTime(startTime + duration),
        sourceUrl,
        originalDuration: duration,
        trimStart: 0,
        trimEnd: duration,
        playbackRate: 1,
        thumbnails: mediaData.thumbnails || [],
      } as Partial<MediaClip>;

      tracksStore.addClip(track.id, clip as Clip);
      historyStore.pushSnapshot($t('workbench.production.editVideo.addClip', { name: mediaData.name }));

      if (!mediaData.thumbnails || mediaData.thumbnails.length === 0) {
        loadVideoClipThumbnails(tracksStore, clip.id!, sourceUrl);
      }
      return;
    } else if (mediaData.type === "image") {
      const sourceUrl = mediaData.sourceUrl || mediaData.url || mediaData.id;
      clip = {
        ...clip,
        type: "image" as any,
        name: mediaData.name,
        endTime: normalizeTime(startTime + duration),
        sourceUrl,
        originalDuration: duration,
        trimStart: 0,
        trimEnd: duration,
        playbackRate: 1,
        thumbnails: mediaData.thumbnail ? [mediaData.thumbnail] : [],
      };

      tracksStore.addClip(track.id, clip as Clip);
      historyStore.pushSnapshot($t('workbench.production.editVideo.addClip', { name: mediaData.name }));
      return;
    } else if (mediaData.type === "audio") {
      const sourceUrl = mediaData.sourceUrl || mediaData.url || mediaData.id;
      clip = {
        ...clip,
        type: "audio",
        name: mediaData.name,
        endTime: normalizeTime(startTime + duration),
        sourceUrl,
        originalDuration: duration,
        trimStart: 0,
        trimEnd: duration,
        playbackRate: 1,
        volume: 1,
        waveformData: mediaData.waveformData || [],
      } as Partial<MediaClip>;

      tracksStore.addClip(track.id, clip as Clip);
      historyStore.pushSnapshot($t('workbench.production.editVideo.addClip', { name: mediaData.name }));

      if (!mediaData.waveformData || mediaData.waveformData.length === 0) {
        loadAudioClipWaveform(tracksStore, clip.id!, sourceUrl);
      }
      return;
    } else if (mediaData.type === "subtitle") {
      clip = { ...clip, type: "subtitle", name: mediaData.name, endTime: normalizeTime(startTime + duration), text: $t('workbench.production.editVideo.sampleSubtitle') };
    } else if (mediaData.type === "text") {
      clip = { ...clip, type: "text", name: mediaData.name, endTime: normalizeTime(startTime + duration), text: $t('workbench.production.editVideo.customText') };
    } else if (mediaData.type === "sticker") {
      clip = { ...clip, type: "sticker", name: mediaData.name, endTime: normalizeTime(startTime + duration), sourceUrl: mediaData.id };
    } else if (mediaData.type === "filter") {
      clip = {
        ...clip,
        type: "filter",
        name: mediaData.name,
        endTime: normalizeTime(startTime + duration),
        filterType: mediaData.filterType || mediaData.id,
        filterValue: mediaData.filterValue ?? 1,
      };
    } else if (mediaData.type === "effect") {
      clip = {
        ...clip,
        type: "effect",
        name: mediaData.name,
        endTime: normalizeTime(startTime + duration),
        effectType: mediaData.effectType || mediaData.id,
        effectDuration: duration,
      };
    }

    tracksStore.addClip(track.id, clip as Clip);
    historyStore.pushSnapshot($t('workbench.production.editVideo.addClip', { name: mediaData.name }));
  } catch (error: any) {
    alert(error.message);
  }
}

// 处理转场拖拽
function handleDropTransition(transitionData: any, trackId: string, dropTime: number) {
  const track = tracksStore.tracks.find((t) => t.id === trackId);
  if (!track) return;

  const clips = track.clips.filter((c) => c.type !== "transition").sort((a, b) => a.startTime - b.startTime);
  if (clips.length === 0) {
    window.$message.warning($t('workbench.production.editVideo.transitionBetweenClips'));
    return;
  }

  const result = findAdjacentClipsAtTime(clips, dropTime);
  if (!result) {
    window.$message.warning($t('workbench.production.editVideo.transitionBetweenClips'));
    return;
  }

  applyTransition(result.beforeClip.id, result.afterClip.id, transitionData.subType);
}

function handleAddTransitionFromClick(beforeClipId: string, afterClipId: string) {
  applyTransition(beforeClipId, afterClipId, "fade");
}

// 添加转场并触发后续事件
function applyTransition(beforeClipId: string, afterClipId: string, transitionType: string = "fade") {
  const result = addTransitionBetweenClips(tracksStore, historyStore, beforeClipId, afterClipId, transitionType);
  if (result) {
    if (videoTrackRef.value) {
      videoTrackRef.value.emitTransitionAdded(result.transitionClip, result.beforeClip.id, result.afterClip.id);
    }
  }
}

function onTransitionAdded(transitionClip: any, beforeClipId: string, afterClipId: string) {
  window.$message.success($t('workbench.production.editVideo.transitionAdded', { name: transitionClip.name }));
  playbackStore.seekTo(transitionClip.startTime);
}

// 初始化轨道数据
function initializeTracks() {
  tracksStore.reset();

  if (props.initialTracks.length > 0) {
    props.initialTracks.forEach((track) => {
      tracksStore.addTrack(track);
    });
  }

  playbackStore.setDuration(30);
  playbackStore.seekTo(0);
  historyStore.initialize();
  loadInitialAudioWaveforms(tracksStore);
}

onMounted(() => {
  initializeTracks();

  if (previewWrapperRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        wrapperSize.width = entry.contentRect.width;
        wrapperSize.height = entry.contentRect.height;
      }
    });
    resizeObserver.observe(previewWrapperRef.value);
  }
});

const theme = {
  primaryColor: "#000",
  backgroundColor: "#ecedef",
  textColor: "#ffffff",
  borderColor: "#ecedef",
};

onUnmounted(() => {
  resizeObserver?.disconnect();
});
</script>

<style lang="scss" scoped>
.editVideo {
  .content {
    height: calc(100vh - var(--td-comp-paddingTB-xl) * 2 - 50px - 1rem);
  }

  .previewWrapper {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: #f5f5f5;
    border: 1px solid #e8e8e8;
    border-radius: 10px;
  }
  .videoTrack {
    height: 100%;
    border: 1px solid #e8e8e8;
    border-radius: 10px;
  }
}
:deep(.ruler__cursor-handle) {
  &:hover {
    filter: none !important;
  }
}
:deep(.splitpanes__pane) {
  background-color: transparent !important;
}
:deep(.splitpanes__splitter) {
  border: none !important;
  margin: 0px !important;
}
:deep(.tools-bar__select) {
  display: none !important;
}
</style>
