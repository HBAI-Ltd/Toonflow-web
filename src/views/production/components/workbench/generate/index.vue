<template>
  <div class="index fc">
    <div class="referenceImage">
      <div class="uploadBtn">
        <imageSelect :mode="modelParmas.mode as VideoMode" v-model="imageList" :storyboard-list="storyboardList" />
      </div>
    </div>
    <div class="modelSelect">
      <modeMenu v-model="modelParmas" :modeOptions="modeOptions" :trackId="currentTrack?.id" :modeList="modeList" @modeChange="modeChange" />
    </div>
    <div class="generate ac">
      <div class="prompt" v-if="currentTrack">
        <t-card :title="'#' + (activeTrackIndex + 1) + $t('workbench.generate.generateText')" header-bordered class="videoPrompt">
          <template #actions>
            <t-button size="small" class="genTextbtn" :loading="currentTrack.state == '生成中'" @click="genText">
              {{ $t("workbench.generate.generateText") }}
            </t-button>
          </template>
          <div class="promptData fc">
            <div class="promptInput" @focusout="handlePromptBlur">
              <promptEditor v-model="currentTrack.prompt" :references="references" :placeholder="$t('workbench.generate.promptPlaceholder')" />
            </div>
          </div>
        </t-card>
        <div class="manualAssist" v-if="isManualMode">
          <div class="manualHeader f ac jb">
            <span class="manualTitle">{{ manualModeTitle }}</span>
            <t-button size="small" variant="outline" @click="copyCurrentPrompt">复制提示词</t-button>
          </div>
          <div class="manualHint">
            {{
              isSmartManualMode
                ? "按当前顺序复制帧图到即梦智能多帧，逐段复制帧间过渡提示词。"
                : "复制或下载参考素材到即梦全能参考，官网生成后上传视频回填当前轨道。"
            }}
          </div>
          <div class="frameWorkspace" v-if="isSmartManualMode">
            <div class="frameItem" v-for="(frame, index) in smartFrameItems" :key="`${frame.sources}-${frame.id}-${index}`">
              <div class="frameThumb">
                <img v-if="frame.src" :src="frame.src" />
                <span v-else>无图</span>
              </div>
              <div class="frameMeta f ac jb">
                <span>第 {{ index + 1 }} 帧</span>
                <small>{{ getFrameSourceLabel(frame, index) }}</small>
              </div>
              <t-button size="small" variant="text" block @click="copyFrameImage(frame)">复制帧图</t-button>
              <template v-if="index < smartFrameItems.length - 1">
                <div class="transitionText">{{ buildSmartFrameTransitionText(index) }}</div>
                <t-button size="small" variant="text" block @click="copyText(buildSmartFrameTransitionText(index))">复制过渡提示词</t-button>
              </template>
            </div>
            <div class="emptyFrameHint" v-if="smartFrameItems.length < 2">智能多帧建议至少选择 2 张图片帧。</div>
          </div>
        </div>
      </div>
      <div class="video">
        <videoCard
          v-if="currentTrack"
          :active-track-index="activeTrackIndex"
          :manual-mode="isManualMode"
          v-model:current-track="currentTrack"
          @refresh="getGenerateData"
          @copyPrompt="copyCurrentPrompt"
          @generate="generateVideo" />
      </div>
    </div>
    <div class="track">
      <newTrack
        v-model:activeTrackIndex="activeTrackIndex"
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
import imageListCacheStore from "@/stores/imageListCache";
import {
  appendManualVideoModeOptions,
  buildSmartFrameTransitionText,
  getPromptGenerationMode,
  isJimengOrSeedanceModel,
  isManualSmartMultiFrameMode,
  isManualVideoMode,
  MANUAL_OMNI_REFERENCE_MODE,
  MANUAL_SMART_MULTI_FRAME_MODE,
} from "@/utils/manualVideoModes";

const { project } = storeToRefs(projectStore());
const episodesId = inject<Ref<number>>("episodesId")!;
const activeTrackIndex = ref(0);
const cacheStore = imageListCacheStore();
const { getCache, setCache, removeCache, initCacheFromTrackList, warmUpUrls } = cacheStore;
const { urlMap } = storeToRefs(cacheStore);

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

/** 排序优先级：assets有图=0，storyboard有图=1，无图=2 */
function getImageItemPriority(item: UploadItem): number {
  if (item.src) return item.sources === "assets" ? 0 : 1;
  return 2;
}

const imageList = computed({
  get(): UploadItem[] {
    // 触发对 urlMap 的依赖追踪，当 warmUpUrls 更新 urlMap 后自动重新计算
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    urlMap.value;
    const trackId = currentTrack.value?.id;
    const pid = project.value?.id;
    const sid = episodesId.value;
    // 优先从缓存读取
    if (pid != null && sid != null && trackId != null) {
      const cached = getCache(pid, sid, trackId);

      if (cached?.length) {
        const list = [...cached];
        return isSmartManualMode.value ? list : list.sort((a, b) => getImageItemPriority(a) - getImageItemPriority(b));
      }
    }
    const medias = currentTrack.value?.medias;
    if (!medias?.length) return [];
    const list = [...(medias as UploadItem[])];
    return isSmartManualMode.value ? list : list.sort((a, b) => getImageItemPriority(a) - getImageItemPriority(b));
  },
  set(val: UploadItem[]) {
    if (currentTrack.value) {
      currentTrack.value.medias = val as any;
      // 同步写入缓存
      const pid = project.value?.id;
      const sid = episodesId.value;
      const trackId = currentTrack.value.id;
      if (pid != null && sid != null && trackId != null) {
        setCache(pid, sid, trackId, val);
      }
    }
  },
});

function modeChange(newVal: string) {
  if (newVal == modelParmas.value.mode) return;
  if ((imageList.value.length || currentTrack.value?.prompt) && modelParmas.value.mode) {
    const dialog = DialogPlugin.confirm({
      header: $t("workbench.generate.modeChange"),
      body: $t("workbench.generate.modeChangeConfirm"),
      confirmBtn: $t("settings.generate.modelChnageSure"),
      cancelBtn: $t("settings.memory.msg.cancel"),
      onConfirm: async () => {
        imageList.value = [];
        currentTrack.value.prompt = "";
        dialog.destroy();
        modelParmas.value.mode = newVal;
      },
    });
  } else if (newVal) {
    modelParmas.value.mode = newVal;
  }
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
  const options = modeOptions.value.mode
    ? modeOptions.value.mode.map((mode) =>
        Array.isArray(mode)
          ? { value: JSON.stringify(mode), label: mode.map((m) => parseRefLabel(m)).join(" + ") + "参考" }
          : { value: mode, label: modeLabelMap[mode] || mode },
      )
    : [];
  return appendManualVideoModeOptions(options, manualModeModelKey.value);
});
const manualModeModelKey = computed(() => `${modelParmas.value.model} ${modeOptions.value.name} ${modeOptions.value.modelName}`);
const isManualMode = computed(() => isManualVideoMode(modelParmas.value.mode));
const isSmartManualMode = computed(() => isManualSmartMultiFrameMode(modelParmas.value.mode));
const manualModeTitle = computed(() => {
  if (modelParmas.value.mode === MANUAL_SMART_MULTI_FRAME_MODE) return "即梦智能多帧官网辅助";
  if (modelParmas.value.mode === MANUAL_OMNI_REFERENCE_MODE) return "即梦全能参考官网辅助";
  return "即梦官网辅助";
});
const smartFrameItems = computed(() => imageList.value.filter((item) => item.fileType === "image" && item.src));
const currentTrack = computed({
  get() {
    return trackList.value[activeTrackIndex.value];
  },
  set(val) {
    trackList.value[activeTrackIndex.value] = val;
  },
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
      modelParmas.value.audio = data.audio === true || data.audio === "true" || data.audio == "optional";
      const drMap = data.durationResolutionMap;
      if (Array.isArray(drMap) && drMap.length > 0) {
        if (drMap[0].resolution?.length) modelParmas.value.resolution = drMap[0].resolution[0];
        if (drMap[0].duration?.length) modelParmas.value.duration = clampDuration(modelParmas.value.duration);
      }

      const currentParsed = parseMode(modelParmas.value.mode);
      const modeMatched =
        (isManualVideoMode(currentParsed) && isJimengOrSeedanceModel(`${val} ${data.name} ${data.modelName}`)) ||
        (currentParsed !== null &&
          data.mode.some((m: VideoMode) => {
            if (Array.isArray(m) && Array.isArray(currentParsed)) {
              return JSON.stringify(m) === JSON.stringify(currentParsed);
            }
            return m == currentParsed;
          }));
      if (!modeMatched) {
        const newMode = Array.isArray(data.mode[0]) ? JSON.stringify(data.mode[0]) : data.mode[0];
        modeChange(newMode);
      }
    });
  },
);
function parseMode(value: string): VideoMode | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed as ReferenceType[];
  } catch {
    return value as Exclude<VideoMode, ReferenceType[]>;
  }
  return value as Exclude<VideoMode, ReferenceType[]>;
}
/** uploadBox 作为 promptEditor 的引用预览 */
const references = computed(() => {
  function getFileTypeByExt(src: string | undefined): "image" | "video" | "audio" {
    if (!src) return "image";
    // 去掉 query 和 hash 部分
    const cleanSrc = src.split("?")[0].split("#")[0];
    const ext = cleanSrc.split(".").pop()?.toLowerCase() ?? "";

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
  // 优先使用本地缓存，没有缓存则用后端数据并写入缓存
  const pid = project.value?.id;
  const sid = episodesId.value;
  if (pid != null && sid != null) {
    // 先将没有缓存的轨道写入缓存（保留已有本地编辑）
    initCacheFromTrackList(pid, sid, data.trackList);
    // 批量向后端请求文件路径对应的完整 URL
    await warmUpUrls(pid, sid);
    // 将本地缓存回写到 trackList，确保优先使用缓存数据（src 已解析为完整 URL）
    data.trackList.forEach((track: TrackItem) => {
      if (track.id == null) return;
      const cached = getCache(pid, sid, track.id);
      if (cached?.length) {
        track.medias = cached as unknown as TrackMedia[];
      }
    });
    // 整体赋值触发响应式
    trackList.value = [...data.trackList];
  }

  modelParmas.value.duration = clampDuration(data.trackList?.[activeTrackIndex.value]?.duration);
}
/** 提示词失焦时保存到后端 */
function handlePromptBlur() {
  const trackId = trackList.value[activeTrackIndex.value]?.id;
  if (trackId == null) return;
  axios.post("/production/workbench/updateVideoPrompt", { id: trackId, prompt: currentTrack.value?.prompt });
}

/** 单个轨道生成提示词 */
async function genText() {
  const track = currentTrack.value;
  if (track.id == null || track.state === "生成中") return;
  let info: { id: number; sources: string }[] = [];
  const currentTrackId = track.id;
  const rawMedias = (track.medias ?? []) as UploadItem[];
  if (modelParmas.value.mode == "text") {
    info = rawMedias.map(({ id, sources }) => ({ id: id!, sources }));
  } else {
    const frameMode = ["startEndRequired", "endFrameOptional", "startFrameOptional"];
    const preSliced = frameMode.includes(modelParmas.value.mode)
      ? rawMedias.slice(0, 2)
      : modelParmas.value.mode === "singleImage"
        ? rawMedias.slice(0, 1)
        : rawMedias;
    const filtered = preSliced.filter((item) => typeof item.id === "number" && !isNaN(item.id)).map(({ id, sources }) => ({ id: id!, sources }));
    if (frameMode.includes(modelParmas.value.mode)) info = filtered.slice(0, 2);
    else if (modelParmas.value.mode === "singleImage") info = filtered.slice(0, 1);
    else info = filtered;
  }
  track.state = "生成中";
  try {
    const { data } = await axios.post("/production/workbench/generateVideoPrompt", {
      projectId: project.value?.id,
      trackId: currentTrackId,
      info: info,
      model: modelParmas.value.model,
      mode: getPromptGenerationMode(modelParmas.value.mode),
    });
    track.prompt = data;
    track.state = "已完成";
  } catch (e) {
    track.state = "生成失败";
    window.$message.error((e as Error)?.message ?? "提示词生成失败");
  }
}
async function copyText(text: string) {
  if (!text) return window.$message.warning("没有可复制内容");
  try {
    await navigator.clipboard.writeText(text);
    window.$message.success("已复制");
  } catch {
    window.$message.error("复制失败");
  }
}
function copyCurrentPrompt() {
  return copyText(currentTrack.value?.prompt ?? "");
}
async function copyFrameImage(item: UploadItem) {
  if (!item.src) return window.$message.warning("没有可复制图片");
  try {
    const response = await fetch(item.src);
    const blob = await response.blob();
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error("clipboard image unsupported");
    await navigator.clipboard.write([new ClipboardItem({ [blob.type || "image/png"]: blob })]);
    window.$message.success("已复制图片");
  } catch {
    try {
      await navigator.clipboard.writeText(item.src);
      window.$message.warning("图片复制受限，已复制图片链接");
    } catch {
      window.$message.error("复制失败");
    }
  }
}
function getFrameSourceLabel(item: UploadItem, index: number) {
  if (item.sources === "storyboard") return `分镜 P${(item.index ?? index) + 1}`;
  return "资产参考";
}
function trackChange(prevIndex?: number) {
  // 切换前：将旧轨道的 imageList 保存到缓存
  if (prevIndex != null) {
    const prevTrack = trackList.value[prevIndex];
    const pid = project.value?.id;
    const sid = episodesId.value;
    if (pid != null && sid != null && prevTrack?.id != null) {
      setCache(pid, sid, prevTrack.id, prevTrack.medias as unknown as UploadItem[]);
    }
  }
  // 切换后：从缓存恢复当前轨道的 imageList
  const pid = project.value?.id;
  const sid = episodesId.value;
  const curTrack = trackList.value[activeTrackIndex.value];
  if (pid != null && sid != null && curTrack?.id != null) {
    const cached = getCache(pid, sid, curTrack.id);
    if (cached) {
      curTrack.medias = cached as unknown as TrackMedia[];
    }
  }
  // imageList 是基于 currentTrack.medias 的计算属性，切换轨道后自动切换数据
  if (modelParmas.value.mode == "singleImage" && imageList.value.length > 1) {
    imageList.value = imageList.value.slice(0, 1);
  }
  modelParmas.value.duration = clampDuration(trackList.value?.[activeTrackIndex.value]?.duration);
}
/** 监听当前轨道的 medias 变化，实时同步到缓存 */
watch(
  () => currentTrack.value?.medias,
  (medias) => {
    if (!medias) return;
    const pid = project.value?.id;
    const sid = episodesId.value;
    const trackId = currentTrack.value?.id;
    if (pid != null && sid != null && trackId != null) {
      setCache(pid, sid, trackId, medias as unknown as UploadItem[]);
    }
  },
  { deep: true },
);

onMounted(() => {
  modelParmas.value.model = project.value?.videoModel || "";
  modelParmas.value.mode = project.value?.mode || "";
  getGenerateData();
  if (hasGenerateVideoIds.value && hasGenerateVideoIds.value.length) {
    startPoll();
  }
});
/** 单个轨道生成视频 */
async function generateVideo() {
  if (isManualMode.value) {
    window.$message.info("手动官网模式不会调用自动生成，请复制提示词到即梦官网生成后再上传结果。");
    copyCurrentPrompt();
    return;
  }
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
                  const filtered = preSliced
                    .filter((item) => Boolean(item.src) && typeof item.id === "number" && !isNaN(item.id))
                    .map(({ id, sources }) => ({ id, sources }));
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
let pollTimer: NodeJS.Timeout | null = null;
let promptPollTimer: NodeJS.Timeout | null = null;
function startPoll() {
  if (pollTimer !== null) return;
  pollTimer = setInterval(() => getVideoList(), 3000);
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
const hasGenerateVideoIds = computed(() => {
  return trackList.value
    .map((track) => {
      return track.videoList.filter((i) => i.state == "生成中").map((i) => i.id);
    })
    .flatMap((i) => i);
});
const hasGeneratePromptIds = computed(() => {
  const trackIds = trackList.value.filter((t) => t.state == "生成中").map((t) => t.id);
  return trackIds;
});
/** 查询所有视频列表，并检测生成完成/失败状态 */
async function getVideoList() {
  const { data } = await axios.post("/production/workbench/checkVideoStateList", {
    projectId: project.value?.id,
    scriptId: episodesId.value ?? 0,
    videoIds: hasGenerateVideoIds.value,
  });
  if (data && data.length) {
    data.forEach((item: { id: number; state: "生成中" | "未生成" | "已完成" | "生成失败"; src?: string; errorReason?: string }) => {
      for (const track of trackList.value) {
        const findData = track.videoList.find((i) => i.id == item.id);
        if (findData) {
          findData.state = item.state;
          findData.src = item?.src ?? "";
          findData.errorReason = item?.errorReason ?? "";
          break;
        }
      }
    });
  }
}
function startPromptPoll() {
  if (promptPollTimer !== null) return;
  promptPollTimer = setInterval(() => getTrackPromptList(), 3000);
}

function stopPromptPoll() {
  if (promptPollTimer) {
    clearInterval(promptPollTimer);
    promptPollTimer = null;
  }
}
/** 查询所有视频列表，并检测生成完成/失败状态 */
async function getTrackPromptList() {
  const { data } = await axios.post("/production/workbench/checkVideoPrompt", {
    projectId: project.value?.id,
    scriptId: episodesId.value ?? 0,
    trackIds: hasGeneratePromptIds.value,
  });
  if (data && data.length) {
    data.forEach((item: { id: number; state: "生成中" | "未生成" | "已完成" | "生成失败"; prompt?: string; reason?: string }) => {
      const findData = trackList.value.find((t) => t.id == item.id);
      if (findData) {
        findData.state = item.state;
        findData.prompt = item?.prompt ?? "";
        findData.reason = item?.reason ?? "";
        if (item.state === "生成失败") {
          window.$message.error(`提示词生成失败，${item.reason ?? "未知原因"}`);
        }
      }
    });
  }
}
watch(
  () => hasGenerateVideoIds.value,
  (newVal) => {
    if (newVal && newVal.length > 0) {
      startPoll();
    } else {
      stopPoll();
    }
  },
);
watch(
  () => hasGeneratePromptIds.value,
  (newVal) => {
    if (newVal && newVal.length > 0) {
      startPromptPoll();
    } else {
      stopPromptPoll();
    }
  },
);
onUnmounted(() => {
  stopPoll();
  stopPromptPoll();
});
</script>

<style lang="scss" scoped>
.index {
  height: calc(100vh - 120px);
  gap: 16px;
  overflow-y: auto;
  .referenceImage {
  }
  .modelSelect {
  }
  .generate {
    flex: 1;
    min-height: 0;
    width: 100%;
    gap: 5px;
    .prompt {
      width: 50%;
      height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      .videoPrompt {
        width: 100%;
        flex: 1;
        min-height: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        :deep(.t-card__body) {
          flex: 1;
          min-height: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .promptData {
          width: 100%;
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          .promptInput {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
          }
        }
      }
      .manualAssist {
        flex-shrink: 0;
        padding: 10px;
        border: 1px solid var(--td-component-border);
        border-radius: 8px;
        background: var(--td-bg-color-container);
        .manualHeader {
          gap: 8px;
          margin-bottom: 6px;
        }
        .manualTitle {
          font-size: 13px;
          font-weight: 600;
          color: var(--td-text-color-primary);
        }
        .manualHint,
        .emptyFrameHint {
          font-size: 12px;
          line-height: 1.5;
          color: var(--td-text-color-secondary);
        }
        .frameWorkspace {
          margin-top: 8px;
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .frameItem {
          width: 178px;
          flex-shrink: 0;
          border: 1px solid var(--td-component-border);
          border-radius: 8px;
          padding: 6px;
          background: var(--td-bg-color-secondarycontainer);
        }
        .frameThumb {
          width: 100%;
          aspect-ratio: 16 / 9;
          border-radius: 6px;
          overflow: hidden;
          background: var(--td-bg-color-container);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--td-text-color-placeholder);
          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
        }
        .frameMeta {
          margin-top: 6px;
          gap: 6px;
          font-size: 12px;
          small {
            color: var(--td-text-color-secondary);
            white-space: nowrap;
          }
        }
        .transitionText {
          margin-top: 6px;
          min-height: 36px;
          font-size: 12px;
          line-height: 1.45;
          color: var(--td-text-color-secondary);
        }
        .emptyFrameHint {
          align-self: center;
          white-space: nowrap;
        }
      }
    }
    .video {
      width: 50%;
      height: 100%;
      min-height: 0;
    }
  }
  .track {
  }
}
</style>
