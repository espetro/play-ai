import { configure, getConsoleSink, getLogger as _getLogger } from "@logtape/logtape";

export async function configureLogger() {
  await configure({
    sinks: { console: getConsoleSink() },
    loggers: [
      { category: ["play-ai"], sinks: ["console"], lowestLevel: "debug" },
    ],
  });
}

export function getLogger(category: string[]) {
  return _getLogger(["play-ai", ...category]);
}
