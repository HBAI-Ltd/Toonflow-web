<template>
  <div class="novel" ref="novelRef">
    <div class="headBtn jb ac" ref="headBtnRef">
      <t-space>
        <t-tooltip :disabled="!importLocked" :content="$t('workbench.novel.batch.verticalImportLocked')" placement="bottom">
          <t-button theme="primary" :disabled="importLocked" @click="importNovelFn">
            <template #icon>
              <t-icon name="add" />
            </template>
            {{ $t(isExplainer ? "workbench.novel.explainer.importText" : "workbench.novel.importText") }}
          </t-button>
        </t-tooltip>
        <t-tooltip v-if="isExplainer" content="生成出题提示词并复制到剪贴板，粘贴到 AI 对话生成新题材" placement="bottom">
          <t-button @click="handleRandomTopic">
            <template #icon>
              <i-refresh size="14" />
            </template>
            随机题材
          </t-button>
        </t-tooltip>
        <t-button theme="danger" :disabled="selectedRowKeys.length === 0" @click="handleBatchDelete">
          <template #icon>
            <t-icon name="delete" />
          </template>
          {{ $t("workbench.novel.batchDelete") }} {{ selectedRowKeys.length > 0 ? `(${selectedRowKeys.length})` : "" }}
        </t-button>
        <t-button v-if="!isExplainer" @click="startEventAnalysis" :disabled="selectedRowKeys.length === 0">
          <template #icon>
            <t-icon name="analytics" />
          </template>
          {{ $t(isExplainer ? "workbench.novel.explainer.extract" : "workbench.novel.eventAnalysis") }}
          {{ selectedRowKeys.length > 0 ? `(${selectedRowKeys.length})` : "" }}
        </t-button>
      </t-space>
      <div class="f">
        <t-input v-model="searchText" :placeholder="$t(isExplainer ? 'workbench.novel.explainer.searchPlaceholder' : 'workbench.novel.searchPlaceholder')" clearable style="width: 260px" />
        <t-button @click="onChange" style="margin-left: 10px">
          <template #icon><t-icon name="search" /></template>
          {{ $t("workbench.novel.search") }}
        </t-button>
      </div>
    </div>

    <div class="batchGroups">
      <section v-for="group in chapterGroups" :key="group.key" class="batchGroup">
        <div class="batchHeader f ac jb">
          <div class="batchInfo f ac">
            <span class="batchName">{{ group.name }}</span>
            <t-tag size="small" variant="light">
              {{ $t(isExplainer ? "workbench.novel.explainer.chapterCount" : "workbench.novel.batch.chapterCount", { count: group.chapterCount }) }}
            </t-tag>
            <span v-if="group.createTime" class="batchDate">{{ dayjs(group.createTime).format("YYYY-MM-DD") }}</span>
            <t-tag v-if="group.isNew" size="small" variant="light" theme="warning">{{ $t("workbench.novel.batch.new") }}</t-tag>
          </div>
          <div v-if="group.id" class="batchActions f ac">
            <t-button size="small" theme="primary" @click="goGenerateScript(group)">
              <template #icon><t-icon name="arrow-right" /></template>
              {{ $t("workbench.novel.batch.generateScript") }}
            </t-button>
            <t-dropdown trigger="click" :options="batchMenuOptions" @click="(option: any) => handleBatchMenuClick(group, option)">
              <t-button size="small" variant="outline">
                <template #icon><t-icon name="more" /></template>
                {{ $t("workbench.novel.batch.more") }}
              </t-button>
            </t-dropdown>
          </div>
        </div>

        <t-table
          :key="group.key"
          :columns="columns"
          :data="group.rows"
          :selected-row-keys="selectedRowKeys"
          :select-on-row-click="true"
          :keyboard-row-hover="false"
          row-key="id"
          hover
          stripe
          size="small"
          :loading="loading"
          table-layout="fixed"
          @select-change="handleSelectChange">
          <template #event="{ row }">
            <t-tag v-if="isExplainer && row.eventState == 2" theme="warning" variant="light">等待预审</t-tag>
            <t-loading v-else-if="row.eventState == 0" size="small" :text="$t('workbench.novel.generating')"></t-loading>
            <t-button
              v-else-if="row.eventState == -1 && !row.event"
              theme="danger"
              variant="text"
              size="small"
              @click.stop="openPreview($t('workbench.novel.genFailed'), row?.errorReason)">
              {{ $t("workbench.novel.genFailed") }}
            </t-button>
            <div v-else class="eventCell">
              <div class="eventPreview">{{ formatPreview(row.event) }}</div>
              <t-link
                v-if="row.event && row.event.length > PREVIEW_MAX_LENGTH"
                theme="success"
                hover="color"
                @click="openPreview($t('workbench.novel.col.event'), row.event)">
                {{ $t("workbench.novel.viewDetail") }}
              </t-link>
            </div>
          </template>
          <template #chapterData="{ row }">
            <div class="chapterDataCell">
              <div class="chapterPreview">{{ formatPreview(row.chapterData) }}</div>
              <t-link
                v-if="row.chapterData && row.chapterData.length > PREVIEW_MAX_LENGTH"
                theme="success"
                hover="color"
                @click.stop="openPreview($t('workbench.novel.col.chapterData'), row.chapterData)">
                {{ $t("workbench.novel.viewDetail") }}
              </t-link>
            </div>
          </template>
          <template #operation="{ row }">
            <t-space :size="0">
              <t-button theme="primary" :disabled="row.eventState == 0" variant="text" @click="handleEdit(row)">
                <template #icon>
                  <t-icon name="edit" />
                </template>
                {{ $t("workbench.novel.edit") }}
              </t-button>
              <t-button theme="danger" :disabled="row.eventState == 0" variant="text" @click="handleDelete(row)">
                <template #icon>
                  <t-icon name="delete" />
                </template>
                {{ $t("workbench.novel.delete") }}
              </t-button>
            </t-space>
          </template>
        </t-table>
      </section>
      <div v-if="!loading && chapterGroups.length === 0" class="emptyState">
        <t-empty :title="$t(isExplainer ? 'workbench.novel.explainer.empty' : 'workbench.novel.batch.empty')" />
      </div>
    </div>

    <t-pagination
      class="pagination"
      :current="pagination.page"
      :page-size="pagination.pageSize"
      :total="pagination.total"
      size="small"
      @change="handlePageChange" />

    <t-dialog v-model:visible="previewVisible" :header="previewTitle" width="900px" placement="top" top="10vh" destroy-on-close :footer="false">
      <div class="previewDialogContent">{{ previewContent || $t("workbench.novel.none") }}</div>
    </t-dialog>

    <t-dialog
      v-model:visible="renameVisible"
      :header="$t('workbench.novel.batch.rename')"
      width="480px"
      placement="center"
      :confirm-btn="$t('workbench.novel.batch.save')"
      :cancel-btn="$t('workbench.novel.batch.cancel')"
      :confirm-loading="renameLoading"
      @confirm="confirmRename">
      <t-input v-model="renameValue" :placeholder="$t('workbench.novel.batch.namePlaceholder')" :maxlength="60" @enter="confirmRename" />
    </t-dialog>

    <importNovel v-model="importNovelShow" @select="handleImported" />
    <editNodel v-model="editNodelShow" :formData="formData" @select="getNovel" />
  </div>
</template>

<script setup lang="ts">
import dayjs from "dayjs";
import axios from "@/utils/axios";
import importNovel from "./components/importNovel.vue";
import editNodel from "./components/editNodel.vue";
import projectStore from "@/stores/project";
import settingStore from "@/stores/setting";
const { otherSetting } = storeToRefs(settingStore());
const { project } = storeToRefs(projectStore());
const router = useRouter();

interface OriginalText {
  id: number;
  index: number;
  reel: string;
  chapter: string;
  chapterData: string;
  event: string;
  eventState?: number;
  errorReason?: string;
  importId?: number | null;
}

interface ImportBatch {
  id: number;
  projectId: string;
  name: string;
  createTime: string | number;
  chapterCount: number;
  minChapterIndex: number;
  maxChapterIndex: number;
  scriptCount: number;
}

interface ChapterGroup {
  key: string;
  id?: number;
  name: string;
  createTime?: string | number;
  chapterCount: number;
  rows: OriginalText[];
  isNew?: boolean;
}

// 搜索文本
const searchText = ref("");
const tableRef = ref();
const novelRef = ref();
const headBtnRef = ref();
// 科普形态：界面切换为「知识文本」体系；超短剧已有批次时锁定导入（一本小说一部剧）
const isExplainer = computed(() => project.value?.contentFormat === "explainer_video");
const importLocked = computed(() => project.value?.contentFormat === "vertical_episode" && importBatches.value.length > 0);
// 表头
const columns = computed<Record<string, unknown>[]>(() => [
  {
    colKey: "row-select",
    type: "multiple",
    width: 50,
    align: "center",
  },
  {
    colKey: "index",
    title: $t("workbench.novel.col.id"),
    width: 50,
    align: "center",
  },
  { colKey: "reel", title: $t("workbench.novel.col.reel"), width: 100, align: "center", cell: "preview" },
  { colKey: "chapter", title: $t(isExplainer.value ? "workbench.novel.explainer.col.title" : "workbench.novel.col.chapter"), width: 100, ellipsis: true },
  { colKey: "chapterData", title: $t(isExplainer.value ? "workbench.novel.explainer.col.content" : "workbench.novel.col.chapterData"), ellipsis: true },
  { colKey: "event", title: $t(isExplainer.value ? "workbench.novel.explainer.col.points" : "workbench.novel.col.event"), ellipsis: true },
  { colKey: "operation", title: $t("workbench.novel.col.operation"), width: 200, align: "center" },
]
  .filter((col) => (isExplainer.value ? (col as { colKey?: string }).colKey !== "reel" : true)));
const editNodelShow = ref(false);
const formData = ref<OriginalText>({ id: -1, index: 0, reel: "", chapter: "", chapterData: "", event: "" });
const PREVIEW_MAX_LENGTH = 80;
const previewVisible = ref(false);
const previewTitle = ref("");
const previewContent = ref("");
const importBatches = ref<ImportBatch[]>([]);
const newImportIds = ref<number[]>([]);
const renameVisible = ref(false);
const renameLoading = ref(false);
const renameValue = ref("");
const renamingBatch = ref<ImportBatch>();

const batchMenuOptions = [
  { value: "rename", content: $t("workbench.novel.batch.rename") },
  { value: "delete", content: $t("workbench.novel.batch.delete"), theme: "error" as const },
  { value: "merge", content: $t("workbench.novel.batch.mergeDisabled"), disabled: true },
];

// 表格数据
const tableData = ref<OriginalText[]>([]);
// 加载状态
const loading = ref(false);
// 选中行
const selectedRowKeys = ref<Array<string | number>>([]);
// 分页
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0,
});

const chapterGroups = computed<ChapterGroup[]>(() => {
  const rowsByImportId = new Map<number, OriginalText[]>();
  const unbatchedRows: OriginalText[] = [];
  const unknownIds: number[] = [];

  tableData.value.forEach((row) => {
    if (row.importId === null || row.importId === undefined) {
      unbatchedRows.push(row);
      return;
    }
    const rows = rowsByImportId.get(row.importId) || [];
    rows.push(row);
    rowsByImportId.set(row.importId, rows);
    if (!importBatches.value.some((batch) => batch.id === row.importId) && !unknownIds.includes(row.importId)) {
      unknownIds.push(row.importId);
    }
  });

  const groups: ChapterGroup[] = importBatches.value
    .filter((batch) => rowsByImportId.has(batch.id))
    .map((batch) => ({
      key: `batch-${batch.id}`,
      id: batch.id,
      name: batch.name || $t("workbench.novel.batch.unnamed"),
      createTime: batch.createTime,
      chapterCount: batch.chapterCount,
      rows: rowsByImportId.get(batch.id) || [],
      isNew: newImportIds.value.includes(batch.id),
    }));

  unknownIds.forEach((importId) => {
    groups.push({
      key: `batch-${importId}`,
      id: importId,
      name: $t("workbench.novel.batch.unknown", { id: importId }),
      chapterCount: rowsByImportId.get(importId)?.length || 0,
      rows: rowsByImportId.get(importId) || [],
    });
  });

  if (unbatchedRows.length) {
    groups.push({
      key: "unbatched",
      name: $t("workbench.novel.batch.unbatched"),
      chapterCount: unbatchedRows.length,
      rows: unbatchedRows,
    });
  }
  return groups;
});

function formatPreview(text?: string) {
  if (!text) return $t("workbench.novel.none");
  if (text.length <= PREVIEW_MAX_LENGTH) return text;
  return `${text.slice(0, PREVIEW_MAX_LENGTH)}...`;
}

function openPreview(title: string, content?: string) {
  previewTitle.value = title;
  previewContent.value = content || "";
  previewVisible.value = true;
}

onMounted(() => {
  getNovel();
  getImportList();
});

onUnmounted(() => {
  stopPolling();
});

function onChange() {
  pagination.value.page = 1;
  getNovel();
}

async function getImportList() {
  try {
    const { data } = await axios.post("/novel/getImportList", { projectId: project.value?.id });
    importBatches.value = Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("获取导入批次失败:", e);
    window.$message.error($t("workbench.novel.batch.msg.loadFailed"));
  }
}

/** 随机题材出题器：后端读取本地模板、查询完整历史并选择分支 */
async function handleRandomTopic() {
  try {
    const { data } = await axios.post("/novel/getTopicGeneratorPrompt", {
      projectId: project.value?.id,
    });
    await navigator.clipboard.writeText(data.prompt);
    window.$message.success("出题提示词已复制，请粘贴到 AI 对话生成新题材");
  } catch (e) {
    console.error("生成出题提示词失败:", e);
    window.$message.error("生成或复制出题提示词失败");
  }
}

function getNovel() {
  loading.value = true;
  axios
    .post("/novel/getNovel", {
      projectId: project.value?.id,
      page: pagination.value.page,
      limit: pagination.value.pageSize,
      search: searchText.value,
    })
    .then((res) => {
      tableData.value = res.data.data;
      pagination.value.total = res.data.total;
    })
    .finally(() => {
      loading.value = false;
    });
}

// 处理分页变化
function handlePageChange(pageInfo: { current: number; pageSize: number }) {
  pagination.value.page = pageInfo.current;
  pagination.value.pageSize = pageInfo.pageSize;
  getNovel();
}

const importNovelShow = ref(false);
// 导入原文
function importNovelFn() {
  importNovelShow.value = true;
}

function handleImported(importIds: number[]) {
  newImportIds.value = importIds.filter((id) => Number.isFinite(id) && id > 0);
  getNovel();
  getImportList();
  // 科普形态：上传后自动跳转到剧本Agent聊天页，进入预审+全流程
  if (isExplainer.value) {
    const importId = newImportIds.value[0];
    router.push({
      path: "/scriptAgent",
      query: {
        projectId: String(project.value?.id ?? ""),
        ...(importId ? { importId: String(importId) } : {}),
      },
    });
  }
}

// 处理选择变化
function handleSelectChange(value: Array<string | number>, context: { selectedRowData: any[] }) {
  selectedRowKeys.value = value.filter(Boolean);
}

// 批量删除
function handleBatchDelete() {
  if (selectedRowKeys.value.length === 0) return;
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.novel.msg.batchDeleteHeader"),
    body: $t("workbench.novel.msg.batchDeleteBody", { count: selectedRowKeys.value.length }),
    onConfirm: async () => {
      await axios.post("/novel/batchDeleteNovel", {
        ids: selectedRowKeys.value,
      });
      getNovel();
      window.$message.success($t("workbench.novel.msg.batchDeleteSuccess"));
      dialog.destroy();
    },
  });
}

function goGenerateScript(group: ChapterGroup) {
  if (!group.id || !project.value?.id) return;
  router.push({
    path: "/scriptAgent",
    query: {
      projectId: project.value.id,
      importId: String(group.id),
    },
  });
}

function handleBatchMenuClick(group: ChapterGroup, option: { value?: string }) {
  if (option.value === "rename") openRenameDialog(group);
  if (option.value === "delete") handleDeleteBatch(group);
}

function openRenameDialog(group: ChapterGroup) {
  if (!group.id) return;
  const batch = importBatches.value.find((item) => item.id === group.id);
  if (!batch) return;
  renamingBatch.value = batch;
  renameValue.value = batch.name || "";
  renameVisible.value = true;
}

async function confirmRename() {
  if (!renamingBatch.value) return;
  const name = renameValue.value.trim();
  if (!name) return window.$message.warning($t("workbench.novel.batch.msg.nameRequired"));
  renameLoading.value = true;
  try {
    await axios.post("/novel/renameImport", { importId: renamingBatch.value.id, name });
    window.$message.success($t("workbench.novel.batch.msg.renameSuccess"));
    renameVisible.value = false;
    await getImportList();
  } catch (e) {
    window.$message.error((e as Error).message || $t("workbench.novel.batch.msg.renameFailed"));
  } finally {
    renameLoading.value = false;
  }
}

function handleDeleteBatch(group: ChapterGroup) {
  if (!group.id || !project.value?.id) return;
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.novel.batch.delete"),
    body: $t("workbench.novel.batch.msg.deleteBody", { name: group.name }),
    confirmBtn: { content: $t("workbench.novel.batch.delete"), theme: "danger" },
    cancelBtn: $t("workbench.novel.batch.cancel"),
    theme: "danger",
    onConfirm: async () => {
      try {
        await axios.post("/novel/deleteImport", {
          projectId: project.value!.id,
          importId: group.id!,
        });
        const removedIds = new Set<number | string>(group.rows.map((row) => row.id));
        selectedRowKeys.value = selectedRowKeys.value.filter((id) => !removedIds.has(id));
        newImportIds.value = newImportIds.value.filter((id) => id !== group.id);
        if (group.rows.length === tableData.value.length && pagination.value.page > 1) {
          pagination.value.page -= 1;
        }
        getNovel();
        getImportList();
        window.$message.success($t("workbench.novel.batch.msg.deleteSuccess"));
      } catch (e) {
        window.$message.error((e as Error).message || $t("workbench.novel.batch.msg.deleteFailed"));
      } finally {
        dialog.destroy();
      }
    },
  });
}

// 编辑
function handleEdit(row: OriginalText) {
  editNodelShow.value = true;
  formData.value = { ...row };
}

// 删除
function handleDelete(row: OriginalText) {
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.novel.msg.deleteHeader"),
    body: $t("workbench.novel.msg.deleteBody", { name: row.chapter }),
    onConfirm: async () => {
      try {
        await axios.post("/novel/delNovel", { id: row.id });
        window.$message.success($t("workbench.novel.msg.deleteSuccess"));
        if (tableData.value.length === 1 && pagination.value.page > 1) {
          pagination.value.page -= 1;
        }
        getNovel();
        getImportList();
      } catch (e) {
        window.$message.error((e as Error).message);
      }
      dialog.destroy();
    },
  });
}

function startEventAnalysis() {
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.novel.msg.eventAnalysisHeader"),
    body: $t("workbench.novel.msg.eventAnalysisBody", { count: selectedRowKeys.value.length }),
    onConfirm: () => {
      dialog.destroy();
      axios
        .post("/novel/event/generateEvents", {
          projectId: project.value?.id!,
          novelIds: selectedRowKeys.value,
          concurrentCount: otherSetting.value.assetsBatchGenereateSize,
        })
        .then(() => {
          selectedRowKeys.value.length = 0;
          getNovel();
        });
    },
  });
}

const notCompultedData = computed(() => {
  return tableData.value.filter((item) => item.eventState === 0);
});

// 轮询相关
let pollingTimer: ReturnType<typeof setInterval> | null = null;

async function pollEventState() {
  if (notCompultedData.value.length === 0) return;
  const ids = notCompultedData.value.map((item) => item.id);
  try {
    const { data } = await axios.post("/novel/getNovelEventState", { ids });
    if (Array.isArray(data)) {
      data.forEach((item: { id: number; eventState: number; event?: string; errorReason?: string }) => {
        const target = tableData.value.find((row) => row.id === item.id);
        if (target) {
          target.eventState = item.eventState;
          if (target.eventState == -1) target.errorReason = item.errorReason;
          if (item.event !== undefined) target.event = item.event;
        }
      });
    }
  } catch (e) {
    console.error("轮询事件状态失败:", e);
  }
}

function startPolling() {
  if (pollingTimer) return;
  pollingTimer = setInterval(async () => {
    if (notCompultedData.value.length === 0) {
      stopPolling();
      return;
    }
    await pollEventState();
  }, 3000);
}

function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

watch(notCompultedData, (val) => {
  if (val.length > 0) {
    startPolling();
  } else {
    stopPolling();
  }
});
</script>

<style lang="scss" scoped>
.novel {
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding-bottom: 16px;
  .headBtn {
    margin-top: 20px;
  }
  .batchGroups {
       flex: 1;
    overflow-y: auto;
  }
  .batchGroup {
    margin-top: 16px;
    .batchHeader {
      gap: 12px;
      padding: 10px 12px;
      border: 1px solid var(--td-border-level-1-color);
      border-bottom: none;
      border-radius: 8px 8px 0 0;
      background-color: var(--td-bg-color-secondarycontainer);
      .batchInfo {
        gap: 8px;
        min-width: 0;
        .batchName {
          max-width: 360px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 600;
        }
        .batchDate {
          font-size: 12px;
          color: var(--td-text-color-secondary);
        }
      }
      .batchActions {
        gap: 8px;
      }
    }
    :deep(.t-table) {
      border: 1px solid var(--td-border-level-1-color);
      border-radius: 0 0 8px 8px;
    }
  }
  .pagination {
    justify-content: flex-end;
    margin-top: 16px;
  }
  .emptyState {
    padding: 80px 0;
  }
}
:deep(.t-table__content) {
  flex: 1;
}

.chapterDataCell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chapterPreview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.eventCell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.eventPreview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.previewDialogContent {
  max-height: 65vh;
  overflow: auto;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
