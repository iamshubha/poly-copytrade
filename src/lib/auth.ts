import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { SiweMessage, generateNonce as siweGenerateNonce } from "siwe";
import prisma from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Ethereum",
      credentials: {
        message: { label: "Message", type: "text" },
        signature: { label: "Signature", type: "text" },
      },
      async authorize(credentials) {
        try {
          console.log("[Auth] Starting authorization...");

          if (!credentials?.message || !credentials?.signature) {
            console.error("[Auth] Missing credentials");
            throw new Error("Missing credentials");
          }

          console.log("[Auth] Parsing message...");
          const siwe = new SiweMessage(JSON.parse(credentials.message));
          console.log("[Auth] SIWE message parsed:", {
            domain: siwe.domain,
            address: siwe.address,
            nonce: siwe.nonce,
          });

          // Verify the signature (SIWE v3 returns SiweResponse)
          console.log("[Auth] Verifying signature...");
          const result = await siwe.verify({
            signature: credentials.signature,
          });
          console.log("[Auth] Verification result:", {
            hasData: !!result.data,
            hasError: !!result.error,
            error: result.error,
          });

          // Check if verification was successful
          if (result.error) {
            console.error("[Auth] SIWE verification failed:", result.error);
            throw new Error(result.error.type || "Invalid signature");
          }

          if (!result.data) {
            console.error("[Auth] No data in verification result");
            throw new Error("Invalid signature");
          }

          console.log("[Auth] Signature verified successfully");

          // Get or create user
          console.log("[Auth] Looking up user...");
          let user = await prisma.user.findUnique({
            where: { address: siwe.address },
            include: { settings: true },
          });

          console.log("[Auth] User found:", !!user);

          // Verify nonce matches
          if (user && user.nonce !== siwe.nonce) {
            console.error("[Auth] Nonce mismatch:", {
              expected: user.nonce,
              received: siwe.nonce,
            });
            throw new Error("Invalid nonce");
          }

          if (!user) {
            // Create new user with default settings
            console.log("[Auth] Creating new user...");
            user = await prisma.user.create({
              data: {
                address: siwe.address,
                nonce: siweGenerateNonce(),
                settings: {
                  create: {
                    maxCopyPercentage: 10,
                    minTradeAmount: 1,
                    maxOpenPositions: 50,
                    autoCopyEnabled: true,
                    copyDelay: 0,
                    slippageTolerance: 0.5,
                  },
                },
              },
              include: { settings: true },
            });
            console.log("[Auth] New user created:", user.id);
          }

          console.log("[Auth] Authorization successful for:", user.address);
          return {
            id: user.id,
            address: user.address,
          };
        } catch (error) {
          console.error("[Auth] Authorization error:", error);
          if (error instanceof Error) {
            console.error("[Auth] Error message:", error.message);
            console.error("[Auth] Error stack:", error.stack);
          }
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.address = user.address;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.address = token.address as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
