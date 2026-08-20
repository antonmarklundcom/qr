"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import type { Dictionary } from "@/lib/locale";
import type { Business } from "@/db/schema";
import type { BusinessFormState } from "./actions";

type Action = (
  prev: BusinessFormState,
  formData: FormData,
) => Promise<BusinessFormState>;

export function BusinessForm({
  action,
  t,
  business,
  submitLabel,
}: {
  action: Action;
  t: Dictionary;
  business?: Business;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<BusinessFormState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction}>
      {business ? <input type="hidden" name="id" value={business.id} /> : null}

      {state.error ? (
        <p className="alert alert--error mb-5" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="alert alert--info mb-5" role="status">
          {t.common.saved}
        </p>
      ) : null}

      <label className="field">
        <span className="label">{t.businesses.name}</span>
        <input
          className="input"
          name="name"
          required
          defaultValue={business?.name ?? ""}
        />
      </label>

      <div className="grid gap-x-6 sm:grid-cols-2">
        <label className="field">
          <span className="label">{t.businesses.city}</span>
          <input className="input" name="city" defaultValue={business?.city ?? ""} />
        </label>
        <label className="field">
          <span className="label">{t.businesses.whatsapp}</span>
          <input
            className="input"
            name="whatsapp"
            inputMode="tel"
            placeholder="+595981123456"
            defaultValue={business?.whatsapp ?? ""}
          />
          <span className="hint">{t.businesses.whatsappHint}</span>
        </label>
      </div>

      <label className="field">
        <span className="label">{t.businesses.placeId}</span>
        <input
          className="input"
          name="googlePlaceId"
          defaultValue={business?.googlePlaceId ?? ""}
        />
        <span className="hint">{t.businesses.placeIdHint}</span>
      </label>

      <label className="field">
        <span className="label">
          {t.businesses.reviewUrl}{" "}
          <span className="meta">({t.common.optional})</span>
        </span>
        <input
          className="input"
          name="googleReviewUrl"
          type="url"
          placeholder="https://…"
          defaultValue={business?.googleReviewUrl ?? ""}
        />
        <span className="hint">{t.businesses.reviewUrlHint}</span>
      </label>

      <SubmitButton
        pendingLabel={t.common.saving}
        className="btn btn--primary"
      >
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
