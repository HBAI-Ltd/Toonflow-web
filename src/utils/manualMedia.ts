export interface ManualImagePromptInput {
  name?: string | null;
  category?: string | null;
  prompt?: string | null;
  description?: string | null;
  artStyle?: string | null;
  aspectRatio?: string | null;
  resolution?: string | null;
  referenceCount?: number;
}

export interface ManualVideoPromptInput {
  name?: string | null;
  prompt?: string | null;
  duration?: number | null;
  aspectRatio?: string | null;
  resolution?: string | null;
  mode?: string | null;
  audio?: boolean;
  references?: Array<{
    fileType?: string;
    name?: string;
    prompt?: string;
    sources?: string;
  }>;
}

export interface BatchPromptItem {
  title: string;
  prompt: string;
}

const imageCategoryLabels: Record<string, string> = {
  role: "角色",
  scene: "场景",
  tool: "道具",
  props: "道具",
  storyboard: "分镜",
};

function text(value: unknown, fallback = "未指定"): string {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

export function buildManualImagePrompt(input: ManualImagePromptInput): string {
  const category = imageCategoryLabels[text(input.category, "")] ?? text(input.category, "图片");
  const referenceInstruction =
    (input.referenceCount ?? 0) > 0
      ? `使用 ${input.referenceCount} 张参考图保持主体身份、服装、场景结构和视觉连续性，不要照搬参考图中的瑕疵。`
      : "无参考图，严格依据文字设定生成。";

  return [
    "【图片生成提示词】",
    `用途：${category}图`,
    `名称：${text(input.name)}`,
    `画风：${text(input.artStyle)}`,
    `画幅比例：${text(input.aspectRatio, "跟随项目设置")}`,
    `清晰度：${text(input.resolution, "高质量")}`,
    `参考图要求：${referenceInstruction}`,
    "",
    "【主体与画面要求】",
    text(input.prompt, text(input.description)),
    "",
    "【补充约束】",
    "主体特征前后一致，构图完整，透视与解剖自然，材质和光影符合场景；画面中不要出现水印、Logo、边框、说明文字、乱码或无关元素。",
    "",
    "【负面提示词】",
    "低清晰度、模糊、噪点、过曝、欠曝、畸形、额外肢体、缺失肢体、错误手指、重复主体、比例失衡、透视错误、文字、水印、Logo、边框、拼贴。",
  ].join("\n");
}

export function buildManualVideoPrompt(input: ManualVideoPromptInput): string {
  const references = input.references ?? [];
  const referenceLines = references.length
    ? references.map((item, index) => {
        const typeLabel = item.fileType === "audio" ? "音频" : item.fileType === "video" ? "视频" : "图片";
        const detail = text(item.name || item.prompt, item.sources === "assets" ? "资产素材" : "分镜素材");
        return `- @${typeLabel}${index + 1}：${detail}`;
      })
    : ["- 无参考素材，按纯文本要求生成。"];

  return [
    "【视频生成提示词】",
    `片段：${text(input.name, "当前视频轨道")}`,
    `时长：${input.duration ?? "跟随项目设置"} 秒`,
    `画幅比例：${text(input.aspectRatio, "跟随项目设置")}`,
    `分辨率：${text(input.resolution, "高质量")}`,
    `生成模式：${text(input.mode, "按提示词生成")}`,
    `音频：${input.audio ? "需要生成或保留匹配的声音" : "不要求模型生成音频"}`,
    "",
    "【参考素材对应关系】",
    ...referenceLines,
    "",
    "【完整视频描述】",
    text(input.prompt),
    "",
    "【连续性与输出要求】",
    "保持角色身份、服装、道具、场景和光影连续；动作符合物理规律，镜头运动平稳，首尾衔接自然。不要出现水印、Logo、字幕、乱码、闪烁、跳帧、主体突变、肢体畸变或画面撕裂。",
  ].join("\n");
}

export function buildBatchPrompt(items: BatchPromptItem[]): string {
  return items.map((item, index) => `===== ${index + 1}. ${item.title} =====\n${item.prompt}`).join("\n\n");
}

export async function copyText(content: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(content);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = content;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("读取文件失败"));
    reader.readAsDataURL(file);
  });
}
