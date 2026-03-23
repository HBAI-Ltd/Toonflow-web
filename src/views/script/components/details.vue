<template>
  <div class="details">
    <t-dialog
      :visible.sync="detailsShow"
      width="60vw"
      top="1vh"
      :closable="false"
      :maskClosable="false"
      wrapClassName="no-header-margin"
      dialogClass="custom-modal"
      @confirm="onConfirm"
      @close-btn-click="closeModal"
      :afterClose="handleClose"
      @cancel="closeModal">
      <template #header>
        <t-typography-title level="h4" style="margin: 0">剧本详情</t-typography-title>
      </template>
      <t-form :data="props.item" label-align="top" class="detailsForm">
        <t-form-item label="剧本名称" name="name">
          <t-input v-model="props.item.name" :maxlength="10" placeholder="请输入剧本名称" />
        </t-form-item>
        <t-form-item label="剧本内容" name="content">
          <t-textarea v-model="props.item.content" placeholder="请输入剧本内容..." :autosize="{ minRows: 25, maxRows: 25 }" />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
// 添加类型定义
interface ScriptItem {
  id: number;
  name: string;
  content: string;
}

const detailsShow = defineModel<boolean>({
  default: false,
});

const props = defineProps<{
  item: ScriptItem;
}>();

function handleClose() {
  detailsShow.value = false;
}
function closeModal() {
  detailsShow.value = false;
}
const emit = defineEmits(["searchScripts"]);
//确认
async function onConfirm() {
  try {
    await axios.post("/script/updateScript", { id: props.item.id, name: props.item.name, content: props.item.content });
    MessagePlugin.success("剧本更新成功");
  } catch (error) {
    console.error("更新剧本失败:", error);
    MessagePlugin.error("更新剧本失败，请稍后再试");
  } finally {
    close();
    emit("searchScripts");
  }
  detailsShow.value = false;
}
</script>

<style lang="scss" scoped>
.details {
  .detailsForm {
    padding: 0 8px;
  }
}
</style>
