import { isClerkAPIResponseError } from "@clerk/expo";

export type AuthField = "firstName" | "email" | "password" | "code";
export type AuthFieldErrors = Partial<Record<AuthField, string>>;

export interface AuthFailure {
  fields: AuthFieldErrors;
  /** Error that isn't tied to a single input (network, rate limit, etc.). */
  form?: string;
}

/**
 * Must match Clerk Dashboard → User & authentication → Password → minimum length.
 * The server always enforces its own value; this only drives the live checklist.
 */
export const PASSWORD_MIN_LENGTH = 15;
export const CODE_LENGTH = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const validateEmail = (value: string): string | undefined => {
  const email = value.trim();
  if (!email) return "Enter your email address.";
  if (!EMAIL_PATTERN.test(email)) return "That email doesn't look right.";
  return undefined;
};

export const validateName = (value: string): string | undefined => {
  const name = value.trim();
  if (!name) return "Tell us what to call you.";
  if (name.length > 50) return "Keep it under 50 characters.";
  return undefined;
};

export interface PasswordCheck {
  id: "length" | "letter" | "number";
  label: string;
  passed: boolean;
}

export const getPasswordChecks = (value: string): PasswordCheck[] => [
  { id: "length", label: `${PASSWORD_MIN_LENGTH}+ characters`, passed: value.length >= PASSWORD_MIN_LENGTH },
  { id: "letter", label: "A letter", passed: /[a-zA-Z]/.test(value) },
  { id: "number", label: "A number", passed: /\d/.test(value) },
];

/** Strict rules for creating a password. */
export const validateNewPassword = (value: string): string | undefined => {
  if (!value) return "Create a password.";
  const failed = getPasswordChecks(value).find((check) => !check.passed);
  if (failed?.id === "length") return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (failed) return "Mix in at least one letter and one number.";
  return undefined;
};

/** Loose rule for signing in: rules may have changed since the account was made. */
export const validateExistingPassword = (value: string): string | undefined =>
  value ? undefined : "Enter your password.";

export const validateCode = (value: string): string | undefined => {
  if (!value) return "Enter the 6-digit code.";
  if (!new RegExp(`^\\d{${CODE_LENGTH}}$`).test(value)) return "The code is 6 digits.";
  return undefined;
};

/** Friendly, brand-neutral copy for the error codes users actually hit. */
const MESSAGES_BY_CODE: Record<string, { field?: AuthField; message: string }> = {
  form_identifier_not_found: { field: "email", message: "We couldn't find an account with that email." },
  form_password_incorrect: { field: "password", message: "That password isn't right. Try again." },
  form_identifier_exists: { field: "email", message: "An account with this email already exists. Sign in instead." },
  form_param_format_invalid: { field: "email", message: "That email doesn't look right." },
  form_password_pwned: {
    field: "password",
    message: "This password has appeared in a data breach. Please choose a different one.",
  },
  form_password_not_strong_enough: { field: "password", message: "Choose a stronger password." },
  form_code_incorrect: { field: "code", message: "That code isn't right. Check your email and try again." },
  verification_expired: { field: "code", message: "This code has expired. Send a new one." },
  verification_failed: { field: "code", message: "Too many attempts. Send a new code." },
  too_many_requests: { message: "Too many attempts. Wait a moment and try again." },
  user_locked: { message: "Your account is temporarily locked for security. Try again later." },
  strategy_for_user_invalid: { message: "This account uses a different sign-in method." },
  session_exists: { message: "You're already signed in." },
};

const PARAM_TO_FIELD: Record<string, AuthField> = {
  email_address: "email",
  identifier: "email",
  first_name: "firstName",
  password: "password",
  code: "code",
};

const GENERIC_ERROR = "Something went wrong. Check your connection and try again.";

/** Codes whose copy only makes sense when signing in, not when creating an account. */
const SIGN_IN_ONLY_CODES = new Set(["form_password_incorrect", "form_identifier_not_found"]);

/** Turns any error from the auth SDK into field-level + form-level copy for the UI. */
export const toAuthFailure = (error: unknown, flow: "sign-in" | "sign-up" = "sign-in"): AuthFailure => {
  const failure: AuthFailure = { fields: {} };

  if (isClerkAPIResponseError(error) && error.errors.length > 0) {
    for (const apiError of error.errors) {
      if (__DEV__) console.warn("[auth] code:", apiError.code, "|", apiError.longMessage ?? apiError.message);
      const known =
        flow === "sign-up" && SIGN_IN_ONLY_CODES.has(apiError.code) ? undefined : MESSAGES_BY_CODE[apiError.code];
      const paramName = apiError.meta?.paramName as string | undefined;
      const field = known?.field ?? (paramName ? PARAM_TO_FIELD[paramName] : undefined);
      const message = known?.message ?? apiError.longMessage ?? apiError.message;

      if (field && !failure.fields[field]) failure.fields[field] = message;
      else if (!field && !failure.form) failure.form = message;
    }
    return failure;
  }

  const code = (error as { code?: string } | null)?.code;
  failure.form = (code && MESSAGES_BY_CODE[code]?.message) || GENERIC_ERROR;
  return failure;
};

export const hasErrors = (errors: AuthFieldErrors) => Object.values(errors).some(Boolean);

/** "jane@example.com" -> "j•••@example.com", for "we sent a code to…" copy. */
export const maskEmail = (email: string) => {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  return `${name[0]}${"•".repeat(Math.min(Math.max(name.length - 1, 2), 5))}@${domain}`;
};
