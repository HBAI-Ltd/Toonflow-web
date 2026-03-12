<template>
  <div class="addVideoDeploy">
    <t-dialog
      v-model:visible="addVideoDeployShow"
      header="添加视频配置"
      width="85%"
      top="2vh"
      placement="center"
      :footer="false"
      class="videoDeployDialog">
      <div class="configContainer">
        <div class="addConfigSection">
          <div class="sectionTitle">
            <span>配置参数</span>
            <t-button theme="primary" class="addBtn" @click="addConfig">添加到配置列表</t-button>
          </div>
          <div class="configFormWrapper">
            <div class="formGrid">
              <div class="formField">
                <label class="fieldLabel">模型</label>
                <t-select v-model="formData.model" placeholder="请选择模型" class="fieldInput" @change="onModelChange">
                  <t-option v-for="(item, index) in modelOptions" :key="index" :label="item.label" :value="item.value" />
                </t-select>
              </div>

              <div class="formField">
                <label class="fieldLabel">模式</label>
                <t-select v-model="formData.mode" placeholder="请选择模式" class="fieldInput" @change="onModeChange">
                  <t-option v-for="(item, index) in currentModeOptions" :key="index" :label="item.label" :value="item.value" />
                </t-select>
              </div>

              <div class="formField">
                <label class="fieldLabel">分辨率</label>
                <t-select v-model="formData.resolution" placeholder="请选择分辨率" class="fieldInput">
                  <t-option v-for="item in currentResolutionOptions" :key="item.value" :label="item.label" :value="item.value" />
                </t-select>
              </div>

              <div class="formField">
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
            </div>

            <div v-if="showImageSection" class="imageFieldSection">
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
                      <i-delete theme="outline" fill="#d0021b" size="18" @click.stop="removeImage(index)" />
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
            <div class="promptFieldSection">
              <label class="fieldLabel">提示词</label>
              <div style="position: relative">
                <t-textarea v-model="formData.prompt" placeholder="请输入视频生成的提示词描述..." :autosize="{ minRows: 5, maxRows: 5 }"></t-textarea>
                <div class="generatePrompt" @click="generatePrompt">
                  <i-magic theme="outline" size="20" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="configListSection">
          <div class="sectionTitle">
            <span>配置列表</span>
            <t-tag v-if="configList.length > 0" theme="primary" variant="light" size="small" class="countTag">{{ configList.length }} 项</t-tag>
          </div>

          <div v-if="configList.length === 0" class="emptyState">
            <div class="emptyIcon">
              <t-icon name="file-add" size="56px" />
            </div>
            <p class="emptyTitle">暂无配置</p>
            <p class="emptyDesc">在上方设置参数后点击添加按钮</p>
          </div>
          <div class="list" v-else>
            <div class="configGrid">
              <div v-for="(config, index) in configList" :key="index" class="configCard">
                <div class="cardHeader">
                  <span class="cardIndex">配置{{ index + 1 }}</span>
                  <i-delete theme="outline" fill="#d0021b" size="18" @click="removeConfig(index)" style="cursor: pointer" />
                </div>
                <div class="cardContent">
                  <div v-if="config.images.filter(Boolean).length > 0" class="cardImageSection">
                    <div class="imagePreviewList">
                      <t-image v-for="(img, imgIndex) in config.images.filter(Boolean)" :key="imgIndex" :src="img" fit="cover" class="previewImage" />
                    </div>
                  </div>
                  <div class="cardInfoGrid">
                    <div class="infoItem">
                      <span class="infoLabel">模型</span>
                      <span class="infoValue">{{ getModelLabel(config.model) }}</span>
                    </div>
                    <div class="infoItem">
                      <span class="infoLabel">模式</span>
                      <span class="infoValue">{{ getModeLabel(config.mode) }}</span>
                    </div>
                    <div class="infoItem">
                      <span class="infoLabel">分辨率</span>
                      <span class="infoValue">{{ config.resolution }}</span>
                    </div>
                    <div v-if="config.aspectRatio" class="infoItem">
                      <span class="infoLabel">宽高比</span>
                      <span class="infoValue">{{ config.aspectRatio }}</span>
                    </div>
                    <div class="infoItem">
                      <span class="infoLabel">时长</span>
                      <span class="infoValue">{{ config.duration }}秒</span>
                    </div>
                    <div v-if="config.showSound" class="infoItem">
                      <span class="infoLabel">声音</span>
                      <span class="infoValue">{{ config.sound ? "开启" : "关闭" }}</span>
                    </div>
                  </div>
                  <div v-if="config.prompt" class="cardPrompt ac">
                    <span class="promptLabel">提示词：</span>
                    <t-tooltip :content="config.prompt" placement="top">
                      <span class="promptContent">{{ config.prompt }}</span>
                    </t-tooltip>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="dialogFooter">
        <t-button variant="outline" @click="addVideoDeployShow = false">取消</t-button>
        <t-button theme="primary" :disabled="configList.length === 0" @click="keep">确认配置 ({{ configList.length }})</t-button>
      </div>
    </t-dialog>
    <storyboardList v-model="storyboardListShow" @exportImage="exportImage" :state="false" />
  </div>
</template>

<script setup lang="ts">
import storyboardList from "./storyboardList.vue";
import { ref, computed, reactive, watch } from "vue";
import { MessagePlugin } from "tdesign-vue-next";

const addVideoDeployShow = defineModel({
  type: Boolean,
  default: false,
});
//视频模型列表类型
interface ModelItem {
  manufacturer: string;
  model: string;
  durationResolutionMap: { duration: number[]; resolution: string[] }[];
  aspectRatio: string[];
  type: string[];
  audio: boolean;
}
const props = defineProps<{
  modelList: ModelItem[];
}>();

// 模式类型映射
const modeTypeMap: Record<string, { label: string; value: string }> = {
  text: { label: "文生视频", value: "text" },
  singleImage: { label: "单图模式", value: "singleImage" },
  endFrameOptional: { label: "首尾帧模式", value: "endFrameOptional" },
  reference: { label: "参考图模式", value: "reference" },
};

const modelOptions = computed(() => {
  return props.modelList.map((item) => ({
    label: item.model,
    value: item.model,
  }));
});

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
  // 获取所有分辨率并去重
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
  // 获取所有时长并去重
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

// 配置列表
interface ConfigItem {
  model: string;
  mode: string;
  images: string[];
  resolution: string;
  aspectRatio: string;
  duration: number;
  sound: boolean;
  prompt: string;
  showSound: boolean;
}
const configList = ref<ConfigItem[]>([]);

// 是否显示图片区域
const showImageSection = computed(() => {
  return formData.mode !== "text";
});

// 初始化表单数据
function initFormData() {
  if (props.modelList.length > 0) {
    const firstModel = props.modelList[0];
    formData.model = firstModel.model;
    formData.mode = firstModel.type[0] || "";
    formData.resolution = firstModel.durationResolutionMap[0]?.resolution[0] || "";
    formData.aspectRatio = firstModel.aspectRatio[0] || "";
    formData.duration = firstModel.durationResolutionMap[0]?.duration[0] || 0;
    formData.sound = false;
  }
}

// 模型变化时重置模式
function onModelChange() {
  const config = currentModelConfig.value;
  if (!config) return;

  if (!config.type.includes(formData.mode)) {
    formData.mode = config.type[0] || "";
  }
  formData.images = [];

  const resolutions = currentResolutionOptions.value;
  if (resolutions.length > 0 && !resolutions.find((r) => r.value === formData.resolution)) {
    formData.resolution = resolutions[0].value;
  }

  if (config.aspectRatio.length > 0 && !config.aspectRatio.includes(formData.aspectRatio)) {
    formData.aspectRatio = config.aspectRatio[0];
  }

  const durationOptions = currentDurationOptions.value;
  if (durationOptions.length > 0 && !durationOptions.find((d) => d.value === formData.duration)) {
    formData.duration = durationOptions[0].value;
  }
}

// 模式变化时重置图片
function onModeChange() {
  formData.images = [];
  imagePrompts.value = [];
  formData.prompt = "";
}
const storyboardListShow = ref(false);
// 存储每张图片对应的提示词
const imagePrompts = ref<string[]>([]);

// 打开图片选择器
function openImageSelector() {
  storyboardListShow.value = true;
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
// 删除图片
function removeImage(index: number) {
  const currentImages = formData.images.filter(Boolean);
  currentImages.splice(index, 1);
  formData.images = currentImages;
  const currentPrompts = imagePrompts.value.filter(Boolean);
  currentPrompts.splice(index, 1);
  imagePrompts.value = currentPrompts;
  formData.prompt = imagePrompts.value.filter(Boolean).join("\n");
}

// 添加配置
function addConfig() {
  if (!formData.model) {
    MessagePlugin.warning("请选择模型");
    return;
  }
  if (!formData.mode) {
    MessagePlugin.warning("请选择模式");
    return;
  }

  const newConfig: ConfigItem = {
    model: formData.model,
    mode: formData.mode,
    images: [...formData.images],
    resolution: formData.resolution,
    aspectRatio: formData.aspectRatio,
    duration: formData.duration,
    sound: formData.sound,
    prompt: formData.prompt,
    showSound: showSoundSwitch.value,
  };

  configList.value.push(newConfig);

  // 重置表单
  formData.images = [];
  formData.prompt = "";
  imagePrompts.value = [];

  MessagePlugin.success("配置添加成功");
}

// 删除配置
function removeConfig(index: number) {
  configList.value.splice(index, 1);
  MessagePlugin.success("配置已删除");
}

// 获取模型标签
function getModelLabel(value: string) {
  return value;
}

// 获取模式标签
function getModeLabel(value: string) {
  return modeTypeMap[value]?.label || value;
}

// 确定
function keep() {
  addVideoDeployShow.value = false;
}
//生成提示词
function generatePrompt() {
  MessagePlugin.info("提示词生成功能待开发");
}
// 监听弹窗打开/关闭
watch(addVideoDeployShow, (val) => {
  if (val) {
    // 弹窗打开时初始化数据
    initFormData();
  } else {
    // 弹窗关闭时重置数据
    formData.model = "";
    formData.mode = "";
    formData.images = [];
    formData.resolution = "";
    formData.aspectRatio = "";
    formData.duration = 0;
    formData.sound = false;
    formData.prompt = "";
    imagePrompts.value = [];
  }
});

// 监听modelList变化，重新初始化
watch(
  () => props.modelList,
  () => {
    if (addVideoDeployShow.value && props.modelList.length > 0) {
      initFormData();
    }
  },
  { deep: true },
);
</script>

<style lang="scss" scoped>
.addVideoDeploy {
  .configContainer {
    display: flex;
    gap: 24px;
  }

  .sectionTitle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    font-size: 16px;
    font-weight: 600;
    color: #1a1a1a;
  }

  .addConfigSection {
    width: 45%;
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
      gap: 20px;
      overflow-y: auto;
    }

    .formGrid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .formField {
      display: flex;
      flex-direction: column;
      gap: 6px;

      .fieldLabel {
        font-size: 13px;
        font-weight: 500;
        color: #666;
      }

      .fieldInput {
        width: 100%;
      }

      &.soundField .switchWrapper {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 0;
      }
    }

    .imageFieldSection {
      .fieldLabel {
        font-size: 13px;
        font-weight: 500;
        color: #666;
        margin-bottom: 10px;

        .imageCount {
          color: #999;
          font-weight: 400;
        }
      }

      .imageSection {
        padding: 10px;
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
        width: 100px;
        height: 100px;
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
        }
      }

      .uploadBtn {
        width: 100px;
        height: 100px;
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
      }
    }

    .promptFieldSection {
      font-size: 13px;
      font-weight: 500;
      color: #666;
      margin-bottom: 6px;
      .generatePrompt {
        position: absolute;
        top: 5px;
        right: 10px;
        cursor: pointer;
      }
    }
  }

  .configListSection {
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

    .list {
      flex: 1;
      overflow-y: auto;

      .configGrid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;

        .configCard {
          height: 370px;
          border: 1px solid #e8ecf4;
          border-radius: 12px;
          overflow: hidden;
          background: #fff;
          display: flex;
          flex-direction: column;

          .cardHeader {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 14px;
            background: #fafbfc;
            border-bottom: 1px solid #f0f2f8;

            .cardIndex {
              font-size: 13px;
              font-weight: 600;
              color: #333;
            }
          }

          .cardContent {
            flex: 1;
            padding: 12px 14px;
            overflow-y: auto;

            .cardImageSection {
              margin-bottom: 10px;
              padding-bottom: 10px;
              border-bottom: 1px dashed #e8ecf4;

              .imagePreviewList {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;

                .previewImage {
                  width: 80px;
                  height: 80px;
                  border-radius: 4px;
                  overflow: hidden;
                  border: 1px solid #e8ecf4;
                }
              }
            }

            .cardInfoGrid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 8px;

              .infoItem {
                display: flex;
                flex-direction: column;
                gap: 2px;

                .infoLabel {
                  font-size: 11px;
                  color: #999;
                }

                .infoValue {
                  font-size: 13px;
                  color: #333;
                  font-weight: 500;
                }
              }
            }

            .cardPrompt {
              margin-top: 10px;
              padding-top: 10px;
              border-top: 1px dashed #e8ecf4;
              display: flex;
              gap: 4px;
              font-size: 12px;
              .promptLabel {
                color: #999;
                flex-shrink: 0;
              }

              .promptContent {
                color: #666;
                line-height: 1.4;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
              }
            }
          }
        }
      }
    }
  }

  .dialogFooter {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 24px;
    border-top: 1px solid #e8ecf4;
  }
}
</style>
