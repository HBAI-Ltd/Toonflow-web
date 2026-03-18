<template>
  <div class="floatingTaskBox">
    <div class="box">
      <agent v-model="chatList" @sendData="handleSendData">
        <template #header>
          <span style="font-size: 18px; color: #000">{{ props.anthology }}</span>
          <div>
            <i-click-to-fold theme="outline" size="17" fill="#000000" style="cursor: pointer" @click.stop="openShowVisible = false" />
          </div>
        </template>
        <template #toolList>
          <i-setting-config theme="outline" size="16" fill="#b6b9bf" @click="settingFn" />
        </template>
      </agent>
    </div>
  </div>
</template>

<script setup lang="ts">
const openShowVisible = defineModel({
  type: Boolean,
  default: false,
});
//类型

const props = defineProps({
  anthology: {
    type: String,
    default: "",
  },
});

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

//agent聊天记录
const chatList = ref<ChatItem[]>([
  {
    type: "message",
    role: "user",
    identity: "用户",
    content: "你好，请介绍一下你自己。",
  },
  {
    type: "notice",
    content: "大纲师正在翻阅文章",
  },
  {
    type: "notice",
    content: "大纲师正在分析文章",
  },
  {
    type: "message",
    role: "assistant",
    identity: "大纲师",
    content: "你好！",
  },
  {
    type: "notice",
    content: "分镜师正在设计情节",
  },
  {
    type: "notice",
    content: "分镜师正在分析情节",
  },
  {
    type: "message",
    role: "assistant",
    identity: "分镜师",
    content:
      "你好！我是一个智能助手，专门为你提供帮助和解答问题。无论你有什么疑问或者需要什么帮助，我都会尽力为你提供准确和有用的信息。请随时告诉我你需要什么帮助！",
  },
]);
//发送
function handleSendData(data: string) {
  chatList.value.push({
    type: "message",
    role: "user",
    identity: "用户",
    content: data,
  });
}

//设置
function settingFn() {}
</script>

<style lang="scss" scoped>
.floatingTaskBox {
  position: absolute;
  top: 10px;
  right: 0;
  bottom: 10px;
  display: flex;
  flex-direction: column;
  z-index: 9999;
  .box {
    width: 400px;
    height: 100%;
    margin-right: 5px;
    border-radius: 10px;
    border: 1px solid #e0e0e0;
    background-color: #fff;
    overflow-y: auto;
    box-shadow: -4px 2px 10px rgba(53, 53, 53, 0.1);
  }
}
</style>
