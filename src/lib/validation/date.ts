/**
 * Date validation utilities for onboarding flow
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a birth year is within reasonable range
 */
export function validateBirthYear(year: string): ValidationResult {
  if (!year) return { valid: true }; // Empty is allowed (optional field)

  const y = parseInt(year, 10);
  if (isNaN(y)) return { valid: false, error: 'Invalid year' };

  const currentYear = new Date().getFullYear();
  if (y < 1900) return { valid: false, error: 'Year must be 1900 or later' };
  if (y > currentYear) return { valid: false, error: 'Year cannot be in the future' };

  return { valid: true };
}

/**
 * Validates date parts (year, month, day) form a valid date
 */
export function validateDateParts(
  year: string,
  month: string,
  day: string
): ValidationResult {
  // All empty is valid (optional field)
  if (!year && !month && !day) return { valid: true };

  // If any is provided, validate what's provided
  const y = year ? parseInt(year, 10) : null;
  const m = month ? parseInt(month, 10) : null;
  const d = day ? parseInt(day, 10) : null;

  // Validate year first
  if (y !== null) {
    const yearResult = validateBirthYear(year);
    if (!yearResult.valid) return yearResult;
  }

  // Validate month range
  if (m !== null) {
    if (m < 1 || m > 12) return { valid: false, error: 'Month must be between 1 and 12' };
  }

  // Validate day and date validity
  if (d !== null) {
    if (d < 1 || d > 31) return { valid: false, error: 'Day must be between 1 and 31' };

    // If we have all parts, validate the actual date
    if (y !== null && m !== null) {
      const date = new Date(y, m - 1, d);
      // Check if the date is valid by verifying the components match
      if (date.getMonth() !== m - 1 || date.getDate() !== d) {
        return { valid: false, error: 'Invalid date for this month' };
      }

      // Check if date is not in the future
      if (date > new Date()) {
        return { valid: false, error: 'Date cannot be in the future' };
      }
    }
  }

  return { valid: true };
}

/**
 * Validates a generic year (for education/work)
 */
export function validateYear(year: string): ValidationResult {
  if (!year) return { valid: true }; // Empty is allowed

  const y = parseInt(year, 10);
  if (isNaN(y)) return { valid: false, error: 'Invalid year' };

  const currentYear = new Date().getFullYear();
  if (y < 1900) return { valid: false, error: 'Year must be 1900 or later' };
  if (y > currentYear + 10) return { valid: false, error: 'Year is too far in the future' };

  return { valid: true };
}

/**
 * Validates that end year is not before start year
 */
export function validateYearRange(
  startYear: string,
  endYear: string,
  isCurrent: boolean = false
): ValidationResult {
  // If current, end year doesn't matter
  if (isCurrent) return { valid: true };

  // Empty values are allowed
  if (!startYear || !endYear) return { valid: true };

  const start = parseInt(startYear, 10);
  const end = parseInt(endYear, 10);

  if (isNaN(start) || isNaN(end)) return { valid: true }; // Skip validation for invalid numbers

  if (end < start) {
    return { valid: false, error: 'End year cannot be before start year' };
  }

  return { valid: true };
}

/**
 * Validates all date fields for an education/work entry
 */
export function validateEntryDates(
  startYear: string,
  endYear: string,
  isCurrent: boolean = false
): ValidationResult {
  // Validate start year
  const startResult = validateYear(startYear);
  if (!startResult.valid) return startResult;

  // Validate end year (if not current)
  if (!isCurrent) {
    const endResult = validateYear(endYear);
    if (!endResult.valid) return endResult;
  }

  // Validate range
  return validateYearRange(startYear, endYear, isCurrent);
}
