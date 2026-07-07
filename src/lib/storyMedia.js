export const STORY_IMAGE_LIMIT = 5;
export const STORY_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const STORY_IMAGE_MAX_URL_LENGTH = 2048;

const ALLOWED_DATA_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function isProduction(nodeEnv = process.env.NODE_ENV) {
  return nodeEnv === "production";
}

function estimateBase64Bytes(base64) {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export function isSafeStoryRemoteImageUrl(value) {
  if (typeof value !== "string" || value.length > STORY_IMAGE_MAX_URL_LENGTH) {
    return false;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    return url.hostname === "res.cloudinary.com" || url.hostname.endsWith(".cloudinary.com");
  } catch {
    return false;
  }
}

export function validateStoryImage(value, options = {}) {
  if (isSafeStoryRemoteImageUrl(value)) {
    return { ok: true, value };
  }

  if (typeof value !== "string" || !value.startsWith("data:")) {
    return { ok: false, error: "Stories may only use validated uploaded images" };
  }

  if (isProduction(options.nodeEnv)) {
    return { ok: false, error: "Story images must be uploaded before posting in production" };
  }

  const match = value.match(/^data:([^;,]+);base64,([a-zA-Z0-9+/=]+)$/);
  if (!match || !ALLOWED_DATA_IMAGE_TYPES.has(match[1])) {
    return { ok: false, error: "Unsupported story image type" };
  }

  if (estimateBase64Bytes(match[2]) > STORY_IMAGE_MAX_BYTES) {
    return { ok: false, error: "Story image exceeds the 3 MB limit" };
  }

  return { ok: true, value };
}

export function validateStoryImages(images, options = {}) {
  if (images === undefined || images === null) {
    return { ok: true, images: [] };
  }

  if (!Array.isArray(images)) {
    return { ok: false, error: "Images must be an array of URLs" };
  }

  if (images.length > STORY_IMAGE_LIMIT) {
    return { ok: false, error: `A story can have at most ${STORY_IMAGE_LIMIT} images` };
  }

  const validated = [];
  for (const image of images) {
    const result = validateStoryImage(image, options);
    if (!result.ok) return result;
    validated.push(result.value);
  }

  return { ok: true, images: validated };
}
