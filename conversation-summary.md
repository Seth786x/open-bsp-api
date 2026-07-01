# Conversation Summary — WhatsApp Master Token Architecture

## The BYOA (Bring Your Own App) Model

OpenBSP follows the BYOA model. Clients use their own Meta developer applications. Admin configuration is restricted to individual client-scoped OAuth access tokens, keeping resource management isolated.

**`META_SYSTEM_USER_ACCESS_TOKEN`** is the master token belonging to the Paletix app, under the Mind & Beyond business (ID: `547181228471395`).

## Where the Master Token IS Used (Messaging Fallback)

Three functions use it as a fallback for sending/processing messages:

| Function | File | Pattern |
|----------|------|---------|
| `whatsapp-dispatcher` | `index.ts:325` | `account.access_token \|\| DEFAULT_ACCESS_TOKEN` |
| `whatsapp-webhook` | `index.ts:771` | `orgAddress.extra?.access_token \|\| DEFAULT_ACCESS_TOKEN` |
| `test-outbound` | `index.ts:64` | `account.extra?.access_token \|\| DEFAULT_ACCESS_TOKEN` |

## Where the Master Token is NOT Used (Admin Operations)

`whatsapp-management` uses OAuth embedded signup only (`META_APP_ID` + `META_APP_SECRET` to exchange an auth code for a per-customer `business_access_token`). All admin API calls (`/subscribed_apps`, `/register`, `/message_templates`, etc.) use that customer-scoped token — never the master token.

## The Partner Delegation Scenario

Lateraxal has granted full asset management to Mind & Beyond as a partner. This means:
- The `META_SYSTEM_USER_ACCESS_TOKEN` (Mind & Beyond business) CAN now perform admin operations on Lateraxal's WABA and phone number IDs.
- This requires the token to have `whatsapp_business_management` and `whatsapp_business_messaging` scopes.

## Proposed: Manual Connect Route (`/whatsapp-management/manual-connect`)

A fallback route for clients who can't go through the Meta SDK but have manually assigned partner permissions. They provide WABA ID and phone number ID, and the backend uses the master token to register and set up webhooks.

### Gaps in Gemini's Proposed Implementation vs. Existing `performEmbeddedSignup`

1. **Missing field validation** — No guard for missing `organization_id`, `waba_id`, or `phone_number_id`
2. **No `flow_type` support** — Existing code handles `"existing_phone_number"` (coexistence) by skipping registration and running `postInitDataSync` for contacts + messages. Gemini's always registers and never syncs.
3. **Missing DB fields** — The upsert doesn't store `business_id`, `callback_url`, `verify_token`, or `flow_type`. `deleteSignup` depends on `flow_type` and will break.
4. **Delete flow breakage** — `deleteSignup` uses `extra.access_token` for deregistration. With `access_token: null`, it becomes empty string → Meta rejects it. Would need master token fallback in delete too.
5. **No data sync for existing numbers** — `postInitDataSync` (contacts + messages) is never called.
6. **Error logging inconsistency** — Existing route logs to Supabase `logs` table; Gemini's only uses `log.error`.
