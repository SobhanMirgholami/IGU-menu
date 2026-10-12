import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login() {
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
      <h2 className="text-xl font-semibold text-amber-800 mb-4">Sign in</h2>

      {step === "email" ? (
        <form onSubmit={sendCode} className="space-y-3">
          <input
            type="email"
            required
            placeholder="Your university email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg p-3"
          />
          {domains.length > 0 && (
            <p className="text-xs text-gray-500">
              Students: use your {domains.map((d) => `@${d}`).join(" or ")}{" "}
              email to order.
            </p>
          )}
          <button
            disabled={loading}
            className="w-full bg-amber-700 text-white rounded-lg p-3 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-3">
          <p className="text-sm text-gray-600">
            We sent a code to {cleanEmail}
          </p>
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <span className="text-lg leading-none">📬</span>
            <p className="text-sm text-amber-900">
              Can't find the code? Check your{" "}
              <span className="font-semibold">spam</span> folder.
            </p>
          </div>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            placeholder="Enter the code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full border rounded-lg p-3 tracking-widest text-center"
          />
          <button
            disabled={loading}
            className="w-full bg-amber-700 text-white rounded-lg p-3 disabled:opacity-50"
          >
            {loading ? "Checking..." : "Sign in"}
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
            Use a different email
          </button>
        </form>
      )}

      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
    </div>
  );
}
