"use client";
import { createAuthClient } from "better-auth/react";

// Browser-side helper: authClient.signIn.email(...), authClient.signUp.email(...), authClient.signOut()
export const authClient = createAuthClient();
