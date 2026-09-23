import { describe, it, expect } from "vitest";
import { resolveVariables } from "./resolve-variable";

describe("Universal Variable Resolver Engine", () => {
  it("resolves top-level variables", () => {
    const res = resolveVariables("Hello {{name}}, welcome to {{company}}!", {
      name: "Alice",
      company: "Acme Corp",
    });
    expect(res).toBe("Hello Alice, welcome to Acme Corp!");
  });

  it("resolves nested property paths", () => {
    const payload = {
      trigger: {
        body: { email: "alice@acme.com", budget: 5000 },
      },
      workflow: { id: "wf_123" },
    };
    const res = resolveVariables("Email: {{trigger.body.email}}, WF: {{workflow.id}}", payload);
    expect(res).toBe("Email: alice@acme.com, WF: wf_123");
  });

  it("handles default sample fallbacks when variables are missing in empty payload", () => {
    const res = resolveVariables("Lead {{name}} from {{company}} has budget {{budget}}");
    expect(res).toBe("Lead Raj Solkar from Neuraloop AI has budget $10,000");
  });

  it("resolves objects to JSON string", () => {
    const res = resolveVariables("Data: {{address}}", { address: { city: "NYC" } });
    expect(res).toBe('Data: {"city":"NYC"}');
  });

  it("returns unchanged text when no variables present", () => {
    expect(resolveVariables("Plain text without tags")).toBe("Plain text without tags");
  });
});
