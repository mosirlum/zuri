import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

const useSecureCookies = process.env.NODE_ENV === "production";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

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
            SELECT id, email, password, full_name, role, is_active,
                   failed_attempts, locked_until
            FROM users
            WHERE email = ${credentials.email as string}
            LIMIT 1
          `;

          const user = rows[0];

          // Same "no such user" response whether the account doesn't exist,
          // is deactivated, or is locked — nothing here should tell an
          // attacker which of the three they've hit.
          if (!user) return null;
          if (!user.is_active) return null;

          if (user.locked_until && new Date(user.locked_until) > new Date()) {
            return null;
          }

          const passwordMatch = await bcrypt.compare(
            credentials.password as string,
            user.password as string
          );

          if (!passwordMatch) {
            const attempts = (user.failed_attempts || 0) + 1;
            const lockNow = attempts >= MAX_ATTEMPTS;
            // Computed here rather than with SQL's NOW() + interval, since the
            // tagged-template client doesn't support nesting one sql`` call
            // inside another.
            const lockUntil = lockNow ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null;

            await sql`
              UPDATE users SET
                failed_attempts = ${lockNow ? 0 : attempts},
                locked_until = ${lockUntil}
              WHERE id = ${user.id}
            `;

            return null;
          }

          // A correct password clears any count that had been building up.
          if (user.failed_attempts > 0 || user.locked_until) {
            await sql`
              UPDATE users SET failed_attempts = 0, locked_until = NULL
              WHERE id = ${user.id}
            `;
          }

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
