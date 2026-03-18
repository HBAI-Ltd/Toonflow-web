<template>
  <div class="event">
    <t-space>
      <t-button v-if="eventData.length > 0" theme="primary" @click="regenerateEvents">
        <template #icon>
          <i-flash-payment theme="outline" />
        </template>
        重新生成事件
      </t-button>
      <t-button theme="danger" :disabled="selectedRowKeys.length === 0" @click="handleBatchDelete">
        <template #icon>
          <t-icon name="delete" />
        </template>
        批量删除 {{ selectedRowKeys.length > 0 ? `(${selectedRowKeys.length})` : "" }}
      </t-button>
    </t-space>

    <div class="data">
      <t-table
        style="margin-top: 10px"
        :columns="columns"
        :data="eventData"
        :max-height="600"
        :selected-row-keys="selectedRowKeys"
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
        <template #empty>
          <div class="empty c" style="flex-direction: column; gap: 12px">
            <span>暂无事件数据，点击开始生成</span>
            <t-button v-if="!isGenerating" theme="primary" @click="generateEvent">
              <template #icon>
                <i-flash-payment theme="outline" />
              </template>
              生成事件
            </t-button>
          </div>
        </template>
        <template #loading>
          <div class="t-table--loading-message">
            <span v-if="isGenerating">🎬 事件生成中，请稍候...</span>
            <span v-else>加载中...</span>
          </div>
        </template>
        <template #chapters="{ row }">
          <span>{{ row.chapters.join("，") }}</span>
        </template>
        <template #createTime="{ row }">
          <span>{{ dayjs(row.createTime).format("YYYY-MM-DD HH:mm:ss") }}</span>
        </template>
        <template #operation="{ row }">
          <t-space :size="0">
            <t-button theme="danger" variant="text" @click="handleDelete(row)">
              <template #icon>
                <t-icon name="delete" />
              </template>
              删除
            </t-button>
          </t-space>
        </template>
      </t-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
import dayjs from "dayjs";
import projectStore from "@/stores/project";
const { project } = storeToRefs(projectStore());
// 分页信息
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0,
});
// 加载状态
const loading = ref(false);
// 选中行
const selectedRowKeys = ref<Array<string | number>>([]);
// 事件数据
const eventData = ref<{ id: number; eventName: string; chapters: string; detail: string; createTime: number }[]>([]);
//表格表头
const columns = ref<Record<string, unknown>[]>([
  {
    colKey: "row-select",
    type: "multiple",
    width: 50,
    align: "center",
  },
  { colKey: "id", title: "事件ID", width: 50, align: "center" },
  { colKey: "eventName", title: "事件名称", width: 150, align: "center" },
  { colKey: "chapters", title: "来源章节", width: 150, align: "center" },
  { colKey: "detail", title: "事件过程", width: 400, ellipsis: true },
  { colKey: "createTime", title: "创建时间", width: 200, align: "center" },
  { colKey: "operation", title: "操作", width: 150, align: "center" },
]);
// 生成状态
const isGenerating = ref(false);

// 处理分页变化
function handlePageChange(pageInfo: { current: number; pageSize: number }) {
  pagination.value.page = pageInfo.current;
  pagination.value.pageSize = pageInfo.pageSize;
  getEvents();
}
// 获取小说事件列表
async function getEvents() {
  loading.value = true;
  try {
    const { data } = await axios.post("/novel/event/getEvent", {
      projectId: project.value?.id,
      page: pagination.value.page,
      limit: pagination.value.pageSize,
    });
    eventData.value = data.list;
    pagination.value.total = data.total;
  } catch (e) {
    window.$message.error((e as any).message);
    console.error("获取小说原文列表失败:", e);
  } finally {
    loading.value = false;
  }
}
// 处理删除事件
function handleDelete(row: Record<string, unknown>) {
  const dialog = DialogPlugin.confirm({
    header: "删除事件",
    body: `确定要删除这个事件吗？`,
    onConfirm: async () => {
      await axios.post("/novel/event/deletEvent", {
        id: row.id,
      });
      getEvents();
      MessagePlugin.success("删除成功");
      dialog.destroy();
    },
  });
}

// 开始生成事件
function generateEvent() {
  isGenerating.value = true;
  loading.value = true;
  axios
    .post("/novel/event/generateEvents", {
      projectId: project.value?.id,
    })
    .then((response) => {
      getEvents();
      MessagePlugin.success("事件生成成功");
    })
    .catch((e) => {
      MessagePlugin.error((e as Error).message);
    })
    .finally(() => {
      isGenerating.value = false;
      loading.value = false;
    });
}
// 重新生成事件
function regenerateEvents() {
  console.log("重新生成事件");
  eventData.value = [];
  generateEvent();
}
onMounted(() => {
  getEvents();
});
//处理选择变化
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
      await axios.post("/novel/event/batchDeleteEvent", {
        ids: selectedRowKeys.value,
      });
      getEvents();
      MessagePlugin.success("批量删除成功");
      dialog.destroy();
    },
  });
}
</script>

<style lang="scss" scoped>
.event {
  margin-top: 20px;
  .data {
    margin-top: 10px;
  }
}
</style>
