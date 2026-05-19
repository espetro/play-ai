import { trace, SpanStatusCode } from "@opentelemetry/api";
import { BasicTracerProvider } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { resourceFromAttributes } from "@opentelemetry/resources";

export { trace, SpanStatusCode };

export async function setupTelemetry() {
  console.log("[observability] DEV:", import.meta.env.DEV);
  if (!import.meta.env.DEV) {
    console.log("[observability] Skipping - not DEV mode");
    return;
  }

  try {
    console.log("[observability] Setting up OTLP exporter...");
    const exporter = new OTLPTraceExporter({
      url: "http://localhost:6006/v1/traces",
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
