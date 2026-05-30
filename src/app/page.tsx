import Link from "next/link";
import Image from "next/image";
import SceneLoader from "@/components/SceneLoader";
import ContactForm from "@/components/ContactForm";

const projects = [
  {
    title: "Barbarian Signs",
    description: "Custom signage company — 40+ years in business. First website ever.",
    tags: ["Web Design", "Local Business"],
    image: "/portfolio/barbarian-signs.png",
    url: "https://barbarian-signs.vercel.app",
  },
  {
    title: "Lenovo x Formula 1",
    description: "Interactive 3D race track experience for Lenovo's F1 partnership.",
    tags: ["3D", "Interactive", "Enterprise"],
    image: "/portfolio/lenovo-f1-hero.jpg",
  },
  {
    title: "Pillar World",
    description: "AR platform — app and marketing site. 4.8 stars on the App Store.",
    tags: ["Mobile App", "Website", "AR"],
    image: "/portfolio/pillar-website.png",
  },
  {
    title: "Pillar World App",
    description: "iOS app bringing digital art to life through augmented reality.",
    tags: ["iOS", "AR", "App Store"],
    image: "/portfolio/pillar-app.png",
  },
  {
    title: "Lenovo F1 Track",
    description: "3D interactive data visualization of the F1 circuit infrastructure.",
    tags: ["3D", "Data Viz", "WebGL"],
    image: "/portfolio/lenovo-f1.png",
  },
  {
    title: "Chrome Coffee Studio",
    description: "Modern dark-mode site for a Torrance coffee shop. Gen-Z aesthetic.",
    tags: ["Web Design", "Local Business"],
    image: "/portfolio/chrome-coffee.png",
    url: "https://chrome-coffee.vercel.app",
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
            <span className="text-sm font-medium tracking-tight text-white/60 font-mono">
              is-boring<span className="text-purple-400/80">.</span>
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="#work"
              className="animate-fade-up text-sm text-white/30 hover:text-white/60 transition-colors font-mono"
            >
              Work
            </a>
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

        {/* Portfolio */}
        <section id="work" className="px-6 sm:px-12 py-24 sm:py-32">
          <div className="max-w-6xl mx-auto">
            <p className="text-xs font-mono text-white/30 tracking-widest uppercase mb-3">
              Selected Work
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white/90 mb-4">
              We build things that <span className="gradient-text">work</span>.
            </h2>
            <p className="text-white/30 text-sm sm:text-base max-w-lg mb-16">
              From local businesses getting their first website to enterprise 3D experiences — here&apos;s some of what we&apos;ve shipped.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {projects.map((project) => (
                <div
                  key={project.title}
                  className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-white/[0.12] transition-all duration-500"
                >
                  <div className="aspect-[16/10] overflow-hidden">
                    <Image
                      src={project.image}
                      alt={project.title}
                      width={800}
                      height={500}
                      className="w-full h-full object-cover object-top group-hover:scale-[1.03] transition-transform duration-700"
                    />
                  </div>
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="text-lg font-semibold text-white/90">{project.title}</h3>
                      {project.url && (
                        <a
                          href={project.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-xs font-mono text-purple-400/70 hover:text-purple-400 transition-colors"
                        >
                          View &rarr;
                        </a>
                      )}
                    </div>
                    <p className="text-sm text-white/30 mb-4">{project.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {project.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] font-mono text-white/25 px-2.5 py-1 rounded-full border border-white/[0.06]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
