# CoffeeNet management panel

The mobile-first React panel uses the existing Express API and PocketBase database. It does not create a separate API server or database.

## Run locally

1. Start PocketBase and the existing API as described in the repository [README](../README.md).
2. From this directory, install dependencies and start Vite:

   ```powershell
   npm install
   npm run dev
   ```

3. Open the Vite URL. In development, Vite forwards `/api` requests to the existing API at `http://127.0.0.1:3000`. Set `VITE_API_PROXY_TARGET` in a local `.env` file to use a different local API address. For a deployed panel, set `VITE_API_URL` to the HTTPS API URL before building.

## Accounts and access

- Choose **مدیر سیستم** and sign in with a PocketBase superuser account. PocketBase stores superusers in its built-in `_superusers` collection.
- Managers create operator accounts from the panel. Operator accounts are stored in the application's `users` auth collection; operators cannot create accounts.
- Managers can grant operators access to orders, announcements, service announcements, services, categories, cafe settings, and app versions. Only managers can manage operators or edit arbitrary database collections.
- Apply the new PocketBase migration before signing in. The migration adds the operator auth fields and the database access rules needed for the shared order pool.
- Sessions use an `HttpOnly`, `SameSite=Strict` cookie. The existing Express process holds the PocketBase auth token in memory; restarting that process signs panel users out.
- Keep PocketBase on loopback. Only the existing Express API should be exposed to client devices. For a deployed panel, set `PANEL_ORIGIN` in the existing server environment to the panel's exact origin and `VITE_API_URL` to the HTTPS API URL before building.
