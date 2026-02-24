# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.1.0] - 2026-02-24

### Added

- **Internationalization (i18n)**
  - Extension: English + 简体中文 via `package.nls.json` / `package.nls.zh-cn.json` and `vscode.l10n` for runtime strings.
  - Webview: Sidebar and Plugin Details UI use locale from `vscode.env.language` (IDE display language); en/zh-cn message bundles.
- **README by locale**
  - Plugin detail README supports `README.zh-CN.md` when IDE language is Chinese; falls back to `README.md` otherwise.
- **Git URL normalization**
  - Repository and marketplace links are normalized for browser (SSH → HTTPS, strip `.git` suffix) before opening.

### Changed

- All extension commands, views, and dialogs are localized (en/zh-cn).
- Webview UI strings moved to `webview/src/l10n/en.json` and `zh-cn.json`.

### Technical

- Locale source: **`vscode.env.language`** (VS Code API for current display language). Injected into webview as `window.__LOCALE__` when creating the webview.

[0.1.0]: https://github.com/gdd-team/claude-plugin-marketplace/releases/tag/v0.1.0
