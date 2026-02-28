import { useStorage } from "@vueuse/core";

// 主题设置类型
interface ThemeSetting {
  mode: "light" | "dark" | "auto";
  primaryColor: string;
}

// 使用 VueUse 的 useStorage 进行本地存储缓存
export const themeSetting = useStorage<ThemeSetting>("theme-setting", {
  mode: "light",
  primaryColor: "#9810fa",
});

// HEX 转 HSL
const hexToHsl = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0,
    s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

// HSL 转 HEX
const hslToHex = (h: number, s: number, l: number) => {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// 生成品牌色阶
const generateColorPalette = (hex: string) => {
  const { h, s, l } = hexToHsl(hex);
  const lightLevels = [97, 92, 85, 75, 62, l, Math.max(l - 12, 20), Math.max(l - 24, 15), Math.max(l - 36, 10), Math.max(l - 48, 5)];
  return lightLevels.map((level) => hslToHex(h, s, level));
};

// 应用主题模式
export const applyThemeMode = (mode: string) => {
  const targetMode = mode === "auto" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : mode;

  // 方式 1：使用 theme-mode 属性
  if (targetMode === "dark") {
    document.documentElement.setAttribute("theme-mode", "dark");
  } else {
    document.documentElement.removeAttribute("theme-mode");
  }

  // 方式 2：使用 dark 类名
  if (targetMode === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
};

// 应用主题色
export const applyThemeColor = (color: string) => {
  const root = document.documentElement;
  const palette = generateColorPalette(color);
  const isDark = root.getAttribute("theme-mode") === "dark";
  const colors = isDark ? [...palette].reverse() : palette;

  colors.forEach((c, i) => root.style.setProperty(`--td-brand-color-${i + 1}`, c));

  ["", "-hover:5", "-focus:2", "-active:7", "-disabled:3", "-light:1", "-light-hover:2"].forEach((suffix) => {
    const [name, level] = suffix.split(":");
    root.style.setProperty(`--td-brand-color${name}`, level ? `var(--td-brand-color-${level})` : "var(--td-brand-color-6)");
  });

  root.style.setProperty("--td-text-color-brand", `var(--td-brand-color-${isDark ? 8 : 7})`);
  root.style.setProperty("--td-text-color-link", "var(--td-brand-color-8)");
};

// 使用 View Transition API 进行平滑过渡
export const toggleThemeWithTransition = (event: MouseEvent | undefined, callback: () => void) => {
  if (!document.startViewTransition) {
    callback();
    return;
  }

  const x = event?.clientX ?? window.innerWidth / 2;
  const y = event?.clientY ?? window.innerHeight / 2;
  const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  const root = document.documentElement;
  root.style.setProperty("--x", `${x}px`);
  root.style.setProperty("--y", `${y}px`);
  root.style.setProperty("--r", `${endRadius}px`);

  document.startViewTransition(callback);
};

// 初始化主题（在 App.vue 中调用）
export const initTheme = () => {
  // 应用缓存的主题设置
  applyThemeMode(themeSetting.value.mode);
  applyThemeColor(themeSetting.value.primaryColor);

  // 监听系统主题变化
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (themeSetting.value.mode === "auto") {
      toggleThemeWithTransition(undefined, () => {
        const targetMode = e.matches ? "dark" : "light";

        if (targetMode === "dark") {
          document.documentElement.setAttribute("theme-mode", "dark");
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.removeAttribute("theme-mode");
          document.documentElement.classList.remove("dark");
        }

        applyThemeColor(themeSetting.value.primaryColor);
      });
    }
  });
};

// 导出 composable 供组件使用
export const useTheme = () => {
  return {
    themeSetting,
    applyThemeMode,
    applyThemeColor,
    toggleThemeWithTransition,
  };
};
