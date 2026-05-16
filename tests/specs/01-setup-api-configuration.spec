# Setup API Configuration

Browser extension setup and API credential validation.

## Scenario: Successfully configure extension with valid OpenAI API key

* Open extension onboarding page
* Select API provider <provider>
  | provider      |
  | OpenAI        |
* Enter API key <api_key>
  | api_key                    |
  | sk-proj-xxxxxxxxxxxxxxxxxx |
* Click verify connection button
* System sends test API request to provider endpoint
* Verify API connection succeeds with HTTP 200
* Credentials are stored in chrome.storage.local under key <storage_key>
  | storage_key             |
  | @play-ai:ai-config      |
* Extension is marked as configured
* Onboarding page displays success message

## Scenario: Handle invalid API key gracefully

* Open extension onboarding page
* Select API provider <provider>
  | provider      |
  | Anthropic     |
* Enter invalid API key <api_key>
  | api_key            |
  | invalid-fake-key   |
* Click verify connection button
* System sends test API request to provider endpoint
* Verify API connection fails with HTTP 401
* Error message is displayed to user <error_message>
  | error_message              |
  | Invalid API Key            |
* User can retry and enter new credentials
* After entering valid credentials, flow completes successfully

## Scenario: Configure extension with custom endpoint

* Open extension onboarding page
* Select API provider <provider>
  | provider  |
  | Custom    |
* Enter custom base URL <base_url>
  | base_url                               |
  | https://api.custom-llm.internal/v1     |
* Enter API key <api_key>
  | api_key           |
  | custom-secret-key |
* Click verify connection button
* System sends test API request to custom endpoint
* Verify API connection succeeds
* Custom endpoint is stored in chrome.storage.local
* Extension is marked as configured

## Scenario: Handle unreachable endpoint

* Open extension onboarding page
* Select API provider <provider>
  | provider  |
  | Custom    |
* Enter unreachable custom base URL <base_url>
  | base_url                    |
  | https://unreachable.local   |
* Enter API key
* Click verify connection button
* System sends test API request to custom endpoint
* Network request fails (timeout or connection refused)
* Error message is displayed to user <error_message>
  | error_message              |
  | Endpoint unreachable       |
* User can switch provider or correct the URL

## Scenario: Credentials are not logged or exposed

* Open extension onboarding page
* Select API provider <provider>
  | provider      |
  | OpenAI        |
* Enter API key <api_key>
  | api_key                    |
  | sk-proj-sensitive-secret   |
* Click verify connection button
* System sends test API request
* Verify API connection succeeds
* Credentials are stored in chrome.storage.local
* API key is never logged to console
* API key is never sent to external analytics or telemetry services
* Storage is scoped to extension context only
