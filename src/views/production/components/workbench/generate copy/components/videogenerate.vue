<template>
  <div class="videogenerateWrap">
    <t-card class="imageData">
      <div class="f">
        <template v-if="props.trackList[activeTrackIndex]?.medias?.length > 0">
          <div class="image" v-for="(item, index) in props.trackList[activeTrackIndex].medias" :key="index">
            <t-image :src="item.src" fit="cover" shape="round" :style="{ width: '100px', height: '100px' }" />
            <div class="imagedDel">
              <i-delete theme="outline" size="16" fill="#d0021b" @click="delImage(index)" />
            </div>
            <div class="preview">
              <i-preview-open theme="outline" size="18" fill="#fff" />
            </div>
          </div>
        </template>
      </div>
    </t-card>
    <t-card :title="$t('workbench.generate.generatePrompt')" class="prompt">
      <template #actions>
        <t-button size="small" class="genTextbtn" :loading="activeTrackGenTextLoading" @click="genText">
          {{ $t("workbench.generate.generateText") }}
        </t-button>
      </template>
      <div class="promptInput" @focusout="handlePromptBlur">
        <promptEditor v-model="promptText" :references="references" :placeholder="$t('workbench.generate.promptPlaceholder')" />
      </div>
    </t-card>
    <t-card :title="$t('workbench.generate.generateVideo')" class="video">
      <template #actions>
        <div class="f">
          <modelSelect v-model="props.generateData.selectModel" type="video" size="small" />
          <t-select size="small" class="mode" v-model="props.generateData.selectMode">
            <t-option v-for="(item, index) in modeList" :key="index" :value="item.value" :label="item.label"></t-option>
          </t-select>
          <div class="status" style="margin-left: 5px">
            <t-popup
              trigger="click"
              placement="top"
              overlay-class-name="resDurPickerPopup"
              :overlay-inner-style="{ padding: '16px', borderRadius: '8px' }">
              <t-tag class="btn" variant="outline">{{ props.generateData.selectedResolution }}·{{ effectiveDuration }}s</t-tag>
              <template #content>
                <div class="resolutionDurationPicker">
                  <div
                    v-if="
                      Array.isArray(modeOptions.durationResolutionMap) &&
                      modeOptions.durationResolutionMap.length > 0 &&
                      modeOptions.durationResolutionMap[0].resolution &&
                      modeOptions.durationResolutionMap[0].resolution.length > 0
                    "
                    class="pickerSection">
                    <div class="pickerLabel">{{ $t("workbench.generate.resolution") }}</div>
                    <div class="pickerOptions">
                      <div
                        v-for="res in modeOptions.durationResolutionMap[0].resolution"
                        :key="res"
                        class="pickerOption"
                        :class="{ active: props.generateData.selectedResolution === res }"
                        @click="handleResolutionChange(res)">
                        {{ res }}
                      </div>
                    </div>
                  </div>
                  <div
                    v-if="
                      Array.isArray(modeOptions.durationResolutionMap) &&
                      modeOptions.durationResolutionMap.length > 0 &&
                      modeOptions.durationResolutionMap[0].duration &&
                      modeOptions.durationResolutionMap[0].duration.length > 0
                    "
                    class="pickerSection">
                    <div class="pickerLabel">{{ $t("workbench.generate.duration") }}</div>
                    <div class="pickerOptions">
                      <div
                        v-for="dur in modeOptions.durationResolutionMap[0].duration"
                        :key="dur"
                        class="pickerOption"
                        :class="{ active: effectiveDuration === dur }"
                        @click="handleDurationChange(dur)">
                        {{ dur }}s
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </t-popup>
          </div>
          <t-button size="small" :loading="generating" @click="generateVideo">{{ $t("workbench.generate.generate") }}</t-button>
        </div>
      </template>
      <div class="history">
        <div class="titleBox f ac">
          <i-time />
          <span class="title">{{ $t("workbench.generate.history") }}（{{ activeTrackVideos.length }}）</span>
        </div>
        <div class="historyItemBox">
          <div
            class="historyItem"
            :class="{ active: v.id === selectVideoId, generating: v.state === '生成中', failed: v.state === '生成失败' }"
            v-for="v in activeTrackVideos"
            :key="v.id"
            @click="previewVideo(v)">
            <template v-if="videoCoverMap[v.src]">
              <img :src="videoCoverMap[v.src]" class="videoCover" />
            </template>
            <template v-else-if="v.state !== '生成中'">
              <video
                :key="v.src"
                :src="v.src"
                preload="metadata"
                muted
                @loadedmetadata="
                  (e: Event) => {
                    (e.target as HTMLVideoElement).currentTime = 0.5;
                  }
                "
                @seeked="
                  (e: Event) => {
                    const el = e.target as HTMLVideoElement;
                    captureVideoCover(v.src);
                    el.style.display = 'none';
                  }
                " />
            </template>
            <div v-if="v.state === '生成中'" class="loadingOverlay c fc">
              <t-loading size="24px" />
              <span class="loadingText">{{ $t("workbench.generate.generating") }}</span>
            </div>
            <t-tooltip v-else-if="v.state === '生成失败'" placement="top" :content="v.errorReason!" theme="light">
              <t-tag class="stateTag" theme="danger" size="small">
                {{ $t("workbench.generate.generateFailed") }}
              </t-tag>
            </t-tooltip>
            <div v-if="v.state !== '生成中'" class="selectBtn" @click.stop="selectVideo(v)">
              <i-check size="16" />
            </div>
            <div class="delBtn" @click.stop="handleDeleteVideo(v)">
              <i-delete size="16" />
            </div>
            <div v-if="v.state !== '生成中' && v.state !== '生成失败'" class="download" @click.stop="downloadVideo(v)">
              <i-to-bottom size="16" />
            </div>
          </div>
        </div>
      </div>
    </t-card>
  </div>
</template>

<script setup lang="ts">
import type { Ref } from "vue";
import axios from "@/utils/axios";
import modelSelect from "@/components/modelSelect.vue";
import projectStore from "@/stores/project";
const { project } = storeToRefs(projectStore());
const episodesId = inject<Ref<number>>("episodesId")!;
//视频轨道
interface TrackMediaBase {
  src: string;
  id?: number;
  prompt?: string;
  fileType: "image" | "video" | "audio";
  index?: number;
}
interface TrackMediaStoryboard extends TrackMediaBase {
  sources: "storyboard";
  index?: number;
}

interface TrackMediaAssets extends TrackMediaBase {
  sources: "assets";
}

interface TrackMediaUnknown extends TrackMediaBase {
  sources?: string;
}
interface VideoItem {
  id: number;
  src: string;
  state: "未生成" | "生成中" | "已完成" | "生成失败";
  errorReason?: string | null;
}
type TrackMedia = TrackMediaStoryboard | TrackMediaAssets | TrackMediaUnknown;
interface TrackItem {
  id: number;
  prompt: string;
  state: "未生成" | "生成中" | "已完成" | "生成失败";
  reason?: string;
  selectVideoId?: number | null;
  medias: TrackMedia[];
  videoList: VideoItem[];
  duration: number;
}
interface GenerateData {
  selectModel: string;
  selectMode: string;
  selectedAudio: boolean;
  selectedResolution: string;
  selectedDuration: number;
}
interface HistoryVideoItem {
  errorReason?: string | null;
  src: string;
  id?: number;
  duration?: number | string | null;
  projectId?: number | null;
  scriptId?: number | null;
  state?: string | null;
  time?: number | null;
  videoTrackId?: number | null;
}

//移除参考数据
function delImage(index: number) {
  const track = props.trackList[activeTrackIndex.value];
  if (track) track.medias.splice(index, 1);
}

const props = defineProps({
  trackList: {
    type: Array as () => TrackItem[],
    default: () => [],
  },
  generateData: {
    type: Object as () => GenerateData,
    default: () => ({}),
  },
});
const videoUrl = defineModel<string>("videoUrl", { default: "" });
//模型数据
const modeOptions = ref<Record<string, any>>({});
// 切换模型：获取模型详情并重置分辨率、时长、音频、模式
watch(
  () => props.generateData.selectModel,
  (val) => {
    if (!val) {
      modeOptions.value = {};
      props.generateData.selectMode = "";
      return;
    }
    axios.post("/modelSelect/getModelDetail", { modelId: val }).then(({ data }) => {
      modeOptions.value = data;
      props.generateData.selectedAudio = data.audio === true || data.audio === "true";
      const drMap = data.durationResolutionMap;
      if (Array.isArray(drMap) && drMap.length > 0) {
        if (drMap[0].resolution?.length) props.generateData.selectedResolution = drMap[0].resolution[0];
        if (drMap[0].duration?.length) props.generateData.selectedDuration = drMap[0].duration[0];
      }
    });
  },
);
/** 将时长限制在模型支持的范围内 */
function clampDuration(trackDuration: number): number {
  const drMap = modeOptions.value.durationResolutionMap;
  if (Array.isArray(drMap) && drMap.length > 0 && drMap[0].duration?.length) {
    const durations = drMap[0].duration;
    return Math.max(Math.min(...durations), Math.min(trackDuration, Math.max(...durations)));
  }
  return trackDuration;
}
/** 切换时长（标记为用户手动选择） */
function handleDurationChange(dur: number) {
  props.generateData.selectedDuration = dur;
  userSelectedDuration.value = true;
}
const userSelectedDuration = ref(false); // 用户是否手动选过时长
/** 实际生效时长：用户手动选择优先，否则取轨道时长并 clamp */
const effectiveDuration = computed(() => {
  if (userSelectedDuration.value) return props.generateData.selectedDuration;
  const trackDuration = props.trackList[activeTrackIndex.value]?.duration || props.generateData.selectedDuration;
  return clampDuration(trackDuration);
});
/** 切换分辨率 */
function handleResolutionChange(res: string) {
  props.generateData.selectedResolution = res;
}

/** 当前模型所有可选模式列表（用于下拉选择） */
const modeList = computed(() => {
  const modeLabelMap: Record<string, string> = {
    singleImage: "单图",
    startEndRequired: "首尾帧",
    endFrameOptional: "尾帧可选",
    startFrameOptional: "首帧可选",
    text: "文本生视频",
    videoReference: "视频",
    imageReference: "图片",
    audioReference: "音频",
    textReference: "文本",
  };
  return modeOptions.value.mode
    ? modeOptions.value.mode.map((mode: any) =>
        Array.isArray(mode)
          ? { value: JSON.stringify(mode), label: mode.map((m) => modeLabelMap[m] || m).join(" + ") + "参考" }
          : { value: mode, label: modeLabelMap[mode] || mode },
      )
    : [];
});
//当前选中的组
const activeTrackIndex = defineModel({
  type: Number,
  default: 0,
});
//生成提示词按钮loading
const activeTrackGenTextLoading = ref(false);
/** 当前轨道的提示词文本（双向绑定） */
const promptText = computed({
  get() {
    return props.trackList[activeTrackIndex.value]?.prompt ?? "";
  },
  set(val: string) {
    const track = props.trackList[activeTrackIndex.value];
    if (track) track.prompt = val;
  },
});
//根据传入的图片判断类型
function getFileTypeByExt(src: string | undefined): "image" | "video" | "audio" {
  const ext = src?.split(".").pop()?.toLowerCase() ?? "";
  if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "aac", "flac", "m4a"].includes(ext)) return "audio";
  return "image";
}
const references = computed(() => {
  const medias = props.trackList[activeTrackIndex.value]?.medias ?? [];
  return medias
    .filter((item) => item.src)
    .map((item) => ({
      type: getFileTypeByExt(item.src) as "image" | "video" | "audio" | "text",
      src: item.src ?? "",
    }));
});
//提示词框失焦触发
function handlePromptBlur() {}
//生成提示词
function genText() {}

//生成视频loading
const generatingMap = ref<Record<number, boolean>>({}); // trackId -> 是否正在生成视频
/** 当前轨道是否正在生成视频 */
const generating = computed(() => {
  const trackId = props.trackList[activeTrackIndex.value]?.id;
  return trackId != null ? !!generatingMap.value[trackId] : false;
});
const historyVideo = ref<HistoryVideoItem[]>([]); // 所有轨道的历史视频
/** 当前轨道的历史视频列表 */
const activeTrackVideos = computed(() => {
  const track = props.trackList[activeTrackIndex.value];
  if (!track?.id) return [];
  const fromHistory = historyVideo.value.filter((v) => v.videoTrackId === track.id);
  if (fromHistory.length > 0) return fromHistory;
  return (track.videoList ?? []).map((v) => ({ ...v, videoTrackId: track.id }));
});
// 当前轨道选中的视频 id
const selectVideoId = ref<number | null>(null);
/** 点击历史视频条目进行预览 */
function previewVideo(v: HistoryVideoItem) {
  if (v.state === "生成中" || v.state === "生成失败") return;
  videoUrl.value = v.src;
}
/** 视频封面缓存 src -> dataURL */
const videoCoverMap = ref<Record<string, string>>({});
/** 截取视频封面 */
/** 捕获视频封面（绘制 0.5s 帧到 canvas） */
function captureVideoCover(src: string) {
  if (!src || videoCoverMap.value[src]) return;
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.preload = "auto";
  video.muted = true;
  video.src = src;
  video.addEventListener(
    "seeked",
    () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 160;
        canvas.height = video.videoHeight || 90;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          videoCoverMap.value[src] = canvas.toDataURL("image/jpeg", 0.7);
        }
      } catch {}
      video.src = "";
    },
    { once: true },
  );
  video.addEventListener(
    "loadeddata",
    () => {
      video.currentTime = 0.5;
    },
    { once: true },
  );
  video.addEventListener(
    "error",
    () => {
      video.src = "";
    },
    { once: true },
  );
  video.load();
}
/** 选中某条视频作为当前轨道使用的视频 */
function selectVideo(v: HistoryVideoItem) {
  const track = props.trackList[activeTrackIndex.value];
  if (!track) return;
  selectVideoId.value = v.id ?? null;
  track.selectVideoId = v.id ?? null;
}
/** 删除某条历史视频 */
function handleDeleteVideo(v: HistoryVideoItem) {
  const track = props.trackList[activeTrackIndex.value];
  if (!track) return;
  track.videoList = track.videoList.filter((item) => item.id !== v.id);
  historyVideo.value = historyVideo.value.filter((item) => item.id !== v.id);
  if (selectVideoId.value === v.id) {
    selectVideoId.value = null;
    track.selectVideoId = null;
  }
}
/** 下载单个视频 */
function downloadVideo(v: HistoryVideoItem) {
  if (!v.src) return;
  const a = document.createElement("a");
  a.href = v.src;
  a.download = `video_${v.id ?? Date.now()}.mp4`;
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
//生成视频
function generateVideo() {}
</script>

<style lang="scss" scoped>
.imageData {
  height: 150px;
  .image {
    gap: 10px;
    padding: 5px;
    overflow: auto;
    overflow-y: hidden;
    position: relative;
    &::-webkit-scrollbar {
      height: 6px;
    }
    &::-webkit-scrollbar-thumb {
      background: #696969;
      border-radius: 3px;
    }
    .imagedDel {
      position: absolute;
      right: 10px;
      top: 10px;
      z-index: 1;
      cursor: pointer;
    }
    .preview {
      position: absolute;
      top: 10px;
      left: 10px;
      z-index: 1;
      cursor: pointer;
    }
  }
}
.prompt {
  margin-top: 5px;
  .promptInput {
    border: 1px solid var(--td-component-border);
    border-radius: 8px;
    min-height: 100px;
    height: 100px;
    overflow: auto;
    resize: vertical;
  }
}
.video {
  margin-top: 5px;
  .mode {
    margin-left: 5px;
  }
  .history {
    .titleBox {
      .title {
        font-weight: bold;
      }
      padding-top: 10px;
      padding-bottom: 10px;
    }
    .historyItemBox {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 8px;
      .historyItem {
        width: 100%;
        aspect-ratio: 1/1;
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;
        position: relative;
        border: 2px solid var(--td-component-border);
        background: var(--td-bg-color-secondarycontainer);
        transition:
          border-color 0.2s,
          box-shadow 0.2s;
        &.active {
          border-color: var(--td-brand-color);
          box-shadow: 0 0 0 2px rgba(var(--td-brand-color-rgb, 0, 82, 217), 0.2);
        }
        &.generating {
          border-color: var(--td-brand-color);
          border-style: dashed;
        }
        &.failed {
          border-color: var(--td-error-color);
        }
        &:hover {
          border-color: var(--td-brand-color);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          pointer-events: none;
        }
        .videoCover {
          width: 100%;
          height: 100%;
          object-fit: cover;
          pointer-events: none;
        }
        .loadingOverlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          color: #fff;
          gap: 6px;
          .loadingText {
            font-size: 10px;
          }
        }
        .selectBtn {
          position: absolute;
          bottom: 4px;
          right: 4px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.5);
          color: #fff;
          display: none;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
          &:hover {
            background: var(--td-brand-color);
          }
        }
        &:hover .selectBtn {
          display: flex;
        }
        &.active .selectBtn {
          display: flex;
          background: var(--td-brand-color);
        }
        .delBtn {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.5);
          color: #fff;
          display: none;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }
        &:hover .delBtn {
          display: flex;
        }
        .stateTag {
          position: absolute;
          bottom: 4px;
          left: 4px;
        }
        .download {
          position: absolute;
          top: 4px;
          left: 4px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.5);
          color: #fff;
          display: none;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }
        &:hover .download {
          display: flex;
        }
      }
    }
  }
}
</style>
<style lang="scss">
.resolutionDurationPicker {
  min-width: 240px;
  .pickerSection {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }

    .pickerLabel {
      font-size: 13px;
      font-weight: 600;
      color: var(--td-text-color-primary);
      margin-bottom: 10px;
    }

    .pickerOptions {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;

      .pickerOption {
        padding: 6px 0;
        border-radius: 8px;
        border: 1.5px solid var(--td-border-level-1-color);
        font-size: 13px;
        color: var(--td-text-color-primary);
        cursor: pointer;
        transition: all 0.15s;
        user-select: none;
        text-align: center;
        background: var(--td-bg-color-container);

        &:hover {
          border-color: var(--td-border-level-2-color);
        }

        &.active {
          border-color: var(--td-text-color-primary);
          color: var(--td-text-color-primary);
          font-weight: 500;
        }
      }
    }
  }
}
</style>
