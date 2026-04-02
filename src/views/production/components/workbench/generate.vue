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
        <div class="promptInput">
          <promptEditor v-model="promptText" :references="references" :placeholder="$t('workbench.generate.promptPlaceholder')" />
          <!-- <t-textarea class="input" v-model="promptText" :autosize="{ minRows: 4, maxRows: 8 }" :disabled="activeTrackGenTextLoading" /> -->
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
                <t-tag class="btn" variant="outline">{{ selectedResolution }}·{{ selectedDuration }}s</t-tag>
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
                          :class="{ active: selectedDuration === dur }"
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
              <video :src="v.src" preload="metadata" muted />
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
          @click="activeTrackIndex = index">
          <t-checkbox
            class="trackCheck"
            :checked="track.id != null && checkedTrackIds.includes(track.id)"
            @click.stop
            @change="(val: boolean) => toggleCheck(track.id, val)" />
          <t-tag class="indexTag" size="small">#{{ index + 1 }}</t-tag>
          <t-tag class="selectTag" theme="success" size="small" v-if="track.selectVideoId">已选择</t-tag>
          <div class="thumbGroup" v-if="track.medias.length">
            <template v-for="(m, i) in track.medias" :key="i">
              <img v-if="m.fileType === 'image'" :src="m.src" class="thumb" />
              <div v-else class="thumb placeholder c">
                <i-volume-notice v-if="m.fileType === 'audio'" size="20" />
                <i-video v-else size="24" />
              </div>
            </template>
          </div>
          <span v-else class="emptyTrack">{{ $t("workbench.generate.emptyTrack", index + 1) }}</span>
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

const episodesId = inject<Ref<number>>("episodesId")!;

const { project } = storeToRefs(projectStore());

const videoUrl = ref("");
const promptText = computed({
  get: () => {
    const track = trackList.value[activeTrackIndex.value];
    return track?.prompt ?? "";
  },
  set: (val: string) => {
    const track = trackList.value[activeTrackIndex.value];
    if (track) track.prompt = val;
  },
});
const selectedResolution = ref("480p");
const selectedDuration = ref(8);
const selectedAudio = ref(false);
const generating = ref(false);
const genTextLoadingMap = ref<Record<number, boolean>>({});
const activeTrackGenTextLoading = computed(() => {
  const trackId = trackList.value[activeTrackIndex.value]?.id;
  return trackId != null ? !!genTextLoadingMap.value[trackId] : false;
});

async function genText() {
  const track = trackList.value[activeTrackIndex.value];
  const trackId = track?.id;
  if (trackId == null || genTextLoadingMap.value[trackId]) return;
  const prompts = uploadBox.value.filter((item) => item.prompt).map((item) => item.prompt!);
  genTextLoadingMap.value[trackId] = true;
  try {
    const { data } = await axios.post("/production/workbench/generateVideoPrompt", {
      projectId: project.value?.id,
      trackId,
      prompt: prompts,
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

interface VideoItem {
  id: number;
  src: string;
  state: "未生成" | "生成中" | "已完成" | "生成失败";
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

const historyVideo = ref<HistoryVideoItem[]>([]);

const activeTrackVideos = computed(() => {
  const track = trackList.value[activeTrackIndex.value];
  if (!track?.id) return [];
  return historyVideo.value.filter((v) => v.videoTrackId === track.id);
});

function previewVideo(v: HistoryVideoItem) {
  if (v.state === "生成中" || v.state === "生成失败") return;
  videoUrl.value = v.src;
}

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
  } catch (error) {
    window.$message.error($t("workbench.generate.selectVideoFailed"));
  }
}

type ReferenceType = "videoReference" | "imageReference" | "audioReference" | "textReference";
type Type = "imageReference" | "startImage" | "endImage" | "videoReference" | "audioReference";
type VideoMode = "singleImage" | "startEndRequired" | "endFrameOptional" | "startFrameOptional" | "text" | ReferenceType[];

interface UploadItem {
  fileType: "image" | "video" | "audio";
  type: Type;
  sources: "assets" | "storyboard";
  id?: number;
  src?: string;
  label?: string;
  prompt?: string;
}

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
  associationSkills?: string; // 关联技能，多个技能用逗号分隔
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

const selectModel = ref<string>();
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

interface TrackMedia {
  src: string;
  id?: number;
  prompt?: string;
  fileType: "image" | "video" | "audio";
  sources?: "assets" | "storyboard";
}

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
const activeTrackIndex = ref(0);
const trackSelectedVideoMap = ref<Record<number, number>>({});

async function addTrack() {
  const { data } = await axios.post("/production/workbench/addTrack", {
    projectId: project.value?.id,
    scriptId: episodesId.value ?? 0,
  });
  const trackId = typeof data === "object" && data !== null ? data.id : data;
  trackList.value.push({ id: trackId, prompt: "", state: "未生成", medias: [], videoList: [], duration: 0 });
  activeTrackIndex.value = trackList.value.length - 1;
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

const uploadBox = ref<UploadItem[]>([]);

const references = computed(() => {
  return uploadBox.value
    .filter((item) => item.src)
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
        uploadBox.value[index] = { ...item, sources: "assets", src: assets[0].src, id: assets[0].id, prompt: assets[0].prompt };
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
  if (isMixedMode.value) {
    const fileType = getFileTypeByExt(sb.src);
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

async function generateVideo() {
  if (generating.value) return;
  const dlg = DialogPlugin.confirm({
    header: $t("workbench.generate.generateConfirm"),
    body: $t("workbench.generate.generateConfirmBody"),
    onConfirm: async () => {
      dlg.destroy();
      generating.value = true;
      try {
        const payload = {
          projectId: project.value?.id,
          scriptId: episodesId.value,
          uploadData: uploadBox.value.filter((item) => Boolean(item.src)),
          prompt: promptText.value,
          model: selectModel.value,
          mode: selectMode.value,
          resolution: selectedResolution.value,
          duration: selectedDuration.value,
          audio: selectedAudio.value,
          trackId: trackList.value[activeTrackIndex.value]?.id,
        };
        const { data } = await axios.post("/production/workbench/generateVideo", payload);
        window.$message.success($t("workbench.generate.generateStarted"));
        getVideoList();
      } finally {
        generating.value = false;
      }
    },
    onCancel: () => {
      dlg.destroy();
    },
  });
}

watch(selectModel, (val) => {
  if (!val) {
    modeOptions.value = {} as VideoModel;
    selectMode.value = undefined;
    return;
  }
  axios.post("/modelSelect/getModelDetail", { modelId: val }).then(({ data }) => {
    modeOptions.value = data;
    // 重置 mode 为第一个可选项
    if (data.mode?.length) {
      const firstMode = data.mode[0];
      selectMode.value = Array.isArray(firstMode) ? JSON.stringify(firstMode) : firstMode;
    } else {
      selectMode.value = undefined;
    }
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
  });
});

const userEditedUploadBox = ref(false);

watch(selectMode, (val) => {
  console.log("%c Line:616 🍢 val", "background:#ed9ec7", val);
  if (!val) return (uploadBox.value = []);
  userEditedUploadBox.value = false;
  uploadBox.value = buildUploadBox(val);
});

watch(
  uploadBox,
  (items) => {
    if (!userEditedUploadBox.value) return;
    const track = trackList.value[activeTrackIndex.value];
    if (!track) return;
    track.medias = items
      .filter((item) => item.src)
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
  },
  { deep: true },
);

function batchGenText() {
  trackList.value
    .filter((track) => checkedTrackIds.value.includes(track.id))
    .forEach(async (track) => {
      const trackId = track.id;
      if (trackId == null || genTextLoadingMap.value[trackId]) return;
      const prompts = track.medias.filter((m) => m.prompt).map((m) => m.prompt!);
      genTextLoadingMap.value[trackId] = true;
      try {
        const { data } = await axios.post("/production/workbench/generateVideoPrompt", {
          projectId: project.value?.id,
          trackId,
          prompt: prompts,
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

function batchGenVideo() {
  if (generating.value) return;
  const dlg = DialogPlugin.confirm({
    header: $t("workbench.generate.generateConfirm"),
    body: $t("workbench.generate.generateVideosInBatches"),
    onConfirm: async () => {
      dlg.destroy();
      generating.value = true;
      const modeTemplate = selectMode.value ? buildUploadBox(selectMode.value) : [];
      trackList.value
        .filter((track) => checkedTrackIds.value.includes(track.id))
        .forEach(async (track) => {
          try {
            // 根据当前 mode 的槽位数量，按位置取对应的 media，只取有 src 的
            const uploadData = modeTemplate.map((_, i) => track.medias[i]).filter((item) => item && Boolean(item.src));
            const payload = {
              projectId: project.value?.id,
              duration: track.duration,
              scriptId: episodesId.value,
              uploadData: uploadData.map((item) => {
                return {
                  id: item.id,
                  sources: item.sources ? item.sources : "storyboard",
                };
              }),
              prompt: track.prompt,
              model: selectModel.value,
              mode: selectMode.value,
              resolution: selectedResolution.value,
              audio: selectedAudio.value,
              trackId: track.id,
            };
            if (payload.prompt === "") return window.$message.warning($t("workbench.generate.skipDataWithEmptyVideoPromptWords"));
            const { data } = await axios.post("/production/workbench/generateVideo", payload);
            window.$message.success($t("workbench.generate.generateStarted"));
            getVideoList();
          } finally {
            generating.value = false;
          }
        });
    },
    onCancel: () => {
      dlg.destroy();
    },
  });
}

type ImportVideoItem = { trackId: number; videoId: number; src: string; duration: number };
const emit = defineEmits<{
  importVideo: [videoList: ImportVideoItem[]];
}>();
// function importVideo() {
//   if (checkedTrackIds.value.length === 0) {
//     return window.$message.warning($t("workbench.generate.selectTrackFirst"));
//   }
//   const videoList: ImportVideoItem[] = trackList.value
//     .filter((track) => track.id != null && checkedTrackIds.value.includes(track.id))
//     .map((track) => {
//       const trackId = track.id!;
//       const selectedVid = trackSelectedVideoMap.value[trackId] ?? track.selectVideoId;
//       if (!selectedVid) return null;
//       const video = historyVideo.value.find((v) => v.id === selectedVid && v.videoTrackId === trackId);
//       if (!video || video.state === "生成中" || video.state === "生成失败" || video.id == null) {
//         return null;
//       }
//       const duration = Number(video.duration ?? video.time ?? selectedDuration.value);
//       return { trackId, videoId: video.id, src: video.src, duration: Number.isFinite(duration) && duration > 0 ? duration : selectedDuration.value };
//     })
//     .filter((i): i is ImportVideoItem => i !== null);
//   if (videoList.length === 0) {
//     return window.$message.warning($t("workbench.generate.noSelectedVideo"));
//   }
//   emit("importVideo", videoList);
// }

async function getGenerateData() {
  const { data } = await axios.post("/production/workbench/getGenerateData", {
    projectId: project.value?.id,
    scriptId: episodesId.value ?? 0,
  });
  trackList.value = data.trackList;
  trackSelectedVideoMap.value = {};
  for (const track of trackList.value) {
    if (track.id != null && track.selectVideoId != null) {
      trackSelectedVideoMap.value[track.id] = track.selectVideoId;
    }
  }
  storyboardList.value = data.storyboardList;
  syncMediasToUploadBox();
  getVideoList();
}

function syncMediasToUploadBox() {
  const track = trackList.value[activeTrackIndex.value];
  if (!track) return;
  const medias = track.medias;
  uploadBox.value = uploadBox.value.map((item, i) => {
    const media = medias[i];
    if (media?.src) {
      return { ...item, src: media.src, id: media.id, prompt: media.prompt, sources: media.sources ?? item.sources };
    }
    return { ...item, src: undefined, id: undefined, prompt: undefined };
  });
}

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
    videoUrl.value = "";
    return;
  }

  const selectedVideo = historyVideo.value.find((v) => v.videoTrackId === track.id && v.id === selectedId);
  if (selectedVideo && selectedVideo.state !== "生成中" && selectedVideo.state !== "生成失败") {
    videoUrl.value = selectedVideo.src;
    return;
  }

  videoUrl.value = "";
}

onMounted(() => {
  selectModel.value = project.value?.videoModel || "";
  selectMode.value = project.value?.mode || "";
  getGenerateData();
});

const hasGeneratedVideo = computed(() => {
  return historyVideo.value.some((v) => v.state === "生成中");
});

let pollTimer: number | null = null;
watch(
  () => hasGeneratedVideo.value,
  (newValue) => {
    if (newValue) {
      pollTimer = window.setInterval(() => {
        getVideoList();
      }, 3000);
    } else {
      if (pollTimer !== null) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
    }
  },
);

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

watch(activeTrackIndex, () => {
  syncMediasToUploadBox();
  restoreActiveTrackSelection();
});
function handleResolutionChange(res: string) {
  selectedResolution.value = res;
}

function handleDurationChange(dur: number) {
  selectedDuration.value = dur;
}
//删除视频
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
      .activeTrackInfo {
        padding: 8px 0;
        gap: 8px;
        margin-bottom: 4px;
      }
      .promptsMenu {
        .title {
          font-weight: bold;
        }
        padding-top: 10px;
        padding-bottom: 10px;
      }
      .promptInput {
        border: 1px solid var(--td-component-border);
        border-radius: 8px;
        max-height: 200px;
        overflow: auto;
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
      gap: 12px;
      overflow-x: auto;
      .item {
        background-color: #fff;
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
      color: #1a1a1a;
      margin-bottom: 10px;
    }

    .pickerOptions {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;

      .pickerOption {
        padding: 6px 0;
        border-radius: 8px;
        border: 1.5px solid #e8e8e8;
        font-size: 13px;
        color: #333;
        cursor: pointer;
        transition: all 0.15s;
        user-select: none;
        text-align: center;
        background: #fff;

        &:hover {
          border-color: #999;
        }

        &.active {
          border-color: #1a1a1a;
          color: #1a1a1a;
          font-weight: 500;
        }
      }
    }
  }
}
</style>
