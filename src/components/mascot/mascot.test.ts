import { describe, it, expect } from "vitest";
import { MascotAssets, type MascotMood } from "./mascot-assets";

describe("Phase 18.5: Mascot System Test Suite", () => {
  describe("MascotAssets Provider", () => {
    it("should return valid configuration for all 6 core moods", () => {
      const moods: MascotMood[] = [
        "default",
        "happy",
        "thinking",
        "working",
        "celebrating",
        "warning",
      ];

      moods.forEach((mood) => {
        const config = MascotAssets.getAsset(mood);
        expect(config).toBeDefined();
        expect(config.mood).toBe(mood);
        expect(config.label).toBeTruthy();
        expect(config.imagePath).toContain("/mascot/");
        expect(config.defaultMessage).toBeTruthy();
      });
    });

    it("should fallback gracefully to default asset for invalid/unmatched inputs", () => {
      // @ts-expect-error testing invalid mood runtime safety
      const config = MascotAssets.getAsset("unknown_mood");
      expect(config.mood).toBe("default");
      expect(config.imagePath).toBe("/mascot/default.png");
    });
  });
});
