# NEXA Mobile Companion

Expo (React Native) companion for NEXA AI OS. Connects to the web API, offers
quick actions, and tracks permission status — requesting OS permissions only
when the user taps.

## Quick start

```bash
# from monorepo root
pnpm install
pnpm --filter @nexa/mobile start
```

Set the API target:

```bash
EXPO_PUBLIC_APP_URL=http://localhost:3000
# or
EXPO_PUBLIC_API_URL=http://localhost:3000
```

## Screens

| Screen         | Purpose                                      |
|----------------|----------------------------------------------|
| Home           | Ping NEXA `/api/health`, open web            |
| Quick actions  | Camera / mic / calendar / notifications taps |
| Settings       | Permission status + request buttons          |

## Permissions policy

`app.json` declares purpose strings **only** for:

- Camera
- Microphone
- Calendar
- Contacts
- Notifications

Runtime requests live in `src/permissions.ts` and are stubs by default (clear
TODOs to wire `expo-camera`, `expo-notifications`, etc.). Never request unused
permissions.

## Scripts

| Script      | Description        |
|-------------|--------------------|
| `start`     | Expo dev server    |
| `android`   | Open Android       |
| `ios`       | Open iOS           |
| `typecheck` | `tsc --noEmit`     |
