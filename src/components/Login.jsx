import { useEffect, useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { supabase } from "../lib/supabase";

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [domains, setDomains] = useState([]);

  const cleanEmail = email.trim().toLowerCase();

  useEffect(() => {
    supabase
      .from("allowed_email_domains")
      .select("domain")
      .then(({ data }) => setDomains((data ?? []).map((d) => d.domain)));
  }, []);

  async function sendCode(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({ email: cleanEmail });

    setLoading(false);
    if (error) setError(error.message);
    else setStep("code");
  }

  async function verifyCode(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: code.trim(),
      type: "email",
    });

    setLoading(false);
    if (error) setError(error.message);
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-amber-800 mb-4">
        {t("login.title")}
      </h2>

      {step === "email" ? (
        <form onSubmit={sendCode} className="space-y-3">
          <input
            type="email"
            dir="ltr"
            required
            placeholder={t("login.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg p-3"
          />
          {domains.length > 0 && (
            <p className="text-xs text-gray-500">
              {t("login.studentHint", {
                domains: domains.map((d) => `@${d}`).join(t("login.or")),
              })}
            </p>
          )}
          <button
            disabled={loading}
            className="w-full bg-amber-700 text-white rounded-lg p-3 disabled:opacity-50"
          >
            {loading ? t("login.sending") : t("login.sendCode")}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-3">
          <p className="text-sm text-gray-600">
            {t("login.codeSent", { email: cleanEmail })}
          </p>
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <span className="text-lg leading-none">📬</span>
            <p className="text-sm text-amber-900">
              <Trans
                i18nKey="login.spamHint"
                components={{ bold: <span className="font-semibold" /> }}
              />
            </p>
          </div>
          <input
            inputMode="numeric"
            dir="ltr"
            autoComplete="one-time-code"
            required
            placeholder={t("login.codePlaceholder")}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full border rounded-lg p-3 tracking-widest text-center"
          />
          <button
            disabled={loading}
            className="w-full bg-amber-700 text-white rounded-lg p-3 disabled:opacity-50"
          >
            {loading ? t("login.checking") : t("login.signIn")}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
            className="w-full text-sm text-gray-500"
          >
            {t("login.differentEmail")}
          </button>
        </form>
      )}

      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
    </div>
  );
}
