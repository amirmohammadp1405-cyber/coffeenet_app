# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **src/app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **example** directory and create a blank **src/app** directory where you can start developing.

## Backend and PocketBase

The generic service catalog, cafe status, guest orders, order messages and attachments are stored in PocketBase. Start PocketBase from the repository root:

```powershell
cd .\database
.\pocketbase.exe serve
```

If a collection was deleted manually after its migration had already been applied, restarting PocketBase will not rerun that migration. Add a new corrective migration instead of editing an applied migration or deleting rows from `_migrations`. To apply pending migrations without starting the server, stop the running PocketBase process first, then run `.\pocketbase.exe migrate up` from `database`.

The migrations in `database/pb_migrations` create public, read-only `services`, `service_categories`, `cafe_settings`, `announcements`, and `app_versions` collections and private, device-key-scoped order collections when PocketBase starts. Order updates are restricted to the matching device key and allowed status transitions, including cancellation of free orders awaiting an operator; the Express API validates the same actions. Keep PocketBase bound to loopback and do not expose its port to app devices. Manage records in the PocketBase dashboard at `http://127.0.0.1:8090/_/`. Set the `aboutText`, `instagramUrl`, `telegramUrl`, and `whatsappUrl` fields in the active `cafe_settings` record to customize the settings screen; leave a social URL empty to hide its button. If these values are omitted, the app uses its built-in defaults. For each app release, add an `app_versions` record with a unique semantic version (`major.minor.patch`), its user-facing update description, an HTTP(S) download link, and `active=true`. Only the newest active version is compared with the installed version. When it is newer, the app shows an optional update suggestion on the home screen and in settings; users are never blocked from continuing. Deactivate older releases if they should no longer be suggested. For an announcement, set its title, description, optional `link` (an HTTP or HTTPS URL), active state, and sort order. Choose `backgroundType` as `color` or `image`; set `backgroundColor` to a hex color and `backgroundTexture` to `none`, `dots`, or `stripes` for color backgrounds, or upload an image for image backgrounds. Active announcements appear on the home screen and rotate automatically; users can tap the link button to open its URL. In the active `cafe_settings` record, configure `bankName`, `cardHolder`, and `cardNumber` (and optionally `accountNumber` and `paymentNote`) to show card-payment instructions in the order chat. Add services there; the app intentionally does not include example services. To group services on the home screen, create active records in `service_categories` with a `title` and `sortOrder`, then assign each service's `category` relation. Categories with no active services are hidden, and active services without a category appear under «سایر خدمات».

### Management panel

The mobile-first React panel in `panel` uses this same Express API and PocketBase database; it has no separate backend or database. Start PocketBase and the API as above, then run `npm install` and `npm run dev` from `panel`. Sign in as a manager with a PocketBase `_superusers` account. Managers create operator accounts in the `users` auth collection and grant permissions for orders, announcements, services, settings, and other supported areas. The panel provides a shared order pool, operator assignment, customer chat, forms, payment requests, and database record management. Apply the panel migration by restarting PocketBase before first use. Keep PocketBase private and expose only the Express API. See [panel/README.md](./panel/README.md) for deployment and session details.

For service-specific notices, create a record in the separate `service_announcements` collection. Select its `service`, enter a required `message` and optional `title`, choose a `type` (`info`, `success`, `warning`, or `urgent`), and set `active=true` and a `sortOrder`. Active notices appear in that service's details drawer with background and text colors determined by their type.

Each service can have separate `cardImage` and `detailImage` uploads: use a 3:2 image for the home-screen service card and a 16:9 image for the service details and order form. If either new field is empty, the app falls back to the existing `image` upload.

### Service form fields and validation

Define each service's fields as objects in its `formSchema` JSON array. The app validates each field as the user completes the form, shows the error beside that field, and the API repeats the same checks before it creates an order. `formSchema` is already a JSON field in the `services` collection, so these rules do not require a collection migration.

Supported `type` values are:

- `text` and `textarea`: optional `minLength` and `maxLength` character limits.
- `number`: optional numeric `min` and `max`.
- `email`: email address format, plus optional `minLength` and `maxLength`.
- `phone`: 7–15 digits, optionally prefixed with `+`; spaces, parentheses, periods, and hyphens are ignored for format validation. Optional `minLength` and `maxLength` count digits.
- `nationalId`: Iranian national ID with exactly 10 digits and a valid check digit.
- `postalCode`: exactly 10 digits.
- `select`: `options` must list the allowed values.
- `checkbox`: boolean value.
- `date`: ISO date string (`YYYY-MM-DD`).
- `time`: 24-hour time (`HH:mm`).
- `image`, `file`, and `location`: selected file or a valid location; `required` also applies.

Any field can set `required: true`. `validationMessages` can override `required`, `invalid`, `minLength`, `maxLength`, `min`, or `max` messages. Templates may use `{{label}}`, `{{minLength}}`, `{{maxLength}}`, `{{min}}`, and `{{max}}`. Persian and Arabic digits are accepted for numeric inputs; national IDs, postal codes, and phone numbers are normalized to English digits before saving.

Use `profileField` to prefill a field from the locally saved profile. Supported values are `name`, `nationalId`, `postalCode`, and `address`. `nationalId` and `postalCode` fields automatically use their matching profile values, so those two mappings do not need to be written explicitly. A profile value only fills an empty field and can be edited before submission. For example:

```json
[
  {
    "key": "nationalId",
    "label": "شماره ملی",
    "type": "nationalId",
    "required": true
  },
  {
    "key": "postalCode",
    "label": "کد پستی",
    "type": "postalCode",
    "required": true
  },
  {
    "key": "fullName",
    "label": "نام و نام خانوادگی",
    "type": "text",
    "profileField": "name",
    "maxLength": 120
  },
  {
    "key": "email",
    "label": "ایمیل",
    "type": "email",
    "required": true,
    "maxLength": 254,
    "validationMessages": {
      "invalid": "لطفاً ایمیل معتبر وارد کنید."
    }
  },
  {
    "key": "age",
    "label": "سن",
    "type": "number",
    "min": 18,
    "max": 120
  }
]
```

Configure the `weeklyHours` JSON field in the active `cafe_settings` record with weekday keys `saturday`, `sunday`, `monday`, `tuesday`, `wednesday`, `thursday`, and `friday`. Add each working period to that day's `shifts` array using 24-hour times; a day can have one or more shifts. Mark a day off as `{"closed":true}`. For example:

```json
{
  "saturday": {
    "shifts": [
      { "open": "08:00", "close": "14:00" },
      { "open": "16:00", "close": "21:00" }
    ]
  },
  "sunday": {
    "shifts": [
      { "open": "08:00", "close": "14:00" },
      { "open": "16:00", "close": "21:00" }
    ]
  },
  "monday": {
    "shifts": [
      { "open": "08:00", "close": "14:00" },
      { "open": "16:00", "close": "21:00" }
    ]
  },
  "tuesday": {
    "shifts": [
      { "open": "08:00", "close": "14:00" },
      { "open": "16:00", "close": "21:00" }
    ]
  },
  "wednesday": {
    "shifts": [
      { "open": "08:00", "close": "14:00" },
      { "open": "16:00", "close": "21:00" }
    ]
  },
  "thursday": {
    "shifts": [
      { "open": "08:00", "close": "14:00" },
      { "open": "16:00", "close": "21:00" }
    ]
  },
  "friday": { "closed": true }
}
```

The app displays the schedule starting Saturday when the home-screen status capsule is tapped. Existing single-shift values in the `{"open":"09:00","close":"18:00"}` format are still supported.

Then start the API server in a second terminal:

```powershell
cd .\server
Copy-Item .env.example .env
npm install
npm start
```

Set the Neshan reverse-geocoding key in `server/.env`. Payment details can also be supplied through the legacy `PAYMENT_*` environment variables, but values in the active `cafe_settings` record take precedence. Without card-holder, bank, and card-number details, card-payment instructions remain unavailable. The API listens on port `3000` and uses `http://127.0.0.1:8090` for PocketBase by default. Keep the phone and development computer on the same local network when running the Expo app. For a deployed build, configure `EXPO_PUBLIC_API_URL` to the HTTPS API URL before building.

The smart-clerk chat uses OpenRouter through the Express API. Set `OPENROUTER_API_KEY` in `server/.env` and choose a model with `OPENROUTER_MODEL` (the example uses `openai/gpt-4o-mini`). Never add the OpenRouter key to the Expo app or an `EXPO_PUBLIC_*` variable. Active services are loaded from PocketBase for each request; optional `AI_ASSISTANT_CONTEXT` can provide additional cafe information. Chat history stays in the app session and is sent to the server with each message; the server forwards it to OpenRouter and returns only valid service suggestions.

Orders are guest orders, not account registrations: a random per-device key is stored in SecureStore and order IDs are kept locally. Clearing app data removes the local order list. PocketBase read rules on orders, messages, and attachments are scoped by that key. Create operations are validated by Express, which checks the device key and verifies that messages and attachments belong to the requested order. Keep PocketBase bound to its default loopback address and do not expose port `8090` to the network; only the Express API should be reachable by app devices.

Customers can open a free order from the home screen to start a chat without choosing a catalog service. New records have `orderType=free`, `serviceTitle=سفارش آزاد`, `status=awaiting_operator`, and no amount until an operator sets one. All active, unassigned orders appear in the shared panel pool. A manager or permitted operator claims an order from the panel; it is then assigned to that account and disappears from other operators' pools. The manager is also able to claim and handle orders.

Operators can chat with customers, inspect submitted order forms and attachments, send a supported follow-up form, set a free-order price, and send payment details from the active `cafe_settings` record. Requested form answers are stored in `operatorFormData` with `operatorFormSubmitted=true`; operators can follow up in the same assigned order. Receipt submission changes the status to `payment_review`. Supported statuses are `awaiting_operator`, `awaiting_payment`, `payment_review`, `in_progress`, `awaiting_customer`, `completed`, and `cancelled`. The panel sends customer-visible messages through the existing `order_messages` collection.

Migration `1794561003_add_free_order_support.js` makes the service reference optional, adds `awaiting_operator` to the order statuses, and adds the order type, operator assignment, operator form/response, and order-specific payment fields. Apply pending migrations before deploying the updated API and app.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
