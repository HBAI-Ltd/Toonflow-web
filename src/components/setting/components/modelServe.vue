<template>
  <div class="modelServe">
    <div class="modelList">
      <div class="listContent">
        <div v-for="item in modelList" :key="item.id" class="modelItem" :class="{ active: modelData === item.id, disabled: !item.enabled }">
          <div class="itemLeft">
            <div class="modelIcon" :style="{ opacity: item.enabled ? 1 : 0.5 }">
              <t-icon :name="item.icon" size="20px" />
            </div>
            <div class="itemInfo" @click="changeFn(item.id)" style="flex: 1; cursor: pointer">
              <span class="modelName" :title="item.name">{{ item.name }}</span>
              <span class="modelStatus" :class="{ connected: item.apiKey }">
                {{ item.apiKey ? "已配置" : "未配置" }}
              </span>
            </div>
          </div>
        </div>
        <div v-if="modelList.length === 0" class="emptyTip">
          <t-icon name="server" size="32px" />
          <p>暂无模型</p>
          <t-button size="small" theme="primary" @click="addModel">
            <template #icon><t-icon name="add" /></template>
            添加模型
          </t-button>
        </div>
      </div>
      <div class="listFooter">
        <t-button block theme="primary" @click="addModel">
          <template #icon><t-icon name="add" /></template>
          添加
        </t-button>
      </div>
    </div>

    <div class="modelParameter">
      <div v-if="currentModel" class="parameterContent">
        <t-form ref="formRef" :data="currentModel" class="configForm">
          <div class="formSection">
            <h4 class="sectionTitle">API 配置</h4>
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
            <h4 class="sectionTitle">模型设置</h4>
            <div v-for="(item, index) in model" :key="index">
              <div class="model f w">
                <div class="modelName">{{ item.model }}</div>
                <div class="modelType">{{ item.type }}</div>
                <div class="modelTime">{{ new Date(item.time).toLocaleString() }}</div>
              </div>
            </div>
          </div>
        </t-form>
      </div>
      <div v-else class="emptyState">
        <t-empty image="empty" title="暂无选中模型" description="请从左侧列表选择一个模型进行配置">
          <template #default>
            <t-button theme="primary" @click="addModel">
              <template #icon><t-icon name="add" /></template>
              新增模型
            </t-button>
          </template>
        </t-empty>
      </div>
    </div>

    <t-dialog
      v-model:visible="dialogVisible"
      :header="dialogTitle"
      theme="default"
      :close-btn="true"
      :on-confirm="handleDialogConfirm"
      confirm-btn-action="submit"
      width="500px">
      <t-form ref="dialogFormRef" :data="dialogForm" label-width="100px">
        <t-form-item label="模型名称" name="name" :rules="[{ required: true, message: '请输入模型名称' }]">
          <t-input v-model="dialogForm.name" placeholder="例如: OpenAI, Claude" autofocus />
        </t-form-item>
        <t-form-item label="选择图标" name="icon">
          <t-select v-model="dialogForm.icon" placeholder="选择模型图标">
            <t-option value="logo-github" label="🐙 GitHub" />
            <t-option value="chat" label="💬 Chat" />
            <t-option value="cloud" label="☁️ Cloud" />
            <t-option value="server" label="🖥️ Server" />
            <t-option value="api" label="🔌 API" />
            <t-option value="code" label="💻 Code" />
            <t-option value="lightning" label="⚡ Lightning" />
            <t-option value="star-filled" label="⭐ Star" />
          </t-select>
        </t-form-item>
      </t-form>
    </t-dialog>

    <t-dialog v-model:visible="manageDialogVisible" header="模型管理" :close-btn="true" :footer="false" width="600px">
      <div class="manageList">
        <div class="manageHeader">
          <span>共 {{ modelList.length }} 个模型</span>
        </div>
        <div class="itemsList">
          <div v-for="item in modelList" :key="item.id" class="manageItem">
            <div class="itemLeft">
              <t-icon :name="item.icon" size="20px" />
              <span>{{ item.name }}</span>
            </div>
            <div class="itemRight">
              <t-button size="small" variant="text" theme="default" @click="editModel(item.id)">
                <template #icon><t-icon name="edit" /></template>
                编辑
              </t-button>
              <t-button size="small" variant="text" theme="danger" @click="confirmDelete(item.id)">
                <template #icon><t-icon name="delete" /></template>
                删除
              </t-button>
            </div>
          </div>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { MessagePlugin, DialogPlugin } from "tdesign-vue-next";

interface ModelItem {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  modelName: string;
  modelList?: { label: string; value: string }[];
}

interface DialogForm {
  name: string;
  icon: string;
}

const STORAGE_KEY = "modelList";

const DEFAULT_MODELS: ModelItem[] = [
  {
    id: "openai",
    name: "OpenAI",
    icon: "logo-github",
    enabled: true,
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
    modelName: "gpt-4",
    modelList: [
      { label: "GPT-4", value: "gpt-4" },
      { label: "GPT-4 Turbo", value: "gpt-4-turbo" },
      { label: "GPT-3.5 Turbo", value: "gpt-3.5-turbo" },
    ],
  },
  {
    id: "claude",
    name: "Claude",
    icon: "chat",
    enabled: true,
    apiKey: "",
    baseUrl: "https://api.anthropic.com",
    modelName: "claude-3-opus",
  },
  {
    id: "qwen",
    name: "通义千问",
    icon: "cloud",
    enabled: true,
    apiKey: "",
    baseUrl: "",
    modelName: "qwen-turbo",
  },
];
const model = ref<{ model: string; type: string; time: number }[]>([
  {
    model: "123",
    type: "text",
    time: 1773234220665,
  },
  {
    model: "1234",
    type: "video",
    time: 1773234220665,
  },
  {
    model: "12345",
    type: "image",
    time: 1773234220665,
  },
]);

const modelList = ref<ModelItem[]>([...DEFAULT_MODELS]);
const modelData = ref("openai");
const dialogVisible = ref(false);
const manageDialogVisible = ref(false);
const dialogTitle = ref("新增模型");
const editingModelId = ref<string | null>(null);
const dialogForm = ref<DialogForm>({
  name: "",
  icon: "server",
});

const currentModel = computed(() => modelList.value.find((item) => item.id === modelData.value));

const findModelById = (id: string) => modelList.value.find((item) => item.id === id);

const findModelIndexById = (id: string) => modelList.value.findIndex((item) => item.id === id);

const generateModelId = () => `model_${Date.now()}`;

function saveToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(modelList.value));
  } catch (error) {
    console.error("保存失败:", error);
    MessagePlugin.error("保存失败");
  }
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

function changeFn(id: string) {
  modelData.value = id;
}

function openDialog(title: string, modelId: string | null = null) {
  dialogTitle.value = title;
  editingModelId.value = modelId;

  if (modelId) {
    const model = findModelById(modelId);
    if (model) {
      dialogForm.value = { name: model.name, icon: model.icon };
    }
  } else {
    dialogForm.value = { name: "", icon: "server" };
  }

  dialogVisible.value = true;
}

function addModel() {
  openDialog("新增模型");
}

function editModel(modelId: string) {
  openDialog("编辑模型", modelId);
}

function handleDialogConfirm() {
  const name = dialogForm.value.name.trim();
  if (!name) {
    MessagePlugin.warning("请输入模型名称");
    return false;
  }

  if (editingModelId.value) {
    // 编辑模式
    const model = findModelById(editingModelId.value);
    if (model) {
      model.name = name;
      model.icon = dialogForm.value.icon;
      MessagePlugin.success("编辑成功");
    }
  } else {
    // 新增模式
    const newModel: ModelItem = {
      id: generateModelId(),
      name,
      icon: dialogForm.value.icon,
      enabled: true,
      apiKey: "",
      baseUrl: "",
      modelName: "",
    };
    modelList.value.push(newModel);
    modelData.value = newModel.id;
    MessagePlugin.success("新增成功");
  }

  saveToLocalStorage();
  return true;
}

function confirmDelete(modelId: string) {
  const model = findModelById(modelId);
  if (!model) return;

  const dialog = DialogPlugin.confirm({
    header: "确认删除",
    body: `确定要删除模型 "${model.name}" 吗？此操作不可恢复。`,
    confirmBtn: { content: "删除", theme: "danger" },
    onConfirm: () => {
      const index = findModelIndexById(modelId);
      if (index > -1) {
        modelList.value.splice(index, 1);
        if (modelData.value === modelId) {
          modelData.value = modelList.value[0]?.id || "";
        }
        MessagePlugin.success("删除成功");
        saveToLocalStorage();
      }
      dialog.hide();
    },
  });
}

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
      padding: 8px;

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
    .modelItem {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      border-radius: 6px;
      margin-bottom: 4px;

      &:hover {
        background: #ffffff;
      }
      &.active {
        background: #ffffff;
        .modelName {
          font-weight: 500;
        }

        .modelIcon {
          background: #0052cc;
          color: #ffffff;
        }
      }

      &.disabled {
        opacity: 0.6;
      }

      .itemLeft {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
        min-width: 0;

        .modelIcon {
          width: 36px;
          height: 36px;
          border-radius: 6px;
          background: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }

        .itemInfo {
          flex: 1;
          min-width: 0;

          .modelName {
            display: block;
            font-size: 14px;
            color: #000000;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            transition: all 0.2s ease;
          }

          .modelStatus {
            display: block;
            font-size: 12px;
            color: #999999;
            margin-top: 2px;

            &.connected {
              color: #00b96b;
            }
          }
        }
      }
    }
  }

  .modelParameter {
    flex: 1;
    display: flex;
    flex-direction: column;

    .parameterContent {
      flex: 1;
      overflow-y: auto;
      padding: 24px 32px;
      .configForm {
        .formSection {
          margin-bottom: 32px;
          .sectionTitle {
            margin: 0 0 16px;
            font-size: 14px;
            font-weight: 600;
            color: #000000;
          }
          .model {
            width: 100%;
            height: 80px;
            margin-top: 10px;
            border: 1px solid #e8e8e8;
            background: #ffffff;
            border-radius: 5px;
            position: relative;
            .modelName {
              padding: 15px;
              font-size: 18px;
              font-weight: 900;
            }
            .modelType {
              font-size: 14px;
              position: absolute;
              bottom: 5px;
              left: 5px;
            }
            .modelTime {
              font-size: 12px;
              color: #999999;
              position: absolute;
              bottom: 15px;
              right: 15px;
            }
          }
        }

        :deep(.t-form__item) {
          margin-bottom: 20px;
        }

        :deep(.t-input) {
          border-radius: 6px;
        }

        :deep(.t-form__label) {
          font-weight: 500;
        }

        .inputWrapper {
          position: relative;

          .successIcon {
            color: #00b96b;
          }
        }

        .formHelp {
          font-size: 12px;
          color: #999999;
        }
      }
    }

    .emptyState {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }
  }

  .manageList {
    .manageHeader {
      padding: 16px;
      border-bottom: 1px solid #e8e8e8;
      font-size: 13px;
      color: #666666;
    }

    .itemsList {
      max-height: 400px;
      overflow-y: auto;

      .manageItem {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid #e8e8e8;

        &:last-child {
          border-bottom: none;
        }

        .itemLeft {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          color: #000000;
        }

        .itemRight {
          display: flex;
          gap: 8px;
        }
      }
    }
  }
}
</style>
