<template>
  <div class="loginPage">
    <div class="formBox">
      <!-- 设置弹窗 -->
      <t-dialog v-model:visible="showSettingModal" header="服务器设置" @confirm="handleSaveSetting" :width="400">
        <t-form label-width="80px">
          <t-form-item label="请求地址">
            <t-input v-model="tempBaseUrl" placeholder="http://localhost:60000" />
          </t-form-item>
          <t-form-item label="WS地址">
            <t-input v-model="tempWsBaseUrl" placeholder="ws://localhost:60000" />
          </t-form-item>
        </t-form>
      </t-dialog>
      <div class="logoBox fc">
        <img :src="logo" alt="logo" class="logoImg" />
        <div class="fc c">
          <span class="logoText">ToonFlow</span>
          <span class="slogan">智能短剧创作平台</span>
        </div>
      </div>
      <div class="login-form">
        <t-input v-model="state.user.username" placeholder="用户名" autocomplete="username" size="large"></t-input>
        <t-input v-model="state.user.password" type="password" placeholder="密码" size="large"></t-input>
        <t-button class="loginBtn" theme="primary" size="large" :loading="state.loginLoading" @click="handleLogin" block>登录</t-button>
      </div>
      <div class="tips c">默认账号：admin / admin123</div>
    </div>
  </div>
  <div class="settingBtn" @click="showSettingModal = true">
    <t-button shape="circle" theme="primary" size="large">
      <template #icon>
        <i-setting-two theme="outline" size="20" />
      </template>
    </t-button>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import Router from "@/router/index.ts";
import { MessagePlugin } from "tdesign-vue-next";
import logo from "@/assets/logo.png";
import axios from "@/utils/axios";
import settingStore from "@/stores/setting";
import { storeToRefs } from "pinia";

const store = settingStore();
const { baseUrl, wsBaseUrl } = storeToRefs(store);

const svgRef = ref(null);
const showSettingModal = ref(false);
const tempBaseUrl = ref(baseUrl.value);
const tempWsBaseUrl = ref(wsBaseUrl.value);

// 保存设置
const handleSaveSetting = () => {
  baseUrl.value = tempBaseUrl.value;
  wsBaseUrl.value = tempWsBaseUrl.value;
  showSettingModal.value = false;
  MessagePlugin.success("设置已保存");
};
const state = ref({
  show: true,
  loginLoading: false,
  user: {
    username: "",
    password: "",
    captcha: "",
    identity: "商家",
  },
  rules: {
    username: [{ required: true, message: "请输入您的账号" }],
    password: [{ required: true, message: "请输入密码" }],
    captcha: [{ required: true, message: "请输入验证码" }],
  },
});

const svg = ref();
const captcha = ref();

onMounted(() => {
  resSvg();
});
const handleLogin = () => {
  if (!state.value.user.username || !state.value.user.password) {
    MessagePlugin.warning("请输入账号和密码");
    return;
  }
  state.value.loginLoading = true;
  const obj = { ...state.value.user };
  axios
    .post("/login/login", obj)
    .then(({ data }) => {
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.id);
      Router.push("/project");
      MessagePlugin.success("登录成功");
      state.value.loginLoading = false;
    })
    .catch((e) => {
      state.value.loginLoading = false;
      MessagePlugin.error(e.message);
      resSvg();
    });
};

const resSvg = async () => {
  return;
  const { data } = await axios.get("/other/getCaptcha");
  svgRef.value.innerHTML = data.svg;
  captcha.value = data.captcha;
};
</script>

<style lang="scss" scoped>
.loginPage {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #eeeeee;

  .formBox {
    width: 380px;
    padding: 40px 40px 30px;
    background: #fff;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);

    .logoBox {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 30px;
      gap: 12px;

      .logoImg {
        width: 64px;
        height: 64px;
      }

      .logoText {
        font-size: 36px;
        font-weight: 800;
        color: #333;
        letter-spacing: 1px;
      }
      .slogan {
        opacity: 0.5;
      }
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 20px;

      .input-icon {
        color: #999;
        font-size: 18px;
      }

      :deep(.t-input) {
        border-radius: 8px;
      }
    }
  }
  .tips {
    opacity: 0.5;
    font-size: 12px;
    margin-top: 18px;
  }
}

.default-hint {
  margin-top: 20px;
  border-radius: 8px;

  :deep(.t-alert__message) {
    width: 100%;
  }

  .hint-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
    color: #666;

    p {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  code {
    background: #fff;
    padding: 2px 10px;
    border-radius: 4px;
    font-family: "Monaco", "Menlo", monospace;
    font-weight: 500;
    font-size: 13px;
    border: 1px solid #e8d5ff;
  }
}

.settingBtn {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 9999;
}
</style>
