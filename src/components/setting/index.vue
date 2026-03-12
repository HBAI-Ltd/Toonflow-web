<template>
  <t-dialog header="ToonFlow设置" :footer="false" placement="center" width="60%" v-model:visible="showSetting">
    <div class="settingPanel">
      <t-menu class="settingMenu" v-model:value="activeMenu" :style="{ height: '70vh' }">
        <t-menu-item v-for="item in menuItems" :key="item.key" :value="item.key">
          <template #icon>
            <component :is="item.icon" class="icon" />
          </template>
          {{ item.label }}
        </t-menu-item>
      </t-menu>
      <div class="settingRight">
        <h3 class="sectionTitle">{{ currentMenuItem?.label }}</h3>
        <div class="settingContent">
          <modelServe v-if="activeMenu === 'modelServe'" />
          <themeConfig v-if="activeMenu === 'themeConfig'" />
          <requestConfig v-if="activeMenu === 'requestConfig'" />
          <loginConfig v-if="activeMenu === 'loginConfig'" />
          <agentConfog v-if="activeMenu === 'agentConfog'" />
          <otherConfig v-if="activeMenu === 'otherConfig'" />
          <dbConfig v-if="activeMenu === 'dbConfig'" />
          <about v-if="activeMenu === 'about'" />
          <logoutConfig v-if="activeMenu === 'logoutConfig'" />
        </div>
      </div>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import settingStore from "@/stores/setting";
const { showSetting } = storeToRefs(settingStore());

import themeConfig from "./components/themeConfig.vue";
import requestConfig from "./components/requestConfig.vue";
import loginConfig from "./components/loginConfig.vue";
import agentConfog from "./components/agentConfog.vue";
import dbConfig from "./components/dbConfig.vue";
import otherConfig from "./components/otherConfig.vue";
import about from "./components/about.vue";
import logoutConfig from "./components/logoutConfig.vue";
import modelServe from "./components/modelServe.vue";

const menuItems = [
  { key: "themeConfig", label: "主题", icon: "i-platte" },
  { key: "modelServe", label: "模型服务", icon: "i-network-drive" },
  { key: "agentConfog", label: "Agent配置", icon: "i-color-filter" },
  { key: "loginConfig", label: "登录配置", icon: "i-lock" },
  { key: "dbConfig", label: "数据库操作", icon: "i-database-config" },
  { key: "otherConfig", label: "其他配置", icon: "i-application-menu" },
  { key: "requestConfig", label: "请求地址", icon: "i-api" },
  { key: "about", label: "检查更新", icon: "i-info" },
  { key: "logoutConfig", label: "退出登录", icon: "i-logout" },
];

const activeMenu = ref("modelServe");
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
      margin-right: 0.5rem;
    }
  }

  .settingRight {
    flex: 1;
    padding: 16px 32px;
    overflow-y: auto;

    .sectionTitle {
      margin: 0 0 20px 0;
      font-size: 16px;
      font-weight: 600;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--td-component-border);
    }

    .settingContent {
      width: 100%;
    }
  }
}
</style>
