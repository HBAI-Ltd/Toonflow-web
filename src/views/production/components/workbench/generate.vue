<template>
  <div class="generateContainer">
    <div class="data f">
      <div class="videoToImage">
        <video v-if="videoUrl" :src="videoUrl" class="previewVideo" controls preload="metadata" />
        <div v-else class="emptyVideo c">{{ $t("workbench.noVideo") }}</div>
      </div>
      <div class="configurationParameters">
        <div class="promptsMenu f ac jb">
          <div class="title">{{ $t("workbench.prompt") }}</div>
          <t-button size="small" class="genTextbtn">{{ $t("workbench.generateText") }}</t-button>
        </div>
        <div class="promptInput">
          <t-textarea class="input" v-model="promptText" :autosize="{ minRows: 4, maxRows: 12 }" />
        </div>
        <div class="modeOpt f">
          <div class="uploadBtn c fc" v-for="(item, index) in uploadBox" :key="index" @click="handleSelectSource(index)">
            <template v-if="item.src">
              <img :src="item.src" class="uploadPreview" />
            </template>
            <template v-else>
              <i-plus size="24"></i-plus>
              {{ item.label }}
            </template>
          </div>
        </div>
        <!-- 分镜选择弹窗 -->
        <t-dialog v-model:visible="storyboardDialogVisible" :header="$t('workbench.selectStoryboard')" :footer="false" width="600px">
          <div class="storyboardGrid">
            <div class="storyboardItem" v-for="sb in storyboardList" :key="sb.id" @click="pickStoryboard(sb)">
              <img :src="sb.src" />
            </div>
          </div>
        </t-dialog>

        <div class="modeMenu f ac jb">
          <div class="left f ac">
            <div class="model">
              <modelSelect v-model="tempModel" type="video" size="small" />
            </div>
            <t-select size="small" class="mode" v-model="tempMode">
              <t-option v-for="item in modeOptions" :key="item.value" :value="item.value" :label="item.label"></t-option>
            </t-select>
            <t-button size="small" variant="outline" class="audio" @click="selectedAudio = !selectedAudio">
              <template #icon>
                <i-volume-notice v-if="selectedAudio" size="16" />
                <i-volume-mute v-else size="16" />
              </template>
            </t-button>
            <div class="status">
              <span>{{ selectedResolution }}·{{ selectedDuration }}s</span>
            </div>
          </div>
          <div class="genBtn">
            <t-button size="small" :loading="generating" @click="generateVideo">{{ $t("generate") }}</t-button>
          </div>
        </div>
        <div class="history">
          <div class="titleBox f ac">
            <i-time />
            <span class="title">{{ $t("history") }}（{{ activeVideoList.length }}）</span>
          </div>
          <div class="itemBox">
            <div class="item" :class="{ active: v.id === selectedVideoId }" v-for="v in activeVideoList" :key="v.id" @click="selectVideo(v)">
              <video :src="v.src" preload="metadata" muted />
              <t-tag v-if="v.state === '生成中'" class="stateTag" theme="primary" size="small">{{ $t("generating") }}</t-tag>
              <t-tag v-else-if="v.state === '生成失败'" class="stateTag" theme="danger" size="small">{{ $t("generateFailed") }}</t-tag>
              <i-check-one v-if="v.id === selectedVideoId" class="checkIcon" size="20" />
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="videoTrack">
      <div class="trackMenu f ac jb">
        <div class="left f ac">
          <t-checkbox v-model="checkAll" @change="handleCheckAll">{{ $t("selectAll") }}</t-checkbox>
          <span class="selectedCount" v-if="checkedTracks.length">{{ $t("selected") }} {{ checkedTracks.length }} 段</span>
        </div>
        <div class="right f ac">
          <t-button size="small" variant="outline" @click="batchGenText">{{ $t("batchGenerateText") }}</t-button>
          <t-button size="small" variant="outline" @click="batchGenVideo">{{ $t("batchGenerateVideo") }}</t-button>
          <t-button size="small" variant="outline" @click="importVideo">{{ $t("importVideo") }}</t-button>
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
          <div class="thumbGroup" v-if="track.medias.length">
            <template v-for="(m, i) in track.medias" :key="i">
              <img v-if="m.fileType === 'image'" :src="m.src" class="thumb" />
              <div v-else class="thumb placeholder c">
                <i-volume-notice v-if="m.fileType === 'audio'" size="20" />
                <span v-else>Video</span>
              </div>
            </template>
          </div>
          <span v-else class="emptyTrack">{{ $t("emptyTrack", index + 1) }}</span>
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
import assetsCheck, { type AssetType } from "@/utils/assetsCheck";
import { DialogPlugin } from "tdesign-vue-next";
import axios from "@/utils/axios";
import projectStore from "@/stores/project";

const props = defineProps<{
  episodesId?: number;
}>();

const { project } = storeToRefs(projectStore());

const videoUrl = ref("");
const promptText = ref("");
const selectedResolution = ref("480p");
const selectedDuration = ref(8);
const selectedAudio = ref(false);
const generating = ref(false);

interface VideoItem {
  id: number;
  src: string;
  state: "未生成" | "生成中" | "已完成" | "生成失败";
}

const selectedVideoId = ref<number | null>(null);

const activeVideoList = computed(() => {
  const track = trackList.value[activeTrackIndex.value];
  return track ? track.videoList : [];
});

function selectVideo(v: VideoItem) {
  selectedVideoId.value = v.id;
  videoUrl.value = v.src;
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

interface ModeOption {
  label: string;
  value: string;
}

const modeOptions = ref<ModeOption[]>([]);

const tempModel = ref("");
const tempMode = ref("");

type Mode = VideoMode[];

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
  fileType: "image" | "video" | "audio";
}

interface TrackItem {
  id?: number;
  medias: TrackMedia[];
  videoList: VideoItem[];
}

const trackList = ref<TrackItem[]>([{ medias: [], videoList: [] }]);
const activeTrackIndex = ref(0);

async function addTrack() {
  const { data } = await axios.post("/production/workbench/addTrack", {
    projectId: project.value?.id,
    scriptId: props.episodesId ?? 0,
  });
  trackList.value.push({ id: data.id, medias: [], videoList: [] });
  activeTrackIndex.value = trackList.value.length - 1;
}

function confirmDeleteTrack(index: number) {
  const dlg = DialogPlugin.confirm({
    header:$t("del"),
    body: $t("delConfirm"),
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
    trackList.value.push({ medias: [], videoList: [] });
  }
  if (activeTrackIndex.value >= trackList.value.length) {
    activeTrackIndex.value = trackList.value.length - 1;
  }
}

const uploadBox = ref<UploadItem[]>([]);

interface StoryboardItem {
  id: number;
  src: string;
  prompt?: string;
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
    header: $t("selectSource"),
    confirmBtn: $t("confirm"),
    cancelBtn: $t("cancel"),
    onConfirm: async () => {
      dlg.destroy();
      const assets = await assetsCheck({ types: fileTypeMap[item.fileType], multiple: false });
      if (assets.length > 0) {
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
  uploadBox.value[pendingIndex.value] = { ...item, sources: "storyboard", src: sb.src, id: sb.id, prompt: sb.prompt };
}

async function generateVideo() {
  if (generating.value) return;
  generating.value = true;
  try {
    const payload = {
      projectId: project.value?.id,
      scriptId: props.episodesId ?? 0,
      uploadData: uploadBox.value,
      prompt: promptText.value,
      model: tempModel.value,
      mode: tempMode.value,
      resolution: selectedResolution.value,
      duration: selectedDuration.value,
      audio: selectedAudio.value,
    };
    const { data } = await axios.post("/production/workbench/generateVideo", payload);
    const newVideo: VideoItem = { id: data.id, src: data.src, state: data.state || "生成中" };
    const track = trackList.value[activeTrackIndex.value];
    if (track) track.videoList.unshift(newVideo);
    selectVideo(newVideo);
  } finally {
    generating.value = false;
  }
}

watch(tempModel, (val) => {
  if (!val) {
    modeOptions.value = [];
    tempMode.value = "";
    return;
  }
  const modeLabelMap: Record<string, string> = {
    singleImage: "单图",
    startEndRequired: "首尾帧",
    endFrameOptional: "尾帧可选",
    startFrameOptional: "首帧可选",
    text: "文本生视频",
    videoReference: "视频参考",
    imageReference: "图片参考",
    audioReference: "音频参考",
    textReference: "文本参考",
  };

  axios.post("/modelSelect/getModelDetail", { modelId: val }).then(({ data }) => {
    const mode = data.mode as Mode;
    modeOptions.value = mode.map((item) => ({
      label: Array.isArray(item) ? item.map((modeItem) => modeLabelMap[modeItem] || modeItem).join(" + ") : modeLabelMap[item] || item,
      value: Array.isArray(item) ? JSON.stringify(item) : item,
    }));

    tempMode.value = modeOptions.value[0]?.value || "";
  });
});

watch(tempMode, (val) => {
  uploadBox.value = buildUploadBox(val);
});

watch(
  uploadBox,
  (items) => {
    const track = trackList.value[activeTrackIndex.value];
    if (!track) return;
    track.medias = items.filter((item) => item.src).map((item) => ({ src: item.src!, id: item.id, fileType: item.fileType }));
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
    scriptId: props.episodesId ?? 0,
  });
  trackList.value = data;
}

onMounted(() => {
  tempModel.value = project.value?.videoModel || "";
  tempMode.value = project.value?.mode || "";
  getGenerateData();
});

const hasGeneratedVideo = computed(() => {
  const track = trackList.value[activeTrackIndex.value];
  return track ? track.videoList.some((v) => v.state === "已完成") : false;
});

watch(
  () => hasGeneratedVideo.value,
  () => {},
);
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
        }
      }
      .storyboardGrid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        max-height: 400px;
        overflow-y: auto;
        .storyboardItem {
          cursor: pointer;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid transparent;
          &:hover {
            border-color: var(--td-brand-color);
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
            border: 2px solid transparent;
            &.active {
              border-color: var(--td-brand-color);
            }
            &:hover {
              filter: brightness(90%);
            }
            video {
              width: 100%;
              height: 100%;
              object-fit: cover;
              pointer-events: none;
            }
            .checkIcon {
              position: absolute;
              top: 4px;
              right: 4px;
              color: var(--td-brand-color);
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
      gap: 4px;
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
        }
        &:hover {
          filter: brightness(90%);
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
