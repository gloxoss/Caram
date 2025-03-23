import { Hono } from "hono";
import { router as emailRouter } from "./email";

export const signInRouter = new Hono().route("/email", emailRouter);
