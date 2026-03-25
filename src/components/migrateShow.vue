<template>
  <div class="migrateShow">
    <t-dialog v-model:visible="visible" header="迁移数据" width="500px">
      <div class="taskList">
        <div class="item">
          <span>检测到您有旧版本的数据，是否需要迁移？</span>
        </div>
      </div>
      <template #footer>
        <t-space>
          <t-button theme="default" @click="() => (visible = false)">不在显示</t-button>
          <t-button theme="primary" @click="onConfirm">确定</t-button>
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
      window.$message.success("数据迁移成功");
    })
    .catch(() => {
      window.$message.error("数据迁移失败");
    })
    .finally(() => {
      //   visible.value = false; // 关闭对话框
    });
}
</script>

<style lang="scss" scoped></style>
