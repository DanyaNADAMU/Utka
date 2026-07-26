import NextAuth from "next-auth"
import AuthentikProvider from "next-auth/providers/authentik"
import db from "@/lib/db"
import { addVlessUser } from "@/lib/xray"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    AuthentikProvider({
      clientId: process.env.AUTHENTIK_CLIENT_ID,
      clientSecret: process.env.AUTHENTIK_CLIENT_SECRET,
      issuer: process.env.AUTHENTIK_ISSUER,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (profile?.sub && user.email) {
        // Find or create the user in our database
        const dbUser = await db.user.upsert({
          where: { authentikId: profile.sub },
          update: { email: user.email, name: user.name || null },
          create: {
            authentikId: profile.sub,
            email: user.email,
            name: user.name || null,
          }
        });

        // Ensure user has an Xray UUID (via a default Subscription)
        let defaultSub = await db.subscription.findFirst({
          where: { userId: dbUser.id }
        });

        if (!defaultSub) {
          // Find or create a default node
          let defaultNode = await db.node.findFirst();
          if (!defaultNode) {
            defaultNode = await db.node.create({
              data: {
                name: "Main Server",
                address: process.env.XRAY_SERVER_DOMAIN || "nada.mu",
                port: 443,
                apiHost: process.env.XRAY_API_URL || "xray:7999"
              }
            });
          }

          defaultSub = await db.subscription.create({
            data: {
              name: "Default Device",
              userId: dbUser.id,
              nodeId: defaultNode.id,
            }
          });

          // Push new user to Xray!
          await addVlessUser("vless-in", user.email, defaultSub.xrayUuid);
        }
      }
      return true;
    },
    async jwt({ token, profile }) {
      if (profile) {
        token.id = profile.sub;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
})
