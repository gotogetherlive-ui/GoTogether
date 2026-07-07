# GoTogether

Travel marketplace and buddy-matching application built with Next.js 16, React 19, PostgreSQL, Razorpay, Cloudinary, and Resend.

## Development

```bash
npm install
npm run dev
```

Create `.env.local` with the required database and service credentials. See [PRODUCTION.md](./PRODUCTION.md) for configuration, security, and deployment guidance.

## Release checks

```bash
npm run lint
npx tsc --noEmit
npm audit --omit=dev
npm run build
```

Use `npm start` for platform-managed production deployments. `npm run start:cluster` is available for a single multi-core VM.
