<template>
  <div class="memoryConfig">
    <t-alert theme="warning" class="topAlert" message="以下配置项已预设为推荐值。除非您清楚了解各项配置的含义及影响，否则建议维持现有设置" />

    <t-form :data="formData" labelAlign="top" labelWidth="180px" class="memoryForm" @submit="handleSave">
      <t-card title="向量模型配置" :bordered="true" style="margin-top: 16px">
        <t-form-item label="模型文件路径" name="modelOnnxFile">
          <t-tag-input v-model="formData.modelOnnxFile" clearable />
          <template #help>向量模型文件路径：/data/models/{{ formData.modelOnnxFile ? formData.modelOnnxFile.join("/") : "" }}</template>
        </t-form-item>
        <t-form-item label="量化类型" name="modelDtype">
          <t-input v-model="formData.modelDtype" placeholder="请输入量化类型" />
          <template #help></template>
        </t-form-item>
      </t-card>
      <t-card title="记忆参数" :bordered="true" style="margin-top: 16px">
        <t-form-item label="触发消息压缩条数" name="messagesPerSummary">
          <t-input-number v-model="formData.messagesPerSummary" :min="1" :max="200" :allowInputOverLimit="false" />
          <template #help>保留最近 N 条对话上下文。</template>
        </t-form-item>
        <t-form-item label="单次获取未压缩消息条数" name="shortTermLimit">
          <t-input-number v-model="formData.shortTermLimit" :min="1" :max="100" :allowInputOverLimit="false" />
          <template #help>检索时返回的候选记忆条数。</template>
        </t-form-item>
        <t-form-item label="压缩最大字符" name="summaryMaxLength">
          <t-input-number v-model="formData.summaryMaxLength" :min="0" :max="1000" :step="1" :allowInputOverLimit="false" />
          <template #help>消息压缩时允许的最大字符</template>
        </t-form-item>
        <t-form-item label="允许查询已压缩消息条数" name="summaryLimit">
          <t-input-number v-model="formData.summaryLimit" :min="0" :max="100" :step="1" :allowInputOverLimit="false" />
          <template #help>允许查询已压缩消息条数</template>
        </t-form-item>
        <t-form-item label="搜索记忆条数" name="ragLimit">
          <t-input-number v-model="formData.ragLimit" :min="0" :max="50" :step="1" :allowInputOverLimit="false" />
          <template #help>检索时获取的消息数。</template>
        </t-form-item>
        <t-form-item label="向量召回压缩消息数" name="deepRetrieveSummaryLimit">
          <t-input-number v-model="formData.deepRetrieveSummaryLimit" :min="0" :max="100" :step="1" :allowInputOverLimit="false" />
          <template #help>检索压缩消息内容时获取的消息数。</template>
        </t-form-item>
      </t-card>

      <div class="actionRow f frr">
        <t-button theme="primary" type="submit" :loading="saving">保存配置</t-button>
        <t-button theme="danger" variant="outline" :loading="clearing" @click="handleClearMemory">清空记忆</t-button>
        <t-button theme="warning" variant="outline" :loading="saving" @click="handleRestory">恢复默认配置</t-button>
      </div>
    </t-form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { DialogPlugin, MessagePlugin } from "tdesign-vue-next";
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
    MessagePlugin.warning(error?.message);
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

    MessagePlugin.success("记忆配置已保存");
  } catch (error: any) {
    MessagePlugin.warning(error?.message);
  } finally {
    saving.value = false;
  }
}

async function handleClearMemory() {
  const dialog = DialogPlugin.confirm({
    header: "确认清空记忆",
    body: "该操作会清空 AI 全局记忆数据，且不可恢复，是否继续？",
    confirmBtn: "确认清空",
    cancelBtn: "取消",
    onConfirm: async () => {
      clearing.value = true;
      try {
        MessagePlugin.success("记忆已清空");
        dialog.hide();
      } catch (error: any) {
        MessagePlugin.error(error?.msg || "清空记忆失败");
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
      margin-left: 1rem;
    }
  }
}
</style>
