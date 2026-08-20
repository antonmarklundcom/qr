import type { CardLayout, TextBlock } from "@/lib/card-layout";

const FONT_STACK = "Helvetica, Arial, sans-serif";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function round(n: number): string {
  return Number(n.toFixed(3)).toString();
}

/**
 * qr-code-styling hands back a standalone <svg> document. Re-tag it as a nested <svg>
 * so the card stays a single vector document instead of an image-inside-an-image.
 */
function nestQrSvg(qrSvg: string, x: number, y: number, size: number): string {
  const viewBoxMatch = qrSvg.match(/viewBox="([^"]+)"/);
  const widthMatch = qrSvg.match(/width="([\d.]+)"/);
  const viewBox =
    viewBoxMatch?.[1] ?? `0 0 ${widthMatch?.[1] ?? "512"} ${widthMatch?.[1] ?? "512"}`;

  const inner = qrSvg
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "");

  return `<svg x="${round(x)}" y="${round(y)}" width="${round(size)}" height="${round(
    size,
  )}" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
}

function renderTextBlock(block: TextBlock): string {
  const anchor = block.align === "center" ? "middle" : "start";
  const x = block.align === "center" ? block.x + block.w / 2 : block.x;
  const weight = block.weight === "bold" ? "600" : "400";

  return block.lines
    .map((line, i) => {
      const y = block.y + block.size * 0.8 + i * block.size * block.lineHeight;
      return `<text x="${round(x)}" y="${round(y)}" fill="${block.color}" font-family="${FONT_STACK}" font-size="${round(
        block.size,
      )}" font-weight="${weight}" letter-spacing="${round(
        block.size * -0.02,
      )}" text-anchor="${anchor}">${escapeXml(line)}</text>`;
    })
    .join("");
}

function roundedRect(
  r: { x: number; y: number; w: number; h: number; r: number },
  fill: string,
): string {
  return `<rect x="${round(r.x)}" y="${round(r.y)}" width="${round(r.w)}" height="${round(
    r.h,
  )}" rx="${round(r.r)}" fill="${fill}"/>`;
}

export interface BuildCardSvgOptions {
  layout: CardLayout;
  /** Raw SVG document produced by qr-code-styling. */
  qrSvg: string;
  /** Bleed and safe-margin guides — editor preview only, never in an export. */
  showGuides?: boolean;
  /** Printer crop marks in the bleed area. */
  cropMarks?: boolean;
  /** Free-plan watermark. The flag comes from the server, not the client. */
  watermarkText?: string | null;
}

export function buildCardSvg({
  layout,
  qrSvg,
  showGuides = false,
  cropMarks = false,
  watermarkText = null,
}: BuildCardSvgOptions): string {
  const { canvas, trim, safe } = layout;
  const parts: string[] = [];

  parts.push(
    `<rect x="0" y="0" width="${round(canvas.w)}" height="${round(canvas.h)}" fill="${layout.background}"/>`,
  );

  if (layout.band) parts.push(roundedRect(layout.band, layout.accent));

  if (layout.outline) {
    parts.push(
      `<rect x="${round(layout.outline.x)}" y="${round(layout.outline.y)}" width="${round(
        layout.outline.w,
      )}" height="${round(layout.outline.h)}" rx="${round(layout.outline.r)}" fill="none" stroke="${layout.accent}" stroke-width="${round(layout.outline.stroke)}"/>`,
    );
  }

  parts.push(nestQrSvg(qrSvg, layout.qr.x, layout.qr.y, layout.qr.w));

  if (layout.businessName) parts.push(renderTextBlock(layout.businessName));
  parts.push(renderTextBlock(layout.cta));
  if (layout.footer) parts.push(renderTextBlock(layout.footer));

  if (watermarkText) {
    parts.push(renderWatermark(canvas, watermarkText));
  }

  if (cropMarks) parts.push(renderCropMarks(layout));

  if (showGuides) {
    parts.push(
      `<rect x="${round(trim.x)}" y="${round(trim.y)}" width="${round(trim.w)}" height="${round(
        trim.h,
      )}" fill="none" stroke="#4b3fd1" stroke-opacity="0.35" stroke-width="0.2" stroke-dasharray="1 1"/>`,
      `<rect x="${round(safe.x)}" y="${round(safe.y)}" width="${round(safe.w)}" height="${round(
        safe.h,
      )}" fill="none" stroke="#b3261e" stroke-opacity="0.3" stroke-width="0.2" stroke-dasharray="0.6 1.2"/>`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${round(
    canvas.w,
  )}mm" height="${round(canvas.h)}mm" viewBox="0 0 ${round(canvas.w)} ${round(
    canvas.h,
  )}">${parts.join("")}</svg>`;
}

function renderWatermark(canvas: { w: number; h: number }, text: string): string {
  const size = Math.min(canvas.w, canvas.h) * 0.075;
  const step = size * 4;
  const rows: string[] = [];
  for (let y = -canvas.h; y < canvas.h * 2; y += step) {
    for (let x = -canvas.w; x < canvas.w * 2; x += step * 2.2) {
      rows.push(
        `<text x="${round(x)}" y="${round(y)}" fill="#171628" fill-opacity="0.16" font-family="${FONT_STACK}" font-size="${round(
          size,
        )}" font-weight="600">${escapeXml(text)}</text>`,
      );
    }
  }
  return `<g transform="rotate(-30 ${round(canvas.w / 2)} ${round(canvas.h / 2)})">${rows.join(
    "",
  )}</g>`;
}

function renderCropMarks(layout: CardLayout): string {
  const { trim, bleedMm, canvas } = layout;
  const len = bleedMm * 0.8;
  const w = 0.15;
  const stroke = `stroke="#171628" stroke-width="${w}"`;
  const marks: string[] = [];
  const xs = [trim.x, trim.x + trim.w];
  const ys = [trim.y, trim.y + trim.h];

  for (const x of xs) {
    marks.push(`<line x1="${round(x)}" y1="0" x2="${round(x)}" y2="${round(len)}" ${stroke}/>`);
    marks.push(
      `<line x1="${round(x)}" y1="${round(canvas.h - len)}" x2="${round(x)}" y2="${round(
        canvas.h,
      )}" ${stroke}/>`,
    );
  }
  for (const y of ys) {
    marks.push(`<line x1="0" y1="${round(y)}" x2="${round(len)}" y2="${round(y)}" ${stroke}/>`);
    marks.push(
      `<line x1="${round(canvas.w - len)}" y1="${round(y)}" x2="${round(canvas.w)}" y2="${round(
        y,
      )}" ${stroke}/>`,
    );
  }
  return marks.join("");
}
