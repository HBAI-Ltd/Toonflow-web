<template>
  <div class="floatingTaskBox">
    <div class="box">
      <agent v-model="openShowVisible" :chatList="chatList" />
    </div>
  </div>
</template>

<script setup lang="ts">
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
    role: "assistant",
    identity: ["大纲师", "情节设计师"],
    content:
      "你好！我是一个智能助手，专门为你提供帮助和解答问题。无论你有什么疑问或者需要什么帮助，我都会尽力为你提供准确和有用的信息。请随时告诉我你需要什么帮助！",
  },
  {
    role: "assistant",
    identity: ["大纲师", "情节设计师"],
    content:
      "你好！我是一个智能助手，专门为你提供帮助和解答问题。无论你有什么疑问或者需要什么帮助，我都会尽力为你提供准确和有用的信息。请随时告诉我你需要什么帮助！",
  },
  {
    role: "assistant",
    identity: ["大纲师", "情节设计师"],
    content:
      "你好！我是一个智能助手，专门为你提供帮助和解答问题。无论你有什么疑问或者需要什么帮助，我都会尽力为你提供准确和有用的信息。请随时告诉我你需要什么帮助！",
  },
  {
    role: "assistant",
    identity: ["大纲师", "情节设计师"],
    content:
      "你好！我是一个智能助手，专门为你提供帮助和解答问题。无论你有什么疑问或者需要什么帮助，我都会尽力为你提供准确和有用的信息。请随时告诉我你需要什么帮助！",
  },
  {
    role: "assistant",
    identity: ["大纲师", "情节设计师"],
    content:
      "你好！我是一个智能助手，专门为你提供帮助和解答问题。无论你有什么疑问或者需要什么帮助，我都会尽力为你提供准确和有用的信息。请随时告诉我你需要什么帮助！",
  },
  {
    role: "assistant",
    identity: ["大纲师", "情节设计师"],
    content:
      "你好！我是一个智能助手，专门为你提供帮助和解答问题。无论你有什么疑问或者需要什么帮助，我都会尽力为你提供准确和有用的信息。请随时告诉我你需要什么帮助！",
  },
]);
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
    border-radius: 10px;
    border: 1px solid #919191;
    background-color: #fff;
    overflow-y: auto;
  }
}
</style>
