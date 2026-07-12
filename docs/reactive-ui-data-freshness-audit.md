# GoTogether Reactive UI, Data Freshness, and Manual Refresh Audit

Audit date: 2026-07-11
Scope: repository at `D:\GoTogether`; no production credentials or personal data used.
Method: static flow tracing, dependency/configuration inspection, existing-test execution, and review of existing development logs. The in-app browser surface was unavailable and no supported safe OTP fixture/test accounts were found, so authenticated browser scenarios were not executed.

## 1. Executive conclusion

**Final classification: `MULTIPLE ARCHITECTURAL FRESHNESS ISSUES`**

The broad claim that every feature requires manual refresh is not supported. The code contains several different freshness designs: direct local state updates, explicit refetches, Server Component navigation, polling, and PostgreSQL-backed SSE. Most same-screen trip and social mutations explicitly update or refetch their owning view.

Three defects are confirmed from deterministic execution paths:

1. A successful profile save updates `DashboardClient` state but not the root `SessionProvider`; the mounted navbar can continue showing the old name/avatar and old profile-completeness decision until focus-driven session refresh, a server navigation/refresh, or a full reload.
2. Cross-tab login/logout is not synchronized while the other tab remains active. Session state reconciles only on focus; there is no `BroadcastChannel`, storage event, or auth event.
3. Stories realtime closes permanently after the first SSE error and has no polling/focus reconciliation. Remote story/like/comment updates can remain stale indefinitely in that mounted tab.

Chat is **confirmed delayed**, not realtime: recipients poll every three seconds. Notification badges have SSE plus focus/45-second polling fallback. Email OTP login itself is not confirmed stale: verification waits for session creation and then performs `window.location.replace("/")`, forcing a fresh root request. Password login uses `router.replace()` plus `router.refresh()`; Google OAuth redirects to `/` after session creation.

No evidence attributes the defects to the Next.js Data Cache. API responses are globally marked `Cache-Control: no-store`, personalized root rendering reads request headers/cookies, major public data pages are `force-dynamic`, and the repository contains no `revalidatePath`, `revalidateTag`, `updateTag`, `unstable_cache`, or `use cache` implementation. The relevant causes are duplicated client state, missing cross-tab signaling, polling delay, and incomplete SSE recovery.

Confidence: **high** for static execution flows and the three confirmed defects; **low-to-medium** for end-to-end behavior not executable without a browser surface and safe authenticated fixtures.

## 2. Current architecture

- Next.js `16.2.4`, React/React DOM `19.2.4`; App Router only (`src/app`), plus `src/proxy.ts`. No Pages Router.
- Root layout is an async Server Component. It reads `headers()` and `getSession()`, then seeds a client `SessionProvider` (`src/app/layout.tsx:15-68`).
- Authentication is custom PostgreSQL-backed authentication. The opaque random session token is stored hashed in `sessions`; the raw token is an HttpOnly cookie named `gt_session` (`src/lib/auth.ts:17-25`, `78-122`).
- Cookie attributes: HttpOnly, secure in production, SameSite=Lax, path `/`, seven-day max age, high priority (`src/lib/auth.ts:111-120`). Logout deletes the DB session, invalidates the in-process entry, and expires the cookie (`src/lib/auth.ts:193-209`).
- `getSession()` has a per-process 30-second memory cache keyed by raw token. Profile/admin-role mutations explicitly invalidate user session entries in the same process (`src/lib/auth.ts:24-50`, `125-187`; `src/app/api/profile/route.ts:89`). In multi-process deployments, this cache is not shared; expiry bounds stale user attributes to 30 seconds per process.
- The root `SessionProvider` copies the server user into React state once and exposes `refreshSession()`. It refreshes on window focus only (`src/components/SessionProvider.tsx:46-75`). Navbar consumes this client context (`src/components/Navbar.tsx:22-29`).
- Native `fetch`, direct PostgreSQL helpers, client `useEffect`, Server Components, Route Handlers, and a small number of Server Actions are used. There is no installed or used TanStack Query, SWR, Redux, Zustand, or client cache library.
- Mutations primarily use Route Handlers. Password sign-in and location update use Server Actions (`src/app/actions/auth.ts`).
- Realtime comprises PostgreSQL `LISTEN/NOTIFY` -> process EventEmitter -> SSE for notification counts and stories (`src/lib/notificationEvents.ts:24-112`). Chat uses three-second polling, not SSE/WebSockets (`src/app/chat/[tripId]/page.tsx:64-71`). No WebSocket, BroadcastChannel, storage-event synchronization, push service worker, or API/page service-worker cache was found.
- `next.config.ts:63-68` adds `Cache-Control: no-store, max-age=0` to every `/api/*` response. Images have explicit cache policy; personalized API payloads do not.

### Generic architecture map

```text
User action
-> client component
-> Route Handler or Server Action
-> PostgreSQL/session mutation
-> JSON/redirect response
-> local setState OR explicit refetch OR navigation OR SSE/polling
-> visible UI update
```

There is no universal mutation invalidation layer. Each client owns its reconciliation behavior.

### Flow maps

- Email OTP: login form -> `/api/auth/email-otp/send` -> OTP row/email -> modal -> `/api/auth/email-otp/verify` -> user + DB session + Set-Cookie -> success JSON -> `window.location.replace("/")` -> root `getSession()` -> `SessionProvider` -> Navbar.
- Logout: Navbar -> `/api/auth/signout` -> DB session delete + expired cookie -> `refreshSession()` and navigation/refresh -> Navbar. Other tabs: unchanged until focus refresh.
- Google OAuth: `/api/auth/google` -> state cookie -> Google -> callback -> upsert user -> `createSession()` -> HTTP redirect `/` -> root session read.
- Profile update: `DashboardClient` PUT `/api/profile` -> users update -> server session-cache invalidation -> updated profile JSON -> page-local `setProfile()` only; root session/Navbar is not updated.
- Trip create/edit/close/delete/cancel: business dashboard -> `/api/business/trips*` or organizer close route -> trips/bookings update -> success -> `fetchTrips()` (and sometimes `fetchBookings()`) for dashboard. Other already-mounted public views receive no trip event.
- Booking creation: trip detail -> `/api/bookings/create-order` -> orchestrator creates pending order/booking -> response drives checkout. Payment verification -> `/api/bookings/verify-payment`; UI then navigates to user dashboard, whose mount fetches `/api/user/requests` (`src/app/trips/[tripSlug]/TripDetailsClient.tsx:191-285`; `src/app/dashboard/user/page.tsx:112-147`).
- Payment webhook: provider webhook -> payment orchestration/background processing -> payment/booking/outbox writes. Notification SSE can signal badge changes, but the already-mounted user booking dashboard has no subscription or status polling.
- Booking cancellation: user dashboard -> cancel route -> cancellation service -> JSON -> `fetchData()` refreshes bookings (`src/app/dashboard/user/page.tsx:556-575`).
- Notification read: bell optimistically zeros local count -> POST `/api/notifications` -> seen flags -> subsequent SSE/REST reconciliation (`src/components/NotificationBell.tsx:135-163`).
- Chat: POST message -> DB insert -> sender immediately refetches; receiver polls GET every three seconds; GET also advances read timestamp (`src/app/api/chat/[tripId]/route.ts:30-52`, `89-96`).
- Story/feed create/delete/like/comment: Route Handler changes DB and calls `notifyStories`; initiating client directly updates local state, other clients refetch after SSE event (`src/app/stories/StoriesClient.tsx:396-583`). There is no post-edit or follow/unfollow implementation found.

## 3. Authentication flow findings

### Login-to-header sequence

OTP verification does not return before session persistence: `createSession()` awaits session insertion and cookie creation before the success JSON (`src/app/api/auth/email-otp/verify/route.ts:103-114`; `src/lib/auth.ts:78-122`). On success, the client performs a document replacement (`src/app/login/page.tsx:137-162`, `438-440`). That new request reconstructs the root layout and provider from the cookie. Therefore the reported "OTP succeeds but current header remains logged out" is **not confirmed** by the current implementation.

Password sign-in similarly awaits `createSession()` and returns a redirect target (`src/app/actions/auth.ts:9-46`). The client calls `router.replace()` and `router.refresh()` (`src/app/login/page.tsx:409-420`). OAuth awaits session creation then returns an HTTP redirect (`src/app/api/auth/google/callback/route.ts:81-98`).

Results:

1. Header immediately after OTP: `NOT TESTED` in browser; static flow strongly indicates a fresh authenticated root render.
2. Signed-out flash: no initial client default-to-null flash because server user seeds state; runtime not tested.
3. Manual refresh after login: not indicated by OTP/password/OAuth flows.
4. All mounted components after login: OTP/OAuth replace the document; password refreshes the route tree.
5. Logout in initiating tab: explicit session refresh plus route refresh; runtime not tested.
6. Multiple tabs: **confirmed stale until focus**; no cross-tab signal.
7. Stale `/me` overwrite: possible risk. `refreshSession()` has neither AbortController ownership nor request sequence guard (`src/components/SessionProvider.tsx:56-65`). Two focus/explicit refreshes can resolve out of order.
8. OAuth differs by using a server redirect; both paths rebuild the root.
9. Protected Server Components and APIs call the same `getSession()` source, while some client layouts independently fetch `/api/auth/me`.
10. Authority is mixed: DB/cookie are server-authoritative; mounted header state is a client copy reconciled only on explicit refresh/focus.

## 4. Feature freshness matrix

| Feature | Mutation | Database updated | UI update mechanism | Cache/invalidation mechanism | Realtime mechanism | Manual refresh needed | Status | Evidence |
| --- | --- | ---: | --- | --- | --- | ---: | --- | --- |
| Email OTP login | verify OTP | Yes | full document replace | fresh root cookie read | None | No evidence | NOT TESTED | login `137-162`, `438-440`; verify `103-114` |
| Password login | Server Action sign-in | Yes | replace + route refresh | fresh root cookie read | None | No evidence | NOT TESTED | actions/auth `9-46`; login `409-420` |
| Google login | OAuth callback | Yes | HTTP redirect | fresh root cookie read | None | No evidence | NOT TESTED | google callback `81-98` |
| Logout, same tab | signout | Yes | session refetch + push + refresh | session entry invalidated | None | No evidence | NOT TESTED | Navbar `54-60`; auth `193-209` |
| Auth, other active tab | any auth change | Yes | focus only | `/me` no-store | None | Yes until focus | CONFIRMED STALE | SessionProvider `56-71`; no cross-tab mechanism found |
| Session expiry | time/DB expiry | Yes | focus refresh or server request | 30s process cache | None | Possible | POSSIBLE RISK | auth `125-187`; provider `67-71` |
| Profile update: profile page | PUT profile | Yes | response `setProfile` | session cache invalidated | None | No | CONFIRMED WORKING | DashboardClient `132-158`; profile route `66-92` |
| Profile update: Navbar | PUT profile | Yes | none on mounted provider | server cache invalidated only | None | Yes until focus/navigation | CONFIRMED STALE | DashboardClient `152-158`; SessionProvider `53-71` |
| Trip create | POST business trips | Yes | `fetchTrips()` | API no-store | None | No, own dashboard | CONFIRMED WORKING | business page `278-312` |
| Trip edit | route exists | Yes | `fetchTrips()` after success | API no-store | None | No, own dashboard | CONFIRMED WORKING | business page `169-176` and mutation handlers |
| Publish/unpublish/close | PATCH close | Yes | `fetchTrips()` | API no-store | notification events only where emitted | No, own dashboard | CONFIRMED WORKING | business page `149-159`; organizer `75-88` |
| Trip cancel/delete | POST/DELETE | Yes | trips/bookings refetch | API no-store | affected-user badge event | No, initiator | CONFIRMED WORKING | business page `166-206`; delete route `89-100` |
| Public trip/list/detail/organizer/destination after remote mutation | trip mutations | Yes | navigation/server render only | pages largely force-dynamic | no trip-data subscription | Maybe in already-mounted view | POSSIBLE RISK | `force-dynamic` pages; no consumer event found |
| Booking create/pending | create-order | Yes | checkout response/navigation | API no-store | notifications vary | No evidence | NOT TESTED | create-order route `6+`; TripDetailsClient `191+` |
| Duplicate booking prevention | orchestrator | Yes | API error/success | DB/orchestrator rules | None | No evidence | NOT TESTED | payment service/orchestrator; no UI run |
| Payment initiation/success/failure | create/verify | Yes | provider callback then navigation | API no-store | notification counts | No evidence | NOT TESTED | verify route `5-12`; TripDetailsClient `258+` |
| Webhook confirmation/refund completion | webhook/orchestrator | Yes | badge only; dashboard fetch-on-mount | API no-store | notification SSE where emitted | Possible on mounted dashboard | POSSIBLE RISK | user dashboard `112-147`; notification pipeline |
| Booking cancellation | cancel route | Yes | `fetchData()` | API no-store | user/admin event | No, initiator | CONFIRMED WORKING | user page `556-575` |
| Organizer booking action | PATCH booking | Yes | `fetchBookings()` | API no-store | notification pipeline | No, initiator | CONFIRMED WORKING | business page `130-147` |
| Chat send, sender | POST message | Yes | immediate GET | API no-store | None | No | CONFIRMED WORKING | chat page `78-100` |
| Chat receive | remote POST | Yes | 3s polling | API no-store | None | No | CONFIRMED DELAYED | chat page `64-71` |
| Chat unread/read | GET chat/read timestamp | Yes | badge SSE/45s fallback | API no-store | notification SSE | No evidence | NOT TESTED | chat route `41-50`; bell `52-122` |
| Notification unread badge | domain mutation | Yes | SSE counts; focus/45s REST | no-store | PG NOTIFY -> SSE | No, bounded fallback | CONFIRMED WORKING | notificationEvents `24-112`; bell `52-122` |
| Mark notification read | POST notifications | Yes | optimistic zero | no-store | later reconcile | No | CONFIRMED WORKING | bell `135-163`; notifications route `106-178` |
| Story create/delete | POST/DELETE | Yes | direct local update | API no-store | story SSE for others | No, initiator | CONFIRMED WORKING | StoriesClient `396-449`; routes call `notifyStories` |
| Story like/unlike | POST like | Yes | optimistic then authoritative response | API no-store | story SSE | No, initiator | CONFIRMED WORKING | StoriesClient `451-501` |
| Story comment/delete | POST/DELETE comment | Yes | direct local update | API no-store | story SSE | No, initiator | CONFIRMED WORKING | StoriesClient `527-583` |
| Story remote updates after SSE error | any story mutation | Yes | none after stream closes | no fallback | reconnect absent | Yes/navigation | CONFIRMED STALE | StoriesClient `251-282` |
| Edit post / follow / unfollow | none found | No | N/A | N/A | N/A | N/A | NOT IMPLEMENTED | repository route/component search |
| Admin lists/actions | admin APIs | Yes | mostly explicit per-page refetch | API no-store | admin badge only | Depends on page | NOT TESTED | `src/app/admin/*`; no browser fixture |
| Organizer application/verification | register/admin routes | Yes | local reload/refetch varies | user session invalidation | admin/user notifications vary | Possible | POSSIBLE RISK | business-app route invalidation; register page reload |

## 5. Confirmed findings

### FRESH-001

Finding ID: FRESH-001
Severity: P2
Status: `CONFIRMED STALE`
Affected feature: profile identity and Navbar/profile-completeness controls
User-visible symptom: after saving name/avatar/profile fields, the dashboard shows the new data but the mounted Navbar can show the previous identity and restrictions.
Root cause: two independent React states. The mutation response updates `DashboardClient.profile`, while Navbar reads `SessionProvider.user`; no provider refresh/update follows save.
Evidence: `src/app/dashboard/DashboardClient.tsx:132-158`; `src/components/SessionProvider.tsx:53-75`; `src/components/Navbar.tsx:22-41`. The server invalidates only its session cache at `src/app/api/profile/route.ts:89`.
Reproduction steps: sign in; open Dashboard; change name/avatar or a completeness field; save; compare Dashboard and Navbar without changing focus/navigation.
Manual refresh effect: reload or focus-triggered `/api/auth/me` makes Navbar current.
Recommended fix direction: after successful save, update/refresh the existing auth provider from the returned authoritative profile; avoid a new dependency.
Confidence: high (deterministic state ownership path; browser unavailable).

### FRESH-002

Finding ID: FRESH-002
Severity: P1
Status: `CONFIRMED STALE`
Affected feature: cross-tab login, logout, expiry, and role/profile changes
User-visible symptom: an already-active second tab keeps its previous signed-in/signed-out UI until it loses/regains focus or otherwise refreshes.
Root cause: provider subscribes only to `window.focus`; no BroadcastChannel, storage event, or auth/session event exists.
Evidence: `src/components/SessionProvider.tsx:56-71`; repository-wide searches found no cross-tab auth mechanism.
Reproduction steps: keep two tabs visible/active; authenticate or sign out in tab A; observe tab B without focusing it. Server authorization is still enforced independently on its next request.
Manual refresh effect: yes; focus or reload calls/causes a fresh session read.
Recommended fix direction: add cross-tab synchronization to the existing provider and reconcile with `/api/auth/me`; do not make browser state authoritative.
Confidence: high.

### FRESH-003

Finding ID: FRESH-003
Severity: P2
Status: `CONFIRMED STALE`
Affected feature: remote story/feed updates
User-visible symptom: after any SSE error, another user's create/delete/like/comment changes no longer arrive in the mounted feed; navigation/reload is required.
Root cause: `es.onerror` closes the stream and never reconnects; unlike notification SSE, stories have no polling or focus fallback.
Evidence: `src/app/stories/StoriesClient.tsx:251-282`; compare notification reconnect/fallback at `src/components/NotificationBell.tsx:63-122`. Server emission path is `src/lib/notificationEvents.ts:105-112` and story mutation routes call it after DB changes.
Reproduction steps: open stories in two authenticated contexts; interrupt the first context's SSE connection; restore connectivity; mutate a story in the other context; observe no refetch in the first.
Manual refresh effect: yes.
Recommended fix direction: reconnect with bounded backoff and perform an authoritative refetch on reconnect/focus; optionally add low-frequency fallback using existing fetch.
Confidence: high.

### FRESH-004

Finding ID: FRESH-004
Severity: P2
Status: `CONFIRMED DELAYED`
Affected feature: chat receive and conversation freshness
User-visible symptom: incoming messages appear up to roughly three seconds after commit, plus request/render latency.
Root cause: fixed three-second polling; no realtime delivery path.
Evidence: `src/app/chat/[tripId]/page.tsx:42-71`; POST returns only `messageId` at `src/app/api/chat/[tripId]/route.ts:89-96`.
Reproduction steps: open same chat for two users; send from A immediately after B's poll; B sees it on a later poll.
Manual refresh effect: not required; polling converges.
Recommended fix direction: keep polling if the product accepts bounded delay; otherwise add an acknowledged realtime path plus reconnect reconciliation only after product requirements justify it.
Confidence: high for design delay; exact runtime duration not measured.

## 6. Possible risks

- `refreshSession()` has no request generation/abort protection. Concurrent refreshes can resolve out of order and an older `/me` response could overwrite newer state (`src/components/SessionProvider.tsx:56-65`). This is a possible race, not reproduced.
- `fetchMessages` can overlap when a slow GET exceeds the three-second interval; results are not sequence-guarded (`src/app/chat/[tripId]/page.tsx:42-71`). Possible out-of-order replacement.
- User booking/dashboard data fetches only on mount and after local cancellation. A webhook/refund update changes the badge but does not refetch the already-mounted booking list (`src/app/dashboard/user/page.tsx:112-147`).
- Public trip/list/detail pages are dynamic on request but already-mounted views do not subscribe to trip mutations. Whether immediate cross-view updates are a product requirement is unproven.
- The process-local 30-second session-user cache can retain old attributes in another Node process after profile/role mutation because invalidation is not distributed (`src/lib/auth.ts:24-50`, `181-185`). Authorization paths that consult fresh DB state separately are less exposed; runtime topology was not tested.
- Notification optimistic clear ignores POST failure; the next SSE/REST fetch repairs it, but the badge may be temporarily incorrect (`src/components/NotificationBell.tsx:150-160`).
- Existing dev logs show `You cannot use different slug names for the same dynamic path ('id' !== 'tripSlug')`. This prevented treating historical local readiness as a valid browser environment; it is not itself classified as a freshness defect.

## 7. Realtime findings

Notifications are the strongest end-to-end design: mutation calls `notifyUser`/`notifyAdmins`; PostgreSQL `pg_notify` crosses server processes; a persistent listener emits per-user/admin events; SSE recomputes counts from DB; the client updates state. It has 30-second heartbeat, exponential reconnect, focus reconciliation, and 45-second polling fallback (`src/lib/notificationEvents.ts:24-112`; `src/app/api/notifications/sse/route.ts:108-189`; `src/components/NotificationBell.tsx:52-122`). It has no Last-Event-ID/deduplication, but events carry snapshots rather than deltas, so reconnect refetch repairs missed events. Classification: **end-to-end design working; runtime not tested**.

Stories use the same PG bridge and snapshot refetch, but the client is **reconnect unsafe** and event loss can cause permanent stale UI after the first stream error (`StoriesClient.tsx:251-282`).

Chat is **not truly realtime**. It polls every three seconds; there is no WebSocket/SSE emission, acknowledgement, room membership, or last-event recovery. Polling itself is reconciliation.

Payment/booking events update notification counts in some flows but do not push updated booking records into an already-mounted dashboard. End-to-end payment freshness is **not testable locally** from available safe fixtures.

## 8. Cache and rendering findings

- Root layout uses request-time `headers()` and session cookie access, so personalized root content is request-time rendered (`src/app/layout.tsx:15-24`; `src/lib/auth.ts:125-138`).
- Home, trips, trip detail, stories, organizers, organizer detail, sitemap, and other data surfaces explicitly use `force-dynamic` where found. Route handlers execute database queries directly.
- API responses receive `no-store, max-age=0` globally (`next.config.ts:63-68`). Client session and notification requests additionally request `cache: "no-store"`.
- No application use of `revalidatePath`, `revalidateTag`, `updateTag`, `unstable_cache`, `use cache`, `force-cache`, cache tags, or query-client invalidation was found.
- The relevant application cache is the custom 30-second session Map, not the Next.js Data Cache (`src/lib/auth.ts:24-50`). Settings may also be queried through a helper, but no evidence ties it to the reported auth/profile symptoms.
- No service worker/API page cache was found. Browser BFCache behavior was not tested.
- `router.refresh()` would refresh Server Component payloads but does not inherently replace arbitrary client-owned state. For FRESH-001, updating/reconciling the provider is the direct boundary; a blanket refresh recommendation is unsupported.

## 9. Duplicate-request and race-condition findings

No race was runtime-proven. Static risks:

- Session refresh: concurrent focus/explicit calls can settle out of order; no abort/request ID (`SessionProvider.tsx:56-71`).
- Chat: interval GET and post-send GET can overlap and each blindly replaces messages (`chat page.tsx:42-71`, `91-93`).
- Stories: SSE bursts are debounced by 450 ms, which reduces duplicate refetches; cleanup clears the timer (`StoriesClient.tsx:254-281`).
- Notifications: on visibility return, `fetchCounts()` is invoked directly and again inside `connect()` (`NotificationBell.tsx:70-73`, `95-103`), producing a duplicate REST request. It is inefficient but snapshot-safe.
- React development Strict Mode can run effects twice, but no defect is classified solely on that behavior.

No full-page `location.reload()` is proposed as a solution. Existing full navigation/reload calls occur at OTP success and business registration, but they are implementation facts, not recommendations.

## 10. Performance measurements

Runtime UI timing could not be collected because no in-app browser was available and no safe authenticated fixtures were present. Existing development log timings are infrastructure observations only: `/robots.txt` 1686 ms (29 ms application code), `/llms-full.txt` 259 ms (8 ms application), `/llms.txt` 316 ms (6 ms application), `/sitemap.xml` 1553 ms (260 ms application). These do not measure authenticated freshness.

Design-bound timing:

- Chat delivery: polling delay `0-3000 ms` plus API/DB/render time; classification **polling delay**.
- Notification recovery after silent event loss: up to 45 seconds while visible, immediate on focus; classification **realtime fallback/polling delay**.
- Stories after SSE error: unbounded until navigation/reload; classification **missing realtime reconnect**.
- Cross-tab auth: unbounded while other tab never focuses; classification **missing cross-tab synchronization**.
- Profile/Navbar: unbounded until provider refresh/navigation; classification **missing state update**.

No evidence supports backend latency, database latency, hydration delay, CDN cache, or Next.js cache invalidation as the primary cause of the confirmed findings.

## 11. Existing test coverage

`npm test` was executed successfully: **16 passed, 0 failed**. It verifies production environment validation, database TLS policy, and story-media validation. It proves none of the visible UI freshness claims.

Additional TypeScript payment tests exist under `src/lib/payments/__tests__`, but the package test script does not execute them. Repository test configuration contains no Playwright/Cypress dependency or E2E script. No current test verifies immediate header state, auth redirect UI, signed-out flash, cross-tab logout, trip list after create, booking/seat freshness, webhook-driven dashboard updates, notification badge behavior, chat unread/reconnect, profile identity propagation, stale-response ordering, or realtime missed-event recovery.

## 12. Missing E2E tests

1. OTP success: assert Set-Cookie response, redirect, authenticated header on first destination paint, and no signed-out flash.
2. Password and OAuth parity: same visible assertions and request count.
3. Two-tab logout/login: assert other tab reconciles without manual reload and protected server request rejects after logout.
4. Profile save: assert dashboard, desktop/mobile Navbar, and profile-completeness controls update from one mutation.
5. Trip create/edit/cancel: assert organizer dashboard immediately, then public list/detail after specified navigation/reconciliation contract.
6. Booking create/cancel: assert My Bookings and relevant capacity/member counts.
7. Webhook/refund: keep dashboard mounted, deliver sandbox webhook, assert terminal state and fallback after event loss.
8. Chat: two contexts, delivery bound, unread count, read clear, overlapping-request ordering, reconnect reconciliation.
9. Notifications: event delivery, optimistic read rollback/reconcile, SSE disconnect/reconnect, missed event recovery.
10. Stories: two contexts, create/like/comment/delete, forced SSE disconnect, reconnect/refetch and deduplication.
11. Stale-response tests: deliberately delay the first `/api/auth/me`, chat GET, and stories GET so a newer response completes first; assert the newest state wins.

## 13. Fix priority

- **P0:** none confirmed. Payment/booking webhook freshness remains untested and should be tested before changes.
- **P1:** FRESH-002 cross-tab auth synchronization; payment/booking mounted-dashboard E2E coverage.
- **P2:** FRESH-001 provider/profile synchronization; FRESH-003 story SSE reconnect; FRESH-004 chat delivery contract; stale-response guards.
- **P3:** remove duplicate notification visibility fetch and improve transient loading/error states.

## 14. Proposed fix directions

| Direction | Evidence-supported requirement |
| --- | --- |
| Correct local React state | FRESH-001: make returned profile data update the shared session view |
| Correct auth provider | FRESH-001/FRESH-002: expose an authoritative update/reconcile API and cross-tab signal |
| Return updated mutation data | Already done for profile and social mutations; continue using it |
| Refetch existing query | No query library exists; use the existing fetch functions after webhook/reconnect only where E2E proves need |
| Invalidate existing cache | Continue server session-cache invalidation; consider distributed/DB re-read semantics if multi-process tests prove stale roles |
| Refresh Server Component boundary | Appropriate after cookie/server-render mutations; not a blanket fix for client-owned state |
| Add/correct realtime events | FRESH-003 needs reconnect/reconciliation; chat only if a sub-three-second product requirement is established |
| Add fallback polling | Stories may use low-frequency fallback/reconnect reconciliation; payments only if E2E proves event loss leaves terminal state stale |
| Prevent stale responses | Add request generation/abort protection to session and overlapping polling fetches |
| Remove duplicate fetches | Notification visibility handler invokes two REST fetches |
| Add cross-tab synchronization | Required for FRESH-002 |
| Improve loading states | Preserve server-seeded auth state; surface refresh failures instead of silently swallowing all errors |
| Improve backend performance | Not supported by current evidence |

No new dependency is required for the confirmed issues.

## 15. Final evidence table

| Finding | Confirmed | Reproduced | File evidence | Runtime evidence | Severity | Fix required |
| --- | ---: | ---: | ---: | ---: | --- | ---: |
| FRESH-001 profile vs Navbar state | Yes | No (browser unavailable) | Yes | No | P2 | Yes |
| FRESH-002 cross-tab auth | Yes | No (browser unavailable) | Yes | No | P1 | Yes |
| FRESH-003 stories SSE stops forever | Yes | No (browser unavailable) | Yes | No | P2 | Yes |
| FRESH-004 chat polling delay | Yes | No (browser unavailable) | Yes | No | P2 | Product decision |
| OTP header stale | No | No | Flow contradicts report | No | P1 if reproduced | No change without evidence |
| Payment/booking mounted view stale | No; possible risk | No | Partial | No | P0/P1 if reproduced | Test first |

## Audit execution record

- Required repository searches: completed for navigation/refresh, cache/revalidation, effects/timers, realtime/browser events, cookies/session/auth endpoints, notifications, payments, bookings, and dependencies.
- Browser scenarios A-H: **0 executed**. Browser runtime reported no available in-app browser; safe OTP/test-user mechanism was not found. No production secrets were used.
- Tests executed: `npm test` -> 16 passed, 0 failed.
- Evidence artifacts: this report; existing `.next-dev.out.log` and `.next-dev.err.log` inspected but not modified. No screenshots/traces generated.
- Implementation changes: **NONE**.

## Implementation and Runtime Verification

Implementation date: 2026-07-11.
Runtime verification date: 2026-07-11.

The targeted implementation addressed FRESH-001, FRESH-002, FRESH-003, session refresh ordering, and chat GET ordering without changing payment, booking, webhook, encryption, or authorization Route Handlers.

- FRESH-001: SessionProvider exposes a profile-safe update function. Successful saved profile responses update dashboard state and merge only name, avatar, age, gender, profession, fooding habit, and phone into shared session state. Privileged fields are excluded.
- FRESH-002: session changes use BroadcastChannel with a transient storage-event fallback. Signals contain only event type, timestamp, and per-tab source ID. Receiving tabs reconcile through /api/auth/me. Logout clears visual state promptly.
- Session race: refreshes abort the prior request and use a monotonically increasing generation. Only the latest mounted request can update state; network failure remains distinct from unauthenticated state.
- FRESH-003: stories SSE maintains one connection, reconnects with bounded exponential backoff up to 30 seconds, refetches after reconnect, reconciles on focus/visibility restoration, and cleans up timers/listeners.
- Chat overlap: three-second polling remains, but prior GETs are aborted, results are generation-guarded, and work is cancelled on trip change/unmount.

Verification update:

- Playwright was added with a local Chrome suite and gated local fixture users.
- Browser verified: password login to authenticated navbar, cross-tab sign-in, post-response cross-tab logout, server-authoritative protected API rejection after logout, and profile-save propagation to mounted Navbar.
- Browser timing captured by JSON reporter: password-login-visible-ms 2435; cross-tab-logout-visible-ms 44 after /api/auth/signout returned.
- Browser not verified: OTP, Google OAuth, forced stories SSE disconnect/reconnect, chat overlap, notifications, booking/payment webhook, and refund dashboard freshness.
- Full checks after implementation: typecheck passed; lint passed with 0 errors and 234 warnings; npm test 23/23 passed; security tests 16/16 passed; migration check passed; production env check passed with warnings; Playwright 2/2 passed; production build passed.

Implementation classification: **TARGETED REMEDIATION COMPLETE - PARTIALLY RUNTIME VERIFIED**.
