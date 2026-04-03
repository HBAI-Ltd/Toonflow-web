<template>
  <div class="migrateShow">
    <t-dialog v-model:visible="visible" :header="$t('components.migrateShow.title')" width="500px">
      <div class="taskList">
        <div class="item">
          <span>{{ $t("components.migrateShow.desc") }}</span>
        </div>
      </div>
      <template #footer>
        <t-space>
          <t-button theme="default" @click="() => (visible = false)">{{ $t("components.migrateShow.hide") }}</t-button>
          <t-button theme="primary" @click="onConfirm">{{ $t("components.migrateShow.confirm") }}</t-button>
        </t-space>
      </template>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";

const visible = ref(false);

function onConfirm() {
  axios
    .post("/migrate/migrateData")
    .then(() => {
      window.$message.success($t("components.migrateShow.msg.migrateSuccess"));
    })
    .catch(() => {
      window.$message.error($t("components.migrateShow.msg.migrateFailed"));
    })
    .finally(() => {
      //   visible.value = false; // 关闭对话框
    });
}
</script>

<style lang="scss" scoped></style>
