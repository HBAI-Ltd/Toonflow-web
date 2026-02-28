<template>
  <a-modal v-model:open="open" :maskClosable="false" wrapClassName="batch-generate-modal" :closable="false" width="80vw" centered>
    <!-- 自定义标题 -->
    <template #title>
      <div class="modal-header">
        <div class="header-left">
          <div class="header-icon">
            <i-magic-wand theme="filled" size="20" />
          </div>
          <span class="header-title">批量生成</span>
          <a-tag color="purple">{{ localData?.length || 0 }} 项</a-tag>
        </div>
        <button class="close-btn" @click="handleCancel">
          <i-close theme="outline" size="18" />
        </button>
      </div>
    </template>

    <!-- 内容区域 -->
    <div class="modal-content">
      <!-- 操作工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <a-checkbox :checked="isAllSelected" :indeterminate="isIndeterminate" @change="handleSelectAll">全选</a-checkbox>
          <span class="select-info">
            已选
            <strong>{{ selectedCount }}</strong>
            / {{ localData?.length || 0 }} 项
          </span>
        </div>
        <div class="toolbar-right">
          <a-button @click="handleBatchGeneratePrompt" :loading="promptLoading" :disabled="selectedCount === 0">生成提示词</a-button>
          <a-button type="primary" @click="handleBatchGenerateImage" :loading="imageLoading" :disabled="selectedCount === 0">生成图片</a-button>
        </div>
      </div>

      <!-- 表格区域 -->
      <div class="table-container">
        <!-- 表头 -->
        <div class="table-header">
          <div class="th th-check"></div>
          <div class="th th-name">名称</div>
          <div class="th th-img">预览图</div>
          <div class="th th-prompt">生图提示词</div>
          <div class="th th-video" v-if="props.type === 'storyboard'">视频提示词</div>
          <div class="th th-duration" v-if="props.type === 'storyboard'">时长</div>
        </div>

        <!-- 表格内容 -->
        <div class="table-body">
          <div v-for="(item, idx) in localData" :key="item.id" class="table-row" :class="{ selected: selected[idx] }">
            <!-- 选择框 -->
            <div class="td td-check">
              <a-checkbox v-model:checked="selected[idx]" />
            </div>

            <!-- 名称 -->
            <div class="td td-name">
              {{ item.name }}
            </div>

            <!-- 预览图 -->
            <div class="td td-img">
              <a-spin :spinning="rowImageLoading[item.id] ?? false" tip="生成中...">
                <div class="img-wrapper" :class="{ 'has-image': item?.filePath }">
                  <a-image v-if="item?.filePath" :src="item.filePath" :fallback="errorPictrue" />
                  <div v-else class="img-empty">
                    <i-pic theme="outline" size="24" />
                    <span>待生成</span>
                  </div>
                </div>
              </a-spin>
            </div>

            <!-- 生图提示词 -->
            <div class="td td-prompt">
              <a-spin :spinning="rowPromptLoading[item.id] ?? false" tip="生成中...">
                <a-textarea v-model:value="item.prompt" :auto-size="{ minRows: 2, maxRows: 6 }" class="input-field" placeholder="输入生图提示词..." />
              </a-spin>
            </div>

            <!-- 视频提示词 -->
            <div class="td td-video" v-if="props.type === 'storyboard'">
              <a-textarea
                v-model:value="item.videoPrompt"
                :auto-size="{ minRows: 2, maxRows: 6 }"
                class="input-field"
                placeholder="输入视频提示词..." />
            </div>

            <!-- 时长 -->
            <div class="td td-duration" v-if="props.type === 'storyboard'">
              <a-input-number v-model:value="item.duration" :min="1" :step="1" class="duration-input" placeholder="秒">
                <template #addonAfter>秒</template>
              </a-input-number>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="!localData?.length" class="empty-state">
            <i-inbox theme="outline" size="48" />
            <p>暂无数据</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部按钮 -->
    <template #footer>
      <div class="modal-footer">
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" @click="handleOk" :disabled="selectedCount === 0">保存选中项 ({{ selectedCount }})</a-button>
      </div>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { message, Modal } from "ant-design-vue";
import errorPictrue from "@/utils/error";
import axios from "@/utils/axios";
import type { CheckboxChangeEvent } from "ant-design-vue/es/checkbox/interface";
import settingStore from "@/stores/setting";
const { otherSetting } = storeToRefs(settingStore());
import store from "@/stores";

const { projectId } = storeToRefs(store());

// 使用组件内部状态，确保每个弹窗实例独立
const imageLoading = ref(false);
const promptLoading = ref(false);

interface GenerateItem {
  id: number;
  filePath: string;
  intro: string;
  name: string;
  prompt: string;
  remark: string;
  duration: number;
  type: string;
  videoPrompt: string;
}

// 单行加载状态
const rowPromptLoading = ref<Record<number, boolean>>({});
const rowImageLoading = ref<Record<number, boolean>>({});

const props = defineProps<{
  data: GenerateItem[];
  type: string;
  scriptId: number;
}>();

const emits = defineEmits(["save"]);
const open = defineModel<boolean>();
const localData = ref<GenerateItem[]>();
const selected = ref<boolean[]>([]);
const promptGenerateCancel = ref(false);

const typeMap: Record<string, string> = {
  角色: "role",
  场景: "scene",
  分镜: "storyboard",
  道具: "props",
};

const selectedCount = computed(() => selected.value.filter(Boolean).length);

const isAllSelected = computed(() => {
  return selected.value.length > 0 && selected.value.every(Boolean);
});

const isIndeterminate = computed(() => {
  const count = selectedCount.value;
  return count > 0 && count < selected.value.length;
});

watch(
  open,
  (val) => {
    if (val) {
      localData.value = JSON.parse(JSON.stringify(props.data));
      selected.value = Array(props.data.length).fill(false);
      promptGenerateCancel.value = false;
      rowPromptLoading.value = {};
      rowImageLoading.value = {};
      // 重置加载状态，确保每次打开弹窗时状态独立
      imageLoading.value = false;
      promptLoading.value = false;
    } else {
      localData.value = [];
    }
  },
  { immediate: true },
);

function handleSelectAll(e: CheckboxChangeEvent) {
  const checked = (e.target as HTMLInputElement).checked;
  selected.value = selected.value.map(() => checked);
}

function getSelected(): GenerateItem[] {
  return localData.value?.filter((_, idx) => selected.value[idx]) || [];
}

function handleOk() {
  const list = getSelected();
  if (list.length === 0) {
    message.error("请选择要保存的项目");
    return;
  }
  emits("save", list);
  open.value = false;
}

async function handleCancel() {
  const isLoading = promptLoading.value || imageLoading.value;

  if (isLoading) {
    await new Promise<void>((resolve) => {
      Modal.confirm({
        title: "确认取消",
        content: "正在生成中，取消后当前任务将终止，是否继续？",
        okText: "确认取消",
        cancelText: "继续等待",
        okButtonProps: { danger: true },
        onOk: () => {
          promptGenerateCancel.value = true;
          promptLoading.value = false;
          imageLoading.value = false;
          resolve();
        },
      });
    });
  }
  open.value = false;
}

async function handleBatchGeneratePrompt() {
  const list = getSelected();
  if (list.length === 0) {
    message.warning("请至少选择一个资产");
    return;
  }

  promptLoading.value = true;

  const batchSize = otherSetting.value.assetsBatchGenereateSize || 5; // 从设置中获取批量生成的大小，默认为5
  try {
    for (let i = 0; i < list.length; i += batchSize) {
      if (promptGenerateCancel.value) throw new Error("已取消生成");
      const batch = list.slice(i, i + batchSize);
      await Promise.allSettled(batch.map((item) => generatePrompt(item)));
    }
    message.success("提示词生成完成");
  } catch (e) {
    if (e instanceof Error && e.message !== "已取消生成") {
      message.error(e.message);
    }
  } finally {
    promptLoading.value = false;
  }
}

async function generatePrompt(data: GenerateItem) {
  rowPromptLoading.value[data.id] = true;
  try {
    const res = await axios.post("/assets/polishPrompt", {
      projectId: projectId.value,
      assetsId: data.id,
      type: typeMap[data.type] ?? "props",
      name: data.name,
      describe: data.intro ?? "",
    });
    const index = localData.value!.findIndex((item) => item.id === res.data.assetsId);
    if (index !== -1 && !promptGenerateCancel.value) {
      localData.value![index].prompt = res.data.prompt;
    }
  } catch (e: any) {
    message.error(`"${data.name}" ${e?.message ?? "提示词生成失败"}`);
  } finally {
    rowPromptLoading.value[data.id] = false;
  }
}

async function handleBatchGenerateImage() {
  const list = getSelected();
  if (list.length === 0) {
    message.warning("请至少选择一个资产");
    return;
  }

  imageLoading.value = true;

  const batchSize = otherSetting.value.assetsBatchGenereateSize || 5; // 从设置中获取批量生成的大小，默认为5
  try {
    for (let i = 0; i < list.length; i += batchSize) {
      const batch = list.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map((item) =>
          startGenerate({
            id: item.id,
            name: item.name,
            prompt: item.prompt,
            type: typeMap[item.type] ?? "props",
          }),
        ),
      );
    }
    message.success("图片生成完成");
  } catch (e) {
    if (e instanceof Error) message.error(e.message);
  } finally {
    imageLoading.value = false;
  }
}

async function startGenerate(data: { id: number; prompt: string; name: string; type: string }) {
  if (!localData.value) return;
  rowImageLoading.value[data.id] = true;
  try {
    const res = await axios.post("/assets/generateAssets", {
      type: data.type,
      projectId: projectId.value,
      name: data.name,
      base64: undefined,
      prompt: data.prompt ?? "",
      id: data.id,
    });
    const index = localData.value.findIndex((item) => item.id === res.data.assetsId);
    if (index !== -1) {
      localData.value[index].filePath = res.data.path;
    }
  } catch {
    message.error(`"${data.name}" 图片生成失败`);
  } finally {
    rowImageLoading.value[data.id] = false;
  }
}
</script>

<style scoped lang="scss">
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
  border-bottom: 1px solid #e9d5ff;
  margin: -20px -24px 0;
  border-radius: 8px 8px 0 0;

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .header-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: var(--mainGradient);
    border-radius: 10px;
    color: #fff;
  }

  .header-title {
    font-size: 18px;
    font-weight: 600;
    color: #1a1a1a;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #666;
    cursor: pointer;

    &:hover {
      background: #fff;
      color: var(--mainColor);
    }
  }
}

.modal-content {
  margin: 0 -24px;
  padding: 0 24px;
  max-height: 65vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 16px;

    .select-info {
      font-size: 13px;
      color: #888;

      strong {
        color: var(--mainColor);
        font-weight: 600;
      }
    }
  }

  .toolbar-right {
    display: flex;
    gap: 12px;
  }
}

.table-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  border: 1px solid #eee;
  margin-top: 16px;
}

.table-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #fafafa;
  border-bottom: 1px solid #eee;
  font-weight: 600;
  font-size: 13px;
  color: #666;
  flex-shrink: 0;
}

.table-body {
  flex: 1;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #ddd;
    border-radius: 3px;
  }
}

.table-row {
  display: flex;
  align-items: stretch;
  padding: 16px;
  border-bottom: 1px solid #f5f5f5;
  background: #fff;
  box-sizing: border-box;
  border-left: 3px solid transparent;

  &:hover {
    background: #fafafa;
  }

  &.selected {
    background: #faf5ff;
    border-left-color: var(--mainColor);
  }

  &:last-child {
    border-bottom: none;
  }
}

.th,
.td {
  padding: 0 8px;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

.th-check,
.td-check {
  width: 48px;
  justify-content: center;
  flex-shrink: 0;
}

.th-name,
.td-name {
  width: 160px;
  flex-shrink: 0;
}

.th-img,
.td-img {
  width: 120px;
  justify-content: center;
  flex-shrink: 0;
}

.th-prompt,
.td-prompt,
.th-video,
.td-video {
  flex: 1;
  min-width: 200px;
}

.th-duration,
.td-duration {
  width: 100px;
  flex-shrink: 0;
}

.td-img {
  :deep(.ant-spin-nested-loading) {
    width: 100%;
    display: flex;
    justify-content: center;
  }

  :deep(.ant-spin-container) {
    display: flex;
    justify-content: center;
  }
}

.td-prompt {
  :deep(.ant-spin-nested-loading) {
    width: 100%;
  }

  :deep(.ant-spin-container) {
    width: 100%;
  }
}

.img-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px dashed #d9d9d9;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;

  &.has-image {
    border-style: solid;
    border-color: #e9d5ff;
  }

  :deep(.ant-image) {
    width: 100%;
    height: 100%;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .img-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    color: #bbb;
    font-size: 12px;
  }
}

.input-field {
  width: 100%;
  border-radius: 6px !important;

  &:focus {
    border-color: var(--mainColor) !important;
    box-shadow: 0 0 0 2px rgba(152, 16, 250, 0.1) !important;
  }
}

.duration-input {
  width: 100%;

  :deep(.ant-input-number-input) {
    text-align: center;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #bbb;

  p {
    margin-top: 12px;
    font-size: 14px;
  }
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
}
</style>

<style>
.batch-generate-modal .ant-modal-content {
  border-radius: 12px;
  overflow: hidden;
}

.batch-generate-modal .ant-modal-header {
  padding: 0;
  border: none;
}

.batch-generate-modal .ant-modal-body {
  padding: 20px 24px;
}

.batch-generate-modal .ant-modal-footer {
  border: none;
  padding: 0 24px 20px;
}
</style>
