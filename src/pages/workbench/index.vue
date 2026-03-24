<template>
  <div class="main">
    <div class="menu fc jb">
      <div class="logoBox c">
        <img class="logo" src="@/assets/logo.png" />
      </div>
      <div class="itemBox fc ac">
        <t-tooltip
          :content="menu.label"
          placement="right"
          theme="light"
          destroyOnClose
          :showArrow="false"
          v-for="(menu, index) in menuList"
          :key="index">
          <div class="item fc c" v-if="menu.type === 'btn'" :class="{ active: activeMenu == menu.path }" @click="handleClick(menu)">
            <component :is="menu.icon" class="icon" />
          </div>
          <div class="divider" v-if="menu.type === 'divider'"></div>
        </t-tooltip>
      </div>
      <div class="footItem fc ac">
        <t-tooltip :content="$t('workbench.menu.settings')" placement="right" theme="light" destroyOnClose :showArrow="false">
          <div class="item c" @click="showSetting = true">
            <i-setting-one class="icon" />
          </div>
        </t-tooltip>
        <t-avatar style="margin-top: 8px" image="https://tdesign.gtimg.com/site/avatar.jpg" />
      </div>
    </div>
    <div class="view">
      <div class="topMenu f ac jb" v-if="project?.id">
        <div class="title">
          <h2>{{ project?.name || $t("workbench.selectProject") }}</h2>
        </div>
        <div class="rightBtnList f ac">
          <t-tooltip
            :content="menu.label"
            placement="bottom"
            theme="light"
            destroyOnClose
            :showArrow="false"
            v-for="(menu, index) in rightBtnList"
            :key="index">
            <div class="item fc c" v-if="menu.type === 'btn'" :class="{ active: activeMenu == menu.path }" @click="handleClick(menu)">
              <component :is="menu.icon" class="icon" />
            </div>
            <div class="divider" v-if="menu.type === 'divider'"></div>
          </t-tooltip>
        </div>
      </div>
      <div class="viewBox">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <KeepAlive>
              <component :is="Component" :key="$route.fullPath" />
            </KeepAlive>
          </transition>
        </router-view>
      </div>
    </div>
  </div>
  <setting />
  <migrateShow />
</template>

<script setup lang="ts">
import setting from "@/components/setting/index.vue";
import migrateShow from "@/components/migrateShow.vue";

import projectStore from "@/stores/project";
const { project } = storeToRefs(projectStore());
import settingStore from "@/stores/setting";
const { showSetting } = storeToRefs(settingStore());

const menuList = ref([
  { type: "btn", path: "/project", label: $t("workbench.menu.myProject"), icon: "i-folder-close" },
  { type: "btn", path: "/task", label: $t("workbench.menu.taskCenter"), icon: "i-view-list" },
  // { type: "divider" },
]);

const rightBtnList = ref([
  { type: "btn", path: "/novel", label: $t("workbench.menu.novel"), icon: "i-notebook" },
  { type: "btn", path: "/agent", label: $t("workbench.menu.scriptAgent"), icon: "i-color-filter" },
  { type: "btn", path: "/script", label: $t("workbench.menu.scriptManage"), icon: "i-document-folder" },
  { type: "btn", path: "/cornerScape", label: $t("workbench.menu.cornerScape"), icon: "i-peoples-two" },
  { type: "btn", path: "/production", label: $t("workbench.menu.production"), icon: "i-carousel-video" },
  { type: "divider" },
  { type: "btn", path: "/assets", label: $t("workbench.menu.assetCenter"), icon: "i-receive" },
]);

const router = useRouter();
const route = useRoute();
const activeMenu = ref(route.path);

watch(
  () => route.path,
  (newPath) => {
    activeMenu.value = newPath;
  },
);

function handleClick(menu: any) {
  if (menu.needProject && !project.value) return;
  router.push(menu.path);
  activeMenu.value = menu.path;
}
</script>

<style lang="scss" scoped>
.main {
  height: 100vh;
  width: 100vw;
  padding: 1rem;
  display: flex;

  .menu {
    width: 64px;
    height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    background-color: #fff;
    border-radius: 16px;
    padding-top: 1rem;
    padding-bottom: 1rem;
    .logoBox {
      width: 100%;
      height: fit-content;
      .logo {
        width: 60%;
        height: auto;
      }
    }
    .itemBox {
      flex: 1;
      margin-top: 1rem;
      margin-bottom: 1rem;
      padding-top: 1rem;
      padding-bottom: 1rem;
      width: 100%;
      height: 100%;
    }
    .footItem {
      width: 100%;
      height: fit-content;
      .item {
        margin-top: 8px;
        cursor: pointer;
        width: 50px;
        height: 50px;
        .icon {
          font-size: 24px;
        }
        &:hover {
          background-color: #ecedef;
          border-radius: 16px;
        }
      }
      .active {
        background-color: #000 !important;
        color: #ebebeb;
        border-radius: 16px;
      }
    }
  }
  .menu::-webkit-scrollbar {
    width: 4px;
  }
  .menu::-webkit-scrollbar-thumb {
    background-color: #d5d5d5;
    border-radius: 4px;
    &:hover {
      background-color: #bbb;
    }
  }
  .menu::-webkit-scrollbar-track {
    background-color: transparent;
  }
  .view {
    flex: 1;
    margin-left: 1rem;
    background-color: #fff;
    border-radius: 16px;
    width: 100%;
    height: calc(100vh - 2rem);
    overflow-x: hidden;
    overflow-y: auto;
    scrollbar-gutter: stable;
    padding-left: 2rem;
    padding-right: 2rem;
    .topMenu {
      height: 6vh;
      .rightBtnList {
        .item {
          margin-bottom: 0px !important;
          margin-top: 0px !important;
          margin-right: 4px;
          margin-left: 4px;
        }
        .divider {
          width: 1px;
          height: 24px;
          background-color: #ecedef;
          margin: 0 4px;
        }
      }
    }
    .viewBox {
      width: 100%;
      height: calc(100% - 6vh);
    }
  }
}

.item {
  margin-bottom: 4px;
  margin-top: 4px;
  cursor: pointer;
  width: 50px;
  height: 50px;
  .icon {
    font-size: 24px;
  }
  .title {
    font-size: 10px;
    white-space: nowrap;
  }
  &:hover {
    background-color: #ecedef;
    border-radius: 16px;
  }
}
// .disabled {
//   opacity: 0.3;
//   cursor: not-allowed;
// }
.active {
  background-color: #000 !important;
  color: #ebebeb;
  border-radius: 16px;
}
.divider {
  width: 50px;
  height: 1px;
  background-color: #ecedef;
  margin: 8px 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
