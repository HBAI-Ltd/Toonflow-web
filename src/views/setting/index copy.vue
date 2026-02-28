<template>
  <div class="settingContainer">
    <span>设置</span>
    <div class="model">
      <div class="jb c" style="margin-top: 10px">
        <h1 style="font-size: 18px; display: block">AI 模型配置</h1>
      </div>
      <div class="model-grid">
        <div v-for="(item, index) in modelData" :key="index" class="model-card-item">
          <a-card hoverable class="model-config-card" @click="startConfig(item)">
            <template #title>
              <div class="card-title-wrapper">
                <div class="card-icon">
                  <i-brain theme="outline" size="20" fill="currentColor" v-if="item.key.includes('Agent')" />
                  <i-text theme="outline" size="20" fill="currentColor" v-else-if="item.key.includes('Script') || item.key.includes('Prompt')" />
                  <i-picture theme="outline" size="20" fill="currentColor" v-else />
                </div>
                <span class="card-title-text">{{ item.name }}</span>
              </div>
            </template>
            <div class="card-content">
              <div class="model-info">
                <div class="model-label">当前模型:</div>
                <div class="model-value" v-if="item.model">
                  <a-tag color="blue">{{ item.model }}</a-tag>
                </div>
                <div class="model-value unconfigured" v-else>
                  <i-attention theme="outline" size="14" fill="#faad14" />
                  <span>未配置</span>
                </div>
              </div>
            </div>
          </a-card>
        </div>
      </div>
    </div>

    <!-- 视频模型列表 -->
    <div class="video-model-section">
      <div class="section-header">
        <h1 class="section-title">
          <i-video theme="outline" size="20" fill="currentColor" />
          视频模型列表
        </h1>
        <a-button type="primary" @click="addVideoModel" class="add-video-btn">
          <i-plus theme="outline" size="16" fill="currentColor" />
          添加视频模型
        </a-button>
      </div>

      <div class="video-model-list" v-if="videoModels.length > 0">
        <div v-for="(video, index) in videoModels" :key="video.id" class="video-model-card">
          <a-card hoverable @click="editVideoModel(video)" class="clickable-card">
            <template #title>
              <div class="video-card-title">
                <div class="video-icon">
                  <i-video theme="filled" size="18" fill="#9913FA" />
                </div>
                <div class="video-info">
                  <span class="video-model-name">{{ video.model }}</span>
                  <a-tag :color="getManufacturerTagColor(video.manufacturer)" class="manufacturer-tag">
                    {{ getManufacturerName(video.manufacturer) }}
                  </a-tag>
                </div>
                <a-popconfirm title="确定要删除此视频模型吗？" ok-text="确定" cancel-text="取消" @confirm="deleteVideoModel(video.id)" @click.stop>
                  <a-button danger size="small" class="delete-btn-corner" @click.stop>
                    <i-delete theme="outline" size="14" fill="currentColor" />
                  </a-button>
                </a-popconfirm>
              </div>
            </template>
            <div class="video-card-content">
              <div class="video-detail-item">
                <span class="detail-label">Base URL:</span>
                <span class="detail-value">{{ video.baseUrl || "默认" }}</span>
              </div>
              <div class="video-detail-item">
                <span class="detail-label">创建时间:</span>
                <span class="detail-value">{{ formatTime(video.createTime) }}</span>
              </div>
            </div>
          </a-card>
        </div>
      </div>
      <a-empty v-else description="暂无视频模型，点击上方按钮添加" class="empty-state">
        <template #image>
          <i-video theme="outline" size="64" fill="#d9d9d9" />
        </template>
      </a-empty>
    </div>
    <!-- 访问控制 -->
    <div class="settingCard">
      <div class="cardHeader">
        <div class="cardIcon blue">
          <i-lock theme="outline" size="20" fill="currentColor" />
        </div>
        <span class="cardTitle">访问控制</span>
      </div>
      <div class="cardContent">
        <div class="formGrid">
          <div class="formItem">
            <label class="formLabel">访问账号</label>
            <a-input v-model:value="settingData.name" placeholder="请输入访问账号" class="formInput" />
          </div>
          <div class="formItem">
            <label class="formLabel">访问密码</label>
            <a-input-password v-model:value="settingData.password" placeholder="请输入访问密码" class="formInput" />
          </div>
        </div>
        <div style="margin-top: 20px; display: flex; justify-content: flex-end">
          <a-button type="primary" @click="saveAccessControl" :loading="savingAccess">
            <div class="c">
              <i-check theme="outline" size="14" fill="currentColor" />
              保存设置
            </div>
          </a-button>
        </div>
      </div>
    </div>
    <div class="other">
      <h1 class="otherConfiguration">其他配置</h1>
      <div class="prompt">
        <a-card title="提示词" style="width: 100%">
          <template #extra>
            <a-button type="primary" class="addBtn" @click="promptEditorShow = true">
              <div class="c">
                <i-edit theme="outline" size="14" fill="currentColor" />
                编辑提示词
              </div>
            </a-button>
          </template>
          <div class="promptData">管理和自定义AIAgent的提示词,可修改主Agent、子Agent和系统提示词</div>
        </a-card>
      </div>
      <div class="sql">
        <a-card title="数据库" style="width: 100%">
          <template #extra>
            <span class="dangerBadge">危险区域</span>
          </template>
          <div class="sqlData">
            <p>以下操作不可逆，请谨慎执行</p>
            <div class="dangerActions" style="display: flex; gap: 12px">
              <a-button danger @click="deleteAllData">
                <i-clear theme="outline" size="14" fill="currentColor" />
                清空数据库
              </a-button>
              <a-button danger type="primary" @click="clearDatabase">
                <i-delete theme="outline" size="14" fill="currentColor" />
                删除数据库
              </a-button>
            </div>
          </div>
        </a-card>
      </div>
      <div class="about">
        <a-card title="关于" style="width: 100%">
          <div class="aboutData">
            <div class="aboutInfo">
              <div class="aboutLogo">
                <img src="@/assets/logo.png" alt="ToonFlow Logo" class="logoImg" />
                <div class="appInfo">
                  <h2 class="appName">ToonFlow</h2>
                  <span class="appVersion">v1.0.6</span>
                </div>
              </div>
              <p class="aboutDesc">ToonFlow 是一款开源的 AI 驱动漫画/分镜创作工具，帮助创作者快速生成故事分镜和视频内容。</p>
              <div class="aboutLinks">
                <div class="linkItem">
                  <div class="linkIcon">
                    <i-github theme="outline" size="20" fill="currentColor" />
                  </div>
                  <div class="linkContent" @click="openGitHub">
                    <span class="linkTitle">GitHub 仓库</span>
                    <span class="linkDesc">查看源代码、提交 Issue 或贡献代码</span>
                  </div>
                  <i-right theme="outline" size="16" fill="#9ca3af" />
                </div>

                <div class="linkItem">
                  <div class="linkIcon">
                    <i-code theme="outline" size="20" fill="currentColor" />
                  </div>
                  <div class="linkContent" @click="openGitee">
                    <span class="linkTitle">Gitee 仓库</span>
                    <span class="linkDesc">国内镜像，查看源代码或贡献代码</span>
                  </div>
                  <i-right theme="outline" size="16" fill="#9ca3af" />
                </div>

                <div class="linkItem" @click="checkUpdate">
                  <div class="linkIcon">
                    <i-refresh theme="outline" size="20" fill="currentColor" />
                  </div>
                  <div class="linkContent">
                    <span class="linkTitle">检查更新 (GitHub)</span>
                    <span class="linkDesc">前往 GitHub Releases 查看最新版本</span>
                  </div>
                  <i-right theme="outline" size="16" fill="#9ca3af" />
                </div>

                <div class="linkItem" @click="checkUpdateGitee">
                  <div class="linkIcon">
                    <i-refresh theme="outline" size="20" fill="currentColor" />
                  </div>
                  <div class="linkContent">
                    <span class="linkTitle">检查更新 (Gitee)</span>
                    <span class="linkDesc">前往 Gitee Releases 查看最新版本</span>
                  </div>
                  <i-right theme="outline" size="16" fill="#9ca3af" />
                </div>

                <div class="linkItem" @click="openLicense">
                  <div class="linkIcon">
                    <i-file-text theme="outline" size="20" fill="currentColor" />
                  </div>
                  <div class="linkContent">
                    <span class="linkTitle">开源协议</span>
                    <span class="linkDesc">本项目基于 AGPL-3.0 协议开源</span>
                  </div>
                  <i-right theme="outline" size="16" fill="#9ca3af" />
                </div>
              </div>

              <div class="licenseBadge">
                <i-certificate theme="outline" size="16" fill="#9913FA" />
                <span>AGPL-3.0 License</span>
              </div>
            </div>
          </div>
        </a-card>
      </div>
    </div>

    <PromptEditor v-model="promptEditorShow" />
    <newModelData v-model:modelDataShow="modelDataShow" :currentType="currentType" v-model:configingModel="configingModel" @modelList="modelList" />
    <ModeListDialog :typeList="['video']" v-model:modelShow="videoModelDialogShow" state="选择视频模型" @fetchModelList="onVideoModelDialogClose" />
    <addModelDialog v-model="editDialogVisible" v-if="editDialogVisible" v-model:modelForm="editForm" @fetchModelList="loadVideoModels" />
  </div>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
import { message, Modal } from "ant-design-vue";
import PromptEditor from "./components/promptEditor.vue";
import newModelData from "./components/modelData.vue";
import ModeListDialog from "./components/modeListDialog.vue";
import addModelDialog from "./components/addModelDialog.vue";

import dayjs from "dayjs";

const promptEditorShow = ref(false);
interface ModelType {
  id: number;
  model: string;
  name: string;
  key: string;
}
const editForm = ref();
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
interface ModelDataType {
  model: string;
  apiKey: string;
  baseURL: string;
  manufacturer: string;
}

interface SettingType {
  id?: number | null;
  name?: string;
  password?: string;
}
const customFormat: ModelDataType = {
  model: "",
  apiKey: "",
  baseURL: "",
  manufacturer: "openAi",
};
const settingData = ref<SettingType>({
  id: null,
  name: "",
  password: "",
});
const modelData = ref<ModelType[]>([]);
const videoModels = ref<VideoModelType[]>([]);
const currentType = ref("");
const videoModelDialogShow = ref(false);
const editingVideoModel = ref<VideoModelType | null>({
  id: 0,
  model: "",
  modelType: "",
  manufacturer: "",
  baseUrl: "",
  apiKey: "",
  createTime: 0,
  type: "video",
});
const editDialogVisible = ref(false);
const savingAccess = ref(false);

onMounted(() => {
  modelList();
  loadVideoModels();
  loadAccessControl();
});

async function modelList() {
  const res = await axios.post("/setting/getAiModelMap");
  modelData.value = res.data;
}

// 加载视频模型列表
async function loadVideoModels() {
  try {
    const res = await axios.post("/setting/getVideoModelList", { type: "video" });
    if (res.data) {
      videoModels.value = Array.isArray(res.data) ? res.data : [];
    } else {
      videoModels.value = [];
    }
  } catch (error) {
    console.error("加载视频模型列表失败", error);
    videoModels.value = [];
  }
}

// 加载访问控制设置
async function loadAccessControl() {
  axios.get("/user/getUser").then((res) => {
    settingData.value.id = res.data.id ?? null;
    settingData.value.name = res.data.name ?? "";
    settingData.value.password = res.data.password ?? "";
  });
}

// 保存访问控制设置
async function saveAccessControl() {
  if (!settingData.value.name || !settingData.value.password) {
    message.warning("请填写完整的账号和密码");
    return;
  }

  savingAccess.value = true;
  try {
    await axios.post("/user/saveUser", settingData.value);
    message.success("保存成功");
    loadAccessControl();
  } catch (error) {
    message.error("保存失败");
  } finally {
    savingAccess.value = false;
  }
}

const modelDataShow = ref(false);
const configingModel = ref<ModelType>();

// 开始配置
function startConfig(item: ModelType) {
  configingModel.value = item;
  const imageKey = ["editImage", "storyboardImage", "assetsImage"];
  const textKey = ["storyboardAgent", "outlineScriptAgent", "assetsPrompt", "generateScript", "videoPrompt"];
  if (imageKey.includes(item.key)) {
    currentType.value = "image";
  } else if (textKey.includes(item.key)) {
    currentType.value = "text";
  }
  modelDataShow.value = true;
}

// 添加视频模型
function addVideoModel() {
  editingVideoModel.value = null;
  videoModelDialogShow.value = true;
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
    message.success("删除成功");
    loadVideoModels();
  } catch (error) {
    message.error("删除失败");
  }
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

// 获取厂商标签颜色
function getManufacturerTagColor(manufacturer: string): string {
  const colors: Record<string, string> = {
    deepSeek: "blue",
    volcengine: "orange",
    kling: "purple",
    zhipu: "cyan",
    qwen: "green",
    wan: "green",
    openai: "geekblue",
    vidu: "magenta",
    anthropic: "volcano",
    runninghub: "gold",
    gemini: "lime",
  };
  return colors[manufacturer] || "default";
}

// 获取模型类型名称
function getModelTypeName(type: string): string {
  const names: Record<string, string> = {
    singleImage: "单图生视频",
    startEndRequired: "首尾帧（必需）",
    endFrameOptional: "首尾帧（尾帧可选）",
    startFrameOptional: "首尾帧（首帧可选）",
    multiImage: "多图生视频",
    reference: "参考图生视频",
    text: "文本生视频",
  };
  return names[type] || type;
}

// 格式化时间
function formatTime(timestamp: number): string {
  return dayjs(timestamp).format("YYYY-MM-DD HH:mm");
}

// 视频模型弹窗关闭后刷新列表
function onVideoModelDialogClose() {
  videoModelDialogShow.value = false;
  loadVideoModels();
}

//其他配置
function showDoubleConfirm2(step = 1): Promise<boolean> {
  return new Promise((resolve) => {
    const config =
      step === 1
        ? {
            title: "危险操作！确认要删除所有数据表吗？",
            content: "此操作会删除所有数据表，且不可恢复。请谨慎操作！",
            okText: "继续操作",
          }
        : {
            title: "请再次确认",
            content: "真的要删除所有数据表吗？数据将无法恢复！",
            okText: "确认删除",
          };

    Modal.confirm({
      ...config,
      cancelText: "取消",
      centered: true,
      onOk: async () => {
        if (step === 1) {
          resolve(await showDoubleConfirm2(2));
        } else {
          resolve(true);
        }
      },
      onCancel: () => resolve(false),
    });
  });
}
async function clearDatabase() {
  const confirmed = await showDoubleConfirm2();
  if (!confirmed) {
    message.info("操作已取消");
    showDoubleConfirm;
    return;
  }
  try {
    await axios.post("/other/clearDatabase");
    message.success("所有数据表已删除，请重新打开页面");
  } catch {
    message.error("操作失败，请重试");
  }
}
function showDoubleConfirm(step = 1): Promise<boolean> {
  return new Promise((resolve) => {
    const config =
      step === 1
        ? {
            title: "危险操作！确认要清空所有数据表吗？",
            content: "此操作会删除所有数据表的数据，且不可恢复。请谨慎操作！",
            okText: "继续操作",
          }
        : {
            title: "请再次确认",
            content: "真的要清空所有数据表吗？数据将无法恢复！",
            okText: "确认删除",
          };

    Modal.confirm({
      ...config,
      cancelText: "取消",
      centered: true,
      onOk: async () => {
        if (step === 1) {
          resolve(await showDoubleConfirm(2));
        } else {
          resolve(true);
        }
      },
      onCancel: () => resolve(false),
    });
  });
}

async function deleteAllData() {
  const confirmed = await showDoubleConfirm();
  if (!confirmed) {
    message.info("操作已取消");
    return;
  }
  try {
    await axios.post("/other/deleteAllData");
    message.success("所有数据表已清空");
  } catch {
    message.error("操作失败，请重试");
  }
}
const GITHUB_URL = "https://github.com/HBAI-Ltd/Toonflow-app";
const GITEE_URL = "https://gitee.com/HBAI-Ltd/Toonflow-app";

function openGitHub() {
  window.open(GITHUB_URL, "_blank");
}

function openGitee() {
  window.open(GITEE_URL, "_blank");
}

function checkUpdate() {
  window.open(`${GITHUB_URL}/releases`, "_blank");
}

function checkUpdateGitee() {
  window.open(`${GITEE_URL}/releases`, "_blank");
}

function openLicense() {
  window.open(`${GITHUB_URL}/blob/master/LICENSE`, "_blank");
}
</script>

<style lang="scss" scoped>
.settingContainer {
  padding: 50px;
  height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow-y: auto;

  > span {
    font-size: 30px;
    font-weight: bold;
    margin-bottom: 20px;
  }

  .addModel {
    margin-top: 20px;
    flex: 0 0 auto;
  }

  .model {
    .model-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
      margin-top: 20px;

      .model-card-item {
        .model-config-card {
          height: 100%;
          border-radius: 12px;
          transition: all 0.3s ease;
          border: 1px solid #f0f0f0;

          &:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(153, 19, 250, 0.15);
            border-color: var(--mainColor);
          }

          :deep(.ant-card-head) {
            border-bottom: 1px solid #f0f0f0;
            padding: 16px 20px;
          }

          :deep(.ant-card-body) {
            padding: 20px;
          }

          :deep(.ant-card-actions) {
            border-top: 1px solid #f0f0f0;
            background: #fafafa;

            > li {
              margin: 8px 0;
            }
          }

          .card-title-wrapper {
            display: flex;
            align-items: center;
            gap: 12px;

            .card-icon {
              width: 36px;
              height: 36px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, var(--mainColorLight) 0%, #ede9fe 100%);
              border-radius: 8px;
              color: var(--mainColor);
            }

            .card-title-text {
              font-size: 16px;
              font-weight: 600;
              color: #1f2937;
            }
          }

          .card-content {
            .model-info {
              display: flex;
              gap: 8px;

              .model-label {
                font-size: 13px;
                color: #6b7280;
                font-weight: 500;
              }

              .model-value {
                font-size: 14px;
                color: #1f2937;

                &.unconfigured {
                  display: flex;
                  align-items: center;
                  gap: 6px;
                  color: #faad14;
                }
              }
            }
          }

          .config-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            border-radius: 6px;
          }
        }
      }
    }
  }

  // 视频模型区域
  .video-model-section {
    margin-top: 40px;
    padding: 24px;
    background: #fafafa;
    border-radius: 12px;

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;

      .section-title {
        font-size: 20px;
        font-weight: 600;
        color: #1f2937;
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0;

        i {
          color: var(--mainColor);
        }
      }

      .add-video-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border-radius: 8px;
        height: 40px;
        padding: 0 20px;
      }
    }

    .video-model-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 20px;

      .video-model-card {
        .clickable-card {
          cursor: pointer;
        }

        :deep(.ant-card) {
          border-radius: 12px;
          transition: all 0.3s ease;
          border: 1px solid #e5e7eb;
          background: white;

          &:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(153, 19, 250, 0.12);
            border-color: var(--mainColor);
          }

          .ant-card-head {
            border-bottom: 1px solid #f0f0f0;
            padding: 16px 20px;
          }

          .ant-card-body {
            padding: 20px;
          }
        }

        .video-card-title {
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;

          .video-icon {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #f5f0ff 0%, #ede9fe 100%);
            border-radius: 8px;
          }

          .video-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;

            .video-model-name {
              font-size: 15px;
              font-weight: 600;
              color: #1f2937;
            }

            .manufacturer-tag {
              align-self: flex-start;
              margin: 0;
            }
          }

          .delete-btn-corner {
            margin-left: auto;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            border-radius: 6px;
            flex-shrink: 0;
          }
        }

        .video-card-content {
          display: flex;
          flex-direction: column;
          gap: 12px;

          .video-detail-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;

            .detail-label {
              color: #6b7280;
              font-weight: 500;
              min-width: 80px;
            }

            .detail-value {
              color: #1f2937;
              flex: 1;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          }
        }
      }
    }

    .empty-state {
      padding: 60px 20px;
      background: white;
      border-radius: 12px;
      border: 2px dashed #e5e7eb;
    }
  }

  .other {
    margin-top: 16px;
    -webkit-overflow-scrolling: touch;
    .otherConfiguration {
      font-size: 18px;
      margin-top: 10px;
      display: block;
    }
    .prompt {
      margin-top: 20px;
      .promptText {
        font-size: 18px;
        margin-top: 10px;
        display: block;
      }
    }
    .sql {
      margin-top: 20px;
      .sqlText {
        font-size: 18px;
        margin-top: 10px;
        display: block;
      }
      .dangerBadge {
        font-size: 12px;
        color: #ef4444;
        background: #fee2e2;
        padding: 4px 10px;
        border-radius: 20px;
        margin-left: auto;
      }
    }
    .about {
      margin-top: 20px;
      .aboutText {
        font-size: 18px;
        margin-top: 10px;
        display: block;
      }
      .aboutData {
        .aboutInfo {
          display: flex;
          flex-direction: column;
          gap: 20px;
          .aboutLogo {
            display: flex;
            align-items: center;
            gap: 16px;
            .logoImg {
              width: 64px;
              height: 64px;
              border-radius: 16px;
              object-fit: contain;
              background: linear-gradient(135deg, #f5f0ff 0%, #ede9fe 100%);
              padding: 8px;
            }

            .appInfo {
              display: flex;
              flex-direction: column;
              gap: 4px;
              .appName {
                font-size: 24px;
                font-weight: 700;
                color: #1f2937;
                margin: 0;
                background: var(--mainGradient);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
              }

              .appVersion {
                font-size: 14px;
                color: #6b7280;
                background: #f3f4f6;
                padding: 2px 10px;
                border-radius: 20px;
                width: fit-content;
              }
            }
          }
          .aboutDesc {
            color: #6b7280;
            font-size: 14px;
            line-height: 1.6;
            margin: 0;
          }

          .aboutLinks {
            display: flex;
            flex-direction: column;
            gap: 8px;
            .linkItem {
              display: flex;
              align-items: center;
              gap: 16px;
              padding: 16px;
              background: #f9fafb;
              border-radius: 12px;
              cursor: pointer;
              transition: all 0.2s;
              border: 1px solid transparent;
              .linkIcon {
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, var(--mainColorLight) 0%, #ede9fe 100%);
                border-radius: 10px;
                color: var(--mainColor);
                flex-shrink: 0;
              }
            }

            .linkItem:hover {
              background: #f3f4f6;
              border-color: var(--mainColor);
              transform: translateX(4px);
            }
            .linkContent {
              flex: 1;
              display: flex;
              flex-direction: column;
              gap: 2px;
              .linkTitle {
                font-size: 14px;
                font-weight: 600;
                color: #1f2937;
              }
              .linkDesc {
                font-size: 12px;
                color: #9ca3af;
              }
            }
          }
          .licenseBadge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 16px;
            background: linear-gradient(135deg, var(--mainColorLight) 0%, #ede9fe 100%);
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            color: var(--mainColor);
            width: fit-content;
            border: 1px solid rgba(153, 19, 250, 0.2);
          }
        }
      }
    }
  }
}
/* 卡片通用样式 */
.settingCard {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #f3e8ff;
  margin-bottom: 20px;
  transition: all 0.2s;
  margin-top: 40px;
  padding: 24px;
}

.settingCard:hover {
  box-shadow: 0 4px 16px rgba(152, 16, 250, 0.08);
}

.settingCard.danger {
  border-color: #fee2e2;
}

.settingCard.danger:hover {
  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.08);
}
.cardHeader {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid #f9fafb;
}
.cardIcon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cardIcon.purple {
  background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
  color: var(--mainColor);
}

.cardIcon.blue {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #3b82f6;
}

.cardIcon.green {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: #22c55e;
}

.cardIcon.orange {
  background: linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%);
  color: #f97316;
}

.cardIcon.red {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #ef4444;
}

.cardIcon.cyan {
  background: linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%);
  color: #06b6d4;
}

.cardContent {
  padding: 24px;
}
/* 表单样式 */
.formGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

@media (max-width: 640px) {
  .formGrid {
    grid-template-columns: 1fr;
  }
}
.formItem {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.modelForm .formItem + .formItem {
  margin-top: 16px;
}

.formLabel {
  font-size: 13px;
  font-weight: 500;
  color: #4b5563;
}

.formHint {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
}

.formError {
  font-size: 12px;
  color: #ef4444;
  margin-top: 4px;
}
.formInput {
  height: 44px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  transition: all 0.2s;
}

.formInput:hover {
  border-color: #d1d5db;
}

.formInput:focus,
.formInput:focus-within {
  border-color: var(--mainColor);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(152, 16, 250, 0.1);
}
</style>
