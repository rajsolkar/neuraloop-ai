import { describe, expect, it } from "vitest";
import { resolveExpression, resolvePropertyPath } from "./expression";

describe("Phase 4 Expression Resolver", () => {
  it("resolves nested property paths", () => {
    const data = {
      lead: {
        score: 95,
        user: { name: "Raj" },
      },
    };

    expect(resolvePropertyPath(data, "lead.score")).toBe(95);
    expect(resolvePropertyPath(data, "lead.user.name")).toBe("Raj");
    expect(resolvePropertyPath(data, "lead.missing")).toBeUndefined();
  });

  it("replaces template tags in strings", () => {
    const data = {
      name: "Raj",
      score: 95,
    };

    expect(resolveExpression("Hello {{name}}, your score is {{score}}!", data)).toBe(
      "Hello Raj, your score is 95!",
    );
  });
});
