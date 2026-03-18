<template>
  <div class="fileManagement">
    <t-card v-if="isDesktop" title="快捷打开目录" bordered>
      <div class="folderList">
        <div v-for="item in folderList" :key="item.path" class="folderItem">
          <div class="folderInfo">
            <div class="folderName">{{ item.label }}</div>
            <div class="folderDesc">{{ item.desc }}</div>
          </div>
          <t-button theme="primary" variant="outline" @click="handleOpenFolder(item.path)">打开</t-button>
        </div>
      </div>
    </t-card>

    <t-empty v-else description="Docker/前后端分离部署请前往“/data/*”目录手动管理文件。" title="该功能仅支持桌面端">
      <template #image>
        <i-reduce-one theme="outline" fill="red" />
      </template>
    </t-empty>
  </div>
</template>

<script setup lang="ts">
type QuickPathItem = {
  label: string;
  path: string;
  desc: string;
};

const folderList: QuickPathItem[] = [
  { label: "data", path: "data", desc: "数据目录。" },
  { label: "data/logs", path: "data/logs", desc: "运行日志与错误日志。" },
  { label: "data/oss", path: "data/oss", desc: "对象存储相关资源。" },
  { label: "data/skills", path: "data/skills", desc: "技能与提示配置文件。" },
  { label: "data/models", path: "data/models", desc: "模型文件与配置。" },
];

const isDesktop = window.$electron === true;

const handleOpenFolder = (path: string) => {
  void path;
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
