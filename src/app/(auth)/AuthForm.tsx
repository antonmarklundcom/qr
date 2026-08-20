"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import type { AuthFormState } from "./actions";
import type { Dictionary } from "@/lib/locale";

type Action = (
  prev: AuthFormState,
  formData: FormData,
) => Promise<AuthFormState>;

export function AuthForm({
  mode,
  action,
  t,
}: {
  mode: "login" | "register";
  action: Action;
  t: Dictionary;
}) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(action, {});

  return (
    <form action={formAction} noValidate>
      {state.error ? (
        <p className="alert alert--error mb-5" role="alert">
          {state.error}
        </p>
      ) : null}

      {mode === "register" ? (
        <>
          <label className="field">
            <span className="label">{t.auth.name}</span>
            <input className="input" name="name" autoComplete="name" />
          </label>
          <label className="field">
            <span className="label">{t.auth.tenantName}</span>
            <input className="input" name="tenantName" autoComplete="organization" />
          </label>
        </>
      ) : null}

      <label className="field">
        <span className="label">{t.auth.email}</span>
        <input
          className="input"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </label>

      <label className="field">
        <span className="label">{t.auth.password}</span>
        <input
          className="input"
          name="password"
          type="password"
          required
          minLength={mode === "register" ? 8 : undefined}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
        />
      </label>

      <SubmitButton pendingLabel={t.common.loading}>
        {mode === "register" ? t.auth.register : t.auth.login}
      </SubmitButton>
    </form>
  );
}
