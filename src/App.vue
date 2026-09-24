<template>
  <div v-if="loading" class="app-loading">
    <t-loading :loading="true" size="large" text="加载中..." />
  </div>
  <template v-else>
    <titleBar v-if="isElectron" />
    <t-config-provider :global-config="globalConfig">
      <router-view></router-view>
      <!-- 全局后台任务托盘：跨页面常驻，长任务切走路由后继续运行 -->
      <globalTaskTray />
    </t-config-provider>
  </template>
</template>

<script setup lang="ts">
import settingStore from "@/stores/setting";
import { merge } from "lodash";
import zhConfig from "tdesign-vue-next/es/locale/zh_CN";
import enConfig from "tdesign-vue-next/es/locale/en_US";
import { cachedLocale, languageList } from "@/locales";
import { initTheme } from "@/utils/theme";
import { type GlobalConfigProvider } from "tdesign-vue-next";
import { useI18n } from "vue-i18n";

const { locale } = useI18n();
const { baseUrl, isElectron } = storeToRefs(settingStore());
import { config } from "md-editor-v3";

const loading = ref(true);

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
onMounted(async () => {
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
    const res = await fetch("toonflow://getAppUrl");
    const data = await res.json();
    if (data?.url) {
      baseUrl.value = data.url;
      isElectron.value = true;
    }
  } catch (error) {}

  loading.value = false;

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

  try {
    const language = navigator.language;
    if (language && languageList.some((item) => item.value === language)) {
      cachedLocale.value = language;
      locale.value = language;
    }
  } catch (e) {
    console.error("获取语言失败", e);
  }
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
  initTheme();
});
</script>

<style lang="scss">
.app-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  background: var(--td-bg-color-page, #f5f5f5);
}
</style>
