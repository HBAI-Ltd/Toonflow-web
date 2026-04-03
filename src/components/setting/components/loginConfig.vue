<template>
  <t-loading :loading="loading">
    <t-form ref="formRef" labelAlign="top" :data="formData" :rules="formRules" :colon="true" @submit="handleSubmit" @reset="handleReset">
      <t-form-item :label="$t('settings.login.username')" name="name">
        <t-input v-model="formData.name" :placeholder="$t('settings.login.usernamePlaceholder')" clearable width="100%" />
      </t-form-item>
      <t-form-item :label="$t('settings.login.password')" name="password">
        <t-input v-model="formData.password" type="password" :placeholder="$t('settings.login.passwordPlaceholder')" />
      </t-form-item>
      <t-form-item :status-icon="false">
        <t-space size="small">
          <t-button theme="primary" type="submit" :loading="loading">{{ $t("settings.login.modify") }}</t-button>
        </t-space>
      </t-form-item>
    </t-form>
  </t-loading>
</template>

<script setup lang="ts">
import type { FormInstanceFunctions, SubmitContext, FormRules } from "tdesign-vue-next";
import axios from "@/utils/axios";

interface UserForm {
  id: number | null;
  name: string;
  password: string;
}

const formRef = ref<FormInstanceFunctions | null>(null);
const loading = ref(false);

const formData = ref<UserForm>({
  id: null,
  name: "",
  password: "",
});

const formRules: FormRules<UserForm> = {
  name: [
    { required: true, message: $t("settings.login.msg.enterUsername"), trigger: "blur" },
    { min: 2, max: 20, message: $t("settings.login.msg.usernameLength"), trigger: "blur" },
  ],
  password: [
    { required: true, message: $t("settings.login.msg.enterPassword"), trigger: "blur" },
    { min: 6, max: 20, message: $t("settings.login.msg.passwordLength"), trigger: "blur" },
  ],
};

async function fetchUserInfo() {
  try {
    const res = await axios.get("/setting/loginConfig/getUser");
    formData.value = {
      id: res.data.id ?? null,
      name: res.data.name ?? "",
      password: res.data.password ?? "",
    };
  } catch (error) {
    window.$message.error($t("settings.login.msg.fetchFailed"));
  }
}

async function saveUserInfo() {
  loading.value = true;
  try {
    await axios.post("/setting/loginConfig/updateUserPwd", formData.value);
    window.$message.success($t("settings.login.msg.saveSuccess"));
    await fetchUserInfo();
  } catch (error) {
    window.$message.error($t("settings.login.msg.saveFailed"));
  } finally {
    loading.value = false;
  }
}

function handleSubmit(context: SubmitContext) {
  if (context.validateResult === true) {
    saveUserInfo();
  }
}

function handleReset() {
  formRef.value?.reset();
}

onMounted(() => {
  fetchUserInfo();
});
</script>

<style lang="scss" scoped></style>
