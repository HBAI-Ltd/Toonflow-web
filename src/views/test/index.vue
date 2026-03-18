<!-- src/components/ChatRoom.vue -->
<template>
  <div class="chat">
    <!-- 未登录 -->
    <div v-if="!isLoggedIn" class="login">
      <input v-model="username" @keyup.enter="login" placeholder="输入昵称" />
      <button @click="login">进入</button>
    </div>

    <!-- 已登录 -->
    <template v-else>
      <div class="header">
        <span>💬 聊天室</span>
        <span :class="['dot', { online: connected }]"></span>
      </div>

      <div class="messages">
        <div v-for="(msg, i) in state.messages" :key="i" :class="['msg', { system: msg.type === 'system' }]">
          <template v-if="msg.type === 'system'">
            {{ msg.message }}
          </template>
          <template v-else>
            <b>{{ msg.username }}</b>
            : {{ msg.message }}
            <span class="time">{{ msg.time }}</span>
          </template>
        </div>
      </div>

      <div v-if="state.typingUser" class="typing">{{ state.typingUser }} 正在输入...</div>

      <div class="input-box">
        <input v-model="input" @keyup.enter="send" @input="onTyping" placeholder="输入消息..." />
        <button @click="send">发送</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from "vue";
import { useSocket } from "@/utils/useSocket";

interface ChatMessage {
  username: string;
  message: string;
  time: string;
  type?: "user" | "system";
}

let typingTimer: ReturnType<typeof setTimeout> | null = null;

const isLoggedIn = ref(false);
const username = ref("");
const input = ref("");

const { connected, connect, disconnect, emit, on, off } = useSocket("http://localhost:60000/socket/chat");

const state = reactive({
  messages: [] as ChatMessage[],
  typingUser: "",
});

const handleNewMessage = (msg: ChatMessage) => state.messages.push(msg);
const handleNotification = (text: string) =>
  state.messages.push({ type: "system", message: text, username: "", time: "" });
const handleTyping = (name: string) => (state.typingUser = name);
const handleStopTyping = () => (state.typingUser = "");

const login = (): void => {
  if (username.value.trim()) {
    emit("userLogin", username.value);
    isLoggedIn.value = true;
  }
};

const send = (): void => {
  if (input.value.trim()) {
    emit("sendMessage", { message: input.value });
    input.value = "";
    emit("stopTyping");
  }
};

const onTyping = (): void => {
  emit("typing");
  if (typingTimer) clearTimeout(typingTimer);
  typingTimer = setTimeout(() => emit("stopTyping"), 1000);
};

onMounted(() => {
  connect();
  on("newMessage", handleNewMessage);
  on("notification", handleNotification);
  on("userTyping", handleTyping);
  on("userStopTyping", handleStopTyping);
});

onUnmounted(() => {
  off("newMessage", handleNewMessage);
  off("notification", handleNotification);
  off("userTyping", handleTyping);
  off("userStopTyping", handleStopTyping);
  disconnect();
  if (typingTimer) clearTimeout(typingTimer);
});
</script>

<style scoped>
.chat {
  max-width: 500px;
  margin: 20px auto;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-family: sans-serif;
}

.login {
  padding: 40px;
  text-align: center;
}

.login input {
  padding: 10px;
  width: 200px;
  margin-right: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.login button {
  padding: 10px 20px;
}

.header {
  padding: 12px 15px;
  background: #4a90d9;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #f44;
}

.dot.online {
  background: #4c4;
}

.messages {
  height: 300px;
  overflow-y: auto;
  padding: 10px;
}

.msg {
  padding: 8px;
  margin-bottom: 8px;
  background: #f5f5f5;
  border-radius: 4px;
}

.msg.system {
  background: none;
  text-align: center;
  color: #999;
  font-size: 13px;
}

.time {
  float: right;
  color: #999;
  font-size: 12px;
}

.typing {
  padding: 5px 10px;
  color: #888;
  font-size: 13px;
  font-style: italic;
}

.input-box {
  display: flex;
  padding: 10px;
  border-top: 1px solid #eee;
}

.input-box input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-right: 10px;
}

.input-box button {
  padding: 10px 20px;
  background: #4a90d9;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
