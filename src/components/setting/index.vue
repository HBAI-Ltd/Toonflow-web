<template>
  <t-dialog header="ToonFlow设置" :footer="false" placement="center" width="60%" v-model:visible="showSetting">
    <div class="settingPanel">
      <t-menu class="settingMenu" v-model:value="activeMenu" :style="{ height: '70vh' }">
        <t-menu-item v-for="item in menuItems" :key="item.key" :value="item.key">
          <template #icon>
            <t-icon :name="item.icon" />
          </template>
          {{ item.label }}
        </t-menu-item>
      </t-menu>
      <div class="settingRight">
        <h3 class="sectionTitle">{{ currentMenuItem?.label }}</h3>
        <div class="settingContent">
          <themeConfig v-if="activeMenu === 'theme'" />
          <requestConfig v-else-if="activeMenu === 'request'" />
          <loginConfig v-else-if="activeMenu === 'login'" />
          <aiConfog v-else-if="activeMenu === 'ai'" />
          <videoModelConfig v-else-if="activeMenu === 'video'" />
          <otherConfig v-else-if="activeMenu === 'other'" />
          <dbConfig v-else-if="activeMenu === 'db'" />
          <about v-else-if="activeMenu === 'about'" />
          <logoutConfig v-else-if="activeMenu === 'logout'" />
          <modelServe v-else-if="activeMenu === 'serve'" />
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
import aiConfog from "./components/aiConfog.vue";
import videoModelConfig from "./components/videoModelConfig.vue";
import dbConfig from "./components/dbConfig.vue";
import otherConfig from "./components/otherConfig.vue";
import about from "./components/about.vue";
import logoutConfig from "./components/logoutConfig.vue";
import modelServe from "./components/modelServe.vue";

const menuItems = [
  { key: "serve", label: "模型服务", icon: "logo-codesandbox" },
  { key: "theme", label: "主题", icon: "palette" },
  { key: "request", label: "请求地址配置", icon: "link" },
  { key: "login", label: "登录配置", icon: "lock-on" },
  { key: "ai", label: "语言模型配置", icon: "chat" },
  { key: "video", label: "视频模型配置", icon: "video" },
  { key: "other", label: "其他配置", icon: "setting" },
  { key: "db", label: "数据库操作", icon: "server" },
  { key: "about", label: "关于", icon: "info-circle" },
  { key: "logout", label: "退出登录", icon: "poweroff" },
];

const activeMenu = ref("serve");
const currentMenuItem = computed(() => menuItems.find((item) => item.key === activeMenu.value));
</script>

<style lang="scss" scoped>
.settingPanel {
  display: flex;
  height: 70vh;
  overflow: hidden;
}

.settingMenu {
  width: 200px;
  min-width: 200px;
  border-right: 1px solid var(--td-component-border);
  flex-shrink: 0;
}

.settingRight {
  flex: 1;
  padding: 16px 32px;
  overflow-y: auto;
}

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
</style>
