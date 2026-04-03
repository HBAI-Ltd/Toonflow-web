<template>
  <div class="details">
    <t-dialog v-model:visible="detailsShow" width="60vw" top="5vh" @confirm="onConfirm">
      <template #header>
        <t-typography-title level="h4" style="margin: 0">{{ $t('workbench.script.edit.title') }}</t-typography-title>
      </template>
      <t-form :data="props.item" label-align="top" class="detailsForm">
        <t-form-item :label="$t('workbench.script.edit.scriptName')" name="name">
          <t-input v-model="props.item.name" :maxlength="10" :placeholder="$t('workbench.script.edit.scriptNamePh')" />
        </t-form-item>
        <t-form-item :label="$t('workbench.script.edit.scriptContent')" name="content">
          <t-textarea v-model="props.item.content" :placeholder="$t('workbench.script.edit.scriptContentPh')" :autosize="{ minRows: 20, maxRows: 20 }" />
        </t-form-item>
        <t-form-item :label="$t('workbench.script.edit.relatedAssets')" name="assets">
          <div class="assets-section">
            <div class="assets-header">
              <t-button size="small" theme="primary" variant="outline" @click="handleSelectAssets">
                <template #icon><i-plus /></template>
                {{ $t('workbench.script.edit.selectAssets') }}
              </t-button>
            </div>
            <div class="assets-list" v-if="selectedAssets.length">
              <t-tag v-for="asset in selectedAssets" :key="asset.id" closable variant="light-outline" @close="removeAsset(asset.id)">
                {{ asset.name }}
              </t-tag>
            </div>
            <div v-else class="assets-empty">{{ $t('workbench.script.edit.noAssets') }}</div>
          </div>
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
import openAssetsSelector from "@/utils/assetsCheck";

interface ScriptAsset {
  id: number;
  name: string;
}
interface ScriptItem {
  id: number;
  name: string;
  content: string;
  relatedAssets?: ScriptAsset[];
}

const detailsShow = defineModel<boolean>({
  default: false,
});

const props = defineProps<{
  item: ScriptItem;
}>();

// ============== Assets ==============
const selectedAssets = ref<ScriptAsset[]>([]);

watch(
  () => props.item?.relatedAssets,
  (relatedAssets) => {
    selectedAssets.value = relatedAssets?.map((a) => ({ id: a.id, name: a.name })) ?? [];
  },
  { immediate: true },
);

async function handleSelectAssets() {
  const assets = await openAssetsSelector({ title: $t('workbench.script.edit.msg.selectAssetsTitle'), types: ["role", "tool", "scene"] });
  if (assets.length) {
    const existing = new Set(selectedAssets.value.map((a) => a.id));
    for (const a of assets) {
      if (!existing.has(a.id)) {
        selectedAssets.value.push({ id: a.id, name: a.name });
      }
    }
  }
}

function removeAsset(id: number) {
  selectedAssets.value = selectedAssets.value.filter((a) => a.id !== id);
}

const emit = defineEmits(["searchScripts"]);
//确认
async function onConfirm() {
  try {
    await axios.post("/script/updateScript", {
      id: props.item.id,
      name: props.item.name,
      content: props.item.content,
      assets: selectedAssets.value.map((a) => a.id),
    });
    window.$message.success($t('workbench.script.edit.msg.updateSuccess'));
  } catch (error) {
    window.$message.error($t('workbench.script.edit.msg.updateFailed'));
  } finally {
    emit("searchScripts");
  }
  detailsShow.value = false;
}
</script>

<style lang="scss" scoped>
.details {
  .detailsForm {
    padding: 0 8px;

    .assets-section {
      width: 100%;
      .assets-header {
        margin-bottom: 8px;
      }
      .assets-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .assets-empty {
        font-size: 13px;
        color: var(--td-text-color-placeholder);
      }
    }
  }
}
</style>
