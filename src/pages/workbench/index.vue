<template>
  <a-layout class="workbenchView">
    <a-layout-sider :style="siderStyle" :width="255">
      <sider />
    </a-layout-sider>
    <a-layout class="mainArea">
      <!-- Tab 标签栏 -->
      <div class="tabBar" v-if="tabs.length > 1">
        <div
          v-for="tab in tabs"
          :key="tab.key"
          :class="['tabItem', { tabItemActive: tab.path === activeTab }]"
          @click="handleTabClick(tab.path)">
          <span class="tabTitle">{{ tab.title }}</span>
          <span v-if="tab.closable" class="tabClose" @click.stop="handleTabClose(tab.path)">&times;</span>
        </div>
      </div>
      <a-layout-content :style="contentStyle">
        <router-view v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" :key="$route.path" />
          </keep-alive>
        </router-view>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import sider from "@/components/sider.vue";
import appStore from "@/stores";

import type { CSSProperties } from "vue";

const store = appStore();
const { tabs, activeTab } = storeToRefs(store);
const router = useRouter();

const siderStyle: CSSProperties = {
  width: "255px",
  backgroundColor: "#ffffff",
  borderRight: "1px solid #e5e7eb",
};

const contentStyle: CSSProperties = {
  background: "linear-gradient(180deg, #faf5ff 0%, #f8fafc 100%)",
  flex: 1,
  overflow: "auto",
};

function handleTabClick(path: string) {
  store.switchTab(path);
  router.push(path);
}

function handleTabClose(path: string) {
  store.closeTab(path);
  router.push(store.activeTab);
}
</script>

<style lang="scss" scoped>
.workbenchView {
  height: 100vh;
  width: 100vw;
}

.mainArea {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.tabBar {
  display: flex;
  align-items: center;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 8px;
  min-height: 40px;
  flex-shrink: 0;
  gap: 2px;
  overflow-x: auto;
}

.tabItem {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  border-radius: 6px 6px 0 0;
  border: 1px solid transparent;
  border-bottom: none;
  white-space: nowrap;
  transition: all 0.15s;
  user-select: none;

  &:hover {
    background: #f3f4f6;
    color: #374151;
  }
}

.tabItemActive {
  background: linear-gradient(180deg, #faf5ff 0%, #f8fafc 100%);
  color: var(--mainColor, #7c3aed);
  border-color: #e5e7eb;
  font-weight: 500;
}

.tabClose {
  font-size: 16px;
  line-height: 1;
  color: #9ca3af;
  border-radius: 3px;
  padding: 0 2px;

  &:hover {
    color: #ef4444;
    background: #fee2e2;
  }
}
</style>
