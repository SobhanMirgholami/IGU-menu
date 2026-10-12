import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "tr", label: "TR" },
  { code: "en", label: "EN" },
  { code: "ar", label: "عربي" },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="flex gap-1">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
          className={`px-2 py-1 rounded text-sm ${
            i18n.resolvedLanguage === lang.code
              ? "bg-amber-700 text-white"
              : "text-amber-800"
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
