"use client";
import { Button } from "@/components/ui";

export function FormActions({ readOnly, onCancel, saving, error, submitLabel = "Submit", left }) {
  return (
    <div className="flex items-center justify-end gap-3 pt-2">
      {left}
      {error && <span className="mr-auto text-sm font-medium text-rose-600">{error}</span>}
      <Button variant="ghost" type="button" onClick={onCancel}>
        {readOnly ? "Close" : "Cancel"}
      </Button>
      {!readOnly && (
        <Button type="submit" disabled={saving}>
          {saving ? "Submitting..." : submitLabel}
        </Button>
      )}
    </div>
  );
}

export function Label({ children, required }) {
  return (
    <span className="mb-1.5 block text-sm font-medium text-slate-700">
      {children}
      {required && <span className="text-rose-500"> *</span>}
    </span>
  );
}
