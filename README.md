# Big Ink Lab

Monorepo: **SvelteKit** (UI) + **NestJS** (API), set up for deployment on Vercel.

## Structure

- `apps/web` – SvelteKit frontend (Vercel adapter)
- `apps/api` – NestJS backend (Vercel-compatible entrypoint)

## Local development

From the repo root:

```bash
npm install
```

- **Web (SvelteKit):** `npm run dev` or `npm run dev:web`  
  - App: http://localhost:5173  
  - `/api` is proxied to the API (see below).

- **API (NestJS):** `npm run dev:api`  
  - API: http://localhost:3001  
  - Endpoints: `GET /hello`, `GET /health`

Run both to use the “Call API” button on the web app.

## Deploying to Vercel

Use **two Vercel projects** (one for web, one for API), both linked to this repo.

### 1. Deploy the frontend (SvelteKit)

1. In Vercel: **Add New Project** → import this repo.
2. Set **Root Directory** to `apps/web`.
3. Leave **Framework Preset** as SvelteKit (or set it if needed).
4. Deploy. Note the URL (e.g. `https://your-web.vercel.app`).

### 2. Deploy the API (NestJS)

1. **Add another project** in Vercel, same repo.
2. Set **Root Directory** to `apps/api`.
3. Deploy. Note the URL (e.g. `https://your-api.vercel.app`).

### 3. Point the frontend at the API

In the **web** project on Vercel, add an environment variable:

- **Name:** `VITE_API_URL`  
- **Value:** your API URL (e.g. `https://your-api.vercel.app`)  
- **Environment:** Production (and Preview if you want).

Redeploy the web project so the UI uses the deployed API.

## Scripts (from repo root)

| Command       | Description                    |
|---------------|--------------------------------|
| `npm run dev` | Start SvelteKit dev server     |
| `npm run dev:api` | Start NestJS in watch mode |
| `npm run build`   | Build both apps            |
| `npm run build:web` | Build web only            |
| `npm run build:api` | Build API only            |
| `npm run preview`  | Preview SvelteKit build    |

## Tech stack

- **UI:** SvelteKit, Svelte 5, TypeScript, Vite, `@sveltejs/adapter-vercel`
- **Backend:** NestJS, TypeScript, Express
- **Deploy:** Vercel (two projects: `apps/web`, `apps/api`)
