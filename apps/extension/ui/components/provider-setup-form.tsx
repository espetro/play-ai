import * as React from "react";
import type { AppConfig } from "~/lib/storage";
import { sendMessage } from "~/lib/messaging";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { Connection } from "~/components/ai-elements/connection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

interface ProviderSetupFormProps {
  initialConfig?: AppConfig;
  onSave: (config: AppConfig) => Promise<void>;
  onCancel: () => void;
}

const DEFAULT_BASE_URLS = {
  anthropic: "https://api.anthropic.com",
  openai: "https://api.openai.com/v1",
};

export const ProviderSetupForm = React.forwardRef<HTMLFormElement, ProviderSetupFormProps>(
  ({ initialConfig, onSave, onCancel }, ref) => {
    const [provider, setProvider] = React.useState<"anthropic" | "openai">(
      (initialConfig?.provider as "anthropic" | "openai") || "anthropic",
    );
    const [baseUrl, setBaseUrl] = React.useState(
      initialConfig?.baseUrl || DEFAULT_BASE_URLS[provider as keyof typeof DEFAULT_BASE_URLS],
    );
    const [apiKey, setApiKey] = React.useState(initialConfig?.apiKey || "");
    const [showKey, setShowKey] = React.useState(false);
    const [connectionStatus, setConnectionStatus] = React.useState<
      "idle" | "connecting" | "connected" | "error"
    >("idle");
    const [availableModels, setAvailableModels] = React.useState<string[]>([]);
    const [selectedModel, setSelectedModel] = React.useState<string | null>(
      initialConfig?.model || null,
    );
    const [errorMessage, setErrorMessage] = React.useState("");
    const [isSaving, setIsSaving] = React.useState(false);

    const handleProviderChange = (value: string) => {
      if (!value) return;
      const newProvider = value as "anthropic" | "openai";
      setProvider(newProvider);
      setBaseUrl(DEFAULT_BASE_URLS[newProvider]);
      setConnectionStatus("idle");
      setAvailableModels([]);
      setSelectedModel(null);
    };

    const handleTestConnection = async () => {
      if (!baseUrl) {
        setErrorMessage("Base URL is required");
        return;
      }

      setConnectionStatus("connecting");
      setErrorMessage("");

      try {
        const response = await sendMessage<{ models: string[] } | { error: string }>({
          type: "TEST_CONNECTION",
          payload: { provider, baseUrl, apiKey },
        });

        if ("error" in response) {
          setConnectionStatus("error");
          setErrorMessage(response.error);
        } else if ("models" in response) {
          setConnectionStatus("connected");
          setAvailableModels(response.models);
        }
      } catch (error) {
        setConnectionStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Failed to test connection");
      }
    };

    const handleSave = async () => {
      if (!selectedModel) {
        setErrorMessage("Please select a model");
        return;
      }

      setIsSaving(true);
      try {
        const config: AppConfig = {
          provider,
          baseUrl,
          apiKey,
          model: selectedModel,
        };
        await onSave(config);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to save config");
      } finally {
        setIsSaving(false);
      }
    };

    const isTestDisabled = !baseUrl || connectionStatus === "connecting";
    const isSaveDisabled = connectionStatus !== "connected" || !selectedModel || isSaving;

    return (
      <form
        ref={ref}
        className="w-full space-y-6"
        onSubmit={(e: React.FormEvent) => {
          e.preventDefault();
          handleSave();
        }}
      >
        {/* Connection Status */}
        <Connection status={connectionStatus} error={errorMessage} />

        {/* Provider Selection */}
        <div className="space-y-3">
          <Label>Provider</Label>
          <ToggleGroup
            type="single"
            value={provider}
            onValueChange={handleProviderChange}
            className="justify-start gap-2"
          >
            <ToggleGroupItem
              value="anthropic"
              className="flex-1 border border-input bg-transparent data-[state=on]:!bg-primary data-[state=on]:!text-primary-foreground data-[state=on]:!border-primary"
            >
              <span>Anthropic</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="openai"
              className="flex-1 border border-input bg-transparent data-[state=on]:!bg-primary data-[state=on]:!text-primary-foreground data-[state=on]:!border-primary"
            >
              <span>OpenAI-compat</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Base URL */}
        <div className="space-y-2">
          <Label htmlFor="baseUrl">Base URL</Label>
          <Input
            id="baseUrl"
            type="url"
            value={baseUrl}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBaseUrl(e.target.value)}
            placeholder="https://api.anthropic.com"
          />
          <p className="text-xs text-muted-foreground">If not provided, default is used</p>
        </div>

        {/* API Key */}
        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key</Label>
          <div className="flex gap-2">
            <Input
              id="apiKey"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
              placeholder="sk-ant-••••••••••••••"
              className="flex-1"
            />
            <Button type="button" variant="outline" size="sm" onClick={() => setShowKey(!showKey)}>
              {showKey ? "Hide" : "Show"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Optional — leave blank for local providers (e.g. LMStudio)
          </p>
        </div>

        {/* Test Connection Button */}
        <Button
          type="button"
          variant="default"
          onClick={handleTestConnection}
          disabled={isTestDisabled}
          className="w-full"
        >
          Test Connection
        </Button>

        {/* Model Selector */}
        {connectionStatus === "connected" && (
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select value={selectedModel ?? ""} onValueChange={(e) => setSelectedModel(e)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={isSaveDisabled} className="flex-1">
            Save →
          </Button>
        </div>
      </form>
    );
  },
);

ProviderSetupForm.displayName = "ProviderSetupForm";
