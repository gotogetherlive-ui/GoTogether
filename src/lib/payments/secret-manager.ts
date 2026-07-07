import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getMasterKey(): Buffer {
  const masterKey = process.env.PAYMENTS_MASTER_KEY;
  if (!masterKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("PAYMENTS_MASTER_KEY is required in production");
    }
    return Buffer.from("0123456789abcdef0123456789abcdef", "utf8");
  }
  if (process.env.NODE_ENV === "production" && masterKey.length < 32) {
    throw new Error("PAYMENTS_MASTER_KEY must be at least 32 characters in production");
  }
  return crypto.scryptSync(masterKey, "gotogether_salt", 32);
}

export class SecretManager {
  private static cache = new Map<string, { value: string; expiresAt: number }>();
  private static CACHE_TTL_MS = 60 * 1000; // 1 minute

  static encrypt(plaintext: string): string {
    if (!plaintext) return "";
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getMasterKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
  }

  static decrypt(ciphertext: string): string {
    if (!ciphertext) return "";

    // Check cache
    const cached = this.cache.get(ciphertext);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const parts = ciphertext.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid ciphertext format");
    }
    const [ivHex, tagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const key = getMasterKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, undefined, "utf8");
    decrypted += decipher.final("utf8");

    // Cache the decrypted secret
    this.cache.set(ciphertext, {
      value: decrypted,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return decrypted;
  }

  /**
   * Helper to verify signatures supporting rotated webhook secrets.
   */
  static verifyWithRotatedSecret(
    ciphertext: string | null | undefined,
    verifyFn: (secret: string) => boolean
  ): boolean {
    if (!ciphertext) return false;
    try {
      const decrypted = this.decrypt(ciphertext);
      try {
        const parsed = JSON.parse(decrypted);
        if (parsed && typeof parsed === "object" && "current" in parsed) {
          if (verifyFn(parsed.current)) return true;
          if (parsed.previous && verifyFn(parsed.previous)) return true;
          return false;
        }
      } catch {
        // Fallback to plain string secret
      }
      return verifyFn(decrypted);
    } catch {
      // Safely log without plaintext credentials exposure
      console.error("[SecretManager] Rotated validation decryption error");
      return false;
    }
  }

  static clearCache(): void {
    this.cache.clear();
  }
}

