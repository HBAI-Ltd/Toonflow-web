<template>
  <div class="titleBar">
    <div class="titleBar-title">
      <span class="titleBar-text">ToonFlow</span>
    </div>
    <div class="titleBar-controls">
      <div class="titleBar-btn" @click="handleMinimize">
        <i-round theme="filled" size="13" fill="#febc2e" />
      </div>
      <div class="titleBar-btn" @click="handleMaximize">
        <i-round theme="filled" size="13" fill="#28c840" />
      </div>
      <div class="titleBar-btn" @click="handleClose">
        <i-round theme="filled" size="13" fill="#ff5f57" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const isMaximized = ref(false);

async function electronAction(action: string) {
  try {
    const res = await fetch(`toonflow://${action}`);
    return await res.json();
  } catch {
    // 非 Electron 环境或请求失败
  }
}

function handleMinimize() {
  electronAction("windowMinimize");
}

function handleMaximize() {
  electronAction("windowMaximize");
  isMaximized.value = !isMaximized.value;
}

function handleClose() {
  electronAction("windowClose");
}

async function syncMaximizedState() {
  try {
    const res = await fetch("toonflow://windowIsMaximized");
    const data = await res.json();
    if (data && typeof data.maximized === "boolean") {
      isMaximized.value = data.maximized;
    }
  } catch {
    // 忽略
  }
}

onMounted(() => {
  syncMaximizedState();
  window.addEventListener("resize", syncMaximizedState);
});

onUnmounted(() => {
  window.removeEventListener("resize", syncMaximizedState);
});
</script>

<style lang="scss" scoped>
.titleBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  background-color: #f0f0f0;
  user-select: none;
  -webkit-app-region: drag;
  position: relative;
  z-index: 9999;
  width: 100%;
}

.titleBar-title {
  padding-left: 12px;
  flex: 1;
  overflow: hidden;
}

.titleBar-text {
  font-size: 13px;
  color: #333;
  font-weight: 500;
  white-space: nowrap;
}

.titleBar-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 13px;
  height: 100%;
  -webkit-app-region: no-drag;
}

.titleBar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.15s;
  line-height: 0;

  &:hover {
    opacity: 0.8;
  }

  &:active {
    opacity: 0.6;
  }
}

// 暗色主题适配
[theme-mode="dark"] .titleBar {
  background-color: #2d2d2d;

  .titleBar-text {
    color: #ccc;
  }
}
</style>
