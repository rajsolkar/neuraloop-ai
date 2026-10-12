import { describe, it, expect } from "vitest";
import { IfExecutor } from "../if";
import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext } from "../../types";

describe("Production IfExecutor Test Suite", () => {
  const dummyNode: WorkflowNode = {
    id: "if_test_1",
    type: "neuraloop-node",
    position: { x: 0, y: 0 },
    data: {
      definitionId: "if",
      label: "Condition Node",
      description: "Tests IfExecutor",
      category: "logic",
      config: {},
    },
  };

  const dummyContext: ExecutionContext = {
    workflowId: "wf_test_1",
    workflowVersionId: "ver_test_1",
    versionNumber: 1,
    executionId: "exec_test_1",
    input: {},
    nodeOutputs: {},
    nodeInputs: {},
    nodeStatuses: {},
    metadata: {},
  };

  describe("1. actualValue in output payload & Timeline UI compatibility", () => {
    it("returns boolean false as actualValue and selects false handle", async () => {
      const node: WorkflowNode = {
        ...dummyNode,
        data: {
          ...dummyNode.data,
          config: {
            condition: {
              field: "steps.ai-1.json.isUrgent",
              operator: "is_true",
              value: "true",
            },
          },
        },
      };

      const context: ExecutionContext = {
        ...dummyContext,
        nodeOutputs: {
          "ai-1": {
            json: { isUrgent: false, summary: "Routine log message" },
          },
        },
      };

      const res = await IfExecutor.execute(node, {}, context);
      expect(res.status).toBe("success");
      expect(res.selectedHandle).toBe("false");
      expect(res.output?.result).toBe(false);
      expect(res.output?.actualValue).toBe(false);
      expect(res.output?.selectedBranch).toBe("false");
    });

    it("returns boolean true as actualValue and selects true handle", async () => {
      const node: WorkflowNode = {
        ...dummyNode,
        data: {
          ...dummyNode.data,
          config: {
            condition: {
              field: "steps.ai-1.json.isUrgent",
              operator: "is_true",
              value: "true",
            },
          },
        },
      };

      const context: ExecutionContext = {
        ...dummyContext,
        nodeOutputs: {
          "ai-1": {
            json: { isUrgent: true, summary: "Database disk full" },
          },
        },
      };

      const res = await IfExecutor.execute(node, {}, context);
      expect(res.status).toBe("success");
      expect(res.selectedHandle).toBe("true");
      expect(res.output?.result).toBe(true);
      expect(res.output?.actualValue).toBe(true);
      expect(res.output?.selectedBranch).toBe("true");
    });

    it("returns 'N/A' when target field does not exist and evaluates to false", async () => {
      const node: WorkflowNode = {
        ...dummyNode,
        data: {
          ...dummyNode.data,
          config: {
            condition: {
              field: "steps.ai-1.json.nonExistentField",
              operator: "is_true",
            },
          },
        },
      };

      const context: ExecutionContext = {
        ...dummyContext,
        nodeOutputs: {
          "ai-1": { json: { otherField: "val" } },
        },
      };

      const res = await IfExecutor.execute(node, {}, context);
      expect(res.status).toBe("success");
      expect(res.selectedHandle).toBe("false");
      expect(res.output?.actualValue).toBe("N/A");
      expect(res.output?.result).toBe(false);
    });
  });

  describe("2. Boolean is_true and is_false operator rigor", () => {
    it("handles is_false correctly with boolean false", async () => {
      const node: WorkflowNode = {
        ...dummyNode,
        data: {
          ...dummyNode.data,
          config: {
            condition: {
              field: "isFailed",
              operator: "is_false",
            },
          },
        },
      };

      const res = await IfExecutor.execute(node, { isFailed: false }, dummyContext);
      expect(res.selectedHandle).toBe("true");
      expect(res.output?.result).toBe(true);
      expect(res.output?.actualValue).toBe(false);
    });

    it("handles is_false with string 'false'", async () => {
      const node: WorkflowNode = {
        ...dummyNode,
        data: {
          ...dummyNode.data,
          config: {
            condition: {
              field: "flag",
              operator: "is_false",
            },
          },
        },
      };

      const res = await IfExecutor.execute(node, { flag: "false" }, dummyContext);
      expect(res.selectedHandle).toBe("true");
      expect(res.output?.result).toBe(true);
    });

    it("does NOT evaluate missing/undefined property as false for is_false", async () => {
      const node: WorkflowNode = {
        ...dummyNode,
        data: {
          ...dummyNode.data,
          config: {
            condition: {
              field: "completelyMissingProperty",
              operator: "is_false",
            },
          },
        },
      };

      const res = await IfExecutor.execute(node, {}, dummyContext);
      expect(res.selectedHandle).toBe("false");
      expect(res.output?.result).toBe(false);
      expect(res.output?.actualValue).toBe("N/A");
    });
  });

  describe("3. Comparison and string operators", () => {
    it("evaluates string starts_with and ends_with", async () => {
      const node: WorkflowNode = {
        ...dummyNode,
        data: {
          ...dummyNode.data,
          config: {
            condition: {
              field: "alert",
              operator: "starts_with",
              value: "heavy",
            },
          },
        },
      };

      const res = await IfExecutor.execute(node, { alert: "heavy rain warning" }, dummyContext);
      expect(res.selectedHandle).toBe("true");
      expect(res.output?.result).toBe(true);
      expect(res.output?.actualValue).toBe("heavy rain warning");
    });

    it("evaluates number between operator", async () => {
      const node: WorkflowNode = {
        ...dummyNode,
        data: {
          ...dummyNode.data,
          config: {
            condition: {
              field: "leadScore",
              operator: "between",
              value: "50",
              secondValue: "100",
            },
          },
        },
      };

      const res = await IfExecutor.execute(node, { leadScore: 95 }, dummyContext);
      expect(res.selectedHandle).toBe("true");
      expect(res.output?.result).toBe(true);
      expect(res.output?.actualValue).toBe(95);
    });

    it("evaluates variable-to-variable comparisons", async () => {
      const node: WorkflowNode = {
        ...dummyNode,
        data: {
          ...dummyNode.data,
          config: {
            condition: {
              field: "{{budget}}",
              operator: "greater_than",
              value: "{{minimumBudget}}",
            },
          },
        },
      };

      const res = await IfExecutor.execute(node, { budget: 10000, minimumBudget: 5000 }, dummyContext);
      expect(res.selectedHandle).toBe("true");
      expect(res.output?.result).toBe(true);
    });
  });

  describe("4. Advanced mode expression evaluation", () => {
    it("evaluates compound logical expressions in advanced mode", async () => {
      const node: WorkflowNode = {
        ...dummyNode,
        data: {
          ...dummyNode.data,
          config: {
            mode: "advanced",
            expression: '{{leadScore}} > 80 && {{country}} == "India"',
          },
        },
      };

      const res = await IfExecutor.execute(node, { leadScore: 95, country: "India" }, dummyContext);
      expect(res.selectedHandle).toBe("true");
      expect(res.output?.result).toBe(true);
      expect(res.output?.actualValue).toBe('95 > 80 && India == "India"');
    });

    it("evaluates contains() helper in advanced mode", async () => {
      const node: WorkflowNode = {
        ...dummyNode,
        data: {
          ...dummyNode.data,
          config: {
            mode: "advanced",
            expression: "contains('critical system outage', 'critical')",
          },
        },
      };

      const res = await IfExecutor.execute(node, {}, dummyContext);
      expect(res.selectedHandle).toBe("true");
      expect(res.output?.result).toBe(true);
    });
  });
});
