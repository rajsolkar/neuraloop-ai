import type { NodeExecutor } from "../types";
import { ManualTriggerExecutor } from "./manual-trigger";
import { HttpRequestExecutor } from "./http-request";
import { OpenAiExecutor } from "./openai";
import { SlackExecutor } from "./slack";
import { EmailExecutor } from "./email";
import { IfExecutor } from "./if";
import { FilterExecutor } from "./filter";
import { DelayExecutor } from "./delay";
import { ScheduleExecutor } from "./schedule";
import { WebhookExecutor } from "./webhook";
import { SetVariableExecutor } from "./set-variable";
import { CodeExecutor } from "./code";
import { WebhookResponseExecutor } from "./webhook-response";

const EXECUTOR_REGISTRY: Record<string, NodeExecutor> = {
  "manual-trigger": ManualTriggerExecutor,
  "http-request": HttpRequestExecutor,
  openai: OpenAiExecutor,
  slack: SlackExecutor,
  email: EmailExecutor,
  code: CodeExecutor,
  "webhook-response": WebhookResponseExecutor,
  if: IfExecutor,
  filter: FilterExecutor,
  "set-variable": SetVariableExecutor,
  delay: DelayExecutor,
  schedule: ScheduleExecutor,
  webhook: WebhookExecutor,
};

export function getExecutor(definitionId: string): NodeExecutor | null {
  return EXECUTOR_REGISTRY[definitionId] ?? null;
}
