<template>
  <div class="promptManage">
    <div v-for="value in data" :key="value.id" style="cursor: pointer" @click="openShow(value)">
      <t-card bordered>
        <div class="data">
          <div class="jb">
            <div class="name">{{ value.name }}</div>
            <div class="type">{{ value.type }}</div>
          </div>
          <div class="data">{{ value.data }}</div>
        </div>
      </t-card>
    </div>
    <div class="show">
      <t-dialog v-model:visible="visible" :header="$t('workbench.project.dialog.prompt.title')" width="70%" :close-on-overlay-click="false" @confirm="onConfirm" top="9vh">
        <MdEditor :theme="themeSetting.mode === 'auto' ? 'light' : themeSetting.mode"
          v-model="promptData.data"
          :toolbars="promptToolbars"
          :footers="[]"
          style="height: 60vh"
          :placeholder="$t('workbench.project.dialog.prompt.placeholder')"
          @onUploadImg="() => {}" />
      </t-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
import { MdEditor } from "md-editor-v3";
import type { ToolbarNames } from "md-editor-v3";
import settingStore from "@/stores/setting";
const { themeSetting } = storeToRefs(settingStore());
import { ref } from "vue";
onMounted(() => {
  getPrompt();
});
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
const visible = ref(false);
const data = ref<{ id: number; name: string; type: string; data: string }[]>([]);
function getPrompt() {
  axios.post("/setting/promptManage/getPrompt").then((res) => {
    data.value = res.data.map((item: { id: number; name: string; type: string; data: string }) => {
      return {
        id: item.id,
        name: item.name,
        type: item.type,
        data: item.data,
      };
    });
  });
}
function openShow(value: { id: number; name: string; type: string; data: string }) {
  promptData.value = { ...value };
  visible.value = true;
}
const promptData = ref({ id: 0, name: "", type: "", data: "" });
async function onConfirm() {
  await axios.post("/setting/promptManage/updatePrompt", {
    id: promptData.value.id,
    data: promptData.value.data,
  });
  window.$message.success($t("workbench.project.dialog.prompt.saveSuccess"));
  getPrompt();
  visible.value = false;
}
</script>

<style lang="scss" scoped>
.promptManage {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  .data {
    .name {
      font-size: 15px;
      font-weight: 900;
    }
    .type {
      font-size: 14px;
      color: #999;
    }
    .data {
      margin-top: 10px;
      font-size: 14px;
      color: #666;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
    }
  }
}
</style>
