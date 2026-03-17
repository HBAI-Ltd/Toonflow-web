<template>
  <div class="modelServe">
    <!-- 左侧供应商列表 -->
    <div class="modelList">
      <div class="listFooter">
        <t-button block theme="primary" @click="handleAddVendor">
          <template #icon><t-icon name="add" /></template>
          添加供应商
        </t-button>
      </div>
      <div class="listContent" v-loading="loading">
        <t-menu v-model="activeVendorName" theme="light" v-if="vendorList.length > 0">
          <t-menu-item v-for="item in vendorList" :key="item.name" :value="item.name" @click="activeVendorName = item.name">
            <template #icon>
              <t-icon :name="getProviderIcon(item.name)" />
            </template>
            {{ item.name }}
          </t-menu-item>
        </t-menu>
        <t-empty v-else title="暂无供应商，请先添加" style="margin-top: 1rem"></t-empty>
      </div>
    </div>

    <!-- 右侧配置面板 -->
    <div v-if="currentVendor" class="modelParameter">
      <t-form :data="currentVendor" labelAlign="top">
        <t-form-item v-for="input in requiredInputs" :key="input.key" :name="input.key">
          <template #label>
            <span class="requiredLabel">
              {{ input.label }}
              <span class="requiredMark">*</span>
              <span class="requiredText">必填</span>
            </span>
          </template>
          <t-input v-model="currentVendor.inputValues[input.key]" :type="input.type" clearable>
            <template #prefix-icon>
              <t-icon :name="getInputIcon(input.type)" />
            </template>
          </t-input>
          <template #help v-if="getInputPlaceholder(input)">
            <span class="inputHelp">{{ getInputPlaceholder(input) }}</span>
          </template>
        </t-form-item>

        <div v-if="optionalInputs.length > 0" class="optionalSection">
          <t-collapse>
            <t-collapse-panel value="optional-inputs" header="选填项">
              <t-form-item v-for="input in optionalInputs" :key="input.key" :name="input.key" :label="input.label">
                <t-input v-model="currentVendor.inputValues[input.key]" :type="input.type" clearable>
                  <template #prefix-icon>
                    <t-icon :name="getInputIcon(input.type)" />
                  </template>
                </t-input>
                <template #help v-if="getInputPlaceholder(input)">
                  <span class="inputHelp">{{ getInputPlaceholder(input) }}</span>
                </template>
              </t-form-item>
            </t-collapse-panel>
          </t-collapse>
        </div>

        <div class="jb ac">
          <h4 class="sectionTitle">模型设置</h4>
          <t-button variant="outline" size="small" @click="handleAddModel">
            <template #icon><i-plus theme="outline" /></template>
            手动添加
          </t-button>
        </div>

        <t-card v-for="(item, index) in vendorModels" :key="index" class="modelCard">
          <div class="topInfo jb ac">
            <span class="modelCardName">{{ item.modelName }}</span>
            <div class="actionBtns">
              <t-button size="small" variant="text" @click="handleTestModel(item)">
                <template #icon><i-lightning theme="outline" /></template>
                测试
              </t-button>
              <t-button variant="text" size="small" @click="handleEditModel(item)">
                <template #icon><i-pencil theme="outline" /></template>
                编辑
              </t-button>
              <t-button variant="text" size="small" theme="danger" @click="handleDeleteModel(item.modelName)">
                <template #icon><i-delete theme="outline" /></template>
                删除
              </t-button>
            </div>
          </div>
          <div class="tags">
            <t-tag theme="primary">{{ getTypeLabel(item.type) }}</t-tag>
            <t-tag v-for="mode in (item as any).mode" :key="mode" variant="light">{{ getModeLabel(mode, item.type) }}</t-tag>
          </div>
        </t-card>

        <div class="updateAction">
          <t-button theme="danger" :loading="updating" @click="handleDeleteVendor">删除供应商</t-button>
          <t-button theme="default" :loading="updating" @click="handleEditVendorCode">编辑代码</t-button>
          <t-button theme="primary" :loading="updating" @click="handleUpdateVendor">更新配置</t-button>
        </div>
      </t-form>
    </div>

    <!-- 添加模型弹窗 -->
    <t-dialog
      placement="center"
      width="40vw"
      v-model:visible="modelDialogVisible"
      :header="editingModelIndex === null ? '添加模型' : '编辑模型'"
      :maskClosable="false"
      @confirm="handleConfirmModel">
      <div class="addBox">
        <t-form :data="modelFormData" labelAlign="top">
          <t-form-item name="name" label="显示名称">
            <t-input v-model="modelFormData.name" placeholder="例如：GPT-4o" clearable />
          </t-form-item>

          <t-form-item name="modelName" label="模型标识">
            <t-input v-model="modelFormData.modelName" placeholder="例如：gpt-4o" clearable />
          </t-form-item>

          <t-form-item name="type" label="模型类型">
            <t-select v-model="modelFormData.type">
              <t-option v-for="item in modelTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</t-option>
            </t-select>
          </t-form-item>

          <template v-if="modelFormData.type === 'text'">
            <t-form-item name="multimodal" label="多模态">
              <t-radio-group v-model="modelFormData.multimodal">
                <t-radio :value="true">支持</t-radio>
                <t-radio :value="false">不支持</t-radio>
              </t-radio-group>
            </t-form-item>
            <t-form-item name="tool" label="工具调用">
              <t-radio-group v-model="modelFormData.tool">
                <t-radio :value="true">支持</t-radio>
                <t-radio :value="false">不支持</t-radio>
              </t-radio-group>
            </t-form-item>
          </template>

          <template v-if="modelFormData.type === 'image'">
            <t-form-item name="mode" label="图像模式">
              <t-checkbox-group v-model="modelFormData.mode" :options="imageModeOptions" />
            </t-form-item>
          </template>

          <template v-if="modelFormData.type === 'video'">
            <t-form-item name="mode" label="视频模式">
              <t-checkbox-group v-model="modelFormData.mode" :options="videoModeOptions" />
            </t-form-item>
            <t-form-item name="audio" label="音频输出">
              <t-radio-group v-model="modelFormData.audio">
                <t-radio v-for="item in audioOptions" :key="String(item.value)" :value="item.value">{{ item.label }}</t-radio>
              </t-radio-group>
            </t-form-item>
            <t-form-item name="durationResolutionMap" label="时长 / 分辨率映射">
              <div class="drmEditor">
                <div class="drmHeader">
                  <div class="drmHeaderIndex"></div>
                  <div class="drmHeaderLabel">时长（秒）</div>
                  <div class="drmHeaderArrow"></div>
                  <div class="drmHeaderLabel">分辨率</div>
                  <div class="drmHeaderAction"></div>
                </div>
                <div v-for="(row, rowIndex) in modelFormData.durationResolutionMap" :key="rowIndex" class="drmRow">
                  <div class="drmRowIndex">{{ rowIndex + 1 }}</div>
                  <t-tag-input v-model="row.duration" placeholder="输入后回车" class="drmInput" />
                  <div class="drmArrow">→</div>
                  <t-tag-input v-model="row.resolution" placeholder="输入后回车" class="drmInput" />
                  <t-button
                    variant="text"
                    theme="danger"
                    size="small"
                    :disabled="modelFormData.durationResolutionMap.length === 1"
                    @click="modelFormData.durationResolutionMap.splice(rowIndex, 1)">
                    <template #icon><i-delete theme="outline" /></template>
                  </t-button>
                </div>
                <t-button
                  style="margin-top: 1rem"
                  variant="dashed"
                  block
                  @click="modelFormData.durationResolutionMap.push({ duration: [], resolution: [] })">
                  <template #icon><i-plus theme="outline" /></template>
                  添加一组时长 / 分辨率
                </t-button>
              </div>
            </t-form-item>
          </template>
        </t-form>
      </div>
    </t-dialog>

    <!-- 测试结果弹窗 -->
    <t-dialog width="50vw" placement="center" v-model:visible="testResultVisible" :header="`测试结果 - ${testModelName}`" :footer="false">
      <div class="testResult">
        <div v-if="testResultType === 'image'" class="resultContent">
          <img :src="testResultUrl" alt="生成的图片" />
        </div>
        <div v-else-if="testResultType === 'video'" class="resultContent">
          <video :src="testResultUrl" controls autoplay loop></video>
        </div>
        <div v-else class="resultContent">
          <t-loading size="large" text="正在生成中..." />
        </div>
      </div>
    </t-dialog>

    <!-- 添加供应商弹窗 -->
    <t-dialog
      width="70vw"
      placement="center"
      v-model:visible="vendorDialogVisible"
      header="添加供应商"
      :maskClosable="false"
      @confirm="handleConfirmVendor">
      <div class="editorToolbar">
        <div class="editorInfo">
          <t-icon name="info-circle" size="16px" />
          <span>请编写 TypeScript 代码配置供应商信息</span>
        </div>
        <div class="editorActions">
          <t-button variant="text" size="small" @click="vendorCode = VENDOR_CODE_TEMPLATE">
            <template #icon><t-icon name="rollback" /></template>
            重置
          </t-button>
          <t-button variant="outline" size="small" @click="fileInputRef?.click()">
            <template #icon><t-icon name="upload" /></template>
            导入文件
          </t-button>
          <input ref="fileInputRef" type="file" accept=".ts,.js,.txt,.json" style="display: none" @change="handleFileChange" />
        </div>
      </div>
      <div class="editorWrapper">
        <CodeEditor v-model:value="vendorCode" language="typescript" theme="vs-dark" :height="600" :options="editorOptions" />
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { CodeEditor } from "monaco-editor-vue3";
import { DialogPlugin } from "tdesign-vue-next";
import axios from "@/utils/axios";
import VENDOR_CODE_TEMPLATE from "@/lib/vendorTemplate.ts?raw";

// ── 类型 ──
interface TextModel {
  name: string;
  modelName: string;
  type: "text";
  multimodal: boolean;
  tool: boolean;
}

interface ImageModel {
  name: string;
  modelName: string;
  type: "image";
  mode: ("text" | "singleImage" | "multiReference")[];
}

interface VideoModel {
  name: string;
  modelName: string;
  type: "video";
  mode: (
    | "singleImage"
    | "multiImage"
    | "gridImage"
    | "startEndRequired"
    | "endFrameOptional"
    | "startFrameOptional"
    | "text"
    | "audioReference"
    | "videoReference"
  )[];
  audio: "optional" | false | true;
  durationResolutionMap: { duration: number[]; resolution: string[] }[];
}

type VendorModel = TextModel | ImageModel | VideoModel;

interface VendorInput {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  required: boolean;
  placeholder?: string;
}

interface VendorItem {
  id: number;
  name: string;
  version?: string;
  icon?: string;
  code: string;
  inputs: VendorInput[];
  inputValues: Record<string, string>;
  enabled?: boolean;
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
  model?: VendorModel[];
  models?: VendorModel[];
}

// ── 常量 ──
const TYPE_LABEL_MAP: Record<string, string> = {
  text: "文本模型",
  image: "图像模型",
  video: "视频模型",
};

const MODE_LABEL_MAP: Record<string, string> = {
  singleImage: "单图",
  multiImage: "多图模式",
  multiReference: "多图参考",
  gridImage: "网格单图",
  startEndRequired: "首尾帧（两张必填）",
  endFrameOptional: "首尾帧（尾帧可选）",
  startFrameOptional: "首尾帧（首帧可选）",
  audioReference: "音频参考",
  videoReference: "视频参考",
};

function getTypeLabel(type: string) {
  return TYPE_LABEL_MAP[type] || type;
}

function getModeLabel(mode: string, type: string) {
  if (mode === "text") return type === "image" ? "文生图" : "文生视频";
  return MODE_LABEL_MAP[mode] || mode;
}

const ICON_MAP: Record<string, string> = {
  OpenAI: "logo-github",
  Claude: "chat",
  通义千问: "cloud",
  Gemini: "logo-google",
  DeepSeek: "search",
  Zhipu: "layers",
  Moonshot: "moon",
  Doubao: "sound",
};

const editorOptions = {
  fontSize: 14,
  automaticLayout: true,
  tabSize: 2,
  scrollBeyondLastLine: false,
  formatOnPaste: true,
  formatOnType: true,
};

const modelTypeOptions = [
  { value: "text", label: "文本模型" },
  { value: "image", label: "图像模型" },
  { value: "video", label: "视频模型" },
];

const imageModeOptions = [
  { label: "文生图", value: "text" },
  { label: "单图", value: "singleImage" },
  { label: "多图参考", value: "multiReference" },
];

const videoModeOptions = [
  { label: "单图", value: "singleImage" },
  { label: "多图模式", value: "multiImage" },
  { label: "网格单图", value: "gridImage" },
  { label: "首尾帧（两张必填）", value: "startEndRequired" },
  { label: "首尾帧（尾帧可选）", value: "endFrameOptional" },
  { label: "首尾帧（首帧可选）", value: "startFrameOptional" },
  { label: "文生视频", value: "text" },
  { label: "音频参考", value: "audioReference" },
  { label: "视频参考", value: "videoReference" },
];

const audioOptions: { label: string; value: "optional" | false | true }[] = [
  { label: "可选", value: "optional" },
  { label: "仅输出有声视频", value: true },
  { label: "仅输出无声视频", value: false },
];

// ── 供应商列表 ──
const vendorList = ref<VendorItem[]>([]);

const loading = ref(false);
async function getVendorList() {
  loading.value = true;
  axios
    .post("/setting/vendorConfig/getVendorList")
    .then((res) => {
      vendorList.value = res.data;

      if (vendorList.value.length && !vendorList.value.some((v) => v.name === activeVendorName.value)) {
        activeVendorName.value = vendorList.value[0].name;
      }
    })
    .catch((err) => {
      MessagePlugin.error(`获取供应商列表失败：${err.message}`);
    })
    .finally(() => {
      loading.value = false;
    });
}

onMounted(() => {
  getVendorList();
});

const activeVendorName = ref("OpenAI");
const currentVendor = computed(() => vendorList.value.find((v) => v.name === activeVendorName.value));
const vendorModels = computed(() => currentVendor.value?.models || currentVendor.value?.model || []);
const requiredInputs = computed(() => currentVendor.value?.inputs?.filter((input) => input.required) || []);
const optionalInputs = computed(() => currentVendor.value?.inputs?.filter((input) => !input.required) || []);

// ── 供应商弹窗 ──
const vendorDialogVisible = ref(false);
const vendorCode = ref(VENDOR_CODE_TEMPLATE);
const fileInputRef = ref<HTMLInputElement | null>(null);
const updating = ref(false);

// ── 测试结果弹窗 ──
const testResultVisible = ref(false);
const testResultUrl = ref("");
const testResultType = ref<"image" | "video" | "">("");
const testModelName = ref("");

function getProviderIcon(name: string) {
  return ICON_MAP[name] || "server";
}

function getInputIcon(type: VendorInput["type"]) {
  if (type === "password") return "secured";
  if (type === "url") return "link";
  return "edit-1";
}

function getInputPlaceholder(input: VendorInput) {
  return input.placeholder?.trim() || "";
}
async function handleUpdateVendor() {
  if (!currentVendor.value) return;
  updating.value = true;
  axios
    .post("/setting/vendorConfig/updateVendor", {
      id: currentVendor.value.id,
      tsCode: currentVendor.value.code,
      name: currentVendor.value.name,
      version: currentVendor.value.version,
      icon: currentVendor.value.icon,
      inputs: currentVendor.value.inputs,
      inputValues: currentVendor.value.inputValues,
      models: currentVendor.value.models,
    })
    .then(() => {
      MessagePlugin.success("供应商配置更新成功");
      getVendorList();
    })
    .catch((err) => {
      MessagePlugin.error(`更新失败：${err.message}`);
    })
    .finally(() => {
      updating.value = false;
    });
}
const id = ref<number>();
function handleAddVendor() {
  id.value = undefined;
  vendorCode.value = VENDOR_CODE_TEMPLATE;
  vendorDialogVisible.value = true;
}
function handleConfirmVendor() {
  if (!id.value) {
    const firstConfirm = DialogPlugin.confirm({
      theme: "danger",
      header: "高风险操作确认",
      body: "服务端将直接执行当前代码以新增厂商。若代码包含恶意逻辑，可能导致秘钥泄露、服务异常或权限滥用。请仅使用可信代码，并建议先使用 AI 检查代码安全性。",
      confirmBtn: { content: "我已知晓风险", theme: "danger" },
      cancelBtn: "取消",
      onConfirm: () => {
        firstConfirm.destroy();
        const secondConfirm = DialogPlugin.confirm({
          theme: "danger",
          header: "再次确认执行",
          body: "请再次确认：系统将执行当前代码并尝试新增厂商。是否继续？",
          confirmBtn: { content: "确认执行并新增", theme: "danger" },
          cancelBtn: "返回检查",
          onConfirm: async () => {
            axios
              .post("/setting/vendorConfig/addVendor", { tsCode: vendorCode.value })
              .then((res) => {
                MessagePlugin.success("供应商添加成功");
                vendorDialogVisible.value = false;
                getVendorList();
              })
              .catch((err) => {
                MessagePlugin.error(`添加失败：${err.message}`);
              })
              .finally(() => {
                secondConfirm.destroy();
              });
          },
          onClose: () => secondConfirm.hide(),
        });
      },
      onClose: () => firstConfirm.hide(),
    });
  } else {
    const firstConfirm = DialogPlugin.confirm({
      theme: "danger",
      header: "高风险操作确认",
      body: "服务端将直接执行当前代码以更新厂商。若代码包含恶意逻辑，可能导致秘钥泄露、服务异常或权限滥用。请仅使用可信代码，并建议先使用 AI 检查代码安全性。",
      confirmBtn: { content: "我已知晓风险", theme: "danger" },
      cancelBtn: "取消",
      onConfirm: () => {
        firstConfirm.destroy();
        const secondConfirm = DialogPlugin.confirm({
          theme: "danger",
          header: "再次确认执行",
          body: "请再次确认：系统将执行当前代码并尝试更新厂商。是否继续？",
          confirmBtn: { content: "确认执行并更新", theme: "danger" },
          cancelBtn: "返回检查",
          onConfirm: async () => {
            axios
              .post("/setting/vendorConfig/updateVendor", {
                id: id.value,
                tsCode: vendorCode.value,
              })
              .then((res) => {
                MessagePlugin.success("更新成功");
                vendorDialogVisible.value = false;
                getVendorList();
              })
              .catch((err) => {
                MessagePlugin.error(`更新失败：${err.message}`);
              })
              .finally(() => {
                secondConfirm.destroy();
              });
          },
          onClose: () => secondConfirm.hide(),
        });
      },
      onClose: () => firstConfirm.hide(),
    });
  }
}

function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    vendorCode.value = (ev.target?.result as string) || "";
  };
  reader.readAsText(file);
  input.value = "";
}

// ── 模型弹窗 ──
const modelDialogVisible = ref(false);
const editingModelIndex = ref<number | null>(null);
interface DrmRow {
  duration: string[];
  resolution: string[];
}

const modelFormData = ref({
  name: "",
  modelName: "",
  type: "text" as "text" | "image" | "video",
  multimodal: false,
  tool: false,
  mode: [] as string[],
  audio: "optional" as "optional" | false | true,
  durationResolutionMap: [{ duration: [] as string[], resolution: [] as string[] }] as DrmRow[],
});

function resetModelForm(type: "text" | "image" | "video" = "text") {
  modelFormData.value = {
    name: "",
    modelName: "",
    type,
    multimodal: false,
    tool: false,
    mode: [],
    audio: "optional",
    durationResolutionMap: [{ duration: [], resolution: [] }],
  };
}

function ensureVendorModels(): VendorModel[] {
  if (!currentVendor.value) return [];
  if (!Array.isArray(currentVendor.value.models)) {
    currentVendor.value.models = Array.isArray(currentVendor.value.model) ? [...currentVendor.value.model] : [];
  }
  currentVendor.value.model = currentVendor.value.models;
  return currentVendor.value.models;
}

function parseTextList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumberList(value: string) {
  return parseTextList(value)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0);
}

function buildModelFromForm(): VendorModel | null {
  const name = modelFormData.value.name.trim();
  const modelName = modelFormData.value.modelName.trim();
  if (!name) {
    MessagePlugin.error("请填写显示名称");
    return null;
  }
  if (!modelName) {
    MessagePlugin.error("请填写模型标识");
    return null;
  }

  if (modelFormData.value.type === "text") {
    return {
      name,
      modelName,
      type: "text",
      multimodal: modelFormData.value.multimodal,
      tool: modelFormData.value.tool,
    };
  }

  if (modelFormData.value.type === "image") {
    const mode = modelFormData.value.mode as ImageModel["mode"];
    if (!mode.length) {
      MessagePlugin.error("请至少选择一个图像模式");
      return null;
    }
    return {
      name,
      modelName,
      type: "image",
      mode,
    };
  }

  const mode = modelFormData.value.mode as VideoModel["mode"];
  if (!mode.length) {
    MessagePlugin.error("请至少选择一个视频模式");
    return null;
  }

  const durationResolutionMap: VideoModel["durationResolutionMap"] = [];
  for (let i = 0; i < modelFormData.value.durationResolutionMap.length; i++) {
    const row = modelFormData.value.durationResolutionMap[i];
    const duration = row.duration.map(Number).filter((n) => Number.isFinite(n) && n > 0);
    const resolution = row.resolution.filter(Boolean);
    if (!duration.length) {
      MessagePlugin.error(`第 ${i + 1} 组：请至少添加一个有效时长`);
      return null;
    }
    if (!resolution.length) {
      MessagePlugin.error(`第 ${i + 1} 组：请至少添加一个分辨率`);
      return null;
    }
    durationResolutionMap.push({ duration, resolution });
  }

  return {
    name,
    modelName,
    type: "video",
    mode,
    audio: modelFormData.value.audio,
    durationResolutionMap,
  };
}

function handleAddModel() {
  if (!currentVendor.value) {
    MessagePlugin.error("请先选择供应商");
    return;
  }
  editingModelIndex.value = null;
  resetModelForm("text");
  modelDialogVisible.value = true;
}

function handleConfirmModel() {
  const list = ensureVendorModels();
  if (!list.length && !currentVendor.value) return;

  const model = buildModelFromForm();
  if (!model) return;

  const duplicateIndex = list.findIndex((item, index) => {
    if (editingModelIndex.value !== null && index === editingModelIndex.value) {
      return false;
    }
    return item.modelName === model.modelName;
  });
  if (duplicateIndex !== -1) {
    MessagePlugin.error("模型标识已存在，请更换后重试");
    return;
  }

  if (editingModelIndex.value === null) {
    list.push(model);
    MessagePlugin.success("模型添加成功");
  } else {
    list.splice(editingModelIndex.value, 1, model);
    MessagePlugin.success("模型更新成功");
  }

  modelDialogVisible.value = false;
}

function handleEditModel(model: VendorModel) {
  const list = ensureVendorModels();
  editingModelIndex.value = list.findIndex((item) => item.modelName === model.modelName);

  if (model.type === "text") {
    modelFormData.value = {
      name: model.name,
      modelName: model.modelName,
      type: "text",
      multimodal: model.multimodal,
      tool: model.tool,
      mode: [],
      audio: "optional",
      durationResolutionMap: [{ duration: [], resolution: [] }],
    };
  }

  if (model.type === "image") {
    modelFormData.value = {
      name: model.name,
      modelName: model.modelName,
      type: "image",
      multimodal: false,
      tool: false,
      mode: [...model.mode],
      audio: "optional",
      durationResolutionMap: [{ duration: [], resolution: [] }],
    };
  }

  if (model.type === "video") {
    const rows: DrmRow[] =
      model.durationResolutionMap?.length > 0
        ? model.durationResolutionMap.map((map) => ({
            duration: map.duration.map(String),
            resolution: [...map.resolution],
          }))
        : [{ duration: [], resolution: [] }];
    modelFormData.value = {
      name: model.name,
      modelName: model.modelName,
      type: "video",
      multimodal: false,
      tool: false,
      mode: [...model.mode],
      audio: model.audio,
      durationResolutionMap: rows,
    };
  }

  modelDialogVisible.value = true;
}

async function handleTestModel(item: (typeof vendorModels.value)[number]) {
  if (!currentVendor.value?.inputValues?.apiKey) return MessagePlugin.error("请先输入 API Key");
  if (!currentVendor.value?.inputValues?.baseUrl) return MessagePlugin.error("请先输入 API 地址");

  testModelName.value = item.modelName;
  testResultType.value = "";
  testResultUrl.value = "";
  testResultVisible.value = true;

  MessagePlugin.success(`正在测试 ${item.modelName} 模型...`);
  try {
    const { data } = await axios.post(`/setting/vendorConfig/modelTest`, {
      type: item.type,
      modelName: item.modelName,
      apiKey: currentVendor.value.inputValues.apiKey,
      id: currentVendor.value.id,
    });

    if (item.type === "text") {
      MessagePlugin.success(`测试成功！`);
      testResultVisible.value = false;
    } else if (item.type === "image" || item.type === "video") {
      testResultType.value = item.type;
      testResultUrl.value = data;
      MessagePlugin.success(`${item.type === "image" ? "图片" : "视频"}生成成功！`);
    }
  } catch (e) {
    testResultVisible.value = false;
    MessagePlugin.error(`请求失败：${(e as any).message}`);
  }
}

function handleDeleteModel(modelName: string) {
  if (!currentVendor.value) return;
  const confirmDialog = DialogPlugin.confirm({
    theme: "danger",
    header: "删除模型确认",
    body: `您确定要删除模型 \"${modelName}\" 吗？此操作不可恢复。`,
    confirmBtn: { content: "确认删除", theme: "danger" },
    cancelBtn: "取消",
    onConfirm: () => {
      const list = ensureVendorModels();
      const nextList = list.filter((item) => item.modelName !== modelName);
      currentVendor.value!.models = nextList;
      currentVendor.value!.model = nextList;
      MessagePlugin.success("模型删除成功");
      confirmDialog.destroy();
    },
  });
}
function handleEditVendorCode() {
  if (!currentVendor.value) return;
  id.value = currentVendor.value.id;
  vendorCode.value = currentVendor.value.code;
  vendorDialogVisible.value = true;
}
function handleDeleteVendor() {
  if (!currentVendor.value) return;
  const confirmDialog = DialogPlugin.confirm({
    theme: "danger",
    header: "删除供应商确认",
    body: `您确定要删除供应商 "${currentVendor.value.name}" 吗？此操作不可恢复。`,
    confirmBtn: { content: "确认删除", theme: "danger" },
    cancelBtn: "取消",
    onConfirm: () => {
      axios
        .post("/setting/vendorConfig/deleteVendor", { id: currentVendor.value?.id })
        .then(() => {
          MessagePlugin.success("供应商删除成功");
          if (activeVendorName.value === currentVendor.value?.name) {
            activeVendorName.value = "";
          }
          getVendorList();
          confirmDialog.destroy();
        })
        .catch((err) => {
          MessagePlugin.error(`删除失败：${err.message}`);
        });
    },
  });
}
</script>

<style lang="scss" scoped>
.modelServe {
  width: 100%;
  height: 100%;
  display: flex;
  .modelList {
    width: 300px;
    height: 90%;
    min-height: 0;
    .listContent {
      flex: 1;
      min-height: 0;
      overflow: auto;
      height: 100%;
    }

    .listFooter {
      padding: 0 10px 10px;
      margin-right: 6px;
    }
  }

  .modelParameter {
    flex: 1;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow-y: auto;
    .modelCard {
      width: 100%;
      margin-top: 10px;
      .topInfo {
        margin-left: 4px;
        margin-right: 4px;
      }
      .tags {
        margin-top: 1rem;
        & > * {
          margin-left: 4px;
          margin-right: 4px;
        }
      }
    }

    .modelCardName {
      font-size: 15px;
      font-weight: 900;
    }

    .updateAction {
      margin-top: 16px;
      display: flex;
      justify-content: flex-end;
      & > * {
        margin-left: 8px;
      }
    }

    .requiredLabel {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-weight: 600;
    }

    .requiredMark {
      color: #d54941;
      font-size: 16px;
      line-height: 1;
    }

    .requiredText {
      color: #d54941;
      font-size: 12px;
      font-weight: 700;
    }

    .inputHelp {
      color: #666;
    }

    .optionalSection {
      margin-bottom: 12px;
    }
  }

  :deep(.t-default-menu) {
    width: 100% !important;
  }

  .editorToolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;

    .editorInfo {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #666;
      font-size: 13px;
    }

    .editorActions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .editorWrapper {
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e5e5e5;
  }

  .testResult {
    .resultContent {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 300px;
      background: #f5f5f5;
      border-radius: 8px;
      padding: 20px;

      img,
      video {
        max-width: 100%;
        max-height: 70vh;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
    }
  }
}
.addBox {
  padding-left: 1rem;
  padding-right: 1rem;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-gutter: stable;
  max-height: 70vh;
  .drmEditor {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    border: 1px solid var(--td-component-border, #e5e5e5);
    border-radius: 6px;
    padding: 10px 12px;

    .drmHeader {
      display: flex;
      align-items: center;
      gap: 6px;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--td-component-border, #e5e5e5);
      margin-bottom: 2px;

      .drmHeaderIndex {
        width: 20px;
        flex-shrink: 0;
      }

      .drmHeaderLabel {
        flex: 1;
        font-size: 12px;
        color: var(--td-text-color-secondary, #888);
        font-weight: 600;
      }

      .drmHeaderArrow {
        width: 20px;
        flex-shrink: 0;
      }

      .drmHeaderAction {
        width: 28px;
        flex-shrink: 0;
      }
    }

    .drmRow {
      display: flex;
      align-items: flex-start;
      gap: 6px;

      .drmRowIndex {
        width: 20px;
        text-align: center;
        color: #999;
        font-size: 12px;
        flex-shrink: 0;
        padding-top: 6px;
      }

      .drmInput {
        flex: 1;
      }

      .drmArrow {
        color: #bbb;
        flex-shrink: 0;
        padding-top: 6px;
        font-size: 16px;
      }

      .t-button {
        margin-top: 2px;
        flex-shrink: 0;
      }
    }
  }
}
</style>
