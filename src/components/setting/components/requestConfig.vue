<template>
  <div class="requestConfig">
    <t-alert style="margin-bottom: 16px" theme="warning" :message="$t('settings.request.warning')"></t-alert>
    <t-form :data="formData" labelAlign="top" :rules="formRules">
      <t-form-item :label="$t('settings.request.apiAddress')" name="baseUrl">
        <t-input v-model="formData.baseUrl" :placeholder="$t('settings.request.apiPlaceholder')" clearable>
          <template #prefix-icon>
            <t-icon name="link" />
          </template>
        </t-input>
      </t-form-item>
      <t-form-item>
        <t-space size="small">
          <t-button theme="primary" type="submit" @click="handleSubmit">{{ $t("settings.request.save") }}</t-button>
          <t-button theme="default" @click="handleReset">{{ $t("settings.request.reset") }}</t-button>
          <t-button v-if="isElectron" theme="warning" @click="refreshAPI">{{ $t("settings.request.refresh") }}</t-button>
        </t-space>
      </t-form-item>
    </t-form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { type FormRules } from "tdesign-vue-next";
import settingStore from "@/stores/setting";
const { baseUrl, isElectron } = storeToRefs(settingStore());

interface RequestForm {
  baseUrl: string;
}

const formData = ref<RequestForm>({
  baseUrl: "",
});

const formRules: FormRules<RequestForm> = {
  baseUrl: [
    { required: true, message: $t("settings.request.msg.enterApi"), trigger: "blur" },
    {
      pattern: /^https?:\/\/.+/,
      message: $t("settings.request.msg.validUrl"),
      trigger: "blur",
    },
  ],
};

function loadSettings() {
  formData.value.baseUrl = baseUrl.value;
}

function handleSubmit() {
  baseUrl.value = formData.value.baseUrl;
  window.$message.success($t("settings.request.msg.saved"));
}

function handleReset() {
  // Reset to same-origin in the browser; fall back to the dev port when
  // running in non-http context (e.g. electron file://).
  formData.value.baseUrl =
    typeof window !== "undefined" && window.location?.protocol?.startsWith("http")
      ? `${window.location.origin}/api`
      : "http://localhost:10588";
  baseUrl.value = formData.value.baseUrl;
  window.$message.success($t("settings.request.msg.reset"));
}

async function refreshAPI() {
  try {
    const res = await fetch("toonflow://getAppUrl");
    const data = await res.json();
    if (data?.port) {
      baseUrl.value = data.url;
      isElectron.value = true;
      window.$message.success($t("settings.request.msg.refreshSuccess"));
    }
  } catch (error) {
    window.$message.error($t("settings.request.msg.refreshFailed"));
  }
}

onMounted(() => {
  loadSettings();
});
</script>

<style lang="scss" scoped></style>
