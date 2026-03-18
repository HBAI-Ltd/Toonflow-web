import { MessagePlugin } from "tdesign-vue-next";

declare global {
  interface Window {
    $message: typeof MessagePlugin;
    $electron: boolean;
  }
}

window.$message = MessagePlugin;

window.$electron = true;
