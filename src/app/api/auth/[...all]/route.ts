import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Better Auth handles every /api/auth/* URL (Google redirect, callback, sign-out...).
export const { GET, POST } = toNextJsHandler(auth);
