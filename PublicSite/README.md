# Cofec Public Site

This folder contains the static public pages for Cofec:

- `index.html`: marketing page
- `support.html`: support page
- `privacy.html`: privacy policy

The files are plain HTML and CSS, so they can be served directly by GitHub Pages.

## Before Publishing

Replace these placeholders before public launch:

- Support email on `support.html`
- GitHub Issues or support form link on `support.html`
- Privacy contact method on `privacy.html`
- App Store download link on `index.html` if the app is already released

## GitHub Pages

The included GitHub Actions workflow deploys the `PublicSite` folder.

Required GitHub permissions:

- Write access to the target repository to push these files
- Permission to enable GitHub Actions
- Permission to enable GitHub Pages and set the source to GitHub Actions

No API key or external service secret is required for this static site.
