<template>
  <t-config-provider :global-config="globalConfig">
    <el-config-provider>
      <a-config-provider :theme="theme" :locale="zhCN">
        <router-view></router-view>
        <UpdateDialog />
      </a-config-provider>
    </el-config-provider>
  </t-config-provider>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute } from "vue-router";
import zhCN from "ant-design-vue/es/locale/zh_CN";
import UpdateDialog from "@/components/update.vue";
import { initTheme } from "@/utils/theme";
import settingStore from "@/stores/setting";
import { storeToRefs } from "pinia";

const route = useRoute();
const store = settingStore();
const { baseUrl, wsBaseUrl } = storeToRefs(store);

const initFromLocationSearch = (): boolean => {
  const params = new URLSearchParams(window.location.search);
  const nextBaseUrl = params.get("baseUrl");
  const nextWsBaseUrl = params.get("wsBaseUrl");

  let initialized = false;
  if (nextBaseUrl) {
    baseUrl.value = nextBaseUrl;
    initialized = true;
  }

  if (nextWsBaseUrl) {
    wsBaseUrl.value = nextWsBaseUrl;
    initialized = true;
  }

  return initialized;
};

const initFromElectronRuntime = async (): Promise<boolean> => {
  if (!window.electronRuntime) return false;

  try {
    const config = await window.electronRuntime.getBackendConfig();
    if (config.baseUrl) {
      baseUrl.value = config.baseUrl;
    }
    if (config.wsBaseUrl) {
      wsBaseUrl.value = config.wsBaseUrl;
    }
    return Boolean(config.baseUrl || config.wsBaseUrl);
  } catch (error) {
    console.error("[Electron runtime 配置初始化失败]:", error);
    return false;
  }
};

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

const initRequestAddress = async () => {
  const initializedBySearch = initFromLocationSearch();
  const initializedByRuntime = await initFromElectronRuntime();

  if (!initializedByRuntime && !initializedBySearch) {
    initFromQuery();
  }
};

// 优先使用 Electron 运行时注入，query 仅作为兜底兼容
void initRequestAddress();

// 非 Electron 模式下保留 query 动态更新能力
watch(
  () => route.query,
  () => {
    if (!window.electronRuntime) {
      initFromQuery();
    }
  },
  { deep: true }
);
// 初始化主题
onMounted(() => {
  initTheme();
});

const theme = {
  token: {
    colorPrimary: "#9810fa",
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
:root {
  --mainColor: #9810fa;
  --mainColorLight: #faf5ff;
  --mainColorHover: #7c0dd4;
  --mainColorActive: #6a0bb5;
  --mainGradient: linear-gradient(135deg, #9810fa 0%, #7c3aed 100%);
  --mainGradientHover: linear-gradient(135deg, #a020fb 0%, #8b5cf6 100%);
}
</style>
