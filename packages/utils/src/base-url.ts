export function getBaseUrl(): string {
	if (process.env.VERCEL_URL) {
		return `https://${process.env.VERCEL_URL}`;
	}

	if (process.env.BASE_URL) {
		return process.env.BASE_URL;
	}

	return `http://localhost:${process.env.PORT || 3000}`;
}
