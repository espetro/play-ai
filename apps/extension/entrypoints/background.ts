import { createMessageHandler, setupPortHandlers } from "~/background/messages";

export default defineBackground({
  main() {
    setupInstall();
    setupMessaging();
    setupPorts();
  },
});

function setupInstall() {
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === "install") {
      const url = browser.runtime.getURL("/options.html" as `/options.html${string}`);
      browser.tabs.create({ url });
    }
  });
}

function setupPorts() {
  browser.runtime.onConnect.addListener((port) => {
    setupPortHandlers(port);
  });
}

function setupMessaging() {
  browser.runtime.onMessage.addListener(createMessageHandler());
}
