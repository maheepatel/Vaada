import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  {
    // `react-hooks/purity` forbids Date.now() during render. That rule is about
    // client components, which can re-render at any moment and would tear.
    //
    // Server components here render once per request, and reading the clock is
    // the entire job: a page whose tiles are coloured by how much of a deadline
    // has burned has to know what time it is. The value is then threaded through
    // the pure status engine explicitly, and passed to client countdowns as a
    // seed so hydration stays deterministic. Client components are NOT exempt.
    files: ["src/app/**/page.tsx"],
    rules: { "react-hooks/purity": "off" },
  },
]);

export default eslintConfig;
