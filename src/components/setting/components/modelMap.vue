<template>
  <div class="modelMap">
    <t-collapse v-for="(item, index) in modelMap" :key="index" style="margin-top: 5px">
      <t-collapse-panel :header="item.name">
        <t-table row-key="key" :data="item.promptList" :columns="columns">
          <template #type="{ row: subRow }">
            <div class="type">
              <span>{{ subRow.type == "text" ? "文本" : subRow.type == "video" ? "视频" : "图片" }}</span>
            </div>
          </template>
          <template #operation="{ row }">
            <t-space :size="0">
              <t-button theme="primary" variant="text" @click="promptEditor(item, row)">
                <template #icon>
                  <t-icon name="edit" />
                </template>
                {{ $t("settings.memory.modelMap.editWord") }}
              </t-button>
            </t-space>
          </template>
        </t-table>
      </t-collapse-panel>
    </t-collapse>
    <t-dialog
      v-model:visible="visible"
      :header="$t('workbench.project.dialog.prompt.title')"
      width="70%"
      :close-on-overlay-click="false"
      @confirm="onConfirm"
      top="9vh">
      <div class="prompt-select">
        <div class="prompt-current">
          <span class="label">{{ $t("settings.memory.modelMap.currentBinding") }}：</span>
          <t-tag v-if="promptForm.prompt" theme="primary" variant="light">{{ promptForm.prompt }}</t-tag>
          <t-tag v-else theme="warning" variant="light">{{ $t("settings.memory.modelMap.noBinding") }}</t-tag>
        </div>
        <t-table row-key="id" :data="promptList" :columns="promptColumns" :hover="true" max-height="50vh" style="margin-top: 12px">
          <template #name="{ row }">
            <div style="display: flex; align-items: center; gap: 6px">
              <span>{{ row.name }}</span>
              <t-tag v-if="promptForm.prompt === row.name" size="small" theme="success">{{ $t("settings.memory.modelMap.bound") }}</t-tag>
            </div>
          </template>
          <template #data="{ row }">
            <div class="prompt-preview">{{ row.data }}</div>
          </template>
          <template #bindOperation="{ row }">
            <t-button v-if="promptForm.prompt !== row.name" theme="primary" variant="text" @click="selectPrompt(row)">
              {{ $t("settings.memory.modelMap.editWord") }}
            </t-button>
            <t-button v-else theme="danger" variant="text" @click="unselectPrompt">
              {{ $t("settings.memory.modelMap.unbind") }}
            </t-button>
          </template>
        </t-table>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { TableProps } from "tdesign-vue-next";
import axios from "@/utils/axios";
interface PromptList {
  name: string;
  type: string;
  model: string;
  prompt: string;
}
interface ModelMap {
  id: string;
  name: string;
  promptList: PromptList[];
}
const modelMap = ref<ModelMap[]>([]);

interface PromptItem {
  id: number;
  name: string;
  type: string;
  data: string;
}
const promptList = ref<PromptItem[]>([
  {
    id: 1,
    name: "prompt1",
    type: "text",
    data: "promp第三方速度防守打法水电费水电费水电费水电费水电费水电费水电费速度是单个速度水电费速度水电费水电费水电费水电费水电费速度防守打法水电费水电费地方t1",
  },
  {
    id: 2,
    name: "prompt2",
    type: "text",
    data: "prompt2",
  },
  {
    id: 3,
    name: "prompt3",
    type: "text",
    data: "prompt3",
  },
]);

onMounted(() => {
  queryModelMap();
});

//获取提示词列表
function getPromptList() {}
//查询模型映射提示词
function queryModelMap() {
  axios.post("/setting/modelMap/getImageAndVideoModel").then((res) => {
    modelMap.value = res.data;
  });
}
const columns: TableProps["columns"] = [
  {
    colKey: "name",
    title: $t("settings.memory.modelMap.name"),
    width: 150,
    align: "left",
  },
  {
    colKey: "model",
    title: $t("settings.memory.modelMap.model"),
    width: 150,
    align: "left",
  },
  {
    colKey: "type",
    title: $t("settings.memory.modelMap.type"),
    width: 50,
    align: "left",
  },
  {
    colKey: "operation",
    title: $t("settings.memory.modelMap.operation"),
    width: 100,
    align: "center",
    fixed: "right",
    cell: "operation",
  },
];
const visible = ref(false);
//编辑提示词
const promptForm = ref<PromptList>({
  name: "",
  type: "",
  model: "",
  prompt: "",
});
//当前选中的供应商
const currentSupplier = ref("");
function promptEditor(item: ModelMap, value: PromptList) {
  visible.value = true;
  promptForm.value = value;
  currentSupplier.value = item.id;
}

//提示词列表表格列
const promptColumns: TableProps["columns"] = [
  {
    colKey: "name",
    title: $t("settings.memory.modelMap.filenName"),
    width: 150,
    align: "left",
    cell: "name",
  },
  {
    colKey: "type",
    title: $t("settings.memory.modelMap.type"),
    width: 80,
    align: "left",
  },
  {
    colKey: "data",
    title: $t("promptManage.prompt"),
    align: "left",
    cell: "data",
    ellipsisTitle: true,
  },
  {
    colKey: "bindOperation",
    title: $t("settings.memory.modelMap.operation"),
    width: 200,
    align: "center",
    fixed: "right",
    cell: "bindOperation",
  },
];

//选择提示词绑定
function selectPrompt(row: PromptItem) {
  promptForm.value.prompt = row.name;
}

//取消绑定
function unselectPrompt() {
  promptForm.value.prompt = "";
}
//更新提示词
function onConfirm() {
  const data = {
    vendorId: currentSupplier.value,
    model: promptForm.value.model,
    prompt: promptForm.value.prompt,
  };
  axios
    .post("/setting/modelMap/bindingPrompt", data)
    .then((res) => {
      window.$message.success($t("settings.memory.modelMap.bindingSuccessful"));
    })
    .catch((err) => {
      window.$message.error($t("settings.memory.modelMap.bindingFailed", err));
    })
    .finally(() => {
      visible.value = false;
      queryModelMap();
    });
}
</script>

<style lang="scss" scoped>
.modelMap {
  .prompt-select {
    .prompt-current {
      display: flex;
      align-items: center;
      gap: 8px;
      .label {
        font-size: 14px;
        color: var(--td-text-color-secondary);
      }
    }
    .prompt-preview {
      font-size: 13px;
      color: var(--td-text-color-secondary);
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
    }
  }
}
</style>
