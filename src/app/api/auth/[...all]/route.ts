import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Better Auth handles every /api/auth/* URL (sign-up, sign-in, sign-out...).
export const { GET, POST } = toNextJsHandler(auth);
