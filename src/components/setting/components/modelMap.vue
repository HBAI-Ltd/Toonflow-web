<template>
  <div class="modelMap">
    <t-collapse v-for="(item, index) in modelMap" :key="index" style="margin-top: 5px">
      <t-collapse-panel :header="item.name">
        <t-table row-key="key" :data="item.promptList" :columns="columns">
          <template #type="{ row: subRow }">
            <div class="type">
              <span>{{ subRow.type == "text" ? $t('common.text') : subRow.type == "video" ? $t('common.video') : $t('common.image') }}</span>
            </div>
          </template>
          <template #operation="{ row }">
            <t-space :size="0">
              <t-button theme="danger" v-if="row?.path" variant="text" @click="promptEditor(item, row)">
                <template #icon>
                  <t-icon name="edit" />
                </template>
                {{ $t("settings.memory.modelMap.editRefeshWord") }}
              </t-button>
              <t-button theme="primary" v-else variant="text" @click="promptEditor(item, row)">
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

    <!-- 绑定提示词弹窗 -->
    <t-dialog
      v-model:visible="visible"
      :header="$t('workbench.project.dialog.prompt.title')"
      width="70%"
      :close-on-overlay-click="false"
      @confirm="onConfirm"
      placement="center">
      <div class="prompt-select">
        <div class="prompt-select-header">
          <div class="prompt-current">
            <span class="label">{{ $t("settings.memory.modelMap.currentBinding") }}：</span>
            <t-tag v-if="promptForm.fileName" theme="primary" variant="light">{{ promptForm.fileName }}</t-tag>
            <t-tag v-else theme="warning" variant="light">{{ $t("settings.memory.modelMap.noBinding") }}</t-tag>
          </div>
          <t-button theme="primary" variant="outline" size="small" @click="openAddPrompt">
            <template #icon><t-icon name="add" /></template>
            {{ $t("settings.memory.modelMap.addPrompt") }}
          </t-button>
        </div>
        <t-table row-key="name" :data="promptList" :columns="promptColumns" :hover="true" max-height="50vh" style="margin-top: 12px">
          <template #name="{ row }">
            <div style="display: flex; align-items: center; gap: 6px">
              <span>{{ row.name }}</span>
              <t-tag v-if="promptForm.path === row.path" size="small" theme="success">{{ $t("settings.memory.modelMap.bound") }}</t-tag>
            </div>
          </template>
          <template #bindOperation="{ row }">
            <t-space :size="0">
              <t-button v-if="promptForm.path !== row.path" theme="primary" variant="text" @click="selectPrompt(row)">
                {{ $t("settings.memory.modelMap.editWord") }}
              </t-button>
              <t-button v-else theme="danger" variant="text" @click="unselectPrompt">
                {{ $t("settings.memory.modelMap.unbind") }}
              </t-button>
              <t-button theme="primary" variant="text" @click="openEditPrompt(row)">
                {{ $t("settings.memory.modelMap.editPrompt") }}
              </t-button>
              <t-button theme="danger" variant="text" @click="delPrompt(row)">
                {{ $t("settings.memory.modelMap.delPrompt") }}
              </t-button>
            </t-space>
          </template>
        </t-table>
      </div>
    </t-dialog>

    <!-- 新增/编辑提示词弹窗 -->
    <t-dialog
      v-model:visible="addPromptVisible"
      :header="editingPrompt.isEdit ? $t('settings.memory.modelMap.editPromptTitle') : $t('settings.memory.modelMap.addPromptTitle')"
      width="75%"
      :close-on-overlay-click="false"
      @confirm="onAddPromptConfirm"
      top="5vh">
      <div class="add-prompt-form">
        <t-form label-align="top">
          <t-form-item :label="$t('settings.memory.modelMap.filenName')">
            <t-input
              v-model="editingPrompt.name"
              :disabled="editingPrompt.isEdit"
              :placeholder="$t('settings.memory.modelMap.promptNamePlaceholder')" />
          </t-form-item>
          <t-form-item :label="$t('settings.memory.modelMap.type')">
            <t-select
              v-model="editingPrompt.type"
              :disabled="editingPrompt.isEdit"
              :placeholder="$t('settings.memory.modelMap.promptTypePlaceholder')">
              <!-- <t-option value="text" :label="$t('settings.memory.modelMap.typeText')" />
              <t-option value="image" :label="$t('settings.memory.modelMap.typeImage')" /> -->
              <t-option value="video" :label="$t('settings.memory.modelMap.typeVideo')" />
            </t-select>
          </t-form-item>
          <t-form-item :label="$t('promptManage.prompt')">
            <MdEditor
              :theme="themeSetting.mode === 'auto' ? 'light' : themeSetting.mode"
              v-model="editingPrompt.data"
              :toolbars="promptToolbars"
              :footers="[]"
              style="height: 55vh; width: 100%"
              :placeholder="$t('workbench.project.dialog.prompt.placeholder')"
              @onUploadImg="() => {}" />
          </t-form-item>
        </t-form>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { TableProps } from "tdesign-vue-next";
import axios from "@/utils/axios";
import { MdEditor, MdPreview } from "md-editor-v3";
import type { ToolbarNames } from "md-editor-v3";
import settingStore from "@/stores/setting";
const { themeSetting } = storeToRefs(settingStore());

const promptToolbars: ToolbarNames[] = [
  "bold",
  "italic",
  "strikeThrough",
  "-",
  "unorderedList",
  "orderedList",
  "-",
  "revoke",
  "next",
  "=",
  "preview",
];
interface PromptList {
  name: string;
  type: string;
  model: string;
  path: string;
  fileName: string;
}
interface ModelMap {
  id: string;
  name: string;
  promptList: PromptList[];
}
const modelMap = ref<ModelMap[]>([]);

interface PromptItem {
  name: string;
  type: string;
  data: string;
  path: string;
}
const promptList = ref<PromptItem[]>([]);

onMounted(() => {
  queryModelMap();
});

//获取提示词列表
function getPromptList() {
  axios.get("/setting/modelMap/getPromptList").then((res) => {
    promptList.value = res.data;
  });
}
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
  path: "",
  fileName: "",
});
//当前选中的供应商
const currentSupplier = ref("");
function promptEditor(item: ModelMap, value: PromptList) {
  visible.value = true;
  promptForm.value = value;
  currentSupplier.value = item.id;
  getPromptList();
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
    ellipsis: true,
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
  promptForm.value.fileName = row.name;
  promptForm.value.path = row.path;
}

//取消绑定
function unselectPrompt() {
  promptForm.value.fileName = "";
  promptForm.value.path = "";
}

// 新增/编辑提示词弹窗
const addPromptVisible = ref(false);
const editingPrompt = ref({ isEdit: false, name: "", type: "video", data: "" });

function openAddPrompt() {
  editingPrompt.value = { isEdit: false, name: "", type: "video", data: "" };
  addPromptVisible.value = true;
}

function openEditPrompt(row: PromptItem) {
  editingPrompt.value = { isEdit: true, ...row };
  addPromptVisible.value = true;
}
function delPrompt(row: PromptItem) {
  axios
    .post("/setting/modelMap/deletePrompt", {
      path: row.path,
    })
    .then((res) => {});
}
async function onAddPromptConfirm() {
  if (!editingPrompt.value.name.trim()) {
    window.$message.warning($t("settings.memory.modelMap.promptNameRequired"));
    return;
  }
  if (editingPrompt.value.isEdit) {
    await axios.post("/setting/modelMap/updatePrompt", {
      name: editingPrompt.value.name,
      type: editingPrompt.value.type,
      data: editingPrompt.value.data,
    });
  } else {
    await axios.post("/setting/modelMap/savePrompt", {
      name: editingPrompt.value.name,
      type: editingPrompt.value.type,
      data: editingPrompt.value.data,
    });
  }
  window.$message.success($t("settings.memory.modelMap.promptSaveSuccess"));
  addPromptVisible.value = false;
  getPromptList();
}

//更新提示词
function onConfirm() {
  const data = {
    vendorId: currentSupplier.value,
    model: promptForm.value.model,
    path: promptForm.value.path,
    fileName: promptForm.value.fileName,
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
    .prompt-select-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
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
      max-height: 80px;
      overflow: hidden;
      :deep(.md-editor-preview-wrapper) {
        padding: 0;
      }
      :deep(p) {
        margin: 0;
      }
    }
  }
  .add-prompt-form {
    .t-form__item {
      margin-bottom: 16px;
    }
  }
}
</style>
