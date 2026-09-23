"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ShieldAlert, Sparkles, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KeyValuePair, Condition, ConditionOperator } from "@/lib/workflow/config-schemas";
import { CreateCredentialDialog } from "@/components/credentials/create-credential-dialog";
import { VariableInput, VariableTextarea } from "../variable-input";
import { resolveVariables } from "@/lib/variables/resolve-variable";

export function FormField({
  label,
  description,
  error,
  children,
}: {
  label: string;
  description?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-ink">{label}</Label>
      {children}
      {description ? (
        <p className="text-[11px] leading-3.5 text-ink-faint">{description}</p>
      ) : null}
      {error ? (
        <p className="text-[11px] font-medium leading-3.5 text-error">{error}</p>
      ) : null}
    </div>
  );
}

export function FormSelect({
  value,
  onChange,
  options,
  id,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  id?: string;
  "aria-label"?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className={cn(
        "h-9 w-full rounded-md border border-border bg-canvas px-2.5 text-xs text-ink transition-colors duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
      )}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function KeyValueEditor({
  title,
  items,
  onChange,
}: {
  title: string;
  items: KeyValuePair[];
  onChange: (items: KeyValuePair[]) => void;
}) {
  const handleAdd = () => {
    onChange([...items, { key: "", value: "" }]);
  };

  const handleUpdate = (index: number, key: string, value: string) => {
    const updated = items.map((item, i) => (i === index ? { key, value } : item));
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink">{title}</span>
        <Button variant="ghost" size="sm" type="button" onClick={handleAdd} className="h-7 text-xs">
          <Plus className="h-3 w-3" />
          Add
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-ink-faint italic">No items defined.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <Input
                placeholder="Key"
                value={item.key}
                onChange={(e) => handleUpdate(index, e.target.value, item.value)}
                className="h-8 text-xs"
              />
              <Input
                placeholder="Value"
                value={item.value}
                onChange={(e) => handleUpdate(index, item.key, e.target.value)}
                className="h-8 text-xs"
              />
              <Button
                variant="ghost"
                size="icon-sm"
                type="button"
                onClick={() => handleRemove(index)}
                aria-label={`Remove ${item.key || "item"}`}
                className="h-8 w-8 text-ink-faint hover:text-error"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ConditionBuilder({
  condition,
  onChange,
}: {
  condition: Condition;
  onChange: (updated: Condition) => void;
}) {
  const mode = condition.mode || "basic";
  const dataType = condition.dataType || "string";
  const operator = condition.operator || "equals";
  const field = condition.field || "";
  const value = condition.value || "";
  const secondValue = condition.secondValue || "";
  const expression = condition.expression || "";

  // Operator Options grouped by Data Type
  const getOperatorOptions = () => {
    switch (dataType) {
      case "number":
        return [
          { value: "equals", label: "Equals (=)" },
          { value: "not_equals", label: "Not Equals (!=)" },
          { value: "greater_than", label: "Greater Than (>)" },
          { value: "less_than", label: "Less Than (<)" },
          { value: "greater_than_or_equal", label: "Greater or Equal (>=)" },
          { value: "less_than_or_equal", label: "Less or Equal (<=)" },
          { value: "between", label: "Between (Range)" },
        ];
      case "boolean":
        return [
          { value: "is_true", label: "Is True" },
          { value: "is_false", label: "Is False" },
          { value: "equals", label: "Equals" },
        ];
      case "variable":
        return [
          { value: "equals", label: "Equals" },
          { value: "not_equals", label: "Not Equals" },
          { value: "greater_than", label: "Greater Than (>)" },
          { value: "less_than", label: "Less Than (<)" },
          { value: "contains", label: "Contains" },
        ];
      default: // string
        return [
          { value: "equals", label: "Equals" },
          { value: "not_equals", label: "Not Equals" },
          { value: "contains", label: "Contains" },
          { value: "does_not_contain", label: "Does Not Contain" },
          { value: "starts_with", label: "Starts With" },
          { value: "ends_with", label: "Ends With" },
          { value: "is_empty", label: "Is Empty" },
          { value: "is_not_empty", label: "Is Not Empty" },
        ];
    }
  };

  // Live Condition Preview & Result Evaluation
  const previewData = React.useMemo(() => {
    const sampleContext: Record<string, unknown> = {
      name: "Raj Solkar",
      leadScore: 95,
      status: "active",
      alert: "heavy rain warning",
      isQualified: true,
      country: "India",
      budget: 10000,
      minimumBudget: 5000,
    };

    if (mode === "advanced") {
      const exprString = expression || '{{leadScore}} > 80 && {{country}} == "India"';
      const resolved = resolveVariables(exprString, sampleContext);
      let isTrue = false;
      try {
        if (resolved.includes("contains(")) {
          const m = resolved.match(/contains\(\s*['"]?([^'"]+)['"]?\s*,\s*['"]?([^'"]+)['"]?\s*\)/);
          if (m) isTrue = m[1].toLowerCase().includes(m[2].toLowerCase());
        } else if (resolved.includes("&&")) {
          isTrue = resolved.split("&&").every((part) => {
            const p = part.trim();
            if (p.includes(">")) {
              const [a, b] = p.split(">").map((s) => Number(s.trim()));
              return a > b;
            }
            if (p.includes("==")) {
              const [a, b] = p.split("==").map((s) => s.trim().replace(/^['"]|['"]$/g, ""));
              return a === b;
            }
            return Boolean(p);
          });
        } else if (resolved.includes(">")) {
          const [a, b] = resolved.split(">").map((s) => Number(s.trim()));
          isTrue = a > b;
        } else {
          isTrue = Boolean(resolved && resolved !== "false" && resolved !== "0");
        }
      } catch {
        isTrue = false;
      }
      return {
        previewText: resolved,
        result: isTrue,
      };
    }

    // Basic Mode Preview
    const leftResolved = resolveVariables(field || "{{leadScore}}", sampleContext);
    const rightResolved = resolveVariables(value || "80", sampleContext);
    const secondResolved = resolveVariables(secondValue || "100", sampleContext);

    let isPass = false;
    switch (operator) {
      case "equals":
        isPass = String(leftResolved).trim() === String(rightResolved).trim();
        break;
      case "not_equals":
        isPass = String(leftResolved).trim() !== String(rightResolved).trim();
        break;
      case "greater_than":
        isPass = Number(leftResolved) > Number(rightResolved);
        break;
      case "less_than":
        isPass = Number(leftResolved) < Number(rightResolved);
        break;
      case "greater_than_or_equal":
        isPass = Number(leftResolved) >= Number(rightResolved);
        break;
      case "less_than_or_equal":
        isPass = Number(leftResolved) <= Number(rightResolved);
        break;
      case "contains":
        isPass = String(leftResolved).toLowerCase().includes(String(rightResolved).toLowerCase());
        break;
      case "does_not_contain":
        isPass = !String(leftResolved).toLowerCase().includes(String(rightResolved).toLowerCase());
        break;
      case "starts_with":
        isPass = String(leftResolved).toLowerCase().startsWith(String(rightResolved).toLowerCase());
        break;
      case "ends_with":
        isPass = String(leftResolved).toLowerCase().endsWith(String(rightResolved).toLowerCase());
        break;
      case "between": {
        const num = Number(leftResolved);
        const min = Number(rightResolved);
        const max = Number(secondResolved);
        isPass = !isNaN(num) && num >= min && num <= max;
        break;
      }
      case "is_empty":
        isPass = leftResolved === undefined || leftResolved === null || String(leftResolved).trim() === "";
        break;
      case "is_not_empty":
        isPass = leftResolved !== undefined && leftResolved !== null && String(leftResolved).trim() !== "";
        break;
      case "is_true":
        isPass = String(leftResolved).toLowerCase() === "true" || Boolean(leftResolved) === true;
        break;
      case "is_false":
        isPass = String(leftResolved).toLowerCase() === "false" || !leftResolved;
        break;
      default:
        isPass = false;
    }

    const previewStr = `${field || "{{leadScore}}"} ${operator.replace(/_/g, " ")} ${
      operator === "between"
        ? `${value || "50"} and ${secondValue || "100"}`
        : operator.includes("is_")
        ? ""
        : value || "80"
    }`;

    return {
      previewText: previewStr.trim(),
      result: isPass,
    };
  }, [mode, dataType, operator, field, value, secondValue, expression]);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-canvas/40 p-3.5 shadow-xs">
      {/* Mode Switch Header */}
      <div className="flex items-center justify-between border-b border-border pb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
          <SlidersHorizontal className="h-3.5 w-3.5 text-accent-ink" />
          <span>Rule Configuration</span>
        </div>
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface border border-border text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => onChange({ ...condition, mode: "basic" })}
            className={`px-2 py-0.5 rounded transition-colors ${
              mode === "basic" ? "bg-accent text-accent-ink shadow-xs font-bold" : "text-ink-faint hover:text-ink"
            }`}
          >
            Basic Mode
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...condition, mode: "advanced" })}
            className={`px-2 py-0.5 rounded transition-colors ${
              mode === "advanced" ? "bg-accent text-accent-ink shadow-xs font-bold" : "text-ink-faint hover:text-ink"
            }`}
          >
            Advanced Mode
          </button>
        </div>
      </div>

      {mode === "basic" ? (
        <>
          {/* Data Type Selector */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider">Data Type</span>
            <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-surface border border-border text-xs font-medium text-center">
              {(["string", "number", "boolean", "variable"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onChange({ ...condition, dataType: t })}
                  className={`py-1 rounded capitalize transition-all ${
                    dataType === t
                      ? "bg-accent/20 text-accent-ink font-bold border border-accent/30 shadow-2xs"
                      : "text-ink-soft hover:text-ink hover:bg-canvas"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Left Operand / Field Property */}
          <FormField label="Left Expression / Field Property">
            <VariableInput
              placeholder="e.g. {{leadScore}} or alert"
              value={field}
              onChange={(val) => onChange({ ...condition, field: val })}
              showPreview={false}
            />
          </FormField>

          {/* Operator Select */}
          <FormField label="Operator">
            <FormSelect
              value={operator}
              onChange={(op) => onChange({ ...condition, operator: op as ConditionOperator })}
              options={getOperatorOptions()}
            />
          </FormField>

          {/* Target Value / Right Operands */}
          {operator !== "is_empty" && operator !== "is_not_empty" && operator !== "is_true" && operator !== "is_false" && (
            <FormField label="Target Value">
              <VariableInput
                placeholder="Comparison value or {{minimumValue}}"
                value={value}
                onChange={(val) => onChange({ ...condition, value: val })}
                showPreview={false}
              />
            </FormField>
          )}

          {operator === "between" && (
            <FormField label="Upper Bound Value">
              <VariableInput
                placeholder="Upper range value e.g. 100"
                value={secondValue}
                onChange={(val) => onChange({ ...condition, secondValue: val })}
                showPreview={false}
              />
            </FormField>
          )}
        </>
      ) : (
        /* Advanced Mode Expression Input */
        <FormField label="Advanced Logical Expression">
          <VariableTextarea
            placeholder='e.g. {{leadScore}} > 80 && {{country}} == "India"'
            value={expression}
            onChange={(val) => onChange({ ...condition, expression: val })}
            rows={3}
            showPreview={false}
          />
        </FormField>
      )}

      {/* Visual Condition Preview Card */}
      <div className="mt-1 rounded-lg border border-border/80 bg-surface p-2.5 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1.5 min-w-0 pr-2">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent-ink" />
          <div className="truncate">
            <span className="text-ink-faint text-[10px] block font-sans">Condition Preview</span>
            <span className="text-ink font-semibold truncate block">{previewData.previewText}</span>
          </div>
        </div>
        <span
          className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-bold shadow-2xs ${
            previewData.result
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
          }`}
        >
          Result: {previewData.result ? "TRUE" : "FALSE"}
        </span>
      </div>
    </div>
  );
}

export function CredentialSelect({
  provider,
  value,
  onChange,
  label = "Credential",
}: {
  provider: string;
  value?: string;
  onChange: (credentialId: string) => void;
  label?: string;
}) {
  const [credentials, setCredentials] = React.useState<Array<{ id: string; name: string; provider: string; maskedValue: string }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const loadCredentials = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/credentials");
      const data = await res.json();
      setCredentials(data.credentials || []);
    } catch {
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  const matchingCreds = credentials.filter((c) => {
    const p = c.provider.toLowerCase();
    const req = provider.toLowerCase();
    if (req === "openai" || req === "anthropic" || req === "gemini") {
      return p === req || p === "openai" || p === "anthropic" || p === "gemini" || p === "custom";
    }
    return p === req || p === "custom";
  });

  return (
    <FormField label={label} description={`Select encrypted ${provider} credential`}>
      <div className="flex items-center gap-2">
        <select
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 flex-1 rounded-md border border-border bg-canvas px-2.5 text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <option value="">-- Select Credential (Required) --</option>
          {matchingCreds.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.maskedValue})
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="h-9 px-2 text-xs shrink-0"
          title="Add New Credential"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <CreateCredentialDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultProvider={provider}
        onSuccess={(newCred) => {
          loadCredentials();
          onChange(newCred.id);
        }}
      />
    </FormField>
  );
}
