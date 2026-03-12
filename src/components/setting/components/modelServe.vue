<template>
  <div class="modelServe">
    <div class="modelList">
      <div class="listContent">
        <t-menu v-model="modelData" theme="light" @change="handleMenuChange">
          <t-menu-item v-for="item in modelList" :key="item.id" :value="item.id">
            <template #icon>
              <t-icon :name="getProviderIcon(item.id)" />
            </template>
            <div class="menuItemContent">
              <span class="modelName">{{ item.name }}</span>
            </div>
          </t-menu-item>
        </t-menu>
        <div v-if="modelList.length === 0" class="emptyTip">
          <t-icon name="server" size="32px" />
          <p>暂无模型</p>
          <t-button size="small" theme="primary" @click="addVendor">
            <template #icon><t-icon name="add" /></template>
            添加模型
          </t-button>
        </div>
      </div>
      <div class="listFooter">
        <t-button block theme="primary" @click="addVendor">
          <template #icon><t-icon name="add" /></template>
          添加
        </t-button>
      </div>
    </div>

    <div class="modelParameter">
      <div v-if="currentModel" class="parameterContent">
        <t-form ref="formRef" :data="currentModel" labelAlign="top" class="configForm">
          <div class="formSection">
            <t-form-item label="API Key" name="apiKey">
              <div class="inputWrapper">
                <t-input v-model="currentModel.apiKey" type="password" placeholder="sk-..." clearable :disabled="!currentModel.enabled">
                  <template #prefix-icon>
                    <t-icon name="secured" />
                  </template>
                  <template #suffix-icon>
                    <t-icon v-if="currentModel.apiKey" name="check-circle-filled" class="successIcon" />
                  </template>
                </t-input>
              </div>
              <template #help>
                <span class="formHelp">用于验证您的 API 访问权限</span>
              </template>
            </t-form-item>

            <t-form-item label="API 地址" name="baseUrl">
              <t-input v-model="currentModel.baseUrl" placeholder="https://api.example.com/v1" clearable :disabled="!currentModel.enabled">
                <template #prefix-icon>
                  <t-icon name="link" />
                </template>
              </t-input>
              <template #help>
                <span class="formHelp">API 服务的基础地址，留空使用默认地址</span>
              </template>
            </t-form-item>
          </div>

          <div class="formSection">
            <div class="jb ac">
              <h4 class="sectionTitle">模型设置</h4>
              <t-button variant="outline" size="small" @click="addModel">
                <template #icon><t-icon name="add" /></template>
                添加模型
              </t-button>
            </div>
            <div v-for="(item, index) in currentModel.model" :key="index" style="margin-top: 10px">
              <t-card :style="{ width: '100%' }">
                <div class="jb ac">
                  <span style="font-size: 15px; font-weight: 900">{{ item.modelName }}</span>
                  <div class="btn">
                    <t-button size="small" variant="text" theme="default" @click="testModel(item.modelName)">
                      <template #icon><i-lightning theme="outline" size="18" /></template>
                      测试
                    </t-button>
                    <t-button variant="text" size="small" @click="editModel(item)">
                      <template #icon><t-icon name="edit" /></template>
                      编辑
                    </t-button>
                    <t-button variant="text" size="small" theme="danger" @click="confirmDelete(item.modelName)">
                      <template #icon><t-icon name="delete" /></template>
                      删除
                    </t-button>
                  </div>
                </div>
                <div class="jb ac" style="margin-top: 15px">
                  <t-tag>{{ item.type }}</t-tag>
                  <span>{{ dayjs(item.time).format("YYYY-MM-DD") }}</span>
                </div>
              </t-card>
            </div>
          </div>
        </t-form>
      </div>
    </div>
    <newAddModel v-model="addModelShow" :formData="formData" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import newAddModel from "./addModel.vue";
import dayjs from "dayjs";

interface ModelItem {
  id: string;
  name: string;
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  modelName: string;
  model?: { modelName: string; type: string; time: number }[];
}

const STORAGE_KEY = "modelList";

const modelList = ref<ModelItem[]>([
  {
    id: "openai",
    name: "OpenAI",
    enabled: true,
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
    modelName: "gpt-4",
    model: [
      { modelName: "GPT-4", type: "多模态", time: 1773234220665 },
      { modelName: "GPT-4 Turbo", type: "多模态", time: 1773234220665 },
      { modelName: "GPT-3.5 Turbo", type: "多模态", time: 1773234220665 },
    ],
  },
  {
    id: "claude",
    name: "Claude",
    enabled: true,
    apiKey: "",
    baseUrl: "https://api.anthropic.com",
    modelName: "claude-3-opus",
    model: [
      { modelName: "GPT-4", type: "多模态", time: 1773234220665 },
      { modelName: "GPT-4 Turbo", type: "多模态", time: 1773234220665 },
      { modelName: "GPT-3.5 Turbo", type: "多模态", time: 1773234220665 },
    ],
  },
  {
    id: "qwen",
    name: "通义千问",
    enabled: true,
    apiKey: "",
    baseUrl: "",
    modelName: "qwen-turbo",
    model: [
      { modelName: "GPT-4", type: "多模态", time: 1773234220665 },
      { modelName: "GPT-4 Turbo", type: "多模态", time: 1773234220665 },
      { modelName: "GPT-3.5 Turbo", type: "多模态", time: 1773234220665 },
    ],
  },
]);
const modelData = ref("openai");

const currentModel = computed(() => modelList.value.find((item) => item.id === modelData.value));

const findModelById = (id: string) => modelList.value.find((item) => item.id === id);

function getProviderIcon(id: string): string {
  const iconMap: Record<string, string> = {
    openai: "logo-github",
    claude: "chat",
    qwen: "cloud",
    gemini: "logo-google",
    deepseek: "search",
    zhipu: "layers",
    moonshot: "moon",
    doubao: "sound",
    other: "server",
  };
  return iconMap[id] || "server";
}

// 菜单切换处理
function handleMenuChange(value: any) {
  modelData.value = value;
}

function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        modelList.value = parsed;
        if (!findModelById(modelData.value)) {
          modelData.value = modelList.value[0]?.id || "";
        }
      }
    }
  } catch (error) {
    console.error("加载失败:", error);
  }
}
function addVendor() {}
const addModelShow = ref(false);
function addModel() {
  addModelShow.value = true;
}
const formData = ref({
  modelName: "",
});
function editModel(model: { modelName: string }) {
  addModelShow.value = true;
  formData.value = {
    ...model,
  };
}

function testModel(modelId: string) {}

function confirmDelete(modelId: string) {}

onMounted(() => {
  loadFromLocalStorage();
});
</script>

<style lang="scss" scoped>
.modelServe {
  display: flex;
  gap: 0;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
  .modelList {
    width: 280px;
    height: 100%;
    display: flex;
    flex-direction: column;
    .listContent {
      flex: 1;
      overflow-y: auto;
      .menuItemContent {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex: 1;
        margin-left: 8px;

        .modelName {
          font-weight: 500;
        }
      }
      .emptyTip {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 40px 16px;
        color: #999999;
      }
    }

    .listFooter {
      padding: 12px;
      display: flex;
      gap: 8px;
    }
  }

  .modelParameter {
    flex: 1;
    display: flex;
    flex-direction: column;
    .parameterContent {
      flex: 1;
      overflow-y: auto;
      margin-left: 30px;
      .configForm {
        .inputWrapper {
          position: relative;
        }
        .formHelp {
          font-size: 12px;
          color: #999999;
        }
      }
    }
  }
}
</style>
