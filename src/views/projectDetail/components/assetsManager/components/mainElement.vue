<template>
  <div class="mainElement">
    <!-- 顶部操作栏 -->
    <div class="ac jb">
      <div class="buttonGroup f" v-if="!props.radio">
        <a-button
          v-if="!props.batch"
          v-for="item in radioOptions"
          :key="item.value"
          @click="changeFilter(item.value)"
          :type="currentFilter === item.value ? 'primary' : 'default'">
          {{ item.label }}
        </a-button>
      </div>
      <div class="actionBar">
        <template v-if="props.batch">
          <a-button type="primary" @click="handleBatchGeneratePrompt" :loading="batchGeneratePromptLoading">批量润色</a-button>
          <a-button type="primary" @click="handleBatchGeneration" :loading="batchGenerateImageLoading">批量生成图片</a-button>
        </template>
        <template v-if="!props.way">
          <a-button type="primary" @click="batchShow = true">批量生成</a-button>
          <a-button type="primary" @click="addElement" :disabled="isAddDisabled">新增{{ currentFilterLabel }}</a-button>
        </template>
      </div>
    </div>

    <!-- 表格内容 -->
    <div class="tableBody">
      <!-- 分镜脚本选择 -->
      <div class="scriptBody" v-if="isStoryboard">
        <div class="gridScript">
          <a-button
            v-for="script in scriptList"
            :key="script.id"
            :type="currentScriptId === script.id ? 'primary' : 'default'"
            size="large"
            class="rounded-xl font-semibold w-full"
            @click="handleScriptChange(script)">
            {{ script.name }}
          </a-button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="!projectElements.length" class="empty">
        <div class="emptyIcon"><i-ad-product :size="48" /></div>
        <h3 class="emptyTitle">暂无元素</h3>
        <p class="emptyDesc">点击右上角"新增元素"按钮添加场景或道具或根据剧本生成</p>
      </div>

      <!-- 数据表格 -->
      <t-table
        v-else
        ref="tableRef"
        :data="projectElements"
        :columns="tableColumns"
        row-key="id"
        :hover="true"
        :stripe="true"
        :selected-row-keys="selectedRowKeys"
        @select-change="handleSelectChange">
        <template #filePath="{ row }">
          <a-image v-if="row.filePath" :src="row.filePath" :fallback="errorPicture" class="elementImage" />
          <div v-else class="noImage">未生成图片</div>
        </template>
        <template #prompt="{ row }">
          <template v-if="props.batch">
            <a-textarea v-model:value="row.prompt" :auto-size="{ minRows: 2, maxRows: 12 }" />
          </template>
          <template v-else>
            <t-tooltip :content="row.prompt" placement="top">
              <span class="text-ellipsis">{{ row.prompt }}</span>
            </t-tooltip>
          </template>
        </template>
        <template #videoPrompt="{ row }">
          <template v-if="props.batch">
            <a-textarea v-model:value="row.videoPrompt" :auto-size="{ minRows: 2, maxRows: 12 }" />
          </template>
          <template v-else>
            <t-tooltip :content="row.videoPrompt" placement="top">
              <span class="text-ellipsis">{{ row.videoPrompt }}</span>
            </t-tooltip>
          </template>
        </template>
        <template #operation="{ row }">
          <div class="actionBtns">
            <i-pencil class="hoverButton edit" @click="editForm(row)" />
            <i-magic class="hoverButton magic" @click="aiGenerate(row)" />
            <i-delete class="hoverButton delete" @click="deleteFrom(row)" />
          </div>
        </template>
      </t-table>
    </div>

    <!-- 弹窗组件 -->
    <addElementDialog v-model="addDialogShow" :type="currentFilter" :scriptId="currentScriptId!" :data="currentRow" @update="refreshData" />
    <generateImage v-model="imageDialogShow" :data="currentRow" @update="refreshData" />
    <batchGenereate
      v-if="batchGenereate"
      v-model="batchShow"
      :data="projectElements"
      :type="currentFilter"
      :script-id="currentScriptId ?? -1"
      @save="handleBatchSave" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { message, Modal } from "ant-design-vue";
import type { PrimaryTableCol, TableRowData } from "tdesign-vue-next";
import axios from "@/utils/axios";
import errorPicture from "@/utils/error";
import store from "@/stores";
const { projectId, currentScriptId } = storeToRefs(store());
import settingStore from "@/stores/setting";
const { otherSetting } = storeToRefs(settingStore());
import addElementDialog from "./addElementDialog.vue";
import batchGenereate from "./batchGenereate.vue";
import generateImage from "./generateImage.vue";

// 类型定义
interface ElementData {
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

interface ScriptItem {
  id: number;
  name: string;
}

type FilterType = "role" | "scene" | "props" | "storyboard";

// Props & Emits
const props = defineProps<{
  way?: "radio" | "checkbox";
  radio?: FilterType;
  batch?: boolean;
}>();

const emits = defineEmits<{
  checkChange: [{ checked: boolean; row: ElementData }];
  checkAll: [{ checked: boolean; records: ElementData[] }, FilterType, number];
}>();

const selectModal = defineModel<ElementData[]>();

// 常量
const TYPE_MAP: Record<string, string> = {
  角色: "role",
  场景: "scene",
  分镜: "storyboard",
  道具: "props",
};

const RADIO_OPTIONS = [
  { label: "角色", value: "role" },
  { label: "场景", value: "scene" },
  { label: "道具", value: "props" },
  { label: "分镜", value: "storyboard" },
] as const;

// 响应式状态
const tableRef = ref();
const currentFilter = ref<FilterType>("role");
const currentRow = ref<ElementData>();
const scriptList = ref<ScriptItem[]>([]);
const projectElements = ref<ElementData[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);

const addDialogShow = ref(false);
const imageDialogShow = ref(false);
const batchShow = ref(false);
const batchGenerateImageLoading = ref(false);
const batchGeneratePromptLoading = ref(false);

// 表格列配置
const tableColumns = computed<PrimaryTableCol<any>[]>(() => {
  const columns: PrimaryTableCol<ElementData>[] = [];

  // 选择列
  if (props.way) {
    columns.push({
      colKey: "row-select",
      type: props.way === "radio" ? "single" : "multiple",
      title: "请选择",
      width: 100,
    });
  }

  // 基础列
  columns.push(
    { colKey: "name", title: "名称", width: 150, ellipsis: true },
    { colKey: "filePath", title: "元素图片", width: 120, cell: "filePath" },
    { colKey: "intro", title: "详情", ellipsis: true },
    { colKey: "prompt", title: "生图提示词", cell: "prompt", ellipsis: !props.batch },
  );

  // 分镜视频提示词列
  if (isStoryboard.value) {
    columns.push({ colKey: "videoPrompt", title: "视频提示词", cell: "videoPrompt", ellipsis: !props.batch });
  }

  // 备注列
  columns.push({ colKey: "remark", title: "备注", ellipsis: true });

  // 分镜时长列
  if (isStoryboard.value) {
    columns.push({ colKey: "duration", title: "时长(单位：秒)", width: 120 });
  }

  // 操作列
  if (!props.batch) {
    columns.push({ colKey: "operation", title: "操作", width: 150, fixed: "right", cell: "operation" });
  }

  return columns;
});

// 计算属性
const radioOptions = RADIO_OPTIONS;
const isStoryboard = computed(() => currentFilter.value === "storyboard");
const currentFilterLabel = computed(() => radioOptions.find((i) => i.value === currentFilter.value)?.label);
const isAddDisabled = computed(() => !scriptList.value.length && isStoryboard.value);

// 工具函数
const typeToParam = (type: string) => ({ role: "角色", scene: "场景", props: "道具", storyboard: "分镜" })[type] ?? "角色";

// API 请求
const fetchAssets = async (type: string) => {
  const { data } = await axios.post("/assets/getAssets", { projectId: projectId.value, type: typeToParam(type) });
  projectElements.value = data;
};

const fetchScriptList = async () => {
  const { data } = await axios.post("/assets/getScriptList", { projectId: projectId.value });
  return data;
};

const fetchStoryboard = async (scriptId: number) => {
  const { data } = await axios.post("/storyboard/getStoryboard", { projectId: projectId.value, scriptId });
  projectElements.value = data;
};

// 核心方法
const changeFilter = async (type: FilterType) => {
  projectElements.value = [];
  currentFilter.value = type;

  if (type === "storyboard") {
    scriptList.value = await fetchScriptList();
    if (scriptList.value.length) {
      // 如果 store 中已有 currentScriptId 且在列表中存在，则使用它；否则使用第一个
      // 使用 == 进行宽松比较，避免字符串/数字类型不匹配问题
      const existsInList = scriptList.value.some((s) => s.id == currentScriptId.value);
      if (!currentScriptId.value || !existsInList) {
        currentScriptId.value = scriptList.value[0].id;
      }
      await fetchStoryboard(Number(currentScriptId.value));
    }
  } else {
    await fetchAssets(type);
  }
};

const refreshData = () => changeFilter(currentFilter.value);

const handleScriptChange = async (script: ScriptItem) => {
  currentScriptId.value = script.id;
  await fetchStoryboard(script.id);
};

// 批量操作
const batchProcess = async <T,>(list: T[], batchSize: number, processor: (item: T) => Promise<void>) => {
  for (let i = 0; i < list.length; i += batchSize) {
    await Promise.all(list.slice(i, i + batchSize).map(processor));
  }
};

const handleBatchSave = async (list: ElementData[]) => {
  if (!list.length) return message.warning("请至少选择一个资产");

  await batchProcess(list, otherSetting.value.assetsBatchGenereateSize || 5, async (item) => {
    await axios.post("/assets/updateAssets", {
      id: item.id,
      name: item.name,
      intro: item.intro ?? "",
      type: item.type,
      remark: item.remark ?? "",
      prompt: item.prompt,
      duration: Number(item.duration),
    });
    await axios.post("/assets/saveAssets", {
      id: item.id,
      base64: "",
      filePath: item.filePath,
      prompt: item.prompt,
      projectId: projectId.value,
    });
  });

  message.success("保存成功");
  refreshData();
};

const handleBatchGeneration = async () => {
  if (!selectModal.value?.length) return message.warning("请至少选择一个资产");

  batchGenerateImageLoading.value = true;
  try {
    await batchProcess(selectModal.value, 5, async (item) => {
      const { data } = await axios.post("/assets/generateAssets", {
        type: TYPE_MAP[item.type] ?? "props",
        projectId: projectId.value,
        name: item.name,
        prompt: item.prompt,
        id: item.id,
      });
      const target = selectModal.value!.find((i) => i.id === data.assetsId);
      if (target) target.filePath = data.path;
    });
    message.success("图片批量生成成功");
  } finally {
    batchGenerateImageLoading.value = false;
  }
};

const handleBatchGeneratePrompt = async () => {
  if (!selectModal.value?.length) return message.warning("请至少选择一个资产");

  batchGeneratePromptLoading.value = true;
  try {
    await batchProcess(selectModal.value, 5, async (item) => {
      const { data } = await axios.post("/assets/polishAssetsPrompt", {
        projectId: projectId.value,
        assetsId: item.id,
        type: TYPE_MAP[item.type] ?? "props",
        name: item.name,
        describe: item.intro,
      });
      const target = selectModal.value!.find((i) => i.id === data.assetsId);
      if (target) target.prompt = data.prompt;
    });
    message.success("提示词批量生成成功");
  } finally {
    batchGeneratePromptLoading.value = false;
  }
};

// 表格操作
const handleSelectChange = (
  value: any[],
  context: { selectedRowData: any[]; type: string; currentRowKey?: string | number; currentRowData?: any },
) => {
  const oldSelectedKeys = [...selectedRowKeys.value];
  selectedRowKeys.value = value;

  if (props.way === "radio") {
    if (context.currentRowData) {
      emits("checkChange", { checked: true, row: context.currentRowData });
    }
  } else {
    const isCheckAll = context.currentRowKey === "CHECK_ALL_BOX";

    if (isCheckAll) {
      emits("checkAll", { checked: context.type === "check", records: context.selectedRowData }, currentFilter.value, currentScriptId.value ?? -1);
    } else if (context.type === "check" || context.type === "uncheck") {
      let rowData = context.currentRowData;

      if (!rowData) {
        const addedKeys = value.filter((key) => !oldSelectedKeys.includes(key));
        const removedKeys = oldSelectedKeys.filter((key) => !value.includes(key));

        if (addedKeys.length === 1) {
          const key = addedKeys[0];
          rowData = projectElements.value.find((item) => item.id === key);
        } else if (removedKeys.length === 1) {
          const key = removedKeys[0];
          rowData = projectElements.value.find((item) => item.id === key);
        }
      }

      if (rowData) {
        emits("checkChange", { checked: context.type === "check", row: rowData });
      }
    } else if (context.type === "check-all" || context.type === "uncheck-all") {
      emits(
        "checkAll",
        { checked: context.type === "check-all", records: context.selectedRowData },
        currentFilter.value,
        currentScriptId.value ?? -1,
      );
    }
  }

  // 更新 selectModal
  if (selectModal.value !== undefined) {
    selectModal.value = context.selectedRowData;
  }
};

// CRUD 操作
const addElement = () => {
  currentRow.value = { id: 0, name: "", intro: "", duration: 0, filePath: "", type: "", prompt: "", remark: "", videoPrompt: "" };
  addDialogShow.value = true;
};

const editForm = (row: ElementData) => {
  currentRow.value = { ...row };
  addDialogShow.value = true;
};

const aiGenerate = (row: ElementData) => {
  currentRow.value = { ...row };
  imageDialogShow.value = true;
};

const deleteFrom = (row: ElementData) => {
  Modal.confirm({
    title: "删除",
    content: "确认是否删除",
    okText: "确认",
    cancelText: "取消",
    onOk: async () => {
      await axios.post("/assets/delAssets", { id: row.id });
      message.success("删除成功");
      refreshData();
    },
  });
};

// 暴露方法
const getSelectData = () => {
  const selectedData = projectElements.value.filter((item) => selectedRowKeys.value.includes(item.id));
  return props.way === "radio" ? selectedData[0] : selectedData;
};

const changeChecked = (data: { id: number }, checked: boolean) => {
  if (checked) {
    if (!selectedRowKeys.value.includes(data.id)) {
      selectedRowKeys.value.push(data.id);
    }
  } else {
    selectedRowKeys.value = selectedRowKeys.value.filter((key) => key !== data.id);
  }
};

defineExpose({ getSelectData, changeChecked });

// 生命周期
onMounted(() => {
  if (props.radio) currentFilter.value = props.radio;
  changeFilter(currentFilter.value);
});
</script>

<style lang="scss" scoped>
.mainElement {
  .buttonGroup {
    gap: 5px;
  }

  .actionBar {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;
    margin-right: 12px;
  }

  .tableBody {
    margin-top: 15px;

    .scriptBody {
      margin-bottom: 15px;

      .gridScript {
        display: grid;
        grid-template-columns: repeat(10, 1fr);
        gap: 10px;
      }
    }
  }

  .elementImage {
    width: 100px;
    height: 100px;
    object-fit: contain;
  }

  .noImage {
    width: 100px;
    height: 100px;
    background-color: var(--ant-color-fill-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .actionBtns {
    display: flex;
    gap: 10px;
    justify-content: space-around;
  }

  .hoverButton {
    padding: 8px;
    cursor: pointer;
    font-size: 21px;

    &:hover {
      border-radius: 999px;
      background-color: var(--ant-color-fill-secondary);
    }

    &.edit,
    &.magic {
      color: var(--ant-color-primary);
    }

    &.delete {
      color: var(--ant-color-error);
    }
  }

  .empty {
    text-align: center;
    padding: 56px 0;
    background: var(--ant-color-bg-container);
    border-radius: 16px;
    border: 1px solid var(--ant-color-border-secondary);

    .emptyIcon {
      width: 96px;
      height: 96px;
      background: var(--ant-color-fill-tertiary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--ant-color-text-quaternary);
      font-size: 45px;
      margin: 0 auto 18px;
    }

    .emptyTitle {
      font-size: 17px;
      font-weight: 500;
      color: var(--ant-color-text);
      margin-bottom: 7px;
    }

    .emptyDesc {
      color: var(--ant-color-text-secondary);
      margin-bottom: 17px;
      font-size: 14px;
    }
  }

  .text-ellipsis {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
    max-width: 200px;
  }
}
</style>
