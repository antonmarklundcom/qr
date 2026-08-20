import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { buildCardSvg } from "@/lib/card-svg";
import {
  computeCardLayout,
  measureText,
  type CardLayout,
  type TextBlock,
} from "@/lib/card-layout";
import { buildQrOptions } from "@/lib/qr-options";
import type { CardStyle } from "@/lib/card-style";
import { EXPORT_DPI, mmToPt, mmToPx, type PrintPreset } from "@/lib/print-presets";

export interface CardRenderInput {
  preset: PrintPreset;
  style: CardStyle;
  businessName: string;
  logoDataUrl?: string | null;
  shortUrl: string;
}

/** Browser-only: qr-code-styling touches the DOM, so it is imported lazily. */
export async function renderQrSvg(
  input: Omit<CardRenderInput, "preset">,
  size = 1024,
): Promise<string> {
  const { default: QRCodeStyling } = await import("qr-code-styling");
  const qr = new QRCodeStyling(
    buildQrOptions({
      data: input.shortUrl,
      style: input.style,
      logoDataUrl: input.logoDataUrl,
      size,
    }),
  );
  const raw = await qr.getRawData("svg");
  if (!raw) throw new Error("qr-code-styling returned no SVG data");
  const blob = raw instanceof Blob ? raw : new Blob([raw as BlobPart]);
  return blob.text();
}

export function layoutFor(input: CardRenderInput): CardLayout {
  return computeCardLayout({
    preset: input.preset,
    style: input.style,
    businessName: input.businessName,
    cta: input.style.text.cta,
    footer: input.style.text.footer,
  });
}

function svgToDataUrl(svg: string): string {
  const bytes = new TextEncoder().encode(svg);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

async function rasterize(
  svg: string,
  widthPx: number,
  heightPx: number,
): Promise<Blob> {
  const image = new Image();
  image.decoding = "sync";
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Could not rasterize the card SVG"));
  });
  image.src = svgToDataUrl(svg);
  await loaded;

  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(image, 0, 0, widthPx, heightPx);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed"))),
      "image/png",
    );
  });
}

export interface ExportOptions extends CardRenderInput {
  watermarkText?: string | null;
  cropMarks?: boolean;
}

/** Vector SVG rasterized at 300 DPI for the chosen physical size, bleed included. */
export async function exportCardPng(options: ExportOptions): Promise<Blob> {
  const layout = layoutFor(options);
  const qrSvg = await renderQrSvg(options, 1400);
  const svg = buildCardSvg({
    layout,
    qrSvg,
    cropMarks: options.cropMarks,
    watermarkText: options.watermarkText,
  });
  return rasterize(
    svg,
    mmToPx(layout.canvas.w, EXPORT_DPI),
    mmToPx(layout.canvas.h, EXPORT_DPI),
  );
}

const WINANSI_FALLBACK: Record<string, string> = { "’": "'", "‘": "'" };

function pdfSafe(text: string): string {
  return text.replace(/[‘’]/g, (c) => WINANSI_FALLBACK[c] ?? c);
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return rgb(
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  );
}

function drawTextBlock(
  page: PDFPage,
  block: TextBlock,
  canvasHeightMm: number,
  fonts: { regular: PDFFont; bold: PDFFont },
) {
  const font = block.weight === "bold" ? fonts.bold : fonts.regular;
  block.lines.forEach((line, i) => {
    const baselineMm = block.y + block.size * 0.8 + i * block.size * block.lineHeight;
    const xMm =
      block.align === "center"
        ? block.x + (block.w - measureText(line, block.size)) / 2
        : block.x;
    page.drawText(pdfSafe(line), {
      x: mmToPt(xMm),
      y: mmToPt(canvasHeightMm - baselineMm),
      size: mmToPt(block.size),
      font,
      color: hexToRgb(block.color),
    });
  });
}

/**
 * Exact physical size with 3 mm bleed and 4 mm safe margins (plan §6). Frame and text
 * stay vector; only the QR itself is embedded as a high-resolution raster, which is
 * well past what any printer resolves.
 */
export async function exportCardPdf(options: ExportOptions): Promise<Blob> {
  const layout = layoutFor(options);
  const qrSvg = await renderQrSvg(options, 1400);

  const qrPx = mmToPx(layout.qr.w, 600);
  const qrPng = await rasterize(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${qrPx}" height="${qrPx}" viewBox="0 0 ${layout.qr.w} ${layout.qr.w}">${buildCardSvgQrOnly(
      layout,
      qrSvg,
    )}</svg>`,
    qrPx,
    qrPx,
  );

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([mmToPt(layout.canvas.w), mmToPt(layout.canvas.h)]);
  const fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
  const H = layout.canvas.h;

  page.drawRectangle({
    x: 0,
    y: 0,
    width: mmToPt(layout.canvas.w),
    height: mmToPt(layout.canvas.h),
    color: hexToRgb(layout.background),
  });

  if (layout.band) {
    // drawSvgPath takes a y-down path anchored at the given point, which lines the
    // rounded band up with the SVG renderer instead of squaring off its corners.
    page.drawSvgPath(roundedRectPath(layout.band), {
      x: mmToPt(layout.band.x),
      y: mmToPt(H - layout.band.y),
      color: hexToRgb(layout.accent),
      borderWidth: 0,
    });
  }

  if (layout.outline) {
    page.drawRectangle({
      x: mmToPt(layout.outline.x),
      y: mmToPt(H - layout.outline.y - layout.outline.h),
      width: mmToPt(layout.outline.w),
      height: mmToPt(layout.outline.h),
      borderColor: hexToRgb(layout.accent),
      borderWidth: mmToPt(layout.outline.stroke),
    });
  }

  const qrImage = await pdf.embedPng(await qrPng.arrayBuffer());
  page.drawImage(qrImage, {
    x: mmToPt(layout.qr.x),
    y: mmToPt(H - layout.qr.y - layout.qr.h),
    width: mmToPt(layout.qr.w),
    height: mmToPt(layout.qr.h),
  });

  if (layout.businessName) drawTextBlock(page, layout.businessName, H, fonts);
  drawTextBlock(page, layout.cta, H, fonts);
  if (layout.footer) drawTextBlock(page, layout.footer, H, fonts);

  if (options.cropMarks) drawCropMarks(page, layout);
  if (options.watermarkText) {
    drawWatermark(page, layout, options.watermarkText, fonts.bold);
  }

  const bytes = await pdf.save();
  return new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
}

function roundedRectPath({
  w,
  h,
  r,
}: {
  w: number;
  h: number;
  r: number;
}): string {
  const width = mmToPt(w);
  const height = mmToPt(h);
  const radius = Math.min(mmToPt(r), width / 2, height / 2);
  if (radius <= 0) return `M 0 0 H ${width} V ${height} H 0 Z`;
  return [
    `M ${radius} 0`,
    `H ${width - radius}`,
    `A ${radius} ${radius} 0 0 1 ${width} ${radius}`,
    `V ${height - radius}`,
    `A ${radius} ${radius} 0 0 1 ${width - radius} ${height}`,
    `H ${radius}`,
    `A ${radius} ${radius} 0 0 1 0 ${height - radius}`,
    `V ${radius}`,
    `A ${radius} ${radius} 0 0 1 ${radius} 0`,
    "Z",
  ].join(" ");
}

/** The QR on its own, on the card background, for embedding into the PDF. */
function buildCardSvgQrOnly(layout: CardLayout, qrSvg: string): string {
  const inner = qrSvg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const viewBox = qrSvg.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 1400 1400";
  return `<svg x="0" y="0" width="${layout.qr.w}" height="${layout.qr.w}" viewBox="${viewBox}">${inner}</svg>`;
}

function drawCropMarks(page: PDFPage, layout: CardLayout) {
  const { trim, canvas, bleedMm } = layout;
  const len = bleedMm * 0.8;
  const color = rgb(0.09, 0.086, 0.157);
  const thickness = mmToPt(0.15);
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    page.drawLine({
      start: { x: mmToPt(x1), y: mmToPt(canvas.h - y1) },
      end: { x: mmToPt(x2), y: mmToPt(canvas.h - y2) },
      thickness,
      color,
    });

  for (const x of [trim.x, trim.x + trim.w]) {
    line(x, 0, x, len);
    line(x, canvas.h - len, x, canvas.h);
  }
  for (const y of [trim.y, trim.y + trim.h]) {
    line(0, y, len, y);
    line(canvas.w - len, y, canvas.w, y);
  }
}

function drawWatermark(
  page: PDFPage,
  layout: CardLayout,
  text: string,
  font: PDFFont,
) {
  const size = Math.min(layout.canvas.w, layout.canvas.h) * 0.075;
  const step = size * 4;
  for (let y = 0; y < layout.canvas.h + step; y += step) {
    for (let x = -layout.canvas.w * 0.3; x < layout.canvas.w; x += step * 2.2) {
      page.drawText(pdfSafe(text), {
        x: mmToPt(x),
        y: mmToPt(layout.canvas.h - y),
        size: mmToPt(size),
        font,
        color: rgb(0.09, 0.086, 0.157),
        opacity: 0.16,
        rotate: degrees(-30),
      });
    }
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
