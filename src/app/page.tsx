import Link from "next/link";
import Image from "next/image";
import SceneLoader from "@/components/SceneLoader";
import ContactForm from "@/components/ContactForm";

const featured = [
  {
    title: "Barbarian Signs",
    description: "First website for a 40-year sign company.",
    image: "/portfolio/barbarian-signs.png",
    url: "https://barbarian-signs.vercel.app",
  },
  {
    title: "Lenovo x Formula 1",
    description: "Interactive 3D experience for Lenovo's F1 partnership.",
    image: "/portfolio/lenovo-f1-hero.jpg",
  },
  {
    title: "Pillar World",
    description: "AR platform — app and website. 4.8 stars.",
    image: "/portfolio/pillar-website.png",
  },
];

export default function Home() {
  return (
    <>
      <SceneLoader />

      <div className="relative flex flex-col" style={{ zIndex: 1 }}>
        {/* Nav */}
        <nav className="flex items-center justify-between px-6 py-6 sm:px-12">
          <div className="animate-fade-up">
            <Link href="/" className="text-sm font-medium tracking-tight text-white/60 font-mono">
              is-boring<span className="text-purple-400/80">.</span>
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/portfolio"
              className="animate-fade-up text-sm text-white/30 hover:text-white/60 transition-colors font-mono"
            >
              Work
            </Link>
            <Link
              href="/portal/login"
              className="animate-fade-up text-sm text-white/30 hover:text-white/60 transition-colors font-mono"
            >
              Client Portal
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <h1 className="animate-fade-up-delay-2 text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight max-w-5xl">
            <span className="text-white/90">We do the </span>
            <span className="gradient-text">boring</span>
          </h1>

          <p className="animate-fade-up-delay-3 mt-6 sm:mt-8 text-base sm:text-lg md:text-xl text-white/30 max-w-md leading-relaxed">
            So you can keep on growing.
          </p>

          <ContactForm />
        </main>

        {/* Featured Work */}
        <section className="px-6 sm:px-12 py-24 sm:py-32">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-14">
              <div>
                <p className="text-xs font-mono text-purple-400/60 tracking-widest uppercase mb-3">
                  Selected Work
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold text-white/90">
                  We build things that <span className="gradient-text">work</span>.
                </h2>
              </div>
              <Link
                href="/portfolio"
                className="hidden sm:inline-flex text-sm font-mono text-white/30 hover:text-white/60 transition-colors"
              >
                View all &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {featured.map((project) => (
                <Link
                  key={project.title}
                  href="/portfolio"
                  className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-white/[0.12] transition-all duration-500"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <Image
                      src={project.image}
                      alt={project.title}
                      width={600}
                      height={450}
                      className="w-full h-full object-cover object-top group-hover:scale-[1.04] transition-transform duration-700"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="text-sm font-semibold text-white/90 mb-1">{project.title}</h3>
                    <p className="text-xs text-white/30">{project.description}</p>
                  </div>
                </Link>
              ))}
            </div>

            <Link
              href="/portfolio"
              className="sm:hidden mt-8 block text-center text-sm font-mono text-white/30 hover:text-white/60 transition-colors"
            >
              View all work &rarr;
            </Link>
          </div>
        </section>

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
