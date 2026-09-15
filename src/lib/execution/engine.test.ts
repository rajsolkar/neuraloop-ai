import { describe, expect, it } from "vitest";
import { WorkflowEngine } from "./engine";
import { WorkflowService } from "@/lib/workflow/workflow-service";
import { createWorkflowNode } from "@/lib/workflow/create-node";

describe("Phase 4 WorkflowEngine Graph Traversal & Execution", () => {
  it("executes a linear pipeline (Manual Trigger -> Delay) successfully", async () => {
    const trigger = createWorkflowNode("manual-trigger", { x: 0, y: 0 });
    const delay = createWorkflowNode("delay", { x: 200, y: 0 });
    delay.data.config = { duration: 1, unit: "seconds" };

    const edge = { id: "e1", source: trigger.id, target: delay.id, sourceHandle: "out", targetHandle: "in" };

    const workflow = await WorkflowService.createWorkflow({
      name: "Test Linear Pipeline",
      nodes: [trigger, delay],
      edges: [edge],
    });

    const execution = await WorkflowEngine.executeWorkflow({
      workflowId: workflow.id,
      input: { test: 123 },
    });

    expect(execution.status).toBe("success");
    expect(execution.nodeExecutions).toHaveLength(2);
    expect(execution.nodeExecutions[0].status).toBe("success");
    expect(execution.nodeExecutions[1].status).toBe("success");

    await WorkflowService.deleteWorkflow(workflow.id);
  });

  it("executes IF node branching correctly (TRUE path executed, FALSE path skipped)", async () => {
    const trigger = createWorkflowNode("manual-trigger", { x: 0, y: 0 });
    const ifNode = createWorkflowNode("if", { x: 200, y: 0 });
    ifNode.data.config = {
      condition: { field: "lead.score", operator: "greater_than", value: "80" },
    };

    const delayTrue = createWorkflowNode("delay", { x: 400, y: -50 });
    delayTrue.data.config = { duration: 1, unit: "seconds" };

    const delayFalse = createWorkflowNode("delay", { x: 400, y: 50 });
    delayFalse.data.config = { duration: 1, unit: "seconds" };

    const edges = [
      { id: "e-trig", source: trigger.id, target: ifNode.id, sourceHandle: "out", targetHandle: "in" },
      { id: "e-true", source: ifNode.id, target: delayTrue.id, sourceHandle: "true", targetHandle: "in" },
      { id: "e-false", source: ifNode.id, target: delayFalse.id, sourceHandle: "false", targetHandle: "in" },
    ];

    const workflow = await WorkflowService.createWorkflow({
      name: "Test IF Branch Pipeline",
      nodes: [trigger, ifNode, delayTrue, delayFalse],
      edges,
    });

    // Test TRUE path (score = 95 > 80)
    const execTrue = await WorkflowEngine.executeWorkflow({
      workflowId: workflow.id,
      input: { lead: { score: 95 } },
    });

    expect(execTrue.status).toBe("success");
    const nodeExecsTrue = execTrue.nodeExecutions;
    const trueNodeExec = nodeExecsTrue.find((ne) => ne.nodeId === delayTrue.id);
    const falseNodeExec = nodeExecsTrue.find((ne) => ne.nodeId === delayFalse.id);

    expect(trueNodeExec?.status).toBe("success");
    expect(falseNodeExec?.status).toBe("skipped");

    // Test FALSE path (score = 50 < 80)
    const execFalse = await WorkflowEngine.executeWorkflow({
      workflowId: workflow.id,
      input: { lead: { score: 50 } },
    });

    expect(execFalse.status).toBe("success");
    const nodeExecsFalse = execFalse.nodeExecutions;
    const trueNodeExec2 = nodeExecsFalse.find((ne) => ne.nodeId === delayTrue.id);
    const falseNodeExec2 = nodeExecsFalse.find((ne) => ne.nodeId === delayFalse.id);

    expect(trueNodeExec2?.status).toBe("skipped");
    expect(falseNodeExec2?.status).toBe("success");

    await WorkflowService.deleteWorkflow(workflow.id);
  });

  it("executes graph topologically independent of nodes array order", async () => {
    const trigger = createWorkflowNode("manual-trigger", { x: 0, y: 0 });
    const delay1 = createWorkflowNode("delay", { x: 200, y: 0 });
    delay1.data.config = { duration: 1, unit: "seconds" };

    const delay2 = createWorkflowNode("delay", { x: 400, y: 0 });
    delay2.data.config = { duration: 1, unit: "seconds" };

    const edges = [
      { id: "e1", source: trigger.id, target: delay1.id, sourceHandle: "out", targetHandle: "in" },
      { id: "e2", source: delay1.id, target: delay2.id, sourceHandle: "out", targetHandle: "in" },
    ];

    // Intentionally shuffle nodes array: delay2, trigger, delay1
    const workflow = await WorkflowService.createWorkflow({
      name: "Shuffled Nodes Pipeline",
      nodes: [delay2, trigger, delay1],
      edges,
    });

    const execution = await WorkflowEngine.executeWorkflow({ workflowId: workflow.id });

    expect(execution.status).toBe("success");
    expect(execution.nodeExecutions[0].nodeId).toBe(trigger.id);
    expect(execution.nodeExecutions[1].nodeId).toBe(delay1.id);
    expect(execution.nodeExecutions[2].nodeId).toBe(delay2.id);

    await WorkflowService.deleteWorkflow(workflow.id);
  });

  it("detects graph cycles (A -> B -> A) and throws WORKFLOW_CYCLE_DETECTED", async () => {
    const nodeA = createWorkflowNode("delay", { x: 0, y: 0 });
    const nodeB = createWorkflowNode("delay", { x: 200, y: 0 });

    const cyclicEdges = [
      { id: "e1", source: nodeA.id, target: nodeB.id, sourceHandle: "out", targetHandle: "in" },
      { id: "e2", source: nodeB.id, target: nodeA.id, sourceHandle: "out", targetHandle: "in" },
    ];

    const workflow = await WorkflowService.createWorkflow({
      name: "Cyclic Graph Pipeline",
      nodes: [nodeA, nodeB],
      edges: cyclicEdges,
    });

    await expect(WorkflowEngine.executeWorkflow({ workflowId: workflow.id })).rejects.toThrow(
      "WORKFLOW_CYCLE_DETECTED",
    );

    await WorkflowService.deleteWorkflow(workflow.id);
  });

  it("persists node failure status and error details when a node fails", async () => {
    const trigger = createWorkflowNode("manual-trigger", { x: 0, y: 0 });
    const invalidHttp = createWorkflowNode("http-request", { x: 200, y: 0 });
    invalidHttp.data.config = { method: "GET", url: "" }; // Empty URL forces config failure

    const edge = { id: "e1", source: trigger.id, target: invalidHttp.id, sourceHandle: "out", targetHandle: "in" };

    const workflow = await WorkflowService.createWorkflow({
      name: "Failed Node Pipeline",
      nodes: [trigger, invalidHttp],
      edges: [edge],
    });

    const execution = await WorkflowEngine.executeWorkflow({ workflowId: workflow.id });

    expect(execution.status).toBe("failed");
    expect(execution.error).toContain("HTTP URL is required");
    const failedNodeExec = execution.nodeExecutions.find((ne) => ne.nodeId === invalidHttp.id);
    expect(failedNodeExec?.status).toBe("failed");
    expect(failedNodeExec?.error).toContain("HTTP URL is required");
    expect(failedNodeExec?.duration).toBeGreaterThanOrEqual(0);

    await WorkflowService.deleteWorkflow(workflow.id);
  });
});
