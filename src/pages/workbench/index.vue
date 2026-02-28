<template>
  <t-layout class="main">
    <t-aside :width="collapsed ? '64px' : '232px'">
      <t-menu theme="light" :value="activeMenu" :collapsed="collapsed" @change="handleClick">
        <template #logo>
          <h1 class="sidebarTitle">
            <img class="logo" src="@/assets/logo.png" />
            <span v-show="!collapsed">Toonflow</span>
          </h1>
        </template>
        <t-menu-item v-for="item in menuList" :key="item.path" :value="item.path">
          <template #icon><t-icon :name="item.icon" /></template>
          {{ item.label }}
        </t-menu-item>
        <template #operations>
          <div class="menuOps fc">
            <t-button variant="text" shape="square" @click="collapsed = !collapsed" :style="btnStyle">
              <template #icon><t-icon :name="collapsIcon" /></template>
              <span v-if="!collapsed">收起</span>
            </t-button>
            <t-button variant="text" shape="square" @click="() => handleClick('/setting')" :style="btnStyle">
              <template #icon><t-icon name="setting" /></template>
              <span v-if="!collapsed">设置</span>
            </t-button>
          </div>
        </template>
      </t-menu>
    </t-aside>
    <t-layout>
      <t-content class="content">
        <router-view />
      </t-content>
    </t-layout>
  </t-layout>
</template>

<script setup lang="ts">
const menuList = [
  { path: "/project", label: "我的项目", icon: "folder-open" },
  // { path: "/taskList", label: "任务列表", icon: "task" },
];

const collapsIcon = computed(() => (collapsed.value ? "chevron-right" : "chevron-left"));

const router = useRouter();
const route = useRoute();
const activeMenu = ref(route.path);
const collapsed = ref(true);

function handleClick(value: string | number) {
  const path = String(value);
  router.push(path);
  activeMenu.value = path;
}

const btnStyle = computed(() => ({
  display: !collapsed.value ? "block" : "inline-flex",
}));
</script>

<style lang="scss" scoped>
.main {
  height: 100vh;
  width: 100vw;

  .sidebarTitle {
    font-size: 20px;
    font-weight: 1000;
    color: #111827;
    display: flex;
    align-items: center;
      color: var(--td-text-color-primary);
    .logo {
      width: 32px;
      height: 32px;
      margin-right: 8px;
    }
  }
  .menuOps {
    .t-button {
      width: 100%;
      text-align: left;
    }
  }
  .content {
    width: 100%;
    height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    padding: 0;
    margin: 0;
    border-left: 1px solid var(--td-border-level-1-color);
  }
}
</style>
