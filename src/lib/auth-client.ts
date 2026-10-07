"use client";
import { createAuthClient } from "better-auth/react";

// Browser-side helper: authClient.signIn.social(...), authClient.signOut()
export const authClient = createAuthClient();
