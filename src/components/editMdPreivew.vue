<template>
  <t-dialog
    v-model:visible="dialogVisible"
    :header="$t('components.editMdPreivew.title')"
    :width="'90vw'"
    :confirm-btn="$t('components.editMdPreivew.confirm')"
    :cancel-btn="$t('components.editMdPreivew.cancel')"
    @confirm="onConfirm"
    @cancel="onCancel"
    @close="onCancel"
    :close-on-overlay-click="false"
    placement="center"
    attach="body">
    <MdEditor
      v-model="editContent"
      :theme="'light'"
      :toolbars="toolbars"
      :footers="[]"
      style="height: 72vh"
      @onUploadImg="() => {}"
      @drop.prevent
      @paste="onPaste" />
  </t-dialog>
</template>

<script setup lang="ts">
import { MdEditor } from "md-editor-v3";
import type { ToolbarNames } from "md-editor-v3";
import "md-editor-v3/lib/style.css";

const props = defineProps<{
  content: string;
}>();
const editContent = ref<string>("");
const dialogVisible = defineModel({
  default: false,
});
const toolbars: ToolbarNames[] = [
  "bold",
  "underline",
  "italic",
  "strikeThrough",
  "-",
  "title",
  "sub",
  "sup",
  "quote",
  "unorderedList",
  "orderedList",
  "task",
  "-",
  "codeRow",
  "code",
  "table",
  "-",
  "revoke",
  "next",
  "=",
  "preview",
];
watch(
  () => dialogVisible.value,
  () => {
    editContent.value = props.content;
  },
);
const emit = defineEmits<{
  save: [string];
}>();
function onConfirm() {
  emit("save", editContent.value);
  dialogVisible.value = false;
}

function onCancel() {
  dialogVisible.value = false;
}
function onPaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith("image/") || item.type.startsWith("video/")) {
      e.preventDefault();
      return;
    }
  }
}
</script>

<style lang="scss" scoped></style>
