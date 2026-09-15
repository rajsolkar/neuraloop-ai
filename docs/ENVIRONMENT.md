# Neuraloop — Environment Configuration Specification (Phase 5)

## Environment Variables Overview

Copy `.env.example` to `.env` in the project root:

```env
# Neon PostgreSQL Database Connection
DATABASE_URL="postgresql://user:password@ep-sample-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Upstash / Redis Queue Connection
REDIS_URL="rediss://default:password@sample-redis.upstash.io:6379"

# Worker Process Concurrency (Default: 5)
WORKER_CONCURRENCY=5

# Server-Side Provider Credentials (Optional)
OPENAI_API_KEY=""
SLACK_BOT_TOKEN=""
SMTP_HOST=""
SMTP_PORT=587
SMTP_USER=""
SMTP_PASSWORD=""
```

## Security Guidelines

* `REDIS_URL` and database credentials must remain **server-side only**.
* Never expose `REDIS_URL` or secret keys to client-side Next.js bundles (`NEXT_PUBLIC_` prefix is prohibited for credentials).
