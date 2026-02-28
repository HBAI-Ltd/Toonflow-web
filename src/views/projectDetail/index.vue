<template>
  <div class="projectDetail">
    <!-- header -->
    <div class="detailHeader">
      <div class="headerBar">
        <div class="headerLeft">
          <button class="backBtn" @click="onBack">
            <i-left :size="20" />
          </button>
          <div class="info ac">
            <h1 class="title">{{ project?.name }}</h1>
            <p class="meta">
              <span v-if="project?.updatedAt && project?.updatedAt > 0">最后更新 {{ dayjs(project?.updatedAt).format("YYYY-MM-DD HH:mm:ss") }}</span>
            </p>
          </div>
        </div>
      </div>
      <!-- sub nav -->
      <div class="nav">
        <button
          v-for="item in subNavItems"
          :key="item.id"
          class="navBtn"
          :class="{ navActive: item.id === currentSubView }"
          @click="setCurrent(item.id)">
          <component :is="item.icon" :size="18" />
          <span class="navLabel">{{ item.label }}</span>
        </button>
      </div>
    </div>
    <!-- main -->
    <div class="main">
      <overview v-if="currentSubView === 'overview'" />
      <originalText v-if="currentSubView === 'originalText'" />
      <outlineManager v-if="currentSubView === 'outline'" />
      <assetsManager v-if="currentSubView === 'assets'" />
      <scriptManager v-if="currentSubView === 'script'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import dayjs from "dayjs";
import store from "@/stores";
import overview from "./components/overview/index.vue";
import originalText from "./components/originalText/index.vue";
import outlineManager from "./components/outlineManager/index.vue";
import assetsManager from "./components/assetsManager/index.vue";
import scriptManager from "./components/scriptManager/index.vue";

const { project } = storeToRefs(store());

const route = useRoute();
const projectId = Number(route.query.id as string);

onMounted(async () => {
  await store().setProjectById(projectId);
});

const router = useRouter();

type SubView = "overview" | "originalText" | "outline" | "assets" | "script";

const subNavItems = [
  { id: "overview" as SubView, label: "项目概览", icon: "i-more-app" },
  { id: "originalText" as SubView, label: "小说原文", icon: "i-file-text" },
  { id: "outline" as SubView, label: "大纲管理", icon: "i-mindmap-list" },
  { id: "script" as SubView, label: "剧本管理", icon: "i-ad-product" },
  { id: "assets" as SubView, label: "资产管理", icon: "i-data-file" },
];

const currentSubView = ref<SubView>("overview");

function setCurrent(key: SubView) {
  currentSubView.value = key;
}

function onBack() {
  router.push("/project");
}
</script>

<style lang="scss" scoped>
.projectDetail {
  min-width: 800px;
  display: flex;
  flex-direction: column;
  height: 100%;

  .detailHeader {
    height: 100px;
    background: var(--td-bg-color-container);
    border-bottom: 1px solid var(--td-border-level-1-color);
    padding: 8px 24px 8px 32px;

    .headerBar {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .headerLeft {
        display: flex;
        align-items: center;
        gap: 16px;

        .backBtn {
          padding: 8px;
          color: var(--td-text-color-secondary);
          border-radius: 8px;
          background: none;
          transition: background 0.2s;

          &:hover {
            background: var(--td-bg-color-secondarycontainer);
          }
          border: none;
          outline: none;
          cursor: pointer;
          display: flex;
        }

        .info {
          .title {
            font-size: 20px;
            font-weight: 600;
            color: var(--td-text-color-primary);
            margin: 0;
          }
          .meta {
            font-size: 13px;
            color: var(--td-text-color-secondary);
          }
        }
      }
    }

    .nav {
      margin-top: 5px;
      display: flex;
      gap: 8px;
      overflow-x: auto;

      .navBtn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        font-size: 14px;
        border-radius: 8px;
        background: var(--td-bg-color-secondarycontainer);
        color: var(--td-text-color-primary);
        white-space: nowrap;
        border: none;
        outline: none;
        cursor: pointer;
        transition: all 0.18s;

        &.navActive {
          background: var(--td-brand-color);
          color: var(--td-text-color-anti);
        }

        &:not(.navActive):hover {
          background: var(--td-bg-color-secondarycontainer-hover);
        }

        .navLabel {
          font-weight: 500;
        }
      }
    }
  }

  .main {
    height: calc(100vh - 100px);
    overflow: auto;
    padding-left: 5%;
    padding-right: 5%;
    padding-bottom: 50px;
  }
}
</style>
