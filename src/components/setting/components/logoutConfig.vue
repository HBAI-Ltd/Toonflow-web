<template>
  <div class="logout-config">
    <t-space direction="vertical" size="medium">
      <t-alert theme="warning" :message="$t('settings.logout.warning')" />
      <t-button theme="danger" :loading="loading" @click="openLogoutDialog">
        <template #icon>
          <t-icon name="logout" />
        </template>
        {{ $t("settings.logout.logout") }}
      </t-button>
    </t-space>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { DialogPlugin } from "tdesign-vue-next";

const router = useRouter();
const loading = ref(false);

function openLogoutDialog() {
  const dialog = DialogPlugin.confirm({
    header: $t("settings.logout.logout"),
    body: $t("settings.logout.confirmLogout"),
    confirmBtn: {
      content: $t("settings.logout.logout"),
      theme: "danger",
    },
    cancelBtn: $t("common.cancel"),
    onConfirm: async () => {
      dialog.destroy();
      await handleLogout();
    },
    onClose: () => dialog.destroy(),
  });
}

async function handleLogout() {
  loading.value = true;
  try {
    // 清除本地存储的token
    localStorage.removeItem("token");
    // 清除其他可能的用户数据
    localStorage.removeItem("user");

    window.$message.success($t("settings.logout.msg.logoutSuccess"));

    // 跳转到登录页面
    router.push("/login");
  } catch (error) {
    window.$message.error($t("settings.logout.msg.logoutFailed"));
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
