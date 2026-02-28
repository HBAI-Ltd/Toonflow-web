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
      <vxe-table
        v-else
        ref="tableRef"
        :data="projectElements"
        :cell-config="{ height: props.batch ? 300 : 120 }"
        :row-config="{ keyField: 'id', resizable: true }"
        :radio-config="{ reserve: true }"
        :checkbox-config="{ reserve: true }"
        @checkbox-all="handleCheckedAll"
        @checkbox-change="handleCheckedChange"
        @radio-change="handleRadioChange"
        round>
        <vxe-column v-if="props.way" :type="props.way" title="请选择" width="100" />
        <vxe-column title="名称" field="name" width="150" show-overflow="title" :edit-render="{ name: 'input' }" />
        <vxe-column title="元素图片" width="120">
          <template #default="{ row }">
            <a-image v-if="row.filePath" :src="row.filePath" :fallback="errorPicture" class="elementImage" />
            <div v-else class="noImage">未生成图片</div>
          </template>
        </vxe-column>
        <vxe-column title="详情" field="intro" show-overflow="title" :edit-render="{ name: 'textarea' }" />
        <vxe-column title="生图提示词" field="prompt" show-overflow="title">
          <template v-if="props.batch" #default="{ row }">
            <a-textarea v-model:value="row.prompt" :auto-size="{ minRows: 2, maxRows: 12 }" @click="handleEditClick(row)" />
          </template>
        </vxe-column>
        <vxe-column v-if="currentFilter === 'role'" title="音色" field="voiceId" show-overflow="title">
          <template #default="{ row }">
            <span>{{ row.voiceId || "-" }}</span>
          </template>
        </vxe-column>
        <vxe-column v-if="isStoryboard" title="视频提示词" field="videoPrompt" show-overflow="title">
          <template v-if="props.batch" #default="{ row }">
            <a-textarea v-model:value="row.videoPrompt" :auto-size="{ minRows: 2, maxRows: 12 }" @click="handleEditClick(row)" />
          </template>
        </vxe-column>
        <vxe-column v-if="isStoryboard" title="人物对话" field="dialogue" show-overflow="title">
          <template #default="{ row }">
            <span>{{ row.dialogue || "-" }}</span>
          </template>
        </vxe-column>
        <vxe-column v-if="isStoryboard" title="第三方叙述" field="narration" show-overflow="title">
          <template #default="{ row }">
            <span>{{ row.narration || "-" }}</span>
          </template>
        </vxe-column>
        <vxe-column title="备注" field="remark" :edit-render="{ name: 'textarea' }" />
        <vxe-column v-if="isStoryboard" title="时长(单位：秒)" field="duration" />
        <vxe-column v-if="!props.batch" title="操作" width="auto" fixed="right">
          <template #default="{ row }">
            <div class="actionBtns">
              <i-pencil class="hoverButton edit" @click="editForm(row)" />
              <i-magic class="hoverButton magic" @click="aiGenerate(row)" />
              <i-delete class="hoverButton delete" @click="deleteFrom(row)" />
            </div>
          </template>
        </vxe-column>
      </vxe-table>
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
import type { VxeTableInstance } from "vxe-table";
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
  dialogue?: string;
  narration?: string;
  voiceId?: string;
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
const tableRef = ref<VxeTableInstance<ElementData>>();
const currentFilter = ref<FilterType>("role");
const currentRow = ref<ElementData>();
const scriptList = ref<ScriptItem[]>([]);
const projectElements = ref<ElementData[]>([]);

const addDialogShow = ref(false);
const imageDialogShow = ref(false);
const batchShow = ref(false);
const batchGenerateImageLoading = ref(false);
const batchGeneratePromptLoading = ref(false);

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
  const { data } = await axios.post("/assets/getStoryboard", { projectId: projectId.value });
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
      videoPrompt: item.videoPrompt,
      dialogue: item.dialogue ?? "",
      narration: item.narration ?? "",
      voiceId: item.voiceId ?? undefined,
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
      const { data } = await axios.post("/assets/polishPrompt", {
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
const handleEditClick = (row: ElementData) => {
  tableRef.value?.setRowHeight(row.id, 300);
  tableRef.value?.recalculate();
};

const handleCheckedChange = (data: { checked: boolean; row: ElementData }) => emits("checkChange", data);
const handleRadioChange = (data: { row: ElementData }) => emits("checkChange", { checked: true, row: data.row });
const handleCheckedAll = (data: { checked: boolean; records: ElementData[] }) =>
  emits("checkAll", data, currentFilter.value, currentScriptId.value ?? -1);

// CRUD 操作
const addElement = () => {
  currentRow.value = { id: 0, name: "", intro: "", duration: 0, filePath: "", type: "", prompt: "", remark: "", videoPrompt: "", dialogue: "", narration: "" };
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
const getSelectData = () => (props.way === "radio" ? tableRef.value?.getRadioRecord(true) : tableRef.value?.getCheckboxRecords(true));
const changeChecked = (data: { id: number }, checked: boolean) => tableRef.value?.setCheckboxRow(data, checked);

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
    background-color: #f6f7f9;
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
      background-color: #f0edf5;
    }

    &.edit,
    &.magic {
      color: #1b61fc;
    }

    &.delete {
      color: #e7010c;
    }
  }

  .empty {
    text-align: center;
    padding: 56px 0;
    background: #fff;
    border-radius: 16px;
    border: 1px solid #eee;

    .emptyIcon {
      width: 96px;
      height: 96px;
      background: #f3f4f6;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #aaa;
      font-size: 45px;
      margin: 0 auto 18px;
    }

    .emptyTitle {
      font-size: 17px;
      font-weight: 500;
      color: #18181b;
      margin-bottom: 7px;
    }

    .emptyDesc {
      color: #888;
      margin-bottom: 17px;
      font-size: 14px;
    }
  }
}
</style>
