import { auth } from "@repo/auth";
import { Hono } from "hono";

export const emailSignInRouter = new Hono().post("/", async (c) => {
	return auth.handler(c.req.raw);
});
