<template>
  <div class="request-config">
    <t-form :data="formData" labelAlign="top" :rules="formRules" @submit="handleSubmit">
      <t-form-item label="API 地址" name="baseUrl">
        <t-input v-model="formData.baseUrl" placeholder="例如：https://example.com/toonflow 或 /toonflow" clearable>
          <template #prefix-icon>
            <t-icon name="link" />
          </template>
        </t-input>
      </t-form-item>
      <t-form-item label="WebSocket地址" name="wsBaseUrl">
        <t-input v-model="formData.wsBaseUrl" placeholder="例如：wss://example.com/toonflow 或 /toonflow" clearable>
          <template #prefix-icon>
            <t-icon name="swap" />
          </template>
        </t-input>
      </t-form-item>
      <t-form-item>
        <t-space size="small">
          <t-button theme="primary" type="submit">保存</t-button>
          <t-button theme="default" @click="handleReset">重置</t-button>
        </t-space>
      </t-form-item>
    </t-form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { MessagePlugin, type FormRules } from "tdesign-vue-next";
import useSettingStore from "@/stores/setting";

interface RequestForm {
  baseUrl: string;
  wsBaseUrl: string;
}

const settingStore = useSettingStore();
const FALLBACK_HTTP_BASE = "http://localhost:60000";
const FALLBACK_WS_BASE = "ws://localhost:60000";

const formData = ref<RequestForm>({
  baseUrl: "",
  wsBaseUrl: "",
});

function isFileRuntime(): boolean {
  const protocol = window.location.protocol || "";
  const origin = window.location.origin || "";
  return protocol === "file:" || origin === "null" || !window.location.host;
}

function getRuntimeDefaults() {
  if (isFileRuntime()) {
    return { apiBase: FALLBACK_HTTP_BASE, wsBase: FALLBACK_WS_BASE };
  }
  const pathname = (window.location.pathname || "/").replace(/\/index\.html?$/i, "/");
  const basePath = pathname.replace(/\/+$/, "") || "/";
  const apiBase = `${window.location.origin}${basePath === "/" ? "" : basePath}`;
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsBase = `${wsProtocol}//${window.location.host}${basePath === "/" ? "" : basePath}`;
  return { apiBase, wsBase };
}

const formRules: FormRules<RequestForm> = {
  baseUrl: [
    { required: true, message: "请输入 API 地址", trigger: "blur" },
    {
      pattern: /^(https?:\/\/.+|\/.+|\.\/.+)$/,
      message: "请输入有效地址（http(s)://、/path 或 ./path）",
      trigger: "blur",
    },
  ],
  wsBaseUrl: [
    { required: true, message: "请输入 WebSocket 地址", trigger: "blur" },
    {
      pattern: /^(wss?:\/\/.+|https?:\/\/.+|\/.+|\.\/.+)$/,
      message: "请输入有效地址（ws(s)://、http(s)://、/path 或 ./path）",
      trigger: "blur",
    },
  ],
};

function loadSettings() {
  const defaults = getRuntimeDefaults();
  formData.value.baseUrl = (settingStore.baseUrl || defaults.apiBase).trim();
  formData.value.wsBaseUrl = (settingStore.wsBaseUrl || defaults.wsBase).trim();

  settingStore.baseUrl = formData.value.baseUrl;
  settingStore.wsBaseUrl = formData.value.wsBaseUrl;
}

function normalizeHttpInput(value: string): string {
  const normalized = value.trim();
  if (!isFileRuntime()) return normalized;
  if (normalized.startsWith("/")) {
    return `${FALLBACK_HTTP_BASE.replace(/\/+$/, "")}${normalized}`;
  }
  if (normalized.startsWith("./")) {
    return `${FALLBACK_HTTP_BASE.replace(/\/+$/, "")}/${normalized.slice(2)}`;
  }
  return normalized;
}

function normalizeWsInput(value: string): string {
  const normalized = value.trim();
  if (!isFileRuntime()) return normalized;
  if (normalized.startsWith("/")) {
    return `${FALLBACK_WS_BASE.replace(/\/+$/, "")}${normalized}`;
  }
  if (normalized.startsWith("./")) {
    return `${FALLBACK_WS_BASE.replace(/\/+$/, "")}/${normalized.slice(2)}`;
  }
  return normalized;
}

function handleSubmit({ validateResult }: { validateResult: boolean }) {
  if (validateResult) {
    const nextBaseUrl = normalizeHttpInput(formData.value.baseUrl);
    const nextWsBaseUrl = normalizeWsInput(formData.value.wsBaseUrl);
    formData.value.baseUrl = nextBaseUrl;
    formData.value.wsBaseUrl = nextWsBaseUrl;
    settingStore.baseUrl = nextBaseUrl;
    settingStore.wsBaseUrl = nextWsBaseUrl;
    MessagePlugin.success("请求地址保存成功");
  }
}

function handleReset() {
  const defaults = getRuntimeDefaults();
  formData.value.baseUrl = defaults.apiBase;
  formData.value.wsBaseUrl = defaults.wsBase;
  settingStore.baseUrl = formData.value.baseUrl;
  settingStore.wsBaseUrl = formData.value.wsBaseUrl;
  MessagePlugin.success("已重置为当前站点地址");
}

onMounted(() => {
  loadSettings();
});
</script>

<style lang="scss" scoped>
.request-config {
  padding: 10px 0;
}
</style>
