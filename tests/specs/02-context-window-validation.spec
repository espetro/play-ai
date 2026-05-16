# Context Window Validation

Video transcript token count validation against selected model's context window.

## Scenario: Successfully validate transcript fits within model context window

* Navigate to YouTube video <video_url>
  | video_url                                    |
  | https://www.youtube.com/watch?v=ypzNhwpmOD4 |
* Open extension sidebar
* System extracts video transcript with timestamps
* User selects AI model <model>
  | model                 |
  | Claude 3.5 Sonnet     |
* System calculates transcript token count <token_count>
  | token_count |
  | 15000       |
* System fetches model context window limit <context_limit>
  | context_limit |
  | 200000        |
* Verify token count is less than context limit
* System displays "Ready" badge next to model name
* Summarize button is enabled

## Scenario: Display warning when transcript exceeds context window

* Navigate to YouTube video <video_url>
  | video_url                                    |
  | https://www.youtube.com/watch?v=ypzNhwpmOD4 |
* Open extension sidebar
* System extracts video transcript
* User selects AI model <model>
  | model          |
  | GPT-4o mini    |
* System calculates transcript token count <token_count>
  | token_count |
  | 150000      |
* System fetches model context window limit <context_limit>
  | context_limit |
  | 128000        |
* Verify token count exceeds context limit
* System displays warning banner <warning_text>
  | warning_text                                    |
  | Transcript exceeds model context window         |
* Warning suggests alternative models with larger context windows
* Warning offers option to summarize partial content (time range)
* Summarize button remains disabled

## Scenario: User switches to larger model after warning

* Navigate to YouTube video <video_url>
  | video_url                                    |
  | https://www.youtube.com/watch?v=ypzNhwpmOD4 |
* Open extension sidebar
* User selects model with insufficient context <model>
  | model       |
  | GPT-4o mini |
* System displays context window warning
* User clicks model dropdown
* User selects larger model <new_model>
  | new_model             |
  | Claude 3.5 Sonnet     |
* System recalculates transcript token count
* System verifies new model context window is sufficient
* Warning banner is dismissed
* "Ready" badge is displayed
* Summarize button is enabled

## Scenario: Token count includes system prompt overhead

* Navigate to YouTube video
* Open extension sidebar
* System extracts transcript
* User selects model
* System calculates token count including:
  * Transcript tokens
  * System prompt tokens
  * Safety margin (10% buffer)
* Total token count used for context window validation
* If (transcript + system_prompt + buffer) fits, model is approved

## Scenario: Fetch model context window from local catalog

* User selects AI model <model>
  | model             |
  | Claude 3.5 Sonnet |
* System looks up model context window in local catalog
  * Source: packages/ai/src/models.ts
  * Context window: 200000
* Model details are retrieved without external API call
* Token validation proceeds immediately

## Scenario: Handle model not in catalog

* User selects custom or unknown model <model>
  | model       |
  | Custom GPT  |
* Model is not found in local catalog
* System gracefully handles missing context window metadata
* Warning displayed: "Model context window unknown, proceed with caution"
* User can:
  * Manually enter model's context window
  * Select a known model from dropdown
  * Proceed at own risk

## Scenario: Context validation on video with short transcript

* Navigate to YouTube video <video_url>
  | video_url                                                      |
  | https://www.youtube.com/watch?v=dQw4w9WgXcQ                   |
* Video is a short clip (e.g., 2 minutes)
* Open extension sidebar
* System extracts transcript <token_count>
  | token_count |
  | 500         |
* User selects model <model>
  | model                 |
  | Claude 3.5 Sonnet     |
* Token count is trivial compared to context window
* System displays "Ready" badge immediately
* No warning is necessary
