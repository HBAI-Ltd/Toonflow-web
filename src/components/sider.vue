<template>
  <aside class="sidebarContainer">
    <header class="sidebarHeader">
      <h1 class="sidebarTitle">
        <img class="logo" src="@/assets/logo.png" />
        Toonflow
      </h1>
      <p class="sidebarSubtitle">AI驱动的短剧创作工具</p>
    </header>
    <nav class="sidebarNav">
      sidebarTitle
      <button
        v-for="item in btnList"
        :key="item.path"
        :type="'button'"
        :class="['sidebarBtn', { sidebarBtnActive: item.path === activeMenu }]"
        @click="handleClick(item.path)">
        <component :is="item.icon" :size="20" />
        <span>{{ item.label }}</span>
      </button>
    </nav>
    <div class="sidebarFooter">
      <button type="button" :class="['sidebarBtn', { sidebarBtnActive: activeMenu === 'settings' }]" @click="handleClick('/setting')">
        <i-setting-two size="20" />
        <span>设置</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import store from "@/stores";
const { activeMenu } = storeToRefs(store());
// ,{path:"/taskList",label:"任务列表",icon:"i-list-two"}
const btnList = [{ path: "/project", label: "我的项目", icon: "i-folder-open" }];
const router = useRouter();
function handleClick(path: string) {
  router.push(path);
  activeMenu.value = path;
}
</script>

<style lang="scss" scoped>
.sidebarContainer {
  width: 16rem;
  background: #fff;
  border-right: 1px solid #e5e7eb;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.sidebarHeader {
  padding: 1.5rem 1rem;
  border-bottom: 1px solid #e5e7eb;

  .sidebarTitle {
    font-size: 1.25rem;
    font-weight: 1000;
    color: #111827;
    display: flex;
    align-items: center;
    .logo {
      width: 2.5rem;
      height: 2.5rem;
      margin-right: 0.2rem;
    }
  }

  .sidebarSubtitle {
    font-size: 0.875rem;
    color: #6b7280;
    margin-top: 0.25rem;
  }
}

.sidebarNav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
}

.sidebarFooter {
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
}

.sidebarBtn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background: none;
  color: #4b5563;
  border: none;
  font: inherit;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition:
    background 0.2s,
    color 0.2s;
}

.sidebarBtnActive {
  background: var(--hoverMainColor);
  color: var(--mainColor);
}
</style>
