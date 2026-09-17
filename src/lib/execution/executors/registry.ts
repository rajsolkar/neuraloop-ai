import type { NodeExecutor } from "../types";
import { ManualTriggerExecutor } from "./manual-trigger";
import { HttpRequestExecutor } from "./http-request";
import { AIExecutor } from "./ai";
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
import { LoopExecutor } from "./loop";
import { SwitchExecutor } from "./switch";
import { MergeExecutor } from "./merge";
import { TelegramExecutor } from "./telegram";
import { DiscordExecutor } from "./discord";
import { GoogleSheetsExecutor } from "./google-sheets";
import { TransformExecutor } from "./transform";

const EXECUTOR_REGISTRY: Record<string, NodeExecutor> = {
  "manual-trigger": ManualTriggerExecutor,
  "http-request": HttpRequestExecutor,
  ai: AIExecutor,
  openai: AIExecutor,
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
  loop: LoopExecutor,
  switch: SwitchExecutor,
  merge: MergeExecutor,
  telegram: TelegramExecutor,
  discord: DiscordExecutor,
  "google-sheets": GoogleSheetsExecutor,
  transform: TransformExecutor,
};

export function getExecutor(definitionId: string): NodeExecutor | null {
  return EXECUTOR_REGISTRY[definitionId] ?? null;
}
