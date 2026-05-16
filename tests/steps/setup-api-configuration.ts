import { Step, DataStore } from "@gauge-ts/core";

/**
 * Step implementations for Flow 1: Extension Setup and API Configuration
 *
 * These steps are written in gauge-ts style and can be wired up when gauge-ts
 * is formally adopted. For now, they serve as a test plan and interface to the
 * extension's configuration flow.
 *
 * Implementation notes:
 * - Uses agent-browser CLI for browser automation (see CLAUDE.md)
 * - Interacts with chrome.storage.local via background script messaging
 * - Calls packages/ai/src/providers.ts factory to test API connections
 */

export class SetupApiConfigurationSteps {
  private store: DataStore;

  /**
   * TODO: Open extension onboarding page
   * - Launch browser with extension loaded via agent-browser --extension flag
   * - Navigate to extension options page (chrome-extension://id/options.html)
   * - Verify ProviderStep.tsx is rendered
   */
  @Step("Open extension onboarding page")
  public async openOnboardingPage(): Promise<void> {
    // TODO: Implement with agent-browser
    // const browser = await launch_browser_with_extension();
    // await browser.goto(EXTENSION_OPTIONS_URL);
  }

  /**
   * TODO: Select API provider
   * - Find provider dropdown in ProviderStep component
   * - Click dropdown and select provider from list
   * - Store selected provider in DataStore for later assertions
   */
  @Step("Select API provider <provider>")
  public async selectApiProvider(provider: string): Promise<void> {
    // TODO: Implement with agent-browser
    // const dropdown = await page.locator('[data-testid="provider-select"]');
    // await dropdown.click();
    // await page.locator(`[data-value="${provider}"]`).click();
    this.store.put("selectedProvider", provider);
  }

  /**
   * TODO: Enter API key
   * - Find API key input field in ApiKeyStep component
   * - Type the provided API key
   * - Store key in DataStore (for later verification it was sent to API)
   */
  @Step("Enter API key <api_key>")
  public async enterApiKey(apiKey: string): Promise<void> {
    // TODO: Implement with agent-browser
    // const keyInput = await page.locator('[data-testid="api-key-input"]');
    // await keyInput.fill(apiKey);
    this.store.put("enteredApiKey", apiKey);
  }

  /**
   * TODO: Click verify connection button
   * - Find "Verify Connection" button in the UI
   * - Click it and wait for verification process to start
   * - Sidebar may show loading spinner
   */
  @Step("Click verify connection button")
  public async clickVerifyButton(): Promise<void> {
    // TODO: Implement with agent-browser
    // const verifyBtn = await page.locator('[data-testid="verify-button"]');
    // await verifyBtn.click();
    // await page.waitForLoadState('networkidle');
  }

  /**
   * TODO: System sends test API request to provider endpoint
   * - Background script (apps/extension/entrypoints/background.ts) intercepts verify action
   * - Constructs request using packages/ai/src/providers.ts factory
   * - Sends test ping to configured endpoint (OpenAI, Anthropic, or custom)
   * - This step documents the action, not a user-facing UI action
   */
  @Step("System sends test API request to provider endpoint")
  public async systemSendsTestRequest(): Promise<void> {
    // NOTE: This is a background process step, not a user action.
    // It documents what happens internally. In a full implementation,
    // we would mock or spy on the LLM API call here.
    // TODO: Set up network listener in agent-browser to capture API request
    // const requests = await page.context().waitForEvent('request', req => {
    //   return req.url().includes('api.openai.com') ||
    //          req.url().includes('api.anthropic.com') ||
    //          req.url().includes(customEndpoint);
    // });
  }

  /**
   * TODO: Verify API connection succeeds with HTTP 200
   * - Check response from API request (captured via network listener)
   * - Verify status code is 2xx (success)
   * - Store response in DataStore for later assertions
   */
  @Step("Verify API connection succeeds with HTTP 200")
  public async verifyConnectionSuccess(): Promise<void> {
    // TODO: Implement with network listener
    // const response = this.store.get('apiResponse');
    // assert(response.status >= 200 && response.status < 300);
    this.store.put("connectionSuccessful", true);
  }

  /**
   * TODO: Credentials are stored in chrome.storage.local
   * - After successful verification, background script stores credentials
   * - Uses apps/extension/lib/storage.ts helper functions
   * - Verify storage by reading from chrome.storage.local via background script messaging
   */
  @Step("Credentials are stored in chrome.storage.local under key <storage_key>")
  public async verifyCredentialsStored(storageKey: string): Promise<void> {
    // TODO: Implement by querying storage via background script
    // Use messaging from apps/extension/lib/messaging.ts
    // const storedConfig = await sendMessage({ type: "GET_STORAGE", key: storageKey });
    // assert(storedConfig !== null);
    // assert(storedConfig.apiKey === this.store.get('enteredApiKey'));
    this.store.put("storageKey", storageKey);
  }

  /**
   * TODO: Extension is marked as configured
   * - Background script sets flag: @play-ai:is-configured = true
   * - Onboarding UI detects this flag and transitions to next screen
   */
  @Step("Extension is marked as configured")
  public async verifyConfigured(): Promise<void> {
    // TODO: Query storage for @play-ai:is-configured flag
    // const isConfigured = await sendMessage({ type: "GET_STORAGE", key: "@play-ai:is-configured" });
    // assert(isConfigured === true);
  }

  /**
   * TODO: Onboarding page displays success message
   * - After credentials are stored, UI shows success badge or message
   * - User sees "Setup complete" or similar confirmation
   * - Next button or navigation appears
   */
  @Step("Onboarding page displays success message")
  public async verifySuccessMessage(): Promise<void> {
    // TODO: Implement with agent-browser
    // const successMessage = await page.locator('[data-testid="success-message"]');
    // await expect(successMessage).toBeVisible();
    // const messageText = await successMessage.textContent();
    // assert(messageText.includes('success') || messageText.includes('complete'));
  }

  /**
   * TODO: Enter invalid API key
   */
  @Step("Enter invalid API key <api_key>")
  public async enterInvalidApiKey(apiKey: string): Promise<void> {
    // TODO: Same as enterApiKey but with a known-invalid key
    this.store.put("enteredApiKey", apiKey);
  }

  /**
   * TODO: Verify API connection fails with HTTP 401
   */
  @Step("Verify API connection fails with HTTP 401")
  public async verifyConnectionFailure(): Promise<void> {
    // TODO: Check API response status is 401 (Unauthorized)
    // const response = this.store.get('apiResponse');
    // assert(response.status === 401);
    this.store.put("connectionSuccessful", false);
  }

  /**
   * TODO: Error message is displayed to user
   */
  @Step("Error message is displayed to user <error_message>")
  public async verifyErrorMessage(expectedMessage: string): Promise<void> {
    // TODO: Find error message in UI and verify text
    // const errorElement = await page.locator('[data-testid="error-message"]');
    // const messageText = await errorElement.textContent();
    // assert(messageText.includes(expectedMessage));
  }

  /**
   * TODO: User can retry and enter new credentials
   */
  @Step("User can retry and enter new credentials")
  public async retryWithNewCredentials(): Promise<void> {
    // TODO: Click retry button, repeat API key entry with valid credentials
    // const retryBtn = await page.locator('[data-testid="retry-button"]');
    // await retryBtn.click();
    // // Then user enters valid credentials...
  }

  /**
   * TODO: After entering valid credentials, flow completes successfully
   */
  @Step("After entering valid credentials, flow completes successfully")
  public async verifyFlowCompletion(): Promise<void> {
    // TODO: Re-run verify button flow with valid key, assert success
  }

  /**
   * TODO: Select provider with custom endpoint option
   */
  @Step("Select API provider <provider>")
  public async selectCustomProvider(provider: string): Promise<void> {
    // Same as selectApiProvider, but provider is "Custom"
    this.store.put("selectedProvider", provider);
  }

  /**
   * TODO: Enter custom base URL
   */
  @Step("Enter custom base URL <base_url>")
  public async enterCustomBaseUrl(baseUrl: string): Promise<void> {
    // TODO: Implement with agent-browser
    // const urlInput = await page.locator('[data-testid="custom-base-url"]');
    // await urlInput.fill(baseUrl);
    this.store.put("customBaseUrl", baseUrl);
  }

  /**
   * TODO: System sends test API request to custom endpoint
   */
  @Step("System sends test API request to custom endpoint")
  public async testCustomEndpoint(): Promise<void> {
    // TODO: Background script builds URL from custom base + /chat/completions etc.
    // Sends test request to that URL
  }

  /**
   * TODO: Custom endpoint is stored in chrome.storage.local
   */
  @Step("Custom endpoint is stored in chrome.storage.local")
  public async verifyCustomEndpointStored(): Promise<void> {
    // TODO: Query storage and verify customBaseUrl is persisted
  }

  /**
   * TODO: Enter unreachable custom base URL
   */
  @Step("Enter unreachable custom base URL <base_url>")
  public async enterUnreachableUrl(baseUrl: string): Promise<void> {
    this.store.put("customBaseUrl", baseUrl);
  }

  /**
   * TODO: Network request fails (timeout or connection refused)
   */
  @Step("Network request fails (timeout or connection refused)")
  public async verifyNetworkFailure(): Promise<void> {
    // TODO: Verify API request resulted in network error (not 2xx/4xx/5xx but connection failure)
  }

  /**
   * TODO: API key is never logged to console
   */
  @Step("API key is never logged to console")
  public async verifyNotLoggedToConsole(): Promise<void> {
    // TODO: Set up console listener, verify no logs contain API key
    // const logs = await page.evaluate(() => window.__consoleLogs);
    // assert(!logs.some(log => log.includes(this.store.get('enteredApiKey'))));
  }

  /**
   * TODO: API key is never sent to external analytics or telemetry services
   */
  @Step("API key is never sent to external analytics or telemetry services")
  public async verifyNotSentToTelemetry(): Promise<void> {
    // TODO: Set up network listener for external services (Sentry, Google Analytics, etc.)
    // Verify API key is not in any request body/headers to those services
  }

  /**
   * TODO: Storage is scoped to extension context only
   */
  @Step("Storage is scoped to extension context only")
  public async verifyStorageScoping(): Promise<void> {
    // TODO: Verify chrome.storage.local is used (not sessionStorage or localStorage)
    // Verify credentials cannot be read by other extensions
  }
}
