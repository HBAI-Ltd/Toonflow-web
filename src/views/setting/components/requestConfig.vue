<template>
  <div class="request-config">
    <t-form :data="formData" labelAlign="top" :rules="formRules" @submit="handleSubmit">
      <t-form-item label="API 地址" name="baseUrl">
        <t-input v-model="formData.baseUrl" placeholder="请输入 API 请求地址" clearable>
          <template #prefix-icon>
            <t-icon name="link" />
          </template>
        </t-input>
      </t-form-item>
      <t-form-item label="WebSocket地址" name="wsBaseUrl">
        <t-input v-model="formData.wsBaseUrl" placeholder="请输入 WebSocket 地址" clearable>
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
  if (validateResult) {
    settingStore.baseUrl = formData.value.baseUrl;
    settingStore.wsBaseUrl = formData.value.wsBaseUrl;
    MessagePlugin.success("请求地址保存成功");
  }
}

function handleReset() {
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
</style>
