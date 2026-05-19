import AutoConsent from "@duckduckgo/autoconsent";
import { autoconsent } from "@duckduckgo/autoconsent/rules/rules.json";
import { consentomatic } from "@duckduckgo/autoconsent/rules/consentomatic.json";
import type { RuleBundle } from "@duckduckgo/autoconsent";

export default defineUnlistedScript(() => {
  const consent = new AutoConsent(
    (msg) => browser.runtime.sendMessage(msg),
    {
      enabled: true,
      autoAction: "optOut",
      disabledCmps: [],
      enablePrehide: true,
      enableCosmeticRules: true,
      enableGeneratedRules: true,
      detectRetries: 10,
      isMainWorld: false,
      prehideTimeout: 2000,
      enableFilterList: false,
      enableHeuristicDetection: false,
      enableHeuristicAction: false,
      logs: {
        errors: true,
        lifecycle: false,
        rulesteps: false,
        detectionsteps: false,
        evals: false,
        messages: false,
        waits: false,
      },
    },
    {
      autoconsent: autoconsent as RuleBundle["autoconsent"],
      consentomatic: consentomatic as RuleBundle["consentomatic"],
    },
  );

  browser.runtime.onMessage.addListener((msg) => {
    return Promise.resolve(consent.receiveMessageCallback(msg));
  });
});
