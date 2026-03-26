import axios from "@/utils/axios";
import { NotifyPlugin, Progress } from "tdesign-vue-next";
import { h, ref } from "vue";
import { storeToRefs } from "pinia";
import settingStore from "@/stores/setting";

// 延迟函数
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async () => {
  const { showSetting, activeMenu } = storeToRefs(settingStore());

  const progressValue = ref(0);
  // 显示进度通知
  const notifyInstance = NotifyPlugin.info({
    title: "🔍 正在解析加载Skill",
    content: () =>
      h("div", { style: "width: 100%; padding-top: 10px;" }, [
        h(Progress, {
          percentage: progressValue.value,
          status: progressValue.value >= 100 ? "success" : "active",
        }),
      ]),
    duration: 0,
    closeBtn: true,
  });
  try {
    const [{ data }] = await Promise.all([
      axios.post("/setting/skillManagement/scanSkills"),
      (async () => {
        for (let i = 1; i <= 10; i++) {
          await delay(100);
          progressValue.value = i * 9;
        }
      })(),
    ]);
    progressValue.value = 100;
    await delay(300);
    NotifyPlugin.close(notifyInstance);
    // 成功通知
    const changes = [
      data.insertedCount && `✅ 新增${data.insertedCount}个Skill`,
      data.updatedCount && `🔄 更新${data.updatedCount}个Skill`,
      data.removedCount && `🗑️ 移除${data.removedCount}个Skill`,
    ].filter(Boolean);
    NotifyPlugin.success({
      title: "✨ Skill 扫描完成",
      content: `📁 扫描 ${data.totalFiles} 个文件 | ${changes.join(" | ")}`,
    });
    // 警告通知
    if (data.noDescriptionSkillCount > 0 || data.noAttributionSkillCount > 0) {
      const warnings = [];
      if (data.noDescriptionSkillCount > 0) {
        warnings.push(`📝 ${data.noDescriptionSkillCount}个Skill缺少描述`);
      }
      if (data.noAttributionSkillCount > 0) {
        warnings.push(`👤 ${data.noAttributionSkillCount}个Skill缺少归属`);
      }
      const warningNotifyInstance = NotifyPlugin.warning({
        title: "⚠️ Skill 配置警告",
        content: warnings.join(" | "),
        footer: () =>
          h(
            "div",
            { style: "text-align: right; padding-top: 4px;" },
            h(
              "span",
              {
                style: "color: #ed7b2f; font-size: 12px; cursor: pointer;",
                onClick: () => {
                  activeMenu.value = "skillManagement";
                  showSetting.value = true;
                  NotifyPlugin.close(warningNotifyInstance);
                },
              },
              window.$t("common.openSettings"),
            ),
          ),
        duration: 6000,
        closeBtn: true,
      });
    }
  } catch (error) {
    NotifyPlugin.close(notifyInstance);
    NotifyPlugin.error({
      title: "❌ 扫描失败",
      content: "🔌 请检查网络连接或稍后重试",
      footer: () =>
        h("div", { style: "text-align: right; padding-top: 4px;" }, h("span", { style: "color: #e34d59; font-size: 12px;" }, "🔁 请稍后重试")),
      duration: 3000,
      closeBtn: true,
    });
  }
};
