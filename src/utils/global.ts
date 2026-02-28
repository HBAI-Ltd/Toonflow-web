import { MessagePlugin } from "tdesign-vue-next";

declare global {
  interface Window {
    $message: typeof MessagePlugin;
  }
}

window.$message = MessagePlugin;
