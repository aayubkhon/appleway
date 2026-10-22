# CLAUDE.md — apps/mobile (Expo app). Paths like app/ and libs/ are relative to apps/mobile.

Context for every session. Rules here are guidance, not enforcement: anything that must never happen is also enforced by ESLint, CI or a hook. If a rule here conflicts with the repo's real config, the repo wins and this file gets fixed.

## 1. Working agreement (read first)

- Read before you write. Open the files you will touch and one neighbour that does something similar. Match its naming, structure and comment density.
- Never answer an Expo, EAS or React Native API question from memory. Expo ships breaking changes every SDK. Read the `expo` major in `package.json`, then fetch https://docs.expo.dev/versions/v<major>.0.0/ or the index https://docs.expo.dev/llms.txt. Same for react-native, expo-router, reanimated, TanStack Query.
- Small diffs. One concern per change. If a task touches more than 3 files or changes a boundary (routing, data layer, auth), write a 5-line plan first and wait for a yes.
- Fix the root cause. No `@ts-ignore`, no `any`, no `eslint-disable`, no try/catch that swallows errors, no retry loops that hide a bug. If one is truly needed, add a one-line reason.
- No new dependency without asking. If approved: `npx expo install <pkg>` (never plain npm/yarn add), prefer an Expo module over a third-party one, and say why.
  Pre-approved (no need to ask): zustand, react-native-mmkv, @shopify/flash-list, expo-image, expo-secure-store, expo-notifications, expo-network, expo-sharing, expo-file-system, expo-document-picker, react-native-reanimated, zod, react-hook-form, @tanstack/react-query, i18next, react-i18next, @sentry/react-native.
- Say what you verified and what you did not. "Typecheck and tests pass" only after you ran them. Never claim a device or release-build behaviour you did not observe.
- Do not invent facts, endpoints, env vars or types. If something is unknown, ask or read the schema.

## 2. Commands

```bash
npx expo install <pkg>      # add dependency (SDK-compatible version)
npx expo install --fix      # repair mismatched versions
npx expo-doctor             # config and dependency diagnosis
npx expo start              # dev server (dev client)
npx tsc --noEmit            # typecheck
npx expo lint               # lint
npm test                    # unit tests (use the repo's runner, see package.json)
```

Before saying a task is done, run typecheck, lint and tests for the code you changed. Use the repo's own `check` script if one exists.

## 3. Architecture

Routes are thin, features live in `libs/`. Imports only point downward.

```
app/                 Expo Router routes only. A route file renders a screen and wires params. No business logic.
libs/
  screens/           One folder per screen: composes components, hooks, queries.
  components/        ui/ (generic primitives, no data access) and feature/ (domain pieces).
  hooks/             Reusable hooks. One hook, one job.
  queries/           TanStack Query: key factories, query/mutation hooks. The only place server data is read.
  services/          API client and domain services. Network, zod parsing, error mapping.
  store/             Zustand slices for client-only state.
  storage/           MMKV wrapper (non-sensitive) and SecureStore wrapper (secrets).
  config/            Validated env and app constants.
  theme/             Design tokens (color, spacing, type, radius). No raw values in components.
  i18n/              Translations. Every user-visible string goes through it.
  monitoring/        logger and crash reporting setup.
  enum/ interface/ type/   Shared enums, interfaces, types. One concept per file.
  utils/             Pure functions, no React, no I/O.
```

Dependency direction: `app → screens → components/hooks → queries/store → services/storage → config/utils`. A lower layer never imports a higher one. Add an ESLint boundary rule (`no-restricted-imports` or `eslint-plugin-boundaries`) so the compiler enforces it.

## 4. State and data

- Server state lives only in TanStack Query. Never copy fetched data into Zustand, context or component state.
- Client state (UI flags, drafts, selections) lives in small Zustand slices. Components read with selectors (`useStore(s => s.x)`), never the whole store.
- Query keys come from one factory per domain (`orderKeys.detail(id)`). No string literals at call sites.
- Every external response is parsed with zod at the service boundary. Types are `z.infer` of the schema, not hand-written duplicates. UI code receives parsed, typed data only.
- Mutations: invalidate or update precisely the keys they affect. Optimistic updates need a rollback path.
- Forms: schema-first with zod. Validation messages are i18n keys.
- Persisted data: MMKV for non-sensitive cache and preferences only. Persist only the query keys that are safe to show offline. Version persisted shapes and drop the cache on version change.
- Required React Native wiring for TanStack Query, set once at the root:
  - `onlineManager` fed by `expo-network` (or NetInfo) so queries pause offline and refetch on reconnect.
  - `focusManager` fed by `AppState` so queries refetch when the app returns to the foreground.
  - Use the `subscribed` option with `useIsFocused` for queries on screens that are off-screen.

## 5. Navigation

- Expo Router only, with typed routes on. Link and navigate with typed paths; broken links must be type errors.
- Layout files (`_layout.tsx`) own navigators, auth gating and providers. Guard authenticated groups in the layout, not inside each screen.
- Every deep link and route param is untrusted input: parse with zod, handle missing or malformed values with a safe fallback screen.
- Screens must handle loading, empty, error and offline states explicitly. A screen without all four is not done.

## 6. UI rules

- Styling: `StyleSheet.create` in a sibling styles file, values from `theme/` tokens. No inline style objects, no magic numbers or hex values in components.
- Components are small and typed with an explicit props interface. One component per file, under 1000 lines for any file (aim for 300).
- Lists: FlashList for anything that can exceed a screenful. Stable `keyExtractor`, memoised `renderItem`, no inline objects or arrow functions created per row, correct `estimatedItemSize` guidance from the installed version's docs.
- Images: `expo-image` with explicit dimensions, placeholder and caching. Never animate an image's width or height; animate transforms.
- Animations: Reanimated, running on the UI thread. Keep worklets pure. No animation driven from the JS thread in a screen that also does heavy work.
- Safe areas, dynamic type, dark mode, RTL and small screens are part of every screen. Touch targets at least 44x44 pt. Interactive elements carry accessibility label, role and state.
- Haptics and motion respect the OS "reduce motion" setting.
- Strings: all text through i18n. Add every key in all supported languages in the same change. The i18n check script must pass.

## 7. Performance

- Frame budget is 16.7 ms. Keep heavy work off the JS thread during navigation and animation (defer with `InteractionManager` or `requestIdleCallback`, or move it to a worklet or native module).
- Measure in a release build on a real mid-range Android device, never in dev mode. Dev mode numbers are not evidence.
- No `console.log` in production code. Use the logger; strip console calls in production builds.
- Memoise only where a profiler shows a cost. Do not wrap everything in `useMemo`/`useCallback`. Do avoid creating new object, array or function identities in hot paths (list rows, context values).
- Keep the startup path small: lazy-load rare screens and heavy libraries, keep the splash screen up until fonts and first data are ready.
- Track bundle size. A new dependency over ~50 KB gzipped needs a reason.
- Prefer Hermes defaults. The New Architecture is on and cannot be turned off from SDK 55 onward; do not add libraries that lack support for it.

## 8. Security and privacy

- `EXPO_PUBLIC_*` values are compiled into the app and readable by any user. Never put a secret, private key or admin token there. Real secrets stay on the server.
- Auth tokens and credentials go to SecureStore only (Keychain on iOS, Keystore-backed on Android). Keep values small, handle read errors, and never treat SecureStore as the only copy of irreplaceable data. MMKV is for non-sensitive data.
- HTTPS only. No cleartext traffic. Add certificate pinning only if a requirement says so, and plan for rotation.
- Never log tokens, emails, phone numbers, addresses or payment data. Scrub PII in the crash reporter (`beforeSend`) and in breadcrumbs.
- Validate all deep links, WebView URLs and push payloads. WebViews load an allow-list of origins only.
- Request the minimum permissions, at the moment of use, with a plain-language reason.
- Use OWASP MASVS (storage, crypto, auth, network, platform, code, resilience, privacy) as the review checklist for anything touching those areas.
- Run `npm audit` and review new transitive dependencies before release.

## 9. Environments, builds and releases

- One codebase, three environments (development, preview, production) defined in `eas.json` build profiles. Environment values are read through `libs/config` and validated with zod at startup; the app fails fast with a clear message if one is missing.
- Native folders (`ios/`, `android/`) are generated output when the project uses Continuous Native Generation. Do not hand-edit them. Native changes go through `app.config` and config plugins.
- A new native module needs a new development build; Expo Go is not enough.
- OTA updates (EAS Update) ship JS and assets only. Use a `runtimeVersion` policy that changes whenever native code can change (`fingerprint`, or `appVersion` with discipline). Test the update on a preview channel first, roll out gradually, watch the error rate, and keep a rollback ready.
- Version bumps and store submission happen only when the user asks. Never run `eas build --auto-submit`, `eas submit` or `eas update` on your own.

## 10. Observability and errors

- One `logger` with levels (debug, info, warn, error). Debug logs are off in production.
- Crash reporting (Sentry) is initialised once at the root with the release and environment tags and source maps uploaded by the build.
- An error boundary wraps each route group. User-facing errors are translated, actionable and never show raw server text.
- Every `catch` either handles the error, maps it to a typed app error, or rethrows. Network errors, validation errors and programmer errors are different types.

## 11. Testing

- Pure logic (utils, services, schemas, reducers, query key factories) gets unit tests. Test behaviour and edge cases, not implementation.
- Components and hooks: React Native Testing Library, query by role and text like a user, mock only the network edge.
- Critical user journeys (sign-in, purchase or checkout, deep link entry) get an end-to-end flow (Maestro or Detox) run on CI against a preview build.
- A bug fix starts with a failing test that reproduces it.
- Never weaken or delete a test to make it pass. If a test is wrong, explain why and fix it.

## 12. Git and delivery

- Branch per task. Commit messages follow the repo style (`feat:` / `fix:` / `refactor:` / `chore:`), short, written like a person. No AI attribution, no Co-Authored-By, no tool names in commits or PR text.
- Commit only when asked. Never push, force-push or open a PR without an explicit instruction.
- Never commit secrets, `.env.local`, keystores, provisioning profiles or service-account files. Check `git status` before committing.
- PR description: what changed, why, how it was verified (commands run, devices tested), screenshots for UI.

## 13. Definition of done

A task is done only when all are true: typecheck, lint, tests and `expo-doctor` pass; loading, empty, error and offline states exist; strings are translated; no new `any`, inline style or console call; behaviour was checked on a real device or simulator (release build if performance-sensitive); the diff contains nothing the task did not need.

## 14. Keeping this file useful

- Keep it under 200 lines. Move area-specific detail to `.claude/rules/<topic>.md` with a `paths` glob so it loads only for matching files, and move multi-step procedures into skills.
- Remove rules that are stale or contradict each other; contradictions make the model pick one at random.
- Add a rule only after a real mistake happened twice. Put the project facts that change (screens map, API base URLs, ticket links) in separate docs and import them with `@path`.
