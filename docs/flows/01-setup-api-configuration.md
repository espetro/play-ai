# Flow 1: Extension Setup and API Configuration

## Summary

Users install the browser extension and configure their LLM provider (OpenAI, Anthropic Claude, or custom endpoint). The extension validates the API connection and securely stores credentials in browser local storage for future requests.

## Entry Point

User installs the extension and clicks the extension icon or navigates to the onboarding page (e.g., `chrome://extensions/?options=<extension-id>`).

## User Flow Steps

### Step 1: User opens extension setup

**Actor:** User  
**Action:** Clicks the extension icon in the browser toolbar.  
**Result:** Extension opens the onboarding/options page in a new tab or popup.

### Step 2: System displays API configuration UI

**Actor:** System  
**Action:** Renders the API provider selection screen with available options:
- OpenAI (standard API endpoint)
- Anthropic Claude (standard API endpoint)
- Custom (user provides their own base URL)

See: `packages/ui/src/onboarding/ProviderStep.tsx` and `ApiKeyStep.tsx`

**Result:** User sees a form with provider dropdown, API key input field, and optional custom base URL field.

### Step 3: User selects provider and enters credentials

**Actor:** User  
**Action:** 
1. Selects a provider from the dropdown (e.g., "Anthropic Claude").
2. Pastes their API key into the "API Key" field.
3. If "Custom" is selected, provides a custom base URL (e.g., `https://api.custom.com`).
4. Clicks "Verify Connection" or "Next".

**Result:** Form captures all user input.

### Step 4: System verifies API connection

**Actor:** System  
**Action:** 
1. Sends a test API request to the configured endpoint using `packages/ai/src/providers.ts` factory.
2. Includes a minimal prompt to verify the connection without consuming tokens (e.g., "ping").
3. Waits for response from the LLM.

See: `packages/ai/src/providers.ts` and `models.ts`

**Result:** Either connection succeeds or fails.

### Step 5: Decision — Connection successful?

**Success Path:**  
✅ API responds successfully (HTTP 2xx, valid LLM response).  
→ Proceed to Step 6.

**Failure Path:**  
❌ API request fails (invalid key, unreachable endpoint, 4xx/5xx error).  
→ Jump to Step 5b (Error handling).

### Step 5b: System displays connection error

**Actor:** System  
**Action:** Shows error message to user:
- "Invalid API Key" (401 error)
- "Endpoint unreachable" (network error)
- "Invalid custom base URL" (if applicable)

Offers user options:
- Retry (re-enter credentials)
- Switch provider
- Check documentation

**Result:** User sees error feedback and can correct input.

### Step 6: System stores credentials securely

**Actor:** System  
**Action:** 
1. Credentials (API key, provider, base URL) are stored in `chrome.storage.local` using helpers in `apps/extension/lib/storage.ts`.
2. No credentials are logged, sent to external servers, or persisted in cache.
3. Storage key format: `@play-ai:ai-config` (scoped to extension)

See: `apps/extension/lib/storage.ts`

**Result:** Credentials are persisted and inaccessible to other extensions or websites.

### Step 7: System marks extension as configured

**Actor:** System  
**Action:** 
1. Sets internal flag in storage: `@play-ai:is-configured = true`
2. Updates extension UI state to indicate readiness
3. Optionally navigates user to model selection page (Flow 2)

**Result:** Extension is ready to use.

## Decision Tree

```
User clicks extension icon
    ↓
Display onboarding page
    ↓
User selects provider + enters API key
    ↓
System verifies connection
    ├─ Success → Store credentials → Mark configured → Done ✅
    └─ Failure → Display error → Retry loop ↻
```

## Outcome

- Extension is configured with a valid LLM API key
- Credentials are stored securely in `chrome.storage.local`
- User sees confirmation that setup is complete
- Extension is ready to process AI requests for video summarization

## Related Components

- **UI:** `packages/ui/src/onboarding/ProviderStep.tsx`, `ApiKeyStep.tsx`
- **Storage:** `apps/extension/lib/storage.ts`
- **AI Providers:** `packages/ai/src/providers.ts`, `models.ts`
- **Background Worker:** `apps/extension/entrypoints/background.ts` (may handle API test request)
