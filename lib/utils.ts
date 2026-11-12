import dayjs from "dayjs";

/**
 * Formats a number as money in U.S. style, e.g. 1234.5 -> "$1,234.50".
 * Always shows exactly two decimal places. Currency defaults to USD.
 */
export const formatCurrency = (value: number, currency: string = "USD"): string => {
  const amount = Number.isFinite(value) ? value : 0;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Invalid currency code or Intl unavailable: fall back to plain "$x.xx".
    return `$${amount.toFixed(2)}`;
  }
};

/**
 * Formats a subscription date (ISO string) for display,
 * e.g. "2026-03-20T10:00:00.000Z" -> "Mar 20, 2026".
 * Returns "Not provided" when the value is missing or invalid.
 */
export const formatSubscriptionDateTime = (value?: string): string => {
  if (!value) return "Not provided";
  const date = dayjs(value);
  return date.isValid() ? date.format("MMM D, YYYY") : "Not provided";
};

/**
 * Turns a raw subscription status into a display label,
 * e.g. "active" -> "Active", "past_due" -> "Past Due".
 * Returns "Unknown" when the status is missing.
 */
export const formatStatusLabel = (value?: string): string => {
  if (!value) return "Unknown";
  return value
    .trim()
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ") || "Unknown";
};
