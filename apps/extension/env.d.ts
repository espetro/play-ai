// CSS module declarations
declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}
declare module "*.module.scss" {
  const classes: { [key: string]: string };
  export default classes;
}

// Plain CSS side-effect imports (used by entrypoints)
declare module "*.css" {
  const css: string;
  export default css;
}

interface ImportMetaEnv {
  // Provided by Vite at build time
  readonly DEV?: boolean;
  readonly PROD?: boolean;
  /** Vite mode: "development" | "production" | "test" */
  readonly MODE?: string;

  // Custom environment variables
  readonly VITE_AI_BASE_URL?: string;
  readonly VITE_AI_API_KEY?: string;
  readonly VITE_AI_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
