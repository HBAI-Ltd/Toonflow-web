<template>
  <div class="overviewMain">
    <div class="overviewHeader">
      <h2 class="overviewTitle">项目概览</h2>
      <p class="overviewSub">查看项目整体进度和统计信息</p>
    </div>
    <div class="overviewBody">
      <div class="overviewStats">
        <div v-for="stat in stats" :key="stat.label" class="statGridItem">
          <div class="statGridTop">
            <div :class="['statIcon', stat.color]">
              <component :is="stat.icon" :size="24" />
            </div>
            <span class="statValue">{{ stat.value }}</span>
          </div>
          <p class="statLabel">{{ stat.label }}</p>
        </div>
      </div>
      <!-- 故事概要 -->
      <div class="projectSummary">
        <h3 class="summaryTitle" style="display: flex; justify-content: space-between; align-items: center">
          <div>小说简介</div>
          <t-button variant="text" @click="handleIntroEdit">
            <template #icon>
              <i-editor theme="outline" size="15" fill="var(--td-brand-color)" />
            </template>
            编辑
          </t-button>
        </h3>
        <p class="summaryText" v-if="!introEdit">{{ project?.intro || "暂无简介" }}</p>
        <div v-else>
          <a-textarea
            style="
              padding-left: 16px !important;
              padding-right: 16px !important;
              padding-bottom: 12px !important;
              padding-top: 12px !important;
              background-color: var(--td-bg-color-secondarycontainer) !important;
              font-size: 1rem !important;
            "
            :autosize="{ minRows: 4, maxRows: 6 }"
            v-model:value="introEditData"></a-textarea>
        </div>
        <div v-show="introEdit">
          <a-divider></a-divider>
          <div class="flex gap-2">
            <a-button @click="() => (introEdit = false)">取消</a-button>
            <a-button style="margin-left: 5px" type="primary" @click="updateProjectIntro">保存</a-button>
          </div>
        </div>
      </div>
      <div class="projectInfo">
        <div class="jb ac">
          <h3 class="infoTitle">全局设置</h3>
          <div v-show="!globalSettingEdit">
            <t-button variant="text" @click="handleGlobalSettingEdit">
              <template #icon>
                <i-editor theme="outline" size="15" fill="var(--td-brand-color)" />
              </template>
              编辑
            </t-button>
          </div>
        </div>
        <div class="infoGrid">
          <div class="infoItem">
            <label class="infoLabel">影片比例</label>
            <div class="infoRow">
              <span class="infoValue" v-if="!globalSettingEdit">{{ project?.videoRatio || "16:9" }}</span>
              <a-select style="width: 100%" v-else v-model:value="projectEditData.videoRatio" :options="videoRatioOptions" class="infoValue" />
            </div>
          </div>
          <div class="infoItem">
            <label class="infoLabel">画风</label>
            <div class="infoRow">
              <span class="infoValue" v-if="!globalSettingEdit">{{ project?.artStyle || "动漫" }}</span>
              <a-input
                style="
                  padding-left: 16px !important;
                  padding-right: 16px !important;
                  padding-bottom: 12px !important;
                  padding-top: 12px !important;
                  background-color: var(--td-bg-color-secondarycontainer) !important;
                  font-size: 1rem !important;
                "
                v-else
                v-model:value="projectEditData.artStyle"
                class="infoValue" />
            </div>
          </div>
          <div class="infoItem">
            <label class="infoLabel">小说类型</label>
            <div class="infoRow">
              <span class="infoValue" v-if="!globalSettingEdit">{{ project?.type || "无类型" }}</span>
              <a-input
                style="
                  padding-left: 16px !important;
                  padding-right: 16px !important;
                  padding-bottom: 12px !important;
                  padding-top: 12px !important;
                  background-color: var(--td-bg-color-secondarycontainer) !important;
                  font-size: 1rem !important;
                "
                v-else
                v-model:value="projectEditData.type"
                class="infoValue" />
            </div>
          </div>
        </div>
        <div v-show="globalSettingEdit">
          <a-divider></a-divider>
          <div class="flex gap-2">
            <a-button @click="() => (globalSettingEdit = false)">取消</a-button>
            <a-button style="margin-left: 5px" type="primary" @click="updateProject">保存</a-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
import { message } from "ant-design-vue";
import store from "@/stores";
const { project, projectId } = storeToRefs(store());

const globalSettingEdit = ref(false);
const introEdit = ref(false);
const introEditData = ref("");
function handleIntroEdit() {
  introEdit.value = true;
  introEditData.value = project.value?.intro ?? "暂无简介";
}
function handleGlobalSettingEdit() {
  projectEditData.value = {
    videoRatio: project.value?.videoRatio ?? "16:9",
    artStyle: project.value?.artStyle ?? "动漫",
    type: project.value?.type ?? "",
  };
  globalSettingEdit.value = true;
}
const projectEditData = ref<{ videoRatio: string; artStyle: string; type: string }>({
  videoRatio: project.value?.videoRatio ?? "16:9",
  artStyle: project.value?.artStyle ?? "动漫",
  type: project.value?.type ?? "",
});
const videoRatioOptions = [
  { label: "16:9", value: "16:9" },
  { label: "9:16", value: "9:16" },
];
onMounted(() => {
  getStats();
});
interface Stats {
  roleCount: number;
  scriptCount: number;
  storyboardCount: number;
  videoCount: number;
}
const statsData = ref<Stats>({
  roleCount: 0,
  scriptCount: 0,
  storyboardCount: 0,
  videoCount: 0,
});
async function getStats() {
  try {
    const res = await axios.post("/project/getProjectCount", { projectId: projectId.value });
    statsData.value = res.data;
  } catch (err: unknown) {
    if (err instanceof Error) {
      message.error("获取项目统计信息失败：" + err.message);
    }
  }
}
const stats = computed(() => [
  {
    label: "角色数量",
    value: statsData.value.roleCount || 0,
    icon: "i-peoples",
    color: "statPurple",
  },
  {
    label: "剧本集数",
    value: statsData.value.scriptCount || 0,
    icon: "i-doc-detail",
    color: "statBlue",
  },
  {
    label: "分镜数量",
    value: statsData.value.storyboardCount || 0,
    icon: "i-carousel-video",
    color: "statGreen",
  },
  {
    label: "视频数量",
    value: statsData.value.videoCount || 0,
    icon: "i-video-one",
    color: "statOrange",
  },
]);
function updateProjectIntro() {
  axios
    .post("/project/updateProject", {
      id: projectId.value,
      intro: introEditData.value,
    })
    .then(async () => {
      await store().setProjectById(projectId.value);
      message.success("项目简介更新成功");
      introEdit.value = false;
    })
    .catch((e) => {
      message.error("项目简介更新失败");
    });
}
function updateProject() {
  axios
    .post("/project/updateProject", {
      id: projectId.value,
      type: projectEditData.value.type,
      artStyle: projectEditData.value.artStyle,
      videoRatio: projectEditData.value.videoRatio,
    })
    .then(async () => {
      await store().setProjectById(projectId.value);
      message.success("全局设置更新成功");
      globalSettingEdit.value = false;
    })
    .catch(() => {
      message.error("全局设置更新失败");
    });
}
</script>

<style lang="scss" scoped>
.overviewHeader {
  margin-bottom: 32px;
  .overviewTitle {
    font-size: 22px;
    font-weight: 600;
    color: var(--td-text-color-primary);
    margin-bottom: 8px;
  }
  .overviewSub {
    color: var(--td-text-color-secondary);
  }
}
.overviewBody {
  display: flex;
  flex-direction: column;
  gap: 24px;
  .overviewStats {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 24px;
    @media (min-width: 640px) {
      grid-template-columns: repeat(2, 1fr);
    }
    @media (min-width: 1024px) {
      grid-template-columns: repeat(4, 1fr);
    }
    .statGridItem {
      background: var(--td-bg-color-container);
      border: 1px solid var(--td-border-level-1-color);
      border-radius: 16px;
      padding: 24px;
      box-shadow: var(--td-shadow-1);
      .statGridTop {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
        .statIcon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          &.statPurple {
            background: var(--td-brand-color-light);
            color: var(--td-brand-color);
          }
          &.statBlue {
            background: rgba(33, 119, 227, 0.1);
            color: #2177e3;
          }
          &.statGreen {
            background: var(--td-success-color-light);
            color: var(--td-success-color);
          }
          &.statOrange {
            background: var(--td-warning-color-light);
            color: var(--td-warning-color);
          }
        }
        .statValue {
          font-size: 26px;
          font-weight: bold;
          color: var(--td-text-color-primary);
        }
      }
      .statLabel {
        font-size: 13px;
        color: var(--td-text-color-secondary);
      }
    }
  }
  .projectInfo {
    background: var(--td-bg-color-container);
    border-radius: 16px;
    padding: 24px;
    border: 1px solid var(--td-border-level-1-color);
    box-shadow: var(--td-shadow-1);
    .infoTitle {
      font-weight: 600;
      color: var(--td-text-color-primary);
      margin-bottom: 18px;
    }
    .infoGrid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 18px;
      @media (min-width: 600px) {
        grid-template-columns: 1fr 1fr;
      }
      .infoItem {
        .infoLabel {
          font-size: 12px;
          color: var(--td-text-color-secondary);
          margin-bottom: 3px;
          display: block;
        }
        .infoRow {
          display: flex;
          align-items: center;
          gap: 7px;
          .infoValue {
            color: var(--td-text-color-primary);
            font-weight: 500;
          }
          .iconGray {
            color: var(--td-text-color-placeholder);
          }
        }
      }
    }
  }
  .projectSummary {
    background: var(--td-bg-color-container);
    border-radius: 16px;
    padding: 24px;
    border: 1px solid var(--td-border-level-1-color);
    box-shadow: var(--td-shadow-1);
    .summaryTitle {
      font-weight: 600;
      color: var(--td-text-color-primary);
      margin-bottom: 14px;
    }
    .summaryText {
      color: var(--td-text-color-secondary);
      line-height: 1.7;
    }
  }
  .projectEvents {
    background: var(--td-bg-color-container);
    border-radius: 16px;
    padding: 24px;
    border: 1px solid var(--td-border-level-1-color);
    box-shadow: var(--td-shadow-1);
    .eventsTitle {
      font-weight: 600;
      color: var(--td-text-color-primary);
      margin-bottom: 14px;
    }
    .eventsList {
      display: flex;
      flex-direction: column;
      gap: 11px;
      max-height: 380px;
      overflow-y: auto;
      .eventsItem {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 14px;
        background: var(--td-bg-color-secondarycontainer);
        border-radius: 10px;
        .eventsLeft {
          flex-shrink: 0;
          width: 62px;
          text-align: center;
          .eventsEp {
            font-size: 10px;
            color: var(--td-text-color-placeholder);
            margin-bottom: 2px;
          }
          .eventsScore {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 3px;
            .scoreIcon {
              color: var(--td-brand-color);
            }
            .scoreVal {
              font-size: 13px;
              font-weight: 600;
              color: var(--td-brand-color);
            }
          }
        }
        .eventsRight {
          flex: 1;
          .eventsTitle {
            font-size: 15px;
            font-weight: 500;
            margin-bottom: 3px;
            color: var(--td-text-color-primary);
          }
          .eventsDesc {
            font-size: 13px;
            color: var(--td-text-color-secondary);
          }
        }
      }
    }
  }
}
</style>
