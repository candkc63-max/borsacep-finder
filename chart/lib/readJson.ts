export function parseJsonResponse(text: string, contentType: string, status: number): unknown {
  if (!contentType.toLowerCase().includes("json")) {
    const detail = text.replace(/\s+/g, " ").trim().slice(0, 160);
    throw new Error(detail || `Sunucu ${status} döndü`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Sunucu yanıtı JSON değil");
  }
}
