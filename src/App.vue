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
const FALLBACK_HTTP_BASE = "http://localhost:60000";
const FALLBACK_WS_BASE = "ws://localhost:60000";

function isFileRuntime(): boolean {
  const protocol = window.location.protocol || "";
  const origin = window.location.origin || "";
  return protocol === "file:" || origin === "null" || !window.location.host;
}

function getRuntimeBasePath(): string {
  const pathname = window.location.pathname || "/";
  const withoutIndex = pathname.replace(/\/index\.html?$/i, "/");
  const normalized = withoutIndex.replace(/\/+$/, "");
  return normalized || "/";
}

function getRuntimeHttpBase(): string {
  if (isFileRuntime()) return FALLBACK_HTTP_BASE;
  const basePath = getRuntimeBasePath();
  return `${window.location.origin}${basePath === "/" ? "" : basePath}`;
}

function getRuntimeWsBase(): string {
  if (isFileRuntime()) return FALLBACK_WS_BASE;
  const basePath = getRuntimeBasePath();
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${window.location.host}${basePath === "/" ? "" : basePath}`;
}

function shouldResetBaseUrl(value: string): boolean {
  const normalized = (value || "").trim();
  return (
    !normalized ||
    normalized === "null" ||
    normalized.startsWith("null/") ||
    normalized.startsWith("file://") ||
    normalized === "http://localhost:60000" ||
    normalized === "http://127.0.0.1:60000"
  );
}

function shouldResetWsBaseUrl(value: string): boolean {
  const normalized = (value || "").trim();
  return (
    !normalized ||
    normalized.startsWith("ws:///") ||
    normalized.startsWith("wss:///") ||
    normalized === "ws://localhost:60000" ||
    normalized === "ws://127.0.0.1:60000"
  );
}

function initRuntimeDefaults() {
  if (shouldResetBaseUrl(baseUrl.value)) {
    baseUrl.value = getRuntimeHttpBase();
  }
  if (shouldResetWsBaseUrl(wsBaseUrl.value)) {
    wsBaseUrl.value = getRuntimeWsBase();
  }
}

function initFromQuery() {
  const query = route.query;
  if (query.baseUrl && typeof query.baseUrl === "string") {
    baseUrl.value = query.baseUrl;
  }
  if (query.wsBaseUrl && typeof query.wsBaseUrl === "string") {
    wsBaseUrl.value = query.wsBaseUrl;
  }
}

watch(
  () => route.query,
  () => {
    initRuntimeDefaults();
    initFromQuery();
  },
  { immediate: true, deep: true },
);

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
