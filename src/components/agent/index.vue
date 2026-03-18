<template>
  <div class="agent">
    <div class="head jb ac" v-if="$slots.header">
      <slot name="header"></slot>
    </div>
    <div class="caht">
      <div v-for="(item, index) in messageList" :key="index" class="item" :class="item.type === 'message' ? item.role : 'notice'">
        <div class="noticeRow" v-if="item.type === 'notice'">
          <t-tag shape="round">{{ item.content }}</t-tag>
        </div>
        <div class="user frr" v-else-if="item.role === 'user'">{{ item.content }}</div>
        <div v-else class="assistantWrapper">
          <div class="assistant">
            <div class="ai fr">
              <div class="identity c">
                <span>{{ item.identity || '助手' }}</span>
              </div>
              {{ item.content }}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="inputBox">
      <t-textarea v-model="needData" :placeholder="props.placeholder" name="description" :autosize="{ minRows: 3, maxRows: 3 }" />
      <div class="send c" @click="sendFn">
        <t-button shape="circle" theme="primary" :disabled="!needData">
          <i-arrow-up theme="outline" size="16" fill="#fff" />
        </t-button>
      </div>
      <div class="toolList c" v-if="$slots.toolList">
        <slot name="toolList"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
//类型
type ChatRole = "user" | "assistant";

interface ChatMessageItem {
  type: "message";
  role: ChatRole;
  identity?: string;
  content: string;
}

interface ChatNoticeItem {
  type: "notice";
  content: string;
}

type ChatItem = ChatMessageItem | ChatNoticeItem;

const modelValue = defineModel<ChatItem[] | boolean>({
  default: () => [],
});

const needData = ref("");
const props = defineProps({
  chatList: {
    type: Array as () => ChatItem[],
    default: () => [],
  },
  placeholder: {
    type: String,
    default: "请输文本与Agent进行对话",
  },
});

const messageList = computed<ChatItem[]>(() => {
  if (Array.isArray(modelValue.value)) {
    return modelValue.value;
  }

  return props.chatList;
});
const emit = defineEmits(["sendData"]);
function sendFn() {
  emit("sendData", needData.value);
  needData.value = "";
}
function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendFn();
  }
}
// 生命周期
onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<style lang="scss" scoped>
.agent {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  .head {
    height: 40px;
    line-height: 40px;
    padding: 0 10px;
    flex-shrink: 0;
    .text {
      font-size: 30px;
      font-weight: 900;
    }
  }
  .caht {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
    padding: 10px;
    margin-bottom: 130px;
    .item {
      display: flex;
      &.notice {
        justify-content: center;
        .noticeRow {
          display: flex;
          justify-content: center;
        }
      }
      &.user {
        justify-content: flex-end;
        .user {
          background-color: #000;
          color: #fff;
          padding: 12px 16px;
          border-radius: 16px 16px 4px 16px;
          min-width: 10%;
          word-wrap: break-word;
        }
      }
      .assistantWrapper {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        .assistant {
          width: 100%;
          display: flex;
          justify-content: flex-start;
          .ai {
            margin-top: 5px;
            background-color: #ececec;
            color: #000;
            padding: 24px 16px 16px;
            border-radius: 16px 16px 16px 4px;
            min-width: 150px;
            word-wrap: break-word;
            position: relative;
            .identity {
              padding: 5px 10px;
              position: absolute;
              top: -10px;
              left: 12px;
              color: #fff;
              font-size: 12px;
              border-radius: 25px;
              background-color: #000;
            }
          }
        }
      }
    }
  }
  .inputBox {
    position: absolute;
    bottom: 10px;
    left: 10px;
    right: 10px;
    height: 130px;
    border-radius: 10px;
    border: 1px solid #d1d0d0;
    padding: 5px;
    :deep(.t-textarea) {
      flex: 1;
      border: none;
      .t-textarea__inner {
        border: none;
        box-shadow: none;
      }
    }
    .send {
      position: absolute;
      right: 5px;
      bottom: 5px;
      cursor: pointer;
    }
    .toolList {
      position: absolute;
      left: 15px;
      bottom: 12px;
      cursor: pointer;
      border-radius: 50%;
    }
  }
}
</style>
