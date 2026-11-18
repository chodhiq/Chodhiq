# ChodhiQ public site

## Build and deploy

This is a static site. The authoritative publication directory is `site-static/`.
Preview it locally with any static server, for example `npx serve site-static`.

The GitHub Actions workflow `.github/workflows/publish-legal-pages.yml` currently
publishes this directory to GitHub Pages. It only runs by manual dispatch from
the repository default branch after its publication approval input is checked.
The configured production branch and custom domain must match the domain's live
DNS/hosting configuration. Confirm the generated Pages URL and custom domain
before promoting a release.

## Cache behavior

HTML revalidates frequently. Versioned CSS and JavaScript filenames are
immutable and change with each release. `_headers` expresses Cloudflare Pages
cache directives; GitHub Pages does not process this file, so its CDN behavior
must be checked separately if Pages remains the active host.

## Forms

Waitlist and contact forms post to FormSubmit, addressed to
`business@chodhiq.co.uk`. FormSubmit requires the recipient to confirm its
activation email before first use. Submit one test of each form after that
activation and verify delivery before advertising the forms as operational.
The forms include required fields, browser email validation and a honeypot.

## Privacy and analytics

The site uses no analytics or advertising trackers and sets no analytics
cookies. The existing beta privacy notice is at `privacy.html`.
