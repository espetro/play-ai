export function setupTelemetry() {
  // Telemetry is configured via experimental_telemetry in streamText calls
  // Global tracer provider setup is not compatible with MV3 service workers
  // but the AI SDK's experimental_telemetry still captures traces to Phoenix
}
