<template>
  <div class="batchGeneration">
    <t-dialog
      v-model:visible="batchGenerationShow"
      header="批量生成"
      top="3vh"
      width="80vw"
      :maskClosable="false"
      wrapClassName="no-header-margin"
      dialogClass="custom-modal"
      :footer="true"
      @close-btn-click="handleCancel"
      @confirm="onConfirm"
      @cancel="handleCancel">
      <div class="content">
        <div class="toolbar">
          <t-space>
            <span class="selectedInfo">已选择 {{ selectedRowKeys.length }} 项</span>
            <t-button theme="primary" size="small" @click="handleSelectAll">全选</t-button>
            <t-button theme="default" size="small" @click="handleClearSelection">清空选择</t-button>
          </t-space>
          <t-input v-model="searchText" placeholder="搜索资产名称..." clearable style="width: 400px; margin-left: 10px">
            <template #prefix-icon>
              <t-icon name="search" />
            </template>
          </t-input>
          <div class="btn">
            <t-button theme="primary" @click="handleBatchGeneratePrompt" :loading="textLoading" :disabled="textLoading">
              <div class="ac">
                <i-translate theme="outline" size="20" />
                生成提示词
              </div>
            </t-button>
            <t-button theme="primary" style="margin-left: 10px" @click="handleBatchGenerateImage" :loading="imageLoading" :disabled="imageLoading">
              <div class="ac">
                <i-pic theme="outline" size="20" />
                生成图片
              </div>
            </t-button>
          </div>
        </div>
        <t-table
          :columns="columns"
          :data="filteredData"
          :selected-row-keys="selectedRowKeys"
          row-key="id"
          hover
          stripe
          size="small"
          :pagination="pagination"
          :loading="loading"
          table-layout="fixed"
          max-height="60vh"
          @select-change="handleSelectChange"
          @page-change="handlePageChange">
          <template #preview="{ row }">
            <div class="previewCell">
              <t-image-viewer :images="[row.filePath]" :closeOnEscKeydown="true" :closeOnOverlay="true">
                <template #trigger="{ open }">
                  <div class="imageTrigger" @click="row.filePath && open()">
                    <img v-if="row.filePath" :src="row.filePath" :alt="row.name" class="previewImage" />
                    <div v-else class="noImage">
                      <t-icon name="image" size="24px" />
                    </div>
                    <div v-if="row.filePath" class="imageHoverOverlay">
                      <t-icon name="browse" size="20px" />
                      <span class="hoverText">预览</span>
                    </div>
                  </div>
                </template>
              </t-image-viewer>
            </div>
          </template>
          <template #prompt="{ row }">
            <t-tooltip :content="row.prompt" placement="top">
              <t-textarea placeholder="请输入内容" v-model="row.prompt" />
            </t-tooltip>
          </template>
        </t-table>
      </div>
      <template #footer>
        <t-space>
          <t-button theme="default" @click="handleCancel">取消</t-button>
          <t-button theme="primary" @click="onConfirm" :disabled="selectedRowKeys.length === 0">保存选中 ({{ selectedRowKeys.length }})</t-button>
        </t-space>
      </template>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import settingStore from "@/stores/setting";
const { otherSetting } = storeToRefs(settingStore());
import { MessagePlugin } from "tdesign-vue-next";
import axios from "@/utils/axios";
import store from "@/stores";
import type { TableProps } from "tdesign-vue-next";

const batchGenerationShow = defineModel<boolean>({
  default: false,
});

// 表格列配置
const columns: TableProps["columns"] = [
  { colKey: "row-select", type: "multiple", width: 50, align: "center", fixed: "left" },
  {
    colKey: "filePath",
    title: "预览图",
    width: 100,
    align: "center",
    cell: "preview",
  },
  {
    colKey: "name",
    title: "名称",
    width: 150,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "prompt",
    title: "提示词",
    minWidth: 200,
    align: "left",
    ellipsis: true,
    cell: "prompt",
  },
];

// 表格数据
interface AssetItem {
  id: number;
  name: string;
  image?: string;
  prompt: string;
  type?: string;
  describe?: string;
  filePath?: string;
  remark?: string;
}

// 类型映射：中文类型 -> 英文类型
const typeMap: Record<string, string> = {
  角色: "character",
  场景: "scene",
  道具: "props",
};

const tableData = ref<AssetItem[]>([]);
const localData = ref<AssetItem[]>([]);
const rowPromptLoading = ref<Record<number, boolean>>({});
const rowImageLoading = ref<Record<number, boolean>>({});

// 选中的行
const selectedRowKeys = ref<number[]>([]);
const searchText = ref("");
const loading = ref(false);

// 分页配置
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
});

// 直接使用表格数据，搜索由后端处理
const filteredData = computed(() => {
  return tableData.value;
});

// 选择变化处理
function handleSelectChange(value: any[]) {
  selectedRowKeys.value = value;
}

// 全选
function handleSelectAll() {
  selectedRowKeys.value = filteredData.value.map((item) => item.id);
}

// 清空选择
function handleClearSelection() {
  selectedRowKeys.value = [];
}
const { projectId } = storeToRefs(store());
const props = defineProps<{
  type: string;
}>();
watch(
  () => batchGenerationShow.value,
  (newVal) => {
    if (newVal) {
      localData.value = [];
      handlePageChange({ current: 1, pageSize: pagination.value.pageSize });
    }
  },
);

watch(
  () => searchText.value,
  () => {
    if (batchGenerationShow.value) {
      handlePageChange({ current: 1, pageSize: pagination.value.pageSize });
    }
  },
);

// 分页变化
async function handlePageChange(pageInfo: { current: number; pageSize: number }) {
  // 先更新分页信息
  pagination.value.current = pageInfo.current;
  pagination.value.pageSize = pageInfo.pageSize;

  try {
    loading.value = true;
    const { data } = await axios.post("/assets/batchGenerationData", {
      projectId: projectId.value,
      type: props.type,
      name: searchText.value || undefined,
      page: pageInfo.current,
      limit: pageInfo.pageSize,
    });

    const newData = data.data || [];
    tableData.value = newData;
    localData.value = JSON.parse(JSON.stringify(newData)); // 深拷贝避免引用问题
    pagination.value.total = data.total || 0;
    return tableData.value;
  } catch (error) {
    console.error("加载资产数据失败:", error);
    tableData.value = [];
    pagination.value.total = 0;
  } finally {
    loading.value = false;
  }
}

function closeModal(): void {
  // 取消正在进行的生成任务
  promptGenerateCancel.value = true;
  imageGenerateCancel.value = true;
  
  batchGenerationShow.value = false;
  selectedRowKeys.value = [];
  searchText.value = "";
}

function handleCancel() {
  closeModal();
}
async function processBatch<T>(list: T[], handler: (item: T) => Promise<void>) {
  const batchSize = otherSetting.value.assetsBatchGenereateSize || 5; // 从设置中获取批量生成的大小，默认为5
  for (let i = 0; i < list.length; i += batchSize) {
    await Promise.all(list.slice(i, i + batchSize).map(handler));
  }
}
const emit = defineEmits(["update"]);

async function onConfirm() {
  if (selectedRowKeys.value.length === 0) {
    MessagePlugin.warning("请至少选择一个资产");
    return;
  }
  const selectedAssets = tableData.value.filter((item) => selectedRowKeys.value.includes(item.id));
  if (selectedAssets.length === 0) {
    MessagePlugin.error("请选择要保存的项目");
    return;
  }

  try {
    await processBatch(selectedAssets, async (item) => {
      await axios.post("/assets/updateAssets", {
        id: item.id,
        name: item.name,
        describe: item.describe ?? "",
        type: item.type,
        remark: item.remark ?? "",
        prompt: item.prompt,
      });
      if (item.filePath) {
        await axios.post("/assets/saveAssets", {
          id: item.id,
          base64: "",
          filePath: item.filePath,
          prompt: item.prompt,
          projectId: projectId.value,
        });
      }
    });

    MessagePlugin.success("保存成功");
    emit("update"); // 通知父组件更新数据
    closeModal();
  } catch (error) {
    console.error("保存失败:", error);
    MessagePlugin.error("保存失败,请重试");
  }
}
const textLoading = ref(false);
const promptGenerateCancel = ref(false);
// 生成提示词
async function handleBatchGeneratePrompt() {
  const selectedAssets = tableData.value.filter((item) => selectedRowKeys.value.includes(item.id));
  if (selectedAssets.length === 0) {
    MessagePlugin.error("请至少选择一个资产");
    return;
  }
  promptGenerateCancel.value = false;
  textLoading.value = true;
  const batchSize = otherSetting.value.assetsBatchGenereateSize || 5; // 从设置中获取批量生成的大小，默认为5
  try {
    for (let i = 0; i < selectedAssets.length; i += batchSize) {
      if (promptGenerateCancel.value) throw new Error("已取消生成");
      const batch = selectedAssets.slice(i, i + batchSize);
      await Promise.allSettled(batch.map((item) => generatePrompt(item)));
    }
    MessagePlugin.success("提示词生成完成");
  } catch (e) {
    if (e instanceof Error && e.message !== "已取消生成") {
      MessagePlugin.error(e.message);
    }
  } finally {
    textLoading.value = false;
    promptGenerateCancel.value = false;
  }
}
async function generatePrompt(data: AssetItem) {
  rowPromptLoading.value[data.id] = true;
  try {
    const res = await axios.post("/assets/polishAssetsPrompt", {
      projectId: projectId.value,
      assetsId: data.id,
      type: typeMap[data.type ?? ""] ?? "props",
      name: data.name,
      describe: data.describe ?? "",
    });
    const index = tableData.value.findIndex((item: AssetItem) => item.id === res.data.assetsId);
    if (index !== -1 && !promptGenerateCancel.value) {
      tableData.value[index].prompt = res.data.prompt;
      // 同步更新 localData
      const localIndex = localData.value.findIndex((item: AssetItem) => item.id === res.data.assetsId);
      if (localIndex !== -1) {
        localData.value[localIndex].prompt = res.data.prompt;
      }
    }
  } catch (e: any) {
    MessagePlugin.error(`"${data.name}" ${e?.message ?? "提示词生成失败"}`);
  } finally {
    rowPromptLoading.value[data.id] = false;
  }
}
const imageLoading = ref(false);
const imageGenerateCancel = ref(false);
// 生成图片
async function handleBatchGenerateImage() {
  const selectedAssets = tableData.value.filter((item) => selectedRowKeys.value.includes(item.id));
  if (selectedAssets.length === 0) {
    MessagePlugin.warning("请至少选择一个资产");
    return;
  }
  // 检查是否所有选中的资产都有提示词
  const assetsWithoutPrompt = selectedAssets.filter((item) => !item.prompt || item.prompt.trim() === "");
  if (assetsWithoutPrompt.length > 0) {
    MessagePlugin.warning(`有 ${assetsWithoutPrompt.length} 个资产缺少提示词，请先生成提示词`);
    return;
  }
  imageGenerateCancel.value = false;
  imageLoading.value = true;
  const batchSize = otherSetting.value.assetsBatchGenereateSize || 5; // 从设置中获取批量生成的大小，默认为5
  try {
    for (let i = 0; i < selectedAssets.length; i += batchSize) {
      if (imageGenerateCancel.value) throw new Error("已取消生成");
      const batch = selectedAssets.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map((item) =>
          startGenerate({
            id: item.id,
            name: item.name,
            prompt: item.prompt,
            type: typeMap[item.type ?? ""] ?? "props",
          }),
        ),
      );
    }
    MessagePlugin.success("图片生成完成");
  } catch (e) {
    if (e instanceof Error && e.message !== "已取消生成") {
      MessagePlugin.error(e.message);
    }
  } finally {
    imageLoading.value = false;
    imageGenerateCancel.value = false;
  }
}
async function startGenerate(data: { id: number; prompt: string; name: string; type: string }) {
  if (imageGenerateCancel.value) return;
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
    if (!imageGenerateCancel.value) {
      const index = tableData.value.findIndex((item: AssetItem) => item.id === res.data.assetsId);
      if (index !== -1) {
        tableData.value[index].filePath = res.data.path;
        // 同步更新 localData
        const localIndex = localData.value.findIndex((item: AssetItem) => item.id === res.data.assetsId);
        if (localIndex !== -1) {
          localData.value[localIndex].filePath = res.data.path;
        }
      }
    }
  } catch (e: any) {
    if (!imageGenerateCancel.value) {
      MessagePlugin.error(`"${data.name}" 图片生成失败: ${e?.message ?? "未知错误"}`);
    }
  } finally {
    rowImageLoading.value[data.id] = false;
  }
}
</script>

<style lang="scss" scoped>
.batchGeneration {
  .modalHeader {
    background: var(--td-bg-color-container);
    width: 100%;
    :deep(.ant-typography) {
      color: var(--td-text-color-primary);
      margin: 0;
    }

    :deep(.ant-btn-text) {
      color: var(--td-brand-color);

      &:hover {
        background: var(--td-bg-color-component-hover);
        color: var(--td-brand-color-hover);
      }
    }
  }

  .content {
    padding: 16px 0;

    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding: 0 4px;

      .selectedInfo {
        color: var(--td-text-color-secondary);
        font-size: 14px;
      }
    }

    .previewCell {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 4px 0;

      .imageTrigger {
        position: relative;
        width: 60px;
        height: 60px;
        border-radius: 4px;
        overflow: hidden;
        cursor: pointer;
        border: 1px solid var(--td-component-border);
        transition: all 0.3s ease;

        &:hover {
          border-color: var(--td-brand-color);

          .imageHoverOverlay {
            opacity: 1;
          }
        }

        .previewImage {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .noImage {
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: var(--td-bg-color-component);
          color: var(--td-text-color-placeholder);
        }

        .imageHoverOverlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.6);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.3s ease;
          color: #fff;

          .hoverText {
            font-size: 12px;
          }
        }
      }
    }

    .promptText {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: help;
    }

    :deep(.t-table) {
      .t-table__header {
        background-color: var(--td-bg-color-container);

        th {
          background-color: var(--td-bg-color-container);
          color: var(--td-text-color-primary);
          font-weight: 600;
        }
      }

      .t-table__body {
        tr:hover {
          background-color: var(--td-bg-color-container-hover);
        }
      }

      .t-table__cell {
        color: var(--td-text-color-primary);
      }
    }
  }

  :deep(.t-dialog__footer) {
    border-top: 1px solid var(--td-component-border);
    padding: 16px 24px;
  }
}
</style>
