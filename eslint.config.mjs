/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import noUnsanitized from "eslint-plugin-no-unsanitized";
import importX from "eslint-plugin-import-x";
import unicorn from "eslint-plugin-unicorn";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "no-unsanitized": noUnsanitized,
      "import-x": importX,
      unicorn,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-misused-promises": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/no-base-to-string": "warn",
      "@typescript-eslint/prefer-promise-reject-errors": "warn",
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/restrict-template-expressions": "warn",
      "@typescript-eslint/no-redundant-type-constituents": "warn",
      "@typescript-eslint/require-await": "warn",
      "complexity": ["warn", { max: 20 }],
      "max-depth": ["warn", { max: 4 }],

      // no-unsanitized (XSS detection) — error: untrusted HTML/script sinks
      // must never reach the webview. Known-safe static assignments are
      // opted out with an inline eslint-disable + justification.
      "no-unsanitized/property": "error",
      "no-unsanitized/method": "error",

      // import-x (circular deps, ordering)
      "import-x/no-cycle": "warn",
      "import-x/order": [
        "warn",
        { groups: ["builtin", "external", "internal", "parent", "sibling"] },
      ],
      "import-x/no-duplicates": "warn",

      // unicorn (modern JS best practices)
      "unicorn/no-array-for-each": "warn",
      "unicorn/prefer-array-find": "warn",
      "unicorn/no-lonely-if": "warn",
      "unicorn/prefer-string-replace-all": "warn",
      "unicorn/prefer-number-properties": "warn",
      "unicorn/no-useless-spread": "warn",

      // Discourage rawHtml — prefer safeNumber/safeCssClass/safeCssValue
      "no-restricted-imports": ["warn", {
        paths: [{
          name: "./shared",
          importNames: ["rawHtml"],
          message: "Prefer safeNumber(), safeCssClass(), or safeCssValue() over rawHtml(). Use rawHtml only in shared.ts internals.",
        }],
      }],
    },
  },
  {
    ignores: ["dist/", "node_modules/", "**/*.mjs", "tests/"],
  }
);
