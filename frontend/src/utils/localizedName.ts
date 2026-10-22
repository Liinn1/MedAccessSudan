export interface BilingualName {
  name_en?: string | null
  name_ar?: string | null
}

export function localizedName(value: BilingualName | null | undefined, language: string | null | undefined): string {
  if (!value) return ''
  const arabic = language?.toLowerCase().startsWith('ar') ?? false
  const preferred = arabic ? value.name_ar : value.name_en
  const fallback = arabic ? value.name_en : value.name_ar
  return preferred?.trim() || fallback?.trim() || ''
}
