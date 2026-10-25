# Hostinger VPS production readiness

This document prepares MedAccess Sudan for a future deployment. It does not
deploy the application or modify any existing VPS service. The unrelated live
application on the VPS must keep its own Nginx server blocks, directories,
users, databases, services, certificates, and ports.

## Target layout

- Repository: `/var/www/medaccess`
- Web root: `/var/www/medaccess/frontend/dist`
- API root: `/var/www/medaccess/backend/public`
- Web URL: `https://medaccesssudan.tech`
- API URL: `https://api.medaccesssudan.tech`
- PHP-FPM: `/run/php/php8.5-fpm.sock`

Only the two MedAccess server blocks in `nginx-medaccess.conf.example` belong
to this project. Never replace `/etc/nginx/nginx.conf` or another
application's server block.

## Runtime compatibility

The backend requires PHP `^8.3`. The committed lock file has no package with
an upper PHP bound below 8.5, so PHP 8.5.4 satisfies the declared constraints.
Still run `composer check-platform-reqs --no-dev` on the VPS after installation
because it also checks the extensions installed on that server.

Neither JavaScript package manifest declares `engines` or `packageManager`.
The locked Vite 8.2.2 package requires Node `^20.19.0 || >=22.12.0`. Prefer a
supported even-numbered LTS release meeting that range and use `npm ci` so the
committed lock files remain authoritative. Record `node --version` and
`npm --version` before building.

## Environment files

Create real environment files on the VPS from the committed examples; never
commit the real values:

```bash
cp backend/.env.production.example backend/.env
cp frontend/.env.production.example frontend/.env.production
```

For an Android production build, provide
`EXPO_PUBLIC_API_URL=https://api.medaccesssudan.tech` through the build
environment or copy `mobile/.env.production.example` to the appropriate local
build environment. `EXPO_PUBLIC_*` and `VITE_*` values are public bundle-time
configuration, not secret storage.

Generate `APP_KEY` once on the server and retain it across releases. Supply a
dedicated least-privilege MySQL user and real SMTP settings through the
untracked backend `.env`.

The production Sanctum values in the example are intentional:

- CORS allows only `https://medaccesssudan.tech` and credentials.
- `SESSION_DOMAIN=.medaccesssudan.tech` lets the SPA read Laravel's XSRF
  cookie while the API remains on its own subdomain.
- Secure, HTTP-only session cookies are mandatory under HTTPS.
- The Android app uses Sanctum bearer tokens and the same API URL; it does not
  need to be added as a CORS browser origin.

## Build and release commands

Run only after reviewing and filling the real environment values:

```bash
cd /var/www/medaccess/backend
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
php artisan migrate --force
php artisan storage:link
php artisan optimize

cd /var/www/medaccess/frontend
npm ci
npm run build
```

The `storage` and `bootstrap/cache` directories must be writable by the PHP-FPM
user. Do not make the repository world-writable. Public profile images use the
`public` disk and `/public/storage` symlink. Provider verification documents
and laboratory results use the private `local` disk and must never be exposed
as static Nginx files; Laravel streams them after authorization.

If database queues are used, run a MedAccess-specific systemd/Supervisor queue
worker and restart it after releases. Do not reuse or alter another
application's worker. Current email paths are synchronous, but the configured
database queue should still be monitored for future queued work.

## Nginx and TLS

Copy and adapt only `docs/deployment/nginx-medaccess.conf.example`. Validate
before reloading:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Certificate paths in the example are placeholders for Certbot-issued
certificates. Do not enable the HTTPS blocks before the certificates exist.
The API block sets the HTTPS FastCGI parameter so Laravel generates secure API
and upload URLs correctly. No trusted-proxy configuration is required when
Nginx talks directly to local PHP-FPM. If a CDN or external reverse proxy is
introduced later, configure Laravel's trusted proxies explicitly rather than
trusting every proxy.

## Release verification

Before directing production traffic:

```bash
php artisan about --only=environment
php artisan migrate:status
composer check-platform-reqs --no-dev
curl --fail https://api.medaccesssudan.tech/up
curl --fail https://api.medaccesssudan.tech/api/v1/health
curl --fail https://medaccesssudan.tech/
```

Also verify SPA login/logout and CSRF cookies, mobile token login, email
delivery, uploads, authorized private downloads, profile-image URLs, deep-link
refreshes, and English/Arabic behavior. Back up the database and both private
and public Laravel storage before every release.

