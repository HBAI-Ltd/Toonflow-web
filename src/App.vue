<template>
  <t-config-provider :global-config="globalConfig">
    <router-view></router-view>
    <UpdateDialog />
  </t-config-provider>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";
import UpdateDialog from "@/components/update.vue";
import { initTheme } from "@/utils/theme";
import settingStore from "@/stores/setting";
import { storeToRefs } from "pinia";

const route = useRoute();
const store = settingStore();
const { baseUrl, wsBaseUrl } = storeToRefs(store);

// 从 URL query 参数设置请求地址
const initFromQuery = () => {
  const query = route.query;
  // 支持通过 ?baseUrl=xxx 设置请求地址
  if (query.baseUrl && typeof query.baseUrl === "string") {
    baseUrl.value = query.baseUrl;
    console.log("Set baseUrl to:", query.baseUrl);
  }
  // 支持通过 ?wsBaseUrl=xxx 设置 WebSocket 地址
  if (query.wsBaseUrl && typeof query.wsBaseUrl === "string") {
    wsBaseUrl.value = query.wsBaseUrl;
    console.log("Set wsBaseUrl to:", query.wsBaseUrl);
  }
};
// 监听路由变化，确保 query 参数更新时也能处理
watch(
  () => route.query,
  () => {
    initFromQuery();
  },
  { immediate: true, deep: true },
);
// 初始化主题
onMounted(() => {
  initTheme();
});

const theme = {
  token: {
    colorPrimary: "#000",
  },
};

import { merge } from "lodash-es";
import zhConfig from "tdesign-vue-next/es/locale/zh_CN";

import { type GlobalConfigProvider } from "tdesign-vue-next";
const empty: GlobalConfigProvider = {};
const customConfig: GlobalConfigProvider = {
  calendar: {},
  table: {},
  pagination: {},
};
const globalConfig: GlobalConfigProvider = merge(empty, zhConfig, customConfig);

// document.documentElement.setAttribute('theme-mode', 'dark');
// document.documentElement.setAttribute('theme-mode', 'light');
</script>

<style lang="scss">
</style>
