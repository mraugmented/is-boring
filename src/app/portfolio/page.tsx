import Link from "next/link";
import Image from "next/image";

const projects = [
  {
    title: "Barbarian Signs",
    subtitle: "Local Business — Las Vegas, NV",
    description:
      "A custom signage company with over 40 years in the game — but zero online presence. We designed and built their first-ever website from scratch. Full branding, portfolio showcase, quote request flow, and SEO-optimized for local search.",
    tags: ["Web Design", "Branding", "Local SEO", "Lead Gen"],
    image: "/portfolio/barbarian-signs.png",
    url: "https://barbariansigns.com",
    featured: true,
  },
  {
    title: "Lenovo x Formula 1",
    subtitle: "Enterprise — Global Campaign",
    description:
      "An interactive 3D race track experience built for Lenovo's official Formula 1 technology partnership. Users explore the full circuit infrastructure with interactive data points, real-time telemetry visualization, and cinematic camera transitions.",
    tags: ["3D", "WebGL", "Interactive", "Enterprise"],
    image: "/portfolio/lenovo-f1-hero.jpg",
    featured: true,
  },
  {
    title: "Pillar World",
    subtitle: "Startup — Los Angeles, CA",
    description:
      "Full-stack AR platform — from the marketing website to the iOS app. Pillar World lets users create, collect, and explore digital art in augmented reality. 4.8 stars on the App Store with 18 ratings.",
    tags: ["iOS App", "Website", "AR", "Full Stack"],
    image: "/portfolio/pillar-website.png",
    featured: true,
  },
  {
    title: "Pillar World — App Store",
    subtitle: "iOS Application",
    description:
      "Native iOS app built with Swift and ARKit. Features include geo-located AR content, social sharing, artist profiles, and a discover feed. Designed for Gen-Z creators and collectors.",
    tags: ["iOS", "Swift", "ARKit", "App Store"],
    image: "/portfolio/pillar-app.png",
  },
  {
    title: "Lenovo F1 — Track Visualization",
    subtitle: "Interactive Data Experience",
    description:
      "A detailed 3D model of the Formula 1 circuit with annotated infrastructure points. Built with Three.js, featuring smooth camera animations, responsive design, and real-time data overlays.",
    tags: ["Three.js", "3D", "Data Viz", "Animation"],
    image: "/portfolio/lenovo-f1.png",
  },
  {
    title: "Portrade",
    subtitle: "Web3 — Digital Art",
    description:
      "A Web3 digital art platform for discovering, collecting, and trading unique digital artwork. Built with blockchain integration for verifiable ownership and seamless wallet connectivity.",
    tags: ["Web3", "Blockchain", "Digital Art", "NFT"],
    image: "/portfolio/portrade.avif",
    featured: true,
  },
  {
    title: "Lotion",
    subtitle: "Fintech — Cryptocurrency",
    description:
      "An AI-powered cryptocurrency platform that combines real-time market intelligence with automated trading insights. Clean interface designed to make crypto accessible to everyday investors.",
    tags: ["AI", "Crypto", "Fintech", "Dashboard"],
    image: "/portfolio/lotion.avif",
    featured: true,
  },
];

export default function PortfolioPage() {
  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-6 sm:px-12 max-w-7xl mx-auto">
        <Link href="/" className="text-sm font-medium tracking-tight text-white/60 font-mono">
          is-boring<span className="text-purple-400/80">.</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-sm text-white/30 hover:text-white/60 transition-colors font-mono"
          >
            Home
          </Link>
          <Link
            href="/portal/login"
            className="text-sm text-white/30 hover:text-white/60 transition-colors font-mono"
          >
            Client Portal
          </Link>
        </div>
      </nav>

      {/* Header */}
      <header className="px-6 sm:px-12 pt-16 sm:pt-24 pb-16 sm:pb-20 max-w-7xl mx-auto">
        <p className="text-xs font-mono text-purple-400/60 tracking-widest uppercase mb-4 animate-fade-up">
          Portfolio
        </p>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white/90 leading-[1.05] mb-6 animate-fade-up-delay-1">
          Work that speaks<br />
          <span className="gradient-text">for itself.</span>
        </h1>
        <p className="text-white/30 text-base sm:text-lg max-w-xl leading-relaxed animate-fade-up-delay-2">
          From local businesses launching their first site to enterprise 3D
          experiences — we ship work that moves the needle.
        </p>
      </header>

      {/* Projects */}
      <section className="px-6 sm:px-12 pb-32 max-w-7xl mx-auto">
        <div className="space-y-8">
          {projects.map((project, i) => (
            <article
              key={project.title}
              className={`group rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-white/[0.1] transition-all duration-500 ${
                project.featured ? "md:grid md:grid-cols-2" : ""
              }`}
            >
              {/* Image */}
              <div
                className={`overflow-hidden ${
                  project.featured
                    ? "aspect-[16/10] md:aspect-auto"
                    : "aspect-[21/9]"
                }`}
              >
                <Image
                  src={project.image}
                  alt={project.title}
                  width={1200}
                  height={750}
                  className={`w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ${
                    project.featured ? "object-top" : "object-center"
                  }`}
                  priority={i < 2}
                />
              </div>

              {/* Content */}
              <div
                className={`p-6 sm:p-8 flex flex-col justify-center ${
                  project.featured ? "md:p-10 lg:p-14" : ""
                }`}
              >
                <div className="mb-4">
                  <p className="text-[11px] font-mono text-purple-400/50 tracking-wider uppercase mb-2">
                    {project.subtitle}
                  </p>
                  <h2
                    className={`font-bold text-white/90 leading-tight ${
                      project.featured
                        ? "text-2xl sm:text-3xl"
                        : "text-xl"
                    }`}
                  >
                    {project.title}
                  </h2>
                </div>

                <p
                  className={`text-white/30 leading-relaxed mb-6 ${
                    project.featured
                      ? "text-sm sm:text-base"
                      : "text-sm"
                  }`}
                >
                  {project.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-mono text-white/20 px-3 py-1 rounded-full border border-white/[0.06] bg-white/[0.02]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {project.url && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-mono text-purple-400/70 hover:text-purple-400 transition-colors w-fit"
                  >
                    <span>View live site</span>
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 sm:px-12 pb-32 max-w-3xl mx-auto text-center">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 sm:p-14">
          <h3 className="text-2xl sm:text-3xl font-bold text-white/90 mb-3">
            Want to be next?
          </h3>
          <p className="text-white/30 text-sm sm:text-base mb-8 max-w-md mx-auto">
            We&apos;ll build you a free prototype — no strings attached.
            If you love it, we talk next steps. If not, no hard feelings.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
          >
            Get started
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 sm:px-12 py-8 flex items-center justify-center border-t border-white/[0.04]">
        <span className="text-xs text-white/15 font-mono">
          &copy; 2026 is-boring
        </span>
      </footer>
    </div>
  );
}
