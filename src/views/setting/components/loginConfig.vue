<template>
  <div v-loading="loading">
    <t-form ref="formRef" labelAlign="top" :data="formData" :rules="formRules" :colon="true" @submit="handleSubmit" @reset="handleReset">
      <t-form-item label="用户名" name="name">
        <t-input v-model="formData.name" placeholder="请输入用户名" clearable width="100%" />
      </t-form-item>
      <t-form-item label="密码" name="password">
        <t-input v-model="formData.password" type="password" placeholder="请输入密码" />
      </t-form-item>
      <t-form-item :status-icon="false">
        <t-space size="small">
          <t-button theme="primary" type="submit" :loading="loading">修改</t-button>
        </t-space>
      </t-form-item>
    </t-form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
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
    { required: true, message: "请输入用户名", trigger: "blur" },
    { min: 2, max: 20, message: "用户名长度为 2-20 个字符", trigger: "blur" },
  ],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    { min: 6, max: 20, message: "密码长度为 6-20 个字符", trigger: "blur" },
  ],
};

async function fetchUserInfo() {
  try {
    const res = await axios.get("/user/getUser");
    formData.value = {
      id: res.data.id ?? null,
      name: res.data.name ?? "",
      password: res.data.password ?? "",
    };
  } catch (error) {
    window.$message.error("获取用户信息失败");
  }
}

async function saveUserInfo() {
  loading.value = true;
  try {
    await axios.post("/user/saveUser", formData.value);
    window.$message.success("保存成功");
    await fetchUserInfo();
  } catch (error) {
    window.$message.error("保存失败");
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
