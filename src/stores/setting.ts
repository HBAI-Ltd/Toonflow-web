export default defineStore(
  "setting",
  () => {
    const showSetting = ref(false);

    const baseUrl = ref<string>("http://localhost:10588/api");
    const wsBaseUrl = ref<string>("ws://localhost:10588/api");

    const otherSetting = ref({
      axiosTimeOut: 60 * 10 * 1000,
      assetsBatchGenereateSize: 5,
      chapterReg: "/第\s*([0-9０-９零一二三四五六七八九十百千万]+)\s*[章回节]\s*([^\n\r]*)/g",
    });

    const themeSetting = ref({
      mode: "light" as "light" | "dark" | "auto",
      primaryColor: "#000",
    });

    const language = ref<string>("zh-CN");

    return { showSetting, baseUrl, wsBaseUrl, otherSetting, themeSetting, language };
  },
  { persist: true },
);
