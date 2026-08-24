import type { NextAuthConfig } from "next-auth";

const allowedEmails = new Set(
  (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

export default {
  providers: [],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      return allowedEmails.has(user.email.toLowerCase());
    },
  },
} satisfies NextAuthConfig;
