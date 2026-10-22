# MedAccess Sudan Mobile

Phase 1 is a React Native application built with Expo, Expo Router, and TypeScript. It shares the existing Laravel API; it does not contain a second backend.

## Requirements

- Node.js 22.13 or newer for Expo SDK 57 (this machine uses 22.14)
- npm and Expo Go on a physical Android or iOS phone
- Phone and development computer connected to the same reachable local network

## Install and configure

```powershell
cd "C:\Web Projects\MedAccess\mobile"
npm install
Copy-Item .env.example .env
```

Set `EXPO_PUBLIC_API_URL` in `.env` to the development computer's current LAN address, for example:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000
```

This value is a public API address, not a secret. Never put passwords, tokens, or private keys in an `EXPO_PUBLIC_` variable. `localhost` and `127.0.0.1` on the phone refer to the phone itself, not the Windows computer. Run `ipconfig` after changing networks and update `.env` if the computer's IPv4 address changes.

## Start physical-phone development

Terminal 1 — expose the existing Laravel API to the LAN:

```powershell
cd "C:\Web Projects\MedAccess\backend"
php artisan serve --host=0.0.0.0 --port=8000
```

Terminal 2 — start Expo:

```powershell
cd "C:\Web Projects\MedAccess\mobile"
npm start
```

Open Expo Go and scan the QR code. Patient login and session restoration use the shared Laravel API. If the phone cannot connect, confirm both devices are on the same network and allow only the required local/private-network access when Windows Firewall prompts. Do not disable the firewall globally.

## Current architecture

- Expo Router with protected patient and authentication routes
- Centralized English and Arabic resources using i18next
- RTL-aware text and row direction with React Native RTL support enabled
- Semantic MedAccess mobile design tokens
- Centralized API request/error handling and an environment-based API URL
- Secure patient session storage using Expo SecureStore and Laravel Sanctum tokens

## Current limitations

Patient registration, forgot-password UI, remaining patient tabs, GPS, push notifications, camera access, and document selection are intentionally deferred. Doctor, laboratory, and administrator workflows remain on the web application.

## Checks

```powershell
npm run typecheck
npm run lint
npx expo-doctor
```
