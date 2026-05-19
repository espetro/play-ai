import { useState, useCallback } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { $configs, $activeConfigId, $telemetryEnabled, type AppConfig } from "~/lib/storage";
import { useStorageItem } from "~/ui/hooks/useStorageItem";
import { useMountEffect } from "~/ui/hooks/useBrowserMessageListener";
import { trpcClient } from "~/lib/trpc";
import { ProviderSetupForm } from "~/ui/components/provider-setup-form";

export default function Settings() {
  const configs = useStorageItem($configs, []);
  const activeConfigId = useStorageItem($activeConfigId, null);
  const telemetryEnabled = useStorageItem($telemetryEnabled, false);
  const [formOpen, setFormOpen] = useState(configs.length === 0);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [phoenixAvailable, setPhoenixAvailable] = useState(true);

  const checkPhoenix = useCallback(async () => {
    try {
      const _ = await fetch("http://localhost:6006", { mode: "no-cors" });
      setPhoenixAvailable(true);
    } catch {
      setPhoenixAvailable(false);
    }
  }, []);

  const handleToggleTelemetry = useCallback(async () => {
    const newValue = !telemetryEnabled;
    await browser.runtime.sendMessage({
      type: "SET_TELEMETRY_ENABLED",
      enabled: newValue,
    });
    await $telemetryEnabled.set(newValue);
  }, [telemetryEnabled]);

  useMountEffect(function checkPhoenixOnMount() {
    checkPhoenix();
  });

  const handleSave = async (newConfig: AppConfig) => {
    await trpcClient.config.set.mutate(newConfig);
    setEditingConfigId(null);
  };

  const handleCancel = () => {
    setEditingConfigId(null);
  };

  const handleSelectActive = async (configId: string) => {
    await browser.storage.local.set({ activeConfigId: configId });
  };

  const handleDelete = async (configId: string) => {
    const updated = configs.filter((c) => c.id !== configId);
    await browser.storage.local.set({ configs: updated });
    if (activeConfigId === configId && updated.length > 0) {
      await browser.storage.local.set({ activeConfigId: updated[0]?.id });
    } else if (updated.length === 0) {
      await browser.storage.local.set({ activeConfigId: null });
    }
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return "••••••••";
    return key.slice(0, 5) + "••••••••";
  };

  const editingConfig = editingConfigId ? configs.find((c) => c.id === editingConfigId) : null;

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Observability</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Trace AI requests to a local Phoenix instance at http://localhost:6006
        </p>
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={handleToggleTelemetry}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              telemetryEnabled ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                telemetryEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className="text-sm">{telemetryEnabled ? "Enabled" : "Disabled"}</span>
        </div>
        {telemetryEnabled && !phoenixAvailable && (
          <p className="text-xs text-muted-foreground mt-2">
            Phoenix not running — start it with{" "}
            <code className="bg-muted px-1 py-0.5 rounded">bun phoenix</code> or{" "}
            <code className="bg-muted px-1 py-0.5 rounded">
              cd packages/observability && bun dev
            </code>
          </p>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold">Providers</h2>
      </div>

      {configs.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground mb-4">No providers configured</p>
        </div>
      )}

      {configs.map((config) => (
        <Card
          key={config.id}
          className={`cursor-pointer transition-colors ${
            activeConfigId === config.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
          }`}
          onClick={() => handleSelectActive(config.id)}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {config.provider === "anthropic" ? "Anthropic" : "OpenAI-compat"}
                  </Badge>
                  {activeConfigId === config.id && <Badge className="text-xs">Active</Badge>}
                </div>
                <div>
                  <p className="text-sm font-medium">{config.model}</p>
                  <p className="text-xs text-muted-foreground">
                    API Key: {maskApiKey(config.apiKey)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingConfigId(config.id);
                  }}
                  className="text-xs h-8"
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(config.id);
                  }}
                  className="text-xs h-8 text-destructive hover:text-destructive"
                >
                  Delete
                </Button>
              </div>
            </div>

            {editingConfig?.id === config.id && (
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
      ))}

      {formOpen && (
        <Card>
          <CardContent className="p-4">
            <ProviderSetupForm onSave={handleSave} onCancel={handleCancel} />
          </CardContent>
        </Card>
      )}

      {!formOpen && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFormOpen(true)}
          className="w-full text-xs h-8"
        >
          + Add provider
        </Button>
      )}
    </div>
  );
}
