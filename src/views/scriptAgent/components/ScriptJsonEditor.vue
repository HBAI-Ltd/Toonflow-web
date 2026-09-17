<template>
  <t-dialog
    :visible="visible"
    :header="$t('workbench.scriptAgent.editScript')"
    width="80%"
    top="10vh"
    placement="center"
    :confirm-btn="{ content: $t('workbench.scriptAgent.save'), theme: 'primary', disabled: busy }"
    @update:visible="emit('update:visible', $event)"
    @confirm="save"
    @close="emit('update:visible', false)">
    <div class="scriptJsonEditor">
      <div class="scriptJsonEditorToolbar">
        <p>{{ $t('workbench.scriptAgent.jsonEditHelp') }}</p>
        <t-button variant="outline" :disabled="busy" @click="formatDraft">
          {{ $t('workbench.scriptAgent.formatJson') }}
        </t-button>
      </div>
      <CodeEditor
        v-model:value="draft"
        language="json"
        theme="vs-dark"
        :height="'50vh'"
        :options="editorOptions" />
      <p v-if="errorMessage" class="scriptJsonEditorError" role="alert">
        {{ $t('workbench.scriptAgent.jsonValidationError') }}: {{ errorMessage }}
      </p>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import { CodeEditor } from "monaco-editor-vue3";
import { formatStructuredScriptJson, parseStructuredScriptJson } from "@/utils/structuredScript";

const props = defineProps<{ visible: boolean; modelValue: string; busy: boolean }>();
const emit = defineEmits<{
  "update:visible": [value: boolean];
  save: [value: string];
}>();

const draft = ref("");
const errorMessage = ref("");
const editorOptions = {
  automaticLayout: true,
  minimap: { enabled: false },
  tabSize: 2,
  scrollBeyondLastLine: false,
  wordWrap: "on",
};

watch(() => props.visible, (visible) => {
  if (!visible) return;
  errorMessage.value = "";
  try {
    draft.value = formatStructuredScriptJson(parseStructuredScriptJson(props.modelValue));
  } catch (error) {
    draft.value = props.modelValue;
    errorMessage.value = error instanceof Error ? error.message : String(error);
  }
});

function formatDraft() {
  try {
    draft.value = formatStructuredScriptJson(parseStructuredScriptJson(draft.value));
    errorMessage.value = "";
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error);
  }
}

function save() {
  try {
    const formatted = formatStructuredScriptJson(parseStructuredScriptJson(draft.value));
    errorMessage.value = "";
    emit("save", formatted);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error);
  }
}
</script>

<style scoped lang="scss">
.scriptJsonEditor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.scriptJsonEditorToolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  p {
    margin: 0;
    color: var(--td-text-color-secondary);
  }
}

.scriptJsonEditorError {
  margin: 0;
  color: var(--td-error-color);
  white-space: pre-wrap;
}
</style>
