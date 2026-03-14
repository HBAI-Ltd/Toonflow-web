<template>
  <div class="memoryConfig">
    <t-alert theme="warning" class="topAlert" message="以下配置项已预设为推荐值。除非您清楚了解各项配置的含义及影响，否则建议维持现有设置" />

    <t-form :data="formData" labelAlign="top" class="memoryForm" @submit="handleSave">
      <t-card title="记忆参数" :bordered="true" style="margin-top: 16px">
        <t-row :gutter="16">
          <t-col :span="4">
            <t-form-item label="短期记忆长度" name="shortTermMemoryLength">
              <t-input-number v-model="formData.shortTermMemoryLength" :min="1" :max="200" />
              <template #help>保留最近 N 条对话上下文。</template>
            </t-form-item>
          </t-col>
          <t-col :span="4">
            <t-form-item label="搜索记忆条数" name="searchTopK">
              <t-input-number v-model="formData.searchTopK" :min="1" :max="100" />
              <template #help>检索时返回的候选记忆条数。</template>
            </t-form-item>
          </t-col>
          <t-col :span="4">
            <t-form-item label="记忆相似度阈值" name="similarityThreshold">
              <t-input-number v-model="formData.similarityThreshold" :min="0" :max="1" :step="0.01" :decimalPlaces="2" />
              <template #help>范围 0-1，值越大匹配越严格。</template>
            </t-form-item>
          </t-col>
        </t-row>
      </t-card>

      <div class="actionRow f frr">
        <t-button theme="primary" type="submit" :loading="saving">保存配置</t-button>
        <t-button theme="danger" variant="outline" :loading="clearing" @click="handleClearMemory">清空记忆</t-button>
      </div>
    </t-form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { DialogPlugin, MessagePlugin } from "tdesign-vue-next";

interface MemoryConfigForm {
  shortTermMemoryLength: number;
  searchTopK: number;
  similarityThreshold: number;
}

interface ApiResponse<T = any> {
  code: number;
  msg?: string;
  data?: T;
}

const formData = ref<MemoryConfigForm>({
  shortTermMemoryLength: 10,
  searchTopK: 3,
  similarityThreshold: 0.3,
});

const loading = ref(false);
const saving = ref(false);
const clearing = ref(false);

async function getMemoryConfig() {
  loading.value = true;
  try {
  } catch (error: any) {
    MessagePlugin.warning(error?.message);
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  saving.value = true;
  try {
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
