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
          <t-button size="small" class="genTextbtn" :loading="genTextLoading" @click="genText">{{ $t("workbench.generate.generateText") }}</t-button>
        </div>
        <div class="promptInput">
          <t-textarea class="input" v-model="promptText" :autosize="{ minRows: 4, maxRows: 12 }" :disabled="genTextLoading" />
        </div>
        <div class="modeOpt f">
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
            <t-button size="small" variant="outline" class="audio" @click="selectedAudio = !selectedAudio">
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
                      <div class="pickerLabel">分辨率</div>
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
                      <div class="pickerLabel">时长</div>
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
          <div class="itemBox">
            <div
              class="item"
              :class="{ active: v.id === selectedVideoId, generating: v.state === '生成中', failed: v.state === '生成失败' }"
              v-for="v in activeTrackVideos"
              :key="v.id"
              @click="previewVideo(v)">
              <video :src="v.src" preload="metadata" muted />
              <div v-if="v.state === '生成中'" class="loadingOverlay c fc">
                <t-loading size="24px" />
                <span class="loadingText">{{ $t("workbench.generate.generating") }}</span>
              </div>
              <t-tag v-else-if="v.state === '生成失败'" class="stateTag" theme="danger" size="small">
                {{ $t("workbench.generate.generateFailed") }}
              </t-tag>
              <div v-if="v.state !== '生成中'" class="selectBtn" @click.stop="selectVideo(v)">
                <i-check-one v-if="v.id === selectedVideoId" size="16" />
                <i-check size="16" v-else />
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
          <span class="selectedCount" v-if="checkedTracks.length">{{ $t("workbench.generate.selected") }} {{ checkedTracks.length }} 段</span>
        </div>
        <div class="right f ac">
          <t-button size="small" variant="outline" @click="batchGenText">{{ $t("workbench.generate.batchGenerateText") }}</t-button>
          <t-button size="small" variant="outline" @click="batchGenVideo">{{ $t("workbench.generate.batchGenerateVideo") }}</t-button>
          <t-button size="small" variant="outline" @click="importVideo">{{ $t("workbench.generate.importVideo") }}</t-button>
        </div>
      </div>
      <div class="itemBox">
        <div
          class="item"
          :class="{ active: index === activeTrackIndex }"
          v-for="(track, index) in trackList"
          :key="index"
          @click="activeTrackIndex = index">
          <t-checkbox class="trackCheck" :checked="checkedTracks.includes(index)" @click.stop @change="(val: boolean) => toggleCheck(index, val)" />
          <t-tag class="indexTag" size="small">#{{ index + 1 }}</t-tag>
          <div class="thumbGroup" v-if="track.medias.length">
            <template v-for="(m, i) in track.medias" :key="i">
              <img v-if="m.fileType === 'image'" :src="m.src" class="thumb" />
              <div v-else class="thumb placeholder c">
                <i-volume-notice v-if="m.fileType === 'audio'" size="20" />
                <span v-else>Video</span>
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
import assetsCheck, { type AssetType } from "@/utils/assetsCheck";
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
const genTextLoading = ref(false);

async function genText() {
  if (genTextLoading.value) return;
  const prompts = uploadBox.value.filter((item) => item.prompt).map((item) => item.prompt!);
  genTextLoading.value = true;
  try {
    const { data } = await axios.post("/production/workbench/generateVideoPrompt", {
      projectId: project.value?.id,
      trackId: trackList.value[activeTrackIndex.value]?.id,
      prompt: prompts,
      model: selectModel.value,
    });
    promptText.value = data;
  } finally {
    genTextLoading.value = false;
  }
}

interface VideoItem {
  id: number;
  src: string;
  state: "未生成" | "生成中" | "已完成" | "生成失败";
}

const selectedVideoId = ref<number | null>(null);

interface HistoryVideoItem {
  errorReason?: string | null;
  src: string;
  id?: number;
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

function selectVideo(v: HistoryVideoItem) {
  if (v.state === "生成中" || v.state === "生成失败") return;
  const dlg = DialogPlugin.confirm({
    header: $t("workbench.generate.selectVideoConfirm"),
    body: $t("workbench.generate.selectVideoConfirmBody"),
    onConfirm: async () => {
      dlg.destroy();
      if (v.id != null) selectedVideoId.value = v.id;
      videoUrl.value = v.src;
      try {
        await axios.post("/production/workbench/selectVideo", {
          projectId: project.value?.id,
          scriptId: episodesId.value ?? 0,
          videoId: v.id,
          trackId: trackList.value[activeTrackIndex.value]?.id,
        });
      } catch (e) {
        console.error("selectVideo failed", e);
      }
    },
    onCancel: () => {
      dlg.destroy();
    },
  });
}

type ReferenceType = "videoReference" | "imageReference" | "audioReference" | "textReference";
type Type = "imageReference" | "startImage" | "endImage" | "videoReference" | "audioReference";
type VideoMode = "singleImage" | "startEndRequired" | "endFrameOptional" | "startFrameOptional" | "text" | ReferenceType[];

interface UploadItem {
  fileType: "image" | "video" | "audio";
  type: Type;
  sources?: "assets" | "storyboard";
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
}

interface TrackItem {
  id?: number;
  prompt: string;
  state: "未生成" | "生成中" | "已完成" | "生成失败";
  reason?: string;
  medias: TrackMedia[];
  videoList: VideoItem[];
}
const trackList = ref<TrackItem[]>([{ prompt: "", state: "未生成", medias: [], videoList: [] }]);
const activeTrackIndex = ref(0);

async function addTrack() {
  const { data } = await axios.post("/production/workbench/addTrack", {
    projectId: project.value?.id,
    scriptId: episodesId.value ?? 0,
  });
  trackList.value.push({ id: data.id, prompt: "", state: "未生成", medias: [], videoList: [] });
  activeTrackIndex.value = trackList.value.length - 1;
}

function confirmDeleteTrack(index: number) {
  const dlg = DialogPlugin.confirm({
    header: $t("workbench.generate.del"),
    body: $t("workbench.generate.delConfirm"),
    onConfirm: () => {
      dlg.destroy();
      deleteTrack(index);
    },
    onCancel: () => {
      dlg.destroy();
    },
  });
}

async function deleteTrack(index: number) {
  const track = trackList.value[index];
  if (!track) return;
  // TODO: 接口请求
  // await axios.post("/production/workbench/deleteTrack", { index });
  trackList.value.splice(index, 1);
  if (trackList.value.length === 0) {
    trackList.value.push({ prompt: "", state: "未生成", medias: [], videoList: [] });
  }
  if (activeTrackIndex.value >= trackList.value.length) {
    activeTrackIndex.value = trackList.value.length - 1;
  }
}

const uploadBox = ref<UploadItem[]>([]);

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
    videoReference: { fileType: "video", type: "videoReference", label: "参考视频" },
    imageReference: { fileType: "image", type: "imageReference", label: "参考图片" },
    audioReference: { fileType: "audio", type: "audioReference", label: "参考音频" },
  };

  const modeUploadMap: Record<Exclude<VideoMode, ReferenceType[]>, UploadItem[]> = {
    singleImage: [{ fileType: "image", type: "imageReference", label: "参考图片" }],
    startEndRequired: [
      { fileType: "image", type: "startImage", label: "首帧" },
      { fileType: "image", type: "endImage", label: "末帧" },
    ],
    endFrameOptional: [
      { fileType: "image", type: "startImage", label: "首帧" },
      { fileType: "image", type: "endImage", label: "末帧(可选)" },
    ],
    startFrameOptional: [
      { fileType: "image", type: "startImage", label: "首帧(可选)" },
      { fileType: "image", type: "endImage", label: "末帧" },
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

function pickStoryboard(sb: StoryboardItem) {
  storyboardDialogVisible.value = false;
  const item = uploadBox.value[pendingIndex.value];
  if (!item) return;
  userEditedUploadBox.value = true;
  uploadBox.value[pendingIndex.value] = { ...item, sources: "storyboard", src: sb.src, id: sb.id, prompt: sb.prompt ?? undefined };
}

function clearUpload(index: number) {
  const item = uploadBox.value[index];
  if (!item) return;
  userEditedUploadBox.value = true;
  uploadBox.value[index] = { ...item, sources: undefined, src: undefined, id: undefined, prompt: undefined };
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
          uploadData: uploadBox.value,
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
  });
});

const userEditedUploadBox = ref(false);

watch(selectMode, (val) => {
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
    track.medias = items.filter((item) => item.src).map((item) => ({ src: item.src!, id: item.id, prompt: item.prompt, fileType: item.fileType }));
  },
  { deep: true },
);

const checkedTracks = ref<number[]>([]);
const checkAll = ref(false);

function handleCheckAll(val: boolean) {
  checkedTracks.value = val ? trackList.value.map((_, i) => i) : [];
}

function toggleCheck(index: number, val: boolean) {
  if (val) {
    checkedTracks.value.push(index);
  } else {
    checkedTracks.value = checkedTracks.value.filter((i) => i !== index);
  }
  checkAll.value = checkedTracks.value.length === trackList.value.length;
}

function batchGenText() {
  // TODO
}

function batchGenVideo() {
  // TODO
}

function importVideo() {
  // TODO
}

async function getGenerateData() {
  const { data } = await axios.post("/production/workbench/getGenerateData", {
    projectId: project.value?.id,
    scriptId: episodesId.value ?? 0,
  });
  trackList.value = data.trackList;
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
      return { ...item, src: media.src, id: media.id, prompt: media.prompt };
    }
    return { ...item, src: undefined, id: undefined, prompt: undefined };
  });
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
});
function handleResolutionChange(res: string) {
  selectedResolution.value = res;
}

function handleDurationChange(dur: number) {
  selectedDuration.value = dur;
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
        background: var(--td-bg-color-secondarycontainer);
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
        .itemBox {
          height: 100%;
          overflow: hidden;
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 8px;
          .item {
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
              left: 4px;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background: rgba(0, 0, 0, 0.5);
              color: #fff;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: background 0.2s;
              &:hover {
                background: var(--td-brand-color);
              }
            }
            &.active .selectBtn {
              background: var(--td-brand-color);
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
