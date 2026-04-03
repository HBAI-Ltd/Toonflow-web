<template>
  <titleBar v-if="isElectron" />
  <t-config-provider :global-config="globalConfig">
    <router-view></router-view>
  </t-config-provider>
</template>

<script setup lang="ts">
import settingStore from "@/stores/setting";
import { merge } from "lodash-es";
import zhConfig from "tdesign-vue-next/es/locale/zh_CN";
import enConfig from "tdesign-vue-next/es/locale/en_US";
import { cachedLocale } from "@/locales";
import { initTheme } from "@/utils/theme";
import { type GlobalConfigProvider } from "tdesign-vue-next";
const { baseUrl, isElectron, themeSetting } = storeToRefs(settingStore());
import { config } from "md-editor-v3";

watch(
  () => isElectron.value,
  (newVal) => {
    if (newVal) {
      document.body.classList.add("is-electron");
    } else {
      document.body.classList.remove("is-electron");
    }
  },
  { immediate: true },
);

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
  themeSetting.value.primaryColor = "#000";
  initTheme();
  getPort();
});

async function handleLinkClick(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();

  const target = event.currentTarget as HTMLAnchorElement | null;
  const url = target?.getAttribute("data-link") || target?.getAttribute("href");
  if (!url) return false;

  if (isElectron.value) {
    await fetch(`toonflow://openurlwithbrowser?url=${encodeURIComponent(url)}`);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return false;
}

onMounted(() => {
  (window as any).handleLinkClick = handleLinkClick;
});

async function getPort() {
  await nextTick();
  await nextTick();
  await nextTick();
  await nextTick();
  try {
    const res = await fetch("toonflow://getPort");
    const data = await res.json();
    if (data?.port) {
      baseUrl.value = `http://localhost:${data.port}/api`;
      isElectron.value = true;
    }
  } catch (error) {}

  config({
    markdownItConfig(md) {
      // 自定义链接渲染
      const defaultRender =
        md.renderer.rules.link_open ||
        function (tokens, idx, options, env, self) {
          return self.renderToken(tokens, idx, options);
        };
      md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
        const token = tokens[idx];
        const href = token.attrGet("href");

        if (href) {
          // 添加 target="_blank" 在新窗口打开
          token.attrSet("target", "_blank");
          token.attrSet("rel", "noopener noreferrer");

          // 或者添加自定义点击事件的标识
          token.attrSet("data-link", href);
          token.attrSet("onclick", "return handleLinkClick(event)");
        }

        return defaultRender(tokens, idx, options, env, self);
      };
    },
  });
}

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

<style lang="scss"></style>
