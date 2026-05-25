---
name: nextjs-realtime-notifications
description: Best practices for building real-time notifications in Next.js (App Router) without WebSockets. Use when user wants to implement polling, notification systems, or real-time state syncing across multiple roles/browsers in Next.js.
---

# Next.js Realtime Notifications (No WebSockets)

## Context
When building a notification system in Next.js (App Router) without external push libraries or WebSockets, developers often rely on Polling + Fetch Interception. This skill outlines critical caveats regarding Next.js caching and payload state mappings.

## 1. Defeating Next.js Aggressive Client Cache
Next.js aggressively caches `fetch` requests in the client/router. If you use `setInterval` for polling, Next.js might return stale cached responses unless a mutation action invalidates the router cache. 

**Solution:** Always use a cache-buster query parameter (`t=${Date.now()}`) combined with `{ cache: 'no-store' }`.

```tsx
// ❌ BAD: Next.js will cache this response between polls until user clicks somewhere
const res = await fetch(`/api/notifications?userId=${userId}`);

// ✅ GOOD: Guaranteed fresh data on every poll for cross-session realtime
const res = await fetch(`/api/notifications?userId=${userId}&t=${Date.now()}`, {
  cache: 'no-store',
  headers: { 'Cache-Control': 'no-cache' }
});
```

## 2. Realtime Sync Architecture (Cross-Tab vs. Intra-Tab)
To achieve seamless real-time behavior without WebSockets:
- **Intra-tab (Same user):** Override `window.fetch` to detect mutation requests (`POST`, `PATCH`, `DELETE`) and instantly refetch notifications.
- **Cross-session (Multi-user):** Fallback to `setInterval` short-polling (e.g., every 3 seconds) to pick up mutations made by other users (like Admin assigning a Coach).

## 3. Verify Status Payloads for API Hooks
When triggering notifications via API hooks (e.g. hooking into `PATCH`), **do not assume** string literal mappings based on business logic verbs. Always verify the actual `TaskStatus` or Enum value sent by the UI.

- *Business Logic:* "Submit for Review" 
- *Dangerous Assumption:* `status === 'submitted'`
- *Actual Frontend Status:* `status === 'review'`

Always trace how the Frontend components (e.g. `updateStatus(task.id, 'review')`) construct the payload before injecting notification logic into the backend route.
