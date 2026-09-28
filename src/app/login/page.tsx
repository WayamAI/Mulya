"use client";

import { Eye, EyeOff, Moon, SunMedium, TriangleAlert } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { Logo } from "@/components/layout/logo";
import { useTheme } from "@/context/theme-context";
import { credentialsMatch, DEMO_EMAIL, DEMO_PASSWORD, safeNext, writeSession } from "@/lib/auth/session";

const FIELD =
  "h-11 w-full rounded-full border border-muted bg-action px-4 text-body-md text-primary outline-none transition-colors duration-[150ms] placeholder:text-quaternary hover:border-default focus-visible:border-default focus-visible:ring-2 focus-visible:ring-active aria-[invalid=true]:border-error-stroke";

/**
 * Sign-in. The left panel is the Mūlya hero: three sample parts being
 * measured into a price.
 */
export default function LoginPage() {
  return (
    <Suspense>
      <LoginView />
    </Suspense>
  );
}

function LoginView() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { isDark, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!credentialsMatch(email, password)) {
      setError("That email or password does not match the demo operator.");
      return;
    }
    setBusy(true);
    setError(undefined);
    writeSession();
    router.replace(next);
  }

  function fillDemo() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError(undefined);
  }

  return (
    <div className="flex h-full min-h-0 bg-page">
      <aside className="relative hidden min-w-0 flex-[1.4] overflow-hidden bg-black lg:block">
        {/* The panel is desktop-only, so phones get a 1px placeholder instead of the 96 KB hero. */}
        <picture>
          <source media="(min-width: 1024px)" srcSet="/brand/mulya-hero.webp" type="image/webp" />
          <img
            src="data:image/gif;base64,R0lGODlhAQABAAAAACw="
            alt=""
            fetchPriority="high"
            className="absolute inset-0 size-full object-cover object-[35%_center]"
          />
        </picture>
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-r from-transparent to-page" />
        <div className="absolute inset-x-0 bottom-0 h-[46%] bg-gradient-to-t from-black/85 to-transparent" />
        <div className="absolute right-10 bottom-10 left-10 max-w-[36rem]">
          <p className="font-display text-display-2xl text-white sm:text-display-3xl">What should this part cost?</p>
          <p className="mt-3 max-w-[44ch] text-body-md text-white/75">
            The should-cost, where it sits and what to change, while the design can still change. Before the supplier
            quote arrives.
          </p>
        </div>
      </aside>

      <section className="flex min-h-0 w-full shrink-0 flex-col overflow-y-auto border-muted bg-page lg:w-[min(28rem,42%)] lg:border-l">
        <div className="flex items-center justify-between px-8 pt-6">
          <Logo wordmark href={false} />
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light" : "Switch to dark"}
            title={isDark ? "Switch to light" : "Switch to dark"}
            className="flex size-8 items-center justify-center rounded-full bg-action icon-tertiary outline-none transition-colors duration-[180ms] hover:bg-raised-2 hover:icon-secondary focus-visible:ring-2 focus-visible:ring-active"
          >
            {isDark ? (
              <SunMedium size={16} strokeWidth={1.75} aria-hidden />
            ) : (
              <Moon size={16} strokeWidth={1.75} aria-hidden />
            )}
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center px-8 py-10">
          <h1 className="font-display text-display-xl text-primary">Sign in</h1>
          <p className="mt-1.5 text-body-md text-tertiary">The estimating workbench is operator-only.</p>

          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4" noValidate>
            <label className="flex flex-col gap-1.5">
              <span className="text-caption tracking-[0.08em] text-quaternary uppercase">Email</span>
              <input
                type="email"
                name="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={DEMO_EMAIL}
                aria-invalid={error ? true : undefined}
                className={FIELD}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-caption tracking-[0.08em] text-quaternary uppercase">Password</span>
              <span className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  aria-invalid={error ? true : undefined}
                  className={`${FIELD} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full icon-tertiary outline-none transition-colors duration-[150ms] hover:bg-raised-2 hover:icon-secondary focus-visible:ring-2 focus-visible:ring-active"
                >
                  {showPassword ? (
                    <EyeOff size={15} strokeWidth={1.75} aria-hidden />
                  ) : (
                    <Eye size={15} strokeWidth={1.75} aria-hidden />
                  )}
                </button>
              </span>
            </label>

            {error ? (
              <p role="alert" className="flex items-start gap-2 text-body-sm text-error">
                <TriangleAlert size={14} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0" />
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="mt-1 h-11 rounded-full bg-action-primary text-label-md text-on-color outline-none transition-colors duration-[180ms] hover:bg-action-primary-hover focus-visible:ring-2 focus-visible:ring-active disabled:bg-action-primary-disabled"
            >
              {busy ? "Opening the workbench…" : "Enter the workbench"}
            </button>
          </form>

          <p className="mt-6 text-body-sm text-quaternary">
            Demo operator{" "}
            <button
              type="button"
              onClick={fillDemo}
              className="text-secondary underline-offset-2 outline-none hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-active"
            >
              {DEMO_EMAIL}
            </button>
            <span className="text-quaternary"> · </span>
            <span className="tabular text-tertiary">{DEMO_PASSWORD}</span>
          </p>
          <p className="mt-2 text-body-sm text-quaternary">Prototype sign-in: a browser cookie, no identity provider.</p>
        </div>
      </section>
    </div>
  );
}
