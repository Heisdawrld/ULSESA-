export interface UploadResult {
  success: boolean;
  dataUrl?: string;
  error?: string;
}

export async function bufferToDataUrl(buffer: Buffer, mimeType: string): Promise<UploadResult> {
  try {
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;
    return { success: true, dataUrl };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Conversion failed",
    };
  }
}

export function getDataUrlMimeType(dataUrl: string): string | null {
  const match = dataUrl.match(/^data:([^;]+);/);
  return match ? match[1] : null;
}

export function isDataUrl(input: string): boolean {
  return input.startsWith("data:");
}
