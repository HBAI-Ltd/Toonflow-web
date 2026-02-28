<template>
  <a-layout class="workbenchView">
    <a-layout-sider :style="siderStyle" :width="255">
      <sider />
    </a-layout-sider>
    <a-layout-content :style="contentStyle">
      <router-view></router-view>
    </a-layout-content>
  </a-layout>
</template>

<script setup lang="ts">
import sider from "@/components/sider.vue";

import type { CSSProperties } from "vue";
const siderStyle: CSSProperties = {
  width: "255px",
  backgroundColor: "#ffffff",
  borderRight: "1px solid #e5e7eb",
};

const contentStyle: CSSProperties = {
  background: "linear-gradient(180deg, #faf5ff 0%, #f8fafc 100%)",
  height: "100vh",
  overflow: "auto",
};
</script>

<style lang="scss" scoped>
.workbenchView {
  height: 100vh;
  width: 100vw;
}
</style>
