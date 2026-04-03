<template>
  <div class="main" :style="{ height: isElectron ? 'calc(100vh - 32px)' : '100vh' }">
    <div class="menu fc jb">
      <div class="logoBox c">
        <img class="logo" src="@/assets/logo.png" />
      </div>
      <div class="itemBox fc ac">
        <t-tooltip
          :content="menu.labelKey ? $t(menu.labelKey) : ''"
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
            <t-badge :count="needUpdate ? 1 : 0" dot>
              <i-setting-one class="icon" />
            </t-badge>
          </div>
        </t-tooltip>
        <t-tooltip :content="$t('workbench.menu.jumpGithub')" placement="right" theme="light" destroyOnClose :showArrow="false">
          <div class="item c" @click="jumpGithub">
            <i-github-one size="24" />
          </div>
        </t-tooltip>
      </div>
    </div>
    <div class="view">
      <div class="topMenu f ac jb" v-if="project?.id">
        <div class="title">
          <h2>{{ project?.name || $t("workbench.selectProject") }}</h2>
        </div>
        <div class="rightBtnList f ac">
          <t-tooltip
            :content="menu.labelKey ? $t(menu.labelKey) : ''"
            placement="bottom"
            theme="light"
            destroyOnClose
            :showArrow="false"
            v-for="(menu, index) in rightBtnList"
            :key="index">
            <div
              class="item fc c"
              v-if="menu.type === 'btn' && (project.projectType === 'novel' || !menu.nodelOnly)"
              :class="{ active: activeMenu == menu.path }"
              @click="handleClick(menu)">
              <component :is="menu.icon" class="icon" />
            </div>
            <div class="divider" v-if="menu.type === 'divider'"></div>
          </t-tooltip>
        </div>
      </div>
      <div class="viewBox">
        <router-view v-slot="{ Component }">
          <component :is="Component" :key="$route.fullPath" />
        </router-view>
      </div>
    </div>
  </div>
  <hello />
  <setting />
  <migrateShow />
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
import setting from "@/components/setting/index.vue";
import migrateShow from "@/components/migrateShow.vue";
import hello from "@/components/hello.vue";
import productionAgentStore from "@/stores/productionAgent";
import projectStore from "@/stores/project";
const { project } = storeToRefs(projectStore());
import settingStore from "@/stores/setting";
const { showSetting, isElectron, needUpdate } = storeToRefs(settingStore());
const { flowData } = storeToRefs(productionAgentStore());
const menuList = ref([
  { type: "btn", path: "/project", labelKey: "workbench.menu.myProject", icon: "i-folder-close" },
  { type: "btn", path: "/task", labelKey: "workbench.menu.taskCenter", icon: "i-view-list" },
  // { type: "divider" },
]);

const rightBtnList = ref([
  { type: "btn", path: "/novel", labelKey: "workbench.menu.novel", icon: "i-notebook", nodelOnly: true },
  { type: "btn", path: "/scriptAgent", labelKey: "workbench.menu.scriptAgent", icon: "i-color-filter", nodelOnly: true },
  { type: "btn", path: "/script", labelKey: "workbench.menu.scriptManage", icon: "i-document-folder" },
  { type: "btn", path: "/cornerScape", labelKey: "workbench.menu.cornerScape", icon: "i-peoples-two" },
  { type: "btn", path: "/production", labelKey: "workbench.menu.production", icon: "i-carousel-video" },
  { type: "divider" },
  { type: "btn", path: "/assets", labelKey: "workbench.menu.assetCenter", icon: "i-receive" },
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
  (flowData.value as any) = ref({
    script: "", // 剧本
    scriptPlan: "", //导演计划
    storyboardTable: "", //分镜表
    assets: [], // 衍生资产
    storyboard: [], //分镜面板
    workbench: {
      videoList: [],
    }, // 工作台数据
  });
}

async function jumpGithub() {
  if (isElectron.value) {
    await fetch("toonflow://openurlwithbrowser?url=https://github.com/HBAI-Ltd/Toonflow-app");
  } else {
    window.open("https://github.com/HBAI-Ltd/Toonflow-app");
  }
}

onMounted(async () => {
  const { data } = await axios.post("/setting/about/checkUpdate", {
    source: "toonflow",
  });
  if (data.needUpdate) {
    needUpdate.value = true;
  } else {
    needUpdate.value = false;
  }
});
</script>

<style lang="scss" scoped>
.main {
  width: 100vw;
  padding: 16px;
  display: flex;

  .menu {
    width: 64px;
    height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    background-color: #fff;
    border-radius: 16px;
    padding-top: 16px;
    padding-bottom: 16px;
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
      margin-top: 16px;
      margin-bottom: 16px;
      padding-top: 16px;
      padding-bottom: 16px;
      width: 100%;
      height: 100%;
    }
    .footItem {
      width: 100%;
      height: fit-content;
      .item {
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
    margin-left: 16px;
    background-color: #fff;
    border-radius: 16px;
    width: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    scrollbar-gutter: stable;
    padding-left: 32px;
    padding-right: 32px;
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
