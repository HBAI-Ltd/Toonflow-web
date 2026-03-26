<template>
  <div class="dbConfig">
    <t-card class="actionItem">
      <div class="actionInfo">
        <h4>{{ $t("settings.db.clearDb") }}</h4>
        <p>{{ $t("settings.db.clearDbDesc") }}</p>
      </div>
      <t-button theme="danger" variant="outline" @click="deleteAllData">
        <template #icon>
          <i-clear theme="outline" size="14" fill="currentColor" />
        </template>
        {{ $t("settings.db.clearData") }}
      </t-button>
    </t-card>

    <!-- 第一次确认对话框 -->
    <t-dialog
      v-model:visible="firstConfirmVisible"
      :header="confirmConfig.title"
      :confirm-btn="{ content: $t('settings.db.msg.confirm'), theme: 'danger' }"
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
        <t-input
          v-model="confirmInput"
          :placeholder="`${$t('settings.db.msg.pleaseInput')} ${confirmConfig.keyword} ${$t('settings.db.confirmAction')}`"
          class="confirmInput" />
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import axios from "@/utils/axios";
import { LoadingPlugin } from "tdesign-vue-next";
import router from "@/router";

const firstConfirmVisible = ref(false);
const secondConfirmVisible = ref(false);
const confirmInput = ref("");
const currentAction = ref<"deleteAll" | null>(null);
const confirmConfigs = {
  deleteAll: {
    title: () => $t("settings.db.msg.clearDbTitle"),
    firstMessage: () => $t("settings.db.msg.firstConfirm"),
    secondMessage: () => $t("settings.db.msg.secondConfirm"),
    keyword: () => $t("settings.db.msg.keyword"),
  },
};

const confirmConfig = computed(() => {
  const config = confirmConfigs[currentAction.value || "deleteAll"];
  return {
    title: config.title(),
    firstMessage: config.firstMessage(),
    secondMessage: config.secondMessage(),
    keyword: config.keyword(),
  };
});

const canConfirm = computed(() => {
  return confirmInput.value === confirmConfig.value.keyword;
});

const confirmText = computed(() => {
  return canConfirm.value ? $t("settings.db.msg.confirm") : `${$t("settings.db.msg.pleaseInput")}"${confirmConfig.value.keyword}"`;
});

function deleteAllData() {
  currentAction.value = "deleteAll";
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
  LoadingPlugin(true);
  try {
    await axios.get("/setting/dbConfig/clearData");
    window.$message.success($t("settings.db.msg.cleared"));
    router.push("/login");
  } catch {
    window.$message.error($t("settings.db.msg.operationFailed"));
  } finally {
    LoadingPlugin(false);
    currentAction.value = null;
    confirmInput.value = "";
  }
}

function handleCancel() {
  firstConfirmVisible.value = false;
  secondConfirmVisible.value = false;
  currentAction.value = null;
  confirmInput.value = "";
  window.$message.info($t("settings.db.msg.cancelled"));
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
