# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in Againpage, please report it
**privately** — do **not** open a public GitHub issue.

Email **agrawalskushal@gmail.com** with:

- a description of the issue and its impact,
- steps to reproduce (a proof of concept if you have one),
- the affected version / commit and platform (reader app OS, or the engine via
  Docker).

You'll get an acknowledgement as soon as possible, and I'll work with you on a
fix and coordinated disclosure. Please allow a reasonable window to address the
issue before any public disclosure.

## Supported versions

Againpage is in early alpha; fixes land on the latest release line only.

| Version | Supported |
| ------- | --------- |
| latest `0.1.x` (`main`) | ✅ |
| older pre-releases | ❌ |

## Scope & context

Againpage is local-first and single-user. The engine (API + worker + Postgres)
is meant to run on your own machine or a trusted network, and its API is
**unauthenticated by design** — exposing it to the public internet is a
misconfiguration, not a vulnerability (keep it on a trusted LAN or behind a
VPN / authenticating reverse proxy; see the README).

Reports are especially welcome on: handling of note content, provider API-key
handling, and desktop-app packaging.
