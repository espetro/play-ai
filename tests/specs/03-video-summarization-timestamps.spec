# Video Summarization and Timestamp Generation

AI-powered video summarization with timestamp-linked navigation.

## Scenario: Successfully summarize video and generate timestamps

* Navigate to YouTube video <video_url>
  | video_url                                    |
  | https://www.youtube.com/watch?v=ypzNhwpmOD4 |
* Open extension sidebar
* Select AI model <model>
  | model                 |
  | Claude 3.5 Sonnet     |
* Click "Summarize Video" button
* System extracts video transcript with timestamps
* System constructs LLM request with:
  * System prompt instructing model to embed timestamps
  * Full video transcript
  * Video metadata (title, URL, duration)
  * Selected model identifier
* System sends request to LLM API endpoint
* LLM returns summary with embedded timestamps:
  | summary                                                |
  | This video covers React hooks. [0:01:30] Introduction  |
  | to state management. [0:05:12] Deep dive into useState. |
* System parses response and extracts timestamps
* Summary is rendered in sidebar chat history
* Timestamps are rendered as clickable blue links
* Chat message shows "✓ Summarized" status

## Scenario: Click timestamp to seek video to exact moment

* Video summary is displayed in sidebar with timestamps
* Summary text contains timestamp link <timestamp>
  | timestamp  |
  | [0:01:30]  |
* User clicks timestamp link
* System extracts time value (90 seconds) from timestamp
* System sends SEEK_VIDEO message to content script:
  | message_type   | seek_time |
  | SEEK_VIDEO     | 90        |
* Content script receives message
* Content script identifies video element in DOM
* Content script sets video.currentTime = 90
* Content script triggers video.play()
* Video player seeks to 1:30 and resumes playback
* User can verify video is playing at correct moment

## Scenario: Custom summarization instructions

* Open extension sidebar on video page
* Type custom instruction in chat input <instruction>
  | instruction                              |
  | Summarize focusing on technical details  |
* Click "Send" or "Summarize"
* System includes user instruction in LLM request
* LLM response is customized based on instruction
* Summary is generated and displayed with timestamps
* Chat shows both user instruction and AI response

## Scenario: Handle streaming response from LLM

* Click "Summarize Video"
* System sends request to LLM API
* LLM response is streaming (chunked delivery)
* Chat message appears with loading spinner
* As each chunk arrives, message updates incrementally
* Timestamps are parsed and clickable links are inserted as response completes
* Final summary is fully rendered with all timestamp links active

## Scenario: Timestamp parsing extracts time correctly

* LLM returns summary with various timestamp formats:
  | timestamp_format | parsed_seconds |
  | [0:01:30]        | 90             |
  | [0:15:45]        | 945            |
  | [1:23:12]        | 4992           |
* System correctly parses each timestamp using regex
* Regex pattern: `\[(\d{1,2}):(\d{2}):(\d{2})\]` or `\[(\d+):(\d+)\]`
* Each timestamp is converted to seconds: (hours * 3600) + (minutes * 60) + seconds
* Timestamps are accurate and seekable

## Scenario: Handle missing timestamps in LLM response

* Click "Summarize Video"
* LLM returns summary without embedded timestamps:
  | summary                                   |
  | This video discusses web development ...  |
  | Covers topics like HTML, CSS, JavaScript. |
* System detects no timestamps in response
* Chat displays raw summary as provided by LLM
* Timestamp links are not generated (degraded mode)
* Chat shows informational note: "Summary provided without timestamps"
* User can still read summary, navigate video manually

## Scenario: Transcript caching improves performance

* Navigate to YouTube video
* Open sidebar (Flow 2 - transcript is extracted and cached)
* Click "Summarize Video" immediately
* System uses cached transcript instead of re-fetching
* Request is sent faster (no YouTube API delay)
* User sees quicker LLM response

## Scenario: Handle LLM API failure gracefully

* Click "Summarize Video"
* System sends request to LLM API
* API returns error response:
  | error_code | error_message            |
  | 401        | Invalid API Key          |
  | 429        | Rate limit exceeded      |
  | 500        | Server error             |
* Chat displays error banner:
  * "Failed to generate summary. Please retry."
  * Shows error details (if safe to display)
* "Retry" button is available
* User can retry without losing context

## Scenario: Handle video element not found in page

* Navigate to unsupported video site or dynamically loaded video
* Open sidebar, summarize video successfully
* Summary with timestamps is displayed
* User clicks timestamp link <timestamp>
  | timestamp |
  | [0:05:12] |
* Content script cannot find video element in DOM
* Timestamp click is silently ignored (no error)
* Video does not seek
* User can navigate manually if needed

## Scenario: Timestamp link styling and accessibility

* Summary with timestamps is rendered in sidebar
* Timestamp links have:
  * Blue text color or underline (visual distinction)
  * Hover state (cursor: pointer, highlight)
  * ARIA labels: "Seek to 1:30"
  * Keyboard accessible (tab navigation, enter to activate)
* Accessibility test confirms WCAG compliance

## Scenario: Multiple timestamps in single summary

* LLM returns summary with multiple timestamps:
  | summary_segment                              |
  | [0:00:45] Introduction discusses problem     |
  | [0:03:20] Framework comparison               |
  | [0:07:15] Implementation walkthrough          |
  | [0:12:30] Common pitfalls and best practices |
* System extracts all 4 timestamps
* Each timestamp is independently clickable
* User can jump between multiple sections
* Verify each link seeks video to correct time

## Scenario: Summary persists in chat history

* Click "Summarize Video"
* Summary is displayed in chat
* User refreshes page or closes sidebar
* Reopen sidebar
* Previous summary is still visible in chat history
* Chat context is maintained
* Timestamp links remain functional after reload
