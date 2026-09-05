import { describe, expect, it } from "vitest";
import { isSafeBrowserProjectKey } from "./supabase";

describe("isSafeBrowserProjectKey", () => {
  it("allows current publishable keys and rejects secret keys", () => {
    expect(isSafeBrowserProjectKey("sb_publishable_example")).toBe(true);
    expect(isSafeBrowserProjectKey("sb_secret_example")).toBe(false);
  });

  it("accepts only legacy keys whose role is anon", () => {
    const anon = "eyJhbGciOiJub25lIn0.eyJyb2xlIjoiYW5vbiJ9.signature";
    const service = "eyJhbGciOiJub25lIn0.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature";

    expect(isSafeBrowserProjectKey(anon)).toBe(true);
    expect(isSafeBrowserProjectKey(service)).toBe(false);
  });
});
