<script lang="ts">
import { defineComponent, h } from "vue";

export default defineComponent({
  name: "SettingErrorBoundary",
  props: {
    resetKey: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      errorMessage: "",
    };
  },
  watch: {
    resetKey() {
      this.errorMessage = "";
    },
  },
  errorCaptured(error: unknown) {
    this.errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[setting page crashed]", error);
    return false;
  },
  render() {
    if (this.errorMessage) {
      return h("div", { class: "settingError" }, [
        h("p", "当前设置页渲染失败，已隔离，不会影响其它菜单。"),
        h("pre", this.errorMessage),
      ]);
    }
    return this.$slots.default?.();
  },
});
</script>

<style scoped>
.settingError {
  color: #d54941;
}
.settingError pre {
  white-space: pre-wrap;
  background: #f7f7f7;
  padding: 8px;
  border-radius: 4px;
}
</style>
