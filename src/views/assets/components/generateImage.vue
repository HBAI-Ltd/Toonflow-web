<template>
  <div class="generateImage">
    <t-dialog
      v-model:visible="generateImageShow"
      top="4vh"
      width="80vw"
      :header="$t('workbench.assets.gen.header')"
      :maskClosable="false"
      :footer="false"
      @close-btn-click="handleCancel">
      <div class="data f">
        <t-card :bordered="false" :style="{ width: '40%' }">
          <div class="uploadReferenceImage">
            <div class="jb">
              <span style="font-size: 16px; font-weight: 900">{{ $t("workbench.assets.gen.uploadRef") }}</span>
              <t-tag>{{ $t("workbench.assets.gen.optional") }}</t-tag>
            </div>
            <div class="upload">
              <t-upload
                v-model="referenceFileList"
                :autoUpload="autoUpload"
                :disabled="generateLoading"
                theme="image"
                :abridgeName="[10, 8]"
                draggable
                action=""
                accept="image/*"
                :showImageFileName="showImageFileName" />
            </div>
          </div>
          <div class="rawPicturePrompt">
            <div class="jb">
              <span style="font-size: 16px; font-weight: 900">{{ $t("workbench.assets.gen.promptLabel") }}</span>
              <div class="ac" style="cursor: pointer" @click.stop="generatePrompt">
                <i-magic theme="outline" size="18" />
                <span style="margin-left: 5px; font-size: 13px">{{ $t("workbench.assets.gen.smartGenerate") }}</span>
              </div>
            </div>
            <div class="input">
              <t-loading :loading="promptLoading" :text="$t('workbench.assets.gen.generatingPrompt')">
                <t-textarea
                  v-model="props.formData.prompt"
                  :placeholder="$t('workbench.assets.gen.promptPlaceholder')"
                  :autosize="{ minRows: 15, maxRows: 15 }"
                  :disabled="generateLoading" />
              </t-loading>
            </div>
          </div>
          <div class="manualPrompt">
            <div class="jb">
              <span class="manualPromptTitle">完整生图提示词</span>
              <t-tag theme="warning">请复制后到外部工具生成</t-tag>
            </div>
            <t-textarea :value="completePrompt" readonly :autosize="{ minRows: 9, maxRows: 12 }" />
          </div>
          <div class="selectModel f">
            <div style="width: 50%">
              <span style="font-size: 16px; font-weight: 900">{{ $t("workbench.assets.gen.selectResolution") }}</span>
              <t-select v-model="resolution">
                <t-option key="1K" label="1K" value="1K" />
                <t-option key="2K" label="2K" value="2K" />
                <t-option key="4K" label="4K" value="4K" />
              </t-select>
            </div>
            <div style="width: 50%; margin-left: 15px">
              <span style="font-size: 16px; font-weight: 900">项目画幅</span>
              <t-input :value="project?.videoRatio || '跟随项目设置'" readonly />
            </div>
          </div>
          <div class="generateButton" style="margin-top: 20px">
            <t-button theme="primary" size="large" block @click="copyManualPrompt">复制完整生图提示词</t-button>
          </div>
        </t-card>
        <t-divider layout="vertical" style="height: 700px" />
        <t-card title="上传外部生成结果" :bordered="false" :style="{ width: '60%' }">
          <template #actions>
            <t-tag v-if="resultImages.length">{{ $t("workbench.assets.gen.generatedCount", { count: resultImages.length }) }}</t-tag>
          </template>
          <div class="resultImages" style="gap: 20px; flex-wrap: wrap">
            <div class="image f w">
              <div
                v-for="(img, index) in resultImages"
                :key="index"
                class="resultImage"
                :class="{ 'is-selected': selectedImageIndex === index, 'is-disabled': img.state !== '已完成' }"
                @click="img.state === '已完成' ? selectImage(index) : null"
                @mouseenter="hoveredImageIndex = index"
                @mouseleave="hoveredImageIndex = null">
                <div v-if="img.state === '生成中'" class="generating-overlay f ac jc">
                  <t-loading :text="$t('workbench.assets.gen.generatingLabel')" />
                </div>
                <div v-else-if="img.state === '生成失败' && !img.src" class="failed-overlay f ac jc">
                  <div style="text-align: center">
                    <i-close-one theme="filled" size="40" fill="#d0021b" />
                    <div style="margin-top: 10px; color: #d0021b; font-weight: bold">{{ $t("workbench.assets.gen.genFailed") }}</div>
                  </div>
                </div>
                <t-image v-else :src="img.src" fit="cover" :style="{ width: '100%', height: '100%', borderRadius: '20px' }">
                  <template #loading>
                    <t-loading />
                  </template>
                </t-image>
                <div class="preview" v-show="hoveredImageIndex === index && img.state === '已完成'">
                  <i-preview-open theme="outline" size="25" fill="#ffffff" @click.stop="handlePreview(img.src)" />
                </div>
                <div class="selected" v-show="selectedImageIndex === index && img.state === '已完成'">
                  <i-check-one theme="filled" size="25" fill="#000" />
                </div>
                <div class="delImage" v-show="hoveredImageIndex === index">
                  <i-delete theme="outline" size="20" fill="#d0021b" @click.stop="deleteImage(img.id, index)" />
                </div>
              </div>
              <div class="customUpload">
                <t-upload
                  ref="customUploadRef"
                  action=""
                  v-model="customFileList"
                  :disabled="generateLoading"
                  :autoUpload="false"
                  theme="custom"
                  accept="image/*"
                  :max="1"
                  @change="handleCustomUpload"
                  :showImageFileName="false">
                  <div
                    class="uploadPlaceholder f ac jc"
                    style="width: 180px; height: 180px; border: 2px dashed #d9d9d9; border-radius: 20px; cursor: pointer">
                    <div class="fc ac">
                      <i-plus theme="outline" size="24" fill="#4a4a4a" />
                      <span style="margin-top: 8px">上传生成好的图片</span>
                    </div>
                  </div>
                </t-upload>
              </div>
            </div>
          </div>
          <div class="keep">
            <t-button theme="primary" size="large" block :disabled="selectedImageIndex === null" @click="onClick">
              {{ $t("workbench.assets.gen.confirmSelect") }}
            </t-button>
          </div>
        </t-card>
      </div>
      <t-image-viewer v-model="visible" :images="[trigger]" />
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import projectStore from "@/stores/project";
const { project } = storeToRefs(projectStore());
import axios from "@/utils/axios";
import { buildManualImagePrompt, copyText, fileToDataUrl } from "@/utils/manualMedia";
const props = defineProps<{
  formData: {
    id?: number;
    name?: string;
    describe?: string;
    type?: string;
    prompt?: string;
    src: string;
  };
}>();

//显示生成图片的弹窗
const generateImageShow = defineModel({
  type: Boolean,
  default: false,
});

//关闭生成图片的弹窗
function handleCancel() {
  generateImageShow.value = false;
  generateLoading.value = false;
  stopPolling();
  emit("update");
}
//上传参考图片
const referenceFileList = ref<any[]>([]);
const autoUpload = ref(false);
const showImageFileName = ref(false);
const generateLoading = ref(false);
//智能生成提示词
const promptLoading = ref(false);
async function generatePrompt() {
  promptLoading.value = true;
  try {
    const { data } = await axios.post("/assetsGenerate/polishAssetsPrompt", {
      projectId: project.value?.id,
      assetsId: props.formData.id,
      type: props.formData.type ?? "props",
      name: props.formData.name,
      describe: props.formData.describe ? props.formData.describe : $t("workbench.assets.noDescription"),
    });
    window.$message.success($t("workbench.assets.gen.promptSuccess"));
    if (data.assetsId === props.formData.id) {
      props.formData.prompt = data.prompt;
    }
  } catch (e: any) {
    window.$message.error(e.message ?? $t("workbench.assets.gen.promptFail"));
  } finally {
    promptLoading.value = false;
  }
}
const emit = defineEmits(["update"]);
const resolution = ref("1K");
const completePrompt = computed(() =>
  buildManualImagePrompt({
    name: props.formData.name,
    category: props.formData.type,
    prompt: props.formData.prompt,
    description: props.formData.describe,
    artStyle: project.value?.artStyle,
    aspectRatio: project.value?.videoRatio,
    resolution: resolution.value,
    referenceCount: referenceFileList.value.length,
  }),
);

async function copyManualPrompt() {
  if (!props.formData.prompt) {
    window.$message.error($t("workbench.assets.gen.fillPrompt"));
    return;
  }
  try {
    await copyText(completePrompt.value);
    window.$message.success("完整生图提示词已复制，请在外部工具生成后上传");
  } catch (e: any) {
    window.$message.error(e.message ?? "复制提示词失败");
  }
}
//自定义上传图片
const customFileList = ref<any[]>([]);
// 处理自定义上传
function handleCustomUpload(files: any[]): void {
  if (files.length > 0) {
    const file = files[0]?.raw || files[0];
    if (file instanceof File) {
      fileToDataUrl(file).then((base64) => {
        resultImages.value.push({
          id: "",
          src: base64,
          state: "已完成",
        });
        window.$message.success($t("workbench.assets.gen.uploadOk"));
        customFileList.value = [];
      });
    }
  }
}

//生成结果
const resultImages = ref<{ id: string; src: string; state: string; selected?: boolean }[]>([]);
//预览图片
const visible = ref(false);
const trigger = ref();
function handlePreview(src: string) {
  visible.value = true;
  trigger.value = src;
}
//选择生成的图片
const selectedImageIndex = ref<number | null>(null);
const hoveredImageIndex = ref<number | null>(null);

watch(
  () => generateImageShow.value,
  (newVal) => {
    if (newVal) {
      referenceFileList.value = [];
      selectedImageIndex.value = null;
      hoveredImageIndex.value = null;
      generateLoading.value = false;
      fetchGeneratedImages();
    }
  },
);
// 获取图片列表
let pollingTimer: ReturnType<typeof setTimeout> | null = null;

function stopPolling() {
  if (pollingTimer) {
    clearTimeout(pollingTimer);
    pollingTimer = null;
  }
}

async function fetchGeneratedImages() {
  const { data } = await axios.post("/assets/getImage", { assetsId: props.formData.id });
  const images = data.tempAssets.map((item: { id: string; filePath: string; state: string; selected?: boolean }) => ({
    id: item.id,
    src: item.filePath,
    state: item.state,
    selected: item.selected ?? false,
  }));
  resultImages.value = images;
  const selectedIdx = images.findIndex((img: { selected?: boolean }) => img.selected);
  if (selectedIdx !== -1) {
    selectedImageIndex.value = selectedIdx;
  }

  // 如果还有"生成中"的图片，自动轮询刷新
  const hasGenerating = images.some((img: { state: string }) => img.state === "生成中");
  stopPolling();
  if (hasGenerating && generateImageShow.value) {
    pollingTimer = setTimeout(() => fetchGeneratedImages(), 3000);
  }
}

//选择图片
function selectImage(index: number) {
  const img = resultImages.value[index];
  if (img.state === "已完成") {
    selectedImageIndex.value = index;
    window.$message.success($t("workbench.assets.gen.imageSelected"));
  }
}

//删除图片
function deleteImage(id: string | number, index: number) {
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.assets.confirmDeleteHeader"),
    body: $t("workbench.assets.confirmDeleteBody"),
    confirmBtn: $t("workbench.assets.deleteBtn"),
    cancelBtn: $t("workbench.assets.cancelBtn"),
    theme: "warning",
    onConfirm: async () => {
      try {
        axios.post("/assets/delImage", { id: id });
        window.$message.success($t("workbench.assets.deleteSuccess"));
        resultImages.value.splice(index, 1);
        if (selectedImageIndex.value === index) {
          selectedImageIndex.value = null;
        } else if (selectedImageIndex.value !== null && selectedImageIndex.value > index) {
          selectedImageIndex.value--;
        }
        dialog.destroy();
      } catch (error) {
        window.$message.error($t("workbench.assets.deleteFail"));
        dialog.destroy();
      }
    },
  });
}
//确认选择
async function onClick() {
  if (selectedImageIndex.value !== null) {
    const selectedImage = resultImages.value[selectedImageIndex.value];
    const isLocalUpload = !selectedImage.id;

    await axios.post("/assets/saveAssets", {
      id: props.formData.id,
      base64: isLocalUpload ? selectedImage.src : "",
      type: props.formData.type,
      prompt: props.formData.prompt,
      projectId: project.value?.id,
      imageId: isLocalUpload ? undefined : Number(selectedImage.id),
    });
    window.$message.success($t("workbench.assets.gen.imageSaved"));
    generateImageShow.value = false;
    emit("update");
  }
}
</script>

<style lang="scss" scoped>
.generateImage {
  .data {
    gap: 20px;
    .uploadReferenceImage {
      .upload {
        margin-top: 10px;
      }
    }
    .rawPicturePrompt {
      margin-top: 20px;
      .input {
        margin-top: 10px;
      }
    }
    .manualPrompt {
      margin-top: 20px;
      .manualPromptTitle {
        font-size: 16px;
        font-weight: 900;
      }
      :deep(textarea) {
        font-family: Monaco, Menlo, Consolas, monospace;
      }
    }
    .selectModel {
      margin-top: 20px;
    }
    .resultImages {
      height: 600px;
      overflow: auto;
      .image {
        gap: 10px;
        .resultImage {
          width: 180px;
          height: 180px;
          cursor: pointer;
          border-radius: 20px;
          transition: all 0.3s ease;
          position: relative;
          border: 2px solid #d9d9d9;
          &:hover {
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          }
          &.is-selected {
            border: 2px solid #000;
          }
          &.is-disabled {
            cursor: not-allowed;
            opacity: 0.8;
          }
          .generating-overlay,
          .failed-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            z-index: 5;
          }
          .preview {
            position: absolute;
            top: 10px;
            left: 10px;
            z-index: 10;
          }
          .selected {
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 10;
          }
          .delImage {
            position: absolute;
            bottom: 10px;
            right: 10px;
            z-index: 10;
          }
        }
      }
    }
    .keep {
      margin-top: 15px;
    }
  }
}
</style>
