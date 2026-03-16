<template>
  <div class="agent">
    <div class="head jb ac">
      <span style="font-size: 18px; color: #000">{{ props.anthology }}</span>
      <div>
        <i-click-to-fold
          theme="outline"
          size="17"
          fill="#000000"
          style="cursor: pointer"
          @click.stop="
            () => {
              openShowVisible = false;
            }
          " />
      </div>
    </div>
    <div class="caht">
      <div v-for="(item, index) in props.chatList" :key="index" class="item" :class="item.role">
        <div class="user frr" v-if="item.role == 'user'">{{ item.content }}</div>
        <div v-else class="assistantWrapper">
          <div class="divider">
            <t-tag v-for="(items, indexs) in item.identity" :key="indexs" shape="round">{{ items }}</t-tag>
          </div>
          <div class="assistant">
            <div class="ai fr">
              <div class="identity c">
                <span>{{ item.identity?.join(", ") }}</span>
              </div>
              {{ item.content }}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="inputBox">
      <t-textarea v-model="needData" placeholder="请输入你的设计需求" name="description" :autosize="{ minRows: 3, maxRows: 3 }" />
      <div class="send c" @click="sendFn">
        <t-button shape="circle" theme="primary" :disabled="!needData">
          <i-arrow-up theme="outline" size="16" fill="#fff" />
        </t-button>
      </div>
      <div class="setting c">
        <i-setting-config theme="outline" size="16" fill="#b6b9bf" @click="settingFn" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
const openShowVisible = defineModel({
  type: Boolean,
  default: false,
});
//类型
interface ChatList {
  role: string;
  content: string;
  identity?: string[];
}
const needData = ref("");
const props = defineProps({
  anthology: {
    type: String,
    default: "",
  },
  chatList: {
    type: Array as () => ChatList[],
    default: () => [],
  },
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
//设置
function settingFn() {}
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
        .divider {
          gap: 8px;
          font-size: 13px;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 10px;
        }
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
    .setting {
      position: absolute;
      left: 15px;
      bottom: 12px;
      cursor: pointer;
      border-radius: 50%;
    }
  }
}
</style>
