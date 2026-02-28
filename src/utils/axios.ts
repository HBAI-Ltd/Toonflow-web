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
    return Promise.reject(error?.response?.data ?? error);
  }
);

export default instance;