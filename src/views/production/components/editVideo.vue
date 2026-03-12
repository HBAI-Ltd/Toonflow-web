<template>
  <div class="editVideo">
    <t-dialog
      v-model:visible="editVideoShow"
      header="视频详情"
      width="85%"
      top="2vh"
      placement="center"
      :footer="false"
      class="videoDeployDialog"
      @opened="initData"
      @closed="resetData">
      <div class="configContainer">
        <div class="deployInfo">
          <div class="sectionTitle">
            <span>配置信息</span>
            <t-button theme="primary" :loading="isGenerating" @click="generateVideo">
              <template #icon><t-icon name="play-circle" /></template>
              生成视频
            </t-button>
          </div>
          <div class="configFormWrapper">
            <div class="formField">
              <label class="fieldLabel">模型</label>
              <t-input :value="getModelLabel(formData.model)" disabled class="fieldInput" />
            </div>
            <div class="formField">
              <label class="fieldLabel">模式</label>
              <t-radio-group v-model="formData.mode" @change="onModeChange">
                <t-radio v-for="item in currentModeOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </t-radio>
              </t-radio-group>
            </div>
            <div v-if="showImageSection" class="formField imageFieldSection">
              <label class="fieldLabel">
                图片素材
                <span v-if="formData.mode === 'reference'" class="imageCount">({{ formData.images.filter(Boolean).length }}/5)</span>
                <span v-else-if="formData.mode === 'endFrameOptional'" class="imageCount">({{ formData.images.filter(Boolean).length }}/2)</span>
              </label>
              <div class="imageSection">
                <div v-if="formData.mode === 'singleImage'" class="imageList">
                  <div v-if="formData.images[0]" class="imageItem">
                    <t-image :src="formData.images[0]" fit="cover" class="uploadedImage" />
                    <div class="imageActions">
                      <i-delete theme="outline" fill="#d0021b" size="18" @click.stop="removeImage(0)" />
                    </div>
                  </div>
                  <div v-else class="uploadBtn" @click="openImageSelector">
                    <t-icon name="add" size="20px" />
                    <span>选择图片</span>
                  </div>
                </div>
                <div v-else-if="formData.mode === 'reference'" class="imageList">
                  <div v-for="(img, index) in formData.images.filter(Boolean)" :key="index" class="imageItem">
                    <t-image :src="img" fit="cover" class="uploadedImage" />
                    <div class="imageActions">
                      <i-delete theme="outline" fill="#d0021b" size="18" @click.stop="removeImage(index)" />
                    </div>
                  </div>
                  <div v-if="formData.images.filter(Boolean).length < 5" class="uploadBtn" @click="openImageSelector">
                    <t-icon name="add" size="20px" />
                    <span>选择图片</span>
                  </div>
                </div>
                <div v-else-if="formData.mode === 'endFrameOptional'" class="imageList startEndList">
                  <div v-for="(img, index) in formData.images.filter(Boolean)" :key="index" class="imageItem">
                    <t-image :src="img" fit="cover" class="uploadedImage" />
                    <div class="imageActions">
                      <i-delete theme="outline" fill="#d0021b" size="15" @click.stop="removeImage(index)" />
                    </div>
                    <span class="frameTag">{{ index === 0 ? "首帧" : "尾帧" }}</span>
                  </div>
                  <div v-if="formData.images.filter(Boolean).length < 2" class="uploadBtn" @click="openImageSelector">
                    <t-icon name="add" size="20px" />
                    <span>{{ formData.images.filter(Boolean).length === 0 ? "选择首帧" : "选择尾帧" }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="formField">
              <label class="fieldLabel">分辨率</label>
              <t-select v-model="formData.resolution" placeholder="请选择分辨率" class="fieldInput">
                <t-option v-for="item in currentResolutionOptions" :key="item.value" :label="item.label" :value="item.value" />
              </t-select>
            </div>
            <div v-if="currentAspectRatioOptions.length > 0" class="formField">
              <label class="fieldLabel">宽高比</label>
              <t-select v-model="formData.aspectRatio" placeholder="请选择宽高比" class="fieldInput">
                <t-option v-for="item in currentAspectRatioOptions" :key="item" :label="item" :value="item" />
              </t-select>
            </div>
            <div class="formField">
              <label class="fieldLabel">时长</label>
              <t-select v-model="formData.duration" placeholder="请选择时长" class="fieldInput">
                <t-option v-for="item in currentDurationOptions" :key="item.value" :label="item.label" :value="item.value" />
              </t-select>
            </div>
            <div v-if="showSoundSwitch" class="formField soundField">
              <label class="fieldLabel">声音</label>
              <div class="switchWrapper">
                <t-switch v-model="formData.sound" />
                <span class="switchLabel">{{ formData.sound ? "开启" : "关闭" }}</span>
              </div>
            </div>
            <div class="formField promptFieldSection">
              <label class="fieldLabel">提示词</label>
              <div class="promptWrapper">
                <t-textarea v-model="formData.prompt" placeholder="请输入视频生成的提示词描述..." :autosize="{ minRows: 4, maxRows: 6 }"></t-textarea>
                <div class="generatePromptBtn" @click="generatePrompt">
                  <i-magic theme="outline" size="20" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="resultSection">
          <div class="sectionTitle">
            <span>生成结果</span>
            <t-tag v-if="videoResults.length > 0" theme="primary" variant="light" size="small" class="countTag">
              {{ videoResults.length }} 个视频
            </t-tag>
          </div>
          <div v-if="videoResults.length === 0" class="emptyState">
            <div class="emptyIcon">
              <t-icon name="video" size="56px" />
            </div>
            <p class="emptyTitle">暂无生成结果</p>
            <p class="emptyDesc">配置参数后点击生成视频按钮</p>
          </div>
          <div v-else class="videoList">
            <div class="videoGrid">
              <div
                v-for="(video, index) in videoResults"
                :key="video.id"
                class="videoCard"
                :class="{ selected: selectedVideoUrl === video.url, failed: !video.url }"
                @click="selectVideo(video)">
                <div class="videoPreview">
                  <template v-if="video.url">
                    <video
                      :ref="(el) => setVideoRef(el, video.id)"
                      :src="video.url"
                      class="videoElement"
                      controls
                      playsinline
                      preload="metadata"
                      @click.stop
                      @dblclick.stop="toggleFullscreen(video)"></video>
                  </template>
                  <template v-else>
                    <div class="failedOverlay">
                      <t-icon name="close-circle-filled" size="40px" />
                      <span>生成失败</span>
                    </div>
                  </template>
                </div>
                <div class="videoIndexBadge">
                  <span>选中视频 {{ index + 1 }}</span>
                </div>
                <div class="videoTopActions">
                  <t-tooltip v-if="selectedVideoUrl === video.url" content="已选中">
                    <div class="actionBtn selectedBtn">
                      <t-icon name="check" size="18" />
                    </div>
                  </t-tooltip>
                  <t-tooltip content="删除">
                    <div class="actionBtn deleteBtn" @click.stop="deleteVideo(index)">
                      <i-delete theme="outline" fill="#fff" size="18" />
                    </div>
                  </t-tooltip>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="dialogFooter">
        <t-button variant="outline" @click="editVideoShow = false">取消</t-button>
        <t-button theme="primary" :disabled="!selectedVideoUrl" @click="confirmSelect">确认选择</t-button>
      </div>
    </t-dialog>
    <storyboardList v-model="storyboardListShow" @exportImage="exportImage" :state="false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, type ComponentPublicInstance } from "vue";
import storyboardList from "./storyboardList.vue";
import { MessagePlugin } from "tdesign-vue-next";

const editVideoShow = defineModel({
  type: Boolean,
  default: false,
});
interface VideoItem {
  model: string;
  mode: string;
  images: string[];
  resolution: string;
  duration: number;
  prompt: string;
  videoUrl: string;
  generateUrl: string[];
}
//视频模型列表类型
interface ModelItem {
  manufacturer: string;
  model: string;
  durationResolutionMap: { duration: number[]; resolution: string[] }[];
  aspectRatio: string[];
  type: string[];
  audio: boolean;
}
interface VideoItemWithAspectRatio extends VideoItem {
  aspectRatio?: string;
}
const props = defineProps<{
  videoForm?: VideoItemWithAspectRatio;
  modelList: ModelItem[];
}>();

const emit = defineEmits(["select"]);

// 模式类型映射
const modeTypeMap: Record<string, { label: string; value: string }> = {
  text: { label: "文生视频", value: "text" },
  singleImage: { label: "单图模式", value: "singleImage" },
  endFrameOptional: { label: "首尾帧模式", value: "endFrameOptional" },
  reference: { label: "参考图模式", value: "reference" },
};

// 表单数据
const formData = reactive({
  model: "",
  mode: "",
  images: [] as string[],
  resolution: "",
  aspectRatio: "",
  duration: 0 as number,
  sound: false,
  prompt: "",
});

// 存储每个图片对应的提示词
const imagePrompts = ref<string[]>([]);

// 获取当前选中的模型配置
const currentModelConfig = computed(() => {
  return props.modelList.find((item) => item.model === formData.model);
});

// 当前模型可用的模式选项
const currentModeOptions = computed(() => {
  const config = currentModelConfig.value;
  if (!config) return [];
  return config.type.map((type) => modeTypeMap[type] || { label: type, value: type });
});

// 当前模型的分辨率选项
const currentResolutionOptions = computed(() => {
  const config = currentModelConfig.value;
  if (!config || !config.durationResolutionMap.length) return [];
  const resolutions = new Set<string>();
  config.durationResolutionMap.forEach((map) => {
    map.resolution.forEach((r) => resolutions.add(r));
  });
  return Array.from(resolutions).map((r) => ({ label: r, value: r }));
});

// 当前模型的宽高比选项
const currentAspectRatioOptions = computed(() => {
  const config = currentModelConfig.value;
  if (!config) return [];
  return config.aspectRatio;
});

// 当前模型的时长选项
const currentDurationOptions = computed(() => {
  const config = currentModelConfig.value;
  if (!config || !config.durationResolutionMap.length) return [];
  const durations = new Set<number>();
  config.durationResolutionMap.forEach((map) => {
    map.duration.forEach((d) => durations.add(d));
  });
  return Array.from(durations)
    .sort((a, b) => a - b)
    .map((d) => ({ label: `${d}秒`, value: d }));
});

// 是否显示声音开关
const showSoundSwitch = computed(() => {
  const config = currentModelConfig.value;
  return config?.audio ?? false;
});

// 是否显示图片区域
const showImageSection = computed(() => {
  return formData.mode !== "text";
});

// 视频结果接口
interface VideoResult {
  id: string;
  url: string;
}

// 视频结果列表
const videoResults = ref<VideoResult[]>([]);

// 选中的视频URL
const selectedVideoUrl = ref<string | null>(null);

// 视频元素引用
const videoRefs = ref<Record<string, HTMLVideoElement | null>>({});

// 是否正在生成
const isGenerating = ref(false);

// 获取模型标签
function getModelLabel(value: string) {
  return value;
}

// 模式变化时重置图片和提示词
function onModeChange() {
  formData.images = [];
  formData.prompt = "";
}
const storyboardListShow = ref(false);
// 打开图片选择器
function openImageSelector() {
  storyboardListShow.value = true;
}

// 删除图片及对应的提示词
function removeImage(index: number) {
  const currentImages = formData.images.filter(Boolean);
  currentImages.splice(index, 1);
  formData.images = currentImages;
  imagePrompts.value.splice(index, 1);
  formData.prompt = imagePrompts.value.filter(Boolean).join("\n");
}

// 生成提示词
function generatePrompt() {
  MessagePlugin.info("提示词生成功能待开发");
}

// 生成视频
function generateVideo() {
  if (!formData.prompt && formData.mode === "text") {
    MessagePlugin.warning("请输入提示词");
    return;
  }
  isGenerating.value = true;
}

// 设置视频元素引用
function setVideoRef(el: Element | ComponentPublicInstance | null, id: string) {
  if (el && el instanceof HTMLVideoElement) {
    videoRefs.value[id] = el;
  }
}

// 切换全屏播放
function toggleFullscreen(video: VideoResult) {
  if (!video.url) return;
  const videoEl = videoRefs.value[video.id];
  if (!videoEl) return;

  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    videoEl.requestFullscreen().catch((err) => {
      console.error("全屏失败:", err);
    });
  }
}

// 选择视频
function selectVideo(video: VideoResult) {
  if (video.url) {
    selectedVideoUrl.value = video.url;
  }
}

// 删除视频
function deleteVideo(index: number) {
  const video = videoResults.value[index];
  if (selectedVideoUrl.value === video.url) {
    selectedVideoUrl.value = null;
  }
  videoResults.value.splice(index, 1);
  MessagePlugin.success("视频已删除");
}

// 确认选择
function confirmSelect() {
  if (selectedVideoUrl.value) {
    emit("select", selectedVideoUrl.value);
    editVideoShow.value = false;
    MessagePlugin.success("已选择视频");
  }
}

// 初始化数据
function initData() {
  if (!props.videoForm) return;
  formData.model = props.videoForm.model;
  formData.mode = props.videoForm.mode;
  formData.images = [...props.videoForm.images];
  formData.aspectRatio = props.videoForm.aspectRatio || "";
  formData.resolution = props.videoForm.resolution;
  formData.duration = props.videoForm.duration;
  formData.prompt = props.videoForm.prompt;
  const results: VideoResult[] = [];
  const addedUrls = new Set<string>();
  if (props.videoForm.videoUrl) {
    results.push({ id: `selected_${Date.now()}`, url: props.videoForm.videoUrl });
    addedUrls.add(props.videoForm.videoUrl);
    selectedVideoUrl.value = props.videoForm.videoUrl;
  } else {
    selectedVideoUrl.value = null;
  }
  props.videoForm.generateUrl?.forEach((url, index) => {
    if (url && !addedUrls.has(url)) {
      results.push({ id: `video_${index}_${Date.now()}`, url });
      addedUrls.add(url);
    }
  });
  videoResults.value = results;
}

// 重置数据
function resetData() {
  selectedVideoUrl.value = null;
  videoResults.value = [];
}
interface Storyboard {
  id: number;
  lensImage: string; // 镜头图片URL
  imagePrompt: string; // 图片提示词
  videoPrompt: string; // 视频提示词
  duration: string; // 时长
  superScore: boolean; // 是否超分
}
//确认导出
function exportImage(selectedItems: Storyboard) {
  if (selectedItems.lensImage) {
    formData.images.push(selectedItems.lensImage);
    imagePrompts.value.push(selectedItems.videoPrompt || "");
    formData.prompt = imagePrompts.value.filter(Boolean).join("\n");
  }
}
</script>

<style lang="scss" scoped>
.editVideo {
  .configContainer {
    display: flex;
    gap: 24px;
    height: 750px;
  }

  .sectionTitle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    font-size: 16px;
    font-weight: 600;
    color: #1a1a1a;

    .countTag {
      margin-left: 8px;
    }
  }

  .deployInfo {
    width: 40%;
    flex-shrink: 0;
    border: 1px solid #e8ecf4;
    border-radius: 8px;
    padding: 20px;
    display: flex;
    flex-direction: column;

    .configFormWrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow-y: auto;
    }

    .formField {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .fieldLabel {
        font-size: 13px;
        font-weight: 500;
        color: #666;

        .imageCount {
          color: #999;
          font-weight: 400;
        }
      }

      .fieldInput {
        width: 100%;
      }

      &.soundField .switchWrapper {
        display: flex;
        align-items: center;
        gap: 8px;

        .switchLabel {
          font-size: 13px;
          color: #666;
        }
      }
    }

    .imageFieldSection {
      .imageSection {
        padding: 12px;
        background: #f8f9fc;
        border-radius: 6px;
        border: 1px solid #e8ecf4;
      }

      .imageList {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;

        &.startEndList .imageItem .frameTag {
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.6);
          color: #fff;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
        }
      }

      .imageItem {
        position: relative;
        width: 80px;
        height: 80px;
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid #e0e4ed;

        .uploadedImage {
          width: 100%;
          height: 100%;
        }

        .imageActions {
          position: absolute;
          top: 4px;
          right: 4px;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 4px;
          padding: 2px;
          z-index: 9999;
        }
      }

      .uploadBtn {
        width: 80px;
        height: 80px;
        border: 1px dashed #c0c6d4;
        border-radius: 6px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        cursor: pointer;
        color: #888;
        font-size: 12px;
        background: #fff;
        transition: all 0.2s;
      }
    }

    .promptFieldSection {
      .promptWrapper {
        position: relative;

        .generatePromptBtn {
          position: absolute;
          top: 8px;
          right: 10px;
          cursor: pointer;
          color: #666;
          transition: color 0.2s;
        }
      }
    }
  }

  .resultSection {
    flex: 1;
    border: 1px solid #e8ecf4;
    border-radius: 8px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .emptyState {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;

      .emptyIcon {
        width: 80px;
        height: 80px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f5f7fa;
        border-radius: 50%;
        color: #c0c5d5;
        margin-bottom: 12px;
      }

      .emptyTitle {
        font-size: 15px;
        color: #666;
        margin-bottom: 6px;
      }

      .emptyDesc {
        font-size: 13px;
        color: #999;
      }
    }

    .videoList {
      flex: 1;
      overflow-y: auto;
      .videoGrid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
    }

    .videoCard {
      position: relative;
      border: 2px solid #e8ecf4;
      border-radius: 12px;
      overflow: hidden;
      background: #000;
      cursor: pointer;
      transition: all 0.2s;
      aspect-ratio: 16 / 9;
      .videoPreview {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;

        .videoElement {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .playOverlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.4);
          color: #fff;
          opacity: 0;
          transition: opacity 0.2s;
          cursor: pointer;
        }

        .generatingOverlay,
        .failedOverlay {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: #999;
          font-size: 13px;
        }

        .failedOverlay {
          color: #ff6b6b;
        }
      }

      .videoIndexBadge {
        position: absolute;
        top: 10px;
        left: 10px;
        padding: 4px 10px;
        background: rgba(0, 0, 0, 0.5);
        color: #fff;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        z-index: 2;
      }

      .videoTopActions {
        position: absolute;
        top: 10px;
        right: 10px;
        display: flex;
        gap: 6px;
        z-index: 2;

        .actionBtn {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          color: #fff;
          background: rgba(0, 0, 0, 0.5);

          &.selectedBtn {
            cursor: default;
          }
          &.deleteBtn:hover {
            background: rgba(208, 2, 27, 0.8);
          }
        }
      }
    }
  }

  .dialogFooter {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 0 0;
    border-top: 1px solid #e8ecf4;
    margin-top: 16px;
  }
}
</style>
