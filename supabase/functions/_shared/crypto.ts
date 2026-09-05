function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string): Uint8Array {
  const hex = value.startsWith("\\x") ? value.slice(2) : value;
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) throw new Error("Stored pickup detail is invalid.");
  return Uint8Array.from(hex.match(/.{1,2}/g)!.map((pair) => Number.parseInt(pair, 16)));
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function encryptionKey(): Promise<CryptoKey> {
  const encoded = Deno.env.get("PICKUP_REVEAL_ENCRYPTION_KEY");
  if (!encoded) throw new Error("Pickup reveal encryption is not configured.");
  const raw = base64UrlToBytes(encoded);
  if (raw.byteLength !== 32) throw new Error("Pickup reveal encryption key must be 32 bytes.");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptPickupDetail(plainText: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(), new TextEncoder().encode(plainText)));
  const payload = new Uint8Array(iv.byteLength + encrypted.byteLength);
  payload.set(iv);
  payload.set(encrypted, iv.byteLength);
  return `\\x${bytesToHex(payload)}`;
}

export async function decryptPickupDetail(ciphertext: string): Promise<string> {
  const payload = hexToBytes(ciphertext);
  if (payload.byteLength <= 12) throw new Error("Stored pickup detail is invalid.");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: payload.slice(0, 12) }, await encryptionKey(), payload.slice(12));
  return new TextDecoder().decode(plain);
}
