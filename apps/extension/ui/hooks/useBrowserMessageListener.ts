import { useEffect } from "react";
import type { Browser } from "wxt/browser";

/**
 * Escape hatch: useEffect with an empty dependency array to make mount-only
 * intent explicit. Prefer derived state, data-fetching libraries, or event
 * handlers over effects where possible.
 */
export function useMountEffect(effect: () => void | (() => void)) {
  // eslint-disable-next-line no-restricted-syntax
  useEffect(effect, []);
}

/**
 * Registers a browser.runtime.onMessage listener that filters by `type`
 * and calls `handler` with the full message when it matches.
 * Automatically unsubscribes on unmount.
 */
export function useBrowserMessageListener<TMessage extends { type: string }>(
  type: TMessage["type"],
  handler: (message: TMessage) => void,
): void {
  useMountEffect(function registerBrowserMessageListener() {
    const listener = (message: unknown, _sender: Browser.runtime.MessageSender): void => {
      if ((message as { type?: string }).type === type) {
        handler(message as TMessage);
      }
    };
    browser.runtime.onMessage.addListener(listener);
    return function unregisterBrowserMessageListener() {
      browser.runtime.onMessage.removeListener(listener);
    };
  });
}
