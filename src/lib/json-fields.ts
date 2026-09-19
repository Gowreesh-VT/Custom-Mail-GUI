export function toJson<T>(value: T | null | undefined): string | null {
  if (value === null || value === undefined) return null
  return JSON.stringify(value)
}

export function fromJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function toStringArray(value: string | null | undefined): string[] {
  return fromJson<string[]>(value, [])
}

export function fromStringArray(value: string[] | null | undefined): string | null {
  if (!value || value.length === 0) return null
  return JSON.stringify(value)
}
