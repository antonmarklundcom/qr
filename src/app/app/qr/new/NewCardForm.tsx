"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/lib/locale";

export function NewCardForm({
  businesses,
  t,
}: {
  businesses: { id: number; name: string; hasDestination: boolean }[];
  t: Dictionary;
}) {
  const router = useRouter();
  const [businessId, setBusinessId] = useState(
    String(businesses.find((b) => b.hasDestination)?.id ?? businesses[0]?.id ?? ""),
  );
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: Number(businessId), name }),
      });
      const data = (await response.json()) as { id?: number; error?: string };
      if (!response.ok || !data.id) {
        setError(data.error ?? t.common.error);
        return;
      }
      router.push(`/app/qr/${data.id}`);
    } catch {
      setError(t.common.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      {error ? (
        <p className="alert alert--error mb-5" role="alert">
          {error}
        </p>
      ) : null}

      <label className="field">
        <span className="label">{t.editor.business}</span>
        <select
          className="select"
          value={businessId}
          onChange={(event) => setBusinessId(event.target.value)}
          required
        >
          {businesses.map((business) => (
            <option key={business.id} value={business.id}>
              {business.name}
              {business.hasDestination ? "" : ` — ${t.businesses.needsDestination}`}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="label">{t.editor.cardName}</span>
        <input
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Mostrador"
        />
        <span className="hint">{t.editor.cardNameHint}</span>
      </label>

      <button type="submit" className="btn btn--primary" disabled={busy || !businessId}>
        {busy ? t.common.loading : t.editor.createCard}
      </button>
    </form>
  );
}
