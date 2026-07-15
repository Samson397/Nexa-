import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decrypt, encrypt } from "./encryption";

const TEST_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("encryption", () => {
  const prev = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = prev;
  });

  it("roundtrips encrypt/decrypt", () => {
    const plaintext = "oauth-access-token:super-secret-value";
    const payload = encrypt(plaintext);
    expect(payload.split(":")).toHaveLength(3);
    expect(decrypt(payload)).toBe(plaintext);
  });

  it("produces different ciphertexts for the same plaintext (random IV)", () => {
    const a = encrypt("same");
    const b = encrypt("same");
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe("same");
    expect(decrypt(b)).toBe("same");
  });

  it("rejects missing ENCRYPTION_KEY", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt("x")).toThrow(/ENCRYPTION_KEY/);
  });
});
