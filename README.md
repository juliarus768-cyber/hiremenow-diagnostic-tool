# Career Positioning Diagnostic by Hire Me Now Resumes

A premium, responsive Cloudflare Pages diagnostic tool for the Career Positioning Diagnostic by Hire Me Now Resumes.

## Overview

This static front-end experience is built with plain HTML, CSS, and JavaScript, with a Cloudflare Pages Function that securely calls the OpenAI Responses API. It is designed to be fast-loading, accessible, SEO-friendly, and compatible with Cloudflare Pages deployment.

## Cloudflare Pages deployment

Deploy the repository to Cloudflare Pages with the project root as the output directory. The static files (`index.html`, `styles.css`, and `script.js`) are served directly, and the Pages Function in `functions/api/diagnostic.js` handles diagnostic requests at `/api/diagnostic`.

### Required environment variable

Set this environment variable in Cloudflare Pages before using the diagnostic endpoint:

```text
OPENAI_API_KEY
```

The API key must remain server-side in Cloudflare Pages. Do not add it to frontend JavaScript or commit it to the repository.

## API endpoint

`POST /api/diagnostic`

Expected JSON body:

```json
{
  "targetTitle": "...",
  "jobPosting": "...",
  "resumeText": "..."
}
```

- `targetTitle` is required.
- `resumeText` is required and must include enough detail for a meaningful diagnostic.
- `jobPosting` is optional, but recommended for more accurate target-role alignment.

The endpoint returns JSON containing either a `diagnostic` string or an `error` message.

## Local preview

You can preview the static page from the repository root:

```bash
python3 -m http.server 4173
```

Then open <http://127.0.0.1:4173/>.

Cloudflare Pages Functions require Cloudflare deployment or local Cloudflare/Wrangler development tooling to test `/api/diagnostic` end to end; the simple static preview command only serves the frontend files.

## Current functionality

- Landing page sections for the diagnostic, expected insights, intake form, about section, and footer links.
- Front-end validation for required target job title and resume text fields.
- Secure server-side OpenAI Responses API call through Cloudflare Pages Functions.
- Browser-based diagnostic result rendering with no email capture, file upload, or resume storage in this repository.
