import { Hono } from "hono";
import { signInRouter } from "./sign-in";

export const authRouter = new Hono().route("/sign-in", signInRouter);
