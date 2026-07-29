import { auth } from "@/auth"
import { getDictionary } from "@/i18n/dictionaries"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import KumaStatus from "@/components/KumaStatus"
import Link from "next/link"

export default async function LandingPage() {
  const session = await auth()
  const dict = await getDictionary()

  const services = [
    {
      title: "🎥 Jitsi Meet",
      descKey: "desc_jitsi",
      url: "https://vox.nada.mu"
    },
    {
      title: "💬 Rocket.Chat",
      descKey: "desc_rocket",
      url: "https://chat.nada.mu"
    },
    {
      title: "☁️ Seafile",
      descKey: "desc_seafile",
      url: "https://sea.nada.mu"
    },
    {
      title: "🔐 Vaultwarden",
      descKey: "desc_vault",
      url: "https://vault.nada.mu"
    },
    {
      title: "🤫 Yopass",
      descKey: "desc_yopass",
      url: "https://keys.nada.mu"
    },
    {
      title: "✉️ Poste.io",
      descKey: "desc_poste",
      url: "https://mail.nada.mu"
    },
    {
      title: "⛏️ Minecraft Server",
      descKey: "desc_mc",
      url: "nada.mu",
      isCopy: true
    },
    {
      title: "🎧 Mumble",
      descKey: "desc_mumble",
      url: "nada.mu",
      isCopy: true
    }
  ]

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-50 selection:bg-sky-500/30">
      <div className="max-w-6xl mx-auto px-6 py-16 relative">
        
        {/* Top Right Controls */}
        <div className="absolute top-6 right-6 flex items-center gap-4">
          <LanguageSwitcher />
          {session?.user ? (
            <Link 
              href="/dash" 
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 transition-colors border border-sky-500/30 shadow-[0_0_15px_rgba(56,189,248,0.1)]"
            >
              {dict.landing.dashboard}
            </Link>
          ) : (
            <Link 
              href="/api/auth/signin" 
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
            >
              {dict.landing.login}
            </Link>
          )}
        </div>

        {/* Header */}
        <header className="text-center mb-16 pt-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight">
            nada<span className="text-sky-400">.mu</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-8">
            {dict.landing.subtitle}
          </p>
          <KumaStatus dict={dict.landing} />
        </header>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, idx) => (
            <div 
              key={idx} 
              className="group bg-[#1e293b] p-8 rounded-2xl border border-slate-700 hover:border-sky-400 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 flex flex-col h-full hover:-translate-y-1"
            >
              <h3 className="text-xl font-semibold mb-4 text-slate-100 group-hover:text-sky-400 transition-colors">
                {service.title}
              </h3>
              <p className="text-slate-400 mb-8 flex-grow leading-relaxed">
                {(dict.landing as any)[service.descKey]}
              </p>
              
              {service.isCopy ? (
                <div className="relative">
                  <div className="text-sm font-mono text-sky-400 bg-sky-400/10 hover:bg-sky-400/20 px-4 py-2.5 rounded-xl border border-transparent hover:border-sky-400/30 transition-all cursor-pointer inline-flex items-center gap-2 select-all">
                    📋 {service.url}
                  </div>
                </div>
              ) : (
                <a 
                  href={service.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm font-mono text-sky-400 bg-sky-400/10 hover:bg-sky-400/20 px-4 py-2.5 rounded-xl border border-transparent hover:border-sky-400/30 transition-all inline-flex items-center gap-2 self-start"
                >
                  {service.url.replace('https://', '')} <span className="text-lg leading-none">↗</span>
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="text-center mt-24 pt-8 border-t border-slate-800 text-slate-500 text-sm">
          {dict.landing.footer}
        </footer>
        
      </div>
    </div>
  )
}
