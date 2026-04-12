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
      <MdEditor
        v-model="promptForm.prompt"
        :toolbars="promptToolbars"
        :footers="[]"
        style="height: 60vh"
        :placeholder="$t('workbench.project.dialog.prompt.placeholder')"
        @onUploadImg="() => {}" />
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { TableProps } from "tdesign-vue-next";
import { MdEditor } from "md-editor-v3";
import type { ToolbarNames } from "md-editor-v3";
import axios from "@/utils/axios";
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
  prompt: string;
}
interface ModelMap {
  id: string;
  name: string;
  promptList: PromptList[];
}
const modelMap = ref<ModelMap[]>([]);
onMounted(() => {
  queryModelMap();
});
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
  .promptList {
  }
}
</style>
