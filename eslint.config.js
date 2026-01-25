
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginReactRefresh from "eslint-plugin-react-refresh";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: ["dist", "dist-server", "node_modules", "public"],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "react-refresh": pluginReactRefresh,
    },
    rules: {
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "react-refresh/only-export-components": "warn",
    },
  },
  ...tseslint.configs.recommended,
  prettierConfig,
);
