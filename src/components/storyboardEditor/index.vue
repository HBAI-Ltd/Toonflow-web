<template>
  <a-modal
    v-model:open="modelValue"
    width="60vw"
    :closable="false"
    :maskClosable="false"
    wrapClassName="no-header-margin"
    dialogClass="custom-modal"
    :afterClose="handleClose">
    <!-- 标题栏 -->
    <template #title>
      <a-flex justify="space-between" align="center" class="modal-header">
        <a-typography-title :level="4" style="margin: 0">镜头编辑器</a-typography-title>
        <a-button type="text" @click="closeModal">
          <template #icon>
            <i-close theme="outline" size="18" fill="#9913FA" />
          </template>
        </a-button>
      </a-flex>
    </template>

    <a-flex class="modal-content">
      <!-- 左侧面板 -->
      <a-flex v-if="mode === 'manual'" vertical gap="middle" class="left-panel">
        <!-- 镜头图区域 -->
        <a-card title="镜头图" :bordered="false" size="small">
          <a-row :gutter="[12, 12]">
            <a-col :span="6">
              <div class="image-card-wrapper">
                <a-image :src="mockStoryboard.filePath || ''" :fallback="errorPictrue" class="scene-image" />
                <a-tag color="cyan" class="image-tag">图 1</a-tag>
              </div>
            </a-col>
          </a-row>
        </a-card>

        <!-- 其他图片区域 -->
        <a-card title="其他" :bordered="false" size="small">
          <a-row :gutter="[12, 12]">
            <a-col :span="6" v-for="(item, index) in mockStoryboard.otherImgs" :key="index">
              <div class="image-card-wrapper">
                <a-image :preview="false" :src="item.filePath || ''" :fallback="errorPictrue" class="scene-image" />
                <div class="image-actions">
                  <a-button type="text" size="small" danger @click.stop="delOtherImgs(index)">
                    <template #icon>
                      <i-close-one theme="outline" size="16" fill="red" />
                    </template>
                  </a-button>
                  <a-button v-if="item.filePath" type="text" size="small" @click.stop="startPreview(item.filePath)">
                    <template #icon>
                      <i-preview-open theme="outline" size="16" fill="#9913FA" />
                    </template>
                  </a-button>
                </div>
                <a-tag color="cyan" class="image-tag">图 {{ index + 2 }}</a-tag>
              </div>
            </a-col>
            <a-col :span="6">
              <div class="upload-card" @click="handleSelectOtherImgs">
                <i-upload-picture theme="outline" size="36" fill="#9810fa" />
              </div>
            </a-col>
          </a-row>
        </a-card>

        <!-- 编辑指令区域 -->
        <a-card title="编辑指令" :bordered="false" size="small">
          <a-mentions
            v-model:value="mockStoryboard.editPrompt"
            :rows="3"
            placeholder="请输入编辑指令，您可以通过@来引用其他图像"
            :options="options" />
          <a-button type="primary" block style="margin-top: 12px" :loading="generateLoading" @click="doMerge">生成图片</a-button>
        </a-card>
      </a-flex>

      <a-divider v-if="mode === 'manual'" type="vertical" style="height: 100%" />

      <!-- 中间面板 - 文本与生成结果 -->
      <a-flex vertical class="middle-panel">
        <a-card title="镜头提示词" :bordered="false" size="small" style="margin-bottom: 12px" v-if="mockStoryboard.prompt">
          {{ mockStoryboard.prompt }}
        </a-card>
        <a-card title="视频提示词" :bordered="false" size="small" style="margin-bottom: 12px" v-if="mockStoryboard.videoPrompt">
          {{ mockStoryboard.videoPrompt }}
        </a-card>
        <a-card title="人物对话" :bordered="false" size="small" style="margin-bottom: 12px" v-if="mockStoryboard.dialogue">
          <a-typography-paragraph style="margin-bottom: 0; white-space: pre-wrap">
            {{ mockStoryboard.dialogue }}
          </a-typography-paragraph>
        </a-card>
        <a-card title="第三方视角叙述" :bordered="false" size="small" style="margin-bottom: 20px" v-if="mockStoryboard.narration">
          <a-typography-paragraph style="margin-bottom: 0; white-space: pre-wrap">
            {{ mockStoryboard.narration }}
          </a-typography-paragraph>
        </a-card>
        <a-card title="生成结果" :bordered="false" size="small">
          <template v-if="mockStoryboard.generateImg && mockStoryboard.generateImg.length > 0">
            <a-row :gutter="[12, 12]">
              <a-col :span="8" v-for="(item, index) in mockStoryboard.generateImg" :key="index">
                <div :class="['image-card-wrapper', { 'image-selected': resultSelectedIndex === index }]" @click="resultSelectedIndex = index">
                  <a-image :preview="false" :src="item.filePath || ''" :fallback="errorPictrue" class="scene-image" />
                  <div class="image-actions">
                    <a-popconfirm title="确定要删除这张图片吗？" ok-text="确定" cancel-text="取消" @confirm="delResult(index)">
                      <a-button type="text" size="small" danger @click.stop>
                        <template #icon>
                          <i-close-one theme="outline" size="16" fill="#E60076" />
                        </template>
                      </a-button>
                    </a-popconfirm>
                    <a-button v-if="item.filePath" type="text" size="small" @click.stop="startPreview(item.filePath)">
                      <template #icon>
                        <i-preview-open theme="outline" size="16" fill="#9913FA" />
                      </template>
                    </a-button>
                  </div>
                  <div v-if="resultSelectedIndex === index" class="selected-overlay">
                    <i-check theme="outline" size="70" fill="#4deb23" strokeLinejoin="bevel" />
                  </div>
                </div>
              </a-col>
            </a-row>
          </template>
          <a-empty v-else description="请先生成图片" />
        </a-card>
      </a-flex>
    </a-flex>

    <!-- 底部按钮 -->
    <template #footer>
      <a-flex justify="end" gap="middle" class="modal-footer">
        <a-button size="large" @click="closeModal">取消</a-button>
        <a-button size="large" type="primary" @click="handleSaveFirstFrame">保存</a-button>
      </a-flex>
    </template>
  </a-modal>

  <!-- 图片预览 -->
  <a-image
    :width="200"
    :style="{ display: 'none' }"
    :preview="{
      visible: imagePreviewVisiable,
      onVisibleChange: setPreviewVisible,
    }"
    :src="previewImageUrl || ''" />

  <!-- 素材选择弹窗 -->
  <a-modal v-model:open="selectElementModal" width="60%" :closable="false" @ok="handleSelectElementOk" @cancel="handleSelectElementCancel">
    <div style="height: 700px; overflow-y: auto">
      <mainElement way="radio" ref="mainElementRef" v-if="selectElementModal" />
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { storeToRefs } from "pinia";
import { message } from "ant-design-vue";
import mainElement from "@/views/projectDetail/components/assetsManager/components/mainElement.vue";
import store from "@/stores";
import errorPictrue from "@/utils/error";
import axios from "@/utils/axios";

interface OtherImg {
  id: number;
  filePath: string;
}

interface GenerateImg {
  id?: number;
  filePath: string;
}

interface Storyboard {
  id: number;
  filePath: string;
  scriptId?: number;
  otherImgs: OtherImg[];
  prompt: string;
  videoPrompt?: string;
  duration?: number;
  dialogue?: string;
  narration?: string;
  editPrompt: string;
  intro: string;
  generateImg: GenerateImg[];
}

withDefaults(
  defineProps<{
    generateImage?: (imageList: string[], intro: string, id: number) => Promise<string>;
    generatePrompt?: (id: number) => Promise<string>;
  }>(),
  {
    generateImage: async () => "",
    generatePrompt: async () => "生成提示词",
  },
);

const emit = defineEmits<{
  save: [data: { id: number; filePath: string; prompt: string }];
}>();

const { projectId } = storeToRefs(store());

// 使用组件内部状态，确保每个弹窗实例独立
const generateLoading = ref(false);

const modelValue = ref(false);
const mode = ref("manual");
const selectElementModal = ref(false);
const mainElementRef = ref<InstanceType<typeof mainElement> | null>(null);
const componentResolve = ref<((value: { id: number; filePath: string }) => void) | null>(null);
const resultSelectedIndex = ref(-1);
const previewImageUrl = ref("");
const imagePreviewVisiable = ref(false);

// 监听弹窗打开，重置加载状态
watch(modelValue, (visible) => {
  if (visible) {
    generateLoading.value = false;
  }
});

const mockStoryboard = ref<Storyboard>({
  id: -1,
  filePath: "",
  otherImgs: [],
  prompt: "",
  videoPrompt: "",
  duration: 0,
  dialogue: "",
  narration: "",
  editPrompt: "",
  intro: "",
  generateImg: [],
});

const options = computed(() => {
  const result: { value: string; label: string }[] = [];
  let index = 1;
  if (mockStoryboard.value.filePath) {
    result.push({ value: `图${index}`, label: `图${index}` });
    index++;
  }
  mockStoryboard.value.otherImgs?.forEach(() => {
    result.push({ value: `图${index}`, label: `图${index}` });
    index++;
  });
  return result;
});

function setPreviewVisible(value: boolean): void {
  imagePreviewVisiable.value = value;
}

function startPreview(imageUrl: string): void {
  previewImageUrl.value = imageUrl;
  setPreviewVisible(true);
}

async function handleSelectOtherImgs(): Promise<void> {
  selectElementModal.value = true;
  try {
    const res = await new Promise<{ id: number; filePath: string }>((resolve) => {
      componentResolve.value = resolve;
    });
    mockStoryboard.value.otherImgs.push({ id: res.id, filePath: res.filePath });
  } catch {
    // 用户取消
  }
}

function handleSelectElementCancel(): void {
  componentResolve.value = null;
}

function handleSelectElementOk(): void {
  if (mainElementRef.value && componentResolve.value) {
    const res = mainElementRef.value.getSelectData();
    componentResolve.value(res);
    selectElementModal.value = false;
    componentResolve.value = null;
  }
}

function delOtherImgs(index: number): void {
  mockStoryboard.value.otherImgs.splice(index, 1);
}

function delResult(index: number): void {
  mockStoryboard.value.generateImg.splice(index, 1);
  if (resultSelectedIndex.value >= mockStoryboard.value.generateImg.length) {
    resultSelectedIndex.value = mockStoryboard.value.generateImg.length - 1;
  }
}

async function doMerge(): Promise<void> {
  generateLoading.value = true;

  if (mockStoryboard.value.editPrompt.length < 5) {
    message.error("编辑指令必须大于5个字");
    generateLoading.value = false;
    return;
  }

  const filePathMap: Record<string, number | string> = {
    "@图1": mockStoryboard.value.id && mockStoryboard.value.id !== -1 ? mockStoryboard.value.id : mockStoryboard.value.filePath,
  };

  mockStoryboard.value.otherImgs.forEach((item, idx) => {
    filePathMap[`@图${idx + 2}`] = item.id;
  });

  try {
    const res = await axios.post("/storyboard/generateStoryboardApi", {
      filePath: filePathMap,
      prompt: mockStoryboard.value.editPrompt,
      projectId: projectId.value,
      assetsId: mockStoryboard.value.id,
    });
    mockStoryboard.value.generateImg.push({
      filePath: res.data.url,
      id: res.data?.id ?? undefined,
    });
    message.success("图片生成成功");
  } catch {
    // 错误处理
  } finally {
    generateLoading.value = false;
  }
}

function doFusionEdit(storyboard: Storyboard): void {
  mockStoryboard.value = JSON.parse(JSON.stringify(storyboard));
  mockStoryboard.value.generateImg = [{ filePath: mockStoryboard.value.filePath }, ...(mockStoryboard.value.generateImg || [])];
  resultSelectedIndex.value = mockStoryboard.value.generateImg.findIndex((item) => item.filePath === storyboard.filePath);
  modelValue.value = true;
}

function handleSaveFirstFrame(): void {
  if (resultSelectedIndex.value < 0 || !mockStoryboard.value.generateImg[resultSelectedIndex.value]) {
    message.warning("请先选择一张图片");
    return;
  }
  emit("save", {
    id: mockStoryboard.value.id,
    filePath: mockStoryboard.value.generateImg[resultSelectedIndex.value].filePath,
    prompt: mockStoryboard.value.editPrompt,
  });
  modelValue.value = false;
}

function handleClose(): void {
  resultSelectedIndex.value = -1;
}
function closeModal(): void {
  modelValue.value = false;
}

defineExpose({
  doFusionEdit,
});
</script>

<style lang="scss" scoped>
.modal-header {
  background: #f9faff;
  height: 60px;
  padding: 0 24px;
}

.modal-content {
  height: 70vh;
  background: #f3f4f6;
  min-width: 800px;
}

.left-panel,
.middle-panel {
  flex: 1;
  padding: 12px 6px;
  overflow-y: auto;
  box-sizing: border-box;
}

.image-card-wrapper {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #d9d9d9;
  cursor: pointer;
  background: #fafafa;

  &:hover {
    border-color: #9913fa;

    .image-actions {
      opacity: 1;
    }
  }
}

.scene-image {
  width: 100%;
  height: 100% !important;
}

.image-tag {
  position: absolute;
  right: 4px;
  bottom: 4px;
  margin: 0;
}

.image-actions {
  position: absolute;
  top: 4px;
  left: 4px;
  right: 4px;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  opacity: 0;
  transition: opacity 0.2s;
  background: transparent;
  border-radius: 4px;
  padding: 2px;

  .ant-btn {
    background: rgba(255, 255, 255, 0.9);
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

    &:hover {
      background: rgba(255, 255, 255, 1);
    }
  }
}

.upload-card {
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  cursor: pointer;
  background: #fafafa;
  transition: all 0.2s;

  &:hover {
    border-color: #9810fa;
    background: #f5f0ff;
  }
}

.image-selected {
  border: 2px solid #9913fa;
  box-shadow: 0 0 8px rgba(153, 19, 250, 0.3);
}

.selected-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(128, 128, 128, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-footer {
  padding: 16px;
}

:deep(.ant-card-head) {
  min-height: auto;
  padding: 8px 12px;

  .ant-card-head-title {
    font-size: 14px;
    font-weight: 600;
    padding: 0;
  }
}

:deep(.ant-card-body) {
  padding: 12px;
}
:deep(.ant-image) {
  height: 100% !important;
  img {
    height: 100% !important;
    object-fit: cover;
  }
}
</style>
