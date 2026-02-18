# Backend Codex Prompt (Paste As-Is)

You are working on Laravel backend for NFTPayroll.
Frontend menus/pages are already created at:
- `/modules/operations-center`
- `/modules/approvals`
- `/modules/compliance`
- `/modules/notifications`
- `/modules/integrations`
- `/modules/templates`
- `/modules/wallets`
- `/modules/bulk-operations`
- `/modules/cost-reports`
- `/modules/roles`
- `/modules/exports`
- `/modules/system-health`

## Goal
Implement production-ready APIs for these modules with:
- auth-protected endpoints (`auth:sanctum`)
- consistent JSON envelopes
- pagination support
- filtering + sorting
- validation + policy checks
- audit logging for write actions

## Global API Rules
- Base envelope:
  - success: `{ "data": ..., "meta": ..., "message": "..." }`
  - error: `{ "message": "...", "errors": {...} }`
- List endpoints support query params:
  - `search`, `status`, `from`, `to`, `sort_by`, `sort_dir`, `per_page`
- Add OpenAPI documentation for all new endpoints.
- Add feature tests for each module (index + one write action minimum).

## Modules and Endpoints

### 1) Operations Center
- `GET /api/operations/jobs`
- `POST /api/operations/jobs/{id}/retry`
- `POST /api/operations/jobs/{id}/cancel`
- `GET /api/operations/metrics`

### 2) Approval Flows
- `GET /api/approvals`
- `POST /api/approvals/{id}/approve`
- `POST /api/approvals/{id}/reject`
- `GET /api/approvals/metrics`

### 3) Compliance & Audit
- `GET /api/compliance/audit-logs`
- `GET /api/compliance/security-events`
- `GET /api/compliance/export-history`

### 4) Notifications
- `GET /api/notifications`
- `POST /api/notifications/{id}/read`
- `POST /api/notifications/read-all`
- `GET /api/notifications/metrics`

### 5) Integrations
- `GET /api/integrations`
- `POST /api/integrations`
- `PUT /api/integrations/{id}`
- `POST /api/integrations/{id}/test`
- `GET /api/integrations/webhooks/logs`

### 6) Templates
- `GET /api/templates`
- `POST /api/templates`
- `PUT /api/templates/{id}`
- `POST /api/templates/{id}/publish`
- `GET /api/templates/metrics`

### 7) Wallet Management
- `GET /api/wallets`
- `POST /api/wallets/validate`
- `POST /api/wallets/bulk-validate`
- `GET /api/wallets/metrics`

### 8) Bulk Operations
- `GET /api/bulk-operations`
- `POST /api/bulk-operations/import`
- `POST /api/bulk-operations/{id}/retry`
- `GET /api/bulk-operations/metrics`

### 9) Cost Reports
- `GET /api/cost-reports/summary`
- `GET /api/cost-reports/by-company`
- `GET /api/cost-reports/by-network`

### 10) Roles & Permissions
- `GET /api/roles`
- `POST /api/roles`
- `PUT /api/roles/{id}`
- `POST /api/roles/{id}/assign-users`
- `GET /api/roles/metrics`

### 11) Export Center
- `GET /api/exports`
- `POST /api/exports`
- `GET /api/exports/{id}/download`
- `GET /api/exports/metrics`

### 12) System Health
- `GET /api/system-health/overview`
- `GET /api/system-health/services`
- `GET /api/system-health/incidents`

## DB Tables (minimum)
Create migrations/models for:
- `operation_jobs`
- `approval_requests`
- `audit_logs`
- `notification_events`
- `integration_connections`
- `template_definitions`
- `wallet_validations`
- `bulk_operation_runs`
- `export_jobs`
- `system_health_snapshots`

Use enums (or constrained strings) for statuses.
Add indexes on frequently filtered fields (`status`, `created_at`, `company_id`, `user_id`).

## Authorization
Implement policies/gates for:
- `operations.manage`
- `approvals.manage`
- `compliance.view`
- `notifications.manage`
- `integrations.manage`
- `templates.manage`
- `wallets.manage`
- `bulk.manage`
- `cost-reports.view`
- `roles.manage`
- `exports.manage`
- `system-health.view`

## Seed Data
Add seeders/factories to populate each module with demo records for frontend screens.

## Deliverables
1. Routes + Controllers + Requests + Services + Resources
2. Migrations + Models + Factories + Seeders
3. Tests (Feature)
4. OpenAPI updates
5. Short README section: “New Admin Modules API” with sample curl calls

## Important
- Keep backward compatibility with existing payroll/companies/employees APIs.
- Do not change existing endpoint response shapes unless necessary.
- If a module cannot be fully implemented, scaffold complete routes and return realistic paginated mock data from DB tables.
