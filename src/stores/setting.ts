export default defineStore(
  "setting",
  () => {
    const baseUrl = ref<string>("http://localhost:60000");
    const wsBaseUrl = ref<string>("ws://localhost:60000");

    const otherSetting = ref({
      axiosTimeOut: 60 * 10 * 1000,
      assetsBatchGenereateSize: 5,
      videoBatchGenereateSize: 4,
    });

    const themeSetting = ref({
      mode: "light" as "light" | "dark" | "auto",
      primaryColor: "#9810fa",
    });

    return { baseUrl, wsBaseUrl, otherSetting, themeSetting };
  },
  { persist: true },
);
