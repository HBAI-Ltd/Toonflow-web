<template>
  <div class="editNodel">
    <t-dialog v-model:visible="editNodelShow" header="编辑小说原文" width="50%" top="10vh" placement="center">
      <div class="data">
        <t-input placeholder="请输入章节名称" v-model="formData.chapter" />
        <div style="margin-top: 10px">
          <t-textarea placeholder="请输入章节内容" v-model="formData.chapterData" :autosize="{ minRows: 20, maxRows: 20 }" />
        </div>
      </div>
      <template #footer>
        <div class="editNodel-footer">
          <t-button @click="editNodelShow = false">取消</t-button>
          <t-button theme="primary" @click="saveChanges">保存</t-button>
        </div>
      </template>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
const editNodelShow = defineModel<boolean>();
const props = defineProps<{
  formData: {
    id: number;
    index: number;
    reel: string;
    chapter: string;
    chapterData: string;
  };
}>();
const emit = defineEmits(["select"]);
async function saveChanges() {
  console.log("保存的章节数据:", props.formData);
  try {
    await axios.post("/novel/updateNovel", {
      id: props.formData.id,
      index: props.formData.index,
      reel: props.formData.reel,
      chapter: props.formData.chapter,
      chapterData: props.formData.chapterData,
    });
    emit("select");
    MessagePlugin.success("小说原文更新成功");
  } catch (e) {
    MessagePlugin.error((e as Error).message);
  } finally {
    editNodelShow.value = false;
  }
  editNodelShow.value = false; // 关闭对话框
}
</script>

<style lang="scss" scoped></style>
