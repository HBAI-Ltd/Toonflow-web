<template>
  <div class="generateContainer">
    <div class="mainContent">
      <div class="previewArea">
        <div class="videoWrapper">
          <video
            v-if="selectedData?.videoUrl"
            ref="previewVideoRef"
            :src="selectedData.videoUrl"
            :poster="selectedData.imageUrl"
            class="previewVideo"
            controls
            preload="metadata" />
          <img v-else-if="selectedData?.imageUrl" :src="selectedData.imageUrl" class="previewVideo" />
          <div v-else class="placeholderImage">
            <i-pic size="48" fill="#999" />
            <span>暂无视频</span>
          </div>
        </div>
      </div>
      <t-card class="infoPanel">
        <div class="promptSection">
          <div class="sectionTitle">
            <span class="titleIndicator" />
            视频提示词
          </div>
          <t-textarea v-model="promptText" placeholder="输入提示词，描述你想要生成的视频内容..." :autosize="{ minRows: 4, maxRows: 12 }" />
          <div class="frameSection" v-if="currentModeKey !== 'text' && mode.length > 0 && (!isMixedRefMode || mixedRefTypes.length > 0)">
            <template v-if="currentMode === 'singleImage'">
              <div class="frameItem">
                <div
                  class="frameThumbnail"
                  :class="{ addFrame: !currentShot?.config?.data?.[0]?.url }"
                  @click="!currentShot?.config?.data?.[0]?.url && handleAddImage()">
                  <img v-if="currentShot?.config?.data?.[0]?.url" :src="currentShot.config!.data![0].url" class="frameImage" />
                  <i-plus v-else size="24" fill="#999" />
                  <div v-if="currentShot?.config?.data?.[0]?.url" class="frameRemoveBtn" @click.stop="handleRemoveImage()">
                    <i-close size="12" fill="#fff" />
                  </div>
                </div>
                <span class="frameLabel">参考图</span>
              </div>
            </template>
            <template v-else-if="currentMode === 'multiImage' || currentMode === 'gridImage'">
              <div v-for="(item, idx) in currentShot?.config?.data || []" :key="idx" class="frameItem">
                <div class="frameThumbnail">
                  <img :src="item.url" class="frameImage" />
                  <div class="frameRemoveBtn" @click.stop="handleRemoveImageAt(idx)">
                    <i-close size="12" fill="#fff" />
                  </div>
                </div>
              </div>
              <div class="frameItem" @click="handleAddImageMulti">
                <div class="frameThumbnail addFrame">
                  <i-plus size="24" fill="#999" />
                </div>
                <span class="frameLabel">图片</span>
              </div>
            </template>
            <template v-else-if="isMixedRefMode">
              <template v-for="refType in mixedRefTypes" :key="refType">
                <template v-if="refType === 'videoReference'">
                  <div class="frameItem">
                    <div
                      class="frameThumbnail"
                      :class="{ addFrame: !currentShot?.config?.data?.find((d) => d.type === 'videoReference') }"
                      @click="!currentShot?.config?.data?.find((d) => d.type === 'videoReference') && handleAddMixedRef('videoReference')">
                      <video
                        v-if="currentShot?.config?.data?.find((d) => d.type === 'videoReference')"
                        :src="currentShot.config!.data!.find((d) => d.type === 'videoReference')!.url"
                        class="frameImage"
                        muted
                        preload="metadata" />
                      <i-plus v-else size="24" fill="#999" />
                      <div
                        v-if="currentShot?.config?.data?.find((d) => d.type === 'videoReference')"
                        class="frameRemoveBtn"
                        @click.stop="handleRemoveMixedRef('videoReference')">
                        <i-close size="12" fill="#fff" />
                      </div>
                    </div>
                    <span class="frameLabel">参考视频</span>
                  </div>
                </template>
                <template v-else-if="refType === 'imageReference'">
                  <div class="frameItem">
                    <div
                      class="frameThumbnail"
                      :class="{ addFrame: !currentShot?.config?.data?.find((d) => d.type === 'imageReference') }"
                      @click="!currentShot?.config?.data?.find((d) => d.type === 'imageReference') && handleAddMixedRef('imageReference')">
                      <img
                        v-if="currentShot?.config?.data?.find((d) => d.type === 'imageReference')"
                        :src="currentShot.config!.data!.find((d) => d.type === 'imageReference')!.url"
                        class="frameImage" />
                      <i-plus v-else size="24" fill="#999" />
                      <div
                        v-if="currentShot?.config?.data?.find((d) => d.type === 'imageReference')"
                        class="frameRemoveBtn"
                        @click.stop="handleRemoveMixedRef('imageReference')">
                        <i-close size="12" fill="#fff" />
                      </div>
                    </div>
                    <span class="frameLabel">参考图片</span>
                  </div>
                </template>
                <template v-else-if="refType === 'audioReference'">
                  <div class="frameItem">
                    <div
                      class="frameThumbnail"
                      :class="{ addFrame: !currentShot?.config?.data?.find((d) => d.type === 'audioReference') }"
                      @click="!currentShot?.config?.data?.find((d) => d.type === 'audioReference') && handleAddMixedRef('audioReference')">
                      <div v-if="currentShot?.config?.data?.find((d) => d.type === 'audioReference')" class="audioRefIcon">
                        <i-volume-notice size="24" fill="#3070d6" />
                      </div>
                      <i-plus v-else size="24" fill="#999" />
                      <div
                        v-if="currentShot?.config?.data?.find((d) => d.type === 'audioReference')"
                        class="frameRemoveBtn"
                        @click.stop="handleRemoveMixedRef('audioReference')">
                        <i-close size="12" fill="#fff" />
                      </div>
                    </div>
                    <span class="frameLabel">参考音频</span>
                  </div>
                </template>
                <template v-else-if="refType === 'textReference'">
                </template>
              </template>
            </template>

            <template v-else-if="isDualFrameMode">
              <div class="frameItem">
                <div
                  class="frameThumbnail"
                  :class="{ addFrame: !currentShot?.config?.data?.[0]?.url }"
                  @click="!currentShot?.config?.data?.[0]?.url && handleAddImage()">
                  <img v-if="currentShot?.config?.data?.[0]?.url" :src="currentShot.config!.data![0].url" class="frameImage" />
                  <i-plus v-else size="24" fill="#999" />
                  <div v-if="currentShot?.config?.data?.[0]?.url" class="frameRemoveBtn" @click.stop="handleRemoveImage()">
                    <i-close size="12" fill="#fff" />
                  </div>
                </div>
                <span class="frameLabel">{{ startFrameLabel }}</span>
              </div>
              <div class="frameSwapBtn" @click="handleSwapFrames">
                <i-switch size="16" />
              </div>
              <div class="frameItem" @click="!currentShot?.config?.data?.[1]?.url && handleAddEndFrame()">
                <div class="frameThumbnail" :class="{ addFrame: !currentShot?.config?.data?.[1]?.url }">
                  <img v-if="currentShot?.config?.data?.[1]?.url" :src="currentShot.config!.data![1].url" class="frameImage" />
                  <i-plus v-else size="24" fill="#999" />
                  <div v-if="currentShot?.config?.data?.[1]?.url" class="frameRemoveBtn" @click.stop="handleRemoveEndFrame()">
                    <i-close size="12" fill="#fff" />
                  </div>
                </div>
                <span class="frameLabel">{{ endFrameLabel }}</span>
              </div>
            </template>
          </div>
          <div class="actionBar">
            <div class="actionBarRow">
              <div class="actionBarRowLeft">
                <modelSelect v-model="modelDd" :changeConfig="true" type="video" size="small" @change="handleModelChange" class="modelSelectItem" />
                <t-select v-if="modelLoaded && mode.length > 0" v-model="currentModeKey" style="width: 180px" size="small">
                  <t-option v-for="m in mode" :key="m.value" :label="m.label" :value="m.value" />
                </t-select>
                <t-tooltip
                  v-if="modelLoaded && audioOptions !== false && mode.length > 0"
                  :content="selectedAudio ? '关闭音频' : '开启音频'"
                  placement="top">
                  <t-button
                    :theme="selectedAudio ? 'primary' : 'default'"
                    variant="outline"
                    size="small"
                    class="audioBtn"
                    :disabled="audioOptions !== null"
                    @click="toggleAudio()">
                    <template #icon>
                      <i-volume-notice v-if="selectedAudio" size="16" />
                      <i-volume-mute v-else size="16" />
                    </template>
                  </t-button>
                </t-tooltip>
                <t-popup
                  v-if="modelLoaded && (resolutionOptions.length || durationOptions.length)"
                  trigger="click"
                  placement="top"
                  overlay-class-name="resDurPickerPopup"
                  :overlay-inner-style="{ padding: '16px', borderRadius: '8px' }">
                  <t-button size="small" variant="outline" class="resDurBtn">
                    <template v-if="resolutionOptions.length">{{ selectedResolution }}</template>
                    <template v-if="resolutionOptions.length && durationOptions.length">·</template>
                    <template v-if="durationOptions.length">{{ selectedDuration.toString().padStart(2, "0") }}s</template>
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
                            :class="{ active: selectedResolution === res }"
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
              <div class="actionBarRowRight">
                <t-button theme="primary" size="small" class="generateBtn" @click="handleGenerate">
                  <template #icon><i-arrow-up size="16" /></template>
                  生成
                </t-button>
              </div>
            </div>
          </div>

          <div class="historySection">
            <div class="historyHeader jb ac">
              <div>
                <i-time size="16" />
                <span>历史版本</span>
                <span class="historyCount">({{ currentHistoryList.length }})</span>
              </div>
              <div>
                <t-button theme="primary" size="small" @click="handleConfirmSelection">确认选中</t-button>
              </div>
            </div>
            <div class="historyContent">
              <div v-if="!currentHistoryList.length" class="historyEmpty">暂无历史记录</div>
              <div v-else class="historyGrid">
                <div
                  v-for="video in currentHistoryList"
                  :key="video.id"
                  class="historyCard"
                  :class="{
                    active: currentShot?.selectedVideoId === video.id,
                    disabled: video.state === '生成中' || video.state === '生成失败',
                  }"
                  @click="handleSelectHistoryVideo(video)">
                  <template v-if="video.state === '生成成功'">
                    <video
                      :src="video.filePath"
                      class="historyCardThumb"
                      :poster="videoFrameCache.get(video.filePath) || currentShot?.config?.data?.[0]?.url || currentShot?.filePath || ''"
                      preload="metadata"
                      muted
                      @loadedmetadata="(e: Event) => extractLastFrame(video.filePath, e.target as HTMLVideoElement)" />
                  </template>
                  <template v-else-if="video.state === '生成中'">
                    <div class="historyCardThumb historyCardThumbEmpty" />
                    <div class="historyCardOverlay">
                      <t-loading size="24" theme="dots" />
                      <span class="overlayText">生成中</span>
                    </div>
                  </template>
                  <template v-else-if="video.state === '生成失败'">
                    <div class="historyCardThumb historyCardThumbEmpty" />
                    <div class="historyCardOverlay historyCardOverlayFailed">
                      <i-close size="20" fill="#f66" />
                      <span class="overlayText">生成失败</span>
                    </div>
                  </template>
                  <template v-else>
                    <div class="historyCardThumb historyCardThumbEmpty" />
                  </template>
                  <div v-if="currentShot?.selectedVideoId === video.id" class="historyCardCheck">
                    <i-check size="12" fill="#fff" />
                  </div>
                  <div class="historyCardDelete" @click.stop="handleDeleteHistoryVideo(video.id)">
                    <i-delete size="12" fill="#fff" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </t-card>
    </div>
    <div class="shotListArea">
      <div class="shotListHeader">
        <div class="headerLeft">
          <t-checkbox v-model="selectAll" :indeterminate="isIndeterminate" @change="handleSelectAll">全选</t-checkbox>
          <span class="trackTitle">视频轨道</span>
        </div>
        <div class="headerRight">
          <t-button theme="primary" size="small" :disabled="checkedIds.size === 0" @click="handleBatchGenerate">
            <template #icon><i-magic size="16" /></template>
            批量生成
          </t-button>
          <t-button theme="default" variant="outline" size="small" :disabled="checkedIds.size === 0" @click="handleBatchDownload">
            <template #icon><i-download size="16" /></template>
            导入剪辑台
          </t-button>
        </div>
      </div>
      <div class="shotListWrapper" ref="trackListRef">
        <div class="shotList">
          <div
            v-for="(item, index) in shotList"
            :key="index"
            class="shotItem"
            :class="{ active: selectedData?.id === item.id }"
            @click="selectShot(item.id)">
            <div class="shotImageWrapper">
              <t-checkbox
                class="shotCheckbox"
                :checked="checkedIds.has(item.id)"
                @click.stop
                @change="(val: boolean) => handleItemCheck(item.id, val)" />
              <template v-if="getVideoRecord(item)">
                <video
                  :src="getVideoRecord(item)!.filePath"
                  class="shotImage"
                  :poster="videoFrameCache.get(getVideoRecord(item)!.filePath) || item.config?.data?.[0]?.url || item.filePath || ''"
                  muted
                  loop
                  preload="metadata"
                  @loadedmetadata="(e: Event) => extractLastFrame(getVideoRecord(item)!.filePath, e.target as HTMLVideoElement)" />
              </template>
              <template v-else-if="isDualFrame(item.config?.mode as VideoModelMode)">
                <div class="shotDualFrame">
                  <img v-if="item.config?.data?.[0]?.url || item.filePath" :src="item.config?.data?.[0]?.url || item.filePath" class="shotFrameImg" />
                  <div v-else class="shotFramePlaceholder"><i-pic size="16" fill="#999" /></div>
                  <img v-if="item.config?.data?.[1]?.url" :src="item.config.data[1].url" class="shotFrameImg" />
                  <div v-else class="shotFramePlaceholder"><i-pic size="16" fill="#999" /></div>
                </div>
              </template>
              <template v-else-if="item.config?.data && item.config.data.length > 1">
                <div
                  class="shotMultiFrame"
                  :style="{
                    gridTemplateColumns: `repeat(${item.config.data.length <= 2 ? 2 : 3}, 1fr)`,
                    gridTemplateRows: `repeat(${Math.ceil(item.config.data.length / (item.config.data.length <= 2 ? 2 : 3))}, 1fr)`,
                  }">
                  <img v-for="(d, idx) in item.config.data" :key="idx" :src="d.url" class="shotMultiFrameImg" />
                </div>
              </template>
              <template v-else>
                <img v-if="item.config?.data?.[0]?.url || item.filePath" :src="item.config?.data?.[0]?.url || item.filePath" class="shotImage" />
                <div v-else class="shotPlaceholder"><i-pic size="16" fill="#999" /></div>
              </template>
              <t-tag class="shotNumber" size="small" variant="dark">#{{ index + 1 }}</t-tag>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onUnmounted, reactive } from "vue";
import { storeToRefs } from "pinia";
import axios from "@/utils/axios";
import projectStore from "@/stores/project";
import modelSelect from "@/components/modelSelect.vue";
import openAssetsSelector from "@/utils/assetsCheck";

/** 视频最后一帧缓存：key 为视频 filePath，value 为 canvas 截帧的 dataURL */
const videoFrameCache = reactive(new Map<string, string>());

/**
 * 提取视频最后一帧并写入缓存。
 * 通过将 currentTime 设为 duration 跳到末尾，在 seeked 事件后用 canvas 截图。
 * 避免第一帧黑屏问题。
 */
function extractLastFrame(videoUrl: string, videoEl: HTMLVideoElement) {
  if (!videoUrl || videoFrameCache.has(videoUrl)) return;
  const duration = videoEl.duration;
  if (!duration || !isFinite(duration)) return;
  // 跳到最后一帧（稍微往前一点避免刚好超出）
  videoEl.currentTime = Math.max(0, duration - 0.01);
  const onSeeked = () => {
    videoEl.removeEventListener("seeked", onSeeked);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoEl.videoWidth || 320;
      canvas.height = videoEl.videoHeight || 180;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      if (dataUrl && dataUrl !== "data:,") {
        videoFrameCache.set(videoUrl, dataUrl);
      }
    } catch {
      // 跨域资源无法截帧时忽略，poster 继续使用分镜图
    }
  };
  videoEl.addEventListener("seeked", onSeeked);
}

//视频生成配置参数
interface VideoGenerationConfig {
  id: number | string;
  storyboardId: number | string;
  videoId: number | string;
  prompt: string;
  model: string;
  mode: string;
  resolution: string;
  duration: number;
  audio: number | boolean;
  /** 图片/视频/音频资源列表，id+type 是传给后端的核心字段，url 用于前端展示 */
  data?: { id: string | number; url: string; type: string }[];
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
  detail?: string;
  prompt: string;
  seconds?: number;
  duration?: string | number;
  /** 分镜原图路径（始终不变，作为无 config.data 时的默认展示图） */
  filePath: string;
  frameType: string | null;
  config?: VideoGenerationConfig | null;
  videos?: VideoRecord[];
  // 后端平铺字段
  /** 后端直接返回的模型 */
  model?: string;
  /** 后端直接返回的分辨率 */
  resolution?: string;
  /** 后端直接返回的音频开关（0/1） */
  sound?: string | number;
  /** 后端直接返回的模式 */
  mode?: string;
  /** 当前选中展示的视频 id（对应 config.videoId） */
  selectedVideoId?: number | string;
}
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
const shotList = ref<StoryboardItem[]>([]);
// 底部轨道滚动容器
const trackListRef = ref<HTMLElement | null>(null);

onMounted(() => {
  getProductionData();
});
onUnmounted(() => {
  stopPolling();
});
function isDualFrame(mode?: VideoModelMode) {
  return mode === "startEndRequired" || mode === "endFrameOptional" || mode === "startFrameOptional";
}

function getVideoRecord(item: StoryboardItem): VideoRecord | null {
  if (!item.videos?.length) return null;
  // 只有用户明确选中了某个历史视频（selectedVideoId）时才返回视频，否则显示分镜图片
  const targetId = item.selectedVideoId;
  if (targetId != null) {
    const found = item.videos.find((v) => v.id === targetId && v.state === "生成成功");
    if (found) return found;
  }
  return null;
}
/**
 * 初始化分镜：将 config.videoId 同步到 selectedVideoId，以便轨道卡片展示选中视频。
 * 展示用的图片 url 直接从 config.data[n].url 读取，无需额外字段。
 */
function initShotFields(item: StoryboardItem) {
  if (item.config?.videoId != null && item.selectedVideoId == null) {
    const matched = item.videos?.find((v) => v.id === item.config!.videoId && v.state === "生成成功");
    if (matched) {
      item.selectedVideoId = matched.id;
    }
  }
}

//查询分镜视频
function getProductionData() {
  return axios
    .post("/production/getProductionData", {
      scriptId: 1,
    })
    .then(({ data }) => {
      const list: StoryboardItem[] = data || [];
      // 批量初始化所有分镜的回显字段，保证视频轨道卡片也能正确展示
      list.forEach((item) => initShotFields(item));
      // 记录 scriptId 供轮询使用
      if (list.length > 0 && currentScriptId.value == null) {
        currentScriptId.value = list[0].scriptId as number;
      }
      shotList.value = list;
      if (currentShot.value) {
        // 已有选中的分镜：用新数据刷新 currentShot，保持当前选中不变
        const refreshed = list.find((s) => s.id === currentShot.value!.id);
        if (refreshed) {
          currentShot.value = refreshed;
          // 同步刷新左侧预览的视频（状态可能已更新）
          const previewVideo = getVideoRecord(refreshed);
          selectedData.value = {
            id: refreshed.id as number,
            videoUrl: previewVideo?.filePath ?? selectedData.value?.videoUrl ?? "",
            imageUrl: refreshed.config?.data?.[0]?.url || refreshed.filePath || "",
          };
        }
      } else if (list.length > 0) {
        // 初次加载：默认选中第一个分镜
        selectShot(list[0].id);
      }
      // 检查是否有生成中的视频，若有则恢复轮询（应对刷新/切换页面后轮询中断的情况）
      resumePollingIfNeeded(list);
      return list;
    });
}

/** 检查列表中是否存在"生成中"的视频，有则将其 id 加入 pendingResultIds 并启动轮询 */
function resumePollingIfNeeded(list: StoryboardItem[]) {
  const pendingIds: Array<number | string> = [];
  list.forEach((shot) => {
    shot.videos?.forEach((v) => {
      if (v.state === "生成中") {
        pendingIds.push(v.id);
      }
    });
  });
  if (pendingIds.length === 0) return;
  // 合并到待轮询列表（去重），不覆盖已有的
  const merged = new Set([...pendingResultIds.value, ...pendingIds]);
  pendingResultIds.value = [...merged];
  // 强制重启，确保新加入的 pendingIds 被立即轮询（页面刷新恢复场景）
  startPolling(true);
}

//当前选中的分镜或者视频
const selectedData = ref<{ id: number; videoUrl: string; imageUrl: string }>();
// 勾选的分镜 id 集合
const checkedIds = ref<Set<number | string>>(new Set());
// 全选状态
const selectAll = computed(() => shotList.value.length > 0 && checkedIds.value.size === shotList.value.length);
// 半选状态
const isIndeterminate = computed(() => checkedIds.value.size > 0 && checkedIds.value.size < shotList.value.length);
// 单个勾选
function handleItemCheck(id: number | string, checked: boolean) {
  const next = new Set(checkedIds.value);
  if (checked) {
    next.add(id);
  } else {
    next.delete(id);
  }
  checkedIds.value = next;
}
// 全选 / 取消全选
function handleSelectAll(checked: boolean) {
  if (checked) {
    checkedIds.value = new Set(shotList.value.map((item) => item.id));
  } else {
    checkedIds.value = new Set();
  }
}
// 当前选中的分镜对象（完整数据）
const currentShot = ref<StoryboardItem | null>(null);

//选择分镜
function selectShot(id: number | string) {
  const item = shotList.value.find((item) => item.id === id);
  if (!item) return;

  currentShot.value = item;

  // 左侧预览：若已选中视频则显示视频，否则显示分镜图片
  const previewVideo = getVideoRecord(item);
  selectedData.value = {
    id: item.id as number,
    videoUrl: previewVideo?.filePath ?? "",
    imageUrl: item.config?.data?.[0]?.url || item.filePath || "",
  };
  // 如果分镜有保存的 config，回显相关参数；否则用后端平铺字段回显
  const configModel = item.config?.model;
  const flatModel = item.model;
  const echoModel = configModel || flatModel;
  if (echoModel) {
    // 先把模型选中（更新下拉框显示）
    modelDd.value = echoModel;
    // 暂存待回显的值：config 优先，否则用平铺字段
    pendingEcho.value = {
      resolution: item.config?.resolution ?? item.resolution ?? "",
      duration: item.config?.duration ?? Number(item.duration ?? 0),
      audio: item.config?.audio ?? (item.sound != null ? Number(item.sound) : 0),
      mode: item.config?.mode ?? item.mode ?? "",
    };
    // 主动拉取模型详情，触发选项列表更新并回显已选值
    axios.post("/modelSelect/getModelDetail", { modelId: echoModel }).then(({ data }) => {
      handleModelChange(echoModel, data);
    });
  } else {
    // 没有任何模型信息，清空选项等待用户选模型
    resetModelOptions();
  }
  // 提示词：有 config.prompt 用配置的，否则用分镜本身的 prompt
  promptText.value = item.config?.prompt || item.prompt || "";
}

// 清空模型相关选项（等待用户选择模型）
function resetModelOptions() {
  modelLoaded.value = false;
  resolutionOptions.value = [];
  durationOptions.value = [];
  audioOptions.value = null;
  mode.value = [];
  selectedResolution.value = "";
  selectedDuration.value = 0;
  selectedAudio.value = false;
  currentModeKey.value = "";
}
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
// 模式转换为统一的 key 形式，方便后续处理
function getModeLabel(mode?: VideoModelMode): string {
  if (!mode) return "";
  if (Array.isArray(mode)) return mode.map((r) => MODE_LABEL[r] ?? r).join("、");
  return MODE_LABEL[mode] ?? mode;
}
//模式数组转换为字符串 key，方便在前端使用和比较
function modeToKey(m: VideoModelMode): string {
  return Array.isArray(m) ? JSON.stringify(m) : m;
}

//模型
const modelDd = ref<string>("");
// 模型选项列表是否已加载（用于控制分辨率/时长/音频/模式的显示）
const modelLoaded = ref<boolean>(false);
// 分辨率选项
const resolutionOptions = ref<string[]>([]);
// 时长选项
const durationOptions = ref<number[]>([]);
// 音频支持配置（false=不支持, true=常开, null=可切换）
const audioOptions = ref<boolean | null>(null);
//模式选项列表
const mode = ref<{ label: string; value: string }[]>([]);

// 当前用户实际选中的值
const selectedResolution = ref<string>("");
const selectedDuration = ref<number>(0);
const selectedAudio = ref<boolean>(false);
const currentModeKey = ref<string>("");

// 待回显的 config 值（在模型详情返回后消费）
const pendingEcho = ref<{ resolution: string; duration: number; audio: number | boolean; mode: string } | null>(null);

// 切换音频
function toggleAudio() {
  selectedAudio.value = !selectedAudio.value;
}
// 切换分辨率
function handleResolutionChange(res: string) {
  selectedResolution.value = res;
}
// 切换时长
function handleDurationChange(dur: number) {
  selectedDuration.value = dur;
}

// VideoModel 类型定义
interface VideoModel {
  name: string;
  modelName: string;
  type: "video";
  mode: VideoModelMode[];
  audio: "optional" | false | true;
  durationResolutionMap: { duration: number[]; resolution: string[] }[];
}

//模型切换时：更新选项列表，并按优先级（待回显值 > 当前已选值 > 默认第一个）确定选中值
function handleModelChange(value: string, data: VideoModel) {
  // 更新选项列表
  const newResolutions = [...new Set(data.durationResolutionMap.flatMap((m) => m.resolution))];
  const newDurations = [...new Set(data.durationResolutionMap.flatMap((m) => m.duration))].sort((a, b) => a - b);
  const newAudio = data.audio === false ? false : data.audio === true ? true : null;
  const newModes = data.mode.map((item) => ({
    label: getModeLabel(item),
    value: modeToKey(item),
  }));

  resolutionOptions.value = newResolutions;
  durationOptions.value = newDurations;
  audioOptions.value = newAudio;
  mode.value = newModes;
  modelLoaded.value = true;

  // 判断是否有待回显的 config 值（选中了有 config 的分镜）
  if (pendingEcho.value) {
    const echo = pendingEcho.value;
    pendingEcho.value = null;
    // 分辨率：回显值在新选项中存在则使用，否则取第一个
    selectedResolution.value = newResolutions.includes(echo.resolution) ? echo.resolution : (newResolutions[0] ?? "");
    // 时长：回显值在新选项中存在则使用，否则取第一个
    selectedDuration.value = newDurations.includes(echo.duration) ? echo.duration : (newDurations[0] ?? 0);
    // 音频：仅在可切换时才回显，并将后端 0/1 转换为 boolean
    selectedAudio.value = newAudio === null ? Boolean(echo.audio) : newAudio === true;
    // 模式：回显值在新选项中存在则使用，否则取第一个
    const echoModeKey = echo.mode;
    const modeExists = newModes.some((m) => m.value === echoModeKey);
    currentModeKey.value = modeExists ? echoModeKey : (newModes[0]?.value ?? "");
  } else {
    // 普通切换模型：尽量保留当前已选值，否则取第一个
    selectedResolution.value = newResolutions.includes(selectedResolution.value) ? selectedResolution.value : (newResolutions[0] ?? "");
    selectedDuration.value = newDurations.includes(selectedDuration.value) ? selectedDuration.value : (newDurations[0] ?? 0);
    selectedAudio.value = newAudio === null ? selectedAudio.value : newAudio === true;
    const modeExists = newModes.some((m) => m.value === currentModeKey.value);
    currentModeKey.value = modeExists ? currentModeKey.value : (newModes[0]?.value ?? "");
  }
}
// ---- 提示词 ----
const promptText = ref<string>("");

// ---- frameSection 计算属性 ----

/** 将 currentModeKey 还原为实际 VideoModelMode */
const currentMode = computed<VideoModelMode | null>(() => {
  if (!currentModeKey.value) return null;
  try {
    const parsed = JSON.parse(currentModeKey.value);
    if (Array.isArray(parsed)) return parsed as VideoMixedRef[];
  } catch {}
  return currentModeKey.value as VideoModelMode;
});

/** 是否为混合参考模式 */
const isMixedRefMode = computed(() => Array.isArray(currentMode.value));

/** 混合参考类型列表 */
const mixedRefTypes = computed<VideoMixedRef[]>(() => {
  if (!isMixedRefMode.value) return [];
  return (currentMode.value as VideoMixedRef[]).filter((t) => t !== "textReference");
});

/** 是否首尾帧模式 */
const isDualFrameMode = computed(() => isDualFrame(currentMode.value ?? undefined));

/** 首帧标签 */
const startFrameLabel = computed(() => {
  if (currentMode.value === "startFrameOptional") return "首帧(可选)";
  return "首帧";
});

/** 尾帧标签 */
const endFrameLabel = computed(() => {
  if (currentMode.value === "startEndRequired") return "尾帧";
  if (currentMode.value === "endFrameOptional") return "尾帧(可选)";
  return "尾帧";
});

// ---- 图片操作函数 ----

/** 同步当前分镜到 shotList 列表（内部工具函数） */
function syncShotToList(shot: StoryboardItem) {
  const idx = shotList.value.findIndex((s) => s.id === shot.id);
  if (idx !== -1) shotList.value[idx] = shot;
}

/** 获取分镜 config.data，无则返回空数组 */
function getShotData(shot: StoryboardItem) {
  return shot.config?.data ?? [];
}

/** 更新分镜的 config.data（内部工具函数） */
function updateShotData(shot: StoryboardItem, newData: { id: string | number; url: string; type: string }[]): StoryboardItem {
  return {
    ...shot,
    config: shot.config ? { ...shot.config, data: newData } : ({ data: newData } as unknown as VideoGenerationConfig),
  };
}

/** 单图模式：替换参考图 */
async function handleAddImage() {
  if (!currentShot.value) return;
  const selected = await openAssetsSelector({ multiple: false, title: "选择参考图" });
  if (!selected.length) return;
  const asset = selected[0];
  const url = asset.filePath ?? "";
  if (!url) return;
  const newData = [{ id: asset.id, url, type: "assets" }];
  currentShot.value = updateShotData(currentShot.value, newData);
  syncShotToList(currentShot.value);
}

/** 单图模式：删除参考图（恢复为分镜原图） */
function handleRemoveImage() {
  if (!currentShot.value) return;
  const shot = currentShot.value;
  const newData = shot.filePath ? [{ id: shot.id, url: shot.filePath, type: "storyboard" }] : [];
  currentShot.value = updateShotData(shot, newData);
  syncShotToList(currentShot.value);
}

/** 多图模式：添加图片 */
async function handleAddImageMulti() {
  if (!currentShot.value) return;
  const selected = await openAssetsSelector({ multiple: true, title: "选择参考图片" });
  if (!selected.length) return;
  const shot = currentShot.value;
  const existingData = getShotData(shot);
  const newItems = selected.filter((a) => a.filePath).map((a) => ({ id: a.id, url: a.filePath ?? "", type: "assets" }));
  // 去重（以 url 为标识）
  const urlSet = new Set(existingData.map((d) => d.url));
  const merged = [...existingData, ...newItems.filter((d) => !urlSet.has(d.url))];
  currentShot.value = updateShotData(shot, merged);
  syncShotToList(currentShot.value);
}

/** 多图模式：删除指定索引图片 */
function handleRemoveImageAt(idx: number) {
  if (!currentShot.value) return;
  const shot = currentShot.value;
  const newData = getShotData(shot).filter((_, i) => i !== idx);
  currentShot.value = updateShotData(shot, newData);
  syncShotToList(currentShot.value);
}

/** 首尾帧：添加尾帧 */
async function handleAddEndFrame() {
  if (!currentShot.value) return;
  const selected = await openAssetsSelector({ multiple: false, title: "选择尾帧图" });
  if (!selected.length) return;
  const asset = selected[0];
  const url = asset.filePath ?? "";
  if (!url) return;
  const shot = currentShot.value;
  const existingData = getShotData(shot);
  // 首帧取 data[0]，尾帧更新/设置为 data[1]
  const startItem = existingData[0] ?? { id: shot.id, url: shot.filePath ?? "", type: "storyboard" };
  const newData = [startItem, { id: asset.id, url, type: "assets" }];
  currentShot.value = updateShotData(shot, newData);
  syncShotToList(currentShot.value);
}

/** 首尾帧：删除尾帧 */
function handleRemoveEndFrame() {
  if (!currentShot.value) return;
  const shot = currentShot.value;
  const existingData = getShotData(shot);
  // 只保留首帧（data[0]）
  const newData = existingData.length > 0 ? [existingData[0]] : [];
  currentShot.value = updateShotData(shot, newData);
  syncShotToList(currentShot.value);
}

/** 首尾帧：互换首帧和尾帧 */
function handleSwapFrames() {
  if (!currentShot.value) return;
  const shot = currentShot.value;
  const existingData = [...getShotData(shot)];
  if (existingData.length >= 2) {
    [existingData[0], existingData[1]] = [existingData[1], existingData[0]];
  }
  currentShot.value = updateShotData(shot, existingData);
  syncShotToList(currentShot.value);
}

/** 混合参考：添加某类型资源 */
async function handleAddMixedRef(refType: "videoReference" | "imageReference" | "audioReference") {
  if (!currentShot.value) return;
  const isVideo = refType === "videoReference";
  const isAudio = refType === "audioReference";
  const selected = await openAssetsSelector({
    multiple: false,
    title: isVideo ? "选择参考视频" : isAudio ? "选择参考音频" : "选择参考图片",
  });
  if (!selected.length) return;
  const asset = selected[0];
  const url = asset.filePath ?? "";
  if (!url) return;
  const refTypeOrder: VideoMixedRef[] = ["videoReference", "imageReference", "audioReference"];
  const shot = currentShot.value;
  const existingData = getShotData(shot);
  // 混合模式用 type 字段区分不同类型，这里用 refType 作为 type 存入 data
  const idx = existingData.findIndex((d) => d.type === refType);
  const newItem = { id: asset.id, url, type: refType };
  let newData: typeof existingData;
  if (idx !== -1) {
    newData = existingData.map((d, i) => (i === idx ? newItem : d));
  } else {
    // 按照 refTypeOrder 顺序插入
    const insertIdx = refTypeOrder.indexOf(refType);
    const before = existingData.filter((d) => refTypeOrder.indexOf(d.type as VideoMixedRef) < insertIdx);
    const after = existingData.filter((d) => refTypeOrder.indexOf(d.type as VideoMixedRef) >= insertIdx && d.type !== refType);
    newData = [...before, newItem, ...after];
  }
  currentShot.value = updateShotData(shot, newData);
  syncShotToList(currentShot.value);
}

/** 混合参考：删除某类型资源 */
function handleRemoveMixedRef(refType: "videoReference" | "imageReference" | "audioReference") {
  if (!currentShot.value) return;
  const shot = currentShot.value;
  const newData = getShotData(shot).filter((d) => d.type !== refType);
  currentShot.value = updateShotData(shot, newData);
  syncShotToList(currentShot.value);
}

// 当前分镜的视频历史列表（来自分镜的 videos 字段）
const currentHistoryList = computed<VideoRecord[]>(() => currentShot.value?.videos ?? []);

// 选中历史视频：必须保持选中一个，不可取消选中
function handleSelectHistoryVideo(video: VideoRecord) {
  if (!currentShot.value) return;
  // 生成中或失败的视频不可选中
  if (video.state === "生成中" || video.state === "生成失败") return;
  // 已经是当前选中项则不做任何操作
  if (currentShot.value.selectedVideoId === video.id) return;
  currentShot.value = { ...currentShot.value, selectedVideoId: video.id };
  syncShotToList(currentShot.value);
  // 刷新左侧预览
  selectedData.value = {
    id: currentShot.value.id as number,
    videoUrl: video.filePath ?? "",
    imageUrl: currentShot.value.filePath ?? "",
  };
}

// 删除历史视频
function handleDeleteHistoryVideo(videoId: number | string) {
  axios.post("/production/workbench/delVideo", { videoId }).then(() => {
    getProductionData();
    MessagePlugin.success("视频删除成功");
  });
}
const { project } = storeToRefs(projectStore());

//生成
async function handleGenerate() {
  const shot = currentShot.value;
  if (!shot) return;

  // 从 config.data 读取，只传 id 和 type 给后端
  const dataList = getShotData(shot).map((d) => ({ id: d.id, type: d.type }));

  const payload = {
    projectId: project.value?.id,
    scriptId: shot.scriptId,
    storyboardId: shot.id,
    prompt: promptText.value,
    model: modelDd.value,
    mode: currentModeKey.value,
    resolution: selectedResolution.value,
    duration: selectedDuration.value,
    audio: selectedAudio.value,
    data: dataList,
  };
  const { data } = await axios.post("/production/workbench/generateVideo", payload);
  // data 为新生成的视频 ID 列表
  const newVideoIds: Array<number | string> = Array.isArray(data) ? data : [data];
  // 合并到待轮询列表（去重）
  const merged = new Set([...pendingResultIds.value, ...newVideoIds]);
  pendingResultIds.value = [...merged];
  // 立即刷新一次数据，让历史列表出现"生成中"状态
  await getProductionData();
  startPolling(true);
}

const currentScriptId = ref<number | null>(null);
const pendingResultIds = ref<Array<number | string>>([]);
// 轮询定时器
let pollingTimer: number | null = null;

/** 轮询接口：查询 pendingResultIds 中的视频状态，并将结果合并/更新到 shotList 对应分镜的 videos 列表 */
async function fetchVideoData(scriptId: number | string, specifyIds: Array<number | string>) {
  try {
    const { data } = await axios.post("/production/workbench/videoPolling", { scriptId, specifyIds });
    // 接口返回空数据，说明这批 ID 后端已无记录，直接清空并停止轮询
    if (!data || data.length === 0) {
      pendingResultIds.value = [];
      stopPolling();
      return;
    }
    const polledVideos = data as VideoRecord[];
    // 将后端返回的视频状态合并到 shotList：已有的更新状态，不存在的追加进去
    const updatedList = shotList.value.map((shot) => {
      // 筛选出属于当前分镜的轮询结果
      const relatedVideos = polledVideos.filter((v) => v.storyboardId === shot.id);
      if (relatedVideos.length === 0) return shot;

      const existingVideos = shot.videos ? [...shot.videos] : [];
      let changed = false;

      relatedVideos.forEach((polled) => {
        const idx = existingVideos.findIndex((v) => v.id === polled.id);
        if (idx !== -1) {
          // 已存在：更新状态、路径等字段
          existingVideos[idx] = {
            ...existingVideos[idx],
            state: polled.state ?? existingVideos[idx].state,
            filePath: polled.filePath || existingVideos[idx].filePath,
            errorReason: polled.errorReason || existingVideos[idx].errorReason,
          };
        } else {
          // 不存在：追加新记录（可能是刚提交还未写入 shotList 的新视频）
          existingVideos.push(polled);
        }
        changed = true;
      });

      return changed ? { ...shot, videos: existingVideos } : shot;
    });

    shotList.value = updatedList;
    // 同步更新 currentShot，并在有新视频生成成功时自动选中
    if (currentShot.value) {
      const refreshed = updatedList.find((s) => s.id === currentShot.value!.id);
      if (refreshed) {
        // 检查是否有刚刚生成成功、但尚未被选中的视频
        const relatedSucceeded = polledVideos.filter((v) => v.storyboardId === refreshed.id && v.state === "生成成功");
        let updatedShot = refreshed;
        if (relatedSucceeded.length > 0 && refreshed.selectedVideoId == null) {
          // 自动选中最新成功的视频
          const autoSelect = relatedSucceeded[relatedSucceeded.length - 1];
          updatedShot = { ...refreshed, selectedVideoId: autoSelect.id };
          // 同步回 shotList
          const idx = shotList.value.findIndex((s) => s.id === updatedShot.id);
          if (idx !== -1) shotList.value[idx] = updatedShot;
          // 刷新左侧预览
          selectedData.value = {
            id: updatedShot.id as number,
            videoUrl: autoSelect.filePath ?? "",
            imageUrl: updatedShot.config?.data?.[0]?.url || updatedShot.filePath || "",
          };
        } else if (refreshed.selectedVideoId != null) {
          // 已有选中视频：刷新预览地址（路径可能在轮询后才返回）
          const selVideo = refreshed.videos?.find((v) => v.id === refreshed.selectedVideoId && v.state === "生成成功");
          if (selVideo && selectedData.value) {
            selectedData.value = {
              ...selectedData.value,
              videoUrl: selVideo.filePath ?? selectedData.value.videoUrl,
            };
          }
        }
        currentShot.value = updatedShot;
      }
    }
    // 从 pendingResultIds 中移除已完成（成功或失败）的视频 ID，不再轮询它们
    const doneIds = polledVideos.filter((d) => d.state === "生成成功" || d.state === "生成失败").map((d) => d.id);
    if (doneIds.length > 0) {
      pendingResultIds.value = pendingResultIds.value.filter((id) => !doneIds.includes(id));
    }
    // 后端本次未返回的 ID 视为已失效，一并移除，防止永久轮询
    const returnedIds = polledVideos.map((v) => v.id);
    pendingResultIds.value = pendingResultIds.value.filter((id) => returnedIds.includes(id));
    // 全部完成则立即停止轮询
    if (pendingResultIds.value.length === 0) {
      stopPolling();
    }
  } catch (error) {
    console.error("获取视频数据失败:", error);
  }
}

// 开始轮询
function startPolling(force: boolean = false) {
  if (pollingTimer) {
    // 如果已有定时器且不是强制启动，直接返回
    if (!force) return;
    // 强制启动时，先停止旧的定时器
    stopPolling();
  }
  // 使用 nextTick 确保数据已更新
  nextTick(async () => {
    if (pendingResultIds.value.length === 0) return;
    // 先立即执行一次，无需等待第一个 5s 间隔
    if (currentScriptId.value) {
      await fetchVideoData(currentScriptId.value, [...pendingResultIds.value]);
    }
    // 若立即执行后已全部完成，不再开启定时器
    if (pendingResultIds.value.length === 0) return;
    pollingTimer = window.setInterval(async () => {
      if (pendingResultIds.value.length === 0) {
        stopPolling();
        return;
      }
      if (currentScriptId.value) {
        await fetchVideoData(currentScriptId.value, [...pendingResultIds.value]);
      }
    }, 5000);
  });
}
// 停止轮询
function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}
function handleConfirmSelection() {
  if (!currentShot.value?.selectedVideoId) {
    MessagePlugin.warning("请先选择一个视频");
    return;
  }
  axios
    .post("/production/workbench/confirmSelection", { storyboardId: currentShot.value?.id, videoId: currentShot.value?.selectedVideoId })
    .then(() => {
      MessagePlugin.success("确认选中成功");
      getProductionData();
    });
}
async function handleBatchGenerate() {
  // 批量生成逻辑：从每个分镜的 config.data 读取，只传 id 和 type
  const checkedShots = shotList.value.filter((item) => checkedIds.value.has(item.id));
  MessagePlugin.success("已提交批量生成请求，正在处理中...");
  for (const shot of checkedShots) {
    const list = {
      scriptId: shot.scriptId,
      projectId: project.value?.id,
      storyboardId: shot.id,
      prompt: shot.config?.prompt || shot.prompt || "",
      model: shot.config?.model || shot.model || "",
      mode: shot.config?.mode || shot.mode || "",
      resolution: shot.config?.resolution || shot.resolution || "",
      duration: shot.config?.duration ?? Number(shot.duration) ?? 0,
      audio: shot.config?.audio == 0 ? false : true,
      data: getShotData(shot).map((d) => ({ id: d.id, type: d.type })),
    };
    const { data } = await axios.post("/production/workbench/generateVideo", list);
    const newVideoIds: Array<number | string> = Array.isArray(data) ? data : [data];
    const merged = new Set([...pendingResultIds.value, ...newVideoIds]);
    pendingResultIds.value = [...merged];
  }
  // 所有请求发出后统一刷新一次，再启动轮询（避免循环内反复重置定时器）
  await getProductionData();
  startPolling(true);
}
const emit = defineEmits(["close"]);
//导入剪辑台
function handleBatchDownload() {
  const checkedShots = shotList.value.filter((item) => checkedIds.value.has(item.id));
  const videos = checkedShots
    .map((shot) => {
      if (!shot.config?.videoId) return null;
      const video = shot.videos?.find((v) => v.id === shot.config?.videoId);
      return {
        videoId: video?.id,
        filePath: video?.filePath,
        prompt: shot.config?.videoId == null ? shot.prompt : shot.config?.prompt,
      };
    })
    .filter((v): v is NonNullable<typeof v> => !!v);
  emit("close", videos);
}
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
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 8px;

            .historyCard {
              position: relative;
              width: 100%;
              aspect-ratio: 1 / 1;
              border-radius: 8px;
              overflow: hidden;
              cursor: pointer;
              border: 2.5px solid #e4e4e4;
              transition: border-color 0.2s;

              &:hover {
                border-color: #aaa;
                .historyCardDelete {
                  opacity: 1;
                }
              }

              &.active {
                border-color: #1a1a1a;
              }

              &.disabled {
                cursor: not-allowed;

                &:hover {
                  border-color: transparent;
                }
              }

              .historyCardThumb {
                width: 100%;
                height: 100%;
                object-fit: cover;
                display: block;
                border-radius: 8px;
                &.historyCardThumbEmpty {
                  background: #1a1a1a;
                }
              }

              .historyCardOverlay {
                position: absolute;
                inset: 0;
                background: rgba(167, 165, 165, 0.6);
                @extend %flexCenter;
                flex-direction: column;
                gap: 6px;
                z-index: 1;

                .overlayText {
                  font-size: 11px;
                  color: #fff;
                  white-space: nowrap;
                }

                &.historyCardOverlayFailed {
                  background: rgba(0, 0, 0, 0.7);
                }
              }

              .historyCardCheck {
                position: absolute;
                top: 4px;
                right: 4px;
                width: 25px;
                height: 25px;
                border-radius: 50%;
                background: #1a1a1a;
                @extend %flexCenter;
                z-index: 2;
              }

              .historyCardDelete {
                position: absolute;
                bottom: 4px;
                right: 4px;
                width: 30px;
                height: 30px;
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
          border: 3px solid transparent;
          background: #fff;
          position: relative;
          transition: border-color 0.2s;

          &:hover,
          &.active {
            border-color: #000;
          }

          .shotCheckbox {
            position: absolute;
            top: 10px;
            right: 0px;
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

            .shotMultiFrame {
              display: grid;
              width: 100%;
              height: 100%;
              overflow: hidden;

              .shotMultiFrameImg {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-right: 1px solid rgba(255, 255, 255, 0.2);
                border-bottom: 1px solid rgba(255, 255, 255, 0.2);
              }
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
              top: 8px;
              left: 8px;
              z-index: 2;
            }

            .shotStateOverlay {
              position: absolute;
              inset: 0;
              background: rgba(0, 0, 0, 0.55);
              @extend %flexCenter;
              flex-direction: column;
              gap: 4px;
              z-index: 1;

              span {
                font-size: 11px;
                color: #fff;
              }

              &.shotStateOverlayFailed {
                background: rgba(20, 0, 0, 0.65);
              }
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
