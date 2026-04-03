import { createI18n } from "vue-i18n";
import { useLocalStorage } from "@vueuse/core";
import zhCN from "./language/zh-CN.json";
import zhTW from "./language/zh-TW.json";
import en from "./language/en.json";
import thTH from "./language/th_TH.json";
import viVN from "./language/vi-VN.json";
import jpJP from "./language/ja_JP.json";
import ruRU from "./language/ru_RU.json";

const languageList = [
  { label: "简体中文", tips: "Chinese (Simplified)", value: "zh-CN" },
  { label: "繁體中文", tips: "Chinese (Traditional)", value: "zh-TW" },
  { label: "English", tips: "English", value: "en" },
  { label: "ไทย", tips: "Thai", value: "th-TH" },
  { label: "Tiếng Việt", tips: "Vietnamese", value: "vi-VN" },
  { label: "日本語", tips: "Japanese", value: "ja-JP" },
  { label: "Русский", tips: "Russian", value: "ru-RU" },
];

const cachedLocale = useLocalStorage("locale", "zh-CN");

const i18n = createI18n({
  legacy: false,
  locale: cachedLocale.value,
  fallbackLocale: "en",
  messages: {
    "zh-CN": zhCN,
    "zh-TW": zhTW,
    en,
    "th-TH": thTH,
    "vi-VN": viVN,
    "ja-JP": jpJP,
    "ru-RU": ruRU,
  },
});

export { languageList, cachedLocale };
export default i18n;
