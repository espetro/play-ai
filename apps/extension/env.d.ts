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
