# NestJS Base Template

Lightweight NestJS boilerplate ready for new services. It keeps only the essentials so you can add your own modules without removing sample task or monitoring code.

## What's inside
- ConfigModule with Joi validation for `.env` files keyed by `NODE_ENV`.
- Global validation pipe (whitelist + transformation) and configurable API prefix.
- CORS configuration via comma-separated origins and sensible defaults.
- Swagger docs at `/docs` and a simple `GET /` handler for health checks.
- ESLint, Prettier, and Jest already wired up for TypeScript.

## Getting started
1) Install dependencies: `npm install`
2) Configure environment (see `.development.env` or `.env.example`), then run:
   - `npm run start:dev` for local development
   - `npm run start:prod` after `npm run build`
3) set your kubernetes cluster config at 'kube/kubeconfig.yaml'
4) Visit `/docs` to confirm the app is running and to explore the API.

## Environment variables
- `APP_PORT`: Port to bind the server (default: `3000`).
- `API_PREFIX`: Global route prefix (default: `api`; set empty to disable).
- `CORS_ORIGINS`: Comma-separated origins for CORS. Leave unset to mirror the request origin.

## Next steps
- Replace `AppController` and `AppService` with your own feature modules.
- Update the Swagger metadata in `src/main.ts` to match your project.
- Add persistence and auth layers as needed for your service.
