# CortexForge Integration

This document tracks the TradeMate NZ project's integration with CortexForge for project management, SDLC tracking, and knowledge preservation.

---

## Project Registration

| Field | Value |
|-------|-------|
| **CortexForge ID** | `495` |
| **Project Slug** | `trademate-nz` |
| **Local Path** | `D:\TradeMate-NZ` |
| **Primary Language** | TypeScript |
| **Framework** | React Native + Express |

---

## API Reference

### Base URL
```
http://localhost:9000
```

### Authentication
```bash
# Login to get JWT token
curl -X POST http://localhost:9000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@cortexforge.dev", "password": "admin123"}'

# Response contains: { "access_token": "..." }
```

### Common Endpoints

#### Get Project
```bash
curl http://localhost:9000/api/projects/495 \
  -H "Authorization: Bearer $TOKEN"
```

#### Update Project
```bash
curl -X PUT http://localhost:9000/api/projects/495 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description",
    "primary_language": "TypeScript"
  }'
```

#### Create Artifact
```bash
curl -X POST http://localhost:9000/api/projects/495/artifacts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Artifact Name",
    "type": "markdown",
    "content": "# Content here"
  }'

# Valid types: markdown, mermaid, note
```

#### List Artifacts
```bash
curl http://localhost:9000/api/projects/495/artifacts \
  -H "Authorization: Bearer $TOKEN"
```

#### Get SDLC Status
```bash
curl http://localhost:9000/api/projects/495/sdlc \
  -H "Authorization: Bearer $TOKEN"
```

#### Update SDLC Phase
```bash
curl -X PUT http://localhost:9000/api/projects/495/sdlc/implementation \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "notes": "Working on feature X"
  }'

# Valid phases: requirements, design, implementation, testing, review, deployment
# Valid statuses: not_started, in_progress, completed, blocked
```

---

## SDLC Phases

| Phase | Description | Status Field |
|-------|-------------|--------------|
| `requirements` | User stories, acceptance criteria | not_started / in_progress / completed / blocked |
| `design` | Architecture, API contracts | not_started / in_progress / completed / blocked |
| `implementation` | Code development | not_started / in_progress / completed / blocked |
| `testing` | Unit, integration, E2E tests | not_started / in_progress / completed / blocked |
| `review` | Code review, security audit | not_started / in_progress / completed / blocked |
| `deployment` | Staging, production release | not_started / in_progress / completed / blocked |

---

## Artifact Types

| Type | Use Case |
|------|----------|
| `markdown` | Documentation, changelogs, status updates |
| `mermaid` | Architecture diagrams, flowcharts |
| `note` | Quick notes, observations |

---

## Current Status

**Last Updated**: 2026-02-04

### Project Artifacts
| Name | Type | Description |
|------|------|-------------|
| TradeMate NZ Status v0.2.0 | markdown | Initial project status document |

### SDLC Status
| Phase | Status | Notes |
|-------|--------|-------|
| requirements | not_started | - |
| design | not_started | - |
| implementation | not_started | - |
| testing | not_started | - |
| review | not_started | - |
| deployment | not_started | - |

---

## Update Checklist

When making significant changes to TradeMate NZ, update CortexForge:

1. **After completing a feature:**
   - Create a markdown artifact documenting the feature
   - Update SDLC implementation phase status

2. **After completing tests:**
   - Update SDLC testing phase to `completed`
   - Add test coverage artifact if significant

3. **Before deployment:**
   - Ensure all phases are `completed`
   - Create release notes artifact

4. **Version bumps:**
   - Update project description with new version
   - Create changelog artifact

---

## Quick Scripts

### PowerShell - Get Auth Token
```powershell
$response = Invoke-RestMethod -Uri "http://localhost:9000/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"admin@cortexforge.dev","password":"admin123"}'
$token = $response.access_token
```

### PowerShell - Update SDLC Phase
```powershell
Invoke-RestMethod -Uri "http://localhost:9000/api/projects/495/sdlc/implementation" `
  -Method PUT `
  -ContentType "application/json" `
  -Headers @{Authorization="Bearer $token"} `
  -Body '{"status":"in_progress","notes":"Working on invoicing"}'
```

### PowerShell - Create Artifact
```powershell
$body = @{
  name = "Feature Update"
  type = "markdown"
  content = "# Update`n`nDetails here..."
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:9000/api/projects/495/artifacts" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{Authorization="Bearer $token"} `
  -Body $body
```

---

## Troubleshooting

### Authentication Failed
- Ensure CortexForge is running: `docker ps | grep cortexforge`
- Check credentials: `admin@cortexforge.dev` / `admin123`
- Use `email` field, not `username`

### Field Name Errors
- Artifacts use `name` not `title`
- Artifacts use `type` not `artifact_type`
- Valid types are: `markdown`, `mermaid`, `note`

### Project Not Found
- Use integer ID `495` for most endpoints
- Use string `trademate-nz` only where documented

---

## References

- [CortexForge Documentation](http://localhost:9000/docs)
- [TradeMate NZ CLAUDE.md](../../CLAUDE.md)
- [Project CHANGELOG](../CHANGELOG.md)
