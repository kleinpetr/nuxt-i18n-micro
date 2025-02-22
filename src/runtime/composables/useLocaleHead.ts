import { joinURL } from 'ufo'
import type { Locale, ModuleOptionsExtend } from '../../types'
import { isPrefixExceptDefaultStrategy } from '../helpers'
import { unref, useRoute, useRuntimeConfig, watch, onUnmounted, ref, useNuxtApp } from '#imports'

interface MetaLink {
  [key: string]: string | undefined
  rel: string
  href: string
  hreflang?: string
}

interface MetaTag {
  [key: string]: string
  property: string
  content: string
}

interface MetaObject {
  htmlAttrs: {
    lang?: string
    dir?: 'ltr' | 'rtl' | 'auto'
  }
  link: MetaLink[]
  meta: MetaTag[]
}

export const useLocaleHead = ({ addDirAttribute = true, identifierAttribute = 'id', addSeoAttributes = true, baseUrl = '/' } = {}) => {
  const metaObject = ref<MetaObject>({
    htmlAttrs: {},
    link: [],
    meta: [],
  })

  function updateMeta() {
    const { defaultLocale, strategy } = useRuntimeConfig().public.i18nConfig as unknown as ModuleOptionsExtend
    const { $getLocales, $getLocale } = useNuxtApp()

    const route = useRoute()
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const locale = unref($getLocale())
    const routeName = (route.name ?? '').toString()
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const currentLocale = unref($getLocales().find((loc: Locale) => loc.code === locale))
    if (!currentLocale) {
      return
    }

    const currentIso = currentLocale.iso || locale
    const currentDir = currentLocale.dir || 'auto'

    let fullPath = unref(route.fullPath)
    let ogUrl = joinURL(unref(baseUrl), fullPath)
    let indexUrl = joinURL(unref(baseUrl))

    if (!ogUrl.endsWith('/')) {
      ogUrl += '/'
    }
    if (!indexUrl.endsWith('/')) {
      indexUrl += '/'
    }

    if (routeName.startsWith('localized-') && fullPath.startsWith(`/${locale}`)) {
      fullPath = fullPath.slice(locale.length + 1)
      ogUrl = joinURL(unref(baseUrl), locale, fullPath)
    }

    metaObject.value = {
      htmlAttrs: {
        lang: currentIso,
        ...(addDirAttribute ? { dir: currentDir } : {}),
      },
      link: [],
      meta: [],
    }

    if (!addSeoAttributes) return

    // const alternateLocales = locales?.filter(l => l.code !== locale) ?? []
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const alternateLocales = $getLocales() ?? []

    const ogLocaleMeta = {
      [identifierAttribute]: 'i18n-og',
      property: 'og:locale',
      content: currentIso,
    }

    const ogUrlMeta = {
      [identifierAttribute]: 'i18n-og-url',
      property: 'og:url',
      content: ogUrl,
    }

    const alternateOgLocalesMeta = alternateLocales.map((loc: Locale) => ({
      [identifierAttribute]: `i18n-og-alt-${loc.iso || loc.code}`,
      property: 'og:locale:alternate',
      content: unref(loc.iso || loc.code),
    }))

    const canonicalLink = {
      [identifierAttribute]: 'i18n-can',
      rel: 'canonical',
      href: ogUrl,
    }

    const alternateLinks = alternateLocales.flatMap((loc: Locale) => {
      const href = defaultLocale === loc.code && isPrefixExceptDefaultStrategy(strategy!)
        ? indexUrl
        : joinURL(unref(baseUrl), loc.code, fullPath)

      const links = [{
        [identifierAttribute]: `i18n-alternate-${loc.code}`,
        rel: 'alternate',
        href,
        hreflang: unref(loc.code),
      }]

      if (loc.iso) {
        links.push({
          [identifierAttribute]: `i18n-alternate-${loc.iso}`,
          rel: 'alternate',
          href,
          hreflang: unref(loc.iso),
        })
      }

      return links
    })

    metaObject.value.meta = [ogLocaleMeta, ogUrlMeta, ...alternateOgLocalesMeta]
    metaObject.value.link = [canonicalLink, ...alternateLinks]
  }

  if (import.meta.client) {
    const route = useRoute()
    const stop = watch(
      () => route.fullPath,
      () => updateMeta(),
      { immediate: true },
    )
    onUnmounted(() => stop())
  }
  else {
    updateMeta()
  }

  return metaObject
}
