<template>
  <div class="novel" ref="novelRef">
    <div class="headBtn jb ac" ref="headBtnRef">
      <t-space>
        <t-button theme="primary" @click="importNovelFn">
          <template #icon>
            <t-icon name="add" />
          </template>
          {{ $t("workbench.novel.importText") }}
        </t-button>
        <t-button theme="danger" :disabled="selectedRowKeys.length === 0" @click="handleBatchDelete">
          <template #icon>
            <t-icon name="delete" />
          </template>
          {{ $t("workbench.novel.batchDelete") }} {{ selectedRowKeys.length > 0 ? `(${selectedRowKeys.length})` : "" }}
        </t-button>
        <t-button @click="startEventAnalysis" :disabled="selectedRowKeys.length === 0">
          <template #icon>
            <t-icon name="analytics" />
          </template>
          {{ $t("workbench.novel.eventAnalysis") }} {{ selectedRowKeys.length > 0 ? `(${selectedRowKeys.length})` : "" }}
        </t-button>
      </t-space>
      <div class="f">
        <t-input v-model="searchText" :placeholder="$t('workbench.novel.searchPlaceholder')" clearable style="width: 260px" />
        <t-button @click="onChange" style="margin-left: 10px">
          <template #icon><t-icon name="search" /></template>
          {{ $t("workbench.novel.search") }}
        </t-button>
      </div>
    </div>
    <t-table
      ref="tableRef"
      style="margin-top: 10px; flex: 1; display: flex; flex-direction: column"
      :columns="columns"
      :data="tableData"
      :selected-row-keys="selectedRowKeys"
      :select-on-row-click="true"
      :keyboardRowHover="false"
      row-key="id"
      hover
      stripe
      size="small"
      :pagination="pagination"
      :loading="loading"
      lazy-load
      resizable
      table-layout="fixed"
      @select-change="handleSelectChange"
      @page-change="handlePageChange">
      <template #startTime="{ row }">
        <span>{{ dayjs(row.startTime).format("YYYY-MM-DD HH:mm:ss") }}</span>
      </template>
      <template #event="{ row }">
        <t-loading v-if="row.eventState == 0" size="small" :text="$t('workbench.novel.generating')"></t-loading>
        <t-tooltip v-else-if="row.eventState == -1 && !row.event" :content="row?.errorReason">
          <div style="color: red; cursor: pointer">{{ $t("workbench.novel.genFailed") }}</div>
        </t-tooltip>
        <div v-else>
          {{ row.event || $t("workbench.novel.none") }}
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
    <importNovel v-model="importNovelShow" @select="getNovel" />
    <editNodel v-model="editNodelShow" :formData="formData" @select="getNovel" />
  </div>
</template>

<script setup lang="ts">
import dayjs from "dayjs";
import axios from "@/utils/axios";
import importNovel from "./components/importNovel.vue";
import editNodel from "./components/editNodel.vue";
import projectStore from "@/stores/project";
const { project } = storeToRefs(projectStore());

// 搜索文本
const searchText = ref("");
// 表头
const columns = ref<Record<string, unknown>[]>([
  {
    colKey: "row-select",
    type: "multiple",
    width: 50,
    align: "center",
  },
  {
    colKey: "id",
    title: $t("workbench.novel.col.id"),
    width: 50,
    align: "center",
  },
  { colKey: "reel", title: $t("workbench.novel.col.reel"), width: 100, align: "center", cell: "preview" },
  { colKey: "chapter", title: $t("workbench.novel.col.chapter"), width: 100, ellipsis: true },
  { colKey: "chapterData", title: $t("workbench.novel.col.chapterData"), ellipsis: true },
  { colKey: "event", title: $t("workbench.novel.col.event"), ellipsis: true },
  { colKey: "operation", title: $t("workbench.novel.col.operation"), width: 200, align: "center" },
]);
const editNodelShow = ref(false);
interface OriginalText {
  id: number;
  index: number;
  reel: string;
  chapter: string;
  chapterData: string;
  event: string;
  eventState?: number;
}
const formData = ref<OriginalText>({ id: -1, index: 0, reel: "", chapter: "", chapterData: "", event: "" });

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

onMounted(() => {
  getNovel();
});

onUnmounted(() => {
  stopPolling();
});
function onChange() {
  pagination.value.page = 1;
  getNovel();
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
      } catch (e) {
        window.$message.error((e as Error).message);
      }
      window.$message.success($t("workbench.novel.msg.deleteSuccess"));
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
        })
        .then((res) => {
          selectedRowKeys.value.length = 0;
          getNovel();
        });
    },
  });
}

const notCompultedData = computed(() => {
  return tableData.value.filter((item) => !item.eventState);
});

// 轮询相关
let pollingTimer: ReturnType<typeof setInterval> | null = null;

async function pollEventState() {
  if (notCompultedData.value.length === 0) return;
  const ids = notCompultedData.value.map((item) => item.id);
  try {
    const { data } = await axios.post("/novel/getNovelEventState", { ids });
    if (Array.isArray(data)) {
      data.forEach((item: { id: number; eventState: number; event?: string }) => {
        const target = tableData.value.find((row) => row.id === item.id);
        if (target) {
          target.eventState = item.eventState;
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
  padding-bottom: 1rem;
  .headBtn {
    margin-top: 20px;
  }
}
:deep(.t-table__content) {
  flex: 1;
}
</style>
