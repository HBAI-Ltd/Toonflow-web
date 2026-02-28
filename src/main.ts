import { createApp } from "vue";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import App from "./App.vue";
import router from "./router";
import LeoDirectives from "@eonova/v3-directives";
import { install } from "@icon-park/vue-next/es/all";
import "@icon-park/vue-next/styles/index.css";
import { DatePicker } from "ant-design-vue";
import VxeUIAll from "vxe-pc-ui";
import VxeUITable from "vxe-table";
import "vxe-table/es/style.css";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import zhCn from "element-plus/es/locale/lang/zh-cn";

import MateChat from "@matechat/core";

import "@devui-design/icons/icomoon/devui-icon.css";

import "tdesign-vue-next/es/style/index.css";

import "./assets/main.css";

import "@/utils/global";

const app = createApp(App);
install(app, "i");
app.use(DatePicker);
app.use(createPinia().use(piniaPluginPersistedstate));
app.use(router);
app.use(MateChat);
app.use(VxeUITable);
app.use(ElementPlus, { locale: zhCn });
app.use(VxeUIAll);
app.use(LeoDirectives as any);
app.mount("#app");
