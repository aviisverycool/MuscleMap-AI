import { describe, expect, it } from "vitest";
import { getAccountPreferences } from "./preferences";

describe("getAccountPreferences", () => {
  it("normalizes saved values before showing workout preferences", () => {
    expect(getAccountPreferences({
      fitness_preferences: {
        units: " IMPERIAL ",
        equipment: [" Dumbbells ", "bench", "DUMBBELLS", { invalid: true }],
        memory_enabled: "false",
      },
    })).toEqual({
      units: "imperial",
      equipment: ["dumbbells", "bench"],
      memory_enabled: false,
    });
  });

  it("preserves the distinction between unspecified and bodyweight-only equipment", () => {
    expect(getAccountPreferences({ fitness_preferences: { equipment: null } }).equipment).toBeNull();
    expect(getAccountPreferences({ fitness_preferences: { equipment: [] } }).equipment).toEqual([]);
  });
});
