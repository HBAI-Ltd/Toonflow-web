<template>
  <div class="app">
    <t-config-provider :global-config="globalConfig">
      <router-view></router-view>
      <UpdateDialog />
    </t-config-provider>
  </div>
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

onBeforeMount(() => {
  document.addEventListener("keydown", function (event) {
    if (event.key === "F8") {
      event.preventDefault();
      debugger;
    }
  });
});

// 初始化主题
onMounted(() => {
  initTheme();
  setTimeout(() => {
    if (window.$electron) {
      const port = window.$port;
      if (port) baseUrl.value = `http://localhost:${window.$port}/api`;
    }
  }, 1000);
});

const theme = {
  token: {
    colorPrimary: "#000",
  },
};

import { merge, set } from "lodash-es";
import zhConfig from "tdesign-vue-next/es/locale/zh_CN";
import enConfig from "tdesign-vue-next/es/locale/en_US";
import { cachedLocale } from "@/locales";

import { type GlobalConfigProvider } from "tdesign-vue-next";

const tdesignLocaleMap: Record<string, object> = {
  "zh-CN": zhConfig,
  en: enConfig,
};

const customConfig: GlobalConfigProvider = {
  calendar: {},
  table: {},
  pagination: {},
};
const globalConfig = computed<GlobalConfigProvider>(() => merge({}, tdesignLocaleMap[cachedLocale.value] || zhConfig, customConfig));

onBeforeMount(() => {
  document.documentElement.setAttribute("theme-mode", "light");
  document.documentElement.setAttribute("data-theme", "light");
});
</script>

<style lang="scss">
.app {
  transform-origin: 50% 45%;
  animation: app-intro 1000ms cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes app-intro {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }

  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
