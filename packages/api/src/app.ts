import { auth } from "@repo/auth";
import { getBaseUrl } from "@repo/utils";
import { apiReference } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { openAPISpecs } from "hono-openapi";
import { mergeOpenApiSchemas } from "./lib/openapi-schema";
import { corsMiddleware } from "./middleware/cors";
import { loggerMiddleware } from "./middleware/logger";
import { adminRouter } from "./routes/admin/router";
import { aiRouter } from "./routes/ai";
import { authRouter } from "./routes/auth";
import { brandRouter } from "./routes/brand/route";
import { categoryRouter } from "./routes/category/route";
import { contactRouter } from "./routes/contact/router";
import { healthRouter } from "./routes/health";
import { newsletterRouter } from "./routes/newsletter";
import { organizationsRouter } from "./routes/organizations/router";
import { outletsRouter } from "./routes/outlet/router";
import { paymentsRouter } from "./routes/payments/router";
import { productRouter } from "./routes/product/route";
import { rackRouter } from "./routes/rack/route";
import { salesRouter } from "./routes/sale/route";
import { unitRouter } from "./routes/unit/route";
import { uploadsRouter } from "./routes/uploads";
import { webhooksRouter } from "./routes/webhooks";

export const app = new Hono().basePath("/api");

app.use(loggerMiddleware);
app.use(corsMiddleware);

const appRouter = app
	.route("/", authRouter)
	.route("/", webhooksRouter)
	.route("/", aiRouter)
	.route("/", uploadsRouter)
	.route("/", paymentsRouter)
	.route("/", contactRouter)
	.route("/", newsletterRouter)
	.route("/", organizationsRouter)
	.route("/", adminRouter)
	.route("/", healthRouter)
	.route("/", outletsRouter)
	.route("/", salesRouter)
	.route("/", categoryRouter)
	.route("/", productRouter)
	.route("/", rackRouter)
	.route("/", brandRouter)
	.route("/", unitRouter);

app.get(
	"/app-openapi",
	openAPISpecs(app, {
		documentation: {
			info: {
				title: "supastarter API",
				version: "1.0.0",
			},
			servers: [
				{
					url: getBaseUrl(),
					description: "API server",
				},
			],
		},
	}),
);

app.get("/openapi", async (c) => {
	const authSchema = await auth.api.generateOpenAPISchema();
	const appSchema = await (
		app.request("/api/app-openapi") as Promise<Response>
	).then((res) => res.json());

	const mergedSchema = mergeOpenApiSchemas({
		appSchema,
		authSchema: authSchema as any,
	});

	return c.json(mergedSchema);
});

app.get(
	"/docs",
	apiReference({
		theme: "saturn",
		spec: {
			url: "/api/openapi",
		},
	}),
);

export type AppRouter = typeof appRouter;
