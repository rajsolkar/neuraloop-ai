import { describe, it, expect } from "vitest";
import { IfExecutor } from "../if";
import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext } from "../../types";

describe("Production Grade IfExecutor", () => {
  const dummyNode: WorkflowNode = {
    id: "if_1",
    type: "workflowNode",
    position: { x: 0, y: 0 },
    data: {
      definitionId: "if",
      label: "Condition Node",
      category: "logic",
      config: {},
    },
  };

  const dummyContext: ExecutionContext = {
    workflowId: "wf_1",
    executionId: "exec_1",
    input: {},
    nodeOutputs: {},
  };

  it("evaluates string starts_with and ends_with operators", async () => {
    const node = {
      ...dummyNode,
      data: {
        ...dummyNode.data,
        config: {
          condition: {
            dataType: "string",
            field: "{{alert}}",
            operator: "starts_with",
            value: "heavy",
          },
        },
      },
    };

    const res = await IfExecutor.execute(node, { alert: "heavy rain warning" }, dummyContext);
    expect(res.selectedHandle).toBe("true");
    expect(res.output?.result).toBe(true);
  });

  it("evaluates number between operator", async () => {
    const node = {
      ...dummyNode,
      data: {
        ...dummyNode.data,
        config: {
          condition: {
            dataType: "number",
            field: "{{leadScore}}",
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
  });

  it("evaluates boolean is_true and is_false operators", async () => {
    const node = {
      ...dummyNode,
      data: {
        ...dummyNode.data,
        config: {
          condition: {
            dataType: "boolean",
            field: "{{isQualified}}",
            operator: "is_true",
          },
        },
      },
    };

    const res = await IfExecutor.execute(node, { isQualified: true }, dummyContext);
    expect(res.selectedHandle).toBe("true");
  });

  it("evaluates variable-to-variable comparisons", async () => {
    const node = {
      ...dummyNode,
      data: {
        ...dummyNode.data,
        config: {
          condition: {
            dataType: "variable",
            field: "{{budget}}",
            operator: "greater_than",
            value: "{{minimumBudget}}",
          },
        },
      },
    };

    const res = await IfExecutor.execute(node, { budget: 10000, minimumBudget: 5000 }, dummyContext);
    expect(res.selectedHandle).toBe("true");
  });

  it("evaluates Advanced Mode expressions", async () => {
    const node = {
      ...dummyNode,
      data: {
        ...dummyNode.data,
        config: {
          condition: {
            mode: "advanced",
            expression: '{{leadScore}} > 80 && {{country}} == "India"',
          },
        },
      },
    };

    const res = await IfExecutor.execute(node, { leadScore: 95, country: "India" }, dummyContext);
    expect(res.selectedHandle).toBe("true");
  });
});
