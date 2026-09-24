export function getSaveScriptErrorMessage(error: unknown): string {
  const response = (error as { response?: { data?: { message?: unknown } } }).response;
  if (typeof response?.data?.message === "string" && response.data.message) return response.data.message;
  if (typeof (error as { message?: unknown })?.message === "string" && (error as { message: string }).message) {
    return (error as { message: string }).message;
  }
  return error instanceof Error ? error.message : String(error);
}
