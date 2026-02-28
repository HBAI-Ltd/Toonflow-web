<template>
  <div class="bg"></div>
  <div class="loginPage">
    <div class="formBox">
      <!-- 右下角设置按钮 -->
      <!-- 设置弹窗 -->
      <a-modal v-model:open="showSettingModal" title="服务器设置" @ok="handleSaveSetting" :width="400">
        <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
          <a-form-item label="请求地址">
            <a-input v-model:value="tempBaseUrl" placeholder="http://localhost:60000" />
          </a-form-item>
          <a-form-item label="WS地址">
            <a-input v-model:value="tempWsBaseUrl" placeholder="ws://localhost:60000" />
          </a-form-item>
        </a-form>
      </a-modal>
      <div class="logoBox">
        <img :src="logo" alt="logo" class="logo-img" />
        <span class="logo-text">Toonflow</span>
      </div>
      <a-form :model="state.user" :rules="state.rules" ref="ruleFormRef" @finish="handleFinish" class="login-form">
        <a-form-item name="username">
          <a-input v-model:value="state.user.username" placeholder="请输入账号" autocomplete="username" size="large">
            <template #prefix>
              <i-people theme="outline" class="input-icon" />
            </template>
          </a-input>
        </a-form-item>
        <a-form-item name="password">
          <a-input-password v-model:value="state.user.password" placeholder="请输入密码" size="large">
            <template #prefix>
              <i-lock theme="outline" class="input-icon" />
            </template>
          </a-input-password>
        </a-form-item>
        <a-form-item>
          <a-button class="loginBtn" type="primary" size="large" :loading="state.loginLoading" html-type="submit" block>登录</a-button>
        </a-form-item>
      </a-form>
      <a-alert v-if="showHint" class="default-hint" type="info" closable @close="showHint = false">
        <template #message>
          <div class="hint-content">
            <p>
              默认账号：
              <code>admin</code>
            </p>
            <p>
              默认密码：
              <code>admin123</code>
            </p>
            <p>登录后可在设置中修改</p>
          </div>
        </template>
      </a-alert>
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
import { Alert, message } from "ant-design-vue";
import logo from "@/assets/logo.png";
import axios from "@/utils/axios";
import settingStore from "@/stores/setting";
import { storeToRefs } from "pinia";

const store = settingStore();
const { baseUrl, wsBaseUrl } = storeToRefs(store);

const svgRef = ref(null);
const showHint = ref(true);
const showSettingModal = ref(false);
const tempBaseUrl = ref(baseUrl.value);
const tempWsBaseUrl = ref(wsBaseUrl.value);

// 保存设置
const handleSaveSetting = () => {
  baseUrl.value = tempBaseUrl.value;
  wsBaseUrl.value = tempWsBaseUrl.value;
  showSettingModal.value = false;
  message.success("设置已保存");
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
const handleFinish = (values) => {
  state.value.loginLoading = true;
  const obj = { ...values };
  axios
    .post("/other/login", obj)
    .then(({ data }) => {
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.id);
      Router.push("/project");
      message.success("登录成功");
      state.value.loginLoading = false;
    })
    .catch((e) => {
      state.value.loginLoading = false;
      message.error(e.message);
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
.bg {
  position: fixed;
  height: 100vh;
  width: 100vw;
  background-image: url("@/assets/bg.png");
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center;
}

.loginPage {
  z-index: 999;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;

  .formBox {
    width: 380px;
    padding: 40px 40px 30px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(10px);

    .logoBox {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 30px;
      gap: 12px;

      .logo-img {
        width: 48px;
        height: 48px;
      }

      .logo-text {
        font-size: 28px;
        font-weight: 600;
        color: #333;
        letter-spacing: 1px;
      }
    }

    .login-form {
      .input-icon {
        color: #999;
        font-size: 18px;
      }

      :deep(.ant-input-affix-wrapper) {
        padding: 8px 12px;
        border-radius: 8px;

        &:hover,
        &:focus-within {
          border-color: var(--mainColor);
        }
      }

      :deep(.ant-form-item) {
        margin-bottom: 20px;
      }
    }

    .loginBtn {
      height: 44px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      margin-top: 8px;
      background: var(--mainGradient);
      border: none;

      &:hover {
        background: var(--mainGradientHover);
      }
    }
  }
}

.default-hint {
  margin-top: 20px;
  border-radius: 8px;

  :deep(.ant-alert-message) {
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
    color: var(--mainColor);
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
