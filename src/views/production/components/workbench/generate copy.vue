<template>
  <div class="generateContainer">
    <div class="mainContent">
      <!-- 左侧预览区域 -->
      <div class="previewArea">
        <div class="videoWrapper">
          <video
            v-if="currentShot?.videoUrl"
            ref="previewVideoRef"
            :src="currentShot.videoUrl"
            :poster="currentShot.imageUrl"
            class="previewVideo"
            controls
            preload="metadata" />
          <img v-else-if="currentShot?.imageUrl" :src="currentShot.imageUrl" :alt="currentShot?.description" class="previewVideo" />
          <div v-else class="placeholderImage">
            <i-pic size="48" fill="#999" />
            <span>暂无视频</span>
          </div>
        </div>
      </div>
      <!-- 右侧信息面板 -->
      <t-card class="infoPanel">
        <!-- 提示词输入 -->
        <div class="promptSection">
          <div class="sectionTitle">
            <span class="titleIndicator" />
            视频提示词
          </div>
          <t-textarea
            v-model="promptText"
            placeholder="输入提示词，描述你想要生成的视频内容..."
            :autosize="{ minRows: 4, maxRows: 12 }"
            @change="(val) => { const s = shotList[currentShotIndex]; if(s) s.prompt = String(val); }" />
        </div>
        <!-- 帧配置区域 -->
        <div class="frameSection" v-if="currentModeKey !== 'text' && mode.length > 0 && (!isMixedRefMode || mixedRefHasUpload)">
          <!-- singleImage: 单图 -->
          <template v-if="currentMode === 'singleImage'">
            <div class="frameItem">
              <div class="frameThumbnail" :class="{ addFrame: !currentShot?.imageUrl }" @click="!currentShot?.imageUrl && handleAddImage()">
                <img v-if="currentShot?.imageUrl" :src="currentShot.imageUrl" class="frameImage" />
                <i-plus v-else size="24" fill="#999" />
                <div v-if="currentShot?.imageUrl" class="frameRemoveBtn" @click.stop="handleRemoveImage()">
                  <i-close size="12" fill="#fff" />
                </div>
              </div>
              <span class="frameLabel">参考图</span>
            </div>
          </template>

          <!-- multiImage / gridImage: 多图 -->
          <template v-else-if="currentMode === 'multiImage' || currentMode === 'gridImage'">
            <div v-for="(img, idx) in currentShot?.imageUrls || []" :key="idx" class="frameItem">
              <div class="frameThumbnail">
                <img :src="img" class="frameImage" />
                <div class="frameRemoveBtn" @click.stop="handleRemoveImageAt(idx)">
                  <i-close size="12" fill="#fff" />
                </div>
              </div>
            </div>
            <div class="frameItem" @click="handleAddImage">
              <div class="frameThumbnail addFrame">
                <i-plus size="24" fill="#999" />
              </div>
              <span class="frameLabel">图片</span>
            </div>
          </template>

          <!-- VideoMixedRef 混合参考模式 -->
          <template v-else-if="isMixedRefMode">
            <template v-for="refType in mixedRefTypes" :key="refType">
              <!-- videoReference -->
              <template v-if="refType === 'videoReference'">
                <div class="frameItem">
                  <div
                    class="frameThumbnail"
                    :class="{ addFrame: !currentShot?.mixedRefs?.videoReference }"
                    @click="!currentShot?.mixedRefs?.videoReference && handleAddMixedRef('videoReference')">
                    <video
                      v-if="currentShot?.mixedRefs?.videoReference"
                      :src="currentShot.mixedRefs.videoReference.url"
                      class="frameImage"
                      muted
                      preload="metadata" />
                    <i-plus v-else size="24" fill="#999" />
                    <div v-if="currentShot?.mixedRefs?.videoReference" class="frameRemoveBtn" @click.stop="handleRemoveMixedRef('videoReference')">
                      <i-close size="12" fill="#fff" />
                    </div>
                  </div>
                  <span class="frameLabel">参考视频</span>
                </div>
              </template>
              <!-- imageReference -->
              <template v-else-if="refType === 'imageReference'">
                <div class="frameItem">
                  <div
                    class="frameThumbnail"
                    :class="{ addFrame: !currentShot?.mixedRefs?.imageReference }"
                    @click="!currentShot?.mixedRefs?.imageReference && handleAddMixedRef('imageReference')">
                    <img v-if="currentShot?.mixedRefs?.imageReference" :src="currentShot.mixedRefs.imageReference.url" class="frameImage" />
                    <i-plus v-else size="24" fill="#999" />
                    <div v-if="currentShot?.mixedRefs?.imageReference" class="frameRemoveBtn" @click.stop="handleRemoveMixedRef('imageReference')">
                      <i-close size="12" fill="#fff" />
                    </div>
                  </div>
                  <span class="frameLabel">参考图片</span>
                </div>
              </template>
              <!-- audioReference -->
              <template v-else-if="refType === 'audioReference'">
                <div class="frameItem">
                  <div
                    class="frameThumbnail"
                    :class="{ addFrame: !currentShot?.mixedRefs?.audioReference }"
                    @click="!currentShot?.mixedRefs?.audioReference && handleAddMixedRef('audioReference')">
                    <div v-if="currentShot?.mixedRefs?.audioReference" class="audioRefIcon">
                      <i-volume-notice size="24" fill="#3070d6" />
                    </div>
                    <i-plus v-else size="24" fill="#999" />
                    <div v-if="currentShot?.mixedRefs?.audioReference" class="frameRemoveBtn" @click.stop="handleRemoveMixedRef('audioReference')">
                      <i-close size="12" fill="#fff" />
                    </div>
                  </div>
                  <span class="frameLabel">参考音频</span>
                </div>
              </template>
              <!-- textReference 只显示文本输入，不显示上传 -->
              <template v-else-if="refType === 'textReference'">
                <!-- 文本引用仅在 frameSection 内不额外渲染上传，文字已在提示词区域输入 -->
              </template>
            </template>
          </template>

          <!-- 首尾帧模式 -->
          <template v-else-if="isDualFrameMode">
            <div class="frameItem">
              <div class="frameThumbnail" :class="{ addFrame: !currentShot?.imageUrl }" @click="!currentShot?.imageUrl && handleAddImage()">
                <img v-if="currentShot?.imageUrl" :src="currentShot.imageUrl" class="frameImage" />
                <i-plus v-else size="24" fill="#999" />
                <div v-if="currentShot?.imageUrl" class="frameRemoveBtn" @click.stop="handleRemoveImage()">
                  <i-close size="12" fill="#fff" />
                </div>
              </div>
              <span class="frameLabel">{{ startFrameLabel }}</span>
            </div>
            <div class="frameSwapBtn" @click="handleSwapFrames">
              <i-switch size="16" />
            </div>
            <div class="frameItem" @click="!currentShot?.endFrameUrl && handleAddEndFrame()">
              <div class="frameThumbnail" :class="{ addFrame: !currentShot?.endFrameUrl }">
                <img v-if="currentShot?.endFrameUrl" :src="currentShot.endFrameUrl" class="frameImage" />
                <i-plus v-else size="24" fill="#999" />
                <div v-if="currentShot?.endFrameUrl" class="frameRemoveBtn" @click.stop="handleRemoveEndFrame()">
                  <i-close size="12" fill="#fff" />
                </div>
              </div>
              <span class="frameLabel">{{ endFrameLabel }}</span>
            </div>
          </template>
        </div>
        <!-- 模型信息与操作栏 -->
        <div class="actionBar">
          <div class="actionBarRow">
            <div class="actionBarRowLeft">
              <modelSelect v-model="modelDd" :changeConfig="true" type="video" size="small" @change="handleModelChange" class="modelSelectItem" />
              <t-select v-if="mode.length > 0" v-model="currentModeKey" style="width: 180px" size="small">
                <t-option v-for="m in mode" :key="m.value" :label="m.label" :value="m.value" />
              </t-select>
              <t-tooltip v-if="audioOptions !== false && mode.length > 0" :content="audioOptions ? '关闭音频' : '开启音频'" placement="top">
                <t-button :theme="audioOptions ? 'primary' : 'default'" variant="outline" size="small" class="audioBtn" @click="toggleAudio()">
                  <template #icon>
                    <i-volume-notice v-if="audioOptions" size="16" />
                    <i-volume-mute v-else size="16" />
                  </template>
                </t-button>
              </t-tooltip>
              <t-popup
                v-if="resolutionOptions.length || durationOptions.length"
                trigger="click"
                placement="top"
                overlay-class-name="resDurPickerPopup"
                :overlay-inner-style="{ padding: '16px', borderRadius: '8px' }">
                <t-button size="small" variant="outline" class="resDurBtn">
                  <template v-if="resolutionOptions.length">{{ currentShot?.resolution || resolutionOptions[0] }}</template>
                  <template v-if="resolutionOptions.length && durationOptions.length">·</template>
                  <template v-if="durationOptions.length">{{ (currentShot?.duration || durationOptions[0]).toString().padStart(2, "0") }}s</template>
                </t-button>
                <template #content>
                  <div class="resolutionDurationPicker">
                    <div v-if="resolutionOptions.length" class="pickerSection">
                      <div class="pickerLabel">分辨率</div>
                      <div class="pickerOptions">
                        <div
                          v-for="res in resolutionOptions"
                          :key="res"
                          class="pickerOption"
                          :class="{ active: (currentShot?.resolution || resolutionOptions[0]) === res }"
                          @click="handleResolutionChange(res)">
                          {{ res }}
                        </div>
                      </div>
                    </div>
                    <div v-if="durationOptions.length" class="pickerSection">
                      <div class="pickerLabel">时长</div>
                      <div class="pickerOptions">
                        <div
                          v-for="dur in durationOptions"
                          :key="dur"
                          class="pickerOption"
                          :class="{ active: (currentShot?.duration || durationOptions[0]) === dur }"
                          @click="handleDurationChange(dur)">
                          {{ dur }}s
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </t-popup>
            </div>
            <div class="actionBarRowRight">
              <t-button theme="primary" size="small" class="generateBtn" @click="handleGenerate">
                <template #icon><i-arrow-up size="16" /></template>
                生成
              </t-button>
            </div>
          </div>
        </div>

        <!-- 历史版本 -->
        <div class="historySection">
          <div class="historyHeader">
            <i-time size="16" />
            <span>历史版本</span>
            <span class="historyCount">({{ currentHistoryList.length }})</span>
          </div>
          <div class="historyContent">
            <div v-if="!currentHistoryList.length" class="historyEmpty">暂无历史记录</div>
            <div v-else class="historyGrid">
              <div
                v-for="item in currentHistoryList"
                :key="item.id"
                class="historyCard"
                :class="{ active: currentShot?.selectedVideoId === item.id }"
                @click="handleSelectHistoryVideo(item)">
                <!-- 成功：显示可播放视频 -->
                <template v-if="item.state === 'completed' || item.state === 'done'">
                  <video
                    :src="item.filePath"
                    class="historyCardThumb"
                    preload="metadata"
                    muted
                    @click.stop
                    controls />
                </template>
                <!-- 生成中：转圈 + 灰色背景 -->
                <template v-else-if="item.state === 'generating' || item.state === 'pending' || item.state === 'processing'">
                  <div class="historyCardLoading">
                    <t-loading size="28" />
                  </div>
                </template>
                <!-- 失败：显示失败提示 -->
                <template v-else>
                  <div class="historyCardFailed">
                    <i-close size="22" fill="#f66" />
                    <span>生成失败</span>
                  </div>
                </template>
                <!-- 选中时右上角对勾 -->
                <div v-if="currentShot?.selectedVideoId === item.id" class="historyCardCheck">
                  <i-check size="12" fill="#fff" />
                </div>
                <!-- 悬停时右下角删除 -->
                <div class="historyCardDelete" @click.stop="handleDeleteHistoryVideo(item.id)">
                  <i-delete size="12" fill="#fff" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </t-card>
    </div>

    <!-- 底部视频轨道 -->
    <div class="shotListArea">
      <div class="shotListHeader">
        <div class="headerLeft">
          <t-checkbox v-model="selectAll" @change="handleSelectAll">全选</t-checkbox>
          <span class="trackTitle">视频轨道</span>
        </div>
        <div class="headerRight">
          <t-button theme="primary" size="small" :disabled="!hasSelected" @click="handleBatchGenerate">
            <template #icon><i-magic size="16" /></template>
            批量生成
          </t-button>
          <t-button theme="default" variant="outline" size="small" :disabled="!hasSelected" @click="handleBatchDownload">
            <template #icon><i-download size="16" /></template>
            批量下载
          </t-button>
        </div>
      </div>
      <div class="shotListWrapper" ref="trackListRef">
        <div class="shotList">
          <div
            v-for="(shot, index) in shotList"
            :key="shot.id"
            class="shotItem"
            :class="{ active: currentShotIndex === index }"
            @click="selectShot(index)">
            <t-checkbox v-model="shot.selected" class="shotCheckbox" @click.stop />
            <div class="shotImageWrapper">
              <template v-if="isDualFrame(shot.mode)">
                <div class="shotDualFrame">
                  <img v-if="shot.imageUrl" :src="shot.imageUrl" class="shotFrameImg" />
                  <div v-else class="shotFramePlaceholder"><i-pic size="16" fill="#999" /></div>
                  <img v-if="shot.endFrameUrl" :src="shot.endFrameUrl" class="shotFrameImg" />
                  <div v-else class="shotFramePlaceholder"><i-pic size="16" fill="#999" /></div>
                </div>
              </template>
              <!-- 单图模式 -->
              <template v-else>
                <img v-if="shot.imageUrl" :src="shot.imageUrl" :alt="shot.description" class="shotImage" />
                <div v-else class="shotPlaceholder">
                  <i-pic size="24" fill="#999" />
                </div>
              </template>
              <!-- 序号标签 -->
              <t-tag class="shotNumber" size="small" variant="dark">#{{ index + 1 }}</t-tag>
              <!-- 时长标签 -->
              <t-tag class="shotDuration" size="small" variant="dark">{{ shot.duration || 4 }}s</t-tag>

            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { storeToRefs } from "pinia";
import axios from "@/utils/axios";
import projectStore from "@/stores/project";
import modelSelect from "@/components/modelSelect.vue";

type VideoMixedRef = "videoReference" | "imageReference" | "audioReference" | "textReference";

type VideoModelMode =
  | "singleImage"
  | "multiImage"
  | "gridImage"
  | "startEndRequired"
  | "endFrameOptional"
  | "startFrameOptional"
  | "text"
  | VideoMixedRef[];

interface VideoModel {
  name: string;
  modelName: string;
  type: "video";
  mode: VideoModelMode[];
  audio: "optional" | false | true;
  durationResolutionMap: { duration: number[]; resolution: string[] }[];
}
function isDualFrame(mode?: VideoModelMode) {
  return mode === "startEndRequired" || mode === "endFrameOptional" || mode === "startFrameOptional";
}
const modelDd = ref();
const MODE_LABEL: Record<string, string> = {
  singleImage: "单图",
  multiImage: "多图",
  gridImage: "网格多图",
  startEndRequired: "首尾帧",
  endFrameOptional: "首尾帧",
  startFrameOptional: "首尾帧",
  text: "文生视频",
  ["videoReference"]: "视频参考",
  ["imageReference"]: "图片参考",
  ["audioReference"]: "音频参考",
  ["textReference"]: "文本参考",
};

function getModeLabel(mode?: VideoModelMode): string {
  if (!mode) return "";
  if (Array.isArray(mode)) return mode.map((r) => MODE_LABEL[r] ?? r).join("、");
  return MODE_LABEL[mode] ?? mode;
}

/** 将 VideoModelMode 序列化为 radio-group 的字符串 value */
function modeToKey(m: VideoModelMode): string {
  return Array.isArray(m) ? JSON.stringify(m) : m;
}

/** 将字符串 key 还原为 VideoModelMode */
function keyToMode(key: string): VideoModelMode {
  if (key.startsWith("[")) {
    try {
      return JSON.parse(key) as VideoMixedRef[];
    } catch {}
  }
  return key as VideoModelMode;
}

/** 图片/资源来源描述 */
interface ImageSource {
  /** 来自分镜原始数据 */
  type: "storyboard" | "assets";
  /** 分镜 id 或资产 id */
  id: number | string;
  /** 文件路径 / URL */
  url: string;
}

interface MixedRefs {
  videoReference?: ImageSource;
  imageReference?: ImageSource;
  audioReference?: ImageSource;
}

interface Shot {
  id: number | string;
  scriptId?: number | string;
  description: string;
  prompt?: string;
  duration?: number;
  audio?: boolean | null;
  imageUrl?: string;
  /** imageUrl 对应的来源信息（storyboard 原始 / assets 手动选择） */
  imageSource?: ImageSource;
  imageUrls?: string[];
  /** imageUrls 对应的来源信息列表，与 imageUrls 下标一一对应 */
  imageSources?: ImageSource[];
  endFrameUrl?: string;
  /** endFrameUrl 对应的来源信息 */
  endFrameSource?: ImageSource;
  videoUrl?: string;
  /** 当前在历史列表中选中播放的视频 id */
  selectedVideoId?: number | string;
  sceneDesc?: string;
  model?: string;
  mode?: VideoModelMode;
  resolution?: string;
  status?: "generating" | "completed" | "failed";
  selected?: boolean;
  mixedRefs?: MixedRefs;
  /** 历史视频列表 */
  videos?: VideoRecord[];
}
//视频生成配置参数
interface VideoGenerationConfig {
  id: number | string;
  storyboardId: number | string;
  videoId: number | string;
  prompt: string;
  model: string;
  mode: VideoModelMode;
  resolution: string;
  duration: number;
  audio: boolean;
  data?: { id: number; type: string }[];
}
//单个视频记录参数（后端返回的视频生成结果）
interface VideoRecord {
  id: number | string;
  storyboardId: number | string;
  filePath: string;
  state: string;
  errorReason?: string;
}
//分镜参数（后端返回的原始分镜数据）
interface StoryboardItem {
  id: number | string;
  scriptId: number | string;
  name: string;
  detail: string;
  prompt: string;
  seconds: number;
  filePath: string;
  frameType: string;
  config?: VideoGenerationConfig;
  videos?: VideoRecord[];
}

const shotList = ref<Shot[]>([]);

function mapStoryboardToShot(item: StoryboardItem): Shot {
  const latestVideo = item.videos?.find((v) => v.state === "completed" || v.state === "done") ?? item.videos?.[item.videos.length - 1];
  const statusMap: Record<string, Shot["status"]> = {
    completed: "completed",
    done: "completed",
    failed: "failed",
    error: "failed",
    generating: "generating",
    pending: "generating",
    processing: "generating",
  };
  const mappedStatus = statusMap[latestVideo?.state ?? ""] ?? undefined;
  // frameType → VideoModelMode
  const frameModeMap: Record<string, VideoModelMode> = {
    首尾: "startEndRequired",
    首: "startFrameOptional",
    尾: "endFrameOptional",
    单图: "singleImage",
    多图: "multiImage",
    文生视频: "text",
  };
  return {
    id: item.id,
    scriptId: item.scriptId,
    description: item.name,
    prompt: item.config?.prompt || item.prompt || "",
    duration: item.config?.duration ?? item.seconds,
    audio: item.config ? item.config.audio : null,
    imageUrl: item.filePath || undefined,
    videoUrl: latestVideo?.filePath || undefined,
    selectedVideoId: latestVideo?.id,
    status: mappedStatus,
    mode: (item.config?.mode ?? frameModeMap[item.frameType]) || undefined,
    model: item.config?.model || undefined,
    resolution: item.config?.resolution || undefined,
    selected: false,
    videos: item.videos || [],
  };
}

onMounted(() => {
  getProductionData();
});
//查询分镜视频
function getProductionData() {
  axios
    .post("/production/getProductionData", {
      scriptId: 1,
    })
    .then(({ data }: { data: string | StoryboardItem[] }) => {
      console.log("%c Line:504 🍬 data", "background:#ea7e5c", data);
      const list: StoryboardItem[] = typeof data === "string" ? JSON.parse(data) : data || [];
      shotList.value = list.map(mapStoryboardToShot);
    });
}

const currentShotIndex = ref(0);
const trackListRef = ref<HTMLElement>();
const selectAll = ref(false);

/** 当前分镜的历史视频列表 */
const currentHistoryList = computed(() => currentShot.value?.videos || []);

const promptText = computed({
  get: () => currentShot.value?.prompt ?? "",
  set: (val: string) => {
    const shot = shotList.value[currentShotIndex.value];
    if (shot) shot.prompt = val;
  },
});

const hasSelected = computed(() => shotList.value.some((s) => s.selected));

const currentShot = computed(() => shotList.value[currentShotIndex.value] || null);

/** 切换分镜时回显操作栏配置（模型、模式、分辨率、时长、音频） */
watch(currentShot, async (shot) => {
  if (!shot) return;
  // 回显模型选中值
  if (shot.model) modelDd.value = shot.model;
  // 若有保存的模型，拉取模型详情填充选项列表，再回显各项选中状态
  if (shot.model) {
    try {
      const { data: modelDetail } = await axios.post("/modelSelect/getModelDetail", { modelId: shot.model });
      if (modelDetail) {
        // 填充分辨率/时长/音频/模式选项列表（复用 handleModelChange 逻辑）
        resolutionOptions.value = [...new Set((modelDetail.durationResolutionMap as { duration: number[]; resolution: string[] }[]).flatMap((m) => m.resolution))];
        durationOptions.value = [...new Set((modelDetail.durationResolutionMap as { duration: number[]; resolution: string[] }[]).flatMap((m) => m.duration))].sort((a, b) => a - b);
        const audioRaw = (modelDetail as VideoModel).audio;
        audioOptions.value = audioRaw === false ? false : audioRaw === true ? true : null;
        mode.value = (modelDetail as VideoModel).mode.map((item: VideoModelMode) => ({
          label: getModeLabel(item),
          value: modeToKey(item),
        }));
      }
    } catch {}
  }
  // 回显音频开关（shot 自身保存的状态优先）
  if (shot.audio !== undefined && shot.audio !== null && audioOptions.value !== false) {
    audioOptions.value = shot.audio ? true : null;
  }
}, { immediate: false });

// currentMode 用字符串 key 表示，方便 radio-group 双向绑定
const currentModeKey = computed({
  get: (): string => {
    const m = currentShot.value?.mode;
    if (!m) return "";
    return modeToKey(m);
  },
  set: (key: string) => {
    const shot = shotList.value[currentShotIndex.value];
    if (!shot) return;
    const val = keyToMode(key);
    shot.mode = val;
    // 切换模式时清空不适用的图片数据
    if (Array.isArray(val)) {
      // 混合参考模式：保留 imageUrl，清空其他
      shot.imageUrls = undefined;
      shot.endFrameUrl = undefined;
    } else if (val === "text") {
      shot.imageUrl = undefined;
      shot.imageUrls = undefined;
      shot.endFrameUrl = undefined;
    } else if (val === "singleImage") {
      shot.imageUrls = undefined;
      shot.endFrameUrl = undefined;
    } else if (val === "multiImage" || val === "gridImage") {
      shot.endFrameUrl = undefined;
      if (!shot.imageUrls?.length) shot.imageUrls = shot.imageUrl ? [shot.imageUrl] : [];
    } else if (isDualFrame(val)) {
      shot.imageUrls = undefined;
    } else {
      shot.imageUrls = undefined;
      shot.endFrameUrl = undefined;
    }
  },
});

// 当前实际模式（VideoModelMode 类型）
const currentMode = computed(() => keyToMode(currentModeKey.value));

const isDualFrameMode = computed(() => {
  const m = currentMode.value;
  return !Array.isArray(m) && isDualFrame(m);
});

/** 当前模式是否为 VideoMixedRef[] */
const isMixedRefMode = computed(() => Array.isArray(currentMode.value));

/** 当前混合参考类型列表（只在 isMixedRefMode 时有值）*/
const mixedRefTypes = computed<VideoMixedRef[]>(() => {
  const m = currentMode.value;
  return Array.isArray(m) ? (m as VideoMixedRef[]) : [];
});

/** 混合模式下是否需要显示上传区域（至少含一个非 textReference 类型）*/
const mixedRefHasUpload = computed(() => mixedRefTypes.value.some((r) => r !== "textReference"));

const startFrameLabel = computed(() => (currentModeKey.value === "startFrameOptional" ? "首帧(可选)" : "首帧"));
const endFrameLabel = computed(() => (currentModeKey.value === "endFrameOptional" ? "尾帧(可选)" : "尾帧"));

function selectShot(index: number) {
  currentShotIndex.value = index;
  scrollToCurrentShot();
}

function scrollToCurrentShot() {
  nextTick(() => {
    const items = trackListRef.value?.querySelectorAll(".shotItem");
    (items?.[currentShotIndex.value] as HTMLElement)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  });
}
import openAssetsSelector from "@/utils/assetsCheck";

/** 文件后缀过滤辅助 */
const VIDEO_EXTS = [".mp4", ".mov", ".avi", ".webm", ".mkv"];
const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"];
const AUDIO_EXTS = [".mp3", ".wav", ".aac", ".flac", ".ogg", ".m4a"];

function matchExt(filePath: string, exts: string[]) {
  const lower = filePath.toLowerCase();
  return exts.some((ext) => lower.endsWith(ext));
}

async function handleAddImage() {
  const selectedAssets = await openAssetsSelector({
    multiple: false,
    title: "选择图片",
  });
  if (selectedAssets.length > 0) {
    const shot = shotList.value[currentShotIndex.value];
    if (!shot) return;
    const asset = selectedAssets[0];
    const filePath = asset.filePath;
    if (!filePath) return;
    const srcInfo: ImageSource = { type: "assets", id: asset.id, url: filePath };
    if (currentMode.value === "multiImage" || currentMode.value === "gridImage") {
      // 多图模式：追加到 imageUrls / imageSources
      if (!shot.imageUrls) shot.imageUrls = [];
      if (!shot.imageSources) shot.imageSources = [];
      shot.imageUrls.push(filePath);
      shot.imageSources.push(srcInfo);
    } else {
      // 单图 / 首帧模式：赋值到 imageUrl / imageSource
      shot.imageUrl = filePath;
      shot.imageSource = srcInfo;
    }
  }
}

/** 混合参考模式：按 refType 打开资产选择器并过滤文件类型 */
async function handleAddMixedRef(refType: VideoMixedRef) {
  const titleMap: Record<VideoMixedRef, string> = {
    videoReference: "选择参考视频",
    imageReference: "选择参考图片",
    audioReference: "选择参考音频",
    textReference: "",
  };
  const selectedAssets = await openAssetsSelector({
    multiple: false,
    title: titleMap[refType],
  });
  if (selectedAssets.length > 0) {
    const shot = shotList.value[currentShotIndex.value];
    if (!shot) return;
    const filePath = selectedAssets[0].filePath;
    if (!filePath) return;

    // 按 refType 校验后缀
    if (refType === "videoReference" && !matchExt(filePath, VIDEO_EXTS)) {
      console.warn("[MixedRef] 仅支持视频文件(.mp4 等)");
      return;
    }
    if (refType === "imageReference" && !matchExt(filePath, IMAGE_EXTS)) {
      console.warn("[MixedRef] 仅支持图片文件");
      return;
    }
    if (refType === "audioReference" && !matchExt(filePath, AUDIO_EXTS)) {
      console.warn("[MixedRef] 仅支持音频文件");
      return;
    }
    if (!shot.mixedRefs) shot.mixedRefs = {};
    shot.mixedRefs[refType as keyof MixedRefs] = { type: "assets", id: selectedAssets[0].id, url: filePath };
  }
}

function handleRemoveMixedRef(refType: VideoMixedRef) {
  const shot = shotList.value[currentShotIndex.value];
  if (shot?.mixedRefs) {
    delete shot.mixedRefs[refType as keyof MixedRefs];
  }
}

function handleSwapFrames() {
  const shot = shotList.value[currentShotIndex.value];
  if (!shot) return;
  const temp = shot.imageUrl;
  shot.imageUrl = shot.endFrameUrl;
  shot.endFrameUrl = temp;
}

async function handleAddEndFrame() {
  const selectedAssets = await openAssetsSelector({
    multiple: false,
    title: "选择尾帧",
  });
  if (selectedAssets.length > 0) {
    const shot = shotList.value[currentShotIndex.value];
    if (!shot) return;
    const asset = selectedAssets[0];
    if (!asset.filePath) return;
    shot.endFrameUrl = asset.filePath;
    shot.endFrameSource = { type: "assets", id: asset.id, url: asset.filePath };
  }
}

function handleRemoveImage() {
  const shot = shotList.value[currentShotIndex.value];
  if (shot) {
    shot.imageUrl = undefined;
    shot.imageSource = undefined;
  }
}

function handleRemoveEndFrame() {
  const shot = shotList.value[currentShotIndex.value];
  if (shot) {
    shot.endFrameUrl = undefined;
    shot.endFrameSource = undefined;
  }
}

function handleRemoveImageAt(idx: number) {
  const shot = shotList.value[currentShotIndex.value];
  if (shot?.imageUrls) shot.imageUrls.splice(idx, 1);
  if (shot?.imageSources) shot.imageSources.splice(idx, 1);
}
const { project } = storeToRefs(projectStore());
async function handleGenerate() {
  const shot = currentShot.value;
  //拿到当前镜头id
  const shotId = shot?.id;
  //拿到视频提示词（config.prompt 优先，否则分镜 prompt）
  const prompt = promptText.value;
  //拿到模型
  const model = shot?.model || modelDd.value;
  //拿到分辨率和时长
  const resolution = shot?.resolution || resolutionOptions.value[0];
  const duration = shot?.duration || durationOptions.value[0];
  //拿到模式
  const modeData = shot?.mode || (mode.value.length > 0 ? mode.value[0].value : "singleImage");

  // 组装 imageData，只传 id 和 type，不传 url
  type ImageDataItem = Pick<ImageSource, "type" | "id">;
  const imageData: ImageDataItem[] = [];

  const toItem = (src: ImageSource): ImageDataItem => ({ type: src.type, id: src.id });

  if (isMixedRefMode.value) {
    // 混合参考模式：按 mixedRefs 中实际存在的项收集
    const refs = shot?.mixedRefs;
    if (refs?.videoReference) imageData.push(toItem(refs.videoReference));
    if (refs?.imageReference) imageData.push(toItem(refs.imageReference));
    if (refs?.audioReference) imageData.push(toItem(refs.audioReference));
  } else if (currentMode.value === "multiImage" || currentMode.value === "gridImage") {
    // 多图模式：从 imageSources 取，如没有来源信息则降级构造 storyboard 类型
    const sources = shot?.imageSources;
    const urls = shot?.imageUrls || [];
    urls.forEach((_url, idx) => {
      const src = sources?.[idx] ?? { type: "storyboard" as const, id: shotId! };
      imageData.push({ type: src.type, id: src.id });
    });
  } else if (isDualFrameMode.value) {
    // 首尾帧模式
    if (shot?.imageUrl) {
      imageData.push(toItem(shot.imageSource ?? { type: "storyboard", id: shotId!, url: shot.imageUrl }));
    }
    if (shot?.endFrameUrl) {
      imageData.push(toItem(shot.endFrameSource ?? { type: "storyboard", id: shotId!, url: shot.endFrameUrl }));
    }
  } else {
    // 单图模式（singleImage / text 等）
    if (shot?.imageUrl) {
      imageData.push(toItem(shot.imageSource ?? { type: "storyboard", id: shotId!, url: shot.imageUrl }));
    }
  }

  const payload: Record<string, any> = {
    scriptId: shot?.scriptId,
    projectId: project.value?.id,
    storyboardId: shotId,
    prompt,
    data: imageData,
    model,
    resolution,
    duration,
    mode: modeData,
  };
  if (audioOptions.value !== false) {
    payload.audio = audioOptions.value === null ? false : true;
  }
  const { data } = await axios.post("/production/workbench/generateVideo", payload);
}

function handleBatchGenerate() {
  // 批量生成逻辑
}

function handleBatchDownload() {
  // 批量下载逻辑
}
// 分辨率选项
const resolutionOptions = ref<string[]>([]);
// 时长选项
const durationOptions = ref<number[]>([]);
// 音频：false=不支持，true=开启，null=可切换(optional)
const audioOptions = ref<boolean | null>(null);
//模式
const mode = ref<{ label: string; value: string }[]>([]);

function handleModelChange(value: string, data: VideoModel) {
  // 去重分辨率
  resolutionOptions.value = [...new Set(data.durationResolutionMap.flatMap((m) => m.resolution))];
  // 去重时长并排序
  durationOptions.value = [...new Set(data.durationResolutionMap.flatMap((m) => m.duration))].sort((a, b) => a - b);
  // audio: true=常开，optional=可切换(用 null 表示开启状态可切换)，false=不支持
  audioOptions.value = data.audio === false ? false : data.audio === true ? true : null;
  // 模式列表，value 统一用 modeToKey 序列化
  mode.value = data.mode.map((item) => ({
    label: getModeLabel(item),
    value: modeToKey(item),
  }));
  // 切换模型时重置当前镜头的模式选择
  const shot = shotList.value[currentShotIndex.value];
  if (shot) {
    shot.mode = undefined;
  }
}

function toggleAudio() {
  if (audioOptions.value === false) return;
  audioOptions.value = audioOptions.value === null ? true : null;
}

function handleResolutionChange(res: string) {
  const shot = shotList.value[currentShotIndex.value];
  if (!shot) return;
  shot.resolution = res;
}

function handleDurationChange(dur: number) {
  const shot = shotList.value[currentShotIndex.value];
  if (shot) shot.duration = dur;
}

/** 点击历史视频条目：选中并切换左侧预览 */
function handleSelectHistoryVideo(item: VideoRecord) {
  const shot = shotList.value[currentShotIndex.value];
  if (!shot) return;
  if (shot.selectedVideoId === item.id) {
    // 再次点击取消选中
    shot.selectedVideoId = undefined;
    shot.videoUrl = undefined;
  } else {
    shot.selectedVideoId = item.id;
    shot.videoUrl = item.filePath;
  }
}

/** 删除历史视频 */
function handleDeleteHistoryVideo(videoId: number | string) {
  const shot = shotList.value[currentShotIndex.value];
  if (!shot?.videos) return;
  shot.videos = shot.videos.filter((v) => v.id !== videoId);
  // 如果删除的正是当前播放的，清空预览
  if (shot.selectedVideoId === videoId) {
    shot.selectedVideoId = undefined;
    shot.videoUrl = undefined;
  }
}

function handleSelectAll(checked: boolean | string[]) {
  const isChecked = Array.isArray(checked) ? checked.length > 0 : checked;
  shotList.value.forEach((shot) => (shot.selected = isChecked));
}

watch(
  () => shotList.value.map((s) => s.selected),
  (selections) => {
    selectAll.value = selections.length > 0 && selections.every(Boolean);
  },
  { deep: true },
);

</script>

<style lang="scss" scoped>
%flexCenter {
  display: flex;
  align-items: center;
  justify-content: center;
}

.generateContainer {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  gap: 16px;

  .mainContent {
    display: flex;
    flex: 1;
    gap: 24px;
    min-height: 0;

    .previewArea {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #000;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e8e8e8;

      .videoWrapper {
        width: 100%;
        flex: 1;
        @extend %flexCenter;
        min-height: 0;
        position: relative;

        .previewVideo {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .placeholderImage {
          @extend %flexCenter;
          flex-direction: column;
          gap: 12px;
          color: #999;
          font-size: 14px;
        }
      }
    }

    .infoPanel {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;

      &::-webkit-scrollbar {
        width: 4px;
      }

      &::-webkit-scrollbar-thumb {
        background: #ddd;
        border-radius: 2px;
      }

      .infoSection {
        padding: 8px 0;

        .sectionLabel {
          font-size: 14px;
          color: #333;
          line-height: 1.8;
          font-weight: 500;

          &.highlightOrange {
            color: #d4860b;
          }

          &.highlightBlue {
            color: #3070d6;
          }
        }

        .sectionText {
          font-size: 14px;
          color: #666;
          line-height: 1.6;
          padding-left: 4px;

          .emptyText {
            color: #999;
          }
        }
      }
      .promptSection {
        padding: 4px 0 8px;

        .sectionTitle {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #333;
          margin-bottom: 12px;

          .titleIndicator {
            width: 3px;
            height: 14px;
            border-radius: 2px;
          }
        }
      }

      .frameSection {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 0;

        .frameSwapBtn {
          display: flex;
          align-items: center;
          justify-content: center;
          align-self: center;
          width: 28px;
          height: 28px;
          margin-bottom: 20px;
          border-radius: 50%;
          cursor: pointer;
          color: #999;
          transition: all 0.2s;
          flex-shrink: 0;

          &:hover {
            background: #f0f0f0;
          }
        }

        .frameItem {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;

          .frameThumbnail {
            width: 64px;
            height: 64px;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #e8e8e8;
            @extend %flexCenter;
            background: #f5f5f5;
            position: relative;

            .frameImage {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            .frameRemoveBtn {
              position: absolute;
              top: 3px;
              right: 3px;
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: rgba(0, 0, 0, 0.55);
              @extend %flexCenter;
              cursor: pointer;
              opacity: 0;
              transition: opacity 0.2s;
              z-index: 1;

              &:hover {
                background: rgba(0, 0, 0, 0.8);
              }
            }

            &:hover .frameRemoveBtn {
              opacity: 1;
            }

            &.addFrame {
              border: 1px dashed #ccc;
              cursor: pointer;
              transition: border-color 0.2s;
            }

            .audioRefIcon {
              @extend %flexCenter;
              width: 100%;
              height: 100%;
            }
          }

          .frameLabel {
            font-size: 12px;
            color: #999;
          }
        }
      }

      .actionBar {
        padding: 10px 0;
        border-top: 1px solid #f0f0f0;

        .actionBarRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: nowrap;

          .actionBarRowLeft {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 1;
            min-width: 0;
            overflow: hidden;
            .modelSelectItem {
              flex-shrink: 0;
              width: 150px;
            }
          }

          .actionBarRowRight {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-shrink: 0;
            .resDurBtn {
              white-space: nowrap;
            }

            .generateBtn {
              white-space: nowrap;
            }
          }
        }
      }

      .historySection {
        border-top: 1px solid #f0f0f0;
        padding-top: 12px;

        .historyHeader {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          font-weight: 500;
          color: #333;
          margin-bottom: 12px;

          .historyCount {
            color: #999;
            font-weight: 400;
          }
        }

        .historyContent {
          .historyEmpty {
            @extend %flexCenter;
            padding: 32px 0;
            font-size: 13px;
            color: #bbb;
          }

          .historyGrid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 8px;

            .historyCard {
              position: relative;
              width: 100%;
              aspect-ratio: 1 / 1;
              border-radius: 8px;
              overflow: hidden;
              cursor: pointer;
              border: 2.5px solid transparent;
              background: #1a1a1a;
              transition: border-color 0.2s;

              &:hover {
                border-color: #888;

                .historyCardDelete {
                  opacity: 1;
                }
              }

              &.active {
                border-color: #1a1a1a;
                box-shadow: 0 0 0 2px #1a1a1a;
              }

              .historyCardThumb {
                width: 100%;
                height: 100%;
                object-fit: cover;
                display: block;
              }

              .historyCardLoading {
                width: 100%;
                height: 100%;
                background: #2a2a2a;
                @extend %flexCenter;
                flex-direction: column;
                gap: 6px;
                color: #aaa;
                font-size: 12px;
              }

              .historyCardFailed {
                width: 100%;
                height: 100%;
                background: #2a1a1a;
                @extend %flexCenter;
                flex-direction: column;
                gap: 6px;
                color: #f66;
                font-size: 12px;
              }

              .historyCardCheck {
                position: absolute;
                top: 4px;
                right: 4px;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #1a1a1a;
                @extend %flexCenter;
                z-index: 2;
              }

              .historyCardDelete {
                position: absolute;
                bottom: 4px;
                right: 4px;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: rgba(0, 0, 0, 0.55);
                @extend %flexCenter;
                cursor: pointer;
                opacity: 0;
                transition: opacity 0.2s;
                z-index: 2;

                &:hover {
                  background: rgba(200, 0, 0, 0.8);
                }
              }
            }
          }
        }
      }
    }
  }

  .shotListArea {
    flex-shrink: 0;
    border-top: 1px solid #e8e8e8;
    padding-top: 12px;

    .shotListHeader {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding: 0 4px;

      .headerLeft {
        display: flex;
        align-items: center;
        gap: 8px;

        .trackTitle {
          font-size: 13px;
          color: #666;
        }
      }

      .headerRight {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }

    .shotListWrapper {
      overflow-x: auto;

      &::-webkit-scrollbar {
        height: 6px;
      }

      &::-webkit-scrollbar-thumb {
        background: #ddd;
        border-radius: 3px;
      }

      .shotList {
        display: flex;

        .shotItem {
          flex-shrink: 0;
          width: 160px;
          margin-right: 12px;
          cursor: pointer;
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid transparent;
          background: #fff;
          position: relative;
          transition: border-color 0.2s;

          &:hover,
          &.active {
            border: 3px solid #000;
          }

          .shotCheckbox {
            position: absolute;
            top: 8px;
            left: 8px;
            z-index: 2;
          }

          .shotImageWrapper {
            position: relative;
            width: 100%;
            height: 100px;
            background: #f5f5f5;

            .shotImage {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            .shotPlaceholder {
              width: 100%;
              height: 100%;
              @extend %flexCenter;
            }

            .shotDualFrame {
              display: flex;
              width: 100%;
              height: 100%;

              .shotFrameImg {
                width: 50%;
                height: 100%;
                object-fit: cover;

                &:first-child {
                  border-right: 1px solid #e8e8e8;
                }
              }

              .shotFramePlaceholder {
                width: 50%;
                height: 100%;
                @extend %flexCenter;
                background: #eee;

                &:first-child {
                  border-right: 1px solid #e8e8e8;
                }
              }
            }

            .shotNumber {
              position: absolute;
              bottom: 6px;
              right: 6px;
            }

            .shotDuration {
              position: absolute;
              bottom: 6px;
              left: 6px;
            }


          }
        }
      }
    }
  }
}
</style>

<style lang="scss">
.resDurPickerPopup {
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
}
</style>
