import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

const useSecureCookies = process.env.NODE_ENV === "production";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const rows = await sql`
            SELECT id, email, password, full_name, role, is_active
            FROM users
            WHERE email = ${credentials.email as string}
            LIMIT 1
          `;

          const user = rows[0];

          if (!user) return null;
          if (!user.is_active) return null;

          const passwordMatch = await bcrypt.compare(
            credentials.password as string,
            user.password as string
          );

          if (!passwordMatch) return null;

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.full_name,
            role: user.role,
          };
        } catch (err) {
          console.error("Auth error:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    // Chrome restores session cookies when it reopens, so relying on the
    // browser closing isn't enough on a shared office machine. An idle window
    // is what actually protects the account: the session refreshes while
    // someone is working and expires an hour after they stop.
    maxAge: 60 * 60,
    updateAge: 5 * 60,
  },
  cookies: {
    sessionToken: {
      name: `${useSecureCookies ? "__Secure-" : ""}authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
        // No maxAge — browsers that honour session cookies will drop this on
        // close. The idle window above is what guarantees it everywhere else.
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
