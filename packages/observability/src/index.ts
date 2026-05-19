import { trace, SpanStatusCode } from "@opentelemetry/api";
import { BasicTracerProvider } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { resourceFromAttributes } from "@opentelemetry/resources";

export { trace, SpanStatusCode };

const PHOENIX_URL = "http://localhost:6006";

async function isPhoenixAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);
    const response = await fetch(`${PHOENIX_URL}/`, {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

export async function setupTelemetry() {
  const phoenixAvailable = await isPhoenixAvailable();

  if (!phoenixAvailable) {
    const hint =
      import.meta.env.DEV
        ? "Run `bun phoenix` or `cd packages/observability && bun dev` to enable."
        : "Run `bun phoenix` or `cd packages/observability && bun dev` to enable in development.";
    console.log(`[observability] Phoenix not available at ${PHOENIX_URL} — telemetry disabled. ${hint}`);
    return;
  }

  const modeLabel = import.meta.env.DEV ? "development" : "production";
  console.log(`[observability] Phoenix detected — enabling ${modeLabel} telemetry`);

  try {
    const exporter = new OTLPTraceExporter({
      url: `${PHOENIX_URL}/v1/traces`,
    });

    const processor = new SimpleSpanProcessor(exporter);

    const resource = resourceFromAttributes({
      "service.name": "play-ai-extension",
    });

    const provider = new BasicTracerProvider({ resource, spanProcessors: [processor] });

    trace.setGlobalTracerProvider(provider);
    console.log("[observability] Provider registered");

    self.addEventListener("unload", () => {
      provider?.forceFlush?.();
    });
  } catch (e) {
    console.error("[observability] Setup error:", e);
  }
}

export function createSpan(name: string, fn: () => Promise<void>) {
  const tracer = trace.getTracer("play-ai-extension");
  return tracer.startActiveSpan(name, async (span) => {
    try {
      await fn();
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (e) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(e) });
      span.recordException(e as Error);
      throw e;
    } finally {
      span.end();
    }
  });
}
