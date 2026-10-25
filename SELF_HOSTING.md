# Self-host on Vercel

This fork is deployed from `dprevoznik/just-html` to the `just-html` project in
`dprevozniks-projects`. Production: https://just-html-dprevozniks-projects.vercel.app

## Finish service setup

In Vercel → Project → Settings → Environment Variables, configure:

- `APP_ORIGIN`: your canonical HTTPS origin, without a path (already configured
  for the production address above). Change this when attaching a custom domain.
- `DATABASE_URL`: a Postgres connection string, e.g. from a Neon integration in
  Vercel Storage. `PLANETSCALE_URL` is also supported for existing installations.
  Use a connection with TLS. Never share the value in chat or commit it.
- `RESEND_API_KEY`: a key from your Resend account.
- `RESEND_FROM`: e.g. `Documents <login@notify.example.com>`, using a sending
  domain verified in your Resend account. The upstream sender won't work with
  your account. Resend's test sender can only send to your own verified address.

Apply the SQL migrations before using the app. You can run
`node scripts/migrate.mjs` in a trusted shell with `DATABASE_URL` configured, or
set Vercel's Build Command to `npm run build:deploy` and redeploy after adding
these environment variables. This command applies pending migrations before
building. Use a dedicated database for this instance. Do not give preview
branches write access to your production database.

`/api/health` must return `{"ok":true,"db":true}`. Then visit `/auth.md` to
register an API key, or `/login` to receive a sign-in link. Test delivery from
your configured sender before sharing documents with others.

Production must be publicly reachable for iMessage's preview fetcher. The
project's Vercel Authentication protects previews only; document authentication
continues to protect private documents in production.

## Per-document video previews

Include these tags in the document's `<head>` when publishing via
`POST /api/v1/docs`, or replace the HTML via `PATCH /api/v1/docs/:slug`:

```html
<head>
  <meta name="description" content="A quick walkthrough of this document">
  <meta property="og:video" content="https://media.example.com/walkthrough.mp4">
  <meta property="og:video:type" content="video/mp4">
  <meta property="og:video:width" content="1280">
  <meta property="og:video:height" content="720">
</head>
```

Each document link can have a different video. Remove the tags to return to an
image-only preview. The viewer shell publishes `og:video`, `og:video:secure_url`,
type, and dimensions; the generated image remains available as a fallback.
`og:video:url` and `og:video:secure_url` are also accepted as source URLs. Only
the first video is used, with positive dimensions up to 16384.

Use an absolute, publicly accessible HTTPS URL to a direct H.264 MP4 with the
correct `video/mp4` Content-Type, ideally a short clip with byte-range support.
No login, expiring URLs, or embedded player page. Video hosting/upload is not
provided by this feature; use your own CDN or storage. The app emits metadata
without fetching remote videos.

Share `/d/:slug` for public documents, or `/d/:slug?viewtoken=...` for private
ones. Bare private URLs expose no metadata. Session-only private access emits
no video or image capability. The external video itself is public, even when
the document is private, so do not put confidential content in public media.

iMessage decides whether to show or play a video and caches link previews;
metadata cannot guarantee animation on every iOS version or conversation.
Test a fresh document URL on an actual iPhone after deployment.
