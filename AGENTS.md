Assistant Startup Memory

Use this note at the start of each chat to quickly align behavior. Paste the bullet points into chat, or ask the assistant to “load memory from ASSISTANT_MEMORY.md”.

- Aliases: $R → ReimbursementStatus; $L → LaunchSequenceBenchmark; $C → CurrentPricePerCountry.
- $CE rule: If a message ends with $CE, first rewrite it in IELTS style with annotated advanced vocabulary (word: pronunciation, 中文, 词性), then solve the task, and repeat the refined sentence in bold at the end.
- Formatting policy (keep existing UI behavior):
  - Dates: $R uses MM/DD/YYYY; $C uses D/M/YYYY in tooltips; do not change unless explicitly requested.
  - Numbers: in $C tooltips, show price/floor with toFixed(3) + currency code; chart data labels use toFixed(2) with currency symbol (€ for EUR, $ for USD; otherwise use currency code). No thousand separators unless asked.
- Shared helpers: dayjs/numeral-based helpers live in shared/format.ts and are opt-in; avoid adopting them where it would change existing output without explicit approval.
- Refactor conventions: Prefer shared utilities for status colors and main-first sorting; avoid broad rewrites. Be precise, minimal, and keep changes scoped.

Tip: To remind the assistant, paste this one-liner at chat start:

“Please apply the preferences in ASSISTANT_MEMORY.md (aliases $R/$L/$C, $CE rewrite rule, and keep existing date/precision output).”


Project Startup Notes: EduTech LMS (Monorepo)

- Stack: Nx monorepo; NestJS microservices over TCP, a NestJS API Gateway, Next.js 15 (App Router) frontend; shared libs for common/auth/database/events/testing.
- Dev infra: docker-compose.dev.yml (Postgres 5432, Redis 6379 with requirepass, RabbitMQ 5672/15672, MailHog 1025/8025); bootstrap via scripts/dev-start.sh.
- API Gateway: Global prefix `/api`, Helmet + ValidationPipe, CORS for localhost:4200/3001 and `FRONTEND_URL`; Swagger at `/api/docs` (gate with `ENABLE_SWAGGER=false` in prod).
- Frontend API: `NEXT_PUBLIC_API_URL` defaults to `http://localhost:3000/api`; current token storage uses local/sessionStorage with refresh-on-401.
- Shared conventions: Prefer `@edutech-lms/common` utilities (ResponseUtil, ValidationUtil, LoggerUtil, DatabaseUtil); use shared rate-limiting and file-upload modules.
- Testing reality: Playwright E2E wired; backend unit/integration tests mentioned in docs but root scripts missing—align docs and scripts before CI.
- Config hygiene: Move hardcoded service hosts/ports (e.g., content client `localhost:3004`) to env via `@nestjs/config`; add `.env.development/.env.test/.env.production` templates.
- Security priorities: Switch web auth to httpOnly cookies + CSRF; protect inter-service comms (mTLS or broker transport); disable Swagger in prod; ensure TypeORM `synchronize=false`; add and run migrations.
- Observability: Centralized logging, error tracking (e.g., Sentry), and optional OpenTelemetry tracing.
- CI/CD: Enable Nx cache; lint, typecheck, test, E2E; add dependency/container security scans per SECURITY.md.
- E2E config: In CI, ensure build precedes Playwright or use `serve` mode; keep `:4200` port consistent.
- Quick start: `./scripts/dev-start.sh` for infra + services; `nx serve frontend` for UI; API base at `http://localhost:3000/api`.
- Roadmap:
  - Phase 1: Add test targets/scripts; env templates; Swagger gating; migrations.
  - Phase 2: Cookie tokens + CSRF; secure microservice transport; observability.
  - Phase 3: Consolidate scripts into Nx; update docs; refine E2E/CI flow.
