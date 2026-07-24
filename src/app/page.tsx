import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Copy, QrCode, LogOut, ShieldCheck, Activity } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default async function Dashboard() {
  const session = await auth();
  
  if (!session?.user) {
    // This shouldn't normally be reached due to middleware
    return <div>Not authenticated</div>;
  }

  // Placeholder Xray link for the frontend mockup
  const xrayLink = "vless://placeholder-uuid-1234-5678-90ab@server.domain.com:443?security=tls&encryption=none&headerType=none&type=tcp#NadamuVPN";

  return (
    <div className="min-h-screen p-6 md:p-12 lg:p-24 max-w-6xl mx-auto flex flex-col gap-8">
      <header className="flex justify-between items-center pb-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-2 rounded-xl">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">NadamuDash</h1>
            <p className="text-sm text-muted-foreground">Secure Xray Access</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium">{session.user.name || session.user.email}</p>
            <p className="text-xs text-muted-foreground">Active Status</p>
          </div>
          <form action={async () => {
            "use server";
            await signOut();
          }}>
            <Button variant="ghost" size="icon" type="submit">
              <LogOut className="w-5 h-5" />
            </Button>
          </form>
        </div>
      </header>

      <main className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-card/50 backdrop-blur border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Your Connection</CardTitle>
            <CardDescription>Use this link to connect your devices to the network.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-background/80 p-4 rounded-lg font-mono text-xs break-all border border-border/50 text-muted-foreground selection:bg-primary/30">
              {xrayLink}
            </div>
            
            <div className="flex flex-wrap gap-4">
              <Button className="gap-2">
                <Copy className="w-4 h-4" />
                Copy Link
              </Button>
              
              <Dialog>
                <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 gap-2">
                    <QrCode className="w-4 h-4" />
                    Show QR Code
                </DialogTrigger>
                <DialogContent className="sm:max-w-md border-border/50 bg-card/95 backdrop-blur">
                  <DialogHeader>
                    <DialogTitle>Connection QR Code</DialogTitle>
                    <DialogDescription>
                      Scan this code with your Xray client (v2rayNG, Shadowrocket, NekoBox).
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex items-center justify-center p-6 bg-white rounded-xl mt-2">
                    <QRCodeSVG value={xrayLink} size={256} />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-card/50 backdrop-blur border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-500" />
                Server Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium">Frankfurt, DE</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Protocol</span>
                  <span className="font-medium">VLESS XTLS</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Data Usage</span>
                  <span className="font-medium">0 GB / Unlimited</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
