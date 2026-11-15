import NextAuth from "next-auth"
import AuthentikProvider from "next-auth/providers/authentik"
import db from "@/lib/db"
import { addVlessUser, getClientInboundTags } from "@/lib/xray"
import crypto from "crypto"

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
        const userCount = await db.user.count();
        let role = "USER";
        if (userCount === 0) {
          role = "ADMIN";
        }

        // Find or create the user in our database
        let dbUser = await db.user.upsert({
          where: { authentikId: profile.sub },
          update: { email: user.email, name: user.name || null },
          create: {
            authentikId: profile.sub,
            email: user.email,
            name: user.name || null,
            role: role
          }
        });

        // Upgrade existing sole user to ADMIN for convenience during early setup
        if (userCount === 1 && dbUser.role === 'USER') {
          dbUser = await db.user.update({
            where: { id: dbUser.id },
            data: { role: "ADMIN" }
          });
        }

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
                apiHost: process.env.XRAY_API_URL || "unix:///app/xray/api.sock"
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

          // Push new user to Xray inbounds (Admins get all nodes; regular users get client inbounds: Frankfurt & Moscow)
          const activeInboundTags = await getClientInboundTags();
          const activeNodes = await db.node.findMany({ where: { isActive: true } });
          const isAdmin = dbUser.role === 'ADMIN';
          const defaultClientTags = ['vless-frankfurt', 'vless-in'];
          
          for (const node of activeNodes) {
            for (const tag of activeInboundTags) {
              if (!isAdmin && (!node.isMaster || !defaultClientTags.includes(tag))) {
                continue;
              }
              const newUuid = crypto.randomUUID();
              await db.subscriptionInbound.create({
                data: {
                  subscriptionId: defaultSub.id,
                  nodeId: node.id,
                  inboundTag: tag,
                  xrayUuid: newUuid
                }
              });
              await db.uuidHistory.create({
                data: {
                  subscriptionId: defaultSub.id,
                  nodeId: node.id,
                  inboundTag: tag,
                  xrayUuid: newUuid
                }
              });
              await addVlessUser(node.apiHost, tag, `${defaultSub.id}_${tag}_${newUuid}`, newUuid);
            }
          }
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
        
        // Fetch role from DB
        const dbUser = await db.user.findUnique({
          where: { authentikId: session.user.id },
          select: { role: true }
        });
        
        if (dbUser) {
          (session.user as any).role = dbUser.role;
        }
      }
      return session;
    },
  },
})
