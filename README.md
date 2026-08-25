# MedAccess Sudan

MedAccess Sudan is a responsive healthcare platform built as a React client
and a Laravel REST API backed by MySQL. The API is the authoritative boundary
for validation, authorization, business rules, and persistence so a future
mobile client can reuse the same backend.

The current web milestone includes public discovery, patient and doctor
registration/login, doctor search and profiles, availability management,
appointment booking and confirmation, patient appointment management, doctor
appointment views, profile management, and the administrator verification
workflow. Home visits, laboratory reservations, notifications, and medical
history remain planned work.

The React interface supports English and Arabic through shared i18next
resources. Language selection persists in browser storage, and the document
language and LTR/RTL direction update without reloading the application.

## Prerequisites

- PHP 8.3 or later
- Composer 2
- Node.js 22 and npm 10
- MySQL 8

## Backend setup

1. Create a MySQL database named `medaccess_sudan`.
2. From `backend/`, copy `.env.example` to `.env`.
3. Set the local `DB_USERNAME` and `DB_PASSWORD` in `.env`.
4. Install dependencies and initialize Laravel:

   ```powershell
   composer install
   php artisan key:generate
   php artisan migrate
   ```

5. Start the API:

   ```powershell
   php artisan serve
   ```

The versioned health endpoint is available at
`http://127.0.0.1:8000/api/v1/health`. It performs a lightweight database query
to verify Laravel-to-MySQL connectivity.

### Authentication

The first-party React client uses Laravel Sanctum's CSRF-protected, HTTP-only
session cookies. Keep the frontend and API on the same host name during local
development (`localhost` by default); changing only one side to `127.0.0.1`
will prevent same-site cookies from working as intended.

Authentication resources:

- `POST /api/v1/auth/register` creates a patient account from first name, last
  name, email, phone, and a confirmed password. Public registration always
  assigns the `patient` role; doctor and administrator roles cannot be selected
  by the client.
- `POST /api/v1/auth/login` accepts `identifier` (email or phone) and `password`.
- `GET /api/v1/auth/me` restores the current protected identity.
- `POST /api/v1/auth/logout` invalidates the session and rotates its CSRF token.
- `GET /api/v1/patient/home` returns the authenticated patient identity used by
  the Patient Home page. The API rejects unauthenticated users and non-patient
  roles.
- `GET /api/v1/patient/doctor-filters` returns active bilingual specialization
  and location reference data.
- `GET /api/v1/patient/doctors` searches verified doctors by specialization,
  location, and genuine available slots for `today` or the current `week`.
- `GET /api/v1/patient/doctors/{doctor}` returns a patient-safe provider profile
  and resolved availability.
- `POST /api/v1/patient/appointments` revalidates and books an available slot.
- `GET /api/v1/patient/appointments` and its detail endpoint return only the
  authenticated patient's appointments.
- `PATCH /api/v1/patient/appointments/{appointment}/cancel` cancels an owned,
  future confirmed appointment.
- Doctor routes under `/api/v1/doctor` provide the protected dashboard,
  professional profile, weekly schedule, resolved availability, and assigned
  appointments.
- Administrator routes under `/api/v1/admin` manage provider verification,
  city proposals, and approved locations.

### Demo provider verification

`MEDACCESS_DEMO_AUTO_VERIFY_DOCTORS=true` allows providers registering with an
existing approved city to participate in the end-to-end demo immediately.
Providers proposing a new city remain pending. Keep this setting `false` in
production; real provider verification remains an administrator decision.

The web client must first request `/sanctum/csrf-cookie`. Do not store the
session identifier in JavaScript or browser storage.

## Frontend setup

1. From `frontend/`, copy `.env.example` to `.env`.
2. Keep `VITE_API_BASE_URL=http://localhost:8000` unless the API uses another
   origin.
3. Install dependencies and run Vite:

   ```powershell
   npm install
   npm run dev
   ```

Open `http://localhost:5173`. The foundation screen reports whether React can
reach Laravel and whether Laravel can query MySQL. If Vite uses a different
origin, update `FRONTEND_URL` in `backend/.env` and clear Laravel configuration
with `php artisan config:clear`.

## Verification

Run these commands before submitting changes:

```powershell
cd frontend
npm run lint
npm run build

cd ..\backend
php artisan test
php artisan migrate:status
```

## Environment and secrets

Real `.env` files are ignored by Git. Commit only the `.env.example` templates
and never commit database credentials, application keys, or API tokens.

## Project references

- `PROJECT_CONTEXT.md` contains the authoritative architecture and scope.
- `docs/requirements/` contains the approved functional and non-functional
  requirements.
- `docs/design/` contains the approved Figma prototype export.
