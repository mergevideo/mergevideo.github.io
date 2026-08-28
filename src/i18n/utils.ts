import { defaultLang, languages, ui, type SupportedLanguage } from './ui';

export function getLangFromUrl(url: URL): SupportedLanguage {
  const [, lang] = url.pathname.split('/');
  if (lang && lang in languages) {
    return lang as SupportedLanguage;
  }
  return defaultLang;
}

export function useTranslations(lang: SupportedLanguage) {
  return function t(key: keyof (typeof ui)[typeof defaultLang], params?: Record<string, string | number>): string {
    const langDict = ui[lang] || ui[defaultLang];
    let translation: string = (langDict as any)[key] || (ui[defaultLang] as any)[key] || key;

    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        translation = translation.replaceAll(`{${paramKey}}`, String(value));
      });
    }

    return translation;
  };
}

export function getLocalizedPath(currentPath: string, targetLang: SupportedLanguage): string {
  // Normalize path by stripping leading/trailing slashes
  const segments = currentPath.split('/').filter(Boolean);
  
  // If first segment is an existing language code, remove it
  if (segments.length > 0 && segments[0] in languages) {
    segments.shift();
  }

  const remainingPath = segments.join('/');

  if (targetLang === defaultLang) {
    return remainingPath ? `/${remainingPath}/` : '/';
  }

  return remainingPath ? `/${targetLang}/${remainingPath}/` : `/${targetLang}/`;
}

export interface HreflangEntry {
  lang: string;
  href: string;
}

export function getHreflangList(siteUrl: string, currentPath: string): HreflangEntry[] {
  const cleanSiteUrl = siteUrl.replace(/\/+$/, '');
  const list: HreflangEntry[] = [];

  for (const langKey of Object.keys(languages) as SupportedLanguage[]) {
    const localizedPath = getLocalizedPath(currentPath, langKey);
    list.push({
      lang: langKey,
      href: `${cleanSiteUrl}${localizedPath}`,
    });
  }

  // x-default points to default language (English at root)
  const defaultPath = getLocalizedPath(currentPath, defaultLang);
  list.push({
    lang: 'x-default',
    href: `${cleanSiteUrl}${defaultPath}`,
  });

  return list;
}
