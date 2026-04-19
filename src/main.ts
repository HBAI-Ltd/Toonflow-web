import { createApp } from "vue";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import App from "./App.vue";
import router from "./router";
import i18n from "./locales";
import { install } from "@icon-park/vue-next/es/all";
import "@icon-park/vue-next/styles/index.css";

import "tdesign-vue-next/es/style/index.css";
import { LoadingDirective, LoadingPlugin } from "tdesign-vue-next";

import "@/utils/global";

import { Log } from "@webav/av-cliper";
Log.setLogLevel(Log.warn);

import "md-editor-v3/lib/style.css";
import "splitpanes/dist/splitpanes.css";

import "./assets/main.scss";

import { imageOptimizer } from '@/utils/imageOptimizer'

const app = createApp(App);
app.use(imageOptimizer)
install(app, "i");
app.use(createPinia().use(piniaPluginPersistedstate));
app.use(router);
app.use(i18n);
app.use(LoadingPlugin);
app.directive("loading", LoadingDirective);
app.mount("#app");
