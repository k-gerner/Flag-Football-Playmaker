import { useState } from "react";

interface AuthPanelProps {
  busy: boolean;
  error: string | null;
  onSubmit: (mode: "sign_in" | "sign_up", email: string, password: string) => void;
}

export function AuthPanel({ busy, error, onSubmit }: AuthPanelProps) {
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="glass-panel mx-auto flex w-full max-w-xl flex-col gap-5 rounded-[32px] border border-white/70 p-6 shadow-panel">
      <div>
        <p className="font-display text-sm font-bold uppercase tracking-[0.28em] text-ember-500">Flag Football Playmaker</p>
        <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-ink-950">
          Sign in to manage cloud-saved Play Sets.
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-950/70">
          Use email and password to save grouped wristband plays, export whole sets, and come back later from any device.
        </p>
      </div>

      <div className="flex gap-2 rounded-full bg-ink-950/6 p-1">
        <button
          className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
            mode === "sign_in" ? "bg-ink-950 text-white" : "text-ink-950/70"
          }`}
          onClick={() => setMode("sign_in")}
          type="button"
        >
          Sign in
        </button>
        <button
          className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
            mode === "sign_up" ? "bg-ink-950 text-white" : "text-ink-950/70"
          }`}
          onClick={() => setMode("sign_up")}
          type="button"
        >
          Create account
        </button>
      </div>

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(mode, email, password);
        }}
      >
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink-950/70">Email</span>
          <input
            autoComplete="email"
            className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink-950/70">Password</span>
          <input
            autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
            className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          className="w-full rounded-full bg-ember-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-ember-500/90 disabled:cursor-not-allowed disabled:bg-ember-500/40"
          disabled={busy || !email || password.length < 6}
          type="submit"
        >
          {busy ? "Working..." : mode === "sign_in" ? "Sign in" : "Create account"}
        </button>
      </form>
    </div>
  );
}

