/**
 * ESLint flat config para @nanpad/core.
 * Solo TypeScript; sin React.
 */

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/", "node_modules/", "**/*.d.ts", "**/*.config.js"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
);
