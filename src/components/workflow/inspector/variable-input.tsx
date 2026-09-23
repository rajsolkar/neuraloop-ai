"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { VariablePicker } from "./variable-picker";
import { resolveVariables } from "@/lib/variables/resolve-variable";
import { Sparkles, Check } from "lucide-react";

interface VariableInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  type?: "text" | "password" | "number";
  label?: string;
  showPreview?: boolean;
  samplePayload?: Record<string, unknown>;
  currentNodeId?: string;
}

const COMMON_VARIABLES = [
  { key: "name", expression: "{{name}}", label: "name", desc: "Primary lead / contact full name" },
  { key: "email", expression: "{{email}}", label: "email", desc: "Primary contact email address" },
  { key: "company", expression: "{{company}}", label: "company", desc: "Company or organization name" },
  { key: "budget", expression: "{{budget}}", label: "budget", desc: "Budget string (e.g. $10,000)" },
  { key: "leadScore", expression: "{{leadScore}}", label: "leadScore", desc: "Evaluated lead score number" },
  { key: "message", expression: "{{message}}", label: "message", desc: "Submitted message body" },
  { key: "trigger.body.email", expression: "{{trigger.body.email}}", label: "trigger.body.email", desc: "Incoming webhook email" },
  { key: "trigger.body.name", expression: "{{trigger.body.name}}", label: "trigger.body.name", desc: "Incoming webhook name" },
  { key: "steps.ai.output.text", expression: "{{steps.ai.output.text}}", label: "steps.ai.output.text", desc: "Output text from AI step" },
  { key: "steps.transform.summary", expression: "{{steps.transform.summary}}", label: "steps.transform.summary", desc: "Transformed payload summary" },
  { key: "workflow.id", expression: "{{workflow.id}}", label: "workflow.id", desc: "Active workflow ID" },
  { key: "execution.id", expression: "{{execution.id}}", label: "execution.id", desc: "Execution run instance ID" },
];

export function VariableInput({
  value,
  onChange,
  placeholder,
  className = "",
  type = "text",
  showPreview = true,
  samplePayload,
  currentNodeId,
}: VariableInputProps) {
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 280 });

  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const previewResult = useMemo(() => {
    if (!value || !value.includes("{{")) return null;
    return resolveVariables(value, samplePayload);
  }, [value, samplePayload]);

  const filteredSuggestions = useMemo(() => {
    if (!filterQuery) return COMMON_VARIABLES;
    const q = filterQuery.toLowerCase();
    return COMMON_VARIABLES.filter(
      (v) => v.label.toLowerCase().includes(q) || v.expression.toLowerCase().includes(q)
    );
  }, [filterQuery]);

  const updatePosition = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setCoords({
      top: rect.bottom + window.scrollY + 4,
      left: Math.max(12, rect.left + window.scrollX),
      width: Math.max(260, rect.width),
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart || val.length;
    onChange(val);

    // Check if typing {{ or {
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/\{{1,2}([\w\.]*)$/);

    if (match) {
      setFilterQuery(match[1] || "");
      setSelectedIndex(0);
      updatePosition();
      setAutocompleteOpen(true);
    } else {
      setAutocompleteOpen(false);
    }
  };

  const insertVariableAtCursor = (expr: string) => {
    if (!inputRef.current) {
      onChange(value ? `${value} ${expr}` : expr);
      return;
    }
    const input = inputRef.current;
    const cursor = input.selectionStart || value.length;
    const textBefore = value.slice(0, cursor);
    const textAfter = value.slice(cursor);

    // Replace trailing { or {{ and partial query
    const updatedBefore = textBefore.replace(/\{{1,2}([\w\.]*)$/, expr);
    const newValue = updatedBefore + textAfter;
    onChange(newValue);
    setAutocompleteOpen(false);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursorPos = updatedBefore.length;
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!autocompleteOpen || filteredSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredSuggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const selected = filteredSuggestions[selectedIndex];
      if (selected) {
        insertVariableAtCursor(selected.expression);
      }
    } else if (e.key === "Escape") {
      setAutocompleteOpen(false);
    }
  };

  // Close click outside
  useEffect(() => {
    if (!autocompleteOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && inputRef.current.contains(e.target as Node)) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAutocompleteOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [autocompleteOpen]);

  return (
    <div className="space-y-1 w-full">
      <div className="flex items-center gap-1.5 w-full">
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`flex-1 rounded-md border border-border bg-canvas px-3 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-accent ${className}`}
        />
        <VariablePicker
          currentNodeId={currentNodeId}
          onSelect={(expr) => insertVariableAtCursor(expr)}
        />
      </div>

      {/* Real-time Live Preview Badge */}
      {showPreview && previewResult !== null && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-accent/20 bg-accent/5 text-[11px] font-mono text-accent-ink truncate">
          <Sparkles className="h-3 w-3 shrink-0 text-accent-ink" />
          <span className="font-semibold shrink-0">Preview:</span>
          <span className="truncate">{previewResult}</span>
        </div>
      )}

      {/* Portal Autocomplete Dropdown */}
      {autocompleteOpen &&
        mounted &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 9999,
            }}
            className="rounded-lg border border-border-strong bg-surface p-1.5 shadow-2xl ring-1 ring-black/10 max-h-48 overflow-y-auto font-sans"
          >
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-faint border-b border-border mb-1">
              Variable Autocomplete
            </div>
            {filteredSuggestions.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-ink-faint">No matching variables</div>
            ) : (
              filteredSuggestions.map((v, i) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariableAtCursor(v.expression)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between transition-colors ${
                    i === selectedIndex ? "bg-accent/20 text-accent-ink font-semibold" : "hover:bg-canvas text-ink"
                  }`}
                >
                  <span className="font-mono text-[11px] truncate">{v.expression}</span>
                  <span className="text-[9px] text-ink-faint truncate ml-2">{v.desc}</span>
                </button>
              ))
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

interface VariableTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  showPreview?: boolean;
  samplePayload?: Record<string, unknown>;
  currentNodeId?: string;
}

export function VariableTextarea({
  value,
  onChange,
  placeholder,
  className = "",
  rows = 3,
  showPreview = true,
  samplePayload,
  currentNodeId,
}: VariableTextareaProps) {
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 280 });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const previewResult = useMemo(() => {
    if (!value || !value.includes("{{")) return null;
    return resolveVariables(value, samplePayload);
  }, [value, samplePayload]);

  const filteredSuggestions = useMemo(() => {
    if (!filterQuery) return COMMON_VARIABLES;
    const q = filterQuery.toLowerCase();
    return COMMON_VARIABLES.filter(
      (v) => v.label.toLowerCase().includes(q) || v.expression.toLowerCase().includes(q)
    );
  }, [filterQuery]);

  const updatePosition = () => {
    if (!textareaRef.current) return;
    const rect = textareaRef.current.getBoundingClientRect();
    setCoords({
      top: rect.bottom + window.scrollY + 4,
      left: Math.max(12, rect.left + window.scrollX),
      width: Math.max(260, rect.width),
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart || val.length;
    onChange(val);

    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/\{{1,2}([\w\.]*)$/);

    if (match) {
      setFilterQuery(match[1] || "");
      setSelectedIndex(0);
      updatePosition();
      setAutocompleteOpen(true);
    } else {
      setAutocompleteOpen(false);
    }
  };

  const insertVariableAtCursor = (expr: string) => {
    if (!textareaRef.current) {
      onChange(value ? `${value} ${expr}` : expr);
      return;
    }
    const ta = textareaRef.current;
    const cursor = ta.selectionStart || value.length;
    const textBefore = value.slice(0, cursor);
    const textAfter = value.slice(cursor);

    const updatedBefore = textBefore.replace(/\{{1,2}([\w\.]*)$/, expr);
    const newValue = updatedBefore + textAfter;
    onChange(newValue);
    setAutocompleteOpen(false);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = updatedBefore.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!autocompleteOpen || filteredSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredSuggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const selected = filteredSuggestions[selectedIndex];
      if (selected) {
        insertVariableAtCursor(selected.expression);
      }
    } else if (e.key === "Escape") {
      setAutocompleteOpen(false);
    }
  };

  useEffect(() => {
    if (!autocompleteOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (textareaRef.current && textareaRef.current.contains(e.target as Node)) return;
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      setAutocompleteOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [autocompleteOpen]);

  return (
    <div className="space-y-1 w-full">
      <div className="relative flex flex-col w-full gap-1">
        <textarea
          ref={textareaRef}
          rows={rows}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full rounded-md border border-border bg-canvas p-2.5 text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-accent ${className}`}
        />
        <div className="flex justify-end">
          <VariablePicker
            currentNodeId={currentNodeId}
            onSelect={(expr) => insertVariableAtCursor(expr)}
          />
        </div>
      </div>

      {showPreview && previewResult !== null && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-accent/20 bg-accent/5 text-[11px] font-mono text-accent-ink truncate">
          <Sparkles className="h-3 w-3 shrink-0 text-accent-ink" />
          <span className="font-semibold shrink-0">Preview:</span>
          <span className="truncate">{previewResult}</span>
        </div>
      )}

      {autocompleteOpen &&
        mounted &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 9999,
            }}
            className="rounded-lg border border-border-strong bg-surface p-1.5 shadow-2xl ring-1 ring-black/10 max-h-48 overflow-y-auto font-sans"
          >
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-faint border-b border-border mb-1">
              Variable Autocomplete
            </div>
            {filteredSuggestions.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-ink-faint">No matching variables</div>
            ) : (
              filteredSuggestions.map((v, i) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariableAtCursor(v.expression)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between transition-colors ${
                    i === selectedIndex ? "bg-accent/20 text-accent-ink font-semibold" : "hover:bg-canvas text-ink"
                  }`}
                >
                  <span className="font-mono text-[11px] truncate">{v.expression}</span>
                  <span className="text-[9px] text-ink-faint truncate ml-2">{v.desc}</span>
                </button>
              ))
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
