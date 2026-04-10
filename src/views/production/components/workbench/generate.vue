<template>
  <div class="generateContainer">
    <div class="data f">
      <t-card header-bordered class="videoToImage ac c">
        <video v-if="videoUrl" :src="videoUrl" class="previewVideo" controls preload="metadata" />
        <div v-else class="emptyVideo c">{{ $t("workbench.generate.noVideo") }}</div>
      </t-card>
      <div class="configurationParameters" :class="{ hasActive: trackList.length > 0 }">
        <t-card :title="'#' + (activeTrackIndex + 1) + $t('workbench.generate.generateText')" header-bordered class="videoPrompt">
          <template #actions>
            <t-button size="small" class="genTextbtn" :loading="activeTrackGenTextLoading" @click="genText">
              {{ $t("workbench.generate.generateText") }}
            </t-button>
          </template>
          <div class="promptData">
            <div class="genVideoParams f ac">
              <div
                v-for="(item, index) in genPromptParams"
                :key="index"
                class="item"
                style="position: relative; width: 80px; height: 80px; margin-right: 12px">
                <t-image
                  v-if="item.url"
                  :src="item.url"
                  @click="handlePreview(item.url)"
                  :style="{ width: '80px', height: '80px', cursor: 'pointer', borderRadius: '8px' }"
                  fit="cover"
                  shape="round" />
                <div v-else class="noneImage ac c">文</div>
                <div class="delete ac c" @click.stop="delGenPromptParams(index)">
                  <i-close size="12" />
                </div>
                <div class="source">
                  <t-tag size="small">
                    {{ item.sources == "storyboard" ? $t("workbench.generate.storyboard") : $t("workbench.generate.assets") }}
                  </t-tag>
                </div>
              </div>
              <div class="selectImage" @click="selectGenPromptAsset" style="flex-shrink: 0">
                <div class="clearBtn ac c">
                  <i-plus size="24"></i-plus>
                </div>
              </div>
            </div>
            <div class="promptInput" @focusout="handlePromptBlur">
              <promptEditor v-model="promptText" :references="references" :placeholder="$t('workbench.generate.promptPlaceholder')" />
            </div>
          </div>
        </t-card>
        <t-card :title="'#' + (activeTrackIndex + 1) + $t('workbench.generate.videoMenu')" header-bordered class="video">
          <template #actions>
            <div class="genBtn f ac">
              <div class="modeMenu">
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
              </div>
              <t-button size="small" :loading="generating" @click="generateVideo">{{ $t("workbench.generate.generate") }}</t-button>
            </div>
          </template>
          <div class="videoData">
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
        </t-card>
      </div>
    </div>
    <div class="videoTrack">
      <t-card bordered :style="{ height: '100%' }">
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
            @click="changeTrack(index)">
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
                  <t-image fit="cover" v-if="m.fileType === 'image'" :src="m.src" class="thumb" />
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
      </t-card>
    </div>
    <!-- 删除轨道确认弹窗 -->
    <t-dialog
      v-model:visible="deleteTrackDialogVisible"
      :header="$t('workbench.generate.del')"
      :body="$t('workbench.generate.delConfirm')"
      placement="center"
      @confirm="handleDeleteTrackConfirm"
      @cancel="deleteTrackDialogVisible = false" />
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
    <Teleport to="body">
      <t-image-viewer v-model="visible" :images="[trigger]" :closeOnOverlay="true" />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { Ref } from "vue";
import axios from "@/utils/axios";
import JSZip from "jszip";
import assetsCheck, { type AssetType, type ClipMediaType } from "@/utils/assetsCheck";
import { DialogPlugin } from "tdesign-vue-next";
import promptEditor from "@/components/promptEditor.vue";
import projectStore from "@/stores/project";

// ============================================================
// 类型定义
// ============================================================

interface TrackMedia {
  src: string;
  id?: number;
  prompt?: string;
  fileType: "image" | "video" | "audio";
  sources?: "assets" | "storyboard";
}

interface VideoItem {
  id: number;
  src: string;
  state: "未生成" | "生成中" | "已完成" | "生成失败";
  errorReason?: string | null;
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

interface UploadItem {
  fileType: "image" | "video" | "audio";
  type: Type;
  sources: "assets" | "storyboard";
  id?: number;
  src?: string;
  label?: string;
  prompt?: string;
}

type ReferenceType = "videoReference" | "imageReference" | "audioReference" | "textReference";
type Type = "imageReference" | "startImage" | "endImage" | "videoReference" | "audioReference";
type VideoMode = "singleImage" | "startEndRequired" | "endFrameOptional" | "startFrameOptional" | "text" | ReferenceType[];
type ImportVideoItem = { trackId: number; videoId: number; src: string; duration: number };

// 常量映射表

/** 文件类型 -> ReferenceType 映射 */
const refTypeMap: Record<string, ReferenceType> = {
  image: "imageReference",
  video: "videoReference",
  audio: "audioReference",
};

/** 非混合模式下各文件类型对应的可选资产类型 */
const fileTypeMap: Record<UploadItem["fileType"], AssetType[]> = {
  image: ["role", "scene", "tool"],
  video: ["clip"],
  audio: ["clip"],
};

// 全局状态

const { project } = storeToRefs(projectStore());
const episodesId = inject<Ref<number>>("episodesId")!;

const emit = defineEmits<{
  importVideo: [videoList: ImportVideoItem[]];
}>();

// 初始化

onMounted(() => {
  selectModel.value = project.value?.videoModel || "";
  selectMode.value = project.value?.mode || "";
  getGenerateData();
});

// 模块一：轨道管理

const trackList = ref<TrackItem[]>([]); // 轨道列表
const activeTrackIndex = ref(0); // 当前选中的轨道索引
const trackSelectedVideoMap = ref<Record<number, number>>({}); // trackId -> 已选 videoId 映射
const storyboardList = ref<StoryboardItem[]>([]); // 分镜列表
const checkAll = ref(false); // 全选状态
const checkedTrackIds = ref<number[]>([]); // 已勾选的轨道 id

/** 拉取主数据（轨道列表、分镜列表）并初始化相关状态 */
async function getGenerateData() {
  const { data } = await axios.post("/production/workbench/getGenerateData", {
    projectId: project.value?.id,
    scriptId: episodesId.value ?? 0,
  });
  trackList.value = data.trackList;
  // 保留用户本地已手动选择但后端可能尚未持久化的映射
  const prevMap = { ...trackSelectedVideoMap.value };
  trackSelectedVideoMap.value = {};
  for (const track of trackList.value) {
    if (track.id != null) {
      if (track.selectVideoId != null) {
        trackSelectedVideoMap.value[track.id] = track.selectVideoId;
      } else if (prevMap[track.id] != null) {
        trackSelectedVideoMap.value[track.id] = prevMap[track.id];
      }
    }
  }

  storyboardList.value = data.storyboardList;
  syncMediasToUploadBox();

  // 恢复当前轨道的 genPromptParams 缓存
  const activeTrack = trackList.value[activeTrackIndex.value];
  if (activeTrack?.id != null && genPromptParamsMap.value[activeTrack.id] != null) {
    genPromptParams.value = [...genPromptParamsMap.value[activeTrack.id]];
  } else if (genPromptParams.value.length === 0 && activeTrack) {
    genPromptParams.value = activeTrack.medias
      .filter((m) => m.id != null)
      .map((m) => ({ id: m.id!, sources: m.sources ?? "storyboard", url: m.src }));
  }

  getVideoList();
}

/** 切换轨道：保存旧轨道缓存，加载新轨道数据 */
function changeTrack(index: number) {
  activeTrackIndex.value = index;
  getGenerateData();
}

/** 添加轨道 */
async function addTrack() {
  const { data: modelData } = await axios.post("/modelSelect/getModelDetail", { modelId: selectModel.value });
  modeOptions.value = modelData;
  const drMap = modelData.durationResolutionMap;
  if (!Array.isArray(drMap) || drMap.length === 0 || !drMap[0].duration?.length) return;
  const duration = drMap[0].duration[0];
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

const deleteTrackDialogVisible = ref(false);
const pendingDeleteTrackIndex = ref(-1);

/** 确认删除轨道弹窗 */
function confirmDeleteTrack(index: number) {
  pendingDeleteTrackIndex.value = index;
  deleteTrackDialogVisible.value = true;
}

/** 执行删除轨道 */
async function handleDeleteTrackConfirm() {
  deleteTrackDialogVisible.value = false;
  await deleteTrack(pendingDeleteTrackIndex.value);
  window.$message.success($t("workbench.generate.delSuccess"));
  getGenerateData();
}

/** 删除轨道请求 */
async function deleteTrack(index: number) {
  const track = trackList.value[index];
  if (!track) return;
  await axios.post("/production/workbench/deleteTrack", { id: track.id });
  if (activeTrackIndex.value >= trackList.value.length) {
    activeTrackIndex.value = trackList.value.length - 1;
  }
}

/** 全选 / 取消全选轨道 */
function handleCheckAll(val: boolean) {
  const allIds = trackList.value.map((t) => t.id).filter((id): id is number => id != null);
  checkedTrackIds.value = val ? allIds : [];
}

/** 单个勾选轨道 */
function toggleCheck(trackId: number | undefined, val: boolean) {
  if (trackId == null) return;
  if (val) {
    if (!checkedTrackIds.value.includes(trackId)) checkedTrackIds.value.push(trackId);
  } else {
    checkedTrackIds.value = checkedTrackIds.value.filter((id) => id !== trackId);
  }
  const allIds = trackList.value.map((t) => t.id).filter((id): id is number => id != null);
  checkAll.value = allIds.length > 0 && allIds.every((id) => checkedTrackIds.value.includes(id));
}

// 轨道列表变化时，清理已失效的 id
watch(
  trackList,
  (list) => {
    const validIds = list.map((t) => t.id).filter((id): id is number => id != null);
    checkedTrackIds.value = checkedTrackIds.value.filter((id) => validIds.includes(id));
    checkAll.value = validIds.length > 0 && validIds.every((id) => checkedTrackIds.value.includes(id));
    genTextLoadingMap.value = Object.fromEntries(Object.entries(genTextLoadingMap.value).filter(([id]) => validIds.includes(Number(id))));
    generatingMap.value = Object.fromEntries(Object.entries(generatingMap.value).filter(([id]) => validIds.includes(Number(id))));
  },
  { deep: true },
);

// 切换轨道时保存旧轨道缓存，加载新轨道状态
watch(activeTrackIndex, (newIndex, oldIndex) => {
  const oldTrack = trackList.value[oldIndex];
  if (oldTrack?.id != null) {
    genPromptParamsMap.value[oldTrack.id] = [...genPromptParams.value];
  }
  userSelectedDuration.value = false;
  const newTrack = trackList.value[newIndex];
  if (newTrack?.id != null && genPromptParamsMap.value[newTrack.id] != null) {
    genPromptParams.value = [...genPromptParamsMap.value[newTrack.id]];
  } else {
    genPromptParams.value = newTrack
      ? newTrack.medias.filter((m) => m.id != null).map((m) => ({ id: m.id!, sources: m.sources ?? "storyboard", url: m.src }))
      : [];
  }
  syncMediasToUploadBox();
  restoreActiveTrackSelection();
});

// 模块二：模型与模式配置

const selectModel = ref<string>(); // 当前选中模型
const selectMode = ref<string>(); // 当前选中模式
const selectedAudio = ref(false); // 是否启用音频
const selectedResolution = ref("480p"); // 当前分辨率
const selectedDuration = ref(8); // 当前时长
const userSelectedDuration = ref(false); // 用户是否手动选过时长
const modeOptions = ref<VideoModel>({} as VideoModel); // 当前模型配置

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
  if (userSelectedDuration.value) return selectedDuration.value;
  const trackDuration = trackList.value[activeTrackIndex.value]?.duration || selectedDuration.value;
  return clampDuration(trackDuration);
});

/** 解析模式值（字符串或 JSON 数组） */
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

/** 是否为混合参考模式（mode 是数组） */
const isMixedMode = computed(() => Array.isArray(parseMode(selectMode.value || "")));

/** 根据混合模式推导当前允许的 clip 媒体类型 */
const mixedClipMediaTypes = computed<ClipMediaType[]>(() => {
  const mode = parseMode(selectMode.value || "");
  if (!Array.isArray(mode)) return [];
  const map: Record<string, ClipMediaType> = { audioReference: "audio", imageReference: "image", videoReference: "video" };
  return mode.filter((m) => m in map).map((m) => map[m]);
});

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
    ? modeOptions.value.mode.map((mode) =>
        Array.isArray(mode)
          ? { value: JSON.stringify(mode), label: mode.map((m) => modeLabelMap[m] || m).join(" + ") + "参考" }
          : { value: mode, label: modeLabelMap[mode] || mode },
      )
    : [];
});

/** 切换分辨率 */
function handleResolutionChange(res: string) {
  selectedResolution.value = res;
}

/** 切换时长（标记为用户手动选择） */
function handleDurationChange(dur: number) {
  selectedDuration.value = dur;
  userSelectedDuration.value = true;
}

// 切换模型：获取模型详情并重置分辨率、时长、音频、模式
watch(selectModel, (val) => {
  if (!val) {
    modeOptions.value = {} as VideoModel;
    selectMode.value = undefined;
    return;
  }
  axios.post("/modelSelect/getModelDetail", { modelId: val }).then(({ data }) => {
    modeOptions.value = data;
    selectMode.value = Array.isArray(data?.mode[0]) ? JSON.stringify(data.mode[0]) : data?.mode[0];
    selectedAudio.value = data.audio === true || data.audio === "true";
    const drMap = data.durationResolutionMap;
    if (Array.isArray(drMap) && drMap.length > 0) {
      if (drMap[0].resolution?.length) selectedResolution.value = drMap[0].resolution[0];
      if (drMap[0].duration?.length) selectedDuration.value = drMap[0].duration[0];
    }
    userSelectedDuration.value = false;
  });
});

// 监听时长变化，同步到后端
watch(
  () => selectedDuration.value,
  (newVal, oldVal) => {
    if (newVal === oldVal) return;
    const trackId = trackList.value[activeTrackIndex.value]?.id;
    if (trackId == null) return;
    axios.post("/production/workbench/updateVideoPrompt", { id: trackId, duration: newVal });
  },
);

// 模块三：上传框（uploadBox）管理

const uploadBox = ref<UploadItem[]>([]); // 当前轨道的上传框列表
const uploadBoxSnapshot = ref<UploadItem[]>([]); // 切换模式时的快照，用于恢复资源
const userEditedUploadBox = ref(false); // 用户是否手动编辑过上传框
const pendingIndex = ref(-1); // 待选分镜对应的 uploadBox 索引
const storyboardDialogVisible = ref(false); // 分镜选择弹窗显示状态
const pendingGenPromptStoryboard = ref(false); // 标志：当前分镜弹窗是为 genPromptParams 服务（而非 uploadBox）

/** 根据模式值构建空的 uploadBox 结构 */
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

/** 将当前轨道的 medias 同步到 uploadBox */
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
    // 非混合模式：按位置映射
    uploadBox.value = uploadBox.value.map((item, i) => {
      const media = medias[i];
      if (media?.src) return { ...item, src: media.src, id: media.id, prompt: media.prompt, sources: media.sources ?? item.sources };
      return { ...item, src: undefined, id: undefined, prompt: undefined };
    });
  }
}

/** 清空 uploadBox 中某个 slot 的资源 */
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

/** 非混合模式：点击 uploadBox slot，弹窗选择资产或分镜（仅操作 uploadBox，不影响 genPromptParams） */
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

/** 混合模式：添加参考资源（仅操作 uploadBox，不影响 genPromptParams） */
function handleMixedAdd() {
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

/** 分镜弹窗选中回调 */
function pickStoryboard(sb: StoryboardItem) {
  storyboardDialogVisible.value = false;

  // 来源为 genPromptParams：将分镜写入提示词参数，不操作 uploadBox
  if (pendingGenPromptStoryboard.value) {
    pendingGenPromptStoryboard.value = false;
    addToGenPromptParams({ id: sb.id, sources: "storyboard", url: sb.src ?? "" });
    return;
  }

  userEditedUploadBox.value = true;
  const fileType = getFileTypeByExt(sb.src);
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
  uploadBox.value[pendingIndex.value] = { ...item, sources: "storyboard", src: sb.src, id: sb.id, prompt: sb.prompt ?? undefined };
}

// 切换模式：重建 uploadBox 并同步 genPromptParams
watch(selectMode, (val) => {
  if (!val) return void (uploadBox.value = []);
  const oldBox = uploadBox.value;
  const activeTrack = trackList.value[activeTrackIndex.value];

  // 保存快照：优先当前 uploadBox，否则从 track.medias 构建
  if (oldBox.some((item) => item.src)) {
    uploadBoxSnapshot.value = oldBox.map((item) => ({ ...item }));
  } else if (activeTrack?.medias?.length) {
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
  if (Array.isArray(newParsedMode)) {
    // 混合模式：保留旧 uploadBox
    uploadBox.value = oldBox;
  } else {
    // 非混合模式：从快照中按文件类型匹配填充
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
  // genPromptParams 与 uploadBox 完全隔离，切换模式不修改 genPromptParams
});

// 模块四：genPromptParams（提示词参数）管理
/** 各轨道的 genPromptParams 缓存，切换轨道时保存/恢复 */
const genPromptParamsMap = ref<Record<number, { id: number; sources: string; url: string }[]>>({});
/** 当前轨道的提示词图片/资产参数（用于生成提示词） */
const genPromptParams = ref<{ id: number; sources: string; url: string }[]>([]);

/** 去重辅助：按 id + sources 联合去重（相同 id 但 sources 不同的条目视为不同资源） */
function dedupeByIdAndSources<T extends { id?: number | null; sources?: string }>(arr: T[]): T[] {
  return arr.filter((item, index, self) => self.findIndex((t) => t.id === item.id && t.sources === item.sources) === index);
}

/** 将当前 genPromptParams 保存到缓存 */
function saveGenPromptParamsCache() {
  const trackId = trackList.value[activeTrackIndex.value]?.id;
  if (trackId != null) genPromptParamsMap.value[trackId] = [...genPromptParams.value];
}

/** 添加一条参数并去重、保存缓存 */
function addToGenPromptParams(item: { id?: number; sources: string; url: string }) {
  if (item.id == null) return;
  genPromptParams.value.push(item as { id: number; sources: string; url: string });
  genPromptParams.value = dedupeByIdAndSources(genPromptParams.value);
  saveGenPromptParamsCache();
}

/** 选择生成提示词所用的资产（弹窗确认选资产或分镜） */
function selectGenPromptAsset() {
  const dlg = DialogPlugin.confirm({
    header: $t("workbench.generate.selectSource"),
    confirmBtn: $t("workbench.generate.confirm"),
    cancelBtn: $t("workbench.generate.cancel"),
    onConfirm: async () => {
      dlg.destroy();
      const assets = await assetsCheck({ types: ["role", "tool", "scene", "clip"], clipMediaTypes: mixedClipMediaTypes.value, multiple: true });
      if (!assets.length) return;
      for (const asset of assets) {
        addToGenPromptParams({ id: asset.id, sources: "assets", url: asset.src });
      }
    },
    onCancel: () => {
      dlg.destroy();
      // 标记来源为 genPromptParams，再打开分镜弹窗
      pendingGenPromptStoryboard.value = true;
      storyboardDialogVisible.value = true;
    },
  });
}

/** 删除提示词参数中指定索引的条目 */
function delGenPromptParams(index: number) {
  genPromptParams.value.splice(index, 1);
  saveGenPromptParamsCache();
}

// 模块五：提示词编辑

/** 当前轨道的提示词文本（双向绑定） */
const promptText = computed({
  get() {
    return trackList.value[activeTrackIndex.value]?.prompt ?? "";
  },
  set(val: string) {
    const track = trackList.value[activeTrackIndex.value];
    if (track) track.prompt = val;
  },
});

/** genPromptParams 作为 promptEditor 的引用预览，无图片则用 text 类型 */
const references = computed(() =>
  genPromptParams.value
    .filter((item) => item.url)
    .map((item) => ({
      type: item.url ? (getFileTypeByExt(item.url) as "image" | "video" | "audio" | "text") : ("text" as const),
      src: item.url ?? "",
    })),
);

/** 提示词失焦时保存到后端 */
function handlePromptBlur() {
  const trackId = trackList.value[activeTrackIndex.value]?.id;
  if (trackId == null) return;
  axios.post("/production/workbench/updateVideoPrompt", { id: trackId, prompt: promptText.value });
}

/** 当前轨道是否正在生成提示词 */
const activeTrackGenTextLoading = computed(() => {
  const trackId = trackList.value[activeTrackIndex.value]?.id;
  return trackId != null ? !!genTextLoadingMap.value[trackId] : false;
});

const genTextLoadingMap = ref<Record<number, boolean>>({}); // trackId -> 是否正在生成提示词

/** 单个轨道生成提示词 */
async function genText() {
  const track = trackList.value[activeTrackIndex.value];
  const trackId = track?.id;
  if (trackId == null || genTextLoadingMap.value[trackId]) return;
  genTextLoadingMap.value[trackId] = true;
  try {
    const { data } = await axios.post("/production/workbench/generateVideoPrompt", {
      projectId: project.value?.id,
      trackId,
      info: genPromptParams.value.map(({ id, sources }) => ({ id, sources })),
      model: selectModel.value,
    });
    const targetTrack = trackList.value.find((item) => item.id === trackId);
    if (targetTrack) targetTrack.prompt = data;
  } finally {
    genTextLoadingMap.value[trackId] = false;
  }
}

/** 批量为已勾选轨道生成提示词 */
function batchGenText() {
  trackList.value
    .filter((track) => checkedTrackIds.value.includes(track.id))
    .forEach(async (track) => {
      const trackId = track.id;
      const cached = genPromptParamsMap.value[trackId];
      // 优先使用缓存，否则用 track.medias 兜底
      const info =
        cached?.filter((item) => item.id).map(({ id, sources }) => ({ id, sources })) ??
        track.medias.filter((m) => m.id).map((m) => ({ id: m.id, sources: m.sources }));
      genTextLoadingMap.value[trackId] = true;
      try {
        const { data } = await axios.post("/production/workbench/generateVideoPrompt", {
          projectId: project.value?.id,
          trackId,
          info,
          model: selectModel.value,
        });
        const targetTrack = trackList.value.find((item) => item.id === trackId);
        if (targetTrack) targetTrack.prompt = data;
      } finally {
        genTextLoadingMap.value[trackId] = false;
      }
    });
}

// 模块六：视频生成

const generatingMap = ref<Record<number, boolean>>({}); // trackId -> 是否正在生成视频

/** 当前轨道是否正在生成视频 */
const generating = computed(() => {
  const trackId = trackList.value[activeTrackIndex.value]?.id;
  return trackId != null ? !!generatingMap.value[trackId] : false;
});

/** 单个轨道生成视频 */
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
        await axios.post("/production/workbench/generateVideo", {
          projectId: project.value?.id,
          scriptId: episodesId.value,
          uploadData:
            selectMode.value === "text" ? [] : uploadBox.value.filter((item) => Boolean(item.src)).map(({ id, sources }) => ({ id, sources })),
          prompt: promptText.value,
          model: selectModel.value,
          mode: selectMode.value,
          resolution: selectedResolution.value,
          duration: effectiveDuration.value,
          audio: selectedAudio.value,
          trackId,
        });
        window.$message.success($t("workbench.generate.generateStarted"));
        getVideoList();
      } finally {
        generatingMap.value[trackId] = false;
      }
    },
    onCancel: () => dlg.destroy(),
  });
}

/** 批量为已勾选轨道生成视频 */
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
            const payload = {
              projectId: project.value?.id,
              scriptId: episodesId.value,
              duration: clampDuration(track.duration || selectedDuration.value),
              uploadData:
                selectMode.value === "text"
                  ? []
                  : track.medias.filter((m) => Boolean(m.src)).map(({ id, sources }) => ({ id, sources: sources ?? "storyboard" })),
              prompt: track.prompt,
              model: selectModel.value,
              mode: selectMode.value,
              resolution: selectedResolution.value,
              audio: Boolean(selectedAudio.value),
              trackId,
            };
            if (!payload.prompt) return window.$message.warning($t("workbench.generate.skipDataWithEmptyVideoPromptWords"));
            await axios.post("/production/workbench/generateVideo", payload);
            window.$message.success($t("workbench.generate.generateStarted"));
            getVideoList();
          } finally {
            generatingMap.value[trackId] = false;
          }
        });
    },
    onCancel: () => dlg.destroy(),
  });
}

// 模块七：视频历史记录

const videoUrl = ref(""); // 当前预览的视频 URL
const historyVideo = ref<HistoryVideoItem[]>([]); // 所有轨道的历史视频
const selectVideoId = ref<number | null>(null); // 当前轨道选中的视频 id
const videoCoverMap = ref<Record<string, string>>({}); // 视频封面缓存，key=src

/** 查询所有视频列表，并检测生成完成/失败状态 */
async function getVideoList() {
  const { data } = await axios.post("/production/workbench/getVideoList", {
    projectId: project.value?.id,
    scriptId: episodesId.value ?? 0,
  });
  const oldList = historyVideo.value;
  historyVideo.value = data;
  restoreActiveTrackSelection();
  // 检测生成状态变更，提示用户
  for (const item of data as HistoryVideoItem[]) {
    const old = oldList.find((o) => o.id === item.id);
    if (!old) continue;
    if (old.state === "生成中" && item.state === "已完成") window.$message.success($t("workbench.generate.generateSuccess"));
    else if (old.state === "生成中" && item.state === "生成失败") window.$message.error(item.errorReason || $t("workbench.generate.generateFailed"));
  }
}

/** 当前轨道的历史视频列表 */
const activeTrackVideos = computed(() => {
  const track = trackList.value[activeTrackIndex.value];
  if (!track?.id) return [];
  const fromHistory = historyVideo.value.filter((v) => v.videoTrackId === track.id);
  if (fromHistory.length > 0) return fromHistory;
  return (track.videoList ?? []).map((v) => ({ ...v, videoTrackId: track.id }));
});

/** 恢复当前轨道已选视频的预览状态 */
function restoreActiveTrackSelection() {
  const track = trackList.value[activeTrackIndex.value];
  if (!track?.id) {
    selectVideoId.value = null;
    videoUrl.value = "";
    return;
  }
  const selectedId = trackSelectedVideoMap.value[track.id] ?? track.selectVideoId ?? null;
  selectVideoId.value = selectedId;
  if (selectedId == null) return;
  const selectedVideo = historyVideo.value.find((v) => v.videoTrackId === track.id && v.id === selectedId);
  if (selectedVideo && selectedVideo.state !== "生成中" && selectedVideo.state !== "生成失败") {
    videoUrl.value = selectedVideo.src;
  }
}

/** 点击历史视频条目进行预览 */
function previewVideo(v: HistoryVideoItem) {
  if (v.state === "生成中" || v.state === "生成失败") return;
  videoUrl.value = v.src;
}

/** 选中历史视频并同步到后端 */
async function selectVideo(v: HistoryVideoItem) {
  if (v.state === "生成中" || v.state === "生成失败") return;
  const activeTrack = trackList.value[activeTrackIndex.value];
  if (v.id != null) {
    selectVideoId.value = v.id;
    if (activeTrack?.id != null) trackSelectedVideoMap.value[activeTrack.id] = v.id;
  }
  videoUrl.value = v.src;
  try {
    await axios.post("/production/workbench/selectVideo", {
      projectId: project.value?.id,
      scriptId: episodesId.value ?? 0,
      videoId: v.id,
      trackId: activeTrack?.id,
    });
    window.$message.success($t("workbench.generate.selectVideoSuccess"));
    getGenerateData();
  } catch {
    window.$message.error($t("workbench.generate.selectVideoFailed"));
  }
}

/** 删除某条历史视频 */
function handleDeleteVideo(value: HistoryVideoItem) {
  const dlg = DialogPlugin.confirm({
    header: $t("workbench.generate.del"),
    body: $t("workbench.generate.delVideo"),
    onConfirm: () => {
      axios.post("/production/workbench/delVideo", { id: value.id }).then(() => {
        window.$message.success($t("workbench.generate.delSuccess"));
        dlg.destroy();
        getVideoList();
      });
    },
    onCancel: () => dlg.destroy(),
  });
}

/** 单个视频下载 */
async function downloadVideo(value: HistoryVideoItem) {
  const response = await fetch(value.src);
  const blob = await response.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "视频.mp4";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

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

// 模块八：批量下载视频

/** 获取 URL 中的文件扩展名 */
function getFileExtension(url: string): string {
  const ext = url.split(".").pop()?.split(/[#?]/)[0];
  return ext || "mp4";
}

/** 批量下载已勾选轨道的选中视频，打包为 zip */
async function batchDownloadVideo(): Promise<void> {
  const zip = new JSZip();
  const selectedTracks = trackList.value.filter((track) => checkedTrackIds.value.includes(track.id));
  const tasks = selectedTracks
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
  await Promise.all(tasks);
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

// 模块九：图片预览

const trigger = ref(); // 预览图片 URL
const visible = ref(false); // 图片预览弹窗状态

function handlePreview(src: string | undefined) {
  visible.value = true;
  trigger.value = src;
}

// 模块十：工具函数

/** 根据文件扩展名推断媒体类型 */
function getFileTypeByExt(src: string | undefined): "image" | "video" | "audio" {
  const ext = src?.split(".").pop()?.toLowerCase() ?? "";
  if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "aac", "flac", "m4a"].includes(ext)) return "audio";
  return "image";
}

// 模块十一：视频轮询（生成中自动刷新）

/** 是否有视频正在生成中 */
const hasGeneratedVideo = computed(() => historyVideo.value.some((v) => v.state === "生成中"));

let pollTimer: number | null = null;

function startPoll() {
  if (pollTimer !== null) return;
  pollTimer = window.setInterval(() => getVideoList(), 3000);
}

function stopPoll() {
  if (pollTimer !== null) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
}

watch(
  () => hasGeneratedVideo.value,
  (val) => (val ? startPoll() : stopPoll()),
);

onUnmounted(() => stopPoll());
</script>

<style lang="scss" scoped>
.generateContainer {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  gap: 16px;
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
  .data {
    width: 100%;
    height: 75%;
    gap: 10px;
    min-height: 0;
    .videoToImage {
      width: 50%;
      height: 100%;
      display: flex;
      flex-direction: column;
      :deep(.t-card__body) {
        flex: 1;
        min-height: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
      }
      .previewVideo {
        width: 100%;
        flex: 1;
        min-height: 0;
        object-fit: contain;
        display: block;
      }
      .emptyVideo {
        width: 100%;
        flex: 1;
        min-height: 0;
      }
    }
    .configurationParameters {
      width: 50%;
      height: 100%;
      height: 100%;
      .videoPrompt {
        width: 100%;
        height: 50%;
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
          .genVideoParams {
            padding-top: 10px;
            padding-bottom: 10px;
            height: 100px;
            width: 100%;
            overflow-x: auto;
            overflow-y: hidden;
            gap: 10px;
            .item {
              position: relative;
              .noneImage {
                width: 80px;
                height: 80px;
                cursor: pointer;
                background-color: #fff;
                border: 1px solid var(--td-component-border);
                border-radius: 8px;
                color: #000;
                font-size: 28px;
                font-weight: 500;
              }
              .delete {
                position: absolute;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: rgba(0, 0, 0, 0.6);
                right: 4px;
                top: 4px;
                cursor: pointer;
                z-index: 1;
                display: none;
                align-items: center;
                justify-content: center;
                color: #fff;
              }
              &:hover .delete {
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
                z-index: 1;
                &:hover {
                  background: rgba(0, 0, 0, 0.85);
                }
              }
              &:hover .source {
                display: flex;
              }
            }
            .selectImage {
              width: 80px;
              height: 80px;
              cursor: pointer;
              border: 1px dashed var(--td-component-border);
              border-radius: 8px;
              .clearBtn {
                width: 100%;
                height: 100%;
              }
            }
          }
          .promptInput {
            border: 1px solid var(--td-component-border);
            border-radius: 8px;
            min-height: 100px;
            height: 120px;
            overflow: auto;
            resize: vertical;
          }
        }
      }

      .video {
        margin-top: 10px;
        min-height: 48%;
        max-height: 48%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        :deep(.t-card__body) {
          flex: 1;
          min-height: 0;
          overflow: auto;
        }
        .genBtn {
          .modeMenu {
            width: 100%;
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
        }
        .videoData {
          height: 100%;
          .modeOpt {
            width: 100%;
            padding-bottom: 5px;
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
                top: 2px;
                right: 2px;
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
      }
    }
  }
  .videoTrack {
    width: 100%;
    height: 25%;
    overflow: hidden;
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
      height: 150px;
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
        border-radius: 8px;
        flex-shrink: 0;
        width: 200px;
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
          z-index: 2;
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
          z-index: 1;
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
