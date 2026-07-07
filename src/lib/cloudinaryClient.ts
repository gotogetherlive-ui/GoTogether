type ImageUploadProfile = {
  maxWidth: number;
  maxHeight: number;
  quality: number;
};

const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

function imageProfileForFolder(folder: string): ImageUploadProfile {
  if (folder.includes("avatars") || folder.includes("businesses")) {
    return { maxWidth: 512, maxHeight: 512, quality: 0.75 };
  }

  if (folder.includes("stories")) {
    return { maxWidth: 1280, maxHeight: 1280, quality: 0.75 };
  }

  return { maxWidth: 1600, maxHeight: 1600, quality: 0.75 };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function canvasToDataUrl(canvas: HTMLCanvasElement, quality: number): string {
  const webp = canvas.toDataURL("image/webp", quality);
  if (webp.startsWith("data:image/webp")) return webp;
  return canvas.toDataURL("image/jpeg", quality);
}

async function compressImageFile(file: File, folder: string): Promise<string> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
    return fileToDataUrl(file);
  }

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = sourceUrl;
    });

    const profile = imageProfileForFolder(folder);
    const scale = Math.min(1, profile.maxWidth / image.width, profile.maxHeight / image.height);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return fileToDataUrl(file);

    ctx.drawImage(image, 0, 0, width, height);
    return canvasToDataUrl(canvas, profile.quality);
  } catch (err) {
    console.warn("[CloudinaryClient] Falling back to original image upload", err);
    return fileToDataUrl(file);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

/**
 * Client-side Cloudinary upload helper.
 * Images are resized/compressed in the browser before they are sent to /api/upload,
 * which reduces the original asset size stored in Cloudinary.
 */
export async function uploadToCloudinary(fileOrDataUrl: File | string, folder: string): Promise<string> {
  try {
    let dataUrl = typeof fileOrDataUrl === "string" ? fileOrDataUrl : "";
    if (fileOrDataUrl instanceof File) {
      if (fileOrDataUrl.size > MAX_UPLOAD_BYTES) throw new Error("File exceeds 6 MB");
      dataUrl = await compressImageFile(fileOrDataUrl, folder);
    }

    const uploadRes = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl, folder }),
    });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");
    return uploadData.url;
  } catch (err) {
    console.error("[CloudinaryClient] Upload error:", err);
    if (typeof fileOrDataUrl === "string") {
      return fileOrDataUrl;
    }
    throw err;
  }
}