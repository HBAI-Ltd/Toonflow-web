import { MessagePlugin } from "tdesign-vue-next";

import i18n from "@/locales";
const { t } = i18n.global;

declare global {
  interface Window {
    $message: typeof MessagePlugin;
    $electron: boolean;
    $port: string;
    $t: typeof t;
  }
}

window.$message = MessagePlugin;

window.$electron = import.meta.env.DEV;

window.$t = t;
