# TradeMate NZ Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- SWMS template engine for electricians, plumbers, builders
- Claude AI integration for hazard/control suggestions
- PDF generation
- Digital signature capture
- Offline SQLite setup with background sync

---

## [0.1.0] - 2026-02-02

### Added
- Initial project structure (monorepo with apps/api, apps/mobile, packages/shared)
- Project documentation (CLAUDE.md, README.md, PORTS.md)
- Environment configuration template (.env.example)
- Docker infrastructure configuration
- SWMS template structure design
- Best practices compliance documents

### Architecture Decisions
- **Monorepo**: npm workspaces for shared code between API and mobile
- **Offline-First**: SQLite for local storage, background sync
- **AI Layer**: Claude API for compliance document generation
- **NZ Focus**: Health & Safety at Work Act 2015 compliance

### Technical Debt
- None (greenfield project)

---

## Version History Summary

| Version | Date | Milestone |
|---------|------|-----------|
| 0.1.0 | 2026-02-02 | Project foundation |

---

## Upcoming Milestones

| Version | Target | Features |
|---------|--------|----------|
| 0.2.0 | Week 2 | Basic API + auth |
| 0.3.0 | Week 4 | SWMS generator MVP |
| 0.4.0 | Week 6 | Compliance module complete |
| 0.5.0 | Week 8 | Xero integration |
| 1.0.0 | Week 12 | Production launch |
