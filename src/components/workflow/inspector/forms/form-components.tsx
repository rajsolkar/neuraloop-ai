"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KeyValuePair, Condition, ConditionOperator } from "@/lib/workflow/config-schemas";

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

const CONDITION_OPERATOR_OPTIONS: { value: ConditionOperator; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Does not equal" },
  { value: "greater_than", label: "Greater than (>)" },
  { value: "less_than", label: "Less than (<)" },
  { value: "greater_than_or_equal", label: "Greater or equal (>=)" },
  { value: "less_than_or_equal", label: "Less or equal (<=)" },
  { value: "contains", label: "Contains" },
  { value: "does_not_contain", label: "Does not contain" },
  { value: "is_empty", label: "Is empty" },
  { value: "is_not_empty", label: "Is not empty" },
];

export function ConditionBuilder({
  condition,
  onChange,
}: {
  condition: Condition;
  onChange: (updated: Condition) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-canvas/50 p-3">
      <FormField label="Field Property">
        <Input
          placeholder="e.g. lead.score or status"
          value={condition.field}
          onChange={(e) => onChange({ ...condition, field: e.target.value })}
          className="h-8 text-xs bg-surface"
        />
      </FormField>

      <FormField label="Operator">
        <FormSelect
          value={condition.operator}
          onChange={(op) => onChange({ ...condition, operator: op as ConditionOperator })}
          options={CONDITION_OPERATOR_OPTIONS}
        />
      </FormField>

      {condition.operator !== "is_empty" && condition.operator !== "is_not_empty" && (
        <FormField label="Target Value">
          <Input
            placeholder="Comparison value"
            value={condition.value}
            onChange={(e) => onChange({ ...condition, value: e.target.value })}
            className="h-8 text-xs bg-surface"
          />
        </FormField>
      )}
    </div>
  );
}

export function CredentialNotice({ provider }: { provider: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-amber/30 bg-amber/10 px-3 py-2 text-[11px] text-amber">
      <ShieldAlert className="h-4 w-4 shrink-0" />
      <span>
        <strong>{provider} Credentials</strong> will be connected in a future phase.
      </span>
    </div>
  );
}
