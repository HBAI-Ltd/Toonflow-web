<template>
  <div class="task">
    <div class="header">
      <div class="headerInfo fc">
        <span class="title">任务列表</span>
        <span class="sub">您的最新任务执行记录</span>
      </div>
      <t-button @click="getTaskList">
        <template #icon>
          <i-redo :size="20" />
        </template>
        刷新
      </t-button>
    </div>
    <div class="list">
      <div class="search f">
        <t-select label="任务大类：" v-model="taskClass" :options="categoryOptions" @change="onFilterChange" />
        <t-select label="状态：" v-model="taskState" :options="stateOptions" @change="onFilterChange" style="margin-left: 20px" />
      </div>
      <div class="content">
        <t-table :data="taskList" :columns="columns" row-key="id" :loading="pagination.loading" hover stripe>
          <template #state="{ row }">
            <t-tooltip v-if="row.state === '生成失败'" :content="row.reason || '暂无失败原因'" placement="top">
              <span class="stateText stateFail">{{ row.state }}</span>
            </t-tooltip>
            <span v-else class="stateText" :class="row.state === '进行中' ? 'stateRunning' : 'stateSuccess'">
              {{ row.state }}
            </span>
          </template>
          <template #startTime="{ row }">
            <span>{{ dayjs(row.startTime).format("YYYY-MM-DD HH:mm:ss") }}</span>
          </template>
        </t-table>
        <t-pagination
          class="paginationWrap"
          v-model:current="pagination.page"
          v-model:pageSize="pagination.limit"
          show-sizer
          :total="pagination.total"
          @page-size-change="getTaskList"
          @current-change="getTaskList" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import dayjs from "dayjs";
import axios from "@/utils/axios";
import projectStore from "@/stores/project";

const { project } = storeToRefs(projectStore());

interface TaskItem {
  id: number;
  taskClass: string;
  relatedObjects: string;
  model: string;
  projectName: string;
  episode: string;
  state: string;
  startTime: number;
  describe?: string;
  reason?: string;
}

const columns = [
  { colKey: "taskClass", title: "任务大类", width: 120, ellipsis: true },
  { colKey: "relatedObjects", title: "关联对象", width: 120, ellipsis: true },
  { colKey: "model", title: "模型", width: 280, ellipsis: true },
  { colKey: "describe", title: "描述", ellipsis: true },
  { colKey: "state", title: "状态", width: 100, cell: "state" },
  { colKey: "startTime", title: "时间", width: 200, cell: "startTime" },
];

const stateOptions = [
  { label: "全部", value: "" },
  { label: "进行中", value: "进行中" },
  { label: "已完成", value: "已完成" },
  { label: "生成失败", value: "生成失败" },
];

const pagination = ref({ page: 1, limit: 10, total: 0, loading: false });
const categoryOptions = ref<{ label: string; value: string }[]>([]);
const taskClass = ref("");
const taskState = ref("");
const taskList = ref<TaskItem[]>([]);

onMounted(() => {
  getTaskList();
  getCategories();
});

function onFilterChange() {
  pagination.value.page = 1;
  getTaskList();
}

async function getCategories() {
  const { data } = await axios.post("/task/getTaskCategories", { projectId: project.value?.id }).catch(() => ({ data: [] }));
  categoryOptions.value = [{ label: "全部", value: "" }, ...data.map((i: any) => ({ label: i.taskClass, value: i.taskClass }))];
}

async function getTaskList() {
  pagination.value.loading = true;
  try {
    const { data } = await axios.post("/task/getMyTaskApi", {
      page: pagination.value.page,
      limit: pagination.value.limit,
      taskClass: taskClass.value,
      state: taskState.value,
      projectId: project.value?.id,
    });
    taskList.value = data.data;
    pagination.value.total = data.total;
  } catch {
    window.$message.error("获取任务列表失败");
  } finally {
    pagination.value.loading = false;
  }
}
</script>

<style lang="scss" scoped>
.task {
  .header {
    padding-top: 2rem;
    margin-bottom: 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    .title {
      font-size: 2rem;
      font-weight: 600;
    }
    .sub {
      opacity: 0.5;
    }
  }
  .stateText {
    font-weight: bold;
  }
  .stateFail {
    color: #ff4d4f;
    cursor: pointer;
  }
  .stateRunning {
    color: #1890ff;
  }
  .stateSuccess {
    color: #52c41a;
  }
  .paginationWrap {
    margin-top: 10px;
  }
}
</style>
