<template>
  <div class="generateImage">
    <t-dialog
      v-model:visible="generateImageShow"
      top="2vh"
      width="80vw"
      header="图片生成"
      :maskClosable="false"
      :footer="false"
      wrapClassName="no-header-margin"
      dialogClass="custom-modal"
      @close-btn-click="handleCancel">
      <div class="data f">
        <t-card :bordered="false" :style="{ width: '40%' }">
          <div class="uploadReferenceImage">
            <div class="jb">
              <span style="font-size: 16px; font-weight: 900">上传参考图片</span>
              <t-tag>可选</t-tag>
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
              <span style="font-size: 16px; font-weight: 900">生图提示词</span>
              <div class="ac" style="cursor: pointer" @click.stop="generatePrompt">
                <i-magic theme="outline" size="18" />
                <span style="margin-left: 5px; font-size: 13px">智能生成</span>
              </div>
            </div>
            <div class="input">
              <t-loading :loading="promptLoading" text="智能生成提示词中...">
                <t-textarea
                  v-model="props.formData.prompt"
                  placeholder="描述您想要生成的图片内容，例如：一个充满科技感的未来城市,霓虹灯闪烁,赛博朋克风格..."
                  :autosize="{ minRows: 15, maxRows: 15 }"
                  :disabled="generateLoading" />
              </t-loading>
            </div>
          </div>
          <div class="selectModel">
            <span style="font-size: 16px; font-weight: 900">选择模型</span>
            <modelSelect v-model="selectValue" :type="`image`" />
          </div>
          <div class="generateButton" style="margin-top: 20px">
            <t-button theme="primary" size="large" block :loading="generateLoading" @click="handleGenerate">生成图片</t-button>
          </div>
        </t-card>
        <t-divider layout="vertical" style="height: 700px" />
        <t-card title="生成结果" :bordered="false" :style="{ width: '60%' }">
          <template #actions>
            <t-tag v-if="resultImages.length">已生成 {{ resultImages.length }} 张，请选择一张</t-tag>
          </template>
          <div class="resultImages" style="gap: 20px; flex-wrap: wrap">
            <div class="image f w">
              <div
                v-for="(img, index) in resultImages"
                :key="index"
                class="resultImage"
                :class="{ 'is-selected': selectedImageIndex === index, 'is-disabled': img.state !== '生成成功' }"
                @click="img.state === '生成成功' ? selectImage(index) : null"
                @mouseenter="hoveredImageIndex = index"
                @mouseleave="hoveredImageIndex = null">
                <div v-if="img.state === '生成中'" class="generating-overlay f ac jc">
                  <t-loading text="生成中..." />
                </div>
                <div v-else-if="img.state === '生成失败' && !img.filePath" class="failed-overlay f ac jc">
                  <div style="text-align: center">
                    <i-close-one theme="filled" size="40" fill="#d0021b" />
                    <div style="margin-top: 10px; color: #d0021b; font-weight: bold">生成失败</div>
                  </div>
                </div>
                <t-image v-else :src="img.filePath" fit="cover" :style="{ width: '100%', height: '100%', borderRadius: '20px' }">
                  <template #loading>
                    <t-loading />
                  </template>
                </t-image>
                <div class="preview" v-show="hoveredImageIndex === index && img.state === '生成成功'">
                  <i-preview-open theme="outline" size="25" fill="#ffffff" @click.stop="handlePreview(img.filePath)" />
                </div>
                <div class="selected" v-show="selectedImageIndex === index && img.state === '生成成功'">
                  <i-check-one theme="filled" size="25" fill="#000" />
                </div>
                <div class="delImage" v-show="hoveredImageIndex === index">
                  <i-delete theme="outline" size="20" fill="#d0021b" @click.stop="deleteImage(index)" />
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
                    <i-plus theme="outline" size="24" fill="#4a4a4a" />
                  </div>
                </t-upload>
              </div>
            </div>
          </div>
          <div class="keep">
            <t-button theme="primary" size="large" block :disabled="selectedImageIndex === null" @click="onClick">确认选择</t-button>
          </div>
        </t-card>
      </div>
      <t-image-viewer v-model="visible" :images="[trigger]" />
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import modelSelect from "@/components/modelSelect.vue";
import projectStore from "@/stores/project";
const { project } = storeToRefs(projectStore());
import axios from "@/utils/axios";
const props = defineProps<{
  formData: {
    id?: number;
    name?: string;
    describe?: string;
    type?: string;
    prompt?: string;
    filePath: string;
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
}
//上传参考图片
const referenceFileList = ref<any[]>([]);
const autoUpload = ref(false);
const showImageFileName = ref(false);
const generateLoading = ref(false);
const selectValue = ref(""); //选择的模型

const value2 = ref("");
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
      describe: props.formData.describe ? props.formData.describe : "无描述",
    });
    MessagePlugin.success("提示词生成成功");
    if (data.assetsId === props.formData.id) {
      props.formData.prompt = data.prompt;
    }
  } catch (e: any) {
    MessagePlugin.error(e.message ?? "提示词生成失败");
  } finally {
    promptLoading.value = false;
  }
}
//生成图片
async function handleGenerate() {
  generateLoading.value = true;
  if (!props.formData.prompt) {
    MessagePlugin.error("请填写提示词");
    generateLoading.value = false;
    return;
  }
  try {
    let referenceImageBase64 = "";
    if (referenceFileList.value.length > 0) {
      const file = referenceFileList.value[0].raw;
      if (file instanceof File) {
        referenceImageBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            resolve(base64);
          };
          reader.readAsDataURL(file);
        });
      }
    }
    const generatePromise = axios.post("/assetsGenerate/generateAssets", {
      type: props.formData.type ?? "props",
      projectId: project.value?.id,
      name: props.formData.name ?? "未命名",
      base64: referenceImageBase64,
      prompt: props.formData.prompt,
      model: selectValue.value,
      id: props.formData.id,
    });

    setTimeout(() => fetchGeneratedImages(), 500);

    generatePromise
      .then(async () => {
        MessagePlugin.success("资产生成成功");
        await fetchGeneratedImages();
      })
      .catch((e: any) => {
        MessagePlugin.error(e.message ?? "资产生成失败");
        fetchGeneratedImages();
      })
      .finally(() => {
        generateLoading.value = false;
      });
  } catch (e: any) {
    MessagePlugin.error(e.message ?? "资产生成失败");
    generateLoading.value = false;
  }
}
//自定义上传图片
const customFileList = ref<any[]>([]);
// 处理自定义上传
function handleCustomUpload(files: any[]): void {
  if (files.length > 0) {
    const file = files[0]?.raw || files[0];
    if (file instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        resultImages.value.push({
          id: "",
          filePath: base64,
          state: "生成成功",
        });
        MessagePlugin.success("上传成功");
        customFileList.value = [];
      };
      reader.readAsDataURL(file);
    }
  }
}

//生成结果
const resultImages = ref<{ id: string; filePath: string; state: string; selected?: boolean }[]>([]);
//预览图片
const visible = ref(false);
const trigger = ref();
function handlePreview(filePath: string) {
  visible.value = true;
  trigger.value = filePath;
}
//选择生成的图片
const selectedImageIndex = ref<number | null>(null);
const hoveredImageIndex = ref<number | null>(null);

watch(
  () => generateImageShow.value,
  (newVal) => {
    if (newVal) {
      referenceFileList.value = [];
      value2.value = "";
      selectedImageIndex.value = null;
      hoveredImageIndex.value = null;
      fetchGeneratedImages();
    }
  },
);
// 获取图片列表
async function fetchGeneratedImages() {
  const { data } = await axios.post("/assets/getImage", { assetsId: props.formData.id });
  const images = data.tempAssets.map((item: { id: string; filePath: string; state: string; selected?: boolean }) => ({
    id: item.id,
    filePath: item.filePath,
    state: item.state,
    selected: item.selected ?? false,
  }));
  resultImages.value = images;
  const selectedIdx = images.findIndex((img: { selected?: boolean }) => img.selected);
  if (selectedIdx !== -1) {
    selectedImageIndex.value = selectedIdx;
  }
}

//选择图片
function selectImage(index: number) {
  const img = resultImages.value[index];
  if (img.state === "生成成功") {
    selectedImageIndex.value = index;
    MessagePlugin.success("已选择该图片");
  }
}

//删除图片
function deleteImage(index: number) {
  resultImages.value.splice(index, 1);
  if (selectedImageIndex.value === index) {
    selectedImageIndex.value = null;
  } else if (selectedImageIndex.value !== null && selectedImageIndex.value > index) {
    selectedImageIndex.value--;
  }
  MessagePlugin.success("已删除该图片");
}
//确认选择
async function onClick() {
  if (selectedImageIndex.value !== null) {
    const selectedImage = resultImages.value[selectedImageIndex.value];
    const isLocalUpload = !selectedImage.id;

    await axios.post("/assets/saveAssets", {
      id: props.formData.id,
      base64: isLocalUpload ? selectedImage.filePath : "",
      type: props.formData.type,
      prompt: props.formData.prompt,
      projectId: project.value?.id,
      imageId: isLocalUpload ? undefined : Number(selectedImage.id),
    });
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
