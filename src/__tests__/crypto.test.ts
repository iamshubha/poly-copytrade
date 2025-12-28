import { describe, it, expect } from "@jest/globals";
import { encrypt, decrypt, hash, generateNonce } from "@/lib/crypto";

describe("Crypto Utils", () => {
  it("should encrypt and decrypt text correctly", () => {
    const text = "test-secret-data";
    const encrypted = encrypt(text);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(text);
    expect(encrypted).not.toBe(text);
  });

  it("should generate consistent hash", () => {
    const text = "test-data";
    const hash1 = hash(text);
    const hash2 = hash(text);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
  });

  it("should generate unique nonces", () => {
    const nonce1 = generateNonce();
    const nonce2 = generateNonce();

    expect(nonce1).not.toBe(nonce2);
    expect(nonce1).toHaveLength(32); // 16 bytes = 32 hex characters
  });
});
