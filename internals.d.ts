declare module '#build/i18n.plural.mjs' {
  export function plural(key: string, count: number, params: Params, locale: string, getter: Getter): string | null
}

declare module '#internal/i18n/options.mjs' {
  export function plural(key: string, count: number, params: Params, locale: string, getter: Getter): string | null
}
