<template>
  <t-dialog :header="$t('settings.title')" :footer="false" placement="center" width="1200px" v-model:visible="showSetting">
    <div class="settingPanel">
      <t-menu class="settingMenu" v-model:value="activeMenu" :style="{ height: '70vh' }">
        <t-menu-item v-for="item in menuItems" :key="item.key" :value="item.key">
          <template #icon>
            <component :is="item.icon" class="icon" />
          </template>
          {{ $t(item.label) }}
        </t-menu-item>
      </t-menu>
      <div class="settingRight">
        <div class="sectionTitle">{{ currentMenuItem ? $t(currentMenuItem.label) : "" }}</div>
        <div class="settingContent">
          <languageConfig v-if="activeMenu === 'language'" />
          <vendorConfig v-if="activeMenu === 'vendorConfig'" />
          <requestConfig v-if="activeMenu === 'requestConfig'" />
          <loginConfig v-if="activeMenu === 'loginConfig'" />
          <agentConfog v-if="activeMenu === 'agentConfog'" />
          <promptManage v-if="activeMenu === 'promptManage'" />
          <otherConfig v-if="activeMenu === 'otherConfig'" />
          <dbConfig v-if="activeMenu === 'dbConfig'" />
          <about v-if="activeMenu === 'about'" />
          <logoutConfig v-if="activeMenu === 'logoutConfig'" />
          <memoryConfig v-if="activeMenu === 'memoryConfig'" />
          <fileManagement v-if="activeMenu === 'fileManagement'" />
          <skillManagement v-if="activeMenu === 'skillManagement'" />
          <devConfig v-if="activeMenu === 'devConfig'" />
        </div>
      </div>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import settingStore from "@/stores/setting";
const { showSetting, activeMenu } = storeToRefs(settingStore());

import languageConfig from "./components/languageConfig.vue";
import requestConfig from "./components/requestConfig.vue";
import loginConfig from "./components/loginConfig.vue";
import agentConfog from "./components/agentConfog.vue";
import dbConfig from "./components/dbConfig.vue";
import otherConfig from "./components/otherConfig.vue";
import about from "./components/about.vue";
import logoutConfig from "./components/logoutConfig.vue";
import vendorConfig from "./components/vendorConfig.vue";
import memoryConfig from "./components/memoryConfig.vue";
import fileManagement from "./components/fileManagement.vue";
import skillManagement from "./components/skillManagement.vue";
import devConfig from "./components/devConfig.vue";
import promptManage from "./components/promptManage.vue";

const menuItems = [
  { key: "language", label: "settings.menu.language", icon: "i-translate" },
  { key: "vendorConfig", label: "settings.menu.vendorConfig", icon: "i-computer" },
  { key: "agentConfog", label: "settings.menu.agentConfig", icon: "i-color-filter" },
  { key: "promptManage", label: "settings.menu.promptManage", icon: "i-tips" },
  { key: "skillManagement", label: "settings.menu.skillsSkillsManagement", icon: "i-ring" },
  { key: "memoryConfig", label: "settings.menu.memoryConfig", icon: "i-memory-card-one" },
  { key: "loginConfig", label: "settings.menu.loginConfig", icon: "i-lock" },
  { key: "dbConfig", label: "settings.menu.dbConfig", icon: "i-data" },
  { key: "fileManagement", label: "settings.menu.fileManagement", icon: "i-hard-disk" },
  { key: "otherConfig", label: "settings.menu.otherConfig", icon: "i-application-menu" },
  { key: "requestConfig", label: "settings.menu.requestConfig", icon: "i-api" },
  { key: "devConfig", label: "settings.menu.devConfig", icon: "i-flask" },
  { key: "about", label: "settings.menu.about", icon: "i-info" },
  { key: "logoutConfig", label: "settings.menu.logoutConfig", icon: "i-logout" },
];

const currentMenuItem = computed(() => menuItems.find((item) => item.key === activeMenu.value));
</script>

<style lang="scss" scoped>
.settingPanel {
  display: flex;
  height: 70vh;
  overflow: hidden;

  .settingMenu {
    width: 200px;
    min-width: 200px;
    border-right: 1px solid var(--td-component-border);
    flex-shrink: 0;
    .icon {
      font-size: 20px;
      margin-right: 8px;
    }
  }

  .settingRight {
    flex: 1;
    padding-left: 16px;
    padding-right: 16px;
    height: 70vh;
    overflow-y: auto;

    .sectionTitle {
      font-size: 16px;
      font-weight: 600;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--td-component-border);
      margin-bottom: 1vh;
      height: 4vh;
    }

    .settingContent {
      width: 100%;
      height: calc(70vh - 5vh - 4px);
    }
  }
}
:deep(.t-menu) {
  padding: 0;
  padding-right: 8px;
}
</style>
