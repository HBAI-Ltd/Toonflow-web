<template>
  <div class="generateImage">
    <t-dialog
      v-model:visible="generateImageShow"
      top="2vh"
      width="80vw"
      header="图片生成"
      :maskClosable="false"
      wrapClassName="no-header-margin"
      dialogClass="custom-modal"
      @close-btn-click="handleCancel">
      <div class="contentWrapper">
        <div class="parameter">
          <t-card bordered>
            <div class="customAI">
              <div class="aiUpload f jb">
                <t-upload
                  ref="referenceUploadRef"
                  action=""
                  v-model="referenceFileList"
                  :disabled="generateLoading"
                  :autoUpload="autoUpload"
                  theme="image"
                  tips="上传AI生成参考图片"
                  accept="image/*"
                  :max="1"
                  @change="handleReferenceChange"
                  :formatResponse="formatResponse"
                  :showImageFileName="showImageFileName"></t-upload>
                <t-tag theme="primary">可选</t-tag>
              </div>
              <div class="aiContent">
                <div class="jb ac">
                  <span>生图提示词</span>
                  <div class="ac" style="cursor: pointer" @click.stop="generatePrompt" :loading="promptLoading">
                    <i-magic theme="outline" size="18" />
                    <span style="margin-left: 5px">智能生成</span>
                  </div>
                </div>
                <t-textarea
                  v-model="promptText"
                  placeholder="描述您想要生成的图片内容，例如：一个充满科技感的未来城市,霓虹灯闪烁,赛博朋克风格..."
                  :autosize="{ minRows: 10, maxRows: 10 }"
                  :disabled="generateLoading" />
              </div>
            </div>
            <div class="generate">
              <t-button theme="primary" size="large" block @click="generateAIImage">生成图片</t-button>
            </div>
          </t-card>
        </div>
        <div class="result">
          <t-card bordered>
            <template #header>
              <div class="resultHeader">
                <span>生成结果</span>
              </div>
            </template>
            <div class="resultContent">
              <a-empty v-if="!resultImages.length && customUploadImages.length === 0" :image="simpleImage" description="暂无生成结果" />
              <div v-else class="resultGrid">
                <div class="imageItem uploadItem" @click="triggerUpload">
                  <div class="uploadPlaceholder">
                    <i-plus theme="outline" size="32" :strokeWidth="3" />
                    <span>上传图片</span>
                  </div>
                  <input ref="uploadInputRef" type="file" accept="image/*" style="display: none" @change="handleCustomUpload" />
                </div>
                <div
                  v-for="(img, index) in customUploadImages"
                  :key="'custom-' + index"
                  class="imageItem"
                  :class="{ selected: selectedIndex === index && selectedType === 'custom' }"
                  @click="selectImage(index, 'custom')">
                  <img :src="img.url" :alt="img.name" />
                  <div class="imageOverlay">
                    <div class="imageStatus">
                      <t-tag theme="success" size="small">自定义</t-tag>
                    </div>
                    <div v-if="selectedIndex === index && selectedType === 'custom'" class="selectedMark">
                      <i-check theme="filled" size="24" fill="#fff" />
                    </div>
                  </div>
                </div>
                <div
                  v-for="(img, index) in resultImages"
                  :key="'result-' + index"
                  class="imageItem"
                  :class="{ selected: selectedIndex === index && selectedType === 'result' }"
                  @click="selectImage(index, 'result')">
                  <img :src="img.filePath || img.url" :alt="img.name || '生成图片'" />
                  <div class="imageOverlay">
                    <div class="imageStatus">
                      <t-tag v-if="img.state === '生成中'" theme="warning" size="small">
                        <t-loading size="small" />
                        生成中
                      </t-tag>
                      <t-tag v-else-if="img.state === '生成成功'" theme="success" size="small">生成成功</t-tag>
                      <t-tag v-else-if="img.state === '生成失败'" theme="danger" size="small">生成失败</t-tag>
                    </div>
                    <div v-if="selectedIndex === index && selectedType === 'result'" class="selectedMark">
                      <i-check theme="filled" size="24" fill="#fff" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="generatedImages.length > 0 || customUploadImages.length > 0" class="resultFooter">
              <t-space :size="12">
                <t-button theme="primary" size="large" @click="confirmSelection" :disabled="selectedIndex === -1" :loading="saveLoading">
                  <template #icon><i-check theme="outline" size="16" /></template>
                  确认选择
                </t-button>
              </t-space>
            </div>
          </t-card>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import type { TabValue } from "tdesign-vue-next";
import { MessagePlugin, Empty } from "tdesign-vue-next";
import axios from "@/utils/axios";
import projectStore from "@/stores/project";
interface Props {
  data?: {
    id?: number;
    filePath?: string;
    name?: string;
    describe?: string;
    type?: string;
  };
}

interface ImageState {
  id?: number;
  filePath: string;
  state: "生成中" | "生成成功" | "生成失败" | string;
  url?: string;
  name?: string;
}

interface FormData {
  id?: number;
  prompt: string;
  count: number;
  size: string;
  filePath: string;
  uploadImage: string;
  name: string;
  sampleImage: string;
}

const props = withDefaults(defineProps<Props>(), {
  data: undefined,
});

const emits = defineEmits<{
  update: [];
}>();

const generateImageShow = defineModel<boolean>({
  default: false,
});

const { project } = storeToRefs(projectStore());

const TYPE_MAP: Record<string, string> = {
  角色: "character",
  场景: "scene",
  道具: "props",
  特效: "effect",
};

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE;

const modalShow = ref(true);
const isFirstLoad = ref(true);

const promptLoading = ref(false);
const generateLoading = ref(false);
const uploadLoading = ref(false);
const fakeLoading = ref(false);
const saveLoading = ref(false);

const fileList = ref<any[]>([]);
const referenceFileList = ref<any[]>([]);
const autoUpload = ref(false);
const showImageFileName = ref(true);

const formData = ref<FormData>({
  id: props.data?.id,
  prompt: "",
  count: 1,
  size: "1024x1024",
  filePath: props.data?.filePath || "",
  uploadImage: "",
  name: props.data?.name || "",
  sampleImage: "",
});

const promptText = ref("");

const assetsId = ref<number>();
const generatedImages = ref<ImageState[]>([
  {
    filePath: "https://tdesign.gtimg.com/demo/demo-image-1.png",
    state: "生成成功",
  },
]);
const resultImages = ref<ImageState[]>([
  {
    filePath: "https://tdesign.gtimg.com/demo/demo-image-1.png",
    state: "生成成功",
  },
]);
const customUploadImages = ref<Array<{ url: string; name: string; file?: File }>>([]);
const selectedIndex = ref(-1);
const selectedType = ref<"result" | "custom">("result");
const uploadInputRef = ref<HTMLInputElement | null>(null);

let timer: number | null = null;

const assetType = computed(() => TYPE_MAP[props.data?.type ?? "道具"] ?? "props");
const projectId = computed(() => project.value?.id);

function handleCancel(): void {
  generateImageShow.value = false;
}

// 触发文件上传
function triggerUpload(): void {
  uploadInputRef.value?.click();
}

// 处理自定义上传
function handleCustomUpload(event: Event): void {
  const target = event.target as HTMLInputElement;
  const files = target.files;

  if (files && files.length > 0) {
    const file = files[0];

    // 验证文件类型
    if (!file.type.startsWith("image/")) {
      MessagePlugin.warning("请上传图片文件");
      return;
    }

    // 验证文件大小(限制10MB)
    if (file.size > 10 * 1024 * 1024) {
      MessagePlugin.warning("图片大小不能超过10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      customUploadImages.value.push({
        url,
        name: file.name,
        file,
      });
      MessagePlugin.success("图片上传成功");

      // 清空input以便再次选择同一文件
      if (uploadInputRef.value) {
        uploadInputRef.value.value = "";
      }
    };
    reader.readAsDataURL(file);
  }
}

// 选择图片
function selectImage(index: number, type: "result" | "custom"): void {
  if (type === "result") {
    const img = resultImages.value[index];
    // 如果图片正在生成中或生成失败,不允许选择
    if (img.state === "生成中" || img.state === "生成失败") {
      MessagePlugin.warning("请选择生成成功的图片");
      return;
    }
  }

  // 如果点击的是已选中的图片,取消选中
  if (selectedIndex.value === index && selectedType.value === type) {
    selectedIndex.value = -1;
    selectedType.value = "result";
  } else {
    selectedIndex.value = index;
    selectedType.value = type;
  }
}

// 文件上传处理
function formatResponse(res: any) {
  if (res.status === "fail") {
    MessagePlugin.error("上传失败");
    return {
      success: false,
    };
  }
  MessagePlugin.success("上传成功");
  return {
    success: true,
    url: res.data.url,
  };
}

function handleReferenceChange(files: any[]): void {
  referenceFileList.value = files;
}

// 提示词生成
async function generatePrompt(): Promise<void> {
  if (!props.data?.id) {
    MessagePlugin.warning("缺少资产信息");
    return;
  }
  promptLoading.value = true;
  try {
    const { id, type, name, describe } = props.data;
    const { data } = await axios.post("/assets/polishAssetsPrompt", {
      projectId: project.value?.id,
      assetsId: id,
      type: TYPE_MAP[type ?? "道具"] ?? "props",
      name,
      describe: describe || "无描述",
    });

    MessagePlugin.success("提示词生成成功");

    if (data.assetsId === formData.value.id) {
      promptText.value = data.prompt;
      formData.value.prompt = data.prompt;
    }
  } catch (e: any) {
    MessagePlugin.error(e.message ?? "提示词生成失败");
  } finally {
    promptLoading.value = false;
  }
}

// 图片列表获取
async function fetchImages(id: number): Promise<void> {
  const _id = id;
  try {
    const { data } = await axios.post("/assets/getImage", { assetsId: id });
    assetsId.value = data.id;

    // 如果有生成中的图片，继续轮询
    const hasGenerating = data.tempAssets.some((i: ImageState) => i.state === "生成中");
    if (hasGenerating) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (modalShow.value) fetchImages(_id);
      }, 2000);
    }

    // 更新结果列表
    if (_id === formData.value?.id) {
      if (data.filePath && data.filePath.length > 0) {
        resultImages.value = [{ filePath: data.filePath, state: "生成成功" }, ...data.tempAssets];
      } else {
        resultImages.value = [...data.tempAssets];
      }

      // 首次加载时自动选中当前图片
      if (isFirstLoad.value) {
        selectedIndex.value = resultImages.value.findIndex(
          (item: ImageState) => item.filePath === formData.value?.filePath && formData.value?.filePath.length > 0,
        );
        isFirstLoad.value = false;
      }

      generatedImages.value = resultImages.value;
    }
  } catch (e: any) {
    MessagePlugin.error(e.message ?? "获取图片列表失败");
  }
}

// AI图片生成
async function generateAIImage(): Promise<void> {
  if (!formData.value) return;

  if (!promptText.value || promptText.value.trim() === "") {
    MessagePlugin.warning("请输入生图提示词");
    return;
  }

  const { id, name, sampleImage } = formData.value;
  fakeLoading.value = true;
  generateLoading.value = true;

  try {
    const generatePromise = axios.post("/assets/generateAssets", {
      type: assetType.value,
      projectId: projectId.value,
      name: name || props.data?.name,
      base64: sampleImage || undefined,
      prompt: promptText.value.trim(),
      id,
    });
    setTimeout(() => {
      if (props.data?.id) {
        fetchImages(props.data.id);
      }
      fakeLoading.value = false;
    }, 2000);

    const { data } = await generatePromise;

    if (props.data?.id) {
      await fetchImages(props.data.id);
    }

    MessagePlugin.success("资产生成成功");

    // 添加新生成的图片到列表
    if (data.assetsId === formData.value.id) {
      resultImages.value.push({
        filePath: data.path,
        state: "生成成功",
      });
      generatedImages.value = [...resultImages.value];
    }
  } catch (e: any) {
    MessagePlugin.error(e.message ?? "资产生成失败");
    console.error("生成失败:", e);
  } finally {
    generateLoading.value = false;
  }
}

// 确认选择并保存
async function confirmSelection(): Promise<void> {
  if (selectedIndex.value === -1) {
    MessagePlugin.warning("请先选择一张图片");
    return;
  }

  let filePath = "";

  if (selectedType.value === "custom") {
    // 自定义上传的图片需要先上传到服务器
    const customImg = customUploadImages.value[selectedIndex.value];
    if (!customImg || !customImg.file) {
      MessagePlugin.error("选择的图片无效");
      return;
    }

    // TODO: 上传自定义图片到服务器,获取服务器返回的URL
    // 这里暂时使用本地URL,实际应该调用上传接口
    filePath = customImg.url;
    MessagePlugin.warning("自定义上传功能需要实现服务器上传接口");
    return;
  } else {
    // 生成的图片
    const selected = resultImages.value[selectedIndex.value];
    if (!selected.filePath && !selected.url) {
      MessagePlugin.error("选择的图片无效");
      return;
    }
    filePath = selected.filePath || selected.url || "";
  }

  const params = {
    projectId: project.value?.id,
    id: formData.value.id,
    prompt: formData.value.prompt || "",
    filePath,
  };

  saveLoading.value = true;
  try {
    await axios.post("/assets/saveAssets", params);
    MessagePlugin.success("保存成功");
    emits("update");
    generateImageShow.value = false;
  } catch (e: any) {
    MessagePlugin.error(e.message ?? "保存失败");
  } finally {
    saveLoading.value = false;
  }
}

// 监听器
watch(
  () => props.data,
  (newData) => {
    if (newData) {
      // 重置表单数据
      formData.value.id = newData.id;
      formData.value.filePath = newData.filePath || "";
      formData.value.name = newData.name || "";
      promptText.value = "";

      // 重置文件列表
      fileList.value = [];
      referenceFileList.value = [];

      // 重置结果列表
      generatedImages.value = [];
      resultImages.value = [];
      customUploadImages.value = [];
      isFirstLoad.value = true;
      selectedIndex.value = -1;
      selectedType.value = "result";

      // 加载图片列表
      if (newData.id) {
        fetchImages(newData.id);
      }
    }
  },
  { deep: true },
);

watch(generateImageShow, (newVal) => {
  modalShow.value = newVal;
  if (!newVal && timer) {
    clearTimeout(timer);
    timer = null;
  }
});

onUnmounted(() => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
});
</script>

<style lang="scss" scoped>
.generateImage {
  .contentWrapper {
    display: flex;
    gap: 20px;
    .parameter {
      width: 40%;
      .customAI {
        margin-top: 20px;
        height: 500px;
        .aiUpload {
          margin-bottom: 20px;
        }
        .aiContent {
          display: flex;
          flex-direction: column;
          gap: 8px;

          span {
            font-weight: 900;
          }
        }
      }

      .generate {
        margin-top: 20px;
      }
    }
    .result {
      width: 60%;
      display: flex;
      flex-direction: column;
      height: 100%;
      .resultHeader {
        font-size: 16px;
        font-weight: 600;
      }
      .resultContent {
        max-height: 500px;
        overflow-y: auto;
      }
      .resultGrid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 16px;
        padding: 4px;

        .imageItem {
          position: relative;
          width: 100%;
          padding-bottom: 100%; // 1:1 宽高比
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          border: 2px solid transparent;
          transition: all 0.3s ease;

          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }

          &.selected {
            border-color: var(--td-brand-color);
            box-shadow: 0 0 0 2px rgba(0, 82, 217, 0.2);
          }

          img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .imageOverlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(to bottom, rgba(0, 0, 0, 0.5) 0%, transparent 30%, transparent 70%, rgba(0, 0, 0, 0.5) 100%);
            opacity: 0;
            transition: opacity 0.3s ease;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 8px;
          }

          &:hover .imageOverlay,
          &.selected .imageOverlay {
            opacity: 1;
          }

          .imageStatus {
            display: flex;
            justify-content: flex-end;
          }

          .selectedMark {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: var(--td-brand-color);
            margin: auto;
          }
        }

        .uploadItem {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          .uploadPlaceholder {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            color: var(--td-text-color-placeholder);

            span {
              font-size: 12px;
            }
          }
        }
      }
      .resultFooter {
        margin-top: 16px;
        padding-top: 16px;
        display: flex;
        justify-content: flex-end;
      }
    }
  }
}
</style>
