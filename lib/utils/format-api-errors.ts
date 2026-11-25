function humanizeFieldName(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatApiErrors(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;

  const record = data as Record<string, unknown>;
  const messages: string[] = [];

  // Shape 4: { detail: "Error message" }
  if (typeof record.detail === "string") {
    messages.push(record.detail);
  }

  for (const [key, value] of Object.entries(record)) {
    if (key === "detail") continue;

    // Shape 3: { non_field_errors: ["..."] }
    if (key === "non_field_errors" && Array.isArray(value)) {
      messages.push(...value.filter((v): v is string => typeof v === "string"));
      continue;
    }

    // Shape 1: { field: ["error1", "error2"] }
    if (Array.isArray(value)) {
      const errors = value.filter((v): v is string => typeof v === "string");
      if (errors.length > 0) {
        messages.push(`${humanizeFieldName(key)}: ${errors.join(". ")}`);
      }
      continue;
    }

    // Shape 2: { user: { phone: ["Already exists."] } }
    if (typeof value === "object" && value !== null) {
      const nested = formatApiErrors(value);
      if (nested) messages.push(nested);
    }
  }

  return messages.length > 0 ? messages.join(". ") : null;
}
