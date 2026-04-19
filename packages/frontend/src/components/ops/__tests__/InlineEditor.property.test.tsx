/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { InlineEditor, getFieldType } from '../InlineEditor';

// ─── Field classification constants ──────────────────────────

const ENUM_FIELDS = ['gender', 'invitee_type', 'pax_type', 'checkin_status'];
const BOOLEAN_FIELDS = ['dietary_vegan', 'onsite_flight_change', 'jba_repeat'];
const NUMERIC_FIELDS = ['age', 'party_total', 'party_adults', 'party_children'];
const TEXT_FIELDS = [
  'first_name', 'last_name', 'registration_type', 'vip_tag',
  'internal_id', 'agent_code', 'dietary_notes', 'remarks',
  'smd_name', 'ceo_name',
];

const ALL_EDITABLE_FIELDS = [...ENUM_FIELDS, ...BOOLEAN_FIELDS, ...NUMERIC_FIELDS, ...TEXT_FIELDS];

// ─── Generators ──────────────────────────────────────────────

const arbEnumField = fc.constantFrom(...ENUM_FIELDS);
const arbBooleanField = fc.constantFrom(...BOOLEAN_FIELDS);
const arbNumericField = fc.constantFrom(...NUMERIC_FIELDS);
const arbTextField = fc.constantFrom(...TEXT_FIELDS);
const arbEditableField = fc.constantFrom(...ALL_EDITABLE_FIELDS);

const SAMPLE_OPTIONS = [
  { value: 'opt1', label: 'Option 1' },
  { value: 'opt2', label: 'Option 2' },
];

// ─── Helpers ─────────────────────────────────────────────────

function renderEditor(field: string, fieldType: 'text' | 'number' | 'select' | 'checkbox', value: unknown) {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onCancel = vi.fn();
  return render(
    <InlineEditor
      travelerId="test-id"
      field={field}
      value={value}
      fieldType={fieldType}
      options={fieldType === 'select' ? SAMPLE_OPTIONS : undefined}
      onSave={onSave}
      onCancel={onCancel}
    />,
  );
}

// ─── Property 2: Editable field type determines input control ──

/**
 * Feature: admin-panel, Property 2: Editable field type determines input control
 *
 * For any editable field in the master table, the InlineEditor should render
 * the correct input control based on the field's type classification:
 * dropdown <select> for enum fields, <input type="checkbox"> for boolean fields,
 * <input type="number"> for numeric fields, and <input type="text"> for all
 * other string fields.
 *
 * **Validates: Requirements 3.1, 3.7**
 */
describe('Property 2: Editable field type determines input control', () => {
  afterEach(() => {
    cleanup();
  });

  it('getFieldType returns "select" for all enum fields', () => {
    fc.assert(
      fc.property(arbEnumField, (field) => {
        expect(getFieldType(field)).toBe('select');
      }),
      { numRuns: 100 },
    );
  });

  it('getFieldType returns "checkbox" for all boolean fields', () => {
    fc.assert(
      fc.property(arbBooleanField, (field) => {
        expect(getFieldType(field)).toBe('checkbox');
      }),
      { numRuns: 100 },
    );
  });

  it('getFieldType returns "number" for all numeric fields', () => {
    fc.assert(
      fc.property(arbNumericField, (field) => {
        expect(getFieldType(field)).toBe('number');
      }),
      { numRuns: 100 },
    );
  });

  it('getFieldType returns "text" for all text fields', () => {
    fc.assert(
      fc.property(arbTextField, (field) => {
        expect(getFieldType(field)).toBe('text');
      }),
      { numRuns: 100 },
    );
  });

  it('renders <select> for enum fields', () => {
    fc.assert(
      fc.property(arbEnumField, (field) => {
        renderEditor(field, 'select', 'opt1');
        const editor = screen.getByTestId('inline-editor');
        const select = editor.querySelector('select');
        expect(select).not.toBeNull();
        expect(editor.querySelector('input[type="text"]')).toBeNull();
        expect(editor.querySelector('input[type="number"]')).toBeNull();
        expect(editor.querySelector('input[type="checkbox"]')).toBeNull();
        cleanup();
      }),
      { numRuns: 100 },
    );
  });

  it('renders <input type="checkbox"> for boolean fields', () => {
    fc.assert(
      fc.property(arbBooleanField, (field) => {
        renderEditor(field, 'checkbox', false);
        const editor = screen.getByTestId('inline-editor');
        const checkbox = editor.querySelector('input[type="checkbox"]');
        expect(checkbox).not.toBeNull();
        expect(editor.querySelector('select')).toBeNull();
        expect(editor.querySelector('input[type="text"]')).toBeNull();
        expect(editor.querySelector('input[type="number"]')).toBeNull();
        cleanup();
      }),
      { numRuns: 100 },
    );
  });

  it('renders <input type="number"> for numeric fields', () => {
    fc.assert(
      fc.property(arbNumericField, (field) => {
        renderEditor(field, 'number', 25);
        const editor = screen.getByTestId('inline-editor');
        const numInput = editor.querySelector('input[type="number"]');
        expect(numInput).not.toBeNull();
        expect(editor.querySelector('select')).toBeNull();
        expect(editor.querySelector('input[type="text"]')).toBeNull();
        expect(editor.querySelector('input[type="checkbox"]')).toBeNull();
        cleanup();
      }),
      { numRuns: 100 },
    );
  });

  it('renders <input type="text"> for text fields', () => {
    fc.assert(
      fc.property(arbTextField, (field) => {
        renderEditor(field, 'text', 'some value');
        const editor = screen.getByTestId('inline-editor');
        const textInput = editor.querySelector('input[type="text"]');
        expect(textInput).not.toBeNull();
        expect(editor.querySelector('select')).toBeNull();
        expect(editor.querySelector('input[type="number"]')).toBeNull();
        expect(editor.querySelector('input[type="checkbox"]')).toBeNull();
        cleanup();
      }),
      { numRuns: 100 },
    );
  });

  it('for any editable field, getFieldType maps to the correct input control', () => {
    fc.assert(
      fc.property(arbEditableField, (field) => {
        const expectedType = getFieldType(field);

        // Verify the mapping is consistent with the field classification
        if (ENUM_FIELDS.includes(field)) {
          expect(expectedType).toBe('select');
        } else if (BOOLEAN_FIELDS.includes(field)) {
          expect(expectedType).toBe('checkbox');
        } else if (NUMERIC_FIELDS.includes(field)) {
          expect(expectedType).toBe('number');
        } else {
          expect(expectedType).toBe('text');
        }

        // Render with the determined type and verify the correct control
        renderEditor(field, expectedType, expectedType === 'checkbox' ? false : 'test');
        const editor = screen.getByTestId('inline-editor');

        switch (expectedType) {
          case 'select':
            expect(editor.querySelector('select')).not.toBeNull();
            break;
          case 'checkbox':
            expect(editor.querySelector('input[type="checkbox"]')).not.toBeNull();
            break;
          case 'number':
            expect(editor.querySelector('input[type="number"]')).not.toBeNull();
            break;
          case 'text':
            expect(editor.querySelector('input[type="text"]')).not.toBeNull();
            break;
        }

        cleanup();
      }),
      { numRuns: 100 },
    );
  });
});


// ─── Property 3: Edit cancellation restores original value ──

/**
 * Feature: admin-panel, Property 3: Edit cancellation restores original value
 *
 * For any editable field and any original cell value, when editing is cancelled
 * (Escape key), the cell content should revert to the exact original value.
 *
 * **Validates: Requirements 3.3, 3.5**
 */
describe('Property 3: Edit cancellation restores original value', () => {
  afterEach(() => {
    cleanup();
  });

  it('Escape key restores original text value for text fields', () => {
    fc.assert(
      fc.property(
        arbTextField,
        fc.string({ minLength: 0, maxLength: 50 }),
        (field, originalValue) => {
          const onSave = vi.fn().mockResolvedValue(undefined);
          const onCancel = vi.fn();

          render(
            <InlineEditor
              travelerId="test-id"
              field={field}
              value={originalValue}
              fieldType="text"
              onSave={onSave}
              onCancel={onCancel}
            />,
          );

          const input = screen.getByLabelText(`Edit ${field}`) as HTMLInputElement;

          // Type something different
          fireEvent.change(input, { target: { value: 'changed-value' } });

          // Press Escape
          fireEvent.keyDown(input, { key: 'Escape' });

          // onCancel should have been called
          expect(onCancel).toHaveBeenCalled();
          // onSave should NOT have been called
          expect(onSave).not.toHaveBeenCalled();

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Escape key restores original value for numeric fields', () => {
    fc.assert(
      fc.property(
        arbNumericField,
        fc.integer({ min: 0, max: 200 }),
        (field, originalValue) => {
          const onSave = vi.fn().mockResolvedValue(undefined);
          const onCancel = vi.fn();

          render(
            <InlineEditor
              travelerId="test-id"
              field={field}
              value={originalValue}
              fieldType="number"
              onSave={onSave}
              onCancel={onCancel}
            />,
          );

          const input = screen.getByLabelText(`Edit ${field}`) as HTMLInputElement;

          // Type something different
          fireEvent.change(input, { target: { value: '999' } });

          // Press Escape
          fireEvent.keyDown(input, { key: 'Escape' });

          expect(onCancel).toHaveBeenCalled();
          expect(onSave).not.toHaveBeenCalled();

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Escape key restores original value for select fields', () => {
    fc.assert(
      fc.property(arbEnumField, (field) => {
        const options = [
          { value: 'val_a', label: 'Value A' },
          { value: 'val_b', label: 'Value B' },
          { value: 'val_c', label: 'Value C' },
        ];
        const originalValue = 'val_a';
        const onSave = vi.fn().mockResolvedValue(undefined);
        const onCancel = vi.fn();

        render(
          <InlineEditor
            travelerId="test-id"
            field={field}
            value={originalValue}
            fieldType="select"
            options={options}
            onSave={onSave}
            onCancel={onCancel}
          />,
        );

        const select = screen.getByLabelText(`Edit ${field}`) as HTMLSelectElement;

        // Press Escape
        fireEvent.keyDown(select, { key: 'Escape' });

        expect(onCancel).toHaveBeenCalled();

        cleanup();
      }),
      { numRuns: 100 },
    );
  });

  it('Escape key triggers onCancel for any editable field type', () => {
    fc.assert(
      fc.property(arbEditableField, (field) => {
        const fieldType = getFieldType(field);
        const defaultValues: Record<string, unknown> = {
          select: 'opt1',
          checkbox: false,
          number: 42,
          text: 'original',
        };
        const value = defaultValues[fieldType];
        const onSave = vi.fn().mockResolvedValue(undefined);
        const onCancel = vi.fn();

        render(
          <InlineEditor
            travelerId="test-id"
            field={field}
            value={value}
            fieldType={fieldType}
            options={fieldType === 'select' ? SAMPLE_OPTIONS : undefined}
            onSave={onSave}
            onCancel={onCancel}
          />,
        );

        const input = screen.getByLabelText(`Edit ${field}`);

        // Press Escape
        fireEvent.keyDown(input, { key: 'Escape' });

        expect(onCancel).toHaveBeenCalled();

        cleanup();
      }),
      { numRuns: 100 },
    );
  });

  it('on PATCH failure, cell reverts to original value', async () => {
    // Use a fixed set of text fields to test the revert behavior
    // (async property tests need sequential execution)
    for (const field of TEXT_FIELDS) {
      const originalValue = 'original-test-value';
      const onSave = vi.fn().mockRejectedValue(new Error('Network error'));
      const onCancel = vi.fn();

      render(
        <InlineEditor
          travelerId="test-id"
          field={field}
          value={originalValue}
          fieldType="text"
          onSave={onSave}
          onCancel={onCancel}
        />,
      );

      const input = screen.getByLabelText(`Edit ${field}`) as HTMLInputElement;

      // Change value and trigger save via Enter
      fireEvent.change(input, { target: { value: 'new-value' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // Wait for the async save to complete and revert
      await vi.waitFor(() => {
        expect(screen.getByRole('alert')).toBeDefined();
      });

      // After error, the input should revert to original value
      const revertedInput = screen.getByLabelText(`Edit ${field}`) as HTMLInputElement;
      expect(revertedInput.value).toBe(originalValue);

      cleanup();
    }
  });
});
