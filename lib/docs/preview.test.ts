import { describe, expect, it } from "vitest";
import { documentPreview, extractPreviewDescription, extractPreviewVideo } from "@/lib/docs/preview";

describe("document link previews", () => {
  it("extracts a standard description regardless of attribute order or quoting", () => {
    expect(
      extractPreviewDescription(
        `<html><head><meta content='Daily sessions &amp; usage' data-x="1" NAME='description'></head></html>`
      )
    ).toBe("Daily sessions & usage");
  });

  it("keeps greater-than characters inside quoted descriptions", () => {
    expect(extractPreviewDescription(`<meta name="description" content="Growth > baseline">`)).toBe(
      "Growth > baseline"
    );
  });

  it("finds metadata after Unicode characters whose lowercase form changes length", () => {
    expect(extractPreviewDescription(`İ<META NAME="description" CONTENT="Unicode-safe">`)).toBe(
      "Unicode-safe"
    );
  });

  it("falls back through Open Graph and Twitter descriptions", () => {
    expect(extractPreviewDescription(`<meta property="og:description" content="Open Graph copy">`)).toBe(
      "Open Graph copy"
    );
    expect(extractPreviewDescription(`<meta name="twitter:description" content="Twitter copy">`)).toBe(
      "Twitter copy"
    );
  });

  it("ignores metadata inside comments and inert elements", () => {
    const html = `
      <!-- <meta name="description" content="comment"> -->
      <script>const example = '<meta name="description" content="script">';</script>
      <template><meta name="description" content="template"></template>
    `;
    expect(extractPreviewDescription(html)).toBeNull();
  });

  it("uses generic copy when the author supplied no description", () => {
    const preview = documentPreview({ slug: "quiet-moon-12345", title: "Design notes", html: "<h1>Hi</h1>" });
    expect(preview.title).toBe("Design notes");
    expect(preview.description).toBe("A document published on justhtml.sh.");
  });

  it("truncates long descriptions without splitting the final word when possible", () => {
    const description = Array.from({ length: 80 }, () => "sessions").join(" ");
    const preview = documentPreview({
      slug: "quiet-moon-12345",
      title: null,
      html: `<meta name="description" content="${description}">`,
    });
    expect(preview.title).toBe("quiet-moon-12345");
    expect(preview.description.length).toBeLessThanOrEqual(240);
    expect(preview.description.endsWith("sessions…")).toBe(true);
  });
});

describe("video link previews", () => {
  it("reads video metadata and decodes URL entities without fetching media", () => {
    expect(extractPreviewVideo(`<head>
      <meta property="og:video" content="https://cdn.example/demo.mp4?a=1&amp;b=2">
      <meta property="og:video:type" content="video/mp4">
      <meta property="og:video:width" content="1280">
      <meta property="og:video:height" content="720">
    </head>`)).toEqual({
      url: "https://cdn.example/demo.mp4?a=1&b=2",
      secureUrl: "https://cdn.example/demo.mp4?a=1&b=2",
      type: "video/mp4", width: 1280, height: 720,
    });
  });

  it.each(["http://cdn.example/a.mp4", "javascript:alert(1)", "/a.mp4", "https://user:pass@cdn.example/a.mp4"])("rejects unsuitable URLs: %s", (url) => {
    expect(extractPreviewVideo(`<meta property="og:video" content="${url}">`)).toBeNull();
  });

  it("prefers the secure URL and drops invalid optional metadata", () => {
    expect(extractPreviewVideo(`<meta property="og:video" content="http://cdn.example/a.mp4">
      <meta property="og:video:secure_url" content="https://cdn.example/a.mp4">
      <meta property="og:video:type" content="text/html">
      <meta property="og:video:width" content="-1">
      <meta property="og:video:height" content="Infinity">`)).toMatchObject({
        url: "https://cdn.example/a.mp4", type: undefined, width: undefined, height: undefined,
      });
  });

  it("ignores body examples, comments, and scripts", () => {
    expect(extractPreviewVideo(`<head><!-- <meta property="og:video" content="https://cdn.example/a.mp4"> -->
      <script>'<meta property="og:video" content="https://cdn.example/b.mp4">'</script></head>
      <body><meta property="og:video" content="https://cdn.example/c.mp4"></body>`)).toBeNull();
  });

  it("does not mix dimensions from a second video into the first", () => {
    expect(extractPreviewVideo(`<meta property="og:video" content="https://cdn.example/a.mp4">
      <meta property="og:video" content="https://cdn.example/b.mp4">
      <meta property="og:video:width" content="720">`)).toMatchObject({url: "https://cdn.example/a.mp4", width: undefined});
  });
});
