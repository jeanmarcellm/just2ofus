This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app), configured for static export via [Capacitor](https://capacitorjs.com) so it can also ship as a native iOS/Android app.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

## Project structure

This repo (`web`) is one of three sibling repos that make up the product:

```
JUST2OFUS/
├── web/       <- this repo (Next.js source of truth)
├── ios/       <- native Xcode project (Capacitor)
└── android/   <- native Android Studio project (Capacitor)
```

The native projects live outside this repo and are configured in [`capacitor.config.ts`](./capacitor.config.ts) via `ios.path: '../ios'` and `android.path: '../android'`. Each native project is its own git repository.

## Native build workflow

Because `output: 'export'` is set in [`next.config.ts`](./next.config.ts), `next build` produces a fully static site in `out/` that Capacitor copies into the native projects.

1. Build the web app:
   ```bash
   npm run build
   ```
2. Copy the new web assets into the native projects (`../ios`, `../android`):
   ```bash
   npx cap sync
   ```
3. Open and run the native project:
   ```bash
   npx cap open ios      # requires Xcode
   npx cap open android  # requires Android Studio
   ```

Any change to the web app that should reach the apps needs steps 1–2 repeated, then the native repos (`../ios`, `../android`) commit the updated generated files.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Capacitor Documentation](https://capacitorjs.com/docs)
