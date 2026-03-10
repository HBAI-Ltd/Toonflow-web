import axios from "axios";
import router from "@/router/index";
import { message } from "ant-design-vue";
import { storeToRefs } from "pinia";
import settingStore from "@/stores/setting";

const instance = axios.create();

instance.interceptors.request.use(function (config) {
  const { baseUrl, otherSetting } = storeToRefs(settingStore());
  config.baseURL = baseUrl.value;
  config.timeout = otherSetting.value.axiosTimeOut;
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

instance.interceptors.response.use(
  function (response) {
    return response.data;
  },
  function (error) {
    if (error.status === 401) {
      localStorage.removeItem("token");
      router.push("/login");
      message.error("登录已过期，请重新登录");
    }

    // 处理异常消息
    let errorMessage = "服务异常";
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.data) {
      errorMessage = typeof error.response.data === "string" ? error.response.data : JSON.stringify(error.response.data);
    } else if (error.message) {
      errorMessage = error.message;
    }

    return Promise.reject({
      ...error,
      message: errorMessage,
    });
  },
);

export default instance;
