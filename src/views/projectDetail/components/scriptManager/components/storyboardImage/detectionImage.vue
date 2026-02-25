<template>
  <div class="detection-image">
    <a-modal v-model:open="detectionImageShow" width="85%" :closable="false" wrapClassName="detection-modal" centered @ok="handleOk">
      <!-- 自定义标题 -->
      <template #title>
        <div class="modal-header">
          <div class="header-left">
            <div class="header-icon">
              <i-export theme="filled" size="20" />
            </div>
            <span class="header-title">导出镜头</span>
            <a-tag color="purple">{{ imageData?.length || 0 }} 个镜头</a-tag>
          </div>
          <button class="close-btn" @click="detectionImageShow = false">
            <i-close theme="outline" size="18" />
          </button>
        </div>
      </template>

      <div class="modal-content">
        <!-- 工具栏 -->
        <div class="toolbar">
          <div class="toolbar-left">
            <span class="select-info">
              已选
              <strong>{{ selectedCount }}</strong>
              / {{ imageData?.length || 0 }} 项
            </span>
          </div>
          <div class="toolbar-right">
            <a-button @click="handleBatchSuperScore" :disabled="selectedCount === 0">
              <template #icon><i-high-light theme="outline" size="16" /></template>
              批量超分图片
            </a-button>
            <a-button type="primary" @click="handleBatchGeneratePrompts" :disabled="selectedCount === 0">
              <template #icon><i-magic-wand theme="outline" size="16" /></template>
              批量生成视频提示词
            </a-button>
          </div>
        </div>

        <!-- 表格 -->
        <div class="table-wrapper">
          <vxe-table
            ref="tableRef"
            height="520"
            :data="imageData"
            :edit-config="editConfig"
            :row-config="{ isCurrent: true, isHover: true }"
            :checkbox-config="{ highlight: true }"
            stripe
            round
            @edit-actived="handleEditActived"
            @checkbox-change="handleCheckboxChange"
            @checkbox-all="handleCheckboxChange">
            <vxe-column type="checkbox" width="50" align="center"></vxe-column>
            <vxe-column type="seq" title="序号" width="60" align="center"></vxe-column>

            <!-- 图片列 -->
            <vxe-column field="filePath" title="镜头图片" width="140" align="center">
              <template #default="{ row }">
                <div class="image-cell">
                  <div class="image-wrapper" :class="{ loading: row.superScoreLoading }">
                    <a-spin :spinning="!!row.superScoreLoading" size="small" tip="超分中...">
                      <a-image
                        :src="row.filePath"
                        :preview-src="row.filePath"
                        width="100"
                        height="60"
                        style="object-fit: cover; border-radius: 6px" />
                    </a-spin>
                  </div>
                  <a-tag :color="row.isSuperScored ? 'success' : 'default'" size="small" class="status-tag">
                    {{ row.isSuperScored ? "已超分" : "未超分" }}
                  </a-tag>
                </div>
              </template>
            </vxe-column>

            <!-- 图片提示词 -->
            <vxe-column field="prompt" title="图片提示词" min-width="200" :edit-render="{ name: 'input' }">
              <template #default="{ row }">
                <div class="prompt-cell">
                  <span class="prompt-text" :title="row.prompt">{{ row.prompt || "-" }}</span>
                </div>
              </template>
            </vxe-column>

            <!-- 视频提示词 -->
            <vxe-column field="videoPrompt" title="视频提示词" min-width="240" :edit-render="{ name: 'input' }" show-overflow="">
              <template #default="{ row }">
                <a-spin :spinning="!!row.videoPromptLoading" size="small" wrapperClassName="video-prompt-spin">
                  <div class="prompt-cell video">
                    <span class="prompt-text" :title="row.videoPrompt">
                      {{ row.videoPrompt || "-" }}
                    </span>
                  </div>
                </a-spin>
              </template>
            </vxe-column>

            <!-- 人物对话（与视频提示词同接口生成，共用 loading） -->
            <vxe-column field="dialogue" title="人物对话" min-width="180" :edit-render="{ name: 'input' }">
              <template #default="{ row }">
                <a-spin :spinning="!!row.videoPromptLoading" size="small" wrapperClassName="video-prompt-spin">
                  <div class="prompt-cell">
                    <span class="prompt-text" :title="row.dialogue">{{ row.dialogue || "-" }}</span>
                  </div>
                </a-spin>
              </template>
            </vxe-column>

            <!-- 第三方视角叙述（与视频提示词同接口生成，共用 loading） -->
            <vxe-column field="narration" title="第三方视角叙述" min-width="180" :edit-render="{ name: 'input' }">
              <template #default="{ row }">
                <a-spin :spinning="!!row.videoPromptLoading" size="small" wrapperClassName="video-prompt-spin">
                  <div class="prompt-cell">
                    <span class="prompt-text" :title="row.narration">{{ row.narration || "-" }}</span>
                  </div>
                </a-spin>
              </template>
            </vxe-column>

            <!-- 时长 -->
            <vxe-column field="duration" title="时长(秒)" width="100" align="center">
              <template #default="{ row }">
                <span class="duration-text">{{ row.duration || "-" }}</span>
              </template>
            </vxe-column>
          </vxe-table>
        </div>
      </div>

      <!-- 底部 -->
      <template #footer>
        <div class="modal-footer">
          <div class="footer-info">
            <i-info theme="outline" size="14" />
            <span>点击单元格可编辑提示词内容</span>
          </div>
          <div class="footer-actions">
            <a-button @click="detectionImageShow = false">取消</a-button>
            <a-button type="primary" @click="handleOk">保存并导出</a-button>
          </div>
        </div>
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, computed } from "vue";
import { message as antMessage } from "ant-design-vue";
import axios from "@/utils/axios";
import type { VxeTablePropTypes, VxeTableInstance, VxeTableEvents } from "vxe-table";

const editConfig: VxeTablePropTypes.EditConfig = {
  trigger: "click",
  mode: "cell",
};

type ImageDataItem = {
  id: string;
  videoPrompt: string;
  prompt: string;
  duration: string;
  projectId: number;
  filePath: string;
  type: string;
  name: string;
  scriptId: number;
  segmentId: number;
  shotIndex: number;
  src: string;
  dialogue?: string;
  narration?: string;
  dataUrl?: string;
  superScoreLoading?: boolean;
  videoPromptLoading?: boolean;
  isSuperScored?: boolean;
  isVideoPromptGenerated?: boolean;
};

const imageData = defineModel<ImageDataItem[]>("imageData");
const detectionImageShow = defineModel<boolean>("detectionImageShow");
const modalShow = defineModel<boolean>("modalShow");

const tableRef = ref<VxeTableInstance>();
const selectedCount = ref(0);

const emit = defineEmits(["save"]);

function handleCheckboxChange() {
  selectedCount.value = tableRef.value?.getCheckboxRecords()?.length ?? 0;
}

const handleEditActived: VxeTableEvents.EditActived<ImageDataItem> = ({ row, column }) => {
  const field = column.field;

  // 视频提示词、人物对话、第三方视角叙述 同接口生成，生成中禁止编辑
  if (
    (field === "videoPrompt" || field === "dialogue" || field === "narration") &&
    row.videoPromptLoading
  ) {
    tableRef.value?.clearEdit();
    antMessage.warning("正在生成提示词/对话/叙述，请稍候");
    return;
  }

  if (field === "prompt" && row.superScoreLoading) {
    tableRef.value?.clearEdit();
    antMessage.warning("正在超分处理，请稍候");
  }
};

function getSelectedRows(): ImageDataItem[] {
  return tableRef.value?.getCheckboxRecords() ?? [];
}

function findRowIndexById(id: string): number {
  return imageData.value?.findIndex((item) => item.id === id) ?? -1;
}

function updateRowField<K extends keyof ImageDataItem>(id: string, field: K, value: ImageDataItem[K]) {
  const index = findRowIndexById(id);
  if (index !== -1 && imageData.value) {
    imageData.value[index][field] = value;
  }
}

function setLoadingByIds(ids: string[], key: "superScoreLoading" | "videoPromptLoading", loading: boolean) {
  ids.forEach((id) => {
    updateRowField(id, key, loading);
  });
  refreshTable();
}

function updateRowsByIds(responseData: any[], statusKey: "isSuperScored" | "isVideoPromptGenerated") {
  if (!responseData || !imageData.value) return;

  responseData.forEach((updated) => {
    const index = findRowIndexById(updated.id);
    if (index !== -1 && imageData.value) {
      const row = imageData.value[index];
      if (updated.videoPrompt !== undefined) row.videoPrompt = updated.videoPrompt;
      if (updated.prompt !== undefined) row.prompt = updated.prompt;
      if (updated.duration !== undefined) row.duration = updated.duration;
      if (updated.filePath !== undefined) row.filePath = updated.filePath;
      if (updated.type !== undefined) row.type = updated.type;
      if (updated.name !== undefined) row.name = updated.name;
      if (updated.src !== undefined) row.src = updated.src;
      if (updated.dialogue !== undefined) row.dialogue = updated.dialogue;
      if (updated.narration !== undefined) row.narration = updated.narration;
      row[statusKey] = true;
    }
  });

  refreshTable();
}

function refreshTable() {
  nextTick(() => {
    tableRef.value?.updateData();
  });
}

function groupBySegmentId(rows: ImageDataItem[]) {
  const map = new Map<number, { id: string; prompt?: string; src: string }[]>();
  rows.forEach((row) => {
    if (!map.has(row.segmentId)) {
      map.set(row.segmentId, []);
    }
    map.get(row.segmentId)!.push({
      id: row.id,
      prompt: row.prompt,
      src: row.src,
    });
  });
  return Array.from(map.entries()).map(([segmentId, cells]) => ({
    segmentId,
    cells,
  }));
}

async function handleBatchSuperScore() {
  const selectedRows = getSelectedRows();
  if (selectedRows.length === 0) {
    antMessage.warning("请先选择要超分的图片");
    return;
  }

  const rowsToProcess = selectedRows.filter((row) => !row.superScoreLoading);
  if (rowsToProcess.length === 0) {
    antMessage.warning("所选图片正在处理中");
    return;
  }

  const alreadySuperScored = rowsToProcess.filter((row) => row.isSuperScored);
  if (alreadySuperScored.length > 0) {
    antMessage.info(`其中 ${alreadySuperScored.length} 张已超分，将重新处理`);
  }

  const processingIds = rowsToProcess.map((row) => row.id);
  setLoadingByIds(processingIds, "superScoreLoading", true);

  try {
    const payload = {
      scriptId: rowsToProcess[0]?.scriptId,
      projectId: rowsToProcess[0]?.projectId,
      imageList: groupBySegmentId(rowsToProcess),
    };
    const res = await axios.post("/storyboard/batchSuperScoreImage", payload);
    updateRowsByIds(res.data, "isSuperScored");
    antMessage.success("超分成功");
  } catch {
    antMessage.error("超分失败");
  } finally {
    setLoadingByIds(processingIds, "superScoreLoading", false);
  }
}

async function handleBatchGeneratePrompts() {
  const selectedRows = getSelectedRows();
  if (selectedRows.length === 0) {
    antMessage.warning("请先选择要生成提示词的图片");
    return;
  }

  const rowsToProcess = selectedRows.filter((row) => !row.videoPromptLoading);
  if (rowsToProcess.length === 0) {
    antMessage.warning("所选图片正在处理中");
    return;
  }

  const alreadyGenerated = rowsToProcess.filter((row) => row.isVideoPromptGenerated);
  if (alreadyGenerated.length > 0) {
    antMessage.info(`其中 ${alreadyGenerated.length} 条已生成，将重新处理`);
  }

  const processingIds = rowsToProcess.map((row) => row.id);
  setLoadingByIds(processingIds, "videoPromptLoading", true);

  // 统计结果
  let successCount = 0;
  let failedCount = 0;

  // 并发请求，每个请求完成后立即更新 UI
  const requests = rowsToProcess.map((row) =>
    axios
      .post("/storyboard/generateVideoPrompt", {
        scriptId: row.scriptId,
        projectId: row.projectId,
        id: row.id,
        prompt: row.prompt,
        src: row.src,
        narration: row.narration,
      })
      .then((res) => {
        // 请求成功，立即更新该行数据
        updateRowsByIds([res.data], "isVideoPromptGenerated");
        // 清除该行的 loading 状态
        updateRowField(row.id, "videoPromptLoading", false);
        refreshTable();
        successCount++;
      })
      .catch((err) => {
        // 请求失败，清除该行的 loading 状态
        updateRowField(row.id, "videoPromptLoading", false);
        refreshTable();
        failedCount++;
        console.error(`生成失败 [${row.id}]:`, err?.response?.data?.message || err?.message);
      }),
  );

  // 等待所有请求完成
  await Promise.all(requests);

  // 显示最终结果消息
  if (failedCount === 0) {
    antMessage.success(`全部生成成功 (${successCount} 条)`);
  } else if (successCount === 0) {
    antMessage.error(`全部生成失败 (${failedCount} 条)`);
  } else {
    antMessage.warning(`成功 ${successCount} 条，失败 ${failedCount} 条`);
  }
}

function handleOk() {
  axios
    .post("/storyboard/keepStoryboard", {
      results: imageData.value?.map((item) => ({
        videoPrompt: item.videoPrompt,
        prompt: item.prompt,
        duration: item.duration,
        projectId: item.projectId,
        filePath: item.filePath,
        type: item.type,
        name: item.name,
        scriptId: item.scriptId,
        segmentId: item.segmentId,
        shotIndex: item.shotIndex,
        dialogue: item.dialogue ?? "",
        narration: item.narration ?? "",
      })),
    })
    .then(() => {
      antMessage.success("保存成功");
      emit("save");
    })
    .catch(() => {
      antMessage.error("保存失败");
    })
    .finally(() => {
      detectionImageShow.value = false;
      modalShow.value = false;
    });
}
</script>

<style lang="scss" scoped>
.detection-image {
  :deep(.detection-modal) {
    .ant-modal-content {
      border-radius: 12px;
      overflow: hidden;
    }

    .ant-modal-header {
      padding: 0;
      border: none;
    }

    .ant-modal-body {
      padding: 0 24px;
    }

    .ant-modal-footer {
      border: none;
      padding: 0 24px 20px;
    }
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
  border-bottom: 1px solid #e9d5ff;
  margin: -20px -24px 0;

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
  padding: 16px 0;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 16px;

  .toolbar-left {
    .select-info {
      font-size: 13px;
      color: #666;

      strong {
        color: var(--mainColor);
        font-weight: 600;
        margin: 0 2px;
      }
    }
  }

  .toolbar-right {
    display: flex;
    gap: 12px;
  }
}

.table-wrapper {
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;

  :deep(.vxe-table) {
    .vxe-header--column {
      background: #fafafa;
      font-weight: 600;
      color: #333;
    }

    .vxe-body--row {
      &.row--hover {
        background: #faf5ff;
      }

      &.row--current {
        background: #f3e8ff;
      }
    }

    .vxe-checkbox--icon {
      color: var(--mainColor);
    }

    .vxe-cell--edit-icon {
      color: #999;
    }
  }
}

.image-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 0;

  .image-wrapper {
    position: relative;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid #eee;

    &.loading {
      opacity: 0.7;
    }
  }

  .status-tag {
    font-size: 11px;
  }
}

.prompt-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  min-width: 200px;

  .prompt-text {
    min-width: 50px;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #333;
    font-size: 13px;
  }

  &.video {
    .prompt-text {
      color: #666;
    }
  }

  .inline-tag {
    flex-shrink: 0;
    font-size: 11px;
  }
}

.duration-text {
  font-weight: 500;
  color: #333;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;

  .footer-info {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #999;
  }

  .footer-actions {
    display: flex;
    gap: 12px;
  }
}
</style>
