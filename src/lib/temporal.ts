import "temporal-polyfill/global";

export const deviceTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** "2027-01-20" -> "Jan 20, 2027" (FR-007) */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return dateFmt.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
}

/** Instant shown in the timezone it was recorded in: "Feb 18, 2027, 8:00 PM". */
export function formatDateTime(instant: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(instant));
}

/** "5000.00", "USD" -> "USD 5,000.00" */
export function formatMoney(amount: string | number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "code",
  }).format(Number(amount));
}

export function todayIn(timezone: string): string {
  return Temporal.Now.plainDateISO(timezone).toString();
}
