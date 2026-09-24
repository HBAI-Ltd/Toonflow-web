import { z } from "zod";

const requiredText = z.string().trim().min(1, "不得为空");
const finiteNonNegative = z.number().finite().nonnegative();

export const ScriptShotSchema = z.object({
  number: z.number().int().positive(),
  title: requiredText,
  estimatedDurationSeconds: z.number().finite().positive(),
  claimIds: z.array(requiredText),
  evidenceType: requiredText,
  voiceover: requiredText,
  visual: requiredText,
  visualFunction: requiredText,
  motion: requiredText,
  soundEffects: z.string().trim(),
}).strict();

export const ScriptSectionSchema = z.object({
  id: requiredText,
  title: requiredText,
  estimatedDurationSeconds: finiteNonNegative,
  shots: z.array(ScriptShotSchema).min(1, "每个 Section 至少包含一个镜头"),
}).strict();

export const ScriptOverviewSchema = z.object({
  knowledgeStructure: requiredText,
  narrativeStance: requiredText,
  coreQuestion: requiredText,
  coreConclusion: requiredText,
  voiceStyle: requiredText,
  estimatedDurationSeconds: finiteNonNegative,
  voiceWordCount: z.number().int().nonnegative(),
  shotCount: z.number().int().nonnegative(),
}).strict();

export const StructuredScriptSchema = z.object({
  schemaVersion: z.literal(1),
  title: requiredText,
  overview: ScriptOverviewSchema,
  sections: z.array(ScriptSectionSchema).min(1, "至少包含一个 Section"),
}).strict().superRefine((script, ctx) => {
  const sectionIds = new Set<string>();
  const shotNumbers: number[] = [];
  script.sections.forEach((section, sectionIndex) => {
    if (sectionIds.has(section.id)) {
      ctx.addIssue({
        code: "custom",
        path: ["sections", sectionIndex, "id"],
        message: "Section ID 不得重复",
      });
    }
    sectionIds.add(section.id);
    section.shots.forEach((shot) => shotNumbers.push(shot.number));
  });
  shotNumbers.forEach((number, index) => {
    if (number !== index + 1) {
      ctx.addIssue({
        code: "custom",
        path: ["sections"],
        message: "镜头编号必须从 1 开始连续递增",
      });
    }
  });
});

export type ScriptShot = z.infer<typeof ScriptShotSchema>;
export type ScriptSection = z.infer<typeof ScriptSectionSchema>;
export type ScriptOverview = z.infer<typeof ScriptOverviewSchema>;
export type StructuredScript = z.infer<typeof StructuredScriptSchema>;

function formatPath(path: PropertyKey[]): string {
  let formatted = "";
  for (const segment of path) {
    if (typeof segment === "number") formatted += `[${segment}]`;
    else formatted += formatted ? `.${String(segment)}` : String(segment);
  }
  return formatted || "剧本";
}

export function formatStructuredScriptError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${formatPath(issue.path)}：${issue.message}`)
    .join("；");
}

export function parseStructuredScriptJson(text: string): StructuredScript {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new Error(`剧本 JSON 语法错误：${error instanceof Error ? error.message : String(error)}`);
  }
  const result = StructuredScriptSchema.safeParse(value);
  if (!result.success) throw new Error(formatStructuredScriptError(result.error));
  return result.data;
}

export function formatStructuredScriptJson(value: StructuredScript): string {
  return JSON.stringify(value, null, 2);
}
