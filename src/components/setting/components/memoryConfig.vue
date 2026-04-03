<template>
  <div class="memoryConfig">
    <t-alert theme="warning" class="topAlert" :message="$t('settings.memory.warning')" />

    <t-form :data="formData" labelAlign="top" labelWidth="180px" class="memoryForm" @submit="handleSave">
      <t-card :title="$t('settings.memory.vectorModelConfig')" :bordered="true" style="margin-top: 16px">
        <t-form-item :label="$t('settings.memory.modelFilePath')" name="modelOnnxFile">
          <t-tag-input v-model="formData.modelOnnxFile" clearable />
          <template #help>向量模型文件路径：/data/models/{{ formData.modelOnnxFile ? formData.modelOnnxFile.join("/") : "" }}</template>
        </t-form-item>
        <t-form-item :label="$t('settings.memory.quantizationType')" name="modelDtype">
          <t-select v-model="formData.modelDtype" :placeholder="$t('settings.memory.quantizationPlaceholder')">
            <t-option v-for="item in dtypeOptions" :key="item" :value="item" :label="item" />
          </t-select>
          <template #help></template>
        </t-form-item>
      </t-card>
      <t-card :title="$t('settings.memory.memoryParams')" :bordered="true" style="margin-top: 16px">
        <t-form-item :label="$t('settings.memory.messagesPerSummary')" name="messagesPerSummary">
          <t-input-number v-model="formData.messagesPerSummary" :min="1" :max="200" :allowInputOverLimit="false" />
          <template #help>{{ $t("settings.memory.messagesPerSummaryHelp") }}</template>
        </t-form-item>
        <t-form-item :label="$t('settings.memory.shortTermLimit')" name="shortTermLimit">
          <t-input-number v-model="formData.shortTermLimit" :min="1" :max="100" :allowInputOverLimit="false" />
          <template #help>{{ $t("settings.memory.shortTermLimitHelp") }}</template>
        </t-form-item>
        <t-form-item :label="$t('settings.memory.summaryMaxLength')" name="summaryMaxLength">
          <t-input-number v-model="formData.summaryMaxLength" :min="0" :max="1000" :step="1" :allowInputOverLimit="false" />
          <template #help>{{ $t("settings.memory.summaryMaxLengthHelp") }}</template>
        </t-form-item>
        <t-form-item :label="$t('settings.memory.summaryLimit')" name="summaryLimit">
          <t-input-number v-model="formData.summaryLimit" :min="0" :max="100" :step="1" :allowInputOverLimit="false" />
          <template #help>{{ $t("settings.memory.summaryLimitHelp") }}</template>
        </t-form-item>
        <t-form-item :label="$t('settings.memory.ragLimit')" name="ragLimit">
          <t-input-number v-model="formData.ragLimit" :min="0" :max="50" :step="1" :allowInputOverLimit="false" />
          <template #help>{{ $t("settings.memory.ragLimitHelp") }}</template>
        </t-form-item>
        <t-form-item :label="$t('settings.memory.deepRetrieveSummaryLimit')" name="deepRetrieveSummaryLimit">
          <t-input-number v-model="formData.deepRetrieveSummaryLimit" :min="0" :max="100" :step="1" :allowInputOverLimit="false" />
          <template #help>{{ $t("settings.memory.deepRetrieveSummaryLimitHelp") }}</template>
        </t-form-item>
      </t-card>

      <div class="actionRow f frr">
        <t-button theme="primary" type="submit" :loading="saving">{{ $t("settings.memory.saveConfig") }}</t-button>
        <t-button theme="danger" variant="outline" :loading="clearing" @click="handleClearMemory">{{ $t("settings.memory.clearMemory") }}</t-button>
        <t-button theme="warning" variant="outline" :loading="saving" @click="handleRestory">{{ $t("settings.memory.restoreDefault") }}</t-button>
      </div>
    </t-form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { DialogPlugin } from "tdesign-vue-next";
import axios from "@/utils/axios";

interface MemoryConfigForm {
  messagesPerSummary: number;
  shortTermLimit: number;
  summaryMaxLength: number;
  summaryLimit: number;
  ragLimit: number;
  deepRetrieveSummaryLimit: number;
  modelOnnxFile: string[];
  modelDtype: string;
}

const formData = ref<MemoryConfigForm>({
  messagesPerSummary: 3,
  shortTermLimit: 5,
  summaryMaxLength: 500,
  summaryLimit: 10,
  ragLimit: 3,
  deepRetrieveSummaryLimit: 5,
  modelOnnxFile: ["all-MiniLM-L6-v2", "onnx", "model_fp16.onnx"], // 模型文件路径
  modelDtype: "fp16",
});

const dtypeOptions = ["fp16", "auto", "fp32", "q8", "int8", "uint8", "q4", "bnb4", "q4f16"];

const loading = ref(false);
const saving = ref(false);
const clearing = ref(false);

async function getMemoryConfig() {
  loading.value = true;
  try {
    const { data } = await axios.get("/setting/memoryConfig/getMemory");
    formData.value = {
      messagesPerSummary: data.messagesPerSummary ?? 3,
      shortTermLimit: data.shortTermLimit ?? 5,
      summaryMaxLength: data.summaryMaxLength ?? 500,
      summaryLimit: data.summaryLimit ?? 10,
      ragLimit: data.ragLimit ?? 3,
      deepRetrieveSummaryLimit: data.deepRetrieveSummaryLimit ?? 5,
      modelOnnxFile: data.modelOnnxFile ?? ["all-MiniLM-L6-v2", "onnx", "model_fp16.onnx"], // 模型文件路径
      modelDtype: data.modelDtype ?? "fp16",
    };
  } catch (error: any) {
    window.$message.warning(error?.message);
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  saving.value = true;
  try {
    await axios.post("/setting/memoryConfig/sureMemory", {
      ...formData.value,
    });

    window.$message.success($t("settings.memory.msg.saved"));
  } catch (error: any) {
    window.$message.warning(error?.message);
  } finally {
    saving.value = false;
  }
}

async function handleClearMemory() {
  const dialog = DialogPlugin.confirm({
    header: $t("settings.memory.msg.clearConfirmTitle"),
    body: $t("settings.memory.msg.clearConfirmBody"),
    confirmBtn: $t("settings.memory.msg.confirmClear"),
    cancelBtn: $t("settings.memory.msg.cancel"),
    onConfirm: async () => {
      clearing.value = true;
      try {
        await axios.post("/setting/memoryConfig/delAllMemory");
        window.$message.success($t("settings.memory.msg.cleared"));
        dialog.hide();
      } catch (error: any) {
        window.$message.error(error?.msg || $t("settings.memory.msg.clearFailed"));
      } finally {
        clearing.value = false;
      }
    },
  });
}

function handleRestory() {
  formData.value = {
    messagesPerSummary: 3,
    shortTermLimit: 5,
    summaryMaxLength: 500,
    summaryLimit: 10,
    ragLimit: 3,
    deepRetrieveSummaryLimit: 5,
    modelOnnxFile: ["all-MiniLM-L6-v2", "onnx", "model_fp16.onnx"], // 模型文件路径
    modelDtype: "fp16",
  };
  handleSave();
}

onMounted(() => {
  getMemoryConfig();
});
</script>

<style lang="scss" scoped>
.memoryConfig {
  .topAlert {
    margin-bottom: 16px;
  }

  .memoryForm {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .formCard {
    :deep(.t-card__header) {
      padding-bottom: 8px;
    }
  }

  .actionRow {
    & > * {
      margin-left: 16px;
    }
  }
}
</style>
