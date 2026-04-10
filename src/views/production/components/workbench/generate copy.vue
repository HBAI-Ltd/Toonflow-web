<template>
  <div class="generateContainer">
    <div class="data f">
      <div class="videoToImage">
        <video v-if="videoUrl" :src="videoUrl" class="previewVideo" controls preload="metadata" />
        <div v-else class="emptyVideo c">{{ $t("workbench.generate.noVideo") }}</div>
      </div>
      <div class="configurationParameters" :class="{ hasActive: trackList.length > 0 }">
        <div class="promptsMenu f ac jb">
          <div class="title">
            <t-tag theme="primary" size="small" style="margin-right: 10px">#{{ activeTrackIndex + 1 }}</t-tag>
            {{ $t("workbench.generate.prompt") }}
          </div>
          <t-button size="small" class="genTextbtn" :loading="activeTrackGenTextLoading" @click="genText">
            {{ $t("workbench.generate.generateText") }}
          </t-button>
        </div>
        <div class="genVideoParams" style="text-align: right">
          <t-tag
            theme="primary"
            closable
            v-for="(item, index) in genVideoParams"
            :key="index"
            style="margin: 5px"
            @close="removeGenVideoParam(index)">
            #{{ item.sources == "storyboard" ? $t("workbench.generate.storyboard") : $t("workbench.generate.assets") }}{{ index + 1 }}
          </t-tag>
        </div>
        <div class="promptInput" @focusout="handlePromptBlur">
          <promptEditor v-model="promptText" :references="references" :placeholder="$t('workbench.generate.promptPlaceholder')" />
        </div>
        <div class="modeOpt f w">
          <template v-if="isMixedMode">
            <div class="uploadBtn c fc" v-for="(item, index) in uploadBox" :key="index" v-show="item.src">
              <template v-if="item.src">
                <img v-if="item.fileType === 'image'" :src="item.src" class="uploadPreview" />
                <div v-else class="uploadPreview c">
                  <i-volume-notice v-if="item.fileType === 'audio'" size="24" />
                  <i-video v-else size="24" />
                </div>
                <div class="clearBtn" @click.stop="clearUpload(index)">
                  <i-close size="12" />
                </div>
                <div class="source">
                  <t-tag size="small">
                    {{ item.sources == "storyboard" ? $t("workbench.generate.storyboard") : $t("workbench.generate.assets") }}
                  </t-tag>
                </div>
              </template>
            </div>
            <div class="uploadBtn c fc" @click="handleMixedAdd">
              <i-plus size="24"></i-plus>
              {{ $t("workbench.generate.addReference") }}
            </div>
          </template>
          <template v-else>
            <div class="uploadBtn c fc" v-for="(item, index) in uploadBox" :key="index" @click="handleSelectSource(index)">
              <template v-if="item.src">
                <img :src="item.src" class="uploadPreview" />
                <div class="clearBtn" @click.stop="clearUpload(index)">
                  <i-close size="12" />
                </div>
                <div class="source">
                  <t-tag size="small">
                    {{ item.sources == "storyboard" ? $t("workbench.generate.storyboard") : $t("workbench.generate.assets") }}
                  </t-tag>
                </div>
              </template>
              <template v-else>
                <i-plus size="24"></i-plus>
                {{ item.label }}
              </template>
            </div>
          </template>
        </div>
        <!-- 分镜选择弹窗 -->
        <t-dialog
          v-model:visible="storyboardDialogVisible"
          :header="$t('workbench.generate.selectStoryboard')"
          :footer="false"
          width="800px"
          placement="center">
          <div class="storyboardGrid">
            <div class="storyboardItem" v-for="sb in storyboardList" :key="sb.id" @click="pickStoryboard(sb)">
              <img :src="sb.src" />
            </div>
          </div>
        </t-dialog>
        <div class="modeMenu f ac jb">
          <div class="left f ac">
            <div class="model">
              <modelSelect v-model="selectModel" type="video" size="small" />
            </div>
            <t-select size="small" class="mode" v-model="selectMode">
              <t-option v-for="(item, index) in modeList" :key="index" :value="item.value" :label="item.label"></t-option>
            </t-select>
            <t-button
              size="small"
              variant="outline"
              :theme="selectedAudio ? 'success' : 'danger'"
              class="audio"
              @click="selectedAudio = !selectedAudio">
              <template #icon>
                <i-volume-notice v-if="selectedAudio" size="16" />
                <i-volume-mute v-else size="16" />
              </template>
            </t-button>
            <div class="status">
              <t-popup
                trigger="click"
                placement="top"
                overlay-class-name="resDurPickerPopup"
                :overlay-inner-style="{ padding: '16px', borderRadius: '8px' }">
                <t-tag class="btn" variant="outline">{{ selectedResolution }}·{{ effectiveDuration }}s</t-tag>
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
                          :class="{ active: selectedResolution === res }"
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
          </div>
          <div class="genBtn">
            <t-button size="small" :loading="generating" @click="generateVideo">{{ $t("workbench.generate.generate") }}</t-button>
          </div>
        </div>
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
      </div>
    </div>
    <div class="videoTrack">
      <div class="trackMenu f ac jb">
        <div class="left f ac">
          <t-checkbox v-model="checkAll" @change="handleCheckAll">{{ $t("workbench.generate.selectAll") }}</t-checkbox>
          <span class="selectedCount" v-if="checkedTrackIds.length">{{ $t("workbench.generate.selected") }} {{ checkedTrackIds.length }} 段</span>
        </div>
        <div class="right f ac">
          <t-button size="small" variant="outline" @click="batchDownloadVideo">{{ $t("workbench.generate.batchDownloadVideo") }}</t-button>
          <t-button size="small" variant="outline" @click="batchGenText">{{ $t("workbench.generate.batchGenerateText") }}</t-button>
          <t-button size="small" variant="outline" @click="batchGenVideo">{{ $t("workbench.generate.batchGenerateVideo") }}</t-button>
          <!-- <t-button size="small" variant="outline" @click="importVideo">{{ $t("workbench.generate.importVideo") }}</t-button> -->
        </div>
      </div>
      <div class="itemBox">
        <div
          class="item"
          :class="{ active: index === activeTrackIndex }"
          v-for="(track, index) in trackList"
          :key="index"
          @click="changeTrackFn(index)">
          <t-checkbox
            class="trackCheck"
            :checked="track.id != null && checkedTrackIds.includes(track.id)"
            @click.stop
            @change="(val: boolean) => toggleCheck(track.id, val)" />
          <t-tag class="indexTag" size="small">#{{ index + 1 }}</t-tag>
          <t-tag class="selectTag" theme="success" size="small" v-if="track.selectVideoId">已选择</t-tag>
          <div class="thumbGroup" v-if="track.medias.some((m) => m.src)">
            <template v-for="(m, i) in track.medias" :key="i">
              <template v-if="m.src">
                <img v-if="m.fileType === 'image'" :src="m.src" class="thumb" />
                <div v-else class="thumb placeholder c">
                  <i-volume-notice v-if="m.fileType === 'audio'" size="20" />
                  <i-video v-else size="24" />
                </div>
              </template>
            </template>
          </div>
          <span v-else class="emptyTrack">{{ $t("workbench.generate.emptyTrack", index) }}</span>
          <div class="deleteBtn" @click.stop="confirmDeleteTrack(index)">
            <i-close size="14" />
          </div>
        </div>
        <div class="item addItem c" @click="addTrack">
          <i-plus size="36"></i-plus>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Ref } from "vue";
import promptEditor from "@/components/promptEditor.vue";
import assetsCheck, { type AssetType, type ClipMediaType } from "@/utils/assetsCheck";
import { DialogPlugin } from "tdesign-vue-next";
import axios from "@/utils/axios";
import projectStore from "@/stores/project";
import JSZip from "jszip";
// ========================
// 基础数据与初始化模块
// ========================
// 剧本ID
const episodesId = inject<Ref<number>>("episodesId")!;
// 项目信息
const { project } = storeToRefs(projectStore());
// 当前显示的视频URL
const videoUrl = ref("");
// 用户是否手动选择过时长，手动选择后不再被 track.duration 覆盖
const userSelectedDuration = ref(false);
// 初始化数据
onMounted(() => {
  selectModel.value = project.value?.videoModel || "";
  selectMode.value = project.value?.mode || "";
  getGenerateData();
});
// ========================
// 主数据与分组管理模块
// ========================
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
const trackList = ref<TrackItem[]>([]);
// 查询分组主数据
async function getGenerateData() {
  const { data } = await axios.post("/production/workbench/getGenerateData", {
    projectId: project.value?.id,
    scriptId: episodesId.value ?? 0,
  });
  trackList.value = data.trackList;
  // 保留用户本地已手动选择但后端可能还未持久化的映射
  const prevMap = { ...trackSelectedVideoMap.value };
  trackSelectedVideoMap.value = {};
  for (const track of trackList.value) {
    if (track.id != null) {
      if (track.selectVideoId != null) {
        trackSelectedVideoMap.value[track.id] = track.selectVideoId;
      } else if (prevMap[track.id] != null) {
        // 后端尚未返回最新选中状态，保留本地选择
        trackSelectedVideoMap.value[track.id] = prevMap[track.id];
      }
    }
  }
  storyboardList.value = data.storyboardList;
  syncMediasToUploadBox();
  // 同步 genVideoParams：优先用缓存，否则从 track.medias 初始化
  const activeTrack = trackList.value[activeTrackIndex.value];
  if (activeTrack?.id != null && genVideoParamsMap.value[activeTrack.id] != null) {
    genVideoParams.value = [...genVideoParamsMap.value[activeTrack.id]];
  } else if (genVideoParams.value.length === 0 && activeTrack) {
    genVideoParams.value = activeTrack.medias.map((m) => ({ id: m.id, sources: m.sources }));
  }
  getVideoList();
}
// ========================
// 提示词与上传资源管理模块
// ========================
// 视频提示词
const promptText = computed({
  get() {
    const track = trackList.value[activeTrackIndex.value];
    return track?.prompt ?? "";
  },
  set(val: string) {
    const track = trackList.value[activeTrackIndex.value];
    if (track) track.prompt = val;
  },
});
// 上传的数据图片/音视频信息
interface UploadItem {
  fileType: "image" | "video" | "audio";
  type: Type;
  sources: "assets" | "storyboard";
  id?: number;
  src?: string;
  label?: string;
  prompt?: string;
}
const uploadBox = ref<UploadItem[]>([]);

// ========================
// 分辨率、时长与模型配置模块
// ========================
const selectedResolution = ref("480p");
const selectedDuration = ref(8);
const selectModel = ref<string>(); // 项目模型
// 监听模型变化，自动获取模型详情并重置分辨率和时长
watch(selectModel, (val) => {
  if (!val) {
    modeOptions.value = {} as VideoModel;
    selectMode.value = undefined;
    return;
  }
  axios.post("/modelSelect/getModelDetail", { modelId: val }).then(({ data }) => {
    modeOptions.value = data;
    // 重置模式默认第一个
    if (Array.isArray(data?.mode[0])) {
      selectMode.value = JSON.stringify(data?.mode[0]);
    } else {
      selectMode.value = data?.mode[0];
    }
    selectedAudio.value = data.audio;
    // 重置分辨率和时长为第一个可选项
    const drMap = data.durationResolutionMap;
    if (Array.isArray(drMap) && drMap.length > 0) {
      if (drMap[0].resolution?.length) {
        selectedResolution.value = drMap[0].resolution[0];
      }
      if (drMap[0].duration?.length) {
        selectedDuration.value = drMap[0].duration[0];
      }
    }
    // 切换模型时重置手动选择标记
    userSelectedDuration.value = false;
  });
});

// 仅批量生成视频，如果单个生成视频切换模型需要选择时长
function clampDuration(trackDuration: number): number {
  const drMap = modeOptions.value.durationResolutionMap;
  if (Array.isArray(drMap) && drMap.length > 0 && drMap[0].duration?.length) {
    const durations = drMap[0].duration;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    return Math.max(minDuration, Math.min(trackDuration, maxDuration));
  }
  return trackDuration;
}

// 时长选择
const effectiveDuration = computed(() => {
  // 用户手动选择过时长，直接用 selectedDuration
  if (userSelectedDuration.value) return selectedDuration.value;
  // 否则用 track 的 duration（约束到模型支持范围）
  const trackDuration = trackList.value[activeTrackIndex.value]?.duration || selectedDuration.value;
  return clampDuration(trackDuration);
});
// 是否启用声音
const selectedAudio = ref(false);

// ========================
// 生成状态与加载状态模块
// ========================
const generatingMap = ref<Record<number, boolean>>({});
const generating = computed(() => {
  const trackId = trackList.value[activeTrackIndex.value]?.id;
  return trackId != null ? !!generatingMap.value[trackId] : false;
});
const genTextLoadingMap = ref<Record<number, boolean>>({});
const activeTrackGenTextLoading = computed(() => {
  const trackId = trackList.value[activeTrackIndex.value]?.id;
  return trackId != null ? !!genTextLoadingMap.value[trackId] : false;
});

// ========================
// 提示词与时长变更同步模块
// ========================
function handlePromptBlur() {
  const trackId = trackList.value[activeTrackIndex.value]?.id;
  if (trackId == null) return;
  const content = promptText.value;
  axios.post("/production/workbench/updateVideoPrompt", { id: trackId, prompt: content });
}
// 监听时长变化，自动同步到后端
watch(
  () => selectedDuration.value,
  (newVal, oldVal) => {
    if (newVal !== oldVal) {
      const trackId = trackList.value[activeTrackIndex.value]?.id;
      if (trackId == null) return;
      axios.post("/production/workbench/updateVideoPrompt", { id: trackId, duration: newVal });
      getGenerateData();
    }
  },
);

// ========================
// 视频历史与封面管理模块
// ========================
interface VideoItem {
  id: number;
  src: string;
  state: "未生成" | "生成中" | "已完成" | "生成失败";
  errorReason?: string | null;
}
const selectVideoId = ref<number | null>(null);
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
// 视频封面图缓存 key=src
const videoCoverMap = ref<Record<string, string>>({});
// 捕获视频封面
function captureVideoCover(src: string) {
  if (!src || videoCoverMap.value[src]) return;
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.preload = "auto";
  video.muted = true;
  video.src = src;
  const onSeeked = () => {
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
  };
  video.addEventListener("seeked", onSeeked, { once: true });
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
const historyVideo = ref<HistoryVideoItem[]>([]);
// 监听历史视频变化，自动捕获封面
watch(
  historyVideo,
  (list) => {
    for (const item of list) {
      if (item.src && item.state === "已完成" && !videoCoverMap.value[item.src]) {
        captureVideoCover(item.src);
      }
    }
  },
  { deep: true },
);
// 当前track的视频列表
const activeTrackVideos = computed(() => {
  const track = trackList.value[activeTrackIndex.value];
  if (!track?.id) return [];
  const fromHistory = historyVideo.value.filter((v) => v.videoTrackId === track.id);
  if (fromHistory.length > 0) return fromHistory;
  return (track.videoList ?? []).map((v) => ({ ...v, videoTrackId: track.id }));
});
// 预览视频
function previewVideo(v: HistoryVideoItem) {
  if (v.state === "生成中" || v.state === "生成失败") return;
  videoUrl.value = v.src;
}
// 选择视频
async function selectVideo(v: HistoryVideoItem) {
  if (v.state === "生成中" || v.state === "生成失败") return;
  const activeTrack = trackList.value[activeTrackIndex.value];
  if (v.id != null) {
    selectVideoId.value = v.id;
    if (activeTrack?.id != null) {
      trackSelectedVideoMap.value[activeTrack.id] = v.id;
    }
  }
  videoUrl.value = v.src;
  try {
    await axios.post("/production/workbench/selectVideo", {
      projectId: project.value?.id,
      scriptId: episodesId.value ?? 0,
      videoId: v.id,
      trackId: trackList.value[activeTrackIndex.value]?.id,
    });
    window.$message.success($t("workbench.generate.selectVideoSuccess"));
    getGenerateData();
  } catch (error) {
    window.$message.error($t("workbench.generate.selectVideoFailed"));
  }
}

// ========================
// 视频模型与模式配置模块
// ========================
type ReferenceType = "videoReference" | "imageReference" | "audioReference" | "textReference";
type Type = "imageReference" | "startImage" | "endImage" | "videoReference" | "audioReference";
type VideoMode = "singleImage" | "startEndRequired" | "endFrameOptional" | "startFrameOptional" | "text" | ReferenceType[];
interface VideoModel {
  name: string; // 显示名称
  modelName: string; //全局唯一
  type: "video";
  mode: (
    | "singleImage" // 单图
    | "startEndRequired" // 首尾帧（两张都得有）
    | "endFrameOptional" // 首尾帧（尾帧可选）
    | "startFrameOptional" // 首尾帧（首帧可选）
    | "text" // 文本生视频
    | ("videoReference" | "imageReference" | "audioReference" | "textReference")[] // 混合参考
  )[];
  audio: "optional" | false | true; // 音频配置
  durationResolutionMap: { duration: number[]; resolution: string[] }[];
}
const modeOptions = ref<VideoModel>({} as VideoModel);
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
    ? modeOptions.value.mode.map((mode) => {
        if (Array.isArray(mode)) {
          return {
            value: JSON.stringify(mode),
            label: mode.map((m) => modeLabelMap[m] || m).join(" + ") + "参考",
          };
        }
        // 普通字符串
        return {
          value: mode,
          label: modeLabelMap[mode] || mode,
        };
      })
    : [];
});
const selectMode = ref<string>();
const isMixedMode = computed(() => {
  const mode = parseMode(selectMode.value || "");
  return Array.isArray(mode);
});
const mixedClipMediaTypes = computed<ClipMediaType[]>(() => {
  const mode = parseMode(selectMode.value || "");
  if (!Array.isArray(mode)) return [];
  const map: Record<string, ClipMediaType> = {
    audioReference: "audio",
    imageReference: "image",
    videoReference: "video",
  };
  return mode.filter((m) => m in map).map((m) => map[m]);
});
function parseMode(value: string): VideoMode | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed as ReferenceType[];
    }
  } catch {
    return value as Exclude<VideoMode, ReferenceType[]>;
  }
  return value as Exclude<VideoMode, ReferenceType[]>;
}

// ========================
// Track媒体与选中状态模块
// ========================
interface TrackMedia {
  src: string;
  id?: number;
  prompt?: string;
  fileType: "image" | "video" | "audio";
  sources?: "assets" | "storyboard";
}
const activeTrackIndex = ref(0);
const trackSelectedVideoMap = ref<Record<number, number>>({});

// ========================
// Track增删与选中管理模块
// ========================
async function addTrack() {
  let duration = 0;
  axios.post("/modelSelect/getModelDetail", { modelId: selectModel.value }).then(async ({ data }) => {
    modeOptions.value = data;
    const drMap = data.durationResolutionMap;
    if (Array.isArray(drMap) && drMap.length > 0) {
      if (drMap[0].duration?.length) {
        duration = drMap[0].duration[0];
        const { data } = await axios.post("/production/workbench/addTrack", {
          projectId: project.value?.id,
          scriptId: episodesId.value ?? 0,
          duration,
        });
        getGenerateData();
        const trackId = typeof data === "object" && data !== null ? data.id : data;
        trackList.value.push({ id: trackId, prompt: "", state: "未生成", medias: [], videoList: [], duration: 0 });
        activeTrackIndex.value = trackList.value.length - 1;
      }
    }
  });
}

function confirmDeleteTrack(index: number) {
  const dlg = DialogPlugin.confirm({
    header: $t("workbench.generate.del"),
    body: $t("workbench.generate.delConfirm"),
    onConfirm: () => {
      dlg.destroy();
      deleteTrack(index);
      window.$message.success($t("workbench.generate.delSuccess"));
      getGenerateData();
    },
    onCancel: () => {
      dlg.destroy();
    },
  });
}

async function deleteTrack(index: number) {
  const track = trackList.value[index];
  if (!track) return;
  await axios.post("/production/workbench/deleteTrack", { id: track.id });
  if (activeTrackIndex.value >= trackList.value.length) {
    activeTrackIndex.value = trackList.value.length - 1;
  }
}

const references = computed(() => {
  return uploadBox.value
    .filter((m) => m.src)
    .map((item) => ({
      type: item.fileType,
      src: item.src!,
    }));
});

interface StoryboardItem {
  src: string;
  createTime?: number | null;
  duration?: string | null;
  flowId?: number | null;
  id?: number;
  index?: number | null;
  projectId?: number | null;
  prompt?: string | null;
  reason?: string | null;
  scriptId?: number | null;
  state?: string | null;
  trackId?: number | null;
}
const storyboardList = ref<StoryboardItem[]>([]);
const storyboardDialogVisible = ref(false);
const pendingIndex = ref(-1);

function buildUploadBox(value: string): UploadItem[] {
  const currentMode = parseMode(value);
  if (!currentMode) return [];
  const referenceUploadMap: Record<Exclude<ReferenceType, "textReference">, UploadItem> = {
    videoReference: { fileType: "video", type: "videoReference", sources: "storyboard", label: "参考视频" },
    imageReference: { fileType: "image", type: "imageReference", sources: "storyboard", label: "参考图片" },
    audioReference: { fileType: "audio", type: "audioReference", sources: "storyboard", label: "参考音频" },
  };

  const modeUploadMap: Record<Exclude<VideoMode, ReferenceType[]>, UploadItem[]> = {
    singleImage: [{ fileType: "image", type: "imageReference", sources: "storyboard", label: "参考图片" }],
    startEndRequired: [
      { fileType: "image", type: "startImage", sources: "storyboard", label: "首帧" },
      { fileType: "image", type: "endImage", sources: "storyboard", label: "末帧" },
    ],
    endFrameOptional: [
      { fileType: "image", type: "startImage", sources: "storyboard", label: "首帧" },
      { fileType: "image", type: "endImage", sources: "storyboard", label: "末帧(可选)" },
    ],
    startFrameOptional: [
      { fileType: "image", type: "startImage", sources: "storyboard", label: "首帧(可选)" },
      { fileType: "image", type: "endImage", sources: "storyboard", label: "末帧" },
    ],
    text: [],
  };

  if (Array.isArray(currentMode)) {
    return currentMode
      .filter((item): item is Exclude<ReferenceType, "textReference"> => item !== "textReference")
      .map((item) => ({ ...referenceUploadMap[item] }));
  }

  return (modeUploadMap[currentMode] || []).map((item) => ({ ...item }));
}

const fileTypeMap: Record<UploadItem["fileType"], AssetType[]> = {
  image: ["role", "scene", "tool"],
  video: ["clip"],
  audio: ["clip"],
};

function handleSelectSource(index: number) {
  const item = uploadBox.value[index];
  if (!item) return;
  pendingIndex.value = index;

  const dlg = DialogPlugin.confirm({
    header: $t("workbench.generate.selectSource"),
    confirmBtn: $t("workbench.generate.confirm"),
    cancelBtn: $t("workbench.generate.cancel"),
    onConfirm: async () => {
      dlg.destroy();
      const assets = await assetsCheck({ types: fileTypeMap[item.fileType], multiple: false });
      if (assets.length > 0) {
        userEditedUploadBox.value = true;
        // 先把该 slot 原来的旧 id 从 genVideoParams 移除，再写入新的
        const oldId = uploadBox.value[index]?.id;
        if (oldId != null) {
          genVideoParams.value = genVideoParams.value.filter((p) => p.id !== oldId);
        }
        uploadBox.value[index] = { ...item, sources: "assets", src: assets[0].src, id: assets[0].id, prompt: assets[0].prompt };
        genVideoParams.value.push({ id: assets[0].id, sources: "assets" });
        genVideoParams.value = genVideoParams.value.filter((item, index, self) => self.findIndex((t) => t.id === item.id) === index);
        const curTrackId = trackList.value[activeTrackIndex.value]?.id;
        if (curTrackId != null) genVideoParamsMap.value[curTrackId] = [...genVideoParams.value];
      }
    },
    onCancel: () => {
      dlg.destroy();
      storyboardDialogVisible.value = true;
    },
  });
}

async function handleMixedAdd() {
  const dlg = DialogPlugin.confirm({
    header: $t("workbench.generate.selectSource"),
    confirmBtn: $t("workbench.generate.confirm"),
    cancelBtn: $t("workbench.generate.cancel"),
    onConfirm: async () => {
      dlg.destroy();
      const assets = await assetsCheck({ types: ["role", "tool", "scene", "clip"], clipMediaTypes: mixedClipMediaTypes.value, multiple: true });
      if (!assets.length) return;
      userEditedUploadBox.value = true;
      for (const asset of assets) {
        const fileType = getFileTypeByExt(asset.src);
        uploadBox.value.push({
          fileType,
          type: refTypeMap[fileType] as Type,
          sources: "assets",
          src: asset.src,
          id: asset.id,
          prompt: asset.prompt,
          label: "",
        });
        genVideoParams.value.push({ id: asset.id, sources: "assets" });
        genVideoParams.value = genVideoParams.value.filter((item, index, self) => self.findIndex((t) => t.id === item.id) === index);
        const curTrackId2 = trackList.value[activeTrackIndex.value]?.id;
        if (curTrackId2 != null) genVideoParamsMap.value[curTrackId2] = [...genVideoParams.value];
      }
    },
    onCancel: () => {
      dlg.destroy();
      pendingIndex.value = -1;
      storyboardDialogVisible.value = true;
    },
  });
}

const refTypeMap: Record<string, ReferenceType> = {
  image: "imageReference",
  video: "videoReference",
  audio: "audioReference",
};

function getFileTypeByExt(src: string | undefined): "image" | "video" | "audio" {
  const ext = src?.split(".").pop()?.toLowerCase() ?? "";
  const videoExts = ["mp4", "webm", "mov", "avi", "mkv"];
  const audioExts = ["mp3", "wav", "ogg", "aac", "flac", "m4a"];
  if (videoExts.includes(ext)) return "video";
  if (audioExts.includes(ext)) return "audio";
  return "image";
}

function pickStoryboard(sb: StoryboardItem) {
  storyboardDialogVisible.value = false;
  userEditedUploadBox.value = true;
  const fileType = getFileTypeByExt(sb.src);
  genVideoParams.value.push({ id: sb.id, sources: "storyboard" });
  genVideoParams.value = genVideoParams.value.filter((item, index, self) => self.findIndex((t) => t.id === item.id) === index);
  const curTrackId3 = trackList.value[activeTrackIndex.value]?.id;
  if (curTrackId3 != null) genVideoParamsMap.value[curTrackId3] = [...genVideoParams.value];
  if (isMixedMode.value) {
    uploadBox.value.push({
      fileType,
      type: refTypeMap[fileType] as Type,
      sources: "storyboard",
      src: sb.src,
      id: sb.id,
      prompt: sb.prompt ?? undefined,
      label: "",
    });
    return;
  }
  const item = uploadBox.value[pendingIndex.value];
  if (!item) return;
  // 先把该 slot 原来的旧 id 从 genVideoParams 移除，再写入新的
  const oldId = item.id;
  if (oldId != null) {
    genVideoParams.value = genVideoParams.value.filter((p) => p.id !== oldId);
    const curTrackId4 = trackList.value[activeTrackIndex.value]?.id;
    if (curTrackId4 != null) genVideoParamsMap.value[curTrackId4] = [...genVideoParams.value];
  }
  uploadBox.value[pendingIndex.value] = { ...item, sources: "storyboard", src: sb.src, id: sb.id, prompt: sb.prompt ?? undefined };
}

function clearUpload(index: number) {
  const item = uploadBox.value[index];
  if (!item) return;
  userEditedUploadBox.value = true;
  if (isMixedMode.value) {
    uploadBox.value.splice(index, 1);
  } else {
    uploadBox.value[index] = { ...item, sources: "storyboard", src: undefined, id: undefined, prompt: undefined };
  }
}

const userEditedUploadBox = ref(false);

const uploadBoxSnapshot = ref<UploadItem[]>([]);

watch(selectMode, (val) => {
  if (!val) return (uploadBox.value = []);
  const oldBox = uploadBox.value;
  // 保存快照：无论是否有 src，都保留当前 uploadBox 供切换时恢复；
  // 同时也把 track.medias 作为更可靠的快照来源
  const activeTrack = trackList.value[activeTrackIndex.value];
  if (oldBox.some((item) => item.src)) {
    uploadBoxSnapshot.value = oldBox.map((item) => ({ ...item }));
  } else if (activeTrack?.medias?.length) {
    // 当前 uploadBox 为空（如文生图模式），从 track.medias 构建快照
    uploadBoxSnapshot.value = activeTrack.medias.map((m) => ({
      fileType: m.fileType,
      type: (refTypeMap[m.fileType] ?? "imageReference") as Type,
      sources: m.sources ?? "storyboard",
      src: m.src,
      id: m.id,
      prompt: m.prompt,
      label: "",
    }));
  }
  const newBox = buildUploadBox(val);
  const newParsedMode = parseMode(val);
  const newIsMixed = Array.isArray(newParsedMode);
  if (newIsMixed) {
    //混合模式
    uploadBox.value = oldBox;
  } else {
    //非混合模式
    const sourceItems = uploadBoxSnapshot.value;
    const usedIndices = new Set<number>();
    uploadBox.value = newBox.map((slot) => {
      const matchIdx = sourceItems.findIndex((old, i) => !usedIndices.has(i) && old.fileType === slot.fileType && old.src);
      if (matchIdx !== -1) {
        usedIndices.add(matchIdx);
        const old = sourceItems[matchIdx];
        return { ...slot, src: old.src, id: old.id, prompt: old.prompt, sources: old.sources ?? slot.sources };
      }
      return slot;
    });
  }
  userEditedUploadBox.value = false;
  // 模式切换后，根据新 uploadBox 重建 genVideoParams
  const newParams = uploadBox.value.filter((item) => item.src && item.id != null).map((item) => ({ id: item.id, sources: item.sources }));
  if (newParsedMode === "text") {
    // 文生图模式：从 track.medias 或快照获取分镜数据填入 genVideoParams
    const mediaSources = (activeTrack?.medias ?? []).filter((m) => m.id != null).map((m) => ({ id: m.id, sources: m.sources }));
    const snapshotSources = uploadBoxSnapshot.value.filter((item) => item.id != null).map((item) => ({ id: item.id, sources: item.sources }));
    const combined = [...mediaSources, ...snapshotSources];
    genVideoParams.value = combined.filter((item, index, self) => self.findIndex((t) => t.id === item.id) === index);
  } else if (newParams.length > 0) {
    // 新 uploadBox 有有效资源：合并已有参数并去重
    const merged = [...genVideoParams.value, ...newParams];
    genVideoParams.value = merged.filter((item, index, self) => self.findIndex((t) => t.id === item.id) === index);
  }
  // 新模式无有效资源时，保留原有 genVideoParams，不清空（可能是用户之前手动添加的）
  const curTrackId = trackList.value[activeTrackIndex.value]?.id;
  if (curTrackId != null) genVideoParamsMap.value[curTrackId] = [...genVideoParams.value];
});

watch(
  uploadBox,
  (items) => {
    if (!userEditedUploadBox.value) return;
    const track = trackList.value[activeTrackIndex.value];
    if (!track) return;
    // 只写回有 src 的有效项，避免空占位项污染 track.medias
    track.medias = items
      .filter((item) => !!item.src)
      .map((item) => ({ src: item.src!, id: item.id, prompt: item.prompt, fileType: item.fileType, sources: item.sources }));
  },
  { deep: true },
);

const checkedTrackIds = ref<number[]>([]);
const checkAll = ref(false);

function handleCheckAll(val: boolean) {
  const allTrackIds = trackList.value.map((track) => track.id).filter((id): id is number => id != null);
  checkedTrackIds.value = val ? allTrackIds : [];
}

function checkTrack(id: number) {
  if (id == null) return;
  const isChecked = checkedTrackIds.value.includes(id);
  toggleCheck(id, !isChecked);
}

function toggleCheck(trackId: number | undefined, val: boolean) {
  if (trackId == null) return;
  if (val) {
    if (!checkedTrackIds.value.includes(trackId)) {
      checkedTrackIds.value.push(trackId);
    }
  } else {
    checkedTrackIds.value = checkedTrackIds.value.filter((id) => id !== trackId);
  }
  const allTrackIds = trackList.value.map((track) => track.id).filter((id): id is number => id != null);
  checkAll.value = allTrackIds.length > 0 && allTrackIds.every((id) => checkedTrackIds.value.includes(id));
}

watch(
  trackList,
  (list) => {
    const validIds = list.map((track) => track.id).filter((id): id is number => id != null);
    checkedTrackIds.value = checkedTrackIds.value.filter((id) => validIds.includes(id));
    checkAll.value = validIds.length > 0 && validIds.every((id) => checkedTrackIds.value.includes(id));
    genTextLoadingMap.value = Object.fromEntries(Object.entries(genTextLoadingMap.value).filter(([id]) => validIds.includes(Number(id))));
    generatingMap.value = Object.fromEntries(Object.entries(generatingMap.value).filter(([id]) => validIds.includes(Number(id))));
  },
  { deep: true },
);

type ImportVideoItem = { trackId: number; videoId: number; src: string; duration: number };
const emit = defineEmits<{
  importVideo: [videoList: ImportVideoItem[]];
}>();
// ...existing code...
// ========================
// 上传资源同步模块
// ========================
function syncMediasToUploadBox() {
  const track = trackList.value[activeTrackIndex.value];
  if (!track) return;
  const medias = track.medias;
  if (isMixedMode.value) {
    // 混合模式：直接用 track.medias 重建 uploadBox
    uploadBox.value = medias.map((m) => ({
      fileType: m.fileType,
      type: (refTypeMap[m.fileType] ?? "imageReference") as Type,
      sources: m.sources!,
      src: m.src,
      id: m.id,
      prompt: m.prompt,
      label: "",
    }));
  } else {
    uploadBox.value = uploadBox.value.map((item, i) => {
      const media = medias[i];
      if (media?.src) {
        return { ...item, src: media.src, id: media.id, prompt: media.prompt, sources: media.sources ?? item.sources };
      }
      return { ...item, src: undefined, id: undefined, prompt: undefined };
    });
  }
}

// ========================
// 当前Track选中视频恢复模块
// ========================
function restoreActiveTrackSelection() {
  const track = trackList.value[activeTrackIndex.value];
  if (!track?.id) {
    selectVideoId.value = null;
    videoUrl.value = "";
    return;
  }
  const selectedId = trackSelectedVideoMap.value[track.id] ?? track.selectVideoId ?? null;
  selectVideoId.value = selectedId;
  if (selectedId == null) {
    if (!videoUrl.value) {
      videoUrl.value = "";
    }
    return;
  }
  const selectedVideo = historyVideo.value.find((v) => v.videoTrackId === track.id && v.id === selectedId);
  if (selectedVideo && selectedVideo.state !== "生成中" && selectedVideo.state !== "生成失败") {
    videoUrl.value = selectedVideo.src;
    return;
  }
}

// ========================
// 轮询与自动刷新模块
// ========================
const hasGeneratedVideo = computed(() => {
  return historyVideo.value.some((v) => v.state === "生成中");
});
let pollTimer: number | null = null;
function startPoll() {
  if (pollTimer !== null) return;
  pollTimer = window.setInterval(() => {
    getVideoList();
  }, 3000);
}
function stopPoll() {
  if (pollTimer !== null) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
}
watch(
  () => hasGeneratedVideo.value,
  (newValue) => {
    if (newValue) {
      startPoll();
    } else {
      stopPoll();
    }
  },
);
onUnmounted(() => {
  stopPoll();
});

// ========================
// 视频列表获取与状态提醒模块
// ========================
async function getVideoList() {
  const { data } = await axios.post("/production/workbench/getVideoList", {
    projectId: project.value?.id,
    scriptId: episodesId.value ?? 0,
  });
  const oldList = historyVideo.value;
  historyVideo.value = data;
  restoreActiveTrackSelection();
  // 检测生成完成的视频并提醒用户
  for (const item of data as HistoryVideoItem[]) {
    const old = oldList.find((o) => o.id === item.id);
    if (!old) continue;
    if (old.state === "生成中" && item.state === "已完成") {
      window.$message.success($t("workbench.generate.generateSuccess"));
    } else if (old.state === "生成中" && item.state === "生成失败") {
      window.$message.error(item.errorReason || $t("workbench.generate.generateFailed"));
    }
  }
}

// ========================
// Track切换时同步模块
// ========================
watch(activeTrackIndex, (newIndex, oldIndex) => {
  // 保存旧 track 的 genVideoParams 到缓存
  const oldTrack = trackList.value[oldIndex];
  if (oldTrack?.id != null) {
    genVideoParamsMap.value[oldTrack.id] = [...genVideoParams.value];
  }
  userSelectedDuration.value = false;
  // 恢复新 track 的 genVideoParams：优先用缓存，否则从 track.medias 初始化
  const newTrack = trackList.value[newIndex];
  if (newTrack?.id != null && genVideoParamsMap.value[newTrack.id] != null) {
    genVideoParams.value = [...genVideoParamsMap.value[newTrack.id]];
  } else {
    genVideoParams.value = newTrack ? newTrack.medias.map((m) => ({ id: m.id, sources: m.sources })) : [];
  }
  syncMediasToUploadBox();
  restoreActiveTrackSelection();
});
// ========================
// 分辨率与时长变更处理模块
// ========================
function handleResolutionChange(res: string) {
  selectedResolution.value = res;
}
function handleDurationChange(dur: number) {
  selectedDuration.value = dur;
  userSelectedDuration.value = true;
}
// ========================
// 视频删除与下载模块
// ========================
function handleDeleteVideo(value: HistoryVideoItem) {
  const dlg = DialogPlugin.confirm({
    header: $t("workbench.generate.del"),
    body: $t("workbench.generate.delVideo"),
    onConfirm: () => {
      axios
        .post(`/production/workbench/delVideo`, {
          id: value.id,
        })
        .then(() => {
          window.$message.success($t("workbench.generate.delSuccess"));
          dlg.destroy();
          getVideoList();
        });
    },
    onCancel: () => {
      dlg.destroy();
    },
  });
}
async function downloadVideo(value: HistoryVideoItem) {
  const url = value.src;
  const response = await fetch(url);
  const blob = await response.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  const filename = "视频" + ".mp4";
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
// ========================
// 提示词生成模块
// ========================
const genVideoParams = ref<{ id?: number; sources?: string }[]>([]);
// 按 trackId 缓存每个 track 的 genVideoParams
const genVideoParamsMap = ref<Record<number, { id?: number; sources?: string }[]>>({});

function removeGenVideoParam(index: number) {
  genVideoParams.value.splice(index, 1);
  const curTrackId = trackList.value[activeTrackIndex.value]?.id;
  if (curTrackId != null) genVideoParamsMap.value[curTrackId] = [...genVideoParams.value];
}
// 单个生成视频提示词
async function genText() {
  const track = trackList.value[activeTrackIndex.value];
  const trackId = track?.id;
  if (trackId == null || genTextLoadingMap.value[trackId]) return;
  genTextLoadingMap.value[trackId] = true;
  try {
    const { data } = await axios.post("/production/workbench/generateVideoPrompt", {
      projectId: project.value?.id,
      trackId,
      info: genVideoParams.value,
      model: selectModel.value,
    });
    const targetTrack = trackList.value.find((item) => item.id === trackId);
    if (targetTrack) {
      targetTrack.prompt = data;
    }
  } finally {
    genTextLoadingMap.value[trackId] = false;
  }
}
// 批量生成提示词
function batchGenText() {
  trackList.value
    .filter((track) => checkedTrackIds.value.includes(track.id))
    .forEach(async (track) => {
      const trackId = track.id;
      const cached = genVideoParamsMap.value[trackId];
      const info = cached ? cached.filter((item) => item.id) : track.medias.filter((item) => item.id).map((m) => ({ id: m.id, sources: m.sources }));
      genTextLoadingMap.value[trackId] = true;
      try {
        const { data } = await axios.post("/production/workbench/generateVideoPrompt", {
          projectId: project.value?.id,
          trackId,
          info: info,
          model: selectModel.value,
        });
        const targetTrack = trackList.value.find((item) => item.id === trackId);
        if (targetTrack) {
          targetTrack.prompt = data;
        }
      } finally {
        genTextLoadingMap.value[trackId] = false;
      }
    });
}
// ========================
// 视频生成模块
// ========================
// 单个生成视频
async function generateVideo() {
  const trackId = trackList.value[activeTrackIndex.value]?.id;
  if (trackId == null || generatingMap.value[trackId]) return;
  const dlg = DialogPlugin.confirm({
    header: $t("workbench.generate.generateConfirm"),
    body: $t("workbench.generate.generateConfirmBody"),
    onConfirm: async () => {
      dlg.destroy();
      generatingMap.value[trackId] = true;
      try {
        const payload = {
          projectId: project.value?.id,
          scriptId: episodesId.value,
          uploadData: uploadBox.value.filter((item) => Boolean(item.src)),
          prompt: promptText.value,
          model: selectModel.value,
          mode: selectMode.value,
          resolution: selectedResolution.value,
          duration: effectiveDuration.value,
          audio: selectedAudio.value,
          trackId,
        };
        const { data } = await axios.post("/production/workbench/generateVideo", payload);
        window.$message.success($t("workbench.generate.generateStarted"));
        getVideoList();
      } finally {
        generatingMap.value[trackId] = false;
      }
    },
    onCancel: () => {
      dlg.destroy();
    },
  });
}
// 批量生成视频
function batchGenVideo() {
  const dlg = DialogPlugin.confirm({
    header: $t("workbench.generate.generateConfirm"),
    body: $t("workbench.generate.generateVideosInBatches"),
    onConfirm: async () => {
      dlg.destroy();
      trackList.value
        .filter((track) => checkedTrackIds.value.includes(track.id))
        .forEach(async (track) => {
          const trackId = track.id;
          if (trackId == null || generatingMap.value[trackId]) return;
          generatingMap.value[trackId] = true;
          try {
            const uploadData = track.medias;
            const payload = {
              projectId: project.value?.id,
              duration: clampDuration(track.duration || selectedDuration.value),
              scriptId: episodesId.value,
              uploadData: uploadData.map((item) => ({
                id: item.id,
                sources: item.sources ?? "storyboard",
              })),
              prompt: track.prompt,
              model: selectModel.value,
              mode: selectMode.value,
              resolution: selectedResolution.value,
              audio: selectedAudio.value,
              trackId,
            };
            if (payload.prompt === "") return window.$message.warning($t("workbench.generate.skipDataWithEmptyVideoPromptWords"));
            const { data } = await axios.post("/production/workbench/generateVideo", payload);
            window.$message.success($t("workbench.generate.generateStarted"));
            getVideoList();
          } finally {
            generatingMap.value[trackId] = false;
          }
        });
    },
    onCancel: () => {
      dlg.destroy();
    },
  });
}
//批量下载视频
function getFileExtension(url: string): string {
  const parts = url.split(".");
  const extWithQuery = parts[parts.length - 1];
  return extWithQuery.split(/\#|\?/)[0] || "mp4"; // 默认mp4
}

async function batchDownloadVideo(): Promise<void> {
  const zip = new JSZip();

  const selectedTracks = trackList.value.filter((track) => checkedTrackIds.value.includes(track.id));

  const downloadTasks = selectedTracks
    .map((track) => {
      const video = track.videoList.find((v) => v.id === track.selectVideoId);
      if (!video?.src) return null;
      const filename = `分镜${track.id}.${getFileExtension(video.src)}`;
      return fetch(video.src)
        .then((res) => res.blob())
        .then((blob) => zip.file(filename, blob))
        .catch((err) => console.error(`视频下载失败: ${video.src}`, err));
    })
    .filter(Boolean);

  await Promise.all(downloadTasks);

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `视频批量下载_${Date.now()}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
</script>

<style lang="scss" scoped>
.generateContainer {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  gap: 16px;
  .data {
    width: 100%;
    height: 75%;
    gap: 10px;
    min-height: 0;
    .videoToImage {
      background: var(--td-bg-color-secondarycontainer);
      width: 100%;
      height: 100%;
      display: flex;
      flex: 1;
      gap: 24px;
      min-height: 0;
      border-radius: 8px;
      overflow: hidden;
      .previewVideo {
        width: 100%;
      }
      .emptyVideo {
        width: 100%;
        height: 100%;
        color: var(--td-text-color-placeholder);
      }
    }
    .configurationParameters {
      width: 50%;
      height: 100%;
      overflow-y: auto;
      border: 1px solid var(--td-component-border);
      height: 100%;
      border-radius: 8px;
      padding: 16px;
      .generatePromptWords {
        .promptsMenu {
          .title {
            font-weight: bold;
          }
          padding-top: 10px;
          padding-bottom: 10px;
        }
        .genVideoParams {
        }
      }
      .promptInput {
        border: 1px solid var(--td-component-border);
        border-radius: 8px;
        min-height: 100px;
        height: 150px;
        overflow: auto;
        resize: vertical;
      }
      .modeOpt {
        width: 100%;
        padding-top: 10px;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--td-component-border);
        gap: 8px;
        .uploadBtn {
          width: 80px;
          height: 80px;
          position: relative;
          border: 1px dashed var(--td-component-border);
          border-radius: 8px;
          &:hover {
            border-color: var(--td-text-color);
            cursor: pointer;
          }
          .uploadPreview {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 8px;
          }
          .clearBtn {
            position: absolute;
            top: -6px;
            right: -6px;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.6);
            color: #fff;
            display: none;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            &:hover {
              background: rgba(0, 0, 0, 0.85);
            }
          }
          &:hover .clearBtn {
            display: flex;
          }
          .source {
            position: absolute;
            bottom: 2px;
            right: 2px;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.6);
            color: #fff;
            display: none;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            &:hover {
              background: rgba(0, 0, 0, 0.85);
            }
          }
          &:hover .source {
            display: flex;
          }
        }
      }
      .storyboardGrid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        max-height: 60vh;
        overflow-y: auto;
        padding: 4px;
        .storyboardItem {
          cursor: pointer;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid transparent;
          transition:
            border-color 0.2s,
            box-shadow 0.2s;
          &:hover {
            border-color: var(--td-brand-color);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
          }
          img {
            width: 100%;
            aspect-ratio: 16/9;
            object-fit: cover;
            display: block;
          }
        }
      }
      .modeMenu {
        width: 100%;
        padding-top: 10px;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--td-component-border);
        .left {
          flex: 1;
          gap: 8px;
          .mode {
            width: 180px;
          }
          .status {
            .btn {
              cursor: pointer;
              &:hover {
                background-color: var(--td-bg-color-secondarycontainer);
              }
            }
          }
        }
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
          height: 100%;
          overflow: hidden;
          display: grid;
          grid-template-columns: repeat(6, 1fr);
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
  }
  .videoTrack {
    width: 100%;
    height: 25%;
    margin-top: 10px;
    border: 1px solid var(--td-component-border);
    padding: 20px;
    overflow: hidden;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    .trackMenu {
      margin-bottom: 10px;
      .selectedCount {
        font-size: 12px;
        color: var(--td-text-color-secondary);
        margin-left: 8px;
      }
      .right {
        gap: 8px;
      }
    }
    .itemBox {
      flex: 1;
      min-height: 0;
      width: 100%;
      display: flex;
      overflow-x: auto;
      gap: 10px;
      &::-webkit-scrollbar {
        height: 6px;
      }
      &::-webkit-scrollbar-thumb {
        background: #696969;
        border-radius: 3px;
      }
      .item {
        background-color: var(--td-bg-color-container);
        border-radius: 8px;
        flex-shrink: 0;
        width: 200px;
        height: 100%;
        border: 1px solid var(--td-component-border);
        overflow: hidden;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        &.active {
          border-color: var(--td-brand-color);
          border-width: 2px;
          box-shadow: 0 0 0 3px rgba(var(--td-brand-color-rgb, 0, 82, 217), 0.25);
          background: linear-gradient(180deg, rgba(var(--td-brand-color-rgb, 0, 82, 217), 0.05) 0%, transparent 100%);
        }
        &:hover {
          filter: brightness(90%);
        }
        .indexTag {
          position: absolute;
          bottom: 4px;
          left: 4px;
          z-index: 1;
        }
        .selectTag {
          position: absolute;
          bottom: 4px;
          right: 4px;
          z-index: 1;
        }
        .thumbGroup {
          width: 100%;
          height: 100%;
          display: flex;
          .thumb {
            flex: 1;
            min-width: 0;
            height: 100%;
            object-fit: cover;
          }
          .placeholder {
            background: var(--td-bg-color-secondarycontainer);
            color: var(--td-text-color-placeholder);
            font-size: 12px;
          }
        }
        .emptyTrack {
          color: var(--td-text-color-placeholder);
          font-size: 12px;
        }
        .trackCheck {
          position: absolute;
          top: 4px;
          left: 4px;
          z-index: 1;
        }
        .deleteBtn {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.5);
          color: #fff;
          display: none;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          &:hover {
            background: rgba(0, 0, 0, 0.8);
          }
        }
        &:hover .deleteBtn {
          display: flex;
        }
      }
      .addItem {
        border: 4px dashed var(--td-component-border);
        cursor: pointer;
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
