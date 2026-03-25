<template>
  <div class="updateDialog">
    <t-dialog
      v-model:visible="showUpdate"
      :header="$t('components.update.title')"
      :footer="false"
      width="400px"
    >
      <div class="updateContent">
        <div class="versionInfo">
          <div class="versionRow">
            <span class="label">{{ $t("components.update.currentVersion") }}</span>
            <!-- <span class="version">{{ updateInfo.currentVersion }}</span> -->
          </div>
          <div class="versionRow">
            <span class="label">{{ $t("components.update.latestVersion") }}</span>
            <!-- <span class="version latestVersion">{{ updateInfo.latestVersion }}</span> -->
          </div>
        </div>
        <div class="updateTip">
          <t-icon name="info-circle" />
          <span>{{ $t("components.update.tip") }}</span>
        </div>
        <div class="updateActions">
          <t-button theme="default" @click="handleLater">{{ $t("components.update.later") }}</t-button>
          <t-button theme="primary" @click="handleUpdate">{{ $t("components.update.updateNow") }}</t-button>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import useIndexStore from "@/stores/index";

const indexStore = useIndexStore();
const showUpdate = ref(false);

// 检查更新
async function checkUpdate() {
  const currentVersion = indexStore.version;
}

// 稍后提醒
function handleLater() {
  showUpdate.value = false;
}

// 立即更新
function handleUpdate() {
  showUpdate.value = false;
}

onMounted(() => {
  checkUpdate();
});
</script>

<style lang="scss" scoped>
.updateContent {
  padding: 10px 0;

  .versionInfo {
    background: var(--td-bg-color-container-hover);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;

    .versionRow {
      display: flex;
      align-items: center;
      margin-bottom: 8px;

      &:last-child {
        margin-bottom: 0;
      }

      .label {
        color: var(--td-text-color-secondary);
        width: 80px;
      }

      .version {
        font-weight: 500;
        color: var(--td-text-color-primary);
      }

      .latestVersion {
        color: var(--td-success-color);
      }
    }
  }

  .updateTip {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--td-text-color-secondary);
    font-size: 13px;
    margin-bottom: 20px;
  }

  .updateActions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
}
</style>
