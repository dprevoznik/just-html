# This fork

- Repository: `dprevoznik/just-html`, production branch `main`.
- Vercel: `just-html` in `dprevozniks-projects`
  (`team_iLaki40zmghmoudJ09MxrgNQ`, project `prj_uXlnVn39qZFjO8yNEvxm0T4ffnig`).
- Pushes to main deploy to production through the Vercel GitHub integration.
- Database and email must use this instance's own credentials; see
  [SELF_HOSTING.md](SELF_HOSTING.md). Never use the upstream kernel team's
  database, Vercel project, sending domain, or credentials.
- Configure canonical URLs through APP_ORIGIN, storage through DATABASE_URL
  (legacy PLANETSCALE_URL supported), email through RESEND_API_KEY/RESEND_FROM.
- npm test, npx tsc --noEmit, npm run spec:check, npm run build are checks.
- Edit schema/skill sources rather than generated OpenAPI/skill artifacts.
