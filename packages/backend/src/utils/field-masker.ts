import type { MasterListRow } from '@wsb/shared';

/**
 * Masks an email address by showing only the first character of the local part,
 * asterisks, and the full domain.
 *
 * Example: "john@example.com" → "j***@example.com"
 */
export function maskEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex < 1) return email; // no valid local part — return as-is
  const firstChar = email[0];
  const domain = email.slice(atIndex);
  return `${firstChar}***${domain}`;
}

/**
 * Masks a phone number by replacing all digits except the last four with asterisks.
 *
 * Example: "555-867-1234" → "***-***-1234"
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return phone; // not enough digits to mask

  const lastFour = digits.slice(-4);
  let result = '';
  let digitsSeen = 0;
  const totalDigits = digits.length;
  const maskCount = totalDigits - 4;

  for (const ch of phone) {
    if (/\d/.test(ch)) {
      digitsSeen++;
      result += digitsSeen <= maskCount ? '*' : ch;
    } else {
      result += ch;
    }
  }

  return result;
}

/**
 * Masks a passport name by showing the first character and last character
 * with asterisks in between.
 *
 * Example: "JOHN E" → "J*** E"
 */
export function maskPassportName(name: string): string {
  if (name.length <= 2) return name; // too short to mask meaningfully
  const first = name[0];
  const last = name[name.length - 1];
  const middle = '*'.repeat(name.length - 2);
  return `${first}${middle}${last}`;
}

/**
 * Dispatches to the appropriate mask function based on field type.
 */
export function maskFieldValue(
  value: string,
  fieldType: 'email' | 'phone' | 'passport_name',
): string {
  switch (fieldType) {
    case 'email':
      return maskEmail(value);
    case 'phone':
      return maskPhone(value);
    case 'passport_name':
      return maskPassportName(value);
  }
}

/**
 * Applies PII masking to a MasterListRow.
 *
 * When `shouldUnmask` is true, returns the row unchanged.
 * When `shouldUnmask` is false, masks `email_primary`, `phone`,
 * `passport_name`, and each entry in `email_aliases`.
 */
export function applyMasking(
  row: MasterListRow,
  shouldUnmask: boolean,
): MasterListRow {
  if (shouldUnmask) return row;

  return {
    ...row,
    email_primary: maskEmail(row.email_primary),
    phone: row.phone != null ? maskPhone(row.phone) : row.phone,
    passport_name:
      row.passport_name != null
        ? maskPassportName(row.passport_name)
        : row.passport_name,
    email_aliases:
      row.email_aliases != null
        ? row.email_aliases.map((alias) => maskEmail(alias))
        : row.email_aliases,
  };
}
