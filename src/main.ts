import { createApp } from "vue";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import App from "./App.vue";
import router from "./router";
import { install } from "@icon-park/vue-next/es/all";
import "@icon-park/vue-next/styles/index.css";

import "tdesign-vue-next/es/style/index.css";
import { LoadingPlugin } from "tdesign-vue-next";

import "./assets/main.scss";

import "@/utils/global";

import { Log } from "@webav/av-cliper";
Log.setLogLevel(Log.warn);

const app = createApp(App);
install(app, "i");
app.use(createPinia().use(piniaPluginPersistedstate));
app.use(router);
app.use(LoadingPlugin);
app.mount("#app");
