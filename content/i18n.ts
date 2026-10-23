import type { LocaleCode } from "@/lib/i18n/config"

// Chrome strings only — page copy stays English until a translation pass is
// scheduled. Missing keys fall back to English, so partial dictionaries are safe.
export const dictionaries: Record<LocaleCode, Record<string, string>> = {
  en: {
    "nav.products": "Products",
    "nav.solutions": "Solutions",
    "nav.resources": "Resources",
    "nav.pricing": "Pricing",
    "nav.contact": "Contact",
    "nav.login": "Log in",
    "nav.getStarted": "Get started",
    "nav.search": "Search",
    "topbar.docs": "Docs",
    "footer.product": "Product",
    "footer.solutions": "Solutions",
    "footer.company": "Company",
    "footer.resources": "Resources",
    "footer.legal": "Legal",
    "footer.backToTop": "Back to top",
    "footer.language": "Language",
  },
  sw: {
    "nav.products": "Bidhaa",
    "nav.solutions": "Suluhisho",
    "nav.resources": "Rasilimali",
    "nav.pricing": "Bei",
    "nav.contact": "Wasiliana",
    "nav.login": "Ingia",
    "nav.getStarted": "Anza sasa",
    "nav.search": "Tafuta",
    "topbar.docs": "Nyaraka",
    "footer.product": "Bidhaa",
    "footer.solutions": "Suluhisho",
    "footer.company": "Kampuni",
    "footer.resources": "Rasilimali",
    "footer.legal": "Kisheria",
    "footer.backToTop": "Rudi juu",
    "footer.language": "Lugha",
  },
  fr: {
    "nav.products": "Produits",
    "nav.solutions": "Solutions",
    "nav.resources": "Ressources",
    "nav.pricing": "Tarifs",
    "nav.contact": "Contact",
    "nav.login": "Connexion",
    "nav.getStarted": "Commencer",
    "nav.search": "Rechercher",
    "topbar.docs": "Docs",
    "footer.product": "Produit",
    "footer.solutions": "Solutions",
    "footer.company": "Entreprise",
    "footer.resources": "Ressources",
    "footer.legal": "Mentions légales",
    "footer.backToTop": "Haut de page",
    "footer.language": "Langue",
  },
}

export function translate(locale: LocaleCode, key: string): string {
  return dictionaries[locale][key] ?? dictionaries.en[key] ?? key
}
