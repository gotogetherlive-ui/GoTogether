# Server-managed chat encryption

Trip chats use automatic server-managed encryption. Users sign in normally on any device; there is no encryption-account setup, chat password, recovery code, or device approval. A single centered notice says “Messages are encrypted.” This must not be described as end-to-end encryption: the application server can decrypt messages after checking membership.

## Storage and access

`src/lib/chatServerEncryption.js` uses Node's AES-256-GCM with a fresh random 12-byte nonce and 16-byte authentication tag for every message. Additional authenticated data binds the message ID, trip ID and sender ID. Copying ciphertext into a different message context or modifying it fails authentication.

`CHAT_ENCRYPTION_KEY` contains 32 random bytes encoded as 64 hexadecimal characters. It is server-only and is stored separately from the database. Missing or invalid configuration fails closed: messages are never silently stored as plaintext. Never generate a new key during application startup. All instances need the same configured key; back it up securely. Key rotation requires decrypting and re-encrypting existing rows with both keys available, rather than simply changing this variable.

New member messages and system trip updates use `encryption_version = 2`. Authorization happens before decrypting chat messages or returning previews. Sender/trip metadata is not encrypted. TLS must protect traffic in production. Chat-list previews are decrypted on the server for authorized members. Notification popups display "Encrypted message received"; their endpoints return no message content.

Member removal, reporting, online status, emojis, date separators and seven-day chat closure continue to work. Removed members lose API access; they cannot be forced to forget messages already received.

## Existing history

- Version 0: previous plaintext history, readable until migrated.
- Version 1: the previous OpenPGP end-to-end format. Its private keys were never held by the server, so it cannot be automatically decrypted. Preserve this ciphertext and its account-key records; do not delete or falsely mark it converted. The UI shows a clear legacy placeholder if such a row exists. Recovery would require its original user-controlled key.
- Version 2: server-managed encrypted message.

The current development database had nine version-0 messages and no version-1 messages when this change was implemented. Those nine were encrypted and round-trip verified.

Run `node scripts/encrypt-existing-chat-messages.mjs --check` to inspect counts without exposing content. With the key configured, `node scripts/encrypt-existing-chat-messages.mjs` migrates version-0 rows in verified transaction batches. It leaves version-1 and version-2 rows untouched. Historical database backups containing plaintext are not retroactively encrypted.

## Validation

Unit tests cover unique nonces, text and emoji round trips, tampering, wrong keys, message-context binding, missing-key failures and legacy formats. The browser integration test covers two users, access from another browser without encryption setup, encrypted database storage, readable previews, member removal and closure.

This implementation has not undergone an independent security audit. Server compromise or exposure of the application encryption key can expose stored messages.
