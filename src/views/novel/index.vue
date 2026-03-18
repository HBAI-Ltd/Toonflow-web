<template>
  <div class="novel">
    <t-tabs v-model="activeKey">
      <t-tab-panel value="To1" label="原文">
        <div class="headBtn jb ac">
          <t-space>
            <t-button theme="primary" @click="importNovelFn">
              <template #icon>
                <t-icon name="add" />
              </template>
              导入原文
            </t-button>
            <t-button theme="danger" :disabled="selectedRowKeys.length === 0" @click="handleBatchDelete">
              <template #icon>
                <t-icon name="delete" />
              </template>
              批量删除 {{ selectedRowKeys.length > 0 ? `(${selectedRowKeys.length})` : "" }}
            </t-button>
          </t-space>
          <t-input v-model="searchText" placeholder="搜索原文名称..." clearable style="width: 260px">
            <template #prefix-icon>
              <t-icon name="search" />
            </template>
          </t-input>
        </div>
        <t-table
          style="margin-top: 10px"
          :columns="columns"
          :data="tableData"
          :max-height="600"
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
          table-layout="fixed"
          @select-change="handleSelectChange"
          @page-change="handlePageChange">
          <template #startTime="{ row }">
            <span>{{ dayjs(row.startTime).format("YYYY-MM-DD HH:mm:ss") }}</span>
          </template>
          <template #operation="{ row }">
            <t-space :size="0">
              <t-button theme="primary" variant="text" @click="handleEdit(row)">
                <template #icon>
                  <t-icon name="edit" />
                </template>
                编辑
              </t-button>
              <t-button theme="danger" variant="text" @click="handleDelete(row)">
                <template #icon>
                  <t-icon name="delete" />
                </template>
                删除
              </t-button>
            </t-space>
          </template>
        </t-table>
      </t-tab-panel>
      <t-tab-panel value="To2" label="事件">
        <event />
      </t-tab-panel>
    </t-tabs>
    <importNovel v-model="importNovelShow" @select="getNovel" />
    <editNodel v-model="editNodelShow" :formData="formData" @select="getNovel" />
  </div>
</template>

<script setup lang="ts">
import dayjs from "dayjs";
import axios from "@/utils/axios";
import importNovel from "./components/importNovel.vue";
import editNodel from "./components/editNodel.vue";
import event from "./components/event.vue";
import projectStore from "@/stores/project";
const { project } = storeToRefs(projectStore());

const activeKey = ref("To1");
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
    title: "序号",
    width: 50,
    align: "center",
  },
  { colKey: "reel", title: "卷", width: 200, align: "center", cell: "preview" },
  { colKey: "chapter", title: "章节名称", width: 500, ellipsis: true },
  { colKey: "chapterData", title: "章节内容", ellipsis: true },
  { colKey: "operation", title: "操作", width: 200, align: "center" },
]);
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
onMounted(getNovel);

watch(searchText, () => {
  pagination.value.page = 1;
  getNovel();
});

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
    header: "批量删除",
    body: `确定要删除选中的 ${selectedRowKeys.value.length} 条数据吗?`,
    onConfirm: async () => {
      console.log("%c Line:163 🎂 selectedRowKeys.value", "background:#ed9ec7", selectedRowKeys.value);

      await axios.post("/novel/batchDeleteNovel", {
        ids: selectedRowKeys.value,
      });
      getNovel();
      MessagePlugin.success("批量删除成功");
      dialog.destroy();
    },
  });
}
const editNodelShow = ref(false);
interface OriginalText {
  id: number;
  index: number;
  reel: string;
  chapter: string;
  chapterData: string;
}
const formData = ref<OriginalText>({ id: -1, index: 0, reel: "", chapter: "", chapterData: "" });
// 编辑
function handleEdit(row: OriginalText) {
  editNodelShow.value = true;
  formData.value = { ...row };
}
// 删除
function handleDelete(row: OriginalText) {
  const dialog = DialogPlugin.confirm({
    header: "删除确认",
    body: `确定要删除章节名称为「${row.chapter}」的数据吗?`,
    onConfirm: async () => {
      try {
        await axios.post("/novel/delNovel", { id: row.id });
        MessagePlugin.success("小说原文删除成功");
        if (tableData.value.length === 1 && pagination.value.page > 1) {
          pagination.value.page -= 1;
        }
        getNovel();
      } catch (e) {
        MessagePlugin.error((e as Error).message);
      }
      MessagePlugin.success("删除成功");
      dialog.destroy();
    },
  });
}
</script>

<style lang="scss" scoped>
.novel {
  .headBtn {
    margin-top: 20px;
  }
}
</style>
