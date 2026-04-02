import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.trim().toLowerCase();
      if (!email) return false;

      const existing = await prisma.user.findUnique({
        where: { email },
        select: { isBanned: true },
      });
      if (existing?.isBanned) return false;
      return true;
    },
    async jwt({ token }) {
      if (typeof token.email === "string") {
        token.email = token.email.trim().toLowerCase();
      }
      return token;
    },
  },
});
