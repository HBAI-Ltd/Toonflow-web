<template>
  <div class="video-config-form">
    <!-- 厂商选择 -->
    <div class="form-row" v-if="editable">
      <label>模型</label>
      <a-select v-model:value="localConfig.aiConfigId" @change="onManufacturerChange" :disabled="selectManfactDis" size="small">
        <a-select-option v-for="item in availableManufacturers" :key="item.value" :value="item.value">
          {{ item.label }}
        </a-select-option>
      </a-select>
    </div>
    <div class="form-row" v-else>
      <label>模型</label>
      <span class="value">{{ localConfig.model }}</span>
    </div>
    <!-- 模式选择 -->
    <div class="form-row" v-if="editable">
      <label>模式</label>
      <a-radio-group v-model:value="localConfig.mode" @change="onModeChange" size="small">
        <a-radio v-for="mode in getModeOptions(localConfig.manufacturer, localConfig.model)" :key="mode.value" :value="mode.value">
          {{ mode.label }}
        </a-radio>
      </a-radio-group>
    </div>
    <div class="form-row" v-else>
      <label>模式</label>
      <span class="value">{{ getModeLabel(localConfig.mode) }}</span>
    </div>

    <!-- 首尾帧模式配置 -->
    <template v-if="localConfig.mode === 'startEnd'">
      <div class="form-row frame-row">
        <label>帧选择</label>
        <div class="frame-group">
          <div class="frame-box" :class="{ 'has-image': localConfig.startFrame }" @click="openSelector('start')">
            <template v-if="localConfig.startFrame">
              <img :src="localConfig.startFrame.filePath" />
              <a-button v-if="editable" class="remove-btn" type="text" size="small" @click.stop="localConfig.startFrame = null">
                <close-outlined />
              </a-button>
              <span class="frame-label">首帧</span>
            </template>
            <template v-else>
              <plus-outlined />
              <span>首帧</span>
            </template>
          </div>
          <div class="frame-box" :class="{ 'has-image': localConfig.endFrame }" @click="openSelector('end')">
            <template v-if="localConfig.endFrame">
              <img :src="localConfig.endFrame.filePath" />
              <a-button v-if="editable" class="remove-btn" type="text" size="small" @click.stop="localConfig.endFrame = null">
                <close-outlined />
              </a-button>
              <span class="frame-label">尾帧</span>
            </template>
            <template v-else>
              <plus-outlined />
              <span>尾帧</span>
            </template>
          </div>
        </div>
      </div>
    </template>

    <!-- 多图模式配置 -->
    <template v-if="localConfig.mode === 'multi'">
      <div class="form-row">
        <label>图片</label>
        <div class="multi-images">
          <draggable
            v-if="localConfig.images && localConfig.images.length > 0"
            v-model="localConfig.images"
            item-key="id"
            class="image-drag-list"
            ghost-class="ghost"
            :animation="200"
            :disabled="!editable"
            handle=".drag-handle">
            <template #item="{ element, index: imgIndex }">
              <div class="drag-image-item">
                <div class="drag-handle">
                  <img class="image" :src="element.filePath" draggable="false" />
                  <div class="image-order">{{ imgIndex + 1 }}</div>
                </div>
                <a-button v-if="editable" class="remove-btn" type="text" size="small" @click="removeImage(imgIndex)">
                  <close-outlined />
                </a-button>
              </div>
            </template>
          </draggable>
          <div
            v-if="editable && (!localConfig.images || localConfig.images.length < getMaxImages(localConfig.manufacturer, localConfig.model))"
            class="add-image-box"
            @click="openSelector('multi')">
            <plus-outlined />
          </div>
        </div>
      </div>
      <div class="form-row" v-if="editable">
        <label></label>
        <span class="tip">
          拖拽调整顺序 | {{ localConfig.images?.length || 0 }}/{{ getMaxImages(localConfig.manufacturer, localConfig.model) }}张
        </span>
      </div>
    </template>

    <!-- 单图模式配置 -->
    <template v-if="localConfig.mode === 'single'">
      <div class="form-row frame-row">
        <label>图片</label>
        <div class="frame-group">
          <div class="frame-box single-frame" :class="{ 'has-image': localConfig.startFrame }" @click="openSelector('single')">
            <template v-if="localConfig.startFrame">
              <img :src="localConfig.startFrame.filePath" />
              <a-button v-if="editable" class="remove-btn" type="text" size="small" @click.stop="localConfig.startFrame = null">
                <close-outlined />
              </a-button>
            </template>
            <template v-else>
              <plus-outlined />
              <span>选择图片</span>
            </template>
          </div>
        </div>
      </div>
    </template>

    <!-- 文本模式配置 -->
    <template v-if="localConfig.mode === 'text'">
      <div class="form-row">
        <label>提示</label>
        <span class="tip">纯文本生成视频，无需上传图片</span>
      </div>
    </template>

    <!-- 分辨率/比例 -->
    <div class="form-row" v-if="getResolutionOptions(localConfig.manufacturer, localConfig.model).length">
      <label>{{ getResolutionLabel(localConfig.manufacturer, localConfig.model) }}</label>
      <a-select v-if="editable" v-model:value="localConfig.resolution" size="small" style="flex: 1" @change="emitChange">
        <a-select-option v-for="res in getResolutionOptions(localConfig.manufacturer, localConfig.model)" :key="res.value" :value="res.value">
          {{ res.label }}
        </a-select-option>
      </a-select>
      <span v-else class="value">{{ getResolutionDisplayLabel(localConfig.manufacturer, localConfig.model, localConfig.resolution) }}</span>
    </div>

    <!-- 时长 -->
    <div class="form-row">
      <label>时长</label>
      <template v-if="getDurationOptions(localConfig.manufacturer, localConfig.model).length > 0">
        <a-select v-if="editable" v-model:value="localConfig.duration" size="small" style="width: 100px" @change="emitChange">
          <a-select-option v-for="dur in getDurationOptions(localConfig.manufacturer, localConfig.model)" :key="dur.value" :value="dur.value">
            {{ dur.label }}
          </a-select-option>
        </a-select>
        <span v-else class="value">{{ localConfig.duration }}秒</span>
      </template>
      <template v-else>
        <template v-if="editable">
          <a-input-number
            v-model:value="localConfig.duration"
            :min="getDurationRange(localConfig.manufacturer, localConfig.model).min"
            :max="getDurationRange(localConfig.manufacturer, localConfig.model).max"
            :step="getDurationRange(localConfig.manufacturer, localConfig.model).step"
            size="small"
            style="width: 70px"
            @change="emitChange" />
          <span class="unit">秒</span>
          <span class="tip">{{ getDurationTip(localConfig.manufacturer, localConfig.model) }}</span>
        </template>
        <span v-else class="value">{{ localConfig.duration }}秒</span>
      </template>
    </div>
    <!-- 声音开关 -->
    <div class="form-row" v-if="getAudioSupport(localConfig.manufacturer, localConfig.model)">
      <label>声音</label>
      <a-switch v-model:checked="localConfig.audioEnabled" size="small" @change="emitChange()" />
      <span class="tip" style="margin-left: 8px">{{ localConfig.audioEnabled ? "开启" : "关闭" }}</span>
    </div>
    <!-- 视频提示词 -->
    <div class="form-row prompt-row">
      <div class="prompt-header">
        <label>提示词</label>
        <a-button type="link" size="small" :loading="promptLoading" @click="generatePrompt" class="magic-btn">
          <template #icon><i-magic /></template>
          润色
        </a-button>
      </div>
      <a-textarea v-model:value="localConfig.prompt" :rows="3" placeholder="描述视频内容、运动方式等" size="small" @change="emitChange" />
    </div>

    <!-- 图片选择器 -->
    <ImageSelector
      v-model:visible="selectorVisible"
      :script-id="scriptId"
      :mode="selectorMode"
      :max-images="getMaxImages(localConfig.manufacturer, localConfig.model)"
      :initial-images="selectorInitialImages"
      @confirm="onSelectorConfirm" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from "vue";
import { message } from "ant-design-vue";
import { PlusOutlined, CloseOutlined } from "@ant-design/icons-vue";
import draggable from "vuedraggable";
import ImageSelector from "./ImageSelector.vue";
import axios from "@/utils/axios";
import {
  type ImageItem,
  type VideoConfigData,
  manufacturerConfigs,
  getManufacturerConfig,
  getManufacturerLabel,
  getModeLabel,
  getModeOptions,
  getResolutionLabel,
  getResolutionOptions,
  getDefaultResolution,
  getDefaultMode,
  getDefaultDuration,
  getDurationOptions,
  getDurationRange,
  getDurationTip,
  getMaxImages,
  getAudioSupport,
  getModelList
} from "./manufacturerConfig";

const props = withDefaults(
  defineProps<{
    config: VideoConfigData;
    scriptId: number;
    editable?: boolean;
    manufacturerDisabled?: boolean;
    availableManufacturers?: { label: string; value: string }[];
  }>(),
  {
    editable: true,
    manufacturerDisabled: false,
    availableManufacturers: () => [
      { label: "火山引擎(豆包)", value: "volcengine" },
      { label: "RunningHub(Sora)", value: "runninghub" },
      // { label: "Apimart(Sora)", value: "apimart" },
    ],
  },
);
const selectManfactDis = ref(props.manufacturerDisabled);
const emit = defineEmits<{
  (e: "update:config", config: VideoConfigData): void;
  (e: "change", config: VideoConfigData): void;
}>();

// 本地配置副本
const localConfig = reactive<VideoConfigData>({ ...props.config });
const promptLoading = ref(false);

// 图片选择器状态
const selectorVisible = ref(false);
const selectorMode = ref<"start" | "end" | "multi" | "single">("start");

// 监听外部配置变化
watch(
  () => props.config,
  (newConfig) => {
    Object.assign(localConfig, newConfig);
  },
  { deep: true },
);

// 获取分辨率显示标签
function getResolutionDisplayLabel(manufacturer: string, model: string, value: string): string {
  const options = getResolutionOptions(manufacturer, model);
  const option = options.find((o) => o.value === value);
  return option?.label || value;
}

// 计算选择器初始图片
const selectorInitialImages = computed(() => {
  if (selectorMode.value === "start" || selectorMode.value === "single") {
    return localConfig.startFrame ? [localConfig.startFrame] : [];
  } else if (selectorMode.value === "end") {
    return localConfig.endFrame ? [localConfig.endFrame] : [];
  } else {
    return localConfig.images || [];
  }
});

// 厂商变更
function onManufacturerChange() {
  const selectedManufacturer = manufacturerList.value.find((i) => i.id == localConfig.aiConfigId);

  if (!selectedManufacturer) return;

  localConfig.manufacturer = selectedManufacturer.manufacturer;
  localConfig.model = selectedManufacturer.model;

  const newConfig = getManufacturerConfig(localConfig.manufacturer, localConfig.model);
  localConfig.mode = newConfig.defaultMode as VideoConfigData["mode"];
  localConfig.resolution = newConfig.defaultResolution;
  localConfig.duration = getDefaultDuration(localConfig.manufacturer, localConfig.model);
  localConfig.startFrame = null;
  localConfig.endFrame = null;
  localConfig.images = [];
  emitChange();
}

// 模式变更
function onModeChange() {
  localConfig.startFrame = null;
  localConfig.endFrame = null;
  if (localConfig.mode == "text") {
    localConfig.images = [];
  } else if (localConfig.mode == "single") {
    //如有 图片，则只留一张
    if (localConfig.images.length > 1) {
      localConfig.images = [localConfig.images[0]];
    }
  } else if (localConfig.mode == "multi") {
    if (localConfig.images.length) {
      localConfig.images = localConfig.images.slice(0, 10);
    }
  } else if (localConfig.mode == "startEnd") {
    if (localConfig.images.length > 2) {
      localConfig.images = localConfig.images.slice(0, 2);
    }
  }
  localConfig.images = [];

  emitChange();
}

// 打开图片选择器
function openSelector(type: "start" | "end" | "multi" | "single") {
  selectorMode.value = type;
  selectorVisible.value = true;
}

// 确认图片选择
function onSelectorConfirm(images: ImageItem[]) {
  if (selectorMode.value === "start" || selectorMode.value === "single") {
    localConfig.startFrame = images[0] || null;
  } else if (selectorMode.value === "end") {
    localConfig.endFrame = images[0] || null;
  } else {
    localConfig.images = [...images];
  }
  emitChange();
}

// 移除图片
function removeImage(index: number) {
  localConfig.images.splice(index, 1);
  emitChange();
}

// 生成提示词
async function generatePrompt() {
  const images: ImageItem[] = [];
  if (localConfig.mode === "startEnd") {
    if (localConfig.startFrame) images.push(localConfig.startFrame);
    if (localConfig.endFrame) images.push(localConfig.endFrame);
  } else if (localConfig.mode === "single") {
    if (localConfig.startFrame) images.push(localConfig.startFrame);
  } else {
    images.push(...localConfig.images);
  }

  // if (images.length === 0) {
  //   message.warning("请先选择图片");
  //   return;
  // }

  promptLoading.value = true;
  try {
    const res = await axios.post("/video/generatePrompt", {
      prompt: localConfig.prompt || "生成视频",
      images: images.map((img) => ({ filePath: img.filePath, prompt: img.prompt })),
      duration: localConfig.duration,
      type: localConfig.mode,
      videoConfigId: localConfig.id,
    });
    localConfig.prompt = res.data;
    emitChange();
    message.success("提示词生成成功");
  } catch (e: any) {
    message.error(e?.message || "生成失败");
  } finally {
    promptLoading.value = false;
  }
}

// 触发变更事件
function emitChange() {
  const configCopy = { ...localConfig };

  emit("update:config", configCopy);
  emit("change", configCopy);
}
const manufacturerAllRecord: Record<string, string> = Object.values(manufacturerConfigs).reduce((acc: Record<string, string>, c) => {
  acc[c.value as string] = c.label;
  return acc;
}, {});
const availableManufacturers = computed(() => {
  if (manufacturerList.value.length === 0) return [];
  return manufacturerList.value.map((i) => ({
    label: i.model + "—" + manufacturerAllRecord[i.manufacturer],
    value: i.id,
    manufacturer: i.manufacturer,
  }));
});
const manufacturerList = ref<{ model: string; manufacturer: string; id: number }[]>([]);
onMounted(async () => {
  const res = await axios.post("/video/getManufacturer", {
    userId: Number(localStorage.getItem("userId")),
  });
  manufacturerList.value = res.data;
  if (!localConfig.model) {
    localConfig.aiConfigId = undefined;
    selectManfactDis.value = false;
  } else {
    // 如果已有 model，确保 manufacturer 和其他配置正确
    const selectedManufacturer = manufacturerList.value.find((i) => i.manufacturer === localConfig.manufacturer);

    if (selectedManufacturer) {
      localConfig.aiConfigId = selectedManufacturer.id;
    }
  }
});
onMounted(() =>{
  getModelList()
})
</script>

<style lang="scss" scoped>
.video-config-form {
  .form-row {
    display: flex;
    align-items: center;
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }

    > label {
      width: 70px;
      flex-shrink: 0;
      font-size: 13px;
      color: #6b7280;
      line-height: 24px;
    }

    .value {
      color: #1f2937;
      font-size: 13px;
      font-weight: 500;
    }

    .unit {
      margin-left: 6px;
      font-size: 12px;
      color: #6b7280;
    }

    .tip {
      margin-left: 8px;
      font-size: 11px;
      color: #9ca3af;
    }

    &.frame-row {
      align-items: flex-start;

      .frame-group {
        display: flex;
        gap: 10px;
      }
    }

    &.prompt-row {
      flex-direction: column;
      align-items: flex-start;

      .prompt-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        margin-bottom: 8px;

        > label {
          width: auto;
          margin-bottom: 0;
        }

        .magic-btn {
          padding: 0;
          height: auto;
          color: #9333ea;

          &:hover {
            color: #7c3aed;
          }
        }
      }

      :deep(.ant-input) {
        font-size: 13px;
        line-height: 1.6;
      }
    }
  }

  .frame-box {
    width: 150px;
    height: auto;
    min-height: 70px;
    border: 1px dashed #d9d9d9;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
    background: #fafafa;
    font-size: 11px;
    color: #999;

    &.single-frame {
      width: 100px;
      height: 75px;
    }

    &:hover {
      border-color: #1890ff;
      background: #e6f7ff;
    }

    &.has-image {
      border-style: solid;
      border-color: #52c41a;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .frame-label {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.5);
        color: #fff;
        font-size: 10px;
        text-align: center;
        padding: 2px 0;
      }

      .remove-btn {
        position: absolute;
        top: 0;
        right: 0;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 0 0 0 4px;
        width: 18px;
        height: 18px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s;
        font-size: 11px;
      }

      &:hover .remove-btn {
        opacity: 1;
      }
    }

    span {
      margin-top: 4px;
    }
  }

  .multi-images {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    flex: 1;

    .image-drag-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .drag-image-item {
      position: relative;
      width: 150px;
      height: auto;
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid #52c41a;

      .drag-handle {
        width: 100%;
        height: 100%;
        cursor: move;
        position: relative;

        .image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          pointer-events: none;
          user-select: none;
        }
      }

      .image-order {
        position: absolute;
        top: 2px;
        left: 2px;
        background: rgba(0, 0, 0, 0.6);
        color: #fff;
        font-size: 10px;
        padding: 1px 4px;
        border-radius: 3px;
        pointer-events: none;
      }

      .remove-btn {
        position: absolute;
        top: 0;
        right: 0;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 0 0 0 4px;
        width: 18px;
        height: 18px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s;
        font-size: 11px;
      }

      &:hover .remove-btn {
        opacity: 1;
      }
    }

    .ghost {
      opacity: 0.5;
      background: #c8ebfb;
    }

    .add-image-box {
      width: 150px;
      height: 70px;
      border: 1px dashed #d9d9d9;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      background: #fafafa;
      font-size: 14px;
      color: #999;

      &:hover {
        border-color: #1890ff;
        background: #e6f7ff;
      }
    }
  }
}
</style>
