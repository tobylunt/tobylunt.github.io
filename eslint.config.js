import eslint from "@eslint/js";
import markdown from "@eslint/markdown";
import eslintPluginAstro from "eslint-plugin-astro";
import perfectionist from "eslint-plugin-perfectionist";
import regexp from "eslint-plugin-regexp";
import tseslint from "typescript-eslint";

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	...eslintPluginAstro.configs.recommended,
	...eslintPluginAstro.configs["jsx-a11y-recommended"],
	perfectionist.configs["recommended-natural"],
	regexp.configs["flat/recommended"],
	...markdown.configs.recommended,
	{
		ignores: ["node_modules/", "dist/", ".astro/", ".github/", ".changeset/"],
	},
	{
		files: ["**/*.astro"],
		languageOptions: {
			parserOptions: {
				extraFileExtensions: [".astro"],
			},
		},
		rules: {
			"astro/jsx-a11y/no-redundant-roles": [
				"error",
				{
					ol: ["list"],
					ul: ["list"],
				},
			],
		},
	},
	{
		files: ["**/*.ts", "**/*.tsx"],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		rules: {
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{ ignoreRestSiblings: true, varsIgnorePattern: "Props" },
			],
			"@typescript-eslint/no-require-imports": "warn",
		},
	},
);
