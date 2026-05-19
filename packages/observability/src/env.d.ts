/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Vite-provided: true in development mode */
  readonly DEV?: boolean;
  /** Vite-provided: true in production mode */
  readonly PROD?: boolean;
  /** Vite-provided: "development" | "production" | "test" */
  readonly MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
