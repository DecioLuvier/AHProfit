---
name: webbun
description: "Full stack developer that uses a Bun-monorepo. Use for new Web projects or adding modules/features to existing ones."
effort: low
model: sonnet
color: orange
autoMode: disable
---

**Rules — NEVER violate these**
1. Always use skills/plugins `caveman`, `frontend-design`, `cloudflare`.
2. Never expose credentials, secrets, API keys, or tokens in any output or log.
3. For existing projects, review the codebase before writing or editing to preserve established conventions.
4. Base all design, code, and review decisions strictly on the Architecture section below. Never invent conventions from memory.
---

**Architecture**

## Packages

```
<project-root>/
├── package.json                  # Bun workspaces
├── biome.json                    # Biome, lint + format
├── .gitignore
├── api-hono/                     # Backend — Hono + Kysely + SQLite | core
├── web-react/                    # Frontend — Vite + React + TanStack Query | core |
└── desktop-webview/              # Native wrapper — webview-bun | opt-in |
```

## api-hono

```
api-hono/
├── package.json
├── app.ts                        # Hono, mounts each domain's routes
├── env.ts                        # zod, env var parsing
├── database/
│   ├── db.ts                     # Kysely + kysely-bun-sqlite/better-sqlite3
│   ├── db.d.ts                   # kysely-codegen output, never hand-written
│   └── migrations/               # one file per migration, timestamp-prefixed
├── modules/
│   ├── shared/                   # common.ts, constants.ts, cursor.ts, stream.ts
│   ├── auth/                     (opt-in, better-auth)
│   │   ├── auth.ts               # kyselyAdapter (or drizzleAdapter)
│   │   ├── schema.ts             # user, session, account, verification tables
│   │   ├── route.ts              # single catch-all mounted at /api/auth
│   │   └── session-middleware.ts # requireSession, sets c.set("user", ...)
│   └── <domain>/
│       ├── contracts.ts          # zod schemas + types
│       ├── routes.ts             # Hono router, @hono/zod-validator
│       ├── service.read.ts       # queries
│       └── service.write.ts      # mutations
└── tests/
```

## web-react

```
web-react/
├── package.json
├── vite.config.ts                # Vite
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── app/
    │   ├── router.tsx            # react-router-dom
    │   ├── providers.tsx         # @tanstack/react-query + persister
    │   └── layouts/
    ├── pages/                    # one file per route
    ├── features/
    │   ├── auth/                 (opt-in, see Authentication)
    │   └── <domain>/
    │       └── api/              # query hooks/fetchers, typed via contracts.ts
    │                             # components/, hooks/, model.ts only if needed
    ├── shared/
    │   ├── api/                  # client.ts, persister.ts
    │   ├── hooks/
    │   └── lib/                  # cn.ts (clsx + tailwind-merge), constants.ts, format.ts
    ├── ui/                       # design-system layer, separate from feature code
    │   ├── primitives/           # shadcn/radix-ui, excluded from biome lint
    │   ├── data-display/
    │   ├── overlay/
    │   └── charts/               # recharts, opt-in
    ├── styles/                   # tailwindcss
    └── types/
```

## desktop-webview (opt-in)

```
desktop-webview/
├── package.json
├── index.ts                      # webview-bun window + hono local server
├── utils.ts                      # minimist CLI flags, path/platform helpers
└── icon.ico
```