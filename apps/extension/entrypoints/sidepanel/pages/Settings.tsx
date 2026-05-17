import { useEffect, useState } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { getConfig, type AppConfig } from "~/lib/storage";
import { sendMessage } from "~/lib/messaging";
import { ProviderSetupForm } from "~/ui/components/provider-setup-form";

export default function Settings() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    getConfig().then((cfg) => {
      setConfig(cfg);
      setIsLoading(false);
      setFormOpen(cfg === null);
    });
  }, []);

  const handleSave = async (newConfig: AppConfig) => {
    await sendMessage({ type: "SET_CONFIG", payload: newConfig });
    await getConfig().then((cfg) => {
      setConfig(cfg);
      setFormOpen(false);
    });
  };

  const handleCancel = () => {
    if (config === null) {
      return;
    }
    setFormOpen(false);
  };

  if (isLoading) {
    return <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>;
  }

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return "••••••••";
    return key.slice(0, 5) + "••••••••";
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Providers</h2>
      </div>

      {config && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {config.provider === "anthropic" ? "Anthropic" : "OpenAI-compat"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {config.model}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    API Key: {maskApiKey(config.apiKey)}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFormOpen(!formOpen)}
                className="text-xs h-8"
              >
                {formOpen ? "Cancel" : "Edit"}
              </Button>
            </div>

            {formOpen && (
              <div className="mt-4 pt-4 border-t">
                <ProviderSetupForm
                  initialConfig={config}
                  onSave={handleSave}
                  onCancel={handleCancel}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!config && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground mb-4">No providers configured</p>
        </div>
      )}

      {config && !formOpen && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFormOpen(true)}
          className="w-full text-xs h-8"
        >
          + Configure a provider
        </Button>
      )}

      {!config && (
        <div className="pt-4">
          <ProviderSetupForm onSave={handleSave} onCancel={handleCancel} />
        </div>
      )}
    </div>
  );
}
