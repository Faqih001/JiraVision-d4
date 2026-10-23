import nextConfig from "eslint-config-next"

export default [
  ...nextConfig,
  {
    ignores: ["drizzle/**", "scripts/**", "server/**", "public/**", "generate-jwt-secret.js", "server.js"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "react/no-unescaped-entities": "off",
    },
  },
  {
    // Pre-existing react-hooks v6 compiler findings in legacy dashboard/ui code.
    // TODO(redesign): remove once these files are rebuilt or deleted (phases B-F).
    files: [
      "app/dashboard/**",
      "app/context/**",
      "components/dashboard-*.tsx",
      "components/ai-model-selector.tsx",
      "components/calendar/**",
      "components/kanban/**",
      "components/ethical-metrics/**",
      "components/chat/**",
      "components/ui/**",
      "components/landing-chatbot.tsx",
      "hooks/use-calendar.ts",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/set-state-in-render": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
    },
  },
]
