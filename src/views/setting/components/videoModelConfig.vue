<template>
  <div class="videoModelConfig">
    <t-button theme="primary" @click="addVideoModel" class="addVideoBtn">
      <template #icon>
        <i-plus theme="outline" size="16" fill="currentColor" />
      </template>
      添加视频模型
    </t-button>

    <div v-for="video in videoModels" :key="video.id" class="videoModelCard">
      <t-card hoverable @click="editVideoModel(video)" class="clickableCard">
        <template #header>
          <div class="videoCardTitle">
            <div class="videoIcon">
              <i-video theme="filled" size="18" fill="var(--td-brand-color)" />
            </div>
            <div class="videoInfo">
              <span class="videoModelName">{{ video.model }}</span>
              <t-tag :theme="getManufacturerTheme(video.manufacturer)" variant="light" class="manufacturerTag">
                {{ getManufacturerName(video.manufacturer) }}
              </t-tag>
            </div>
            <t-popconfirm content="确定要删除此视频模型吗？" @confirm="deleteVideoModel(video.id)">
              <t-button theme="danger" size="small" variant="outline" class="deleteBtnCorner" @click.stop>
                <template #icon>
                  <i-delete theme="outline" size="14" fill="currentColor" />
                </template>
              </t-button>
            </t-popconfirm>
          </div>
        </template>
        <div class="videoCardContent">
          <div class="videoDetailItem">
            <span class="detailLabel">Base URL:</span>
            <span class="detailValue">{{ video.baseUrl || "默认" }}</span>
          </div>
          <div class="videoDetailItem">
            <span class="detailLabel">创建时间:</span>
            <span class="detailValue">{{ formatTime(video.createTime) }}</span>
          </div>
        </div>
      </t-card>
    </div>
  </div>

  <addModelDialog v-if="editDialogVisible" v-model="editDialogVisible" v-model:modelForm="editForm" @fetchModelList="loadVideoModels" />
  <ModeListDialog :typeList="['video']" v-model:modelShow="videoModelDialogShow" state="选择视频模型" @fetchModelList="onVideoModelDialogClose" />
</template>

<script setup lang="ts">
import addModelDialog from "../model/addModelDialog.vue";
import ModeListDialog from "../model/modeListDialog.vue";
import axios from "@/utils/axios";
import dayjs from "dayjs";

interface VideoModelType {
  id: number;
  model: string;
  modelType: string;
  manufacturer: string;
  baseUrl: string;
  apiKey: string;
  createTime: number;
  type: string;
}

const videoModels = ref<VideoModelType[]>([]);
const editDialogVisible = ref(false);
const editForm = ref<VideoModelType | undefined>(undefined);
const videoModelDialogShow = ref(false);

// 获取厂商标签主题
function getManufacturerTheme(
  manufacturer: string
): "primary" | "warning" | "success" | "danger" | "default" | undefined {
  const themes: Record<string, "primary" | "warning" | "success" | "danger" | "default"> = {
    deepSeek: "primary",
    volcengine: "warning",
    kling: "primary",
    zhipu: "success",
    qwen: "success",
    wan: "success",
    openai: "primary",
    vidu: "danger",
    anthropic: "warning",
    runninghub: "warning",
    gemini: "success",
  };
  return themes[manufacturer] || "default";
}

// 获取厂商名称
function getManufacturerName(manufacturer: string): string {
  const names: Record<string, string> = {
    deepSeek: "DeepSeek",
    volcengine: "火山引擎",
    kling: "可灵",
    zhipu: "智谱",
    qwen: "阿里千问",
    wan: "阿里万相",
    openai: "OpenAI",
    vidu: "Vidu",
    anthropic: "Anthropic",
    runninghub: "RunningHUB",
    gemini: "Gemini",
    other: "其他",
  };
  return names[manufacturer] || manufacturer;
}

// 编辑视频模型
function editVideoModel(model: VideoModelType) {
  editForm.value = { ...model };
  editDialogVisible.value = true;
}

// 删除视频模型
async function deleteVideoModel(id: number) {
  try {
    await axios.post("/setting/delModel", { id });
    window.$message.success("删除成功");
    loadVideoModels();
  } catch (error) {
    window.$message.error("删除失败");
  }
}

// 格式化时间
function formatTime(timestamp: number): string {
  return dayjs(timestamp).format("YYYY-MM-DD HH:mm");
}

// 加载视频模型列表
async function loadVideoModels() {
  try {
    const res = await axios.post("/setting/getVideoModelList", { type: "video" });
    videoModels.value = Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error("加载视频模型列表失败", error);
    videoModels.value = [];
  }
}

// 添加视频模型
function addVideoModel() {
  videoModelDialogShow.value = true;
}

// 视频模型弹窗关闭后刷新列表
function onVideoModelDialogClose() {
  videoModelDialogShow.value = false;
  loadVideoModels();
}

onMounted(() => {
  loadVideoModels();
});
</script>

<style lang="scss" scoped>
.videoModelConfig {
  .addVideoBtn {
    margin-bottom: 16px;
  }
}

.videoModelCard {
  margin-bottom: 16px;

  .clickableCard {
    cursor: pointer;
    border-radius: 12px;
    transition: all 0.3s ease;
    border: 1px solid var(--td-border-level-1-color);
    background: var(--td-bg-color-container);

    &:hover {
      box-shadow: 0 8px 24px rgba(var(--td-brand-color), 0.12);
      border-color: var(--td-brand-color);
    }
  }

  :deep(.t-card__header) {
    border-bottom: 1px solid var(--td-border-level-1-color);
    padding: 16px 20px;
  }

  :deep(.t-card__body) {
    padding: 20px;
  }

  .videoCardTitle {
    display: flex;
    align-items: center;
    gap: 12px;
    position: relative;
    width: 100%;

    .videoIcon {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--td-brand-color-1) 0%, var(--td-brand-color-2) 100%);
      border-radius: 8px;
      flex-shrink: 0;
    }

    .videoInfo {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;

      .videoModelName {
        font-size: 15px;
        font-weight: 600;
        color: var(--td-text-color-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .manufacturerTag {
        align-self: flex-start;
        margin: 0;
      }
    }

    .deleteBtnCorner {
      margin-left: auto;
      flex-shrink: 0;
    }
  }

  .videoCardContent {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .videoDetailItem {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;

      .detailLabel {
        color: var(--td-text-color-secondary);
        font-weight: 500;
        min-width: 80px;
        flex-shrink: 0;
      }

      .detailValue {
        color: var(--td-text-color-primary);
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
}
</style>
