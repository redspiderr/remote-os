import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import PostgresAdapter from "@auth/pg-adapter";
import { Pool } from "pg";
import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { logSecurityEvent } from "@/lib/security-logger";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const credentialsSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const authConfig: NextAuthConfig = {
  adapter: PostgresAdapter(pool),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
    error: "/",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // allowDangerousEmailAccountLinking: true, // SECURITY: Disabled — manual account linking required
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const forwarded = req?.headers?.['x-forwarded-for'];
        const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0] : req?.headers?.['x-real-ip']) ?? '127.0.0.1';
        const userAgent = req?.headers?.['user-agent'] ?? null;
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          await logSecurityEvent({
            eventType: 'login_failure',
            severity: 'warning',
            email: (credentials?.email as string) ?? null,
            ip: typeof ip === 'string' ? ip : null,
            userAgent: typeof userAgent === 'string' ? userAgent : null,
            details: { reason: 'validation_failed', issues: parsed.error.issues.map((i) => i.message) },
          });
          throw new Error(parsed.error.issues.map((e) => e.message).join(" "));
        }

        const { email, password } = parsed.data;

        const client = await pool.connect();
        try {
          const result = await client.query(
            "SELECT id, email, name, avatar_url, password_hash FROM users WHERE email = $1",
            [email]
          );
          const user = result.rows[0];
          if (!user || !user.password_hash) {
            await logSecurityEvent({
              eventType: 'login_failure',
              severity: 'warning',
              email,
              ip: typeof ip === 'string' ? ip : null,
              userAgent: typeof userAgent === 'string' ? userAgent : null,
              details: { reason: 'invalid_credentials', step: 'user_not_found' },
            });
            throw new Error("Invalid email or password");
          }

          const valid = await bcrypt.compare(password, user.password_hash);
          if (!valid) {
            await logSecurityEvent({
              eventType: 'login_failure',
              severity: 'warning',
              email,
              userId: user.id,
              ip: typeof ip === 'string' ? ip : null,
              userAgent: typeof userAgent === 'string' ? userAgent : null,
              details: { reason: 'invalid_credentials', step: 'password_mismatch' },
            });
            throw new Error("Invalid email or password");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.avatar_url,
          };
        } finally {
          client.release();
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image ?? (user as any).avatar_url ?? null;
      }
      if (account?.provider === "google") {
        token.provider = "google";
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = (token.picture as string | null) ?? null;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      await logSecurityEvent({
        eventType: 'login_success',
        severity: 'info',
        userId: user.id ?? null,
        email: user.email ?? null,
        details: { provider: account?.provider ?? 'credentials', isNewUser: isNewUser ?? false },
      });
      if (isNewUser && account?.provider === "google" && user.email) {
        const client = await pool.connect();
        try {
          await client.query(
            `UPDATE users SET email_verified = NOW(), updated_at = NOW() WHERE email = $1`,
            [user.email]
          );
        } finally {
          client.release();
        }
      }
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
