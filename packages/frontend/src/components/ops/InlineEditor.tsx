import { useState, useRef, useEffect, useCallback } from 'react';

export interface InlineEditorProps {
  travelerId: string;
  field: string;
  value: unknown;
  fieldType: 'text' | 'number' | 'select' | 'checkbox';
  options?: { value: string; label: string }[];
  onSave: (field: string, value: unknown) => Promise<void>;
  onCancel: () => void;
}

/**
 * Determines the correct input control type for a given field name.
 * Used by both the component and property tests.
 */
export function getFieldType(field: string): 'select' | 'checkbox' | 'number' | 'text' {
  const ENUM_FIELDS = ['gender', 'invitee_type', 'pax_type', 'checkin_status'];
  const BOOLEAN_FIELDS = ['dietary_vegan', 'onsite_flight_change', 'jba_repeat'];
  const NUMERIC_FIELDS = ['age', 'party_total', 'party_adults', 'party_children'];

  if (ENUM_FIELDS.includes(field)) return 'select';
  if (BOOLEAN_FIELDS.includes(field)) return 'checkbox';
  if (NUMERIC_FIELDS.includes(field)) return 'number';
  return 'text';
}

export function InlineEditor({
  travelerId,
  field,
  value,
  fieldType,
  options,
  onSave,
  onCancel,
}: InlineEditorProps) {
  const [editValue, setEditValue] = useState<unknown>(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const originalValue = useRef(value);

  // Focus the input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Clear error toast after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSave = useCallback(async (val: unknown) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(field, val);
    } catch (err) {
      // Revert to original value on error
      setEditValue(originalValue.current);
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [saving, field, onSave]);

  const handleCancel = useCallback(() => {
    setEditValue(originalValue.current);
    onCancel();
  }, [onCancel]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    } else if (e.key === 'Enter' && fieldType !== 'checkbox') {
      e.preventDefault();
      handleSave(editValue);
    }
  }, [handleCancel, handleSave, editValue, fieldType]);

  const handleBlur = useCallback(() => {
    if (fieldType !== 'checkbox' && !saving) {
      handleSave(editValue);
    }
  }, [fieldType, saving, handleSave, editValue]);

  if (fieldType === 'checkbox') {
    return (
      <span className="inline-editor inline-editor--checkbox" data-testid="inline-editor">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="checkbox"
          checked={Boolean(editValue)}
          disabled={saving}
          aria-label={`Edit ${field}`}
          onChange={(e) => {
            const newVal = e.target.checked;
            setEditValue(newVal);
            handleSave(newVal);
          }}
          onKeyDown={handleKeyDown}
        />
        {saving && <span className="inline-editor__spinner" aria-label="Saving" />}
        {error && <span className="inline-editor__toast" role="alert">{error}</span>}
      </span>
    );
  }

  if (fieldType === 'select') {
    return (
      <span className="inline-editor inline-editor--select" data-testid="inline-editor">
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={String(editValue ?? '')}
          disabled={saving}
          aria-label={`Edit ${field}`}
          onChange={(e) => {
            setEditValue(e.target.value);
            handleSave(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
        >
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {saving && <span className="inline-editor__spinner" aria-label="Saving" />}
        {error && <span className="inline-editor__toast" role="alert">{error}</span>}
      </span>
    );
  }

  if (fieldType === 'number') {
    return (
      <span className="inline-editor inline-editor--number" data-testid="inline-editor">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="number"
          value={editValue === null || editValue === undefined ? '' : String(editValue)}
          disabled={saving}
          aria-label={`Edit ${field}`}
          onChange={(e) => {
            const raw = e.target.value;
            setEditValue(raw === '' ? null : Number(raw));
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
        />
        {saving && <span className="inline-editor__spinner" aria-label="Saving" />}
        {error && <span className="inline-editor__toast" role="alert">{error}</span>}
      </span>
    );
  }

  // Default: text input
  return (
    <span className="inline-editor inline-editor--text" data-testid="inline-editor">
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={String(editValue ?? '')}
        disabled={saving}
        aria-label={`Edit ${field}`}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
      {saving && <span className="inline-editor__spinner" aria-label="Saving" />}
      {error && <span className="inline-editor__toast" role="alert">{error}</span>}
    </span>
  );
}
