import { htmlToText } from "@/lib/docs/anchor";
import type { DocRow } from "@/lib/docs/store";

const DESCRIPTION_MAX = 240;
const IMAGE_TITLE_MAX = 120;
const IMAGE_DESCRIPTION_MAX = 220;
const FALLBACK_DESCRIPTION = "A document published on justhtml.sh.";

function attributes(tag: string): Map<string, string> {
  const out = new Map<string, string>();
  const source = tag.replace(/^<meta\b/i, "").replace(/\/?\s*>$/, "");
  const re = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    out.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
  }
  return out;
}

function clean(value: string): string {
  return htmlToText(value).replace(/\s+/g, " ").trim();
}

function metaTags(html: string): string[] {
  const tags: string[] = [];
  const startTag = /<meta(?=[\s/>])/gi;
  let match: RegExpExecArray | null;
  while ((match = startTag.exec(html)) !== null) {
    const start = match.index;
    let quote = "";
    let end = startTag.lastIndex;
    for (; end < html.length; end++) {
      const char = html[end];
      if (quote) {
        if (char === quote) quote = "";
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === ">") {
        tags.push(html.slice(start, end + 1));
        break;
      }
    }
    startTag.lastIndex = end + 1;
  }
  return tags;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const boundary = cut.lastIndexOf(" ");
  return `${cut.slice(0, boundary > max * 0.65 ? boundary : cut.length).trimEnd()}…`;
}

/**
 * Read the description the document author deliberately put in its <head>.
 * Script/style/comment contents are removed first so inert example markup cannot
 * become a link preview. Open Graph and Twitter descriptions are accepted as
 * fallbacks because agents may publish any of the three standard forms.
 */
export function extractPreviewDescription(html: string): string | null {
  const source = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  const found = new Map<string, string>();
  for (const tag of metaTags(source)) {
    const attrs = attributes(tag);
    const key = (attrs.get("name") ?? attrs.get("property") ?? "").toLowerCase();
    const content = clean(attrs.get("content") ?? "");
    if (content && !found.has(key)) found.set(key, content);
  }
  const description =
    found.get("description") ?? found.get("og:description") ?? found.get("twitter:description");
  return description ? truncate(description, DESCRIPTION_MAX) : null;
}

export function documentPreview(doc: Pick<DocRow, "slug" | "title" | "html">): {
  title: string;
  description: string;
  imageTitle: string;
  imageDescription: string;
} {
  const title = doc.title || doc.slug;
  const description = extractPreviewDescription(doc.html) ?? FALLBACK_DESCRIPTION;
  return {
    title,
    description,
    imageTitle: truncate(title, IMAGE_TITLE_MAX),
    imageDescription: truncate(description, IMAGE_DESCRIPTION_MAX),
  };
}

/** Lift the first authored OG video from the document into its viewer shell.
 * Only absolute HTTPS media URLs are useful to an unauthenticated unfurler.
 * We emit metadata only: the server never fetches the author's URL.
 */
export function extractPreviewVideo(html: string): {
  url: string;
  secureUrl: string;
  type?: string;
  width?: number;
  height?: number;
} | null {
  const source = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  const head = source.match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i)?.[1]
    ?? source.split(/<body\b/i)[0];
  const values = new Map<string, string>();
  let started = false;
  for (const tag of metaTags(head)) {
    const attrs = attributes(tag);
    const key = (attrs.get("property") ?? "").toLowerCase();
    if (key === "og:video" || key === "og:video:url") {
      // Structured properties belong to the first video, never a later one.
      if (started) break;
      started = true;
    }
    if (key.startsWith("og:video") && !values.has(key)) {
      values.set(key, clean(attrs.get("content") ?? ""));
    }
  }
  function httpsUrl(value?: string): string | null {
    if (!value) return null;
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  }
  const url = httpsUrl(values.get("og:video:secure_url"))
    ?? httpsUrl(values.get("og:video")) ?? httpsUrl(values.get("og:video:url"));
  if (!url) return null;
  const type = values.get("og:video:type");
  function dimension(key: string): number | undefined {
    const value = values.get(key) ?? "";
    return /^\d+$/.test(value) && Number(value) > 0 && Number(value) <= 16384
      ? Number(value) : undefined;
  }
  return {
    url,
    secureUrl: url,
    type: type && /^video\/[a-z0-9.+-]+$/i.test(type) ? type : undefined,
    width: dimension("og:video:width"),
    height: dimension("og:video:height"),
  };
}
