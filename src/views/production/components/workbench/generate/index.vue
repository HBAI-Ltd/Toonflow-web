<template>
  <div class="index fc">
    <div class="referenceImage">
      <div class="uploadBtn">
        <imageSelect :mode="modelParmas.mode as VideoMode" v-model="imageList" :storyboard-list="storyboardList" />
      </div>
    </div>
    <div class="modelSelect">
      <modeMenu
        v-model="modelParmas"
        :modeOptions="modeOptions"
        :modeList="modeList"
        :effectiveDuration="effectiveDuration"
        @modeChange="modeChange" />
    </div>
    <div class="generate ac">
      <div class="prompt" v-if="currentTrack">
        <t-card :title="'#' + (activeTrackIndex + 1) + $t('workbench.generate.generateText')" header-bordered class="videoPrompt">
          <template #actions>
            <t-button size="small" class="genTextbtn" :loading="activeTrackGenTextLoading" @click="genText">
              {{ $t("workbench.generate.generateText") }}
            </t-button>
          </template>
          <div class="promptData">
            <div class="promptInput" @focusout="handlePromptBlur">
              <promptEditor v-model="currentTrack.prompt" :references="references" :placeholder="$t('workbench.generate.promptPlaceholder')" />
            </div>
          </div>
        </t-card>
      </div>
      <div class="video">
        <videoCard
          v-if="currentTrack"
          :active-track-index="activeTrackIndex"
          v-model:current-track="currentTrack"
          @refresh="getGenerateData"
          @generate="generateVideo" />
      </div>
    </div>
    <div class="track">
      <newTrack
        v-model:activeTrackIndex="activeTrackIndex"
        v-model:genTextLoadingMap="genTextLoadingMap"
        v-model="trackList"
        :image-list="imageList"
        @change="trackChange"
        :modelParmas="modelParmas"
        :clampDuration="clampDuration"
        @getData="getGenerateData" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Ref } from "vue";
import newTrack from "./components/track.vue";
import imageSelect from "./components/imageSelect.vue";
import modeMenu from "./components/modeMenu.vue";
import videoCard from "./components/video.vue";
import "@/views/production/components/workbench/type/type";
import axios from "@/utils/axios";
import projectStore from "@/stores/project";
import promptEditor from "@/components/promptEditor.vue";

const { project } = storeToRefs(projectStore());
const episodesId = inject<Ref<number>>("episodesId")!;
const activeTrackIndex = ref(0);

const modeOptions = ref<VideoModel>({
  name: "",
  modelName: "",
  durationResolutionMap: [],
  audio: false,
  type: "video",
  mode: [],
}); // 当前模型配置

const trackList = ref<TrackItem[]>([]); // 轨道列表

const modelParmas = ref<ModelSetting>({
  mode: "",
  model: "",
  resolution: "480p",
  duration: 8,
  audio: false,
});

const storyboardList = ref<StoryboardItem[]>([]); // 分镜列表
const imageList = ref<UploadItem[]>([]);

function modeChange() {
  imageList.value.length = 0;
  currentTrack.value.prompt = "";
}
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
  function parseRefLabel(m: string): string {
    const match = m.match(/^(videoReference|imageReference|audioReference|textReference):(\d+)$/);
    if (match) {
      const base = modeLabelMap[match[1]] || match[1];
      return `${base} ×${match[2]}`;
    }
    return modeLabelMap[m] || m;
  }
  return modeOptions.value.mode
    ? modeOptions.value.mode.map((mode) =>
        Array.isArray(mode)
          ? { value: JSON.stringify(mode), label: mode.map((m) => parseRefLabel(m)).join(" + ") + "参考" }
          : { value: mode, label: modeLabelMap[mode] || mode },
      )
    : [];
});
const currentTrack = computed({
  get() {
    return trackList.value[activeTrackIndex.value];
  },
  set(val) {
    trackList.value[activeTrackIndex.value] = val;
  },
});
/** 当前轨道是否正在生成提示词 */
const activeTrackGenTextLoading = computed(() => {
  const trackId = trackList.value[activeTrackIndex.value]?.id;
  return trackId != null ? !!genTextLoadingMap.value[trackId] : false;
});
/** 将时长限制在模型支持的范围内 */
function clampDuration(trackDuration: number): number {
  const drMap = modeOptions.value?.durationResolutionMap;
  if (Array.isArray(drMap) && drMap.length > 0 && drMap[0].duration?.length) {
    const durations = drMap[0].duration;
    return Math.max(Math.min(...durations), Math.min(trackDuration, Math.max(...durations)));
  }
  return trackDuration;
}
/** 实际生效时长：用户手动选择优先，否则取轨道时长并 clamp */
const effectiveDuration = computed(() => {
  const trackDuration = trackList.value[activeTrackIndex.value]?.duration || modelParmas.value.duration;
  return clampDuration(trackDuration);
});
watch(
  () => modelParmas.value.model,
  (val) => {
    if (!val) {
      modeOptions.value = {
        name: "",
        modelName: "",
        durationResolutionMap: [],
        audio: false,
        type: "video",
        mode: [],
      };
      modelParmas.value.mode = "";
      return;
    }
    axios.post("/modelSelect/getModelDetail", { modelId: val }).then(({ data }) => {
      modeOptions.value = data;
      modelParmas.value.audio = data.audio === true || data.audio === "true";
      const drMap = data.durationResolutionMap;
      if (Array.isArray(drMap) && drMap.length > 0) {
        if (drMap[0].resolution?.length) modelParmas.value.resolution = drMap[0].resolution[0];
        if (drMap[0].duration?.length) modelParmas.value.duration = drMap[0].duration[0];
      }
    });
  },
);
/** uploadBox 作为 promptEditor 的引用预览 */
const references = computed(() => {
  function getFileTypeByExt(src: string | undefined): "image" | "video" | "audio" {
    const ext = src?.split(".").pop()?.toLowerCase() ?? "";
    if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "video";
    if (["mp3", "wav", "ogg", "aac", "flac", "m4a"].includes(ext)) return "audio";
    return "image";
  }

  return imageList.value
    .filter((item) => item.src)
    .map((item) => ({
      type: getFileTypeByExt(item.src) as "image" | "video" | "audio" | "text",
      src: item.src ?? "",
    }));
});

async function getGenerateData() {
  const { data } = await axios.post("/production/workbench/getGenerateData", {
    projectId: project.value?.id,
    scriptId: episodesId.value ?? 0,
  });

  storyboardList.value = data.storyboardList;
  trackList.value = data.trackList;
  data.trackList.length && (imageList.value = data.trackList[activeTrackIndex.value].medias);
}
/** 提示词失焦时保存到后端 */
function handlePromptBlur() {
  const trackId = trackList.value[activeTrackIndex.value]?.id;
  if (trackId == null) return;
  axios.post("/production/workbench/updateVideoPrompt", { id: trackId, prompt: currentTrack.value?.prompt });
}
const genTextLoadingMap = ref<Record<number, boolean>>({}); // trackId -> 是否正在生成提示词

/** 单个轨道生成提示词 */
async function genText() {
  if (currentTrack.value.id == null || genTextLoadingMap.value[currentTrack.value.id]) return;
  let info = [];
  if (modelParmas.value.mode == "text") {
    info = currentTrack.value?.medias.map(({ id, sources }) => ({ id, sources }));
  } else {
    info =
      modelParmas.value.mode === "text"
        ? []
        : (() => {
            const frameMode = ["startEndRequired", "endFrameOptional", "startFrameOptional"];
            const preSliced = frameMode.includes(modelParmas.value.mode)
              ? imageList.value.slice(0, 2)
              : modelParmas.value.mode === "singleImage"
                ? imageList.value.slice(0, 1)
                : imageList.value;
            const filtered = preSliced.filter((item) => Boolean(item.src) && item.id).map(({ id, sources }) => ({ id, sources }));
            if (frameMode.includes(modelParmas.value.mode)) return filtered.slice(0, 2);
            if (modelParmas.value.mode === "singleImage") return filtered.slice(0, 1);
            return filtered;
          })();
  }
  genTextLoadingMap.value[currentTrack.value.id] = true;
  try {
    const { data } = await axios.post("/production/workbench/generateVideoPrompt", {
      projectId: project.value?.id,
      trackId: currentTrack.value.id,
      info: info,
      model: modelParmas.value.model,
    });
    currentTrack.value.prompt = data;
  } catch (e) {
    window.$message.error((e as Error)?.message ?? "提示词生成失败");
  } finally {
    genTextLoadingMap.value[currentTrack.value.id] = false;
  }
}
function trackChange() {
  trackList.value.length && (imageList.value = trackList.value[activeTrackIndex.value].medias as UploadItem[]);
}
onMounted(() => {
  modelParmas.value.model = project.value?.videoModel || "";
  modelParmas.value.mode = project.value?.mode || "";
  getGenerateData();
});
/** 单个轨道生成视频 */
async function generateVideo() {
  const dlg = DialogPlugin.confirm({
    header: $t("workbench.generate.generateConfirm"),
    body: $t("workbench.generate.generateConfirmBody"),
    onConfirm: async () => {
      dlg.destroy();
      try {
        const { data } = await axios.post("/production/workbench/generateVideo", {
          projectId: project.value?.id,
          scriptId: episodesId.value,
          uploadData:
            modelParmas.value.mode === "text"
              ? []
              : (() => {
                  const frameMode = ["startEndRequired", "endFrameOptional", "startFrameOptional"];
                  const preSliced = frameMode.includes(modelParmas.value.mode)
                    ? imageList.value.slice(0, 2)
                    : modelParmas.value.mode === "singleImage"
                      ? imageList.value.slice(0, 1)
                      : imageList.value;
                  const filtered = preSliced.filter((item) => Boolean(item.src) && item.id).map(({ id, sources }) => ({ id, sources }));
                  if (frameMode.includes(modelParmas.value.mode)) return filtered.slice(0, 2);
                  if (modelParmas.value.mode === "singleImage") return filtered.slice(0, 1);
                  return filtered;
                })(),
          prompt: currentTrack.value.prompt,
          model: modelParmas.value.model,
          mode: modelParmas.value.mode,
          resolution: modelParmas.value.resolution,
          duration: modelParmas.value.duration,
          audio: modelParmas.value.audio,
          trackId: currentTrack.value.id,
        });
        window.$message.success($t("workbench.generate.generateStarted"));
        currentTrack.value.videoList.push({
          id: data,
          state: "生成中",
          src: "",
        });
      } catch (e) {
        window.$message.error((e as any)?.message ?? "视频发起生成请求失败");
      } finally {
      }
    },
    onCancel: () => dlg.destroy(),
  });
}
</script>

<style lang="scss" scoped>
.index {
  height: calc(100vh - 120px);
  gap: 16px;
  overflow: hidden;
  .referenceImage {
  }
  .modelSelect {
  }
  .generate {
    flex: 1;
    width: 100%;
    gap: 5px;
    .prompt {
      width: 50%;
      height: 100%;
      .videoPrompt {
        width: 100%;
        height: 100%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        :deep(.t-card__body) {
          flex: 1;
          min-height: 0;
          overflow: auto;
        }
        .promptData {
          width: 100%;
          height: 100%;
          .promptInput {
            border: 1px solid var(--td-component-border);
            border-radius: 8px;
            min-height: 100px;
            height: 200px;
            overflow: auto;
            resize: vertical;
          }
        }
      }
    }
    .video {
      width: 50%;
      height: 100%;
    }
  }
  .track {
  }
}
</style>
