import Link from "next/link";
import SceneLoader from "@/components/SceneLoader";
import ContactForm from "@/components/ContactForm";

export default function Home() {
  return (
    <>
      <SceneLoader />

      <div className="relative min-h-screen flex flex-col" style={{ zIndex: 1 }}>
        {/* Nav */}
        <nav className="flex items-center justify-between px-6 py-6 sm:px-12">
          <div className="animate-fade-up">
            <span className="text-sm font-medium tracking-tight text-white/60 font-mono">
              is-boring<span className="text-purple-400/80">.</span>
            </span>
          </div>
          <Link
            href="/portal/login"
            className="animate-fade-up text-sm text-white/30 hover:text-white/60 transition-colors font-mono"
          >
            Client Portal
          </Link>
        </nav>

        {/* Hero */}
        <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <h1 className="animate-fade-up-delay-2 text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight max-w-5xl">
            <span className="text-white/90">We do the </span>
            <span className="gradient-text">boring</span>
          </h1>

          <p className="animate-fade-up-delay-3 mt-6 sm:mt-8 text-base sm:text-lg md:text-xl text-white/30 max-w-md leading-relaxed">
            So you can keep on growing.
          </p>

          <ContactForm />
        </main>

        {/* Footer */}
        <footer className="px-6 sm:px-12 py-8 flex items-center justify-center">
          <span className="text-xs text-white/15 font-mono">
            &copy; 2026 is-boring
          </span>
        </footer>
      </div>
    </>
  );
}
