<template>
  <div class="logout-config">
    <t-space direction="vertical" size="medium">
      <t-alert theme="warning" message="退出登录后，您需要重新登录才能继续使用系统。" />
      <t-popconfirm content="确定要退出登录吗？" @confirm="handleLogout">
        <t-button theme="danger" :loading="loading">
          <template #icon>
            <t-icon name="logout" />
          </template>
          退出登录
        </t-button>
      </t-popconfirm>
    </t-space>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { MessagePlugin } from "tdesign-vue-next";

const router = useRouter();
const loading = ref(false);

async function handleLogout() {
  loading.value = true;
  try {
    // 清除本地存储的token
    localStorage.removeItem("token");
    // 清除其他可能的用户数据
    localStorage.removeItem("user");
    
    MessagePlugin.success("退出登录成功");
    
    // 跳转到登录页面
    router.push("/login");
  } catch (error) {
    MessagePlugin.error("退出登录失败，请重试");
  } finally {
    loading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.logout-config {
  padding: 10px 0;
}
</style>
