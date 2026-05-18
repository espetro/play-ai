import type { TranscriptLine } from "~/lib/messaging";
import { getLogger } from "~/lib/logger";

const logger = getLogger(["content", "youtubeTranscript"]);

export interface CaptionTrack {
  languageCode: string;
  baseUrl: string;
  kind?: string;
}

export function selectBestTrack(tracks: CaptionTrack[]): CaptionTrack | null {
  return [...tracks].sort((a, b) => {
    const aIsAsr = a.kind === "asr" ? 1 : 0;
    const bIsAsr = b.kind === "asr" ? 1 : 0;
    if (aIsAsr !== bIsAsr) return aIsAsr - bIsAsr;
    return a.languageCode === "en" ? -1 : b.languageCode === "en" ? 1 : 0;
  })[0] ?? null;
}

function parseJson3Events(
  events: Array<{
    segs?: Array<{ utf8?: string; tOffsetMs?: number }>;
    tStartMs?: number;
    dDurationMs?: number;
  }>,
): TranscriptLine[] {
  return events
    .filter((e) => e.segs)
    .map((e) => {
      const text = (e.segs ?? [])
        .map((s) => s.utf8 ?? "")
        .join("")
        .trim();
      const start = (e.tStartMs ?? 0) / 1000;
      const end = start + (e.dDurationMs ?? 0) / 1000;
      return { start, end, text };
    })
    .filter((r) => r.text.length > 0);
}

function parseCaptionXml(xml: string): TranscriptLine[] {
  const lines: TranscriptLine[] = [];

  // Try format3 (<p t="..." d="...">)
  const format3Regex = /<p\s+[^>]*?t="(\d+)"[^>]*?d="(\d+)"[^>]*?>([^<]*)<\/p>/g;
  let match;
  while ((match = format3Regex.exec(xml)) !== null) {
    const start = parseInt(match[1], 10) / 1000;
    const duration = parseInt(match[2], 10) / 1000;
    const text = decodeHTMLEntities(match[3]).trim();
    if (text.length > 0) {
      lines.push({ start, end: start + duration, text });
    }
  }
  if (lines.length > 0) return lines;

  // Fallback to legacy format (<text start="..." dur="...">)
  const legacyRegex = /<text\s+[^>]*?start="([0-9.]+)"[^>]*?dur="([0-9.]+)"[^>]*?>([^<]*)<\/text>/g;
  while ((match = legacyRegex.exec(xml)) !== null) {
    const start = parseFloat(match[1]);
    const duration = parseFloat(match[2]);
    const text = decodeHTMLEntities(match[3]).trim();
    if (text.length > 0) {
      lines.push({ start, end: start + duration, text });
    }
  }

  return lines;
}

function decodeHTMLEntities(text: string): string {
  const elem = document.createElement("textarea");
  elem.innerHTML = text;
  return elem.value;
}

function extractApiKeyFromHtml(): string | null {
  const html = document.documentElement.innerHTML;
  const patterns = [
    /"INNERTUBE_API_KEY":"([^"\\]*(?:\\.[^"\\]*)*)"/,
    /"innertubeApiKey":"([^"\\]*(?:\\.[^"\\]*)*)"/,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Finds the start index of a JSON object assignment in raw HTML for the given key.
 * Matches: window["key"] = {, window.key = {, var key = {, key = {
 */
function findAssignmentStart(html: string, key: string): number {
  const patterns = [
    new RegExp(`window\\["${key}"\\]\\s*=\\s*\\{`),
    new RegExp(`window\\.${key}\\s*=\\s*\\{`),
    new RegExp(`var\\s+${key}\\s*=\\s*\\{`),
    new RegExp(`(?<!\\w)${key}\\s*=\\s*\\{`),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.index !== undefined) {
      return match.index + match[0].lastIndexOf("{");
    }
  }

  return -1;
}

/**
 * Reads a balanced JSON object/array starting from the given index.
 * Tracks brace and bracket depth, and respects string/escape sequences.
 */
function readBalancedObject(html: string, start: number): string {
  let depth = 0;
  let inString = false;
  let stringChar = "";
  let escaped = false;

  for (let i = start; i < html.length; i++) {
    const char = html[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\" && inString) {
      escaped = true;
      continue;
    }

    if (!inString) {
      if (char === '"' || char === "'") {
        inString = true;
        stringChar = char;
      } else if (char === "{") {
        depth++;
      } else if (char === "}") {
        depth--;
        if (depth === 0) {
          return html.slice(start, i + 1);
        }
      } else if (char === "[") {
        depth++;
      } else if (char === "]") {
        depth--;
        if (depth === 0) {
          return html.slice(start, i + 1);
        }
      }
    } else {
      if (char === stringChar) {
        inString = false;
        stringChar = "";
      }
    }
  }

  return "";
}

/**
 * Extracts a JSON object/array value from raw YouTube HTML for the given key.
 * Used as a fallback when window[key] is absent or stale (SPA navigation).
 */
function extractJsonBlob(html: string, key: string): unknown {
  const start = findAssignmentStart(html, key);
  if (start === -1) {
    return null;
  }

  const slice = readBalancedObject(html, start);
  if (!slice) {
    return null;
  }

  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

/**
 * Fetches the current YouTube page HTML, parses ytInitialPlayerResponse from it,
 * and returns sorted caption tracks. Used as fallback when window object is stale.
 */
export async function fetchCaptionTracksFromHtml(url: string): Promise<CaptionTrack[] | null> {
  try {
    const response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) {
      logger.warn("HTML fetch failed: status={status}", { status: response.status });
      return null;
    }

    const html = await response.text();
    const playerResponse = extractJsonBlob(html, "ytInitialPlayerResponse") as
      | YouTubePlayerResponse
      | null;

    if (!playerResponse) {
      logger.debug("No ytInitialPlayerResponse found in HTML");
      return null;
    }

    const tracks: CaptionTrack[] =
      playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];

    if (!tracks.length) {
      logger.debug("No caption tracks in ytInitialPlayerResponse from HTML");
      return null;
    }

    const sorted = [...tracks].sort((a, b) => {
      const aIsAsr = a.kind === "asr" ? 1 : 0;
      const bIsAsr = b.kind === "asr" ? 1 : 0;
      if (aIsAsr !== bIsAsr) return aIsAsr - bIsAsr;
      return a.languageCode === "en" ? -1 : b.languageCode === "en" ? 1 : 0;
    });

    logger.debug("Found {count} caption tracks from HTML for {url}", {
      count: sorted.length,
      url,
    });
    return sorted;
  } catch (err) {
    logger.warn("fetchCaptionTracksFromHtml failed: {error}", { error: err });
    return null;
  }
}

interface YouTubePlayerResponse {
  videoDetails?: { videoId?: string };
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: CaptionTrack[];
    };
  };
}

async function fetchViaInnerTube(videoId: string): Promise<TranscriptLine[] | null> {
  logger.debug("Fetching transcript via InnerTube API for video {videoId}", { videoId });
  try {
    // Prefer ytcfg if available; fall back to HTML regex (working extractor approach)
    const apiKey: string | null =
      (window as any).ytcfg?.data_?.INNERTUBE_API_KEY ?? extractApiKeyFromHtml();

    const url = apiKey
      ? `/youtubei/v1/player?key=${encodeURIComponent(apiKey)}&prettyPrint=false`
      : `/youtubei/v1/player?prettyPrint=false`;

    const response = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "ANDROID",
            clientVersion: "20.10.38",
          },
        },
        videoId,
      }),
    });

    if (!response.ok) {
      logger.error("InnerTube HTTP error: status={status}", { status: response.status });
      return null;
    }

    const data = await response.json();
    const captionTracks =
      data.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
    if (!captionTracks.length) {
      logger.error("InnerTube: no caption tracks in response");
      return null;
    }

    const track = selectBestTrack(captionTracks);
    if (!track) {
      logger.warn("No suitable caption track selected from {count} available", {
        count: captionTracks.length,
      });
      return null;
    }

    // Fetch raw XML (matches the working extractor approach)
    const captionRes = await fetch(track.baseUrl, { credentials: "same-origin" });
    if (!captionRes.ok) {
      logger.error("Caption track fetch failed: status={status}", { status: captionRes.status });
      return null;
    }

    const xml = await captionRes.text();
    const lines = parseCaptionXml(xml);
    if (!lines.length) {
      // Try JSON3 as secondary format
      const captionResJson = await fetch(track.baseUrl + "&fmt=json3", {
        credentials: "same-origin",
      });
      if (captionResJson.ok) {
        const data = await captionResJson.json();
        const json3Lines = parseJson3Events(data.events ?? []);
        if (json3Lines.length > 0) {
          logger.debug("Parsed JSON3 format: {count} lines", { count: json3Lines.length });
          return json3Lines;
        }
      }
    }
    logger.debug("Parsed InnerTube transcript: {count} lines", { count: lines.length });
    return lines;
  } catch (err) {
    logger.error("InnerTube exception: {error}", { error: err });
    return null;
  }
}

async function fetchViaTimedText(tracks: CaptionTrack[]): Promise<TranscriptLine[] | null> {
  const track = selectBestTrack(tracks);
  if (!track) {
    logger.warn("No suitable track selected from {count} tracks", { count: tracks.length });
    return null;
  }

  try {
    // Try JSON3 first
    const res = await fetch(track.baseUrl + "&fmt=json3");
    if (res.ok) {
      const data = await res.json();
      const lines = parseJson3Events(data.events ?? []);
      if (lines.length > 0) {
        logger.debug("Parsed JSON3 via timed text: {count} lines", { count: lines.length });
        return lines;
      }
    }
  } catch (err) {
    logger.warn("JSON3 fetch failed, falling through to XML: {error}", { error: err });
  }

  try {
    // Fallback to raw XML (format3)
    const res = await fetch(track.baseUrl);
    if (res.ok) {
      const xml = await res.text();
      const lines = parseCaptionXml(xml);
      logger.debug("Parsed XML via timed text: {count} lines", { count: lines.length });
      return lines;
    }
  } catch (err) {
    logger.error("Timed text XML fetch failed: {error}", { error: err });
    return null;
  }

  return null;
}

export async function fetchYouTubeTranscript(
  videoId: string,
  fallbackTracks?: CaptionTrack[],
): Promise<TranscriptLine[] | null> {
  logger.debug("fetchYouTubeTranscript called for video {videoId}, fallbackTracks={count}", {
    videoId,
    count: fallbackTracks?.length ?? 0,
  });

  // Primary: InnerTube API (no POT token needed)
  const innerTubeLines = await fetchViaInnerTube(videoId);
  if (innerTubeLines) {
    logger.debug("Successfully fetched via InnerTube");
    return innerTubeLines;
  }

  // Fallback: direct fetch from tracks
  if (fallbackTracks && fallbackTracks.length > 0) {
    logger.debug("InnerTube failed, switching to timed text fallback with {count} tracks", {
      count: fallbackTracks.length,
    });
    return fetchViaTimedText(fallbackTracks);
  }

  logger.warn("Both InnerTube and timed text approaches exhausted, no transcript available");
  return null;
}
