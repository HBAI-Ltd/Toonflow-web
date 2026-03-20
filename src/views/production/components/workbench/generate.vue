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
            @change="handlePromptChange" />
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
            <span class="historyCount">({{ historyList.length }})</span>
          </div>
          <div class="historyContent">
            <div v-if="!historyList.length" class="historyEmpty">暂无历史记录</div>
            <div v-else class="historyList">
              <div v-for="item in historyList" :key="item.id" class="historyItem">
                <img :src="item.imageUrl" class="historyThumb" />
                <span>{{ item.label }}</span>
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
              <!-- 状态标签 -->
              <t-tag
                v-if="shot.status"
                class="shotStatus"
                size="small"
                :theme="shot.status === 'completed' ? 'success' : shot.status === 'failed' ? 'danger' : 'warning'"
                variant="dark">
                {{ getStatusLabel(shot.status) }}
              </t-tag>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
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

interface ShotCharacter {
  name: string;
  role: string;
  avatar?: string;
}

interface HistoryItem {
  id: number | string;
  imageUrl: string;
  label: string;
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
  description: string;
  duration?: number;
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
  characters?: ShotCharacter[];
  sceneDesc?: string;
  camera?: string;
  model?: string;
  mode?: VideoModelMode;
  resolution?: string;
  tokenCost?: number;
  status?: "generating" | "completed" | "failed";
  selected?: boolean;
  /** VideoMixedRef 模式下各参考资源 */
  mixedRefs?: MixedRefs;
}

const shotList = ref<Shot[]>([
  {
    id: 1,
    description: "艾琳走出舱门",
    duration: 4,
    imageUrl: "https://picsum.photos/400/300?random=1",
    characters: [{ name: "艾琳", role: "身穿宇航服从舱门走出的人" }],
    sceneDesc: "艾琳的脚踏出舱门，踩在发光的苔藓上，激起光粒。",
    camera: "固定镜头，仰视角度，中景，正常速度。",
    model: "Seedance 1.5 Pro",
    mode: "singleImage",
    resolution: "16:9 · 720p",
    tokenCost: 22,
    status: "completed",
    selected: false,
  },
  {
    id: 2,
    description: "探索神秘洞穴",
    duration: 4,
    imageUrl: "https://picsum.photos/400/300?random=2",
    characters: [{ name: "艾琳", role: "身穿宇航服从舱门走出的人" }],
    sceneDesc: "艾琳手持光源，小心翼翼地进入幽深的洞穴。",
    camera: "跟拍镜头，中景，缓慢推进。",
    mode: "singleImage",
    status: "completed",
    selected: false,
  },
  {
    id: 3,
    description: "发现水晶矿脉",
    duration: 4,
    imageUrl: "https://picsum.photos/400/300?random=3",
    sceneDesc: "蓝紫色的水晶矿脉在黑暗中闪烁。",
    camera: "特写镜头，缓慢横移。",
    mode: "singleImage",
    status: "completed",
    selected: false,
  },
  {
    id: 4,
    description: "能量波动异常",
    duration: 4,
    imageUrl: "https://picsum.photos/400/300?random=4",
    sceneDesc: "水晶忽然发出强烈的光芒。",
    camera: "快速变焦，制造紧张感。",
    mode: "singleImage",
    status: "completed",
    selected: false,
  },
  {
    id: 5,
    description: "神秘生物现身",
    duration: 4,
    imageUrl: "https://picsum.photos/400/300?random=5",
    sceneDesc: "一个发光的神秘生物从水晶中浮现。",
    camera: "固定镜头，大全景。",
    mode: "singleImage",
    status: "completed",
    selected: false,
  },
  {
    id: 6,
    description: "对视交流",
    duration: 6,
    imageUrl: "https://picsum.photos/400/300?random=6",
    endFrameUrl: "https://picsum.photos/400/300?random=16",
    sceneDesc: "艾琳与神秘生物四目相对。",
    camera: "正反打镜头，特写。",
    mode: "endFrameOptional",
    status: "generating",
    selected: false,
  },
  {
    id: 7,
    description: "心灵感应",
    duration: 5,
    imageUrl: "https://picsum.photos/400/300?random=7",
    imageUrls: ["https://picsum.photos/400/300?random=7", "https://picsum.photos/400/300?random=17"],
    sceneDesc: "光芒包裹住艾琳，传递着信息。",
    camera: "环绕镜头，360度旋转。",
    model: "Seedance 1.5 Multi",
    mode: "multiImage",
    status: "generating",
    selected: false,
  },
]);

const currentShotIndex = ref(0);
const trackListRef = ref<HTMLElement>();
const historyList = ref<HistoryItem[]>([]);
const selectAll = ref(false);

const promptText = computed({
  get: () => {
    const shot = currentShot.value;
    if (!shot) return "";
    const parts: string[] = [];
    if (shot.characters?.length) {
      parts.push("出场人物: " + shot.characters.map((c) => `${c.name}(${c.role})`).join("、"));
    }
    if (shot.sceneDesc) parts.push("画面描述: " + shot.sceneDesc);
    if (shot.camera) parts.push("运镜方式: " + shot.camera);
    return parts.join("\n");
  },
  set: (val: string) => {
    const shot = shotList.value[currentShotIndex.value];
    if (!shot) return;
    shot.sceneDesc = val;
  },
});

const hasSelected = computed(() => shotList.value.some((s) => s.selected));

const currentShot = computed(() => shotList.value[currentShotIndex.value] || null);

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

function getStatusLabel(status?: string) {
  return ({ completed: "完成", generating: "生成中", failed: "失败" } as Record<string, string>)[status || ""] || "单图";
}

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
  //拿到视频提示词
  const prompt = promptText.value;
  //拿到模型
  const model = shot?.model || modelDd.value;
  //拿到分辨率和时长
  const resolution = shot?.resolution || resolutionOptions.value[0];
  const duration = shot?.duration || durationOptions.value[0];
  //拿到模式
  const modeData = shot?.mode || (mode.value.length > 0 ? mode.value[0].value : "singleImage");

  // 组装 imageData
  const imageData: ImageSource[] = [];

  if (isMixedRefMode.value) {
    // 混合参考模式：按 mixedRefs 中实际存在的项收集
    const refs = shot?.mixedRefs;
    if (refs?.videoReference) imageData.push(refs.videoReference);
    if (refs?.imageReference) imageData.push(refs.imageReference);
    if (refs?.audioReference) imageData.push(refs.audioReference);
  } else if (currentMode.value === "multiImage" || currentMode.value === "gridImage") {
    // 多图模式：从 imageSources 取，如没有来源信息则降级用 imageUrls 构造 storyboard 类型
    const sources = shot?.imageSources;
    const urls = shot?.imageUrls || [];
    urls.forEach((url, idx) => {
      imageData.push(sources?.[idx] ?? { type: "storyboard", id: shotId!, url });
    });
  } else if (isDualFrameMode.value) {
    // 首尾帧模式
    if (shot?.imageUrl) {
      imageData.push(shot.imageSource ?? { type: "storyboard", id: shotId!, url: shot.imageUrl });
    }
    if (shot?.endFrameUrl) {
      imageData.push(shot.endFrameSource ?? { type: "storyboard", id: shotId!, url: shot.endFrameUrl });
    }
  } else {
    // 单图模式（singleImage / text 等）
    if (shot?.imageUrl) {
      imageData.push(shot.imageSource ?? { type: "storyboard", id: shotId!, url: shot.imageUrl });
    }
  }

  const payload: Record<string, any> = {
    projectId: project.value?.id,
    storyboardId: shotId,
    prompt,
    imageData,
    model,
    resolution,
    duration,
    modeData,
  };
  if (audioOptions.value !== false) {
    payload.audio = audioOptions.value === null ? false : true;
  }
  console.log("%c Line:747 🎂 payload", "background:#2eafb0", payload);

  // const { data } = await axios.post("/production/workbench/generateVideo", payload);
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

function handlePlayVideo(_shot: Shot) {
  // 播放视频逻辑
}

function handlePromptChange(val: any) {
  const shot = shotList.value[currentShotIndex.value];
  if (shot) shot.sceneDesc = val;
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

          .historyList {
            display: flex;
            flex-direction: column;
            gap: 8px;

            .historyItem {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 6px;
              border-radius: 8px;
              cursor: pointer;
              transition: background 0.2s;

              &:hover {
                background: #f5f5f5;
              }

              .historyThumb {
                width: 48px;
                height: 36px;
                border-radius: 4px;
                object-fit: cover;
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

            .shotStatus {
              position: absolute;
              top: 6px;
              right: 6px;
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
