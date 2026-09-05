import { describe, expect, it } from "vitest";
import { matchTopic } from "./realtime";

describe("matchTopic", () => {
  it("uses a private, namespaced topic for a UUID match", () => {
    expect(matchTopic("d2719cee-4a04-4b7d-8b73-672c9a1d5f10")).toBe("anchor:match:d2719cee-4a04-4b7d-8b73-672c9a1d5f10");
  });

  it("rejects local fixture IDs and injection-shaped topic values", () => {
    expect(() => matchTopic("match-maya-jordan")).toThrow("valid match ID");
    expect(() => matchTopic("d2719cee-4a04-4b7d-8b73-672c9a1d5f10:other")).toThrow("valid match ID");
  });
});
