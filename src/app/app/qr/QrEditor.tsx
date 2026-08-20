"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Business, QrCode, ShortLink, TenantPlan } from "@/db/schema";
import type { Dictionary } from "@/lib/locale";
import {
  CORNER_DOT_TYPES,
  CORNER_SQUARE_TYPES,
  DOT_TYPES,
  FRAME_STYLES,
  type CardStyle,
} from "@/lib/card-style";
import { computeCardLayout } from "@/lib/card-layout";
import { buildCardSvg } from "@/lib/card-svg";
import { errorCorrectionFor } from "@/lib/qr-options";
import {
  DEFAULT_PRESET_ID,
  PRINT_PRESETS,
  getPreset,
} from "@/lib/print-presets";
import {
  downloadBlob,
  exportCardPdf,
  exportCardPng,
  renderQrSvg,
} from "@/lib/export/render";

interface Props {
  card: Pick<QrCode, "id" | "name" | "status" | "style">;
  business: Pick<Business, "id" | "name" | "logoDataUrl">;
  shortLink: Pick<ShortLink, "slug" | "destinationUrl" | "active" | "mode">;
  shortUrl: string;
  plan: TenantPlan;
  canEdit: boolean;
  t: Dictionary;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function QrEditor({
  card,
  business,
  shortLink,
  shortUrl,
  plan,
  canEdit,
  t,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(card.name);
  const [status, setStatus] = useState(card.status);
  const [style, setStyle] = useState<CardStyle>(card.style);
  const [destination, setDestination] = useState(shortLink.destinationUrl);
  const [mode, setMode] = useState(shortLink.mode);
  const [presetId, setPresetId] = useState(DEFAULT_PRESET_ID);
  const [cropMarks, setCropMarks] = useState(true);
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [exporting, setExporting] = useState<"pdf" | "png" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const renderToken = useRef(0);

  const preset = useMemo(() => getPreset(presetId), [presetId]);
  const logo = style.frame.showLogo ? business.logoDataUrl : null;

  const renderInput = useMemo(
    () => ({
      preset,
      style,
      businessName: business.name,
      logoDataUrl: business.logoDataUrl,
      shortUrl,
    }),
    [preset, style, business.name, business.logoDataUrl, shortUrl],
  );

  // One renderer for preview and export: what is on screen is what gets printed.
  useEffect(() => {
    const token = ++renderToken.current;
    const timer = setTimeout(async () => {
      try {
        const qrSvg = await renderQrSvg(renderInput, 900);
        if (token !== renderToken.current) return;
        const layout = computeCardLayout({
          preset: renderInput.preset,
          style: renderInput.style,
          businessName: renderInput.businessName,
          cta: renderInput.style.text.cta,
          footer: renderInput.style.text.footer,
        });
        const svg = buildCardSvg({ layout, qrSvg, showGuides: true });
        setPreviewSvg(
          svg.replace(/width="[\d.]+mm" height="[\d.]+mm"/, 'width="100%" height="100%"'),
        );
      } catch {
        if (token === renderToken.current) setError(t.common.error);
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [renderInput, t.common.error]);

  const patch = useCallback(
    async (body: Record<string, unknown>) => {
      setSaveState("saving");
      setError(null);
      try {
        const response = await fetch(`/api/qr/${card.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          setError(data.error ?? t.common.error);
          setSaveState("error");
          return;
        }
        setSaveState("saved");
        router.refresh();
      } catch {
        setError(t.common.error);
        setSaveState("error");
      }
    },
    [card.id, router, t.common.error],
  );

  async function onExport(kind: "pdf" | "png") {
    setExporting(kind);
    setError(null);
    try {
      // Fail closed: no permit, watermark.
      let watermarkText: string | null = "DEMO";
      try {
        const response = await fetch(`/api/export/permit?cardId=${card.id}`, {
          cache: "no-store",
        });
        if (response.ok) {
          const permit = (await response.json()) as { watermarkText: string | null };
          watermarkText = permit.watermarkText;
        }
      } catch {
        /* keep the watermark */
      }

      const options = { ...renderInput, watermarkText, cropMarks };
      const blob =
        kind === "pdf"
          ? await exportCardPdf(options)
          : await exportCardPng(options);
      downloadBlob(blob, `${shortLink.slug}-${preset.id}.${kind}`);
    } catch {
      setError(t.common.error);
    } finally {
      setExporting(null);
    }
  }

  function updateStyle(patchStyle: (draft: CardStyle) => CardStyle) {
    setStyle((current) => patchStyle(structuredClone(current)));
    setSaveState("idle");
  }

  const disabled = !canEdit;

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      {/* Preview column */}
      <section className="lg:col-span-5">
        <div className="panel sticky top-6 p-6">
          <span className="eyebrow mb-4">{t.editor.preview}</span>
          <div
            className="w-full overflow-hidden rounded-[var(--r-md)] border border-[color:var(--hairline)]"
            style={{ aspectRatio: `${preset.widthMm} / ${preset.heightMm}` }}
          >
            {previewSvg ? (
              <div
                className="h-full w-full"
                // Built by us from validated style values; no user HTML reaches this.
                dangerouslySetInnerHTML={{ __html: previewSvg }}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="meta">{t.common.loading}</span>
              </div>
            )}
          </div>

          <p className="hint mt-4">{t.export.bleedNote}</p>

          <div className="mt-5">
            <label className="field mb-3">
              <span className="label">{t.export.preset}</span>
              <select
                className="select"
                value={presetId}
                onChange={(event) => setPresetId(event.target.value)}
              >
                {PRINT_PRESETS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {t.export.presets[option.labelKey]}
                  </option>
                ))}
              </select>
            </label>

            <label className="mb-4 flex items-center gap-2 text-meta">
              <input
                type="checkbox"
                checked={cropMarks}
                onChange={(event) => setCropMarks(event.target.checked)}
              />
              {t.export.cropMarks}
            </label>

            {plan === "free" ? (
              <p className="alert alert--info mb-4">{t.export.watermarkNotice}</p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn--primary"
                disabled={exporting !== null}
                onClick={() => void onExport("pdf")}
                data-ev="export_pdf"
                data-ev-loc="editor"
              >
                {exporting === "pdf" ? t.export.generating : t.export.downloadPdf}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                disabled={exporting !== null}
                onClick={() => void onExport("png")}
                data-ev="export_png"
                data-ev-loc="editor"
              >
                {exporting === "png" ? t.export.generating : t.export.downloadPng}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Controls column */}
      <section className="lg:col-span-7">
        {error ? (
          <p className="alert alert--error mb-5" role="alert">
            {error}
          </p>
        ) : null}

        <div className="panel mb-6 p-6">
          <h2 className="display-md mb-5 text-title">{t.editor.title}</h2>

          <label className="field">
            <span className="label">{t.editor.cardName}</span>
            <input
              className="input"
              value={name}
              disabled={disabled}
              onChange={(event) => {
                setName(event.target.value);
                setSaveState("idle");
              }}
            />
            <span className="hint">{t.editor.cardNameHint}</span>
          </label>

          <label className="field">
            <span className="label">{t.editor.shortLink}</span>
            <input className="input font-mono" value={shortUrl} readOnly />
            <span className="hint">{t.editor.destinationHint}</span>
          </label>

          <label className="field">
            <span className="label">{t.editor.destination}</span>
            <input
              className="input"
              type="url"
              value={destination}
              disabled={disabled}
              onChange={(event) => {
                setDestination(event.target.value);
                setSaveState("idle");
              }}
            />
          </label>

          <label className="field">
            <span className="label">{t.editor.mode}</span>
            <select
              className="select"
              value={mode}
              disabled={disabled}
              onChange={(event) => {
                setMode(event.target.value as typeof mode);
                setSaveState("idle");
              }}
            >
              {(["direct", "rating_gate"] as const).map((value) => (
                <option key={value} value={value}>
                  {t.editor.modes[value]}
                </option>
              ))}
            </select>
            <span className="hint">
              {mode === "rating_gate"
                ? t.editor.modeGateHint
                : t.editor.modeDirectHint}{" "}
              {t.editor.modeHint}
            </span>
          </label>

          {mode === "rating_gate" ? (
            <p className="alert alert--info mb-6">{t.editor.modeCompliance}</p>
          ) : null}

          <div className="grid gap-x-6 sm:grid-cols-2">
            <label className="field">
              <span className="label">{t.dashboard.cardColumnStatus}</span>
              <select
                className="select"
                value={status}
                disabled={disabled}
                onChange={(event) => {
                  setStatus(event.target.value as typeof status);
                  setSaveState("idle");
                }}
              >
                {(["draft", "active", "archived"] as const).map((value) => (
                  <option key={value} value={value}>
                    {t.status[value]}
                  </option>
                ))}
              </select>
            </label>
            <div className="field">
              <span className="label">{t.editor.errorCorrection}</span>
              <p className="m-0 flex min-h-[44px] items-center">
                <span className="badge badge--accent font-mono">
                  {errorCorrectionFor(Boolean(logo))}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn--primary"
            disabled={disabled || saveState === "saving"}
            onClick={() =>
              void patch({
                name,
                style,
                status,
                destinationUrl: destination,
                mode,
              })
            }
            data-ev="card_save"
            data-ev-loc="editor"
          >
            {saveState === "saving"
              ? t.common.saving
              : saveState === "saved"
                ? t.common.saved
                : t.editor.saveCard}
          </button>
        </div>

        <div className="panel mb-6 p-6">
          <h2 className="display-md mb-5 text-title">{t.editor.style}</h2>

          <div className="grid gap-x-6 sm:grid-cols-2">
            <label className="field">
              <span className="label">{t.editor.dotStyle}</span>
              <select
                className="select"
                value={style.qr.dotsType}
                disabled={disabled}
                onChange={(event) =>
                  updateStyle((draft) => {
                    draft.qr.dotsType = event.target
                      .value as CardStyle["qr"]["dotsType"];
                    return draft;
                  })
                }
              >
                {DOT_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {t.editor.dots[value]}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="label">{t.editor.cornerSquareStyle}</span>
              <select
                className="select"
                value={style.qr.cornerSquareType}
                disabled={disabled}
                onChange={(event) =>
                  updateStyle((draft) => {
                    draft.qr.cornerSquareType = event.target
                      .value as CardStyle["qr"]["cornerSquareType"];
                    return draft;
                  })
                }
              >
                {CORNER_SQUARE_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {t.editor.corners[value]}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="label">{t.editor.cornerDotStyle}</span>
              <select
                className="select"
                value={style.qr.cornerDotType}
                disabled={disabled}
                onChange={(event) =>
                  updateStyle((draft) => {
                    draft.qr.cornerDotType = event.target
                      .value as CardStyle["qr"]["cornerDotType"];
                    return draft;
                  })
                }
              >
                {CORNER_DOT_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {t.editor.corners[value === "dot" ? "dot" : "square"]}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="label">{t.editor.frameStyle}</span>
              <select
                className="select"
                value={style.frame.style}
                disabled={disabled}
                onChange={(event) =>
                  updateStyle((draft) => {
                    draft.frame.style = event.target
                      .value as CardStyle["frame"]["style"];
                    return draft;
                  })
                }
              >
                {FRAME_STYLES.map((value) => (
                  <option key={value} value={value}>
                    {t.editor.frames[value]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-x-6 sm:grid-cols-3">
            <ColorField
              label={t.editor.qrColor}
              value={style.qr.dotsColor}
              disabled={disabled}
              onChange={(value) =>
                updateStyle((draft) => {
                  draft.qr.dotsColor = value;
                  draft.qr.cornerDotColor = value;
                  draft.frame.ink = value;
                  return draft;
                })
              }
            />
            <ColorField
              label={t.editor.accentColor}
              value={style.frame.accent}
              disabled={disabled}
              onChange={(value) =>
                updateStyle((draft) => {
                  draft.frame.accent = value;
                  draft.qr.cornerSquareColor = value;
                  return draft;
                })
              }
            />
            <ColorField
              label={t.editor.bgColor}
              value={style.frame.background}
              disabled={disabled}
              onChange={(value) =>
                updateStyle((draft) => {
                  draft.frame.background = value;
                  draft.qr.backgroundColor = value;
                  return draft;
                })
              }
            />
          </div>
        </div>

        <div className="panel p-6">
          <h2 className="display-md mb-5 text-title">{t.editor.frame}</h2>

          <label className="field">
            <span className="label">{t.editor.ctaText}</span>
            <input
              className="input"
              value={style.text.cta}
              maxLength={60}
              disabled={disabled}
              onChange={(event) =>
                updateStyle((draft) => {
                  draft.text.cta = event.target.value;
                  return draft;
                })
              }
            />
          </label>

          <label className="field">
            <span className="label">{t.editor.footerText}</span>
            <input
              className="input"
              value={style.text.footer}
              maxLength={60}
              disabled={disabled}
              onChange={(event) =>
                updateStyle((draft) => {
                  draft.text.footer = event.target.value;
                  return draft;
                })
              }
            />
          </label>

          <label className="mb-3 flex items-center gap-2 text-meta">
            <input
              type="checkbox"
              checked={style.frame.showBusinessName}
              disabled={disabled}
              onChange={(event) =>
                updateStyle((draft) => {
                  draft.frame.showBusinessName = event.target.checked;
                  return draft;
                })
              }
            />
            {business.name}
          </label>

          <label className="flex items-center gap-2 text-meta">
            <input
              type="checkbox"
              checked={style.frame.showLogo}
              disabled={disabled || !business.logoDataUrl}
              onChange={(event) =>
                updateStyle((draft) => {
                  draft.frame.showLogo = event.target.checked;
                  return draft;
                })
              }
            />
            {t.editor.showLogo}
          </label>
          <span className="hint">{t.editor.showLogoHint}</span>
        </div>
      </section>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      <input
        type="color"
        className="color-input"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
      />
    </label>
  );
}
