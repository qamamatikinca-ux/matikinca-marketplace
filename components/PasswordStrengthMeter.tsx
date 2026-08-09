"use client";

type Rule = { label: string; valid: boolean };

function rulesFor(password: string): Rule[] {
  return [
    { label: "12 or more characters", valid: password.length >= 12 },
    { label: "Uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "Lowercase letter", valid: /[a-z]/.test(password) },
    { label: "Number", valid: /\d/.test(password) },
    { label: "Symbol", valid: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function passwordStrength(password: string) {
  const rules = rulesFor(password);
  const score = rules.filter((rule) => rule.valid).length;
  const status = !password
    ? "Start typing"
    : score <= 2
      ? "Password is not strong enough"
      : score === 3
        ? "Getting stronger"
        : score === 4
          ? "Almost there"
          : "Strong password";
  return { rules, score, status, strong: score === rules.length };
}

export default function PasswordStrengthMeter({ password, darkMode }: { password: string; darkMode: boolean }) {
  const strength = passwordStrength(password);
  const active = strength.score;
  const green = strength.strong;

  return (
    <div className={`rounded-xl border p-3 ${darkMode ? "border-white/10 bg-white/[.025]" : "border-black/10 bg-black/[.018]"}`} aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <p className={`text-xs font-black ${green ? "text-emerald-500" : password ? "text-amber-600" : darkMode ? "text-white/45" : "text-black/45"}`}>{strength.status}</p>
        <p className={`text-[10px] font-bold ${darkMode ? "text-white/36" : "text-black/36"}`}>{active}/5</p>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1" aria-hidden="true">
        {strength.rules.map((rule, index) => (
          <span key={rule.label} className={`h-1.5 rounded-full transition-all duration-200 ${index < active ? (green ? "bg-emerald-500" : "bg-[#f6b800]") : darkMode ? "bg-white/10" : "bg-black/10"}`} />
        ))}
      </div>
      <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
        {strength.rules.map((rule) => (
          <div key={rule.label} className={`flex items-center gap-2 text-[11px] font-semibold ${rule.valid ? "text-emerald-500" : darkMode ? "text-white/43" : "text-black/43"}`}>
            <span className={`flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full border text-[9px] font-black ${rule.valid ? "border-emerald-500 bg-emerald-500 text-white" : darkMode ? "border-white/18 text-transparent" : "border-black/18 text-transparent"}`}>{rule.valid ? "✓" : "·"}</span>
            {rule.label}
          </div>
        ))}
      </div>
    </div>
  );
}
