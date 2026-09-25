import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/** @typedef {{ id: string, trip_id: string, sender_id: string }} MessageContext */

function getKey() {
  const value = process.env.CHAT_ENCRYPTION_KEY?.trim();
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) {
    throw Object.assign(new Error('CHAT_ENCRYPTION_KEY must be a securely stored 64-character hexadecimal key.'), { code: 'CHAT_ENCRYPTION_UNAVAILABLE' });
  }
  return Buffer.from(value, 'hex');
}

/** @param {MessageContext} context */
function associatedData(context) {
  return Buffer.from(JSON.stringify(['gotogether-chat', 2, context.id, context.trip_id, context.sender_id]), 'utf8');
}

/** @param {string} text @param {MessageContext} context */
export function encryptStoredChatMessage(text, context) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  cipher.setAAD(associatedData(context));
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return ['gtchat', 'v2', iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join(':');
}

/** @param {string} stored @param {MessageContext} context */
export function decryptStoredChatMessage(stored, context) {
  const [prefix, version, iv, tag, ciphertext, extra] = stored.split(':');
  if (prefix !== 'gtchat' || version !== 'v2' || !iv || !tag || ciphertext === undefined || extra !== undefined) throw new Error('Invalid encrypted chat message');
  const nonce = Buffer.from(iv, 'base64');
  const authenticationTag = Buffer.from(tag, 'base64');
  if (nonce.length !== 12 || authenticationTag.length !== 16) throw new Error('Invalid encrypted chat message');
  const decipher = createDecipheriv('aes-256-gcm', getKey(), nonce);
  decipher.setAAD(associatedData(context));
  decipher.setAuthTag(authenticationTag);
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
}

/** @param {MessageContext & { message: string, encryption_version?: number }} row */
export function readStoredChatMessage(row) {
  if (row.encryption_version === 2) return decryptStoredChatMessage(row.message, row);
  if (row.encryption_version === 1) return 'This older message uses the previous encryption system and requires its original key.';
  if (row.encryption_version && row.encryption_version !== 0) throw new Error('Unsupported chat encryption format');
  return row.message;
}
