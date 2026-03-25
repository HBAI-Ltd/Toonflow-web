<template>
  <div class="editNodel">
    <t-dialog v-model:visible="editNodelShow" :header="$t('workbench.novel.editDialog.title')" width="50%" top="10vh" placement="center">
      <div class="data" style="overflow-x: hidden">
        <t-form label-width="80px">
          <t-form-item :label="$t('workbench.novel.editDialog.chapterName')">
            <t-input :placeholder="$t('workbench.novel.editDialog.chapterNamePh')" v-model="formData.chapter" />
          </t-form-item>
          <t-form-item :label="$t('workbench.novel.editDialog.eventContent')">
            <t-textarea v-model="formData.event" :placeholder="$t('workbench.novel.editDialog.eventContentPh')"></t-textarea>
          </t-form-item>
          <t-form-item :label="$t('workbench.novel.editDialog.chapterContent')">
            <t-textarea :placeholder="$t('workbench.novel.editDialog.chapterContentPh')" v-model="formData.chapterData" :autosize="{ minRows: 15, maxRows: 15 }" />
          </t-form-item>
        </t-form>
      </div>
      <template #footer>
        <div class="editNodel-footer">
          <t-button @click="editNodelShow = false">{{ $t('workbench.novel.editDialog.cancel') }}</t-button>
          <t-button theme="primary" @click="saveChanges">{{ $t('workbench.novel.editDialog.save') }}</t-button>
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
    event: string;
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
      event: props.formData.event,
    });
    emit("select");
    window.$message.success($t('workbench.novel.editDialog.msg.updateSuccess'));
  } catch (e) {
    window.$message.error((e as Error).message);
  } finally {
    editNodelShow.value = false;
  }
  editNodelShow.value = false; // 关闭对话框
}
</script>

<style lang="scss" scoped>
.data {
  :deep(.t-form__item) {
    .t-form__controls {
      min-width: 0;
      overflow-x: hidden;
    }
  }

  :deep(.t-textarea__inner) {
    width: 100%;
    box-sizing: border-box;
  }
}

.event-editor {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;

  .event-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    min-height: 32px;
    align-items: center;
    overflow-x: hidden;
  }

  .event-input {
    width: 100%;
    min-width: 0;
  }
}
</style>
