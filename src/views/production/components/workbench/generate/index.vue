<template>
  <div class="index fc">
    <div class="referenceImage">
      <div class="uploadBtn">
        <imageSelect :mode="modelOption.mode" v-model="imageList" :storyboard-list="storyboardList" />
      </div>
    </div>
    <div class="modelSelect">
      <modeMenu
        v-model:selectModel="selectModel"
        v-model:selectMode="selectMode"
        v-model:selectedResolution="selectedResolution"
        v-model:selectedDuration="selectedDuration"
        v-model:selectedAudio="selectedAudio"
        :modeOptions="modeOptions"
        :modeList="modeList"
        :effectiveDuration="effectiveDuration" />
    </div>
    <div class="generate ac">
      <div class="prompt">
        <t-card :title="'#' + (activeTrackIndex + 1) + $t('workbench.generate.generateText')" header-bordered class="videoPrompt">
          <template #actions>
            <t-button size="small" class="genTextbtn" :loading="activeTrackGenTextLoading" @click="genText">
              {{ $t("workbench.generate.generateText") }}
            </t-button>
          </template>
          <div class="promptData">
            <div class="promptInput" @focusout="handlePromptBlur">
              <promptEditor v-model="promptText" :references="references" :placeholder="$t('workbench.generate.promptPlaceholder')" />
            </div>
          </div>
        </t-card>
      </div>
      <div class="video">
        <t-card :title="'#' + (activeTrackIndex + 1) + $t('workbench.generate.videoMenu')" header-bordered>
          <template #actions>
            <t-button size="small">{{ $t("workbench.generate.generate") }}</t-button>
          </template>
        </t-card>
      </div>
    </div>
    <div class="track">
      <newTrack v-model:activeTrackIndex="activeTrackIndex" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Ref } from "vue";
import newTrack from "./components/track.vue";
import imageSelect from "./components/imageSelect.vue";
import modeMenu from "./components/modeMenu.vue";
import "@/views/production/components/workbench/type/type";
import axios from "@/utils/axios";
import projectStore from "@/stores/project";
import promptEditor from "@/components/promptEditor.vue";

const { project } = storeToRefs(projectStore());
const episodesId = inject<Ref<number>>("episodesId")!;
const activeTrackIndex = ref(0);
//生成提示词load
const activeTrackGenTextLoading = ref(false);
const promptText = ref("");

const modeOptions = ref<VideoModel>({}); // 当前模型配置
const modelOption = ref({
  mode: "singleImage" as VideoMode,
});

const trackList = ref<TrackItem[]>([]); // 轨道列表
const selectedResolution = ref("480p"); // 当前分辨率
const selectedDuration = ref(8); // 当前时长
const selectedAudio = ref(false); // 是否启用音频
const selectModel = ref<string>(); // 当前选中模型
const selectMode = ref<string>(); // 当前选中模式

const storyboardList = ref<StoryboardItem[]>([]); // 分镜列表
const imageList = ref<UploadItem[]>([
  {
    id: 97,
    sources: "assets",
    fileType: "image",
    src: "http://localhost:10588/oss/1775541314550/scene/14690396-e918-4fea-8488-404aa6727d07.jpg",
  },
]);

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
    ? modeOptions.value.mode.map((mode) =>
        Array.isArray(mode)
          ? { value: JSON.stringify(mode), label: mode.map((m) => modeLabelMap[m] || m).join(" + ") + "参考" }
          : { value: mode, label: modeLabelMap[mode] || mode },
      )
    : [];
});

/** 将时长限制在模型支持的范围内 */
function clampDuration(trackDuration: number): number {
  const drMap = modeOptions.value.durationResolutionMap;
  if (Array.isArray(drMap) && drMap.length > 0 && drMap[0].duration?.length) {
    const durations = drMap[0].duration;
    return Math.max(Math.min(...durations), Math.min(trackDuration, Math.max(...durations)));
  }
  return trackDuration;
}
/** 实际生效时长：用户手动选择优先，否则取轨道时长并 clamp */
const effectiveDuration = computed(() => {
  const trackDuration = trackList.value[activeTrackIndex.value]?.duration || selectedDuration.value;
  return clampDuration(trackDuration);
});

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
  console.log("%c Line:37 🥪 data", "background:#fca650", data);
}
/** 提示词失焦时保存到后端 */
function handlePromptBlur() {
  // const trackId = trackList.value[activeTrackIndex.value]?.id;
  // if (trackId == null) return;
  // axios.post("/production/workbench/updateVideoPrompt", { id: trackId, prompt: promptText.value });
}
/** 单个轨道生成提示词 */
async function genText() {
  console.log("%c Line:70 🍧", "background:#2eafb0", "生成视频提示词");
  // try {
  //   const { data } = await axios.post("/production/workbench/generateVideoPrompt", {
  //     projectId: project.value?.id,
  //     trackId,
  //     info: info,
  //     model: selectModel.value,
  //   });
  // } catch (e) {
  //   window.$message.error((e as Error)?.message ?? "提示词生成失败");
  // } finally {
  // }
}

onMounted(() => {
  getGenerateData();
});
</script>

<style lang="scss" scoped>
.index {
  height: calc(100vh - 120px);
  gap: 16px;
  overflow: hidden;
  .referenceImage {
    border: 1px solid red;
  }
  .modelSelect {
    border: 1px solid green;
  }
  .generate {
    flex: 1;
    width: 100%;
    gap: 5px;
    .prompt {
      width: 50%;
      height: 100%;
      border: 1px solid #787878;
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
      border: 1px solid #0625cf;
    }
  }
  .track {
  }
}
</style>
