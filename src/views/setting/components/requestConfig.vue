<template>
  <div class="request-config">
    <div v-if="isElectronRuntime" class="runtime-tip">
      Electron 运行时地址由系统注入，当前为只读模式。
    </div>
    <t-form :data="formData" labelAlign="top" :rules="formRules" @submit="handleSubmit">
      <t-form-item label="API 地址" name="baseUrl">
        <t-input v-model="formData.baseUrl" :disabled="isElectronRuntime" placeholder="请输入 API 请求地址" clearable>
          <template #prefix-icon>
            <t-icon name="link" />
          </template>
        </t-input>
      </t-form-item>
      <t-form-item label="WebSocket地址" name="wsBaseUrl">
        <t-input v-model="formData.wsBaseUrl" :disabled="isElectronRuntime" placeholder="请输入 WebSocket 地址" clearable>
          <template #prefix-icon>
            <t-icon name="swap" />
          </template>
        </t-input>
      </t-form-item>
      <t-form-item>
        <t-space size="small">
          <t-button theme="primary" type="submit" :disabled="isElectronRuntime">保存</t-button>
          <t-button theme="default" :disabled="isElectronRuntime" @click="handleReset">重置</t-button>
        </t-space>
      </t-form-item>
    </t-form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { MessagePlugin, type FormRules } from "tdesign-vue-next";
import useSettingStore from "@/stores/setting";

interface RequestForm {
  baseUrl: string;
  wsBaseUrl: string;
}

const settingStore = useSettingStore();
const isElectronRuntime = computed(() => Boolean(window.electronRuntime));

const formData = ref<RequestForm>({
  baseUrl: "",
  wsBaseUrl: "",
});

const formRules: FormRules<RequestForm> = {
  baseUrl: [
    { required: true, message: "请输入 API 地址", trigger: "blur" },
    { 
      pattern: /^https?:\/\/.+/, 
      message: "请输入有效的 HTTP/HTTPS 地址", 
      trigger: "blur" 
    },
  ],
  wsBaseUrl: [
    { required: true, message: "请输入 WebSocket 地址", trigger: "blur" },
    { 
      pattern: /^wss?:\/\/.+/, 
      message: "请输入有效的 WS/WSS 地址", 
      trigger: "blur" 
    },
  ],
};

function loadSettings() {
  formData.value.baseUrl = settingStore.baseUrl;
  formData.value.wsBaseUrl = settingStore.wsBaseUrl;
}

function handleSubmit({ validateResult }: { validateResult: boolean }) {
  if (isElectronRuntime.value) {
    MessagePlugin.warning("Electron 运行时地址已锁定");
    return;
  }

  if (validateResult) {
    settingStore.baseUrl = formData.value.baseUrl;
    settingStore.wsBaseUrl = formData.value.wsBaseUrl;
    MessagePlugin.success("请求地址保存成功");
  }
}

function handleReset() {
  if (isElectronRuntime.value) {
    MessagePlugin.warning("Electron 运行时地址已锁定");
    return;
  }

  formData.value.baseUrl = "http://localhost:60000";
  formData.value.wsBaseUrl = "ws://localhost:60000";
  settingStore.baseUrl = formData.value.baseUrl;
  settingStore.wsBaseUrl = formData.value.wsBaseUrl;
  MessagePlugin.success("已重置为默认地址");
}

onMounted(() => {
  loadSettings();
});
</script>

<style lang="scss" scoped>
.request-config {
  padding: 10px 0;
}

.runtime-tip {
  margin-bottom: 12px;
  padding: 8px 12px;
  font-size: 13px;
  color: #9a6700;
  background: #fff8c5;
  border: 1px solid #f0d885;
  border-radius: 6px;
}
</style>
