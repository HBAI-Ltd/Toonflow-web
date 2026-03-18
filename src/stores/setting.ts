export default defineStore(
  "setting",
  () => {
    const showSetting = ref(false);

    const baseUrl = ref<string>("http://localhost:60000/api");
    const wsBaseUrl = ref<string>("ws://localhost:60000/api");

    const otherSetting = ref({
      axiosTimeOut: 60 * 10 * 1000,
      assetsBatchGenereateSize: 5,
      chapterReg: "/第\s*([0-9０-９零一二三四五六七八九十百千万]+)\s*[章回节]\s*([^\n\r]*)/g",
    });

    const themeSetting = ref({
      mode: "light" as "light" | "dark" | "auto",
      primaryColor: "#000",
    });

    return { showSetting, baseUrl, wsBaseUrl, otherSetting, themeSetting };
  },
  { persist: true },
);
