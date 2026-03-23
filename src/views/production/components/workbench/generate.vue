<template>
  <div class="generateContainer">
    <div class="mainContent">
      <!-- 左侧预览区域 -->
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
        <!-- 提示词输入 -->
        <div class="promptSection">
          <div class="sectionTitle">
            <span class="titleIndicator" />
            视频提示词
          </div>
          <t-textarea v-model="promptText" placeholder="输入提示词，描述你想要生成的视频内容..." :autosize="{ minRows: 4, maxRows: 12 }" />
          <div class="frameSection" v-if="currentModeKey !== 'text' && mode.length > 0 && (!isMixedRefMode || mixedRefTypes.length > 0)">
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
              <div class="frameItem" @click="handleAddImageMulti">
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

          <!-- 历史版本 -->
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
                  <!-- 成功：正常显示视频 -->
                  <template v-if="video.state === '生成成功'">
                    <video :src="video.filePath" class="historyCardThumb" preload="metadata" muted />
                  </template>
                  <!-- 生成中：灰色背景 + 转圈 -->
                  <template v-else-if="video.state === '生成中'">
                    <div class="historyCardThumb historyCardThumbEmpty" />
                    <div class="historyCardOverlay">
                      <t-loading size="24" theme="dots" />
                      <span class="overlayText">生成中</span>
                    </div>
                  </template>
                  <!-- 失败：显示失败提示 -->
                  <template v-else-if="video.state === '生成失败'">
                    <div class="historyCardThumb historyCardThumbEmpty" />
                    <div class="historyCardOverlay historyCardOverlayFailed">
                      <i-close size="20" fill="#f66" />
                      <span class="overlayText">生成失败</span>
                    </div>
                  </template>
                  <!-- 未知状态 -->
                  <template v-else>
                    <div class="historyCardThumb historyCardThumbEmpty" />
                  </template>
                  <!-- 右上角：选中勾 -->
                  <div v-if="currentShot?.selectedVideoId === video.id" class="historyCardCheck">
                    <i-check size="12" fill="#fff" />
                  </div>
                  <!-- 右下角：悬浮删除按钮 -->
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
              <!-- 左上角勾选框 -->
              <t-checkbox
                class="shotCheckbox"
                :checked="checkedIds.has(item.id)"
                @click.stop
                @change="(val: boolean) => handleItemCheck(item.id, val)" />
              <template v-if="getVideoRecord(item)">
                <video :src="getVideoRecord(item)!.filePath" class="shotImage" muted loop preload="metadata" />
              </template>
              <!-- 双帧模式：显示分镜图片 -->
              <template v-else-if="isDualFrame(item.config?.mode as VideoModelMode)">
                <div class="shotDualFrame">
                  <img v-if="item.imageUrl || item.filePath" :src="item.imageUrl || item.filePath" class="shotFrameImg" />
                  <div v-else class="shotFramePlaceholder"><i-pic size="16" fill="#999" /></div>
                  <img v-if="item.endFrameUrl" :src="item.endFrameUrl" class="shotFrameImg" />
                  <div v-else class="shotFramePlaceholder"><i-pic size="16" fill="#999" /></div>
                </div>
              </template>
              <!-- 多图模式：拼接显示多张图片 -->
              <template v-else-if="item.imageUrls && item.imageUrls.length > 1">
                <div
                  class="shotMultiFrame"
                  :style="{
                    gridTemplateColumns: `repeat(${item.imageUrls.length <= 2 ? 2 : 3}, 1fr)`,
                    gridTemplateRows: `repeat(${Math.ceil(item.imageUrls.length / (item.imageUrls.length <= 2 ? 2 : 3))}, 1fr)`,
                  }">
                  <img v-for="(url, idx) in item.imageUrls" :key="idx" :src="url" class="shotMultiFrameImg" />
                </div>
              </template>
              <!-- 普通模式：显示分镜图片 -->
              <template v-else>
                <img v-if="item.imageUrl || item.filePath" :src="item.imageUrl || item.filePath" class="shotImage" />
                <div v-else class="shotPlaceholder"><i-pic size="16" fill="#999" /></div>
              </template>
              <!-- 序号标签 -->
              <t-tag class="shotNumber" size="small" variant="dark">#{{ index + 1 }}</t-tag>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onUnmounted } from "vue";
import { storeToRefs } from "pinia";
import axios from "@/utils/axios";
import projectStore from "@/stores/project";
import modelSelect from "@/components/modelSelect.vue";
import openAssetsSelector from "@/utils/assetsCheck";

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
  data?: string[];
}
//单个视频记录参数（后端返回的视频生成结果）
interface VideoRecord {
  id: number | string;
  storyboardId: number | string;
  filePath: string;
  state: string;
  errorReason?: string;
}
// 混合参考单项
interface MixedRefItem {
  url: string;
  type: "image" | "video" | "audio";
  /** 资产 id（assets 来源时有值） */
  id?: number;
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
  filePath: string;
  frameType: string | null;
  config?: VideoGenerationConfig | null;
  videos?: VideoRecord[];
  // 后端平铺字段（无 config 时使用）
  /** 后端直接返回的模型 */
  model?: string;
  /** 后端直接返回的分辨率 */
  resolution?: string;
  /** 后端直接返回的音频开关（0/1） */
  sound?: string | number;
  /** 后端直接返回的模式 */
  mode?: string;
  /** 后端直接返回的单图 url */
  imageUrl?: string;
  /** 后端直接返回的图片来源 */
  imageSource?: "storyboard" | "assets";
  /** 后端直接返回的图片 id */
  imageId?: number | string;
  /** 后端直接返回的多图 url 列表 */
  imageUrls?: string[];
  /** 后端直接返回的多图来源列表 */
  imageSources?: Array<{ source: "storyboard" | "assets"; id: number | string }>;
  // 以下为前端运行时扩展的字段
  /** 尾帧 url */
  endFrameUrl?: string;
  /** 尾帧来源 */
  endFrameSource?: "storyboard" | "assets";
  /** 尾帧对应的 id */
  endFrameId?: number | string;
  /** 混合参考模式的各类资源 */
  mixedRefs?: {
    videoReference?: MixedRefItem;
    imageReference?: MixedRefItem;
    audioReference?: MixedRefItem;
  };
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
 * 初始化单个分镜的前端回显字段（imageUrl / imageUrls 等）
 * 优先级：config.data > 后端平铺字段（imageUrl/imageUrls） > 分镜原图(filePath)
 * 每次从后端拿到数据后都应对所有分镜调用，以保证轨道卡片显示正确
 */
function initShotFields(item: StoryboardItem) {
  const configData = item.config?.data;
  if (configData && configData.length > 0) {
    // 有 config.data：用保存的图片 URL 回显
    // imageSource / imageId 优先使用后端返回的 imageSources，不强制覆盖为 assets
    item.imageUrl = configData[0];
    item.imageUrls = [...configData];

    if (item.imageSources && item.imageSources.length > 0) {
      // 后端已返回 imageSources，直接用，同步首帧来源
      item.imageSource = item.imageSources[0].source;
      item.imageId = item.imageSources[0].id;
    } else {
      // 后端没有返回 imageSources（兼容旧数据），按 URL 是否等于 filePath 推断
      item.imageSources = configData.map((url) => ({
        source: (url === item.filePath ? "storyboard" : "assets") as "storyboard" | "assets",
        id: url === item.filePath ? item.id : item.id,
      }));
      item.imageSource = item.imageSources[0].source;
      item.imageId = item.imageSources[0].id;
    }

    // 首尾帧：第一张为首帧，第二张为尾帧
    if (configData.length >= 2) {
      item.endFrameUrl = configData[1];
      if (item.imageSources && item.imageSources.length >= 2) {
        item.endFrameSource = item.imageSources[1].source;
        item.endFrameId = item.imageSources[1].id;
      } else {
        item.endFrameSource = configData[1] === item.filePath ? "storyboard" : "assets";
        item.endFrameId = item.id;
      }
    }
  } else {
    // 没有 config.data：优先用后端平铺的 imageUrl/imageUrls，否则降级用 filePath
    if (!item.imageUrl) {
      item.imageUrl = item.filePath ?? "";
    }
    if (!item.imageSource) {
      item.imageSource = "storyboard";
      item.imageId = item.id;
    }
    if (!item.imageUrls || item.imageUrls.length === 0) {
      // 后端如果没有返回 imageUrls，用 imageUrl 补充
      item.imageUrls = item.imageUrl ? [item.imageUrl] : item.filePath ? [item.filePath] : [];
      item.imageSources = item.imageUrls.map(() => ({ source: item.imageSource ?? ("storyboard" as const), id: item.imageId ?? item.id }));
    } else if (!item.imageSources || item.imageSources.length === 0) {
      // 后端返回了 imageUrls 但没有 imageSources，自动补全来源
      item.imageSources = item.imageUrls.map((url) => ({
        source: (url === item.filePath ? "storyboard" : "assets") as "storyboard" | "assets",
        id: item.id,
      }));
    }
  }
  // 如果 config 里记录了选中的视频 id，同步到 selectedVideoId
  // 这样轨道卡片和预览区都能直接通过 getVideoRecord 拿到选中视频
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
            imageUrl: refreshed.imageUrl || refreshed.filePath || "",
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
  // 如果当前没有轮询定时器则启动
  startPolling(false);
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
    imageUrl: item.imageUrl || item.filePath || "",
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

/** 单图模式：替换参考图 */
async function handleAddImage() {
  if (!currentShot.value) return;
  const selected = await openAssetsSelector({ multiple: false, title: "选择参考图" });
  if (!selected.length) return;
  const asset = selected[0];
  const url = asset.filePath ?? "";
  if (!url) return;
  currentShot.value = { ...currentShot.value, imageUrl: url, imageSource: "assets", imageId: asset.id };
  syncShotToList(currentShot.value);
}

/** 单图模式：删除参考图（恢复为分镜原图） */
function handleRemoveImage() {
  if (!currentShot.value) return;
  currentShot.value = { ...currentShot.value, imageUrl: currentShot.value.filePath, imageSource: "storyboard", imageId: currentShot.value.id };
  syncShotToList(currentShot.value);
}

/** 多图模式：添加图片 */
async function handleAddImageMulti() {
  if (!currentShot.value) return;
  const selected = await openAssetsSelector({ multiple: true, title: "选择参考图片" });
  if (!selected.length) return;
  const shot = currentShot.value;
  // 分镜原图作为第一张（storyboard 来源）
  const baseUrls = shot.filePath ? [shot.filePath] : [];
  const baseSources: StoryboardItem["imageSources"] = shot.filePath ? [{ source: "storyboard", id: shot.id }] : [];
  const existingUrls = shot.imageUrls?.filter((u) => !baseUrls.includes(u)) ?? [];
  const existingSources = shot.imageSources?.slice(baseSources.length) ?? [];
  // 新选资产
  const newUrls = selected.map((a) => a.filePath ?? "").filter(Boolean);
  const newSources = selected.filter((a) => a.filePath).map((a) => ({ source: "assets" as const, id: a.id }));
  const merged = [...new Set([...baseUrls, ...existingUrls, ...newUrls])];
  const mergedSources = [...baseSources, ...existingSources, ...newSources].slice(0, merged.length);
  currentShot.value = { ...shot, imageUrls: merged, imageSources: mergedSources };
  syncShotToList(currentShot.value);
}

/** 多图模式：删除指定索引图片 */
function handleRemoveImageAt(idx: number) {
  if (!currentShot.value) return;
  const urls = [...(currentShot.value.imageUrls ?? [])];
  const sources = [...(currentShot.value.imageSources ?? [])];
  urls.splice(idx, 1);
  sources.splice(idx, 1);
  currentShot.value = { ...currentShot.value, imageUrls: urls, imageSources: sources };
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
  currentShot.value = { ...currentShot.value, endFrameUrl: url, endFrameSource: "assets", endFrameId: asset.id };
  syncShotToList(currentShot.value);
}

/** 首尾帧：删除尾帧 */
function handleRemoveEndFrame() {
  if (!currentShot.value) return;
  currentShot.value = { ...currentShot.value, endFrameUrl: undefined, endFrameSource: undefined, endFrameId: undefined };
  syncShotToList(currentShot.value);
}

/** 首尾帧：互换首帧和尾帧 */
function handleSwapFrames() {
  if (!currentShot.value) return;
  const { imageUrl, endFrameUrl } = currentShot.value;
  currentShot.value = { ...currentShot.value, imageUrl: endFrameUrl ?? "", endFrameUrl: imageUrl ?? "" };
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
  const type: MixedRefItem["type"] = isVideo ? "video" : isAudio ? "audio" : "image";
  currentShot.value = {
    ...currentShot.value,
    mixedRefs: {
      ...currentShot.value.mixedRefs,
      [refType]: { url, type, id: asset.id },
    },
  };
  syncShotToList(currentShot.value);
}

/** 混合参考：删除某类型资源 */
function handleRemoveMixedRef(refType: "videoReference" | "imageReference" | "audioReference") {
  if (!currentShot.value) return;
  const refs = { ...currentShot.value.mixedRefs };
  delete refs[refType];
  currentShot.value = { ...currentShot.value, mixedRefs: refs };
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

  type DataItem = { type: "storyboard" | "assets"; id: number | string };
  const dataList: DataItem[] = [];

  if (isMixedRefMode.value) {
    // 混合参考模式
    const refs = shot.mixedRefs;
    if (refs?.videoReference?.id != null) dataList.push({ type: "assets", id: refs.videoReference.id });
    if (refs?.imageReference?.id != null) dataList.push({ type: "assets", id: refs.imageReference.id });
    if (refs?.audioReference?.id != null) dataList.push({ type: "assets", id: refs.audioReference.id });
  } else if (isDualFrameMode.value) {
    // 首尾帧模式：首帧
    dataList.push({ type: shot.imageSource ?? "storyboard", id: shot.imageId ?? shot.id });
    // 尾帧（可选）
    if (shot.endFrameUrl) {
      dataList.push({ type: shot.endFrameSource ?? "storyboard", id: shot.endFrameId ?? shot.id });
    }
  } else if (currentMode.value === "multiImage" || currentMode.value === "gridImage") {
    // 多图模式
    (shot.imageSources ?? (shot.imageUrls ?? []).map(() => ({ source: "storyboard" as const, id: shot.id }))).forEach((src) =>
      dataList.push({ type: src.source, id: src.id }),
    );
  } else {
    // 单图 / 文生视频等其他模式
    if (shot.imageUrl) {
      // 优先从 imageSources[0] 读取来源，避免 imageSource 与 imageSources 不一致
      const src0 = shot.imageSources?.[0];
      dataList.push({
        type: src0?.source ?? shot.imageSource ?? "storyboard",
        id: src0?.id ?? shot.imageId ?? shot.id,
      });
    }
  }

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
    if (!data || data.length === 0) return;
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
            imageUrl: updatedShot.imageUrl || updatedShot.filePath || "",
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
  nextTick(() => {
    if (pendingResultIds.value.length === 0) return;
    pollingTimer = window.setInterval(async () => {
      if (pendingResultIds.value.length === 0) {
        stopPolling();
        return;
      }
      if (currentScriptId.value) {
        await fetchVideoData(currentScriptId.value, pendingResultIds.value);
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
function handleBatchGenerate() {
  // 批量生成逻辑
  for (const shot of shotList.value) {
    const data = {
      scriptId: shot.scriptId,
      projectId: project.value?.id,
      storyboardId: shot.id,
      prompt: shot.prompt || "",
      model: shot.model || "",
      mode: shot.mode || "",
      resolution: shot.resolution || "",
      duration: Number(shot.duration) || 0,
      audio: shot.sound ? true : false,
      data: shot.imageUrl
        ? [
            {
              type: shot.imageSource ?? "storyboard",
              id: shot.imageId ?? shot.id,
            },
          ]
        : [],
    };
    axios.post("/production/workbench/generateVideo", data).then(({ data }) => {
      const newVideoIds: Array<number | string> = Array.isArray(data) ? data : [data];
      const merged = new Set([...pendingResultIds.value, ...newVideoIds]);
      pendingResultIds.value = [...merged];
      getProductionData();
      startPolling(true);
    });
  }
}
//批量下载逻辑
function handleBatchDownload() {
  // 批量下载逻辑
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
              border: 2.5px solid transparent;
              transition: border-color 0.2s;

              &:hover {
                border-color: #999;

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
