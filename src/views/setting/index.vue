<template>
  <div class="settingContainer">
    <div class="settingInner">
      <!-- 返回按钮 -->
      <div class="backBtn" @click="goBack">
        <i-left theme="outline" size="16" fill="currentColor" />
        <span>返回</span>
      </div>

      <!-- 标题与描述 -->
      <div class="pageHeader">
        <h1 class="pageTitle">设置</h1>
        <p class="pageDesc">配置API密钥和模型选项</p>
      </div>

      <!-- 模型调用方式 -->
      <section class="settingCard" v-if="false">
        <div class="cardHeader">
          <div class="cardIcon purple">
            <i-brain theme="outline" size="20" fill="currentColor" />
          </div>
          <span class="cardTitle">模型调用方式</span>
        </div>
        <div class="cardContent">
          <a-radio-group v-model:value="settingData.modalType" class="radioGroup">
            <div class="radioCard" :class="{ active: settingData.modalType === 1 }">
              <a-radio :value="1">
                <div class="radioContent">
                  <div class="radioLabel">使用自定义API Key</div>
                  <div class="radioDesc">使用您自己的AI模型API密钥，直接调用OpenAI、Claude等服务</div>
                </div>
              </a-radio>
            </div>
            <div class="radioCard disabled">
              <a-radio :value="2" disabled>
                <div class="radioContent">
                  <div class="radioLabel">使用官网服务</div>
                  <div class="radioDesc">使用我们提供的转发服务，无需配置API密钥，按量计费</div>
                </div>
              </a-radio>
            </div>
          </a-radio-group>
        </div>
      </section>

      <!-- API密钥配置 -->
      <section class="settingCard" v-if="settingData.modalType == 2">
        <div class="cardHeader">
          <div class="cardIcon purple">
            <i-key theme="outline" size="20" fill="currentColor" />
          </div>
          <span class="cardTitle">API密钥配置</span>
        </div>
        <div class="cardContent">
          <div class="formItem">
            <label class="formLabel">API Key</label>
            <a-input-password v-model:value="settingData.apiKey" placeholder="请输入API Key" class="formInput" />
          </div>
        </div>
      </section>

      <!-- 访问控制 -->
      <section class="settingCard">
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
        </div>
      </section>

      <!-- 模型配置卡片 -->
      <section class="settingCard" v-for="key in Object.keys(modelRecordName) as ModelKey[]" :key="key">
        <div class="cardHeader">
          <div class="cardHeaderLeft">
            <div class="cardIcon" :class="getModelIconClass(key)">
              <i-brain v-if="key === 'languageModel'" theme="outline" size="20" fill="currentColor" />
              <i-pic v-else-if="key === 'imageModel'" theme="outline" size="20" fill="currentColor" />
              <i-video v-else theme="outline" size="20" fill="currentColor" />
            </div>
            <span class="cardTitle">{{ modelRecordName[key] }}配置</span>
          </div>
          <a-button v-if="key === 'videoModel'" type="primary" class="addBtn" @click="handleAddModal">
            <i-plus theme="outline" size="14" fill="currentColor" />
            新增配置
          </a-button>
        </div>

        <div class="cardContent">
          <!-- 视频模型列表 -->
          <div v-if="key === 'videoModel'" class="modelList">
            <div v-if="videoModalList.length === 0" class="emptyState">
              <i-inbox theme="outline" size="48" fill="#d1d5db" />
              <p>暂无配置，点击上方按钮添加</p>
            </div>
            <ModalInfo
              v-for="item in videoModalList.sort((a, b) => a.index - b.index)"
              :key="item.id"
              :config="item"
              @edit="handleModalEdit"
              @delete="handleModalDelete" />
          </div>

          <!-- 其他模型配置表单 -->
          <div v-else class="modelForm">
            <div class="formItem" v-if="key !== 'imageModel' || !['apimart', 'runninghub'].includes(settingData[key].manufacturer)">
              <label class="formLabel">模型 ID</label>
              <a-auto-complete
                v-model:value="settingData[key].model"
                :options="modelHistoryOptions[key] || []"
                :placeholder="key === 'languageModel' ? '如: gpt-4o、doubao-1-5-pro-32k-250115' : '如: doubao-seedream-4-5-251128'"
                class="formInput"
                :filter-option="filterModelOption"
                @select="(val: string) => onSelectModelHistory(key, val)" />
              <span class="formHint">填写模型提供商分配的模型标识符（Model ID），非自定义名称</span>
            </div>
            <div class="formItem">
              <label class="formLabel">厂商</label>
              <a-select v-model:value="settingData[key].manufacturer" placeholder="请选择厂商" class="formSelect" @change="handleChange(key)">
                <a-select-option v-for="item in getManufacturerList(key)" :key="item.value" :value="item.value">
                  {{ item.label }}
                </a-select-option>
              </a-select>
            </div>
            <div class="formItem" v-if="key !== 'imageModel' || settingData[key].manufacturer === 'openAi'">
              <label class="formLabel">BaseURL</label>
              <a-input
                v-model:value="settingData[key].baseURL"
                :placeholder="`请输入${modelRecordName[key]}的BaseURL`"
                class="formInput"
                :class="{ 'input-error': key === 'languageModel' && baseURLError }"
                @input="key === 'languageModel' && validateBaseURL()" />
              <span class="formError" v-if="key === 'languageModel' && baseURLError">{{ baseURLError }}</span>
              <span class="formHint" v-else-if="key === 'languageModel'">提示：只需填写到 /v1/ 为止，例如 https://api.openai.com/v1/</span>
            </div>
            <div class="formItem">
              <label class="formLabel">API Key</label>
              <a-input-password v-model:value="settingData[key].apiKey" :placeholder="`请输入${modelRecordName[key]}的API Key`" class="formInput" />
            </div>
            <!-- 语言模型测试按钮 -->
            <div class="formItem" v-if="key === 'languageModel'">
              <a-button type="primary" :loading="testingAI" @click="testLanguageModel" class="testBtn">
                <i-check-one v-if="!testingAI" theme="outline" size="14" fill="currentColor" />
                检查AI是否可用
              </a-button>
            </div>
            <!-- 图像模型测试按钮 -->
            <div class="formItem" v-if="key === 'imageModel'">
              <a-button type="primary" :loading="testingImage" @click="testImageModel" class="testBtn">
                <i-check-one v-if="!testingImage" theme="outline" size="14" fill="currentColor" />
                {{ testingImage ? '正在生成测试图片...' : '检查图像生成是否可用' }}
              </a-button>
              <span class="formHint">提示：测试将生成一张“2D猫”图片，可能需要 30秒~2分钟，请耐心等待</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 提示词管理 -->
      <section class="settingCard">
        <div class="cardHeader">
          <div class="cardHeaderLeft">
            <div class="cardIcon cyan">
              <i-text theme="outline" size="20" fill="currentColor" />
            </div>
            <span class="cardTitle">提示词管理</span>
          </div>
          <a-button type="primary" class="addBtn" @click="promptEditorShow = true">
            <i-edit theme="outline" size="14" fill="currentColor" />
            编辑提示词
          </a-button>
        </div>
        <div class="cardContent">
          <p class="promptTip">管理和自定义AI Agent的提示词，可修改主Agent、子Agent和系统提示词</p>
        </div>
      </section>

      <!-- 数据管理 -->
      <section class="settingCard danger">
        <div class="cardHeader">
          <div class="cardIcon red">
            <i-delete theme="outline" size="20" fill="currentColor" />
          </div>
          <span class="cardTitle">数据管理</span>
          <span class="dangerBadge">危险区域</span>
        </div>
        <div class="cardContent">
          <p class="dangerTip">以下操作不可逆，请谨慎执行</p>
          <div class="dangerActions">
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
      </section>

      <!-- 关于 -->
      <section class="settingCard about">
        <div class="cardHeader">
          <div class="cardIcon purple">
            <i-info theme="outline" size="20" fill="currentColor" />
          </div>
          <span class="cardTitle">关于</span>
        </div>
        <div class="cardContent">
          <div class="aboutInfo">
            <div class="aboutLogo">
              <img src="@/assets/logo.png" alt="ToonFlow Logo" class="logoImg" />
              <div class="appInfo">
                <h2 class="appName">ToonFlow</h2>
                <span class="appVersion">v1.0.0</span>
              </div>
            </div>
            <p class="aboutDesc">ToonFlow 是一款开源的 AI 驱动漫画/分镜创作工具，帮助创作者快速生成故事分镜和视频内容。</p>

            <div class="aboutLinks">
              <div class="linkItem" @click="openGitHub">
                <div class="linkIcon">
                  <i-github theme="outline" size="20" fill="currentColor" />
                </div>
                <div class="linkContent">
                  <span class="linkTitle">GitHub 仓库</span>
                  <span class="linkDesc">查看源代码、提交 Issue 或贡献代码</span>
                </div>
                <i-right theme="outline" size="16" fill="#9ca3af" />
              </div>

              <div class="linkItem" @click="openGitee">
                <div class="linkIcon">
                  <i-code theme="outline" size="20" fill="currentColor" />
                </div>
                <div class="linkContent">
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
      </section>

      <!-- 底部按钮 -->
      <div class="pageFooter">
        <a-button size="large" @click="goBack">取消</a-button>
        <a-button type="primary" size="large" @click="updateSetting">
          <i-check theme="outline" size="16" fill="currentColor" />
          保存设置
        </a-button>
      </div>
    </div>
  </div>

  <ConfigAddForm v-model="addModalShow" :data="editData" @save="handleSave" />
  <PromptEditor v-model="promptEditorShow" />

  <a-modal title="执行SQL" v-model:open="sqlShow" @ok="doExecSQL" centered>
    <a-textarea v-model:value="sqlString" placeholder="请输入SQL语句" :autosize="{ minRows: 2, maxRows: 12 }" />
  </a-modal>

  <!-- 图像测试结果预览弹窗 -->
  <a-modal 
    title="图像生成测试成功" 
    v-model:open="testImageModalVisible" 
    :footer="null"
    centered
    width="auto"
    class="test-image-modal">
    <div class="test-image-content">
      <p class="test-image-tip">✅ 图像模型配置正确，以下是生成的测试图片：</p>
      <a-image 
        :src="testImageResult" 
        :preview="{ src: testImageResult }"
        class="test-image-preview" />
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { message, Modal } from "ant-design-vue";
import axios from "@/utils/axios";
import ConfigAddForm from "./components/configAddForm.vue";
import ModalInfo from "./components/modalInfo.vue";
import PromptEditor from "./components/promptEditor.vue";
import dayjs from "dayjs";

const videoModalList = ref<ConfigForm[]>([]);
const sqlShow = ref(false);
const sqlString = ref("");
const promptEditorShow = ref(false);
const testingAI = ref(false);
const testingImage = ref(false);
const baseURLError = ref("");
const testImageResult = ref<string>(""); // 测试生成的图片 base64
const testImageModalVisible = ref(false); // 图片预览弹窗

async function doExecSQL() {
  try {
    await axios.post("", { sql: sqlString.value });
    message.success("执行成功");
  } catch (e: unknown) {
    if (e instanceof Error) message.error(e.message);
  }
}

interface ConfigForm {
  id: number;
  name: string;
  manufacturer: string;
  index: number;
  model: string;
  baseUrl: string;
  apiKey: string;
  createTime: number;
}

const addModalShow = ref(false);
const editData = ref<ConfigForm>({
  id: -1,
  name: "",
  manufacturer: "",
  index: 0,
  model: "",
  baseUrl: "",
  apiKey: "",
  createTime: 0,
});

function handleSave(data: ConfigForm) {
  if (data.id === -1) {
    data.id = dayjs().valueOf();
    videoModalList.value.push(data);
  } else {
    const index = videoModalList.value.findIndex((item) => item.id === data.id);
    if (index !== -1) videoModalList.value[index] = data;
  }
  updateSetting();
}

function handleAddModal() {
  editData.value = {
    id: -1,
    name: "",
    manufacturer: "runninghub",
    index: 0,
    model: "",
    baseUrl: "",
    apiKey: "",
    createTime: 0,
  };
  addModalShow.value = true;
}

function handleModalEdit(data: ConfigForm) {
  editData.value = data;
  addModalShow.value = true;
}

function handleModalDelete(data: ConfigForm) {
  videoModalList.value = videoModalList.value.filter((item) => item.id !== data.id);
  updateSetting();
}

function handleChange(key: ModelKey) {
  // 可扩展的厂商切换逻辑
}

// 校验 BaseURL 格式
function validateBaseURL() {
  const url = settingData.value.languageModel.baseURL;
  if (!url) {
    baseURLError.value = "";
    return true;
  }

  // 检查是否包含 /v1/ 后面还有其他路径
  const v1Index = url.indexOf("/v1/");
  if (v1Index !== -1) {
    const afterV1 = url.substring(v1Index + 4); // 获取 /v1/ 后面的内容
    if (afterV1 && afterV1 !== "/" && afterV1.replace(/\/+$/, "") !== "") {
      baseURLError.value = "错误：BaseURL 只需填写到 /v1/ 为止，请勿添加后续路径";
      return false;
    }
  }

  baseURLError.value = "";
  return true;
}

// 测试语言模型连接
async function testLanguageModel() {
  const { model, apiKey, baseURL } = settingData.value.languageModel;

  if (!model) {
    message.warning("请先填写模型名称");
    return;
  }
  if (!apiKey) {
    message.warning("请先填写 API Key");
    return;
  }

  testingAI.value = true;
  try {
    await axios.post("/other/testAI", {
      modelName: model,
      apiKey: apiKey,
      baseURL: baseURL || undefined,
    });
    message.success("连接成功！模型配置正确");
  } catch (e: any) {
    message.error(`连接失败: ${e.message}`);
  } finally {
    testingAI.value = false;
  }
}

// 测试图像模型连接
async function testImageModel() {
  const { model, apiKey, baseURL, manufacturer } = settingData.value.imageModel;

  // APIMart 和 RunningHub 不需要模型名称
  if (!["apimart", "runninghub"].includes(manufacturer) && !model) {
    message.warning("请先填写模型名称");
    return;
  }
  if (!apiKey) {
    message.warning("请先填写 API Key");
    return;
  }

  testingImage.value = true;
  message.info("正在生成测试图片，请耐心等待...");
  try {
    const res = await axios.post("/other/testImage", {
      modelName: model || undefined,
      apiKey: apiKey,
      baseURL: baseURL || undefined,
      manufacturer: manufacturer,
    });
    message.success("连接成功！图像模型配置正确");
    // 显示生成的图片
    if (res.data) {
      testImageResult.value = res.data;
      testImageModalVisible.value = true;
    }
  } catch (e: any) {
    message.error(`连接失败: ${e.message}`);
  } finally {
    testingImage.value = false;
  }
}

function getModelIconClass(key: ModelKey): string {
  const classMap = {
    languageModel: "purple",
    imageModel: "green",
    videoModel: "orange",
  };
  return classMap[key] || "purple";
}

// 语言生成模型厂商列表
const languageModelManufacturer = [
  { label: "OpenAI请求格式", value: "openAi" },
  // { label: "Gemini", value: "gemini" },
  // { label: "DeepSeek", value: "deepseek" },
  // { label: "火山引擎", value: "volcengine" },
];

// 图像生成模型厂商列表
const imageModelManufacturer = [
  { label: "OpenAI", value: "openAi" },
  { label: "火山引擎", value: "volcengine" },
  { label: "APIMart", value: "apimart" },
  { label: "RunningHub", value: "runninghub" },
];

// 根据模型类型获取对应的厂商列表
function getManufacturerList(key: ModelKey) {
  if (key === "languageModel") return languageModelManufacturer;
  if (key === "imageModel") return imageModelManufacturer;
  return [];
}

type ModelKey = keyof typeof modelRecordName;

interface ModelDataType {
  model: string;
  apiKey: string;
  baseURL: string;
  manufacturer: string;
}

interface SettingType {
  id?: number | null;
  modalType: number;
  apiKey: string;
  languageModel: ModelDataType;
  imageModel: ModelDataType;
  videoModel: ModelDataType;
  audioModel?: ModelDataType;
  name?: string;
  password?: string;
}

const modelRecordName = {
  languageModel: "语言生成模型",
  imageModel: "图像生成模型",
  videoModel: "视频生成模型",
} as const;

onMounted(async () => {
  await getSetting();
  getUser();
  await loadModelHistory();
  // 初始数据加载完成后才开启自动保存
  setTimeout(() => { isInitialized.value = true; }, 500);
});

const customFormat: ModelDataType = {
  model: "",
  apiKey: "",
  baseURL: "",
  manufacturer: "",
};

const settingData = ref<SettingType>({
  id: null,
  apiKey: "",
  modalType: 1,
  languageModel: { ...customFormat },
  imageModel: { ...customFormat },
  videoModel: { ...customFormat },
  audioModel: { ...customFormat },
  name: "",
  password: "",
});

const router = useRouter();

const GITHUB_URL = "https://github.com/HBAI-Ltd/Toonflow-app";
const GITEE_URL = "https://gitee.com/HBAI-Ltd/Toonflow-app";

function goBack() {
  router.push("/project");
}

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

async function getSetting() {
  const res = await axios.post("/setting/getSetting", { userId: Number(localStorage.getItem("userId")) });
  const data = res.data[0];
  videoModalList.value = data.videoModel;
  settingData.value = {
    id: data?.id ?? null,
    modalType: 1,
    apiKey: data?.apiKey ?? "",
    languageModel: {
      ...customFormat,
      ...data?.languageModel,
      manufacturer: data?.languageModel?.manufacturer || "openAi",
    },
    imageModel: {
      ...customFormat,
      ...data?.imageModel,
      manufacturer: data?.imageModel?.manufacturer || "openAi",
    },
    videoModel: {
      ...customFormat,
      ...data?.videoModel,
      manufacturer: data?.videoModel?.manufacturer || "openAi",
    },
  };
}

function getUser() {
  axios.get("/user/getUser").then((res) => {
    settingData.value.name = res.data.name ?? "";
    settingData.value.password = res.data.password ?? "";
  });
}

function updateSetting(silent = false) {
  axios
    .post("/setting/updateSetting", {
      userId: Number(localStorage.getItem("userId")),
      id: settingData.value.id ?? null,
      type: settingData.value.modalType,
      languageModel: settingData.value.languageModel,
      imageModel: settingData.value.imageModel,
      videoModel: videoModalList.value,
      name: settingData.value.name,
      password: settingData.value.password,
    })
    .then(() => {
      if (silent) {
        message.success({ content: "已自动保存", duration: 1 });
      } else {
        message.success("设置更新成功");
      }
    })
    .catch(() => {
      message.error("设置更新失败");
    });
}

// ==================== 自动保存（debounce） ====================
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
const isInitialized = ref(false);

function autoSave() {
  if (!isInitialized.value) return;
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    updateSetting(true);
  }, 800);
}

// 监听配置变化自动保存（deep watch）
watch(
  () => [settingData.value.languageModel, settingData.value.imageModel, settingData.value.name, settingData.value.password],
  () => autoSave(),
  { deep: true },
);

watch(videoModalList, () => autoSave(), { deep: true });

// ==================== 模型历史记录 ====================
const modelHistoryOptions = ref<Record<string, Array<{ value: string; label: string }>>>({});
const modelHistoryData = ref<Array<{ modelId: string; type: string; manufacturer: string; baseUrl: string }>>([]);

async function loadModelHistory() {
  try {
    const res = await axios.post("/setting/getModelHistory", { userId: Number(localStorage.getItem("userId")) });
    const list = res.data || [];
    modelHistoryData.value = list;
    // 按 type 分组为 options
    const languageOpts = list.filter((i: any) => i.type === "language").map((i: any) => ({ value: i.modelId, label: i.modelId }));
    const imageOpts = list.filter((i: any) => i.type === "image").map((i: any) => ({ value: i.modelId, label: i.modelId }));
    modelHistoryOptions.value = {
      languageModel: languageOpts,
      imageModel: imageOpts,
    };
  } catch {
    // 历史记录加载失败不阻断页面
  }
}

function filterModelOption(inputValue: string, option: any) {
  return option.value.toLowerCase().includes(inputValue.toLowerCase());
}

function onSelectModelHistory(key: string, modelId: string) {
  const record = modelHistoryData.value.find((i) => i.modelId === modelId);
  if (record) {
    const target = (settingData.value as any)[key];
    if (target) {
      if (record.manufacturer) target.manufacturer = record.manufacturer;
      if (record.baseUrl) target.baseURL = record.baseUrl;
    }
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

async function clearDatabase() {
  const confirmed = await showDoubleConfirm2();
  if (!confirmed) {
    message.info("操作已取消");
    return;
  }
  try {
    await axios.post("/other/clearDatabase");
    message.success("所有数据表已删除，请重新打开页面");
  } catch {
    message.error("操作失败，请重试");
  }
}
</script>

<style scoped>
.settingContainer {
  min-height: 100vh;
  padding: 32px 16px;
  overflow-y: auto;
}

.settingInner {
  max-width: 720px;
  margin: 0 auto;
}

/* 返回按钮 */
.backBtn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #6b7280;
  font-size: 14px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.2s;
  margin-bottom: 8px;
}

.backBtn:hover {
  background: rgba(152, 16, 250, 0.08);
  color: var(--mainColor);
}

/* 页面头部 */
.pageHeader {
  margin-bottom: 32px;
}

.pageTitle {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.pageDesc {
  color: #6b7280;
  font-size: 15px;
  margin: 0;
}

/* 卡片通用样式 */
.settingCard {
  background: #fff;
  border-radius: 16px;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.05),
    0 4px 12px rgba(152, 16, 250, 0.04);
  border: 1px solid #f3e8ff;
  margin-bottom: 20px;
  overflow: hidden;
  transition: all 0.2s;
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

.cardHeaderLeft {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
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

.promptTip {
  color: #6b7280;
  font-size: 14px;
  margin: 0;
}

.cardTitle {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
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

.input-error {
  border-color: #ef4444 !important;
}

.input-error:focus,
.input-error:focus-within {
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
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

.formSelect {
  width: 100%;
}

:deep(.ant-select-selector) {
  height: 44px !important;
  border-radius: 10px !important;
  border: 1px solid #e5e7eb !important;
  background: #f9fafb !important;
  padding: 0 16px !important;
}

:deep(.ant-select-selection-item) {
  line-height: 42px !important;
}

:deep(.ant-select-selection-placeholder) {
  line-height: 42px !important;
}

:deep(.ant-select:hover .ant-select-selector) {
  border-color: #d1d5db !important;
}

:deep(.ant-select-focused .ant-select-selector) {
  border-color: var(--mainColor) !important;
  background: #fff !important;
  box-shadow: 0 0 0 3px rgba(152, 16, 250, 0.1) !important;
}

/* 单选按钮组 */
.radioGroup {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.radioCard {
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s;
  cursor: pointer;
}

.radioCard:hover {
  border-color: #d1d5db;
}

.radioCard.active {
  border-color: var(--mainColor);
  background: var(--mainColorLight);
}

.radioCard.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.radioContent {
  margin-left: 8px;
}

.radioLabel {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.radioDesc {
  font-size: 13px;
  color: #6b7280;
}

/* 模型列表 */
.modelList {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.emptyState {
  text-align: center;
  padding: 48px 24px;
  color: #9ca3af;
}

.emptyState p {
  margin: 12px 0 0 0;
  font-size: 14px;
}

/* 添加按钮 */
.addBtn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  border-radius: 8px;
}

/* 危险区域 */
.dangerBadge {
  font-size: 12px;
  color: #ef4444;
  background: #fee2e2;
  padding: 4px 10px;
  border-radius: 20px;
  margin-left: auto;
}

.dangerTip {
  color: #6b7280;
  font-size: 14px;
  margin: 0 0 16px 0;
}

.dangerActions {
  display: flex;
  gap: 12px;
}

.dangerActions .ant-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* 页脚 */
.pageFooter {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px 0;
  margin-top: 12px;
}

.pageFooter .ant-btn {
  height: 44px;
  padding: 0 24px;
  border-radius: 10px;
  font-weight: 500;
}

.pageFooter .ant-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* 主题色按钮覆盖 */
:deep(.ant-btn-primary) {
  background: var(--mainGradient);
  border: none;
}

:deep(.ant-btn-primary:hover) {
  background: var(--mainGradientHover);
}

/* 关于板块样式 */
.aboutInfo {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.aboutLogo {
  display: flex;
  align-items: center;
  gap: 16px;
}

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
}

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
}

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
}

.linkItem:hover {
  background: #f3f4f6;
  border-color: var(--mainColor);
  transform: translateX(4px);
}

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

.linkContent {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.linkTitle {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.linkDesc {
  font-size: 12px;
  color: #9ca3af;
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

/* 图像测试结果弹窗 */
.test-image-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 8px;
}

.test-image-tip {
  color: #22c55e;
  font-size: 14px;
  font-weight: 500;
  margin: 0;
}

.test-image-preview {
  max-width: 512px;
  max-height: 512px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
