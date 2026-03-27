<template>
  <div class="modelServe">
    <!-- 左侧供应商列表 -->
    <div class="modelList">
      <div class="listFooter">
        <t-button block theme="primary" @click="handleAddVendor">
          <template #icon><t-icon name="add" /></template>
          {{ $t("settings.vendor.addVendor") }}
        </t-button>
      </div>
      <div class="listContent" v-loading="loading">
        <t-menu v-model="activeVendorId" theme="light" v-if="vendorList.length > 0">
          <t-menu-item v-for="(item, index) in vendorList" :key="index" :value="item.id" @click="activeVendorId = item.id">
            <template #icon v-if="isValidBase64(item.icon)">
              <t-avatar size="24px" shape="round" :image="item.icon" />
            </template>
            {{ item.name }}
          </t-menu-item>
        </t-menu>
        <t-empty v-else :title="$t('settings.vendor.noVendor')" style="margin-top: 16px"></t-empty>
      </div>
    </div>

    <!-- 右侧配置面板 -->
    <div v-if="currentVendor" class="modelParameter">
      <div class="infoBox ac jb">
        <span class="idBox">#{{ currentVendor.id }}</span>
        <span class="author">@{{ currentVendor.author }}</span>
      </div>
      <t-form :data="currentVendor" labelAlign="top">
        <t-form-item>
          <MdPreview v-model="currentVendor.description" :theme="'light'" />
        </t-form-item>
        <t-form-item v-for="input in requiredInputs" :key="input.key" :name="input.key">
          <template #label>
            <span class="requiredLabel">
              {{ input.label }}
              <span class="requiredMark">*</span>
              <span class="requiredText">{{ $t("settings.vendor.required") }}</span>
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
            <t-collapse-panel value="optional-inputs" :header="$t('settings.vendor.optionalSection')">
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
          <h4 class="sectionTitle">{{ $t("settings.vendor.modelSettings") }}</h4>
          <t-button variant="outline" size="small" @click="handleAddModel">
            <template #icon><i-plus theme="outline" /></template>
            {{ $t("settings.vendor.addManually") }}
          </t-button>
        </div>

        <t-card v-for="(item, index) in vendorModels" :key="index" class="modelCard">
          <div class="topInfo jb ac">
            <span class="modelCardName">{{ item.name }}</span>
            <div class="actionBtns">
              <t-button size="small" variant="text" :loading="!!testingModels[item.modelName]" @click="handleTestModel(item)">
                <template #icon><i-lightning theme="outline" /></template>
                {{ $t("settings.vendor.test") }}
              </t-button>
              <t-button variant="text" size="small" @click="handleEditModel(item)">
                <template #icon><i-pencil theme="outline" /></template>
                {{ $t("settings.vendor.edit") }}
              </t-button>
              <t-button variant="text" size="small" theme="danger" @click="handleDeleteModel(item.modelName)">
                <template #icon><i-delete theme="outline" /></template>
                {{ $t("settings.vendor.delete") }}
              </t-button>
            </div>
          </div>
          <div class="tags">
            <t-tag theme="primary">{{ $t(getTypeLabel(item.type)) }}</t-tag>
            <template v-for="(mode, mIdx) in (item as any).mode" :key="mIdx">
              <t-tag v-if="!Array.isArray(mode)" variant="light">{{ $t(getModeLabel(mode, item.type)) }}</t-tag>
              <t-tag v-else variant="light" v-for="(m, mmIdx) in mode" :key="mmIdx">
                {{ $t(getModeLabel(m, item.type)) }}
              </t-tag>
            </template>
          </div>
        </t-card>

        <div class="updateAction">
          <t-button theme="danger" :loading="updating" @click="handleDeleteVendor">{{ $t("settings.vendor.deleteVendor") }}</t-button>
          <t-button theme="default" :loading="updating" @click="handleEditVendorCode">{{ $t("settings.vendor.editCode") }}</t-button>
          <!-- <t-button theme="primary" :loading="updating" @click="handleUpdateVendor">{{ $t("settings.vendor.updateConfig") }}</t-button> -->
        </div>
      </t-form>
    </div>

    <!-- 添加模型弹窗 -->
    <t-dialog
      placement="center"
      width="40vw"
      v-model:visible="modelDialogVisible"
      :header="editingModelIndex === null ? $t('settings.vendor.addModel') : $t('settings.vendor.editModel')"
      :maskClosable="false"
      @confirm="handleConfirmModel">
      <div class="addBox">
        <t-form :data="modelFormData" labelAlign="top">
          <t-form-item name="name" :label="$t('settings.vendor.displayName')">
            <t-input v-model="modelFormData.name" :placeholder="$t('settings.vendor.displayNamePlaceholder')" clearable />
          </t-form-item>

          <t-form-item name="modelName" :label="$t('settings.vendor.modelId')">
            <t-input v-model="modelFormData.modelName" :placeholder="$t('settings.vendor.modelIdPlaceholder')" clearable />
          </t-form-item>

          <t-form-item name="type" :label="$t('settings.vendor.modelType')">
            <t-select v-model="modelFormData.type">
              <t-option v-for="item in modelTypeOptions" :key="item.value" :value="item.value">{{ $t(item.label) }}</t-option>
            </t-select>
          </t-form-item>

          <template v-if="modelFormData.type === 'text'">
            <t-form-item name="multimodal" :label="$t('settings.vendor.multimodal')">
              <t-radio-group v-model="modelFormData.multimodal">
                <t-radio :value="true">{{ $t("settings.vendor.supported") }}</t-radio>
                <t-radio :value="false">{{ $t("settings.vendor.notSupported") }}</t-radio>
              </t-radio-group>
            </t-form-item>
            <t-form-item name="tool" :label="$t('settings.vendor.toolCall')">
              <t-radio-group v-model="modelFormData.tool">
                <t-radio :value="true">{{ $t("settings.vendor.supported") }}</t-radio>
                <t-radio :value="false">{{ $t("settings.vendor.notSupported") }}</t-radio>
              </t-radio-group>
            </t-form-item>
          </template>

          <template v-if="modelFormData.type === 'image'">
            <t-form-item name="mode" :label="$t('settings.vendor.imageMode')">
              <t-checkbox-group v-model="modelFormData.mode">
                <t-checkbox v-for="opt in imageModeOptions" :key="opt.value" :value="opt.value">{{ $t(opt.label) }}</t-checkbox>
              </t-checkbox-group>
            </t-form-item>
          </template>

          <template v-if="modelFormData.type === 'video'">
            <t-form-item name="mode" :label="$t('settings.vendor.videoMode')">
              <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 0">
                <t-checkbox-group v-model="modelFormData.mode">
                  <t-checkbox v-for="opt in videoModeOptions" :key="opt.value" :value="opt.value">{{ $t(opt.label) }}</t-checkbox>
                </t-checkbox-group>
                <div style="border: 1px solid #ddd; border-radius: 6px; padding: 6px 12px; margin-top: 6px">
                  <t-checkbox-group v-model="modelFormData.mixedMode" style="display: flex; flex-direction: row; gap: 8px">
                    <t-checkbox v-for="opt in otherOptions" :key="opt.value" :value="opt.value">{{ $t(opt.label) }}</t-checkbox>
                  </t-checkbox-group>
                </div>
              </div>
            </t-form-item>
            <t-form-item name="audio" :label="$t('settings.vendor.audioOutput')">
              <t-radio-group v-model="modelFormData.audio">
                <t-radio v-for="item in audioOptions" :key="String(item.value)" :value="item.value">{{ $t(item.label) }}</t-radio>
              </t-radio-group>
            </t-form-item>
            <t-form-item name="durationResolutionMap" :label="$t('settings.vendor.durationResolution')">
              <div class="drmEditor">
                <div class="drmHeader">
                  <div class="drmHeaderIndex"></div>
                  <div class="drmHeaderLabel">{{ $t("settings.vendor.durationSec") }}</div>
                  <div class="drmHeaderArrow"></div>
                  <div class="drmHeaderLabel">{{ $t("settings.vendor.resolution") }}</div>
                  <div class="drmHeaderAction"></div>
                </div>
                <div v-for="(row, rowIndex) in modelFormData.durationResolutionMap" :key="rowIndex" class="drmRow">
                  <div class="drmRowIndex">{{ rowIndex + 1 }}</div>
                  <t-tag-input v-model="row.duration" :placeholder="$t('settings.vendor.enterAndPress')" class="drmInput" />
                  <div class="drmArrow">→</div>
                  <t-tag-input v-model="row.resolution" :placeholder="$t('settings.vendor.enterAndPress')" class="drmInput" />
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
                  style="margin-top: 16px"
                  variant="dashed"
                  block
                  @click="modelFormData.durationResolutionMap.push({ duration: [], resolution: [] })">
                  <template #icon><i-plus theme="outline" /></template>
                  {{ $t("settings.vendor.addDurationResolution") }}
                </t-button>
              </div>
            </t-form-item>
          </template>
        </t-form>
      </div>
    </t-dialog>

    <!-- 测试结果弹窗 -->
    <t-dialog
      width="50vw"
      placement="center"
      v-model:visible="testResultVisible"
      :header="$t('settings.vendor.testResult') + ' - ' + testModelName"
      :footer="false">
      <div class="testResult">
        <div v-if="testResultType === 'image'" class="resultContent">
          <img :src="testResultUrl" alt="generated image" />
        </div>
        <div v-else-if="testResultType === 'video'" class="resultContent">
          <video :src="testResultUrl" controls autoplay loop></video>
        </div>
        <div v-else class="resultContent">
          <t-loading size="large" :text="$t('settings.vendor.generating')" />
        </div>
      </div>
    </t-dialog>

    <!-- 添加供应商弹窗 -->
    <t-dialog
      width="70vw"
      placement="center"
      v-model:visible="vendorDialogVisible"
      :header="$t('settings.vendor.addVendorDialog')"
      :maskClosable="false"
      @confirm="handleConfirmVendor">
      <div class="editorToolbar">
        <div class="editorInfo">
          <t-icon name="info-circle" size="16px" />
          <span>{{ $t("settings.vendor.codeEditorInfo") }}</span>
        </div>
        <div class="editorActions">
          <t-button variant="text" size="small" @click="vendorCode = VENDOR_CODE_TEMPLATE">
            <template #icon><t-icon name="rollback" /></template>
            {{ $t("settings.vendor.reset") }}
          </t-button>
          <t-button variant="outline" size="small" @click="fileInputRef?.click()">
            <template #icon><t-icon name="upload" /></template>
            {{ $t("settings.vendor.importFile") }}
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
import { MdPreview } from "md-editor-v3";
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
  mode: ("singleImage" | "multiImage" | "gridImage" | "startEndRequired" | "endFrameOptional" | "startFrameOptional" | "text")[];
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
  id: string; //供应商唯一标识，必须全局唯一
  author: string;
  description?: string; //md5格式
  name: string;
  icon?: string; //仅支持base64格式
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
  text: "settings.vendor.textModel",
  image: "settings.vendor.imageModel",
  video: "settings.vendor.videoModel",
};

const MODE_LABEL_MAP: Record<string, string> = {
  singleImage: "settings.vendor.singleImage",
  multiImage: "settings.vendor.multiImage",
  multiReference: "settings.vendor.multiReference",
  gridImage: "settings.vendor.gridImage",
  startEndRequired: "settings.vendor.startEndRequired",
  endFrameOptional: "settings.vendor.endFrameOptional",
  startFrameOptional: "settings.vendor.startFrameOptional",
  audioReference: "settings.vendor.audioRef",
  videoReference: "settings.vendor.videoRef",
  textReference: "settings.vendor.textRef",
  imageReference: "settings.vendor.imageRef",
};

function getTypeLabel(type: string) {
  return TYPE_LABEL_MAP[type] || type;
}

function getModeLabel(mode: string, type: string) {
  if (mode === "text") return type === "image" ? "settings.vendor.textToImage" : "settings.vendor.textToVideo";
  return MODE_LABEL_MAP[mode] || mode;
}

const editorOptions = {
  fontSize: 14,
  automaticLayout: true,
  tabSize: 2,
  scrollBeyondLastLine: false,
  formatOnPaste: true,
  formatOnType: true,
};

const modelTypeOptions = [
  { value: "text", label: "settings.vendor.textModel" },
  { value: "image", label: "settings.vendor.imageModel" },
  { value: "video", label: "settings.vendor.videoModel" },
];

const imageModeOptions = [
  { label: "settings.vendor.textToImage", value: "text" },
  { label: "settings.vendor.singleImage", value: "singleImage" },
  { label: "settings.vendor.multiReference", value: "multiReference" },
];

const videoModeOptions = [
  { label: "settings.vendor.singleImage", value: "singleImage" },
  { label: "settings.vendor.multiImage", value: "multiImage" },
  { label: "settings.vendor.gridImage", value: "gridImage" },
  { label: "settings.vendor.startEndRequired", value: "startEndRequired" },
  { label: "settings.vendor.endFrameOptional", value: "endFrameOptional" },
  { label: "settings.vendor.startFrameOptional", value: "startFrameOptional" },
  { label: "settings.vendor.textToVideo", value: "text" },
];
const otherOptions = [
  { label: "settings.vendor.textRef", value: "textReference" },
  { label: "settings.vendor.imageRef", value: "videoReference" },
  { label: "settings.vendor.videoRef", value: "imageReference" },
  { label: "settings.vendor.audioRef", value: "audioReference" },
];

const audioOptions: { label: string; value: "optional" | false | true }[] = [
  { label: "settings.vendor.audioOptional", value: "optional" },
  { label: "settings.vendor.audioOnly", value: true },
  { label: "settings.vendor.noAudio", value: false },
];

// ── 供应商列表 ──
const vendorList = ref<VendorItem[]>([]);

const loading = ref(false);
async function getVendorList() {
  loading.value = true;
  try {
    const res = await axios.post("/setting/vendorConfig/getVendorList");
    vendorList.value = res.data;

    if (vendorList.value.length && !vendorList.value.some((v) => v.id === activeVendorId.value)) {
      activeVendorId.value = vendorList.value[0].id;
    }
  } catch (err: any) {
    window.$message.error(`${$t("settings.vendor.msg.getVendorListFailed")}${err.message}`);
  } finally {
    loading.value = false;
    nextTick(() => {
      lastSavedSnapshot.value = currentVendorSnapshot.value;
      autoSaveReady.value = true;
    });
  }
}

onMounted(() => {
  getVendorList();
});

const activeVendorId = ref<string>();
const currentVendor = computed(() => vendorList.value.find((v) => v.id === activeVendorId.value));
const vendorModels = computed(() => currentVendor.value?.models || currentVendor.value?.model || []);
const requiredInputs = computed(() => currentVendor.value?.inputs?.filter((input) => input.required) || []);
const optionalInputs = computed(() => currentVendor.value?.inputs?.filter((input) => !input.required) || []);

// ── 供应商弹窗 ──
const vendorDialogVisible = ref(false);
const vendorCode = ref(VENDOR_CODE_TEMPLATE);
const fileInputRef = ref<HTMLInputElement | null>(null);
const updating = ref(false);
const autoUpdating = ref(false);
const autoSaveReady = ref(false);
const lastSavedSnapshot = ref("");
const AUTO_SAVE_DELAY = 700;
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingAutoSave = false;

// ── 测试结果弹窗 ──
const testResultVisible = ref(false);
const testResultUrl = ref("");
const testResultType = ref<"image" | "video" | "">("");
const testModelName = ref("");
const testingModels = reactive<Record<string, boolean>>({});

function getInputIcon(type: VendorInput["type"]) {
  if (type === "password") return "secured";
  if (type === "url") return "link";
  return "edit-1";
}

function getInputPlaceholder(input: VendorInput) {
  return input.placeholder?.trim() || "";
}

/**
 * 检查字符串是否是有效的 base64 格式
 */
function isValidBase64(str?: string): boolean {
  if (!str) return false;
  // 检查是否是 base64 数据 URI 或纯 base64 字符串
  const base64Regex = /^(?:data:[^;]+;base64,)?[A-Za-z0-9+/]*={0,2}$/;
  return base64Regex.test(str) && str.length > 0;
}

function buildVendorUpdatePayload(vendor: VendorItem) {
  return {
    id: vendor.id,
    tsCode: vendor.code,
    name: vendor.name,
    icon: vendor.icon,
    inputs: vendor.inputs,
    inputValues: vendor.inputValues,
    models: vendor.models ?? vendor.model ?? [],
  };
}

const currentVendorSnapshot = computed(() => {
  if (!currentVendor.value) return "";
  return JSON.stringify(buildVendorUpdatePayload(currentVendor.value));
});

function scheduleAutoSave() {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  autoSaveTimer = setTimeout(() => {
    void handleAutoUpdateVendor();
  }, AUTO_SAVE_DELAY);
}

async function handleAutoUpdateVendor() {
  if (!currentVendor.value || !autoSaveReady.value || loading.value) return;

  const snapshot = currentVendorSnapshot.value;
  if (!snapshot || snapshot === lastSavedSnapshot.value) return;

  if (autoUpdating.value) {
    pendingAutoSave = true;
    return;
  }

  autoUpdating.value = true;
  try {
    await axios.post("/setting/vendorConfig/updateVendor", buildVendorUpdatePayload(currentVendor.value));
    lastSavedSnapshot.value = snapshot;
  } catch (err: any) {
    window.$message.error(`${$t("settings.vendor.msg.updateFailed")}${err.message}`);
  } finally {
    autoUpdating.value = false;
    if (pendingAutoSave) {
      pendingAutoSave = false;
      scheduleAutoSave();
    }
  }
}

watch(
  currentVendorSnapshot,
  (snapshot) => {
    if (!snapshot || !autoSaveReady.value || loading.value) return;
    if (snapshot === lastSavedSnapshot.value) return;
    scheduleAutoSave();
  },
  { flush: "post" },
);

watch(
  activeVendorId,
  () => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    pendingAutoSave = false;
    nextTick(() => {
      lastSavedSnapshot.value = currentVendorSnapshot.value;
    });
  },
  { flush: "post" },
);

async function handleUpdateVendor() {
  if (!currentVendor.value) return;
  updating.value = true;
  try {
    await axios.post("/setting/vendorConfig/updateVendor", buildVendorUpdatePayload(currentVendor.value));
    lastSavedSnapshot.value = currentVendorSnapshot.value;
    window.$message.success($t("settings.vendor.msg.vendorConfigUpdated"));
    getVendorList();
  } catch (err: any) {
    window.$message.error(`${$t("settings.vendor.msg.updateFailed")}${err.message}`);
  } finally {
    updating.value = false;
  }
}
const id = ref<string>();
function handleAddVendor() {
  id.value = undefined;
  vendorCode.value = VENDOR_CODE_TEMPLATE;
  vendorDialogVisible.value = true;
}
function handleConfirmVendor() {
  console.log("%c Line:573 🍤 id.value", "background:#f5ce50", id.value);
  if (!id.value) {
    const firstConfirm = DialogPlugin.confirm({
      theme: "danger",
      header: $t("settings.vendor.msg.highRiskConfirm"),
      body: $t("settings.vendor.msg.addVendorRiskBody"),
      confirmBtn: { content: $t("settings.vendor.msg.iKnowRisk"), theme: "danger" },
      cancelBtn: $t("settings.vendor.msg.cancel"),
      onConfirm: () => {
        firstConfirm.destroy();
        const secondConfirm = DialogPlugin.confirm({
          theme: "danger",
          header: $t("settings.vendor.msg.confirmAgain"),
          body: $t("settings.vendor.msg.addVendorConfirmBody"),
          confirmBtn: { content: $t("settings.vendor.msg.confirmAndAdd"), theme: "danger" },
          cancelBtn: $t("settings.vendor.msg.goBackCheck"),
          onConfirm: async () => {
            axios
              .post("/setting/vendorConfig/addVendor", { tsCode: vendorCode.value })
              .then((res) => {
                window.$message.success($t("settings.vendor.msg.vendorAdded"));
                vendorDialogVisible.value = false;
                getVendorList();
              })
              .catch((err) => {
                window.$message.error(`${$t("settings.vendor.msg.addFailed")}${err.message}`);
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
      header: $t("settings.vendor.msg.highRiskConfirm"),
      body: $t("settings.vendor.msg.updateVendorRiskBody"),
      confirmBtn: { content: $t("settings.vendor.msg.iKnowRisk"), theme: "danger" },
      cancelBtn: $t("settings.vendor.msg.cancel"),
      onConfirm: () => {
        firstConfirm.destroy();
        const secondConfirm = DialogPlugin.confirm({
          theme: "danger",
          header: $t("settings.vendor.msg.confirmAgain"),
          body: $t("settings.vendor.msg.updateVendorConfirmBody"),
          confirmBtn: { content: $t("settings.vendor.msg.confirmAndUpdate"), theme: "danger" },
          cancelBtn: $t("settings.vendor.msg.goBackCheck"),
          onConfirm: async () => {
            axios
              .post("/setting/vendorConfig/updateCode", {
                id: id.value,
                tsCode: vendorCode.value,
              })
              .then((res) => {
                window.$message.success($t("settings.vendor.msg.updateSuccess"));
                vendorDialogVisible.value = false;
                getVendorList();
              })
              .catch((err) => {
                window.$message.error(`${$t("settings.vendor.msg.updateFailed")}${err.message}`);
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
  mixedMode: [] as string[], // otherOptions 选中项，单独存放，构建时作为数组元素加入 mode
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
    mixedMode: [],
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
    window.$message.error($t("settings.vendor.msg.fillDisplayName"));
    return null;
  }
  if (!modelName) {
    window.$message.error($t("settings.vendor.msg.fillModelId"));
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
      window.$message.error($t("settings.vendor.msg.selectImageMode"));
      return null;
    }
    return {
      name,
      modelName,
      type: "image",
      mode,
    };
  }

  // 把 mixedMode（otherOptions 选中项）作为一个数组元素追加到 mode
  const mode = [...modelFormData.value.mode] as VideoModel["mode"];
  if (modelFormData.value.mixedMode.length > 0) {
    (mode as any[]).push([...modelFormData.value.mixedMode]);
  }
  if (!mode.length) {
    window.$message.error($t("settings.vendor.msg.selectVideoMode"));
    return null;
  }

  const durationResolutionMap: VideoModel["durationResolutionMap"] = [];
  for (let i = 0; i < modelFormData.value.durationResolutionMap.length; i++) {
    const row = modelFormData.value.durationResolutionMap[i];
    const duration = row.duration.map(Number).filter((n) => Number.isFinite(n) && n > 0);
    const resolution = row.resolution.filter(Boolean);
    if (!duration.length) {
      window.$message.error(`${$t("settings.vendor.msg.groupPrefix", { n: i + 1 })}${$t("settings.vendor.msg.addDuration")}`);
      return null;
    }
    if (!resolution.length) {
      window.$message.error(`${$t("settings.vendor.msg.groupPrefix", { n: i + 1 })}${$t("settings.vendor.msg.addResolution")}`);
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
    window.$message.error($t("settings.vendor.msg.selectVendorFirst"));
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
    window.$message.error($t("settings.vendor.msg.modelIdExists"));
    return;
  }

  if (editingModelIndex.value === null) {
    list.push(model);
    window.$message.success($t("settings.vendor.msg.modelAdded"));
  } else {
    list.splice(editingModelIndex.value, 1, model);
    window.$message.success($t("settings.vendor.msg.modelUpdated"));
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
      mixedMode: [],
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
      mixedMode: [],
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
    // 反解：把 mode 中数组类型的元素提取为 mixedMode，其余为普通 mode
    const flatMode: string[] = [];
    let mixedMode: string[] = [];
    for (const m of model.mode) {
      if (Array.isArray(m)) {
        mixedMode = [...m];
      } else {
        flatMode.push(m);
      }
    }
    modelFormData.value = {
      name: model.name,
      modelName: model.modelName,
      type: "video",
      multimodal: false,
      tool: false,
      mode: flatMode,
      mixedMode,
      audio: model.audio,
      durationResolutionMap: rows,
    };
  }

  modelDialogVisible.value = true;
}

async function handleTestModel(item: (typeof vendorModels.value)[number]) {
  if (!currentVendor.value?.inputValues?.apiKey) return window.$message.error($t("settings.vendor.msg.enterApiKey"));
  if (!currentVendor.value?.inputValues?.baseUrl) return window.$message.error($t("settings.vendor.msg.enterApiUrl"));
  if (testingModels[item.modelName]) return;

  testingModels[item.modelName] = true;

  try {
    const { data } = await axios.post(`/setting/vendorConfig/modelTest`, {
      type: item.type,
      modelName: item.modelName,
      id: currentVendor.value.id,
    });

    if (item.type === "text") {
      window.$message.success(
        `${item.modelName} ${$t("settings.vendor.msg.testSuccess")}: ${typeof data === "string" ? data : JSON.stringify(data)}`,
      );
    } else if (item.type === "image" || item.type === "video") {
      testModelName.value = item.modelName;
      testResultType.value = item.type;
      testResultUrl.value = data;
      testResultVisible.value = true;
      window.$message.success(`${item.type === "image" ? $t("settings.vendor.msg.imageGenSuccess") : $t("settings.vendor.msg.videoGenSuccess")}`);
    }
  } catch (e: any) {
    const errMsg = e?.response?.data?.message || e?.response?.data || e?.message || String(e);
    window.$message.error(`${$t("settings.vendor.msg.requestFailed")}${typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg)}`);
  } finally {
    delete testingModels[item.modelName];
  }
}

function handleDeleteModel(modelName: string) {
  if (!currentVendor.value) return;
  const confirmDialog = DialogPlugin.confirm({
    theme: "danger",
    header: $t("settings.vendor.msg.deleteModelConfirm"),
    body: `${$t("settings.vendor.msg.deleteModelBody", { name: modelName })}`,
    confirmBtn: { content: $t("settings.vendor.msg.confirmDelete"), theme: "danger" },
    cancelBtn: $t("settings.vendor.msg.cancel"),
    onConfirm: () => {
      const list = ensureVendorModels();
      const nextList = list.filter((item) => item.modelName !== modelName);
      currentVendor.value!.models = nextList;
      currentVendor.value!.model = nextList;
      window.$message.success($t("settings.vendor.msg.modelDeleted"));
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
    header: $t("settings.vendor.msg.deleteVendorConfirm"),
    body: `${$t("settings.vendor.msg.deleteVendorBody", { name: currentVendor.value.name })}`,
    confirmBtn: { content: $t("settings.vendor.msg.confirmDelete"), theme: "danger" },
    cancelBtn: $t("settings.vendor.msg.cancel"),
    onConfirm: () => {
      axios
        .post("/setting/vendorConfig/deleteVendor", { id: currentVendor.value?.id })
        .then(() => {
          window.$message.success($t("settings.vendor.msg.vendorDeleted"));
          if (activeVendorId.value === currentVendor.value?.id) {
            activeVendorId.value = undefined;
          }
          getVendorList();
          confirmDialog.destroy();
        })
        .catch((err) => {
          window.$message.error(`${$t("settings.vendor.msg.deleteFailed")}${err.message}`);
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
    .infoBox {
      font-size: 12px;
      opacity: 0.6;
    }
    .modelCard {
      width: 100%;
      margin-top: 10px;
      .topInfo {
        margin-left: 4px;
        margin-right: 4px;
      }
      .tags {
        margin-top: 16px;
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
  padding-left: 16px;
  padding-right: 16px;
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
