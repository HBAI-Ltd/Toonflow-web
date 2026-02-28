<template>
  <div class="root">
    <div class="header">
      <div>
        <h2 class="title">我的项目</h2>
        <p class="sub">管理您的所有短剧项目</p>
      </div>
      <button class="addBtn" @click="routeToCreateProject">
        <i-plus class="addIcon" :size="20" />
        新建项目
      </button>
    </div>
    <div v-if="projects.length === 0" class="empty">
      <div class="emptyIcon">
        <i-folder-open class="iconEmpty" :size="48" />
      </div>
      <h3 class="emptyTitle">暂无项目</h3>
      <p class="emptyDesc">创建您的第一个项目，开始AI创作之旅</p>
    </div>

    <div v-else class="list">
      <div v-for="project in projects" :key="project.id" class="card" @click="openProject(project.id)">
        <div class="content">
          <div class="cardHeader">
            <div class="left">
              <div class="folderIcon">
                <i-folder-open class="iconFolder" :size="24" />
              </div>
              <div>
                <h3 class="name">{{ project.name }}</h3>
                <div class="type">
                  <span class="desc">类型：{{ project.type }}</span>
                </div>
              </div>
            </div>
            <div class="menu">
              <a-popconfirm title="确定要删除这个项目吗？" okText="确定" cancelText="取消" @confirm="deleteProject(project.id)" @click.stop>
                <button class="delBtn">
                  <i-delete :size="14" />
                </button>
              </a-popconfirm>
            </div>
          </div>
          <p v-if="project.intro" class="summary">
            {{ project.intro }}
          </p>
          <div class="time">
            <span>创建于 {{ dayjs(project?.createTime).format("YYYY-MM-DD HH:mm:ss") }}</span>
          </div>
        </div>
      </div>
    </div>
    <addProject v-model="addProjectShow" @getProjects="getProjects" />
  </div>
</template>

<script setup lang="ts">
import dayjs from "dayjs";
import axios from "@/utils/axios";
import { message } from "ant-design-vue";
import store from "@/stores";
import addProject from "./components/addProject.vue";
const { project } = storeToRefs(store());

const projects = ref<
  {
    id: string;
    name: string;
    intro: string;
    type: string;
    artStyle: string | null;
    videoRatio: string | null;
    createTime: number;
    updatedAt: number;
  }[]
>([]);

const router = useRouter();
function getProjects() {
  axios
    .post("/project/getProject")
    .then(({ data }) => {
      projects.value = data;
    })
    .catch(() => {
      message.error("获取项目列表失败");
    });
}

onMounted(() => {
  getProjects();
});

function openProject(projectId: string | undefined) {
  const item = projects.value.find((p) => p.id === projectId);
  if (item) project.value = item;
  else return message.error("未找到该项目!");
  router.push(`/projectDetail?id=${projectId}`);
}
const addProjectShow = ref(false);
function routeToCreateProject() {
  addProjectShow.value = true;
}
function deleteProject(projectId: string | undefined) {
  axios
    .post("/project/delProject", { id: projectId })
    .then(() => {
      message.success("项目删除成功");
      getProjects();
    })
    .catch(() => {
      message.error("项目删除失败");
    });
}
</script>

<style lang="scss" scoped>
.root {
  max-width: 112rem;
  margin: 0 auto;
  padding: 2rem;
  background: transparent;

  .header {
    margin-bottom: 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    .title {
      font-size: 2rem;
      font-weight: 600;
      color: var(--td-text-color-primary);
      margin-bottom: 0.5rem;
    }
    .sub {
      color: var(--td-text-color-secondary);
    }
    .addBtn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--td-bg-color-container);
      border: 1px solid var(--td-border-level-1-color);
      border-radius: 0.5rem;
      color: var(--td-brand-color);
      font-weight: 500;
      padding: 0.5rem 1rem;
      cursor: pointer;

      .addIcon {
        margin-right: 0.25rem;
      }
    }
  }

  .empty {
    text-align: center;
    padding: 4rem 0;

    .emptyIcon {
      width: 6rem;
      height: 6rem;
      background: var(--td-bg-color-secondarycontainer);
      border-radius: 9999px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1rem;
      .iconEmpty {
        color: var(--td-text-color-placeholder);
      }
    }
    .emptyTitle {
      font-size: 1.125rem;
      font-weight: 500;
      color: var(--td-text-color-primary);
      margin-bottom: 0.5rem;
    }
    .emptyDesc {
      color: var(--td-text-color-secondary);
      margin-bottom: 1.5rem;
    }
  }

  .list {
    max-height: 80vh;
    overflow-y: auto;
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
    @media (min-width: 768px) {
      grid-template-columns: repeat(2, 1fr);
    }
    @media (min-width: 1024px) {
      grid-template-columns: repeat(3, 1fr);
    }

    .card {
      background: var(--td-bg-color-container);
      border-radius: 1rem;
      border: 1px solid var(--td-border-level-1-color);
      transition: box-shadow 0.3s;
      height: 100%;
      cursor: pointer;
      &:hover {
        box-shadow: var(--td-shadow-2);
      }
      .content {
        padding: 1.5rem;

        .cardHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 1rem;

          .left {
            display: flex;
            align-items: center;
            gap: 0.75rem;

            .folderIcon {
              width: 3rem;
              height: 3rem;
              background: linear-gradient(135deg, var(--td-brand-color) 0%, var(--td-brand-color-5) 100%);
              border-radius: 0.75rem;
              display: flex;
              align-items: center;
              justify-content: center;
              .iconFolder {
                color: var(--td-text-color-anti);
              }
            }

            .name {
              font-weight: 600;
              color: var(--td-text-color-primary);
            }
            .status {
              display: flex;
              align-items: center;
              gap: 0.5rem;
              margin-top: 0.25rem;
              .desc {
                font-size: 0.75rem;
                color: var(--td-text-color-secondary);
              }
            }
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          .menu {
            position: relative;
            .delBtn {
              padding: 0.5rem;
              color: var(--td-error-color);
              border-radius: 0.5rem;
              background: none;
              border: none;
              transition:
                color 0.2s,
                background 0.2s;
              &:hover {
                background: var(--td-error-color-light);
                cursor: pointer;
              }
            }
          }
        }

        .summary {
          color: var(--td-text-color-secondary);
          margin-bottom: 1rem;
          font-size: 0.9375rem;
          line-clamp: 2;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .meta {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          color: var(--td-text-color-secondary);
          font-size: 0.9375rem;
        }
        .time {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--td-border-level-1-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: var(--td-text-color-secondary);
          font-size: 0.8125rem;
        }
      }
    }
  }
}
</style>
