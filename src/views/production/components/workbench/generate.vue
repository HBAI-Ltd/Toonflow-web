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
          <img
            v-else-if="currentShot?.imageUrl"
            :src="currentShot.imageUrl"
            :alt="currentShot?.description"
            class="previewVideo" />
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
        <div class="frameSection" v-if="currentMode !== 'text'">
          <!-- singleImage: 单图 -->
          <template v-if="currentMode === 'singleImage'">
            <div class="frameItem">
              <div class="frameThumbnail" :class="{ addFrame: !currentShot?.imageUrl }" @click="!currentShot?.imageUrl && handleAddImage()">
                <img v-if="currentShot?.imageUrl" :src="currentShot.imageUrl" class="frameImage" />
                <i-plus v-else size="24" fill="#999" />
              </div>
              <span class="frameLabel">参考图</span>
            </div>
          </template>

          <!-- multiImage / gridImage: 多图 -->
          <template v-else-if="currentMode === 'multiImage' || currentMode === 'gridImage'">
            <div v-for="(img, idx) in currentShot?.imageUrls || []" :key="idx" class="frameItem">
              <div class="frameThumbnail">
                <img :src="img" class="frameImage" />
              </div>
            </div>
            <div class="frameItem" @click="handleAddImage">
              <div class="frameThumbnail addFrame">
                <i-plus size="24" fill="#999" />
              </div>
              <span class="frameLabel">图片</span>
            </div>
          </template>

          <!-- 首尾帧模式 -->
          <template v-else-if="isDualFrameMode">
            <div class="frameItem">
              <div class="frameThumbnail" :class="{ addFrame: !currentShot?.imageUrl }" @click="!currentShot?.imageUrl && handleAddImage()">
                <img v-if="currentShot?.imageUrl" :src="currentShot.imageUrl" class="frameImage" />
                <i-plus v-else size="24" fill="#999" />
              </div>
              <span class="frameLabel">{{ startFrameLabel }}</span>
            </div>
            <div class="frameSwapBtn" @click="handleSwapFrames">
              <i-switch size="16" />
            </div>
            <div class="frameItem" @click="handleAddEndFrame">
              <div class="frameThumbnail" :class="{ addFrame: !currentShot?.endFrameUrl }">
                <img v-if="currentShot?.endFrameUrl" :src="currentShot.endFrameUrl" class="frameImage" />
                <i-plus v-else size="24" fill="#999" />
              </div>
              <span class="frameLabel">{{ endFrameLabel }}</span>
            </div>
          </template>

          <!-- 混合参考模式 (Array) -->
          <template v-else-if="Array.isArray(currentMode)">
            <template v-for="(refType, idx) in currentMode" :key="idx">
              <div v-if="refType === 'image'" class="frameItem">
                <div class="frameThumbnail" :class="{ addFrame: !currentShot?.imageUrls?.[idx] }" @click="handleAddImage">
                  <img v-if="currentShot?.imageUrls?.[idx]" :src="currentShot.imageUrls[idx]" class="frameImage" />
                  <i-plus v-else size="24" fill="#999" />
                </div>
                <span class="frameLabel">图片</span>
              </div>
              <div v-else-if="refType === 'video'" class="frameItem">
                <div class="frameThumbnail" :class="{ addFrame: !currentShot?.videoUrl }" @click="handleAddImage">
                  <i-video v-if="!currentShot?.videoUrl" size="24" fill="#999" />
                  <span v-else class="frameImage refVideoThumb">▶</span>
                </div>
                <span class="frameLabel">视频</span>
              </div>
              <div v-else-if="refType === 'audio'" class="frameItem">
                <div class="frameThumbnail addFrame">
                  <i-music size="24" fill="#999" />
                </div>
                <span class="frameLabel">音频</span>
              </div>
              <div v-else-if="refType === 'text'" class="frameItem">
                <div class="frameThumbnail addFrame">
                  <i-text size="24" fill="#999" />
                </div>
                <span class="frameLabel">文本</span>
              </div>
            </template>
          </template>
        </div>

        <!-- 模型信息与操作栏 -->
        <div class="actionBar">
          <div class="actionBarLeft">
            <t-select
              :value="currentShot?.model || 'Seedance 1.5 Pro'"
              size="small"
              auto-width
              :popup-props="{ overlayInnerStyle: { width: '200px' } }"
              @change="handleModelChange">
              <t-option v-for="opt in modelOptions" :key="opt.value" :value="opt.value" :label="opt.label" />
            </t-select>
            <t-popup
              trigger="click"
              placement="top"
              overlay-class-name="resDurPickerPopup"
              :overlay-inner-style="{ padding: '16px', borderRadius: '8px' }">
              <t-button size="small" ghost block :disabled="currentAudioConfig === false" @click="currentAudioConfig === 'optional' && toggleAudio()">
                {{ currentShot?.resolution || availableResolutions[0] || "1280x720" }} ·
                {{ (currentShot?.duration || availableDurations[0] || 4).toString().padStart(2, "0") }}s
              </t-button>
              <template #content>
                <div class="resolutionDurationPicker">
                  <div class="pickerSection">
                    <div class="pickerLabel">分辨率</div>
                    <div class="pickerOptions">
                      <div
                        v-for="res in availableResolutions"
                        :key="res"
                        class="pickerOption"
                        :class="{ active: (currentShot?.resolution || availableResolutions[0]) === res }"
                        @click="handleResolutionChange(res)">
                        {{ res }}
                      </div>
                    </div>
                  </div>
                  <div class="pickerSection">
                    <div class="pickerLabel">时长</div>
                    <div class="pickerOptions">
                      <div
                        v-for="dur in availableDurations"
                        :key="dur"
                        class="pickerOption"
                        :class="{ active: (currentShot?.duration || availableDurations[0]) === dur }"
                        @click="handleDurationChange(dur)">
                        {{ dur }}s
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </t-popup>
            <!-- 音频按钮: true=常亮, optional=可切换, false=禁用态 -->
            <t-button
              :theme="isAudioActive ? 'success' : 'danger'"
              size="small"
              :disabled="currentAudioConfig === false"
              @click="currentAudioConfig === 'optional' && toggleAudio()">
              <template #icon>
                <i-volume-notice v-if="isAudioActive" size="16" />
                <i-volume-mute v-else size="16" />
              </template>
            </t-button>
          </div>
          <div class="actionBarRight">
            <t-button theme="primary" size="small" @click="handleGenerate">
              <template #icon><i-arrow-up size="16" /></template>
              生成
            </t-button>
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

type VideoModelMode =
  | "singleImage"
  | "multiImage"
  | "gridImage"
  | "startEndRequired"
  | "endFrameOptional"
  | "startFrameOptional"
  | "text"
  | ("video" | "image" | "audio" | "text")[];

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

function getModeLabel(mode?: VideoModelMode) {
  if (Array.isArray(mode)) return "混合参考";
  return (
    (
      {
        singleImage: "单图",
        multiImage: "多图",
        gridImage: "网格多图",
        startEndRequired: "首尾帧",
        endFrameOptional: "首尾帧",
        startFrameOptional: "首尾帧",
        text: "文生视频",
      } as Record<string, string>
    )[mode || ""] || mode
  );
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

interface Shot {
  id: number | string;
  description: string;
  duration?: number;
  imageUrl?: string;
  imageUrls?: string[];
  endFrameUrl?: string;
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
const previewVideoRef = ref<HTMLVideoElement>();
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

const videoModels = ref<VideoModel[]>([
  {
    name: "Seedance 1.5 Pro",
    modelName: "doubao-seedance-1-5-pro",
    type: "video",
    mode: ["singleImage", "text", "endFrameOptional"],
    audio: true,
    durationResolutionMap: [{ duration: [4, 5, 6, 7, 8, 9, 10, 11, 12], resolution: ["480p", "720p", "1080p"] }],
  },
  {
    name: "Seedance 1.5 Multi",
    modelName: "doubao-seedance-1-5-multi",
    type: "video",
    mode: ["multiImage", "text"],
    audio: false,
    durationResolutionMap: [{ duration: [4, 5, 6, 7, 8], resolution: ["480p", "720p", "1080p"] }],
  },
  {
    name: "Kling v1 Pro",
    modelName: "kling-v1-pro",
    type: "video",
    mode: ["singleImage", "text", "startEndRequired"],
    audio: false,
    durationResolutionMap: [{ duration: [5, 10], resolution: ["1080p"] }],
  },
  {
    name: "Vidu",
    modelName: "vidu",
    type: "video",
    mode: ["singleImage", "text"],
    audio: false,
    durationResolutionMap: [{ duration: [4, 8], resolution: ["720p", "1080p"] }],
  },
  {
    name: "Sora 2",
    modelName: "Sora-2-I2V",
    type: "video",
    mode: ["singleImage", "text"],
    audio: "optional",
    durationResolutionMap: [{ duration: [4, 8, 12], resolution: ["720x1280", "1280x720", "1024x1792", "1792x1024"] }],
  },
]);

const modelOptions = computed(() => videoModels.value.map((m) => ({ label: m.name, value: m.name })));
const currentShot = computed(() => shotList.value[currentShotIndex.value] || null);
const currentMode = computed((): VideoModelMode => currentShot.value?.mode || "singleImage");

const isDualFrameMode = computed(() => isDualFrame(currentMode.value));

const startFrameLabel = computed(() => (currentMode.value === "startFrameOptional" ? "首帧(可选)" : "首帧"));
const endFrameLabel = computed(() => (currentMode.value === "endFrameOptional" ? "尾帧(可选)" : "尾帧"));

const currentVideoModel = computed(() => {
  const modelName = currentShot.value?.model || videoModels.value[0]?.name;
  return videoModels.value.find((m) => m.name === modelName) || videoModels.value[0];
});

const availableResolutions = computed(() => {
  const model = currentVideoModel.value;
  if (!model) return [];
  const allRes = new Set<string>();
  model.durationResolutionMap.forEach((m) => m.resolution.forEach((r) => allRes.add(r)));
  return Array.from(allRes);
});

const availableDurations = computed(() => {
  const model = currentVideoModel.value;
  if (!model) return [];
  const currentRes = currentShot.value?.resolution;
  if (currentRes) {
    const matched = model.durationResolutionMap.find((m) => m.resolution.includes(currentRes));
    if (matched) return matched.duration;
  }
  const allDur = new Set<number>();
  model.durationResolutionMap.forEach((m) => m.duration.forEach((d) => allDur.add(d)));
  return Array.from(allDur).sort((a, b) => a - b);
});

const currentCharacters = computed(() => currentShot.value?.characters || []);
const currentAudioConfig = computed(() => currentVideoModel.value?.audio ?? false);

const audioEnabled = ref(false);

const isAudioActive = computed(() => currentAudioConfig.value === true || (currentAudioConfig.value === "optional" && audioEnabled.value));

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

function handleAddImage() {
  // 添加图片逻辑
}

function handleSwapFrames() {
  const shot = shotList.value[currentShotIndex.value];
  if (!shot) return;
  const temp = shot.imageUrl;
  shot.imageUrl = shot.endFrameUrl;
  shot.endFrameUrl = temp;
}

function handleAddEndFrame() {
  // 添加尾帧逻辑
}

function handleGenerate() {
  // 单个生成逻辑
}

function handleBatchGenerate() {
  // 批量生成逻辑
}

function handleBatchDownload() {
  // 批量下载逻辑
}

function handleModelChange(value: any) {
  const shot = shotList.value[currentShotIndex.value];
  if (!shot) return;
  shot.model = String(value);
  const model = videoModels.value.find((m) => m.name === value);
  if (model) {
    const firstMap = model.durationResolutionMap[0];
    if (firstMap) {
      shot.resolution = firstMap.resolution[0];
      shot.duration = firstMap.duration[0];
    }
    audioEnabled.value = model.audio === true;
  }
}

function toggleAudio() {
  audioEnabled.value = !audioEnabled.value;
}

function handleResolutionChange(res: string) {
  const shot = shotList.value[currentShotIndex.value];
  if (!shot) return;
  shot.resolution = res;
  const model = currentVideoModel.value;
  if (model) {
    const matched = model.durationResolutionMap.find((m) => m.resolution.includes(res));
    if (matched && shot.duration && !matched.duration.includes(shot.duration)) {
      shot.duration = matched.duration[0];
    }
  }
}

function handleDurationChange(dur: number) {
  const shot = shotList.value[currentShotIndex.value];
  if (shot) shot.duration = dur;
}

function handlePlayVideo(_shot: Shot) {
  // 播放视频逻辑
}

function handlePromptChange(val: string) {
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
            background: var(--td-brand-color-10);
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
          border-radius: 50%;
          cursor: pointer;
          color: #999;
          transition: all 0.2s;
          flex-shrink: 0;

          &:hover {
            background: #f0f0f0;
            color: var(--td-brand-color);
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

            .frameImage {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            &.addFrame {
              border: 1px dashed #ccc;
              cursor: pointer;
              transition: border-color 0.2s;

              &:hover {
                border-color: var(--td-brand-color);
              }
            }
          }

          .frameLabel {
            font-size: 12px;
            color: #999;
          }
        }
      }

      .actionBar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 0;
        border-top: 1px solid #f0f0f0;
        flex-wrap: nowrap;

        .actionBarLeft {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: nowrap;
          overflow: hidden;
          min-width: 0;
        }

        .actionBarRight {
          display: flex;
          align-items: center;
          gap: 8px;
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
            border-color: var(--td-brand-color);
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
