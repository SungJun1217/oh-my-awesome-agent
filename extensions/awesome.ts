// Pi loads extensions through jiti, which supports TypeScript source imports.
// This wrapper keeps conventional `extensions/` package discovery working.
// @ts-expect-error TS build emits JS; pi runtime resolves the .ts source via jiti.
export { default } from "../src/index.ts";
