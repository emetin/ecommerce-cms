import { createCsv } from "../parsers/csv";

export function buildCsvExport(
  headers: readonly string[],
  items: Record<string, unknown>[]
) {
  return createCsv(headers, items);
}