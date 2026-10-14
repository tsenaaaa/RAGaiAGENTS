import ChatInterface from "@/components/ChatInterface";

export default function Home() {
  return (
    <main className="relative flex h-[100dvh] flex-col overflow-hidden bg-white text-gray-800">
      {/* Abstract Background Orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-gradient-glow animate-float opacity-70 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[35vw] h-[35vw] rounded-full bg-gradient-glow animate-float opacity-60 pointer-events-none" style={{ animationDelay: '2s' }} />

      {/* Header */}
      <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-soft-light/30 px-8 py-5 glass-panel">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-iconic shadow-iconic flex items-center justify-center text-white rotate-3 hover:rotate-0 transition-transform duration-300">
            {/* Iconic abstract logo instead of robot emoji */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-soft-dark to-soft">SmartOps</h1>
            <p className="text-xs font-bold text-soft-dark/60 tracking-widest uppercase">Nexus Intelligence</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-ice-light border border-ice-dark text-xs font-semibold text-soft-dark shadow-sm">
          <span className="w-2 h-2 rounded-full bg-soft animate-pulse"></span>
          System Online
        </div>
      </header>

      {/* Chat Area */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col border-x border-white/50 bg-white/60 shadow-[0_0_50px_-12px_rgba(114,196,238,0.15)] backdrop-blur-md">
          <ChatInterface />
        </div>
      </div>
    </main>
  );
}
