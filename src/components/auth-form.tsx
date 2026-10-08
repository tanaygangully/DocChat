"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";

const inputClass =
  "w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-stone-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 dark:border-stone-700 dark:bg-stone-900";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignUp = mode === "sign-up";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Signing up also signs the new user in.
    const { error } = isSignUp
      ? await authClient.signUp.email({ name: name.trim(), email, password })
      : await authClient.signIn.email({ email, password });

    if (error) {
      setError(error.message ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }
    router.push("/chat");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"
    >
      <p className="font-medium">{isSignUp ? "Create your account" : "Log in to your account"}</p>

      {isSignUp && (
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          autoComplete="name"
          required
          className={inputClass}
        />
      )}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        autoComplete="email"
        required
        className={inputClass}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={isSignUp ? "Password (at least 8 characters)" : "Password"}
        autoComplete={isSignUp ? "new-password" : "current-password"}
        minLength={isSignUp ? 8 : undefined}
        required
        className={inputClass}
      />

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-stone-700 disabled:opacity-60 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200"
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        {isSignUp ? "Sign up" : "Log in"}
      </button>

      <p className="text-sm text-stone-600 dark:text-stone-400">
        {isSignUp ? "Already have an account?" : "New here?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(isSignUp ? "sign-in" : "sign-up");
            setError(null);
          }}
          className="font-medium text-emerald-600 hover:underline"
        >
          {isSignUp ? "Log in" : "Create an account"}
        </button>
      </p>
    </form>
  );
}
