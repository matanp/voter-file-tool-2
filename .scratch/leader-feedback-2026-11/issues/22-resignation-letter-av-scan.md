# 22 - Scan uploaded Resignation Letters for malware

Status: needs-triage

## Why

Ticket 08 (decision 17) ships without an AV scan. Uploads are limited to PDF / JPEG / PNG / HEIC by their first
bytes, capped at 10 MB, served with the sniffed `Content-Type` from presigned URLs (PDF and images inline, HEIC as
a download), and only Admins (and, while pending, Leaders with jurisdiction) can open them. A malicious PDF could
still target an Admin's PDF reader.

## Options to weigh

- Scan at submit, after the size and magic-byte checks and before the copy out of staging (e.g. a ClamAV sidecar on
  the report server, or a hosted scanning API). Adds latency and an availability dependency to filing.
- Scan asynchronously after commit and quarantine a flagged letter (detach it, as a reject does). Needs a "scan
  pending / failed" state in the UI.
- Re-render PDFs to images server-side instead of scanning.

## Out of scope

- Anything that changes who can view letters (08 decision 4).

## Comments

- 2026-11-07: Split from 08 ("AV scanning: write a ticket for this, but not prioritized").
