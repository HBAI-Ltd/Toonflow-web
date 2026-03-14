<template>
  <div class="agent">
    <div class="head jb ac">
      <span>Untitled</span>
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
      <div v-for="(item, index) in chatList" :key="index" class="item" :class="item.role">
        <div class="user frr" v-if="item.role == 'user'">{{ item.content }}</div>
        <div v-else>
          <div class="divider c">
            <div v-for="(items, indexs) in item.identity" :key="indexs">
              <t-tag shape="round">{{ items }}</t-tag>
            </div>
          </div>
          <div class="identity c">
            <span>{{ item.identity?.join(", ") }}</span>
          </div>
          <div class="ai fr">{{ item.content }}</div>
        </div>
      </div>
    </div>
    <div class="inputBox">
      <t-textarea v-model="needData" placeholder="请输入你的设计需求" name="description" :autosize="{ minRows: 3, maxRows: 3 }" />
      <div class="send c" @click="sendFn">
        <i-arrow-up theme="outline" size="16" fill="#fff" />
      </div>
      <div class="setting c">
        <i-setting-config theme="outline" size="16" fill="#b6b9bf" @click="settingFn" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
//类型
interface ChatList {
  role: string;
  content: string;
  identity?: string[];
}
const openShowVisible = defineModel({
  type: Boolean,
  default: false,
});
//agent聊天记录
const chatList = ref<ChatList[]>([
  {
    role: "user",
    content: "你好，请介绍一下你自己。",
  },
  {
    role: "assistant",
    identity: ["大纲师", "情节设计师"],
    content:
      "你好！我是一个智能助手，专门为你提供帮助和解答问题。无论你有什么疑问或者需要什么帮助，我都会尽力为你提供准确和有用的信息。请随时告诉我你需要什么帮助！",
  },
  {
    role: "user",
    content: "你好，请介绍一下你自己。",
  },
  {
    role: "assistant",
    identity: ["大纲师", "情节设计师"],
    content:
      "你好！我是一个智能助手，专门为你提供帮助和解答问题。无论你有什么疑问或者需要什么帮助，我都会尽力为你提供准确和有用的信息。请随时告诉我你需要什么帮助！",
  },
  {
    role: "user",
    content: "你好，请介绍一下你自己。",
  },
  {
    role: "assistant",
    identity: ["大纲师", "情节设计师"],
    content:
      "你好！我是一个智能助手，专门为你提供帮助和解答问题。无论你有什么疑问或者需要什么帮助，我都会尽力为你提供准确和有用的信息。请随时告诉我你需要什么帮助！",
  },
  {
    role: "user",
    content: "你好，请介绍一下你自己。",
  },
  {
    role: "assistant",
    identity: ["大纲师", "情节设计师"],
    content:
      "你好！我是一个智能助手，专门为你提供帮助和解答问题。无论你有什么疑问或者需要什么帮助，我都会尽力为你提供准确和有用的信息。请随时告诉我你需要什么帮助！",
  },
  {
    role: "user",
    content: "你好，请介绍一下你自己。",
  },
  {
    role: "assistant",
    identity: ["大纲师", "情节设计师"],
    content:
      "你好！我是一个智能助手，专门为你提供帮助和解答问题。无论你有什么疑问或者需要什么帮助，我都会尽力为你提供准确和有用的信息。请随时告诉我你需要什么帮助！",
  },
]);
const needData = ref("");
function sendFn() {}
function settingFn() {
  console.log("设置");
}
</script>

<style lang="scss" scoped>
.agent {
  padding: 10px;
  font-size: 14px;
  height: 100%;
  position: relative;
  .head {
    height: 40px;
    line-height: 40px;
    padding: 0 10px;
    .text {
      font-size: 30px;
      font-weight: 900;
    }
  }
  .caht {
    height: calc(100% - 170px);
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
    .item {
      display: flex;
      &.user {
        justify-content: flex-end;
        .user {
          background-color: #000;
          color: #fff;
          padding: 12px 16px;
          border-radius: 16px 16px 4px 16px;
          min-width: 30%;
          word-wrap: break-word;
        }
      }
      &.assistant {
        position: relative;
        margin-top: 30px;
        justify-content: flex-start;
        .divider {
          gap: 8px;
          position: absolute;
          top: -30px;
          left: 0;
          width: 100%;
          font-size: 13px;
        }
        .identity {
          padding: 5px 10px;
          position: absolute;
          top: -15px;
          left: 20px;
          color: #fff;
          font-size: 12px;
          border-radius: 25px;
          background-color: #000;
        }
        .ai {
          background-color: #ececec;
          color: #000;
          padding: 12px 16px;
          border-radius: 16px 16px 16px 4px;
          min-width: 10%;
          word-wrap: break-word;
        }
      }
    }
  }
  .inputBox {
    position: absolute;
    bottom: 10px;
    left: 10px;
    right: 10px;
    height: 120px;
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
      width: 28px;
      height: 28px;
      cursor: pointer;
      border-radius: 50%;
      background-color: #b6b9bf;
      border-color: #b6b9bf;
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
