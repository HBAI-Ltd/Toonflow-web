<template>
  <div class="generateImage">
    <t-dialog
      v-model:visible="generateImageShow"
      :closable="false"
      top="2vh"
      width="80vw"
      :maskClosable="false"
      wrapClassName="no-header-margin"
      dialogClass="custom-modal"
      :close-btn="false"
      :footer="false"
      @close-btn-click="handleCancel">
      <template #header>
        <a-flex justify="space-between" align="center" class="modalHeader">
          <div class="headerLeft">
            <i-lightning theme="filled" size="24" class="headerIcon" />
            <a-typography-title :level="4" style="margin: 0">AI 图片生成</a-typography-title>
          </div>
          <a-button type="text" size="large" @click="closeModal" class="closeBtn">
            <template #icon>
              <i-close theme="outline" size="20" />
            </template>
          </a-button>
        </a-flex>
      </template>

      <div class="contentWrapper">
        <div class="leftBody">
          <div class="sectionCard">
            <div class="modeSwitch">
              <a-segmented v-model:value="mode" block :options="modeOptions" size="large" />
            </div>

            <div class="uploadSection">
              <div class="sectionHeader">
                <span class="labelText">{{ mode === 1 ? "上传图片" : "参考图片" }}</span>
                <a-tag v-if="mode === 2" color="blue" class="optionalTag">可选</a-tag>
              </div>
              <div class="picturePreview" @click="changeFile">
                <input ref="fileInput" type="file" accept="image/*" style="display: none" @change="handleFileChange" />
                <template v-if="currentImage">
                  <div class="imageWrapper">
                    <a-image :src="currentImage" alt="参考图片" class="previewImg" :fallback="errorPicture" :preview="false" />
                    <div class="imageOverlay">
                      <div class="overlayActions">
                        <i-preview-open class="actionIcon" theme="outline" size="22" @click.stop="previewCurrentImage" />
                        <i-delete class="actionIcon deleteIcon" theme="outline" size="22" @click.stop="deleteImage" />
                      </div>
                    </div>
                  </div>
                </template>
                <div v-else class="uploadPlaceholder">
                  <div class="uploadIconWrapper">
                    <i-upload-picture theme="outline" size="36" class="uploadIcon" />
                  </div>
                  <span class="uploadText">点击上传图片</span>
                  <span class="uploadHint">支持 JPG、PNG、WEBP 格式</span>
                </div>
              </div>
            </div>

            <template v-if="mode === 2">
              <div class="promptSection">
                <div class="sectionHeader">
                  <span class="labelText">提示词</span>
                  <a-tooltip title="AI 智能生成提示词">
                    <a-button type="link" size="small" class="magicBtn" @click.stop="generatePrompt" :loading="promptLoading">
                      <template #icon><i-magic theme="filled" size="16" /></template>
                      智能生成
                    </a-button>
                  </a-tooltip>
                </div>
                <a-spin :spinning="promptLoading" tip="AI 正在生成提示词...">
                  <a-textarea
                    v-model:value="formData.prompt"
                    :autoSize="{ minRows: 5, maxRows: 8 }"
                    placeholder="描述您想要生成的图片内容，例如：一个充满科技感的未来城市，霓虹灯闪烁，赛博朋克风格..."
                    class="promptTextarea"
                    show-count
                    :maxlength="500" />
                </a-spin>
              </div>
              <a-button type="primary" block size="large" class="generateBtn" @click="startGenerate" :loading="generateLoading">
                <template #icon><i-lightning theme="filled" size="18" /></template>
                开始生成
              </a-button>
            </template>
            <template v-else>
              <a-button type="primary" block size="large" class="generateBtn" @click="onConfirm" :disabled="!currentImage" :loading="saveLoading">
                <template #icon><i-check theme="outline" size="18" /></template>
                确认上传
              </a-button>
            </template>
          </div>
        </div>

        <div v-if="mode === 2" class="rightBody">
          <div class="sectionCard resultCard">
            <div class="sectionHeader jb ac">
              <span class="labelText">生成结果</span>
              <a-badge style="margin-right: 5px" :count="resultImages.length" />
            </div>
            <div class="resultContent">
              <a-empty v-if="!resultImages.length && !generateLoading" description="暂无生成结果，开始创作吧！" class="emptyState">
                <template #image>
                  <i-picture theme="outline" size="64" />
                </template>
              </a-empty>
              <div v-else class="resultGrid">
                <div
                  v-for="(item, index) in resultImages"
                  :key="index"
                  class="resultItem"
                  :class="{ selected: selectedIndex === index, generating: item.state === '生成中' }"
                  @click="handleSelect(item, index)">
                  <template v-if="(item.state === '生成成功' || !item.state) && item.filePath">
                    <a-image :preview="false" :src="item.filePath" :fallback="errorPicture" class="resultImg" />
                    <div class="resultOverlay">
                      <div class="overlayActions">
                        <i-preview-open class="actionIcon" theme="outline" size="20" @click.stop="previewImage(item.filePath)" />
                        <i-delete class="actionIcon deleteIcon" theme="outline" size="20" @click.stop="delImage(item)" />
                      </div>
                    </div>
                    <div v-if="selectedIndex === index" class="selectedBadge">
                      <i-check theme="filled" size="16" />
                    </div>
                  </template>
                  <template v-else-if="item.state === '生成中'">
                    <div class="generatingPlaceholder">
                      <a-spin size="large" />
                      <span class="generatingText">生成中...</span>
                    </div>
                  </template>
                  <template v-else-if="item.state === '生成失败'">
                    <div class="errorPlaceholder">
                      <i-close-one theme="filled" size="32" class="errorIcon" />
                      <span class="errorText">生成失败</span>
                    </div>
                    <div class="deleteWrapper">
                      <i-delete class="actionIcon deleteIcon" theme="outline" size="18" @click.stop="delImage(item)" />
                    </div>
                  </template>
                </div>
              </div>
            </div>
            <div v-if="resultImages.length > 0" class="resultFooter">
              <a-space :size="12">
                <a-button @click="clearAllResults" danger size="large">
                  <template #icon><i-delete theme="outline" size="16" /></template>
                  清空全部
                </a-button>
                <a-button type="primary" @click="confirmSelection" :disabled="selectedIndex === -1" size="large" :loading="saveLoading">
                  <template #icon><i-check theme="outline" size="16" /></template>
                  确认选择
                </a-button>
              </a-space>
            </div>
          </div>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import axios from "@/utils/axios";
import store from "@/stores";
import { MessagePlugin } from "tdesign-vue-next";

// Props定义
interface Props {
  data?: {
    id?: number;
    filePath?: string;
    name?: string;
    describe?: string;
    type?: string;
  };
}

const props = withDefaults(defineProps<Props>(), {
  data: undefined,
});

const generateImageShow = defineModel<boolean>({
  default: false,
});

const emits = defineEmits(["update"]);

const mode = ref(2);
const modeOptions = [
  { label: "📤 图片上传", value: 1 },
  { label: "🎨 AI 生成", value: 2 },
];

const currentImage = ref("");
const errorPicture = ref("");
const fileInput = ref<HTMLInputElement>();
const promptLoading = ref(false);
const generateLoading = ref(false);
const selectedIndex = ref(-1);
const isFirstLoad = ref(true);
const modalShow = ref(false);
const assetType = ref("props");
const fakeLoading = ref(false);
const saveLoading = ref(false);
let timer: number | null = null;

// 类型映射
const TYPE_MAP: Record<string, string> = {
  道具: "props",
  角色: "character",
  场景: "scene",
  背景: "background",
};

const formData = ref({
  id: props.data?.id,
  prompt: "",
  count: 1,
  size: "1024x1024",
  filePath: props.data?.filePath || "",
  uploadImage: "",
});

const resultImages = ref<
  Array<{
    filePath?: string;
    state?: string;
  }>
>([]);

watch(
  () => props.data,
  (newData) => {
    if (newData) {
      formData.value.id = newData.id;
      formData.value.filePath = newData.filePath || "";
      assetType.value = TYPE_MAP[newData.type ?? "道具"] ?? "props";
      
      // 如果有 id，获取图片列表
      if (newData.id) {
        fetchImages(newData.id);
      }
    }
  },
  { immediate: true, deep: true }
);

watch(
  () => generateImageShow.value,
  (newVal) => {
    if (newVal) {
      modalShow.value = true;
      isFirstLoad.value = true;
      selectedIndex.value = -1;
      if (props.data?.id) {
        fetchImages(props.data.id);
      }
    } else {
      modalShow.value = false;
      // 清理定时器
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }
  }
);

function handleCancel() {
  generateImageShow.value = false;
}

function closeModal(): void {
  generateImageShow.value = false;
}
// 工具函数
function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
async function blobUrlToBase64(blobUrl: string): Promise<string> {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  return fileToBase64(blob);
}
async function onConfirm() {
  if (mode.value === 1 && !currentImage.value) {
    MessagePlugin.warning("请先上传图片");
    return;
  }
  if (!formData.value) return;

  const params: Record<string, any> = { projectId: projectId.value, id: formData.value.id };

  if (mode.value === 1) {
    if (!formData.value.uploadImage) {
      MessagePlugin.error("请上传图片");
      return;
    }
    // 判断是否已经是 base64 格式
    if (formData.value.uploadImage.startsWith("data:")) {
      params.base64 = formData.value.uploadImage;
    } else {
      params.base64 = await blobUrlToBase64(formData.value.uploadImage);
    }
  } else {
    if (selectedIndex.value === -1) {
      MessagePlugin.error("请选择生成结果");
      return;
    }
    params.prompt = formData.value.prompt || "";
    params.filePath = resultImages.value[selectedIndex.value]?.filePath || "";
  }

  saveLoading.value = true;
  try {
    await axios.post("/assets/saveAssets", params);
    MessagePlugin.success("保存成功");
    emits("update");
    generateImageShow.value = false;
  } catch {
    MessagePlugin.error("保存失败");
  } finally {
    saveLoading.value = false;
  }
}

function changeFile() {
  fileInput.value?.click();
}

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      currentImage.value = result;
      formData.value.uploadImage = result;
    };
    reader.readAsDataURL(file);
  }
}

function deleteImage() {
  currentImage.value = "";
  formData.value.uploadImage = "";
  if (fileInput.value) {
    fileInput.value.value = "";
  }
}

function previewCurrentImage() {
  MessagePlugin.info("预览功能");
}
const { projectId } = storeToRefs(store());
async function generatePrompt() {
  promptLoading.value = true;
  try {
    const id = props.data?.id;
    const type = props.data?.type;
    const name = props.data?.name;
    const intro = props.data?.describe;
    const { data } = await axios.post("/assets/polishAssetsPrompt", {
      projectId: projectId.value,
      assetsId: id,
      type: TYPE_MAP[type ?? "道具"] ?? "props",
      name,
      describe: intro ? intro : "无描述",
    });
    MessagePlugin.success("提示词生成成功");
    if (data.assetsId === formData.value.id) {
      formData.value.prompt = data.prompt;
    }
  } catch (e: any) {
    MessagePlugin.error(e.message ?? "提示词生成失败");
  } finally {
    promptLoading.value = false;
  }
}
// 获取图片列表
const assetsId = ref();
async function fetchImages(id: number) {
  const _id = id;
  const { data } = await axios.post("/assets/getImage", { assetsId: id });
  assetsId.value = data.id;
  if (data.tempAssets.filter((i: { state: string }) => i.state == "生成中").length > 0) {
    timer = window.setTimeout(() => {
      if (modalShow.value) fetchImages(_id);
    }, 2000);
  }
  if (_id == formData.value?.id) {
    if (data.filePath.length > 0) {
      resultImages.value = [{ filePath: data.filePath, state: "生成成功" }, ...data.tempAssets];
      if (isFirstLoad.value) {
        selectedIndex.value = resultImages.value.findIndex((item) => item.filePath === formData.value?.filePath);
        isFirstLoad.value = false;
      }
    } else {
      resultImages.value = [...data.tempAssets];
      if (isFirstLoad.value) {
        selectedIndex.value = resultImages.value.findIndex(
          (item) => item.filePath === formData.value?.filePath && formData.value?.filePath.length > 0,
        );
        isFirstLoad.value = false;
      }
    }
  }
}
async function startGenerate() {
  if (!formData.value.prompt) {
    MessagePlugin.warning("请输入提示词");
    return;
  }
  generateLoading.value = true;
  try {
    const id = props.data?.id;
    const name = props.data?.name;
    const sampleImage = currentImage.value;
    const prompt = formData.value.prompt;

    const _promise = axios.post("/assets/generateAssets", {
      type: assetType.value,
      projectId: projectId.value,
      name,
      base64: sampleImage || undefined,
      prompt,
      id,
    });
    setTimeout(() => {
      fetchImages(props.data?.id ?? -1);
      fakeLoading.value = false;
    }, 2000);

    const { data } = await _promise;
    await fetchImages(props.data?.id ?? -1);
    MessagePlugin.success("资产生成成功");
    if (data.assetsId === formData.value.id) {
      resultImages.value.push({ filePath: data.path, state: "生成成功" });
    }
  } catch (e) {
    MessagePlugin.error("资产生成失败");
  } finally {
    generateLoading.value = false;
  }
}

function handleSelect(item: any, index: number) {
  if (item.state === "生成成功" || !item.state) {
    selectedIndex.value = index;
  }
}

function previewImage(url: string) {
  MessagePlugin.info("预览图片");
}

function delImage(item: any) {
  const index = resultImages.value.indexOf(item);
  if (index > -1) {
    resultImages.value.splice(index, 1);
    if (selectedIndex.value === index) {
      selectedIndex.value = -1;
    } else if (selectedIndex.value > index) {
      selectedIndex.value--;
    }
  }
}

function clearAllResults() {
  resultImages.value = [];
  selectedIndex.value = -1;
  MessagePlugin.success("已清空所有结果");
}

async function confirmSelection() {
  if (selectedIndex.value === -1) {
    MessagePlugin.warning("请先选择一张图片");
    return;
  }

  const selected = resultImages.value[selectedIndex.value];
  if (!selected.filePath) {
    MessagePlugin.error("选择的图片无效");
    return;
  }

  const params = {
    projectId: projectId.value,
    id: formData.value.id,
    prompt: formData.value.prompt || "",
    filePath: selected.filePath,
  };

  saveLoading.value = true;
  try {
    await axios.post("/assets/saveAssets", params);
    MessagePlugin.success("保存成功");
    emits("update");
    generateImageShow.value = false;
  } catch {
    MessagePlugin.error("保存失败");
  } finally {
    saveLoading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.generateImage {
  :deep(.t-dialog__body) {
    padding: 0;
  }

  .modalHeader {
    background: linear-gradient(135deg, var(--td-brand-color-1) 0%, var(--td-brand-color-2) 100%);
    padding: 20px 24px;
    width: 100%;
    .headerLeft {
      display: flex;
      align-items: center;
      gap: 12px;

      .headerIcon {
        animation: pulse 2s ease-in-out infinite;
      }
    }

    :deep(.ant-typography) {
      color: var(--td-text-color-primary);
      margin: 0;
      font-weight: 600;
    }

    .closeBtn {
      color: var(--td-text-color-secondary);
      transition: all 0.3s ease;

      &:hover {
        color: var(--td-brand-color);
        transform: rotate(90deg);
      }
    }
  }

  .contentWrapper {
    display: flex;
    gap: 24px;
    padding: 24px;
    background: var(--td-bg-color-container);
    height: calc(85vh - 80px);

    .leftBody {
      flex: 1;
      min-width: 400px;
      max-width: 500px;
      height: 100%;
      overflow-y: auto;

      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-thumb {
        background: var(--td-border-level-2-color);
        border-radius: 3px;

        &:hover {
          background: var(--td-border-level-3-color);
        }
      }

      .sectionCard {
        background: var(--td-bg-color-container);
        border-radius: 12px;
        border: 1px solid var(--td-border-level-1-color);
        padding: 24px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        display: flex;
        flex-direction: column;
        gap: 20px;

        .modeSwitch {
          :deep(.ant-segmented) {
            background: var(--td-bg-color-component);
            padding: 4px;
            border-radius: 8px;

            .ant-segmented-item {
              border-radius: 6px;
              font-weight: 500;
              transition: all 0.3s ease;

              &.ant-segmented-item-selected {
                background: var(--td-brand-color);
                color: #fff;
                box-shadow: 0 2px 4px rgba(94, 114, 228, 0.3);
              }
            }
          }
        }

        .uploadSection,
        .promptSection {
          .sectionHeader {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;

            .labelText {
              font-size: 15px;
              font-weight: 900;
              color: var(--td-text-color-primary);
              display: flex;
              align-items: center;
              gap: 8px;

              &::before {
                content: "";
                width: 3px;
                height: 16px;
                background: linear-gradient(180deg, var(--td-brand-color) 0%, var(--td-brand-color-hover) 100%);
                border-radius: 2px;
              }
            }

            .optionalTag {
              font-size: 12px;
              border-radius: 4px;
            }

            .magicBtn {
              padding: 4px 12px;
              height: auto;
              font-size: 13px;
              color: var(--td-brand-color);
              display: flex;
              align-items: center;
              gap: 4px;
              transition: all 0.3s ease;

              &:hover {
                color: var(--td-brand-color-hover);
                transform: translateY(-1px);
              }

              :deep(.anticon) {
                animation: sparkle 2s ease-in-out infinite;
              }
            }
          }

          .picturePreview {
            width: 50%;
            aspect-ratio: 1 / 1;
            border-radius: 12px;
            object-fit: cover;
            border: 2px dashed var(--td-border-level-2-color);
            overflow: hidden;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            &:hover {
              border-color: var(--td-brand-color);
              box-shadow: 0 4px 12px rgba(94, 114, 228, 0.15);
              transform: translateY(-2px);
            }
            .imageWrapper {
              width: 100%;
              height: 100%;
              position: relative;

              .previewImg {
                width: 100%;
                height: 100%;
                object-fit: cover;
              }

              .imageOverlay {
                position: absolute;
                inset: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;

                .overlayActions {
                  display: flex;
                  gap: 16px;

                  .actionIcon {
                    color: #fff;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.2);
                    backdrop-filter: blur(4px);
                    transition: all 0.3s ease;

                    &:hover {
                      background: rgba(255, 255, 255, 0.3);
                      transform: scale(1.1);
                    }

                    &.deleteIcon:hover {
                      background: rgba(255, 77, 79, 0.9);
                    }
                  }
                }
              }

              &:hover .imageOverlay {
                opacity: 1;
              }
            }

            .uploadPlaceholder {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 12px;
              background: var(--td-bg-color-component);
              transition: all 0.3s ease;

              .uploadIconWrapper {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 64px;
                height: 64px;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--td-brand-color-1) 0%, var(--td-brand-color-2) 100%);
                transition: all 0.3s ease;

                .uploadIcon {
                  color: var(--td-brand-color);
                }
              }

              .uploadText {
                font-size: 15px;
                font-weight: 500;
                color: var(--td-text-color-primary);
              }

              .uploadHint {
                font-size: 12px;
                color: var(--td-text-color-placeholder);
              }
            }

            &:hover .uploadPlaceholder {
              background: var(--td-brand-color-1);

              .uploadIconWrapper {
                transform: scale(1.05);
                box-shadow: 0 4px 12px rgba(94, 114, 228, 0.2);
              }
            }
          }

          .promptTextarea {
            border-radius: 8px;
            transition: all 0.3s ease;
            :deep(textarea) {
              font-size: 14px;
              line-height: 1.6;

              &:focus {
                box-shadow: 0 0 0 2px rgba(94, 114, 228, 0.1);
              }
            }
          }
        }
        .generateBtn {
          margin-top: 8px;
          height: 48px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 8px;
          color: var(--td-text-color-primary);
          background: linear-gradient(135deg, var(--td-brand-color-1) 0%, var(--td-brand-color-2) 100%);
          transition: all 0.3s ease;

          &:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(94, 114, 228, 0.4);
          }

          &:active:not(:disabled) {
            transform: translateY(0);
          }
        }
      }
    }

    .rightBody {
      flex: 2;
      min-width: 500px;
      height: 100%;

      .resultCard {
        height: 100%;
        display: flex;
        flex-direction: column;

        .resultContent {
          flex: 1;
          overflow-y: auto;
          padding: 16px 0;

          &::-webkit-scrollbar {
            width: 6px;
          }

          &::-webkit-scrollbar-thumb {
            background: var(--td-border-level-2-color);
            border-radius: 3px;

            &:hover {
              background: var(--td-border-level-3-color);
            }
          }

          .emptyState {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            min-height: 300px;
          }

          .resultGrid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 12px;

            .resultItem {
              aspect-ratio: 1;
              border-radius: 12px;
              overflow: hidden;
              cursor: pointer;
              position: relative;
              border: 2px solid transparent;
              transition: all 0.3s ease;
              background: var(--td-bg-color-component);

              &:hover {
                transform: translateY(-4px);
                box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
              }

              &.selected {
                border-color: var(--td-brand-color);
                box-shadow: 0 0 0 4px rgba(94, 114, 228, 0.1);
              }

              .resultImg {
                width: 100%;
                height: 100%;
                object-fit: cover;
              }

              .resultOverlay {
                position: absolute;
                inset: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;

                .overlayActions {
                  display: flex;
                  gap: 12px;

                  .actionIcon {
                    color: #fff;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.2);
                    backdrop-filter: blur(4px);
                    transition: all 0.3s ease;

                    &:hover {
                      background: rgba(255, 255, 255, 0.3);
                      transform: scale(1.1);
                    }

                    &.deleteIcon:hover {
                      background: rgba(255, 77, 79, 0.9);
                    }
                  }
                }
              }

              &:hover .resultOverlay {
                opacity: 1;
              }

              .selectedBadge {
                position: absolute;
                top: 12px;
                right: 12px;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: var(--td-brand-color);
                display: flex;
                align-items: center;
                justify-content: center;
                color: #fff;
                box-shadow: 0 2px 8px rgba(94, 114, 228, 0.4);
                animation: scaleIn 0.3s ease;
              }

              .generatingPlaceholder,
              .errorPlaceholder {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 12px;
                background: var(--td-bg-color-component);

                .generatingText {
                  font-size: 14px;
                  color: var(--td-text-color-secondary);
                }

                .errorIcon {
                  color: var(--td-error-color);
                }

                .errorText {
                  font-size: 14px;
                  color: var(--td-error-color);
                }
              }

              .deleteWrapper {
                position: absolute;
                top: 8px;
                right: 8px;
                padding: 6px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.9);
                cursor: pointer;
                transition: all 0.3s ease;

                &:hover {
                  background: rgba(255, 77, 79, 0.9);

                  .actionIcon {
                    color: #fff;
                  }
                }

                .actionIcon {
                  color: var(--td-error-color);
                }
              }
            }
          }
        }

        .resultFooter {
          padding: 16px 0 0;
          border-top: 1px solid var(--td-border-level-1-color);
          display: flex;
          justify-content: flex-end;
        }
      }
    }
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.05);
    }
  }

  @keyframes sparkle {
    0%,
    100% {
      opacity: 1;
      transform: rotate(0deg);
    }
    50% {
      opacity: 0.7;
      transform: rotate(180deg);
    }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
}
</style>
