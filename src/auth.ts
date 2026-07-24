import NextAuth from "next-auth"
import AuthentikProvider from "next-auth/providers/authentik"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    AuthentikProvider({
      clientId: process.env.AUTHENTIK_CLIENT_ID,
      clientSecret: process.env.AUTHENTIK_CLIENT_SECRET,
      issuer: process.env.AUTHENTIK_ISSUER,
    }),
  ],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        token.id = profile.sub;
        // token.groups = profile.groups; // If you expose groups in Authentik property mappings
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
