<template>
  <div class="fileManagement">
    <t-card v-if="isDesktop" :title="$t('settings.file.quickOpen')" bordered>
      <div class="folderList">
        <div v-for="item in folderList" :key="item.path" class="folderItem">
          <div class="folderInfo">
            <div class="folderName">{{ $t(item.label) }}</div>
            <div class="folderDesc">{{ $t(item.desc) }}</div>
          </div>
          <t-button theme="primary" variant="outline" @click="handleOpenFolder(item.path)">{{ $t("settings.file.open") }}</t-button>
        </div>
      </div>
    </t-card>

    <t-empty v-else :description="$t('settings.file.dockerDesc')" :title="$t('settings.file.desktopOnly')">
      <template #image>
        <i-reduce-one theme="outline" fill="red" />
      </template>
    </t-empty>
  </div>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
type QuickPathItem = {
  label: string;
  path: string;
  desc: string;
};

const folderList: QuickPathItem[] = [
  { label: "settings.file.folders.data", path: "", desc: "settings.file.folders.dataDesc" },
  { label: "settings.file.folders.logs", path: "logs", desc: "settings.file.folders.logsDesc" },
  { label: "settings.file.folders.oss", path: "oss", desc: "settings.file.folders.ossDesc" },
  { label: "settings.file.folders.skills", path: "skills", desc: "settings.file.folders.skillsDesc" },
  { label: "settings.file.folders.models", path: "models", desc: "settings.file.folders.modelsDesc" },
  { label: "settings.file.folders.web", path: "web", desc: "settings.file.folders.webDesc" },
  { label: "settings.file.folders.serve", path: "models", desc: "settings.file.folders.modelsDesc" },
];

const isDesktop = window.$electron === true;

const handleOpenFolder = (path: string) => {
  axios
    .post("/setting/fileManagement/openFolder", {
      path: path,
    })
    .catch((err) => {
      window.$message?.error(err.message || $t("settings.file.openFailed"));
    });
};
</script>

<style lang="scss" scoped>
.folderList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.folderItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--td-component-border);
  border-radius: var(--td-radius-default);
}

.folderName {
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.folderDesc {
  margin-top: 2px;
  font-size: 12px;
  color: var(--td-text-color-secondary);
}
</style>
