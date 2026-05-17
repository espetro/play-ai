import * as v from "valibot";
import { useForm, useField, Form as FormischForm, getInput } from "@formisch/react";
import type { AppConfig } from "~/lib/storage";
import { sendMessage } from "~/lib/messaging";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Connection } from "~/components/ai-elements/connection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useState } from "react";
import type { ProviderType } from "@play-ai/ai/core/types";

type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

interface ProviderSetupFormProps {
  initialConfig?: AppConfig;
  onSave: (config: AppConfig) => Promise<void>;
  onCancel: () => void;
}

const DEFAULT_BASE_URLS = {
  anthropic: "https://api.anthropic.com",
  openai: "https://api.openai.com/v1",
};

const ProviderSchema = v.object({
  provider: v.union([v.literal("anthropic"), v.literal("openai")]),
  baseUrl: v.pipe(v.string(), v.url("Valid URL required")),
  apiKey: v.string(),
  model: v.pipe(v.string(), v.nonEmpty("Please select a model")),
});

type ProviderForm = v.InferOutput<typeof ProviderSchema>;

const isProvider = (_: unknown): _ is ProviderType => _ === "anthropic" || _ === "openai";

export const ProviderSetupForm = ({ initialConfig, onSave, onCancel }: ProviderSetupFormProps) => {
  const [showKey, setShowKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const form = useForm({
    schema: ProviderSchema,
    initialInput: {
      provider: (initialConfig?.provider as ProviderType) ?? "anthropic",
      baseUrl: initialConfig?.baseUrl ?? DEFAULT_BASE_URLS["anthropic"],
      apiKey: initialConfig?.apiKey ?? "",
      model: initialConfig?.model ?? "",
    },
    validate: "submit",
    revalidate: "input",
  });

  const providerField = useField(form, { path: ["provider"] });
  const baseUrlField = useField(form, { path: ["baseUrl"] });
  const apiKeyField = useField(form, { path: ["apiKey"] });
  const modelField = useField(form, { path: ["model"] });

  const handleProviderChange = (value: string | undefined) => {
    if (!isProvider(value)) return;

    providerField.onChange(value);
    baseUrlField.onChange(DEFAULT_BASE_URLS[value]);
    modelField.onChange("");

    setConnectionStatus("idle");
    setAvailableModels([]);
  };

  const handleTestConnection = async () => {
    const { provider, baseUrl, apiKey } = getInput(form);

    if (!baseUrl) {
      setErrorMessage("Base URL is required");
      return;
    }

    if (!apiKey) {
      setErrorMessage("API Key is required");
      return;
    }

    if (!provider) {
      setErrorMessage("Provider type is required");
      return;
    }

    setConnectionStatus("connecting");
    setErrorMessage("");

    try {
      const response = await sendMessage<{ models: string[] } | { error: string }>({
        type: "TEST_CONNECTION",
        payload: { provider, baseUrl, apiKey },
      });

      if (!response) {
        setConnectionStatus("error");
        setErrorMessage("No response from background service. Try again.");
      } else if ("error" in response) {
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

  const handleSaveSubmit = async (output: ProviderForm) => {
    try {
      const config: AppConfig = {
        provider: output.provider,
        baseUrl: output.baseUrl,
        apiKey: output.apiKey,
        model: output.model,
      };
      await onSave(config);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save config");
    }
  };

  const isTestDisabled = !baseUrlField.input || connectionStatus === "connecting";
  const isSaveDisabled = connectionStatus !== "connected" || form.isSubmitting;

  return (
    <FormischForm of={form} className="w-full space-y-6" onSubmit={handleSaveSubmit}>
      {/* Connection Status */}
      <Connection status={connectionStatus} error={errorMessage} />

      {/* Provider Selection */}
      <div className="space-y-3">
        <Label>Provider</Label>
        <Select
          value={providerField.input ?? "anthropic"}
          onValueChange={handleProviderChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="anthropic">Anthropic</SelectItem>
            <SelectItem value="openai">OpenAI-compat</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Base URL */}
      <div className="space-y-2">
        <Label htmlFor="baseUrl">Base URL</Label>
        <Input
          id="baseUrl"
          type="url"
          value={baseUrlField.input ?? ""}
          onChange={(e) => baseUrlField.onChange(e.target.value)}
          placeholder="https://api.anthropic.com"
        />
        {baseUrlField.errors?.[0] && (
          <p className="text-xs text-destructive">{baseUrlField.errors[0]}</p>
        )}
        <p className="text-xs text-muted-foreground">If not provided, default is used</p>
      </div>

      {/* API Key */}
      <div className="space-y-2">
        <Label htmlFor="apiKey">API Key</Label>
        <div className="flex gap-2">
          <Input
            id="apiKey"
            type={showKey ? "text" : "password"}
            value={apiKeyField.input ?? ""}
            onChange={(e) => apiKeyField.onChange(e.target.value)}
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
          <Select value={modelField.input ?? ""} onValueChange={(v) => modelField.onChange(v)}>
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
          {modelField.errors?.[0] && (
            <p className="text-xs text-destructive">{modelField.errors[0]}</p>
          )}
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
    </FormischForm>
  );
};

export default ProviderSetupForm;
