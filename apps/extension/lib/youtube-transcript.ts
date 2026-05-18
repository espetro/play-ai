import type { TranscriptLine } from "~/lib/messaging";

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

async function fetchViaInnerTube(videoId: string): Promise<TranscriptLine[] | null> {
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
      console.error("[transcript] InnerTube HTTP error:", response.status);
      return null;
    }

    const data = await response.json();
    const captionTracks =
      data.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
    if (!captionTracks.length) {
      console.error("[transcript] InnerTube: no caption tracks in response");
      return null;
    }

    const track = selectBestTrack(captionTracks);
    if (!track) return null;

    // Fetch raw XML (matches the working extractor approach)
    const captionRes = await fetch(track.baseUrl, { credentials: "same-origin" });
    if (!captionRes.ok) {
      console.error("[transcript] Caption track fetch failed:", captionRes.status);
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
        return parseJson3Events(data.events ?? []);
      }
    }
    return lines;
  } catch (err) {
    console.error("[transcript] InnerTube exception:", err);
    return null;
  }
}

async function fetchViaTimedText(tracks: CaptionTrack[]): Promise<TranscriptLine[] | null> {
  const track = selectBestTrack(tracks);
  if (!track) {
    return null;
  }

  try {
    // Try JSON3 first
    const res = await fetch(track.baseUrl + "&fmt=json3");
    if (res.ok) {
      const data = await res.json();
      const lines = parseJson3Events(data.events ?? []);
      if (lines.length > 0) return lines;
    }
  } catch {
    // Fall through to XML
  }

  try {
    // Fallback to raw XML (format3)
    const res = await fetch(track.baseUrl);
    if (res.ok) {
      const xml = await res.text();
      return parseCaptionXml(xml);
    }
  } catch {
    return null;
  }

  return null;
}

export async function fetchYouTubeTranscript(
  videoId: string,
  fallbackTracks?: CaptionTrack[],
): Promise<TranscriptLine[] | null> {
  // Primary: InnerTube API (no POT token needed)
  const innerTubeLines = await fetchViaInnerTube(videoId);
  if (innerTubeLines) {
    return innerTubeLines;
  }

  // Fallback: direct fetch from tracks
  if (fallbackTracks && fallbackTracks.length > 0) {
    return fetchViaTimedText(fallbackTracks);
  }

  return null;
}
