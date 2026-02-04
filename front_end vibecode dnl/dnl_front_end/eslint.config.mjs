import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
	{
		ignores: ["**/.next/**", "**/node_modules/**", "**/out/**"],
	},
	...nextCoreWebVitals,
	{
		name: "project/rule-overrides",
		rules: {
			"react-hooks/set-state-in-effect": "off",
			"react-hooks/immutability": "off",
		},
	},
];

export default config;
