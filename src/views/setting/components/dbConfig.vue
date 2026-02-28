<template>
  <div class="dbConfig">
    <t-card class="actionItem">
      <div class="actionInfo">
        <h4>清空数据库</h4>
        <p>清空所有数据表中的数据，保留表结构</p>
      </div>
      <t-button theme="danger" variant="outline" @click="deleteAllData">
        <template #icon>
          <i-clear theme="outline" size="14" fill="currentColor" />
        </template>
        清空数据
      </t-button>
    </t-card>

    <t-card class="actionItem">
      <div class="actionInfo">
        <h4>删除数据库</h4>
        <p>删除所有数据表，此操作不可恢复</p>
      </div>
      <t-button theme="danger" @click="clearDatabase">
        <template #icon>
          <i-delete theme="outline" size="14" fill="currentColor" />
        </template>
        删除数据库
      </t-button>
    </t-card>

    <!-- 第一次确认对话框 -->
    <t-dialog
      v-model:visible="firstConfirmVisible"
      :header="confirmConfig.title"
      :confirm-btn="{ content: '确认', theme: 'danger' }"
      @confirm="handleFirstConfirm"
      @cancel="handleCancel">
      <div class="confirmContent">
        <i-attention theme="filled" size="48" fill="#e34d59" />
        <p>{{ confirmConfig.firstMessage }}</p>
      </div>
    </t-dialog>

    <!-- 第二次确认对话框 -->
    <t-dialog
      v-model:visible="secondConfirmVisible"
      :header="confirmConfig.title"
      :confirm-btn="{ content: confirmText, theme: 'danger', disabled: !canConfirm }"
      @confirm="handleSecondConfirm"
      @cancel="handleCancel">
      <div class="confirmContent">
        <i-attention theme="filled" size="48" fill="#e34d59" />
        <p>{{ confirmConfig.secondMessage }}</p>
        <t-input v-model="confirmInput" :placeholder="`请输入 ${confirmConfig.keyword} 确认操作`" class="confirmInput" />
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import axios from "axios";

const firstConfirmVisible = ref(false);
const secondConfirmVisible = ref(false);
const confirmInput = ref("");
const currentAction = ref<"deleteAll" | "clearDb" | null>(null);

const confirmConfigs = {
  deleteAll: {
    title: "清空数据库",
    firstMessage: "确定要清空所有数据表吗？数据清空后无法恢复！",
    secondMessage: "这是最后一次确认，清空后所有数据将永久丢失！",
    keyword: "清空",
  },
  clearDb: {
    title: "删除数据库",
    firstMessage: "确定要删除整个数据库吗？此操作将删除所有表结构和数据！",
    secondMessage: "这是最后一次确认，删除后数据库将完全销毁！",
    keyword: "删除",
  },
};

const confirmConfig = computed(() => {
  return confirmConfigs[currentAction.value || "deleteAll"];
});

const canConfirm = computed(() => {
  return confirmInput.value === confirmConfig.value.keyword;
});

const confirmText = computed(() => {
  return canConfirm.value ? "确认" : `请输入"${confirmConfig.value.keyword}"`;
});

function deleteAllData() {
  currentAction.value = "deleteAll";
  confirmInput.value = "";
  firstConfirmVisible.value = true;
}

function clearDatabase() {
  currentAction.value = "clearDb";
  confirmInput.value = "";
  firstConfirmVisible.value = true;
}

function handleFirstConfirm() {
  firstConfirmVisible.value = false;
  secondConfirmVisible.value = true;
}

async function handleSecondConfirm() {
  if (!canConfirm.value) return;

  secondConfirmVisible.value = false;

  try {
    if (currentAction.value === "deleteAll") {
      await axios.post("/other/deleteAllData");
      window.$message.success("所有数据表已清空");
    } else if (currentAction.value === "clearDb") {
      await axios.post("/other/clearDatabase");
      window.$message.success("所有数据表已删除，请重新打开页面");
    }
  } catch {
    window.$message.error("操作失败，请重试");
  } finally {
    currentAction.value = null;
    confirmInput.value = "";
  }
}

function handleCancel() {
  firstConfirmVisible.value = false;
  secondConfirmVisible.value = false;
  currentAction.value = null;
  confirmInput.value = "";
  window.$message.info("操作已取消");
}
</script>

<style lang="scss" scoped>
.dbConfig {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.actionItem {
  :deep(.t-card__body) {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .actionInfo {
    h4 {
      margin: 0 0 4px;
      font-size: 14px;
      font-weight: 500;
    }

    p {
      margin: 0;
      font-size: 12px;
    }
  }
}

.confirmContent {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 16px 0;
  text-align: center;

  p {
    margin: 0;
    font-size: 14px;
  }

  .confirmInput {
    width: 100%;
    max-width: 280px;
  }
}
</style>
