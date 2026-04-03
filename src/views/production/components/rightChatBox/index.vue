<template>
  <div class="rightChatBox" :style="{ width: boxWidth + 'px' }">
    <div ref="resizeHandleRef" class="resizeHandle"></div>
    <div class="header f ac jb">
      <span class="text">
        <i-dot theme="outline" :fill="connected ? 'green' : 'red'" />
        {{ props.title }}
      </span>
      <div class="close">
        <i-click-to-fold size="18" @click.stop="emit('close')" />
      </div>
    </div>
    <div class="chatBox" v-loading="loadingHistory">
      <t-chat-list :clear-history="false">
        <t-chat-message
          v-for="message in messages"
          :key="message.id"
          :message="message"
          :name="(message as any).name"
          :placement="message.role === 'user' ? 'right' : 'left'"
          :variant="message.role === 'user' ? 'base' : 'outline'"
          :handleActions="message.role === 'user' ? {} : handleActions"
          :status="message.status"
          allowContentSegmentCustom>
          <!-- <template #actionbar>
            <t-chat-actionbar :action-bar="['replay', 'copy']" />
          </template> -->
        </t-chat-message>
      </t-chat-list>
      <t-chat-sender
        class="inputBox"
        :disabled="status === 'pending' || status === 'streaming' || !connected"
        v-model="inputValue"
        :loading="status === 'pending' || status === 'streaming'"
        :placeholder="$t('workbench.production.chatBox.inputPlaceholder')"
        @send="handleSend"
        @stop="handleStop">
        <template #footer-prefix>
          <div class="ac" style="gap: 5px">
            <t-popup trigger="click" placement="top-left">
              <t-button shape="square" variant="outline" size="small">
                <template #icon>
                  <i-setting-config size="16" />
                </template>
              </t-button>
              <template #content>
                <div class="settingMenu">
                  <div class="settingMenuItem" @click="handleReconnect()">
                    <i-api size="14" />
                    <span>{{ $t("workbench.scriptAgent.reconnect") }}</span>
                  </div>
                  <div class="settingMenuItem" @click="handleClearMemory('message')">
                    <i-delete size="14" />
                    <span>{{ $t("workbench.production.chatBox.clearMessageMemory") }}</span>
                  </div>
                  <div class="settingMenuItem" @click="handleClearMemory('summary')">
                    <i-close size="14" />
                    <span>{{ $t("workbench.production.chatBox.clearSummaryMemory") }}</span>
                  </div>
                  <div class="settingMenuItem danger" @click="handleClearMemory('all')">
                    <i-delete-one size="14" />
                    <span>{{ $t("workbench.production.chatBox.clearAllMemory") }}</span>
                  </div>
                </div>
              </template>
            </t-popup>
          </div>
        </template>
      </t-chat-sender>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMousePressed, useMouse } from "@vueuse/core";
import _ from "lodash";
import axios from "@/utils/axios";
import productionAgentStore from "@/stores/productionAgent";
import projectStore from "@/stores/project";
const { project } = storeToRefs(projectStore());
const { connected, messages, status, episodesId, loadingHistory } = storeToRefs(productionAgentStore());

const props = defineProps({ title: String });

const emit = defineEmits(["close"]);

const inputValue = ref("");

function handleSend(text: string) {
  productionAgentStore().chat(text);
  inputValue.value = "";
}
function handleStop() {
  productionAgentStore().stopGenerate();
}
function handleReconnect() {
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.scriptAgent.msg.reconnect"),
    body: $t("workbench.scriptAgent.msg.notReconnect"),
    confirmBtn: $t("workbench.scriptAgent.msg.keepReconnect"),
    cancelBtn: $t("workbench.scriptAgent.msg.cancel"),
    theme: "warning",
    onConfirm: async () => {
      productionAgentStore().reconnect();
      dialog.destroy();
    },
  });
}

//快捷发送
const handleActions = {
  suggestion: (data?: any) => {
    productionAgentStore().chat(data?.content?.prompt);
  },
};

const memoryTypeLabel: Record<string, string> = {
  message: $t("workbench.production.chatBox.messageMemory"),
  summary: $t("workbench.production.chatBox.summaryMemory"),
  all: $t("workbench.production.chatBox.allMemory"),
};
function handleClearMemory(type: "message" | "summary" | "all") {
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.production.chatBox.confirmClear"),
    body: $t("workbench.production.chatBox.confirmClearBody", { type: memoryTypeLabel[type] }),
    confirmBtn: $t("workbench.production.chatBox.confirmClearBtn"),
    cancelBtn: $t("workbench.production.cancel"),
    theme: "warning",
    onConfirm: async () => {
      await axios.post(`/agents/clearMemory`, { projectId: project.value?.id, agentType: "productionAgent", episodesId: episodesId.value, type });
      window.$message.success($t("workbench.production.chatBox.memoryCleared", { type: memoryTypeLabel[type] }));
      dialog.destroy();
      productionAgentStore().getHistory();
    },
  });
}

const resizeHandleRef = ref<HTMLElement | null>(null);
const boxWidth = ref(400);
const MIN_WIDTH = 400;
const { pressed } = useMousePressed({ target: resizeHandleRef });
const { x } = useMouse();
const dragStartX = ref(0);
const dragStartWidth = ref(400);
watch(pressed, (isPressed) => {
  if (isPressed) {
    dragStartX.value = x.value;
    dragStartWidth.value = boxWidth.value;
  }
});
watchEffect(() => {
  if (pressed.value) {
    const maxWidth = window.innerWidth * 0.8;
    boxWidth.value = Math.min(maxWidth, Math.max(MIN_WIDTH, dragStartWidth.value + (dragStartX.value - x.value)));
  }
});
</script>

<style lang="scss" scoped>
.rightChatBox {
  position: absolute;
  top: 10px;
  right: 0;
  bottom: 10px;
  display: flex;
  flex-direction: column;
  z-index: 9999;
  min-width: 400px;
  height: calc(100% - 20px);
  margin-right: 5px;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
  background-color: #fff;
  overflow-y: auto;

  .resizeHandle {
    user-select: none;
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    cursor: col-resize;
    z-index: 10;
    &:hover {
      background-color: rgba(0, 0, 0, 0.08);
    }
  }
  box-shadow: -4px 2px 10px rgba(53, 53, 53, 0.1);
  .chatBox {
    width: 100%;
    height: calc(100% - 50px);
    display: flex;
    flex-direction: column;
    padding-left: 8px;
    .inputBox {
      padding-right: 8px;
    }
  }
  :deep(.t-chat__list) {
    padding-right: 8px;
  }
  .header {
    height: 40px;
    line-height: 40px;
    padding: 0 10px;
    flex-shrink: 0;
    .text {
      font-size: 18px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
    }
    .close {
      cursor: pointer;
      aspect-ratio: 1/1;
    }
  }
}

.settingMenu {
  padding: 4px 0;
  .settingMenuItem {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 16px;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
    &:hover {
      background-color: #f3f3f3;
    }
    &.danger {
      color: #e34d59;
    }
  }
}
.modelSelCls {
  gap: 5px;
  .paramSelect {
    max-width: 80px;
  }
}
</style>
