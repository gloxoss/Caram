import { Hono } from "hono";
import { organizationsRouter } from "./organizations";
import { userRouter } from "./users";

export const adminRouter = new Hono()
	.basePath("/admin")
	.route("/", organizationsRouter)
	.route("/", userRouter);
