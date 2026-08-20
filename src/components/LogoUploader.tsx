"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/lib/locale";
import { LOGO_ALLOWED_TYPES, LOGO_MAX_BYTES } from "@/lib/plan";

export function LogoUploader({
  businessId,
  initialLogo,
  t,
}: {
  businessId: number;
  initialLogo: string | null;
  t: Dictionary;
}) {
  const [logo, setLogo] = useState(initialLogo);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function send(body: FormData) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/upload/logo", {
        method: "POST",
        body,
      });
      const data = (await response.json()) as {
        logoDataUrl?: string | null;
        error?: string;
      };
      if (!response.ok) {
        setError(data.error ?? t.common.error);
        return;
      }
      setLogo(data.logoDataUrl ?? null);
      startTransition(() => router.refresh());
    } catch {
      setError(t.common.error);
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File) {
    // Mirrors the server-side check so the user gets the error before the upload.
    if (!LOGO_ALLOWED_TYPES.includes(file.type)) {
      setError(t.businesses.logoBadType);
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setError(t.businesses.logoTooBig);
      return;
    }
    const body = new FormData();
    body.set("businessId", String(businessId));
    body.set("file", file);
    await send(body);
  }

  return (
    <div>
      <span className="label">{t.businesses.logo}</span>

      <div className="mt-2 flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[color:var(--surface)]">
          {logo ? (
            // Data URI from our own DB; next/image would have to proxy it for nothing.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="max-h-16 max-w-16 object-contain" />
          ) : (
            <span className="meta">{t.common.none}</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={LOGO_ALLOWED_TYPES.join(",")}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onFile(file);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? t.common.loading : t.businesses.logo}
          </button>
          {logo ? (
            <button
              type="button"
              className="btn btn--danger btn--sm"
              disabled={busy}
              onClick={() => {
                const body = new FormData();
                body.set("businessId", String(businessId));
                body.set("remove", "1");
                void send(body);
              }}
            >
              {t.businesses.removeLogo}
            </button>
          ) : null}
        </div>
      </div>

      <span className="hint">{t.businesses.logoHint}</span>
      {error ? (
        <p className="alert alert--error mt-3" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
