const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000/api';

let apiOrigin = 'http://localhost:5000';
try {
	apiOrigin = new URL(apiBase).origin;
} catch {
	apiOrigin = 'http://localhost:5000';
}

const securityHeaders = [
	{ key: 'X-Frame-Options', value: 'DENY' },
	{ key: 'X-Content-Type-Options', value: 'nosniff' },
	{ key: 'Referrer-Policy', value: 'no-referrer' },
	{ key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
	{
		key: 'Content-Security-Policy',
		value: [
			"default-src 'self'",
			"base-uri 'self'",
			"frame-ancestors 'none'",
			"object-src 'none'",
			"script-src 'self' 'unsafe-inline' 'unsafe-eval'",
			"style-src 'self' 'unsafe-inline'",
			"img-src 'self' data: blob: http: https:",
			"font-src 'self' data:",
			`connect-src 'self' ${apiOrigin} ws: wss:`,
		].join('; '),
	},
];

/** @type {import('next').NextConfig} */
const nextConfig = {
	async headers() {
		return [
			{
				source: '/(.*)',
				headers: securityHeaders,
			},
		];
	},
};

export default nextConfig;
