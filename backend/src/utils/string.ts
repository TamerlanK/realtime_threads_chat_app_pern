export function normalizeOptionalString(
  value?: string | null
): string | undefined {
  if (!value) return undefined

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}
