// src/App.jsx (cleaned)
import React, { useState, useEffect, useRef } from "react";
import myPhoto from "./assets/JoseP.jpg"; // usar ruta relativa
import {
  ArrowUpRight, Linkedin, Mail, X as XIcon,
  BookOpen, Briefcase, FilePenLine, Instagram
} from "lucide-react";

// Perfil y datos (mismo contenido)
const profile = {
  name: "José M Hernández",
  tagline: "Customer Success & Operations Specialist",
  blurb: (
    <>
      <p>
        I understand what it means to struggle, adapt, and help keep a business alive. Being in the trenches with teams has taught me to consistently go beyond expectations, building systems from the ground up, solving complex challenges, and ensuring progress even when circumstances are tough. For me, listening to customers is not just a step in the process—it’s the foundation for designing products and strategies that deliver lasting impact through exceptional service and execution.
      </p>
      <br/>
      <p>
        Throughout my career, I’ve made it a priority to take initiative, identifying opportunities, improving operations, and making sure every effort means something for me and for the people I work with. I consider myself a problem solver at heart.
      </p>
      <br/>
      <p>
        Outside of work, I spend my days reading, writing, and enjoying life as a proud older brother.
      </p>
    </>
  ),
  location: "Mexico City, MX",
  social: {
    linkedin: "https://www.linkedin.com/in/miguelhramirez/",
    instagram: "https://www.instagram.com/jose_renacer/",
    x: "https://x.com/riverside_jose",
    email: "mailto:jose24_hr@outlook.com",
    github: "https://github.com/",
    website: "https://yourdomain.com",
  },
};

const experience = [
  {
    period: "2023 – Present",
    company: "Tata Consultancy Services",
    role: "Operations & Customer Support (Life Insurance Industry)",
    link: "https://www.tcs.com/",
    bullets: [
      "1,700+ monthly legal/financial cases resolved under strict SLAs.", 
      "Proposed UX-based training platform, cutting ramp time 25% and saving ~$150K/yr.",
      "Standardized documentation, reducing errors and speeding team handoffs.",
    ],
  },
  {
    period: "2022 – 2024",
    company: "Manahui (Startup)",
    role: "Strategic Operations Lead (AgTech Industry)",
    link: "https://queretarodeverdad.mx/combaten-el-desperdicio-de-alimentos-con-manahui-universitarios-uaq/",
    bullets: [
      "Aligned product with market needs using data and customer insights.",
      "Coordinated timelines, resource allocation, and workflows for a 10-person team.",
      "Led go-to-market strategy for AgTech coating from R&D to launch.",
      "Managed stakeholders, supplier onboarding within logistical and operational processes."
    ],
  },
  {
    period: "2014 – 2021",
    company: "Customer Facing & Operational Roles",
    link: "https://www.linkedin.com/feed/update/urn:li:activity:7328604134473961472/",
    bullets: [
      "While balancing work and studies, learned to take ownership, lead teams with accountability, and stay organized while giving the extra effort to get things done.",
    ]
  }
];

const projects = [
  {
    year: "2025",
    title: "Controlled Environment Training Program — TATA Consultancy Services",
    link: "",
    body: (
      <>
        <p>
          Identified a client need to reduce training costs and improve
          operational efficiency. Designed a UX-focused training framework that,
          in its first phase, reduced ramp time by 25% and projected ~$150K in
          annual savings, with plans to scale across 7 phases.
        </p>
        <br/>
        <p>
          Developed as part of the Google Project Management Certificate,
          applying structured risk planning, strategic improvement initiatives,
          and resource planning.
        </p>
      </>
    ),
  },
  {
    year: "2024",
    title: "Smart Water Recirculator — ATLAS Home Solutions",
    link: "#",
    body:
      "Engaged directly with clients to gather market feedback and align deliverables with viable technology capabilities. Designed the user experience and operational framework to ensure the system met customer expectations and technical feasibility.",
  },
];

const awards = [
  { year: "2025", title: "Should I Use AI?", link: "#" },
  { year: "2025", title: "On Identity", link: "#" },
  { year: "2024", title: "Noise In the Age of Silence", link: "#" },
];

/* ── Switch animado con perilla ───────────────────────────────────────────── */
function ThemeToggle({ checked, onToggle, className = "" }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onToggle}
      aria-label="Toggle theme"
      className={
        "relative inline-flex items-center rounded-full border border-neutral-300 " +
        "dark:border-neutral-700 px-1 transition-colors duration-300 " +
        "bg-white/80 dark:bg-neutral-900/80 backdrop-blur " + className
      }
      style={{ width: 64, height: 32 }}
    >
      {/* sol (claro) */}
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor"
           viewBox="0 0 24 24"
           className={`absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 ${checked ? "opacity-40" : "opacity-100"} text-yellow-500`}>
        <path strokeWidth="2" d="M12 3v2m0 14v2m8-8h-2M6 12H4m12.728 6.728-1.414-1.414M7.05 7.05 5.636 5.636m12.728 0-1.414 1.414M7.05 16.95l-1.414 1.414M12 8a4 4 0 100 8 4 4 0 000-8z"/>
      </svg>

      {/* luna (oscuro) */}
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor"
           viewBox="0 0 24 24"
           className={`absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 ${checked ? "opacity-100" : "opacity-40"} text-blue-400`}>
        <path strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
      </svg>

      {/* perilla */}
      <span
  className={`absolute top-1/2 -translate-y-1/2 left-1 h-6 w-6 rounded-full 
              bg-transparent ring-1 ring-neutral-300 dark:ring-neutral-600 backdrop-blur-sm 
              transition-transform duration-300 ${checked ? "translate-x-8" : "translate-x-0"}`}
>
  <span className="sr-only">Theme knob</span>
</span>
    </button>
  );
}

/* ── Página principal (antes llamada Portfolio). Export único. ───────────── */
export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  });
  const [mounted, setMounted] = useState(false);
  const [inHero, setInHero] = useState(true);

  // usa SIEMPRE este ref
  const heroRef = useRef(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // observar el HERO
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInHero(entry.isIntersecting),
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);


  return ( 
    <main className="min-h-screen bg-white text-neutral-900 antialiased dark:bg-[#0F1720] dark:text-neutral-100">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
  <nav className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
            {/* Brand (solo visible cuando el hero no está a la vista) */}
            <div className="w-[260px]">
              <a
                href="#home"
                className={`block font-semibold whitespace-nowrap transition-opacity duration-300 ${mounted && !inHero ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                aria-hidden={mounted && !inHero ? "false" : "true"}
              >
                {profile.name}
              </a>
            </div>

            <ul className="hidden md:flex gap-6 text-sm">
              <li><a href="#experience" className="hover:opacity-75">Experience</a></li>
              <li><a href="#projects" className="hover:opacity-75">Projects</a></li>
              <li><a href="#awards" className="hover:opacity-75">Awards</a></li>
              <li><a href="#contact" className="hover:opacity-75">Contact</a></li>
            </ul>

            <div className="flex items-center gap-3">
              <a
                href={profile.social.email}
                aria-label="Email"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                <Mail className="h-4 w-4" />
              </a>
              <a href={profile.social.linkedin} aria-label="LinkedIn" className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900"><Linkedin className="h-4 w-4" /></a>
              <a href={profile.social.instagram} aria-label="Instagram" className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900"><Instagram className="h-4 w-4" /></a>
              <a href={profile.social.x} aria-label="X" className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900"><XIcon className="h-4 w-4" /></a>

              {/* Switch en header (solo cuando el hero NO está visible) */}
              <div className="w-[64px] h-8 relative">
                <div
          className={`transition-opacity duration-200 ${
            mounted && !inHero ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          aria-hidden={mounted && !inHero ? "false" : "true"}
        >
                  <ThemeToggle checked={darkMode} onToggle={() => setDarkMode(v => !v)} />
            </div>
              </div>
              </div>
          </nav>
        </header>
       <div className="fixed bottom-3 right-3 h-4 w-4 rounded-full bg-red-500 dark:bg-green-500 z-[9999]" />
 

        {/* Sentinela y toggle izquierdo cuando el hero está visible */}
        <div ref={heroRef} className="h-0" />
       {/* elimina el viejo <div ref={heroRef} ... /> */}

{inHero && (
  <div className="fixed bottom-4 left-4 z-50" aria-label="Theme toggle floating">
    <ThemeToggle checked={darkMode} onToggle={() => setDarkMode(v => !v)} />
  </div>
)}


        {/* HERO */}
        <section id="home" ref={heroRef}  className="mx-auto max-w-4xl px-4 pt-6 md:pt-10">
          <div className="mx-auto max-w-[52rem] md:pl-5">
            <div className="grid grid-cols-[auto,1fr] items-center gap-4">
              <a href={profile.social.linkedin} target="_blank" rel="noopener noreferrer" aria-label="Open LinkedIn profile" className="inline-block">
                <img
                  src={myPhoto}
                  alt={profile.name}
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover cursor-pointer transition-transform duration-300 ease-out hover:scale-105 focus:scale-105 hover:shadow-md hover:ring-2 hover:ring-neutral-300 dark:hover:ring-neutral-700 will-change-transform"
                />
              </a>
              <div>
                <h1 className="text-base md:text-xl font-bold tracking-wider leading-tight">{profile.name}</h1>
                <p className="mt-1.5 text-md text-neutral-600 dark:text-neutral-400">{profile.tagline}</p>
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div className="mt-20 mx-auto max-w-[52rem] px-5 md:px-3 text-neutral-700 dark:text-neutral-300">
            {profile.blurb}
          </div>
        </section>

        {/* EXPERIENCE */}
        <section id="experience" className="mx-auto max-w-[52rem] px-5 md:px-3 mt-20">
<h2 className="text-xl font-semibold flex items-center gap-2">
  <Briefcase className="h-5 w-5" />
  Experience
</h2>          <div className="mt-6 space-y-12">
            {experience.map((job, i) => (
              <div key={i} className="grid grid-cols-[7.5rem_1fr] gap-x-4">
                <div className="pt-1 text-sm text-neutral-500 dark:text-neutral-400">{job.period}</div>
                <div className="relative border-l border-neutral-300 dark:border-neutral-700 -ml-4 pl-4 md:-ml-6 md:pl-6">
                  <span className="absolute -left-1.5 top-2 h-2.5 w-2.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
                  <h3 className="text-lg font-semibold flex items-center gap-2">{job.company}<a className="inline-flex" href={job.link}><ArrowUpRight className="h-4 w-4" /></a></h3>
                  {job.role && (<div className="text-neutral-700 dark:text-neutral-300">{job.role}</div>)}
                  <ul className="mt-3 list-disc pl-5 text-neutral-700 dark:text-neutral-300 space-y-1">
                    {job.bullets.map((b, j) => (<li key={j}>{b}</li>))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PROJECTS */}
      <section id="projects" className="mx-auto max-w-[52rem] px-5 md:px-3 pt-6 md:pt-8 pb-6 md:pb-8">
        <h2 className="flex items-center gap-2 text-xl font-semibold mb-6 md:mb-8">
          <BookOpen className="h-5 w-5 shrink-0" />
          Projects
        </h2>
        <div className="space-y-6 md:space-y-8">
          {projects.map((p, i) => (
            <article key={i} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900">
              <div className="text-sm text-neutral-500 dark:text-neutral-400">{p.year}</div>
              <h3 className="mt-1 text-lg font-semibold flex items-center gap-2">
                {p.title}
                <a className="inline-flex" href={p.link}><ArrowUpRight className="h-4 w-4" /></a>
              </h3>
              <div className="mt-2 text-neutral-700 dark:text-neutral-300">
                {p.body}
              </div>
            </article>
          ))}
        </div>
      </section>

        {/* AWARDS */}
        <section
  id="awards"
  className="mx-auto max-w-[52rem] px-5 md:px-3 pt-6 md:pt-8 pb-6 md:pb-8 section-fade js-reveal"
>
  <h2 className="flex items-center gap-2 text-xl font-semibold mb-6 md:mb-8">
    <Briefcase className="h-5 w-5 shrink-0" />
    Awards
  </h2>
          <div className="space-y-6 md:space-y-8">
            {awards.map((w, i) => (
              <a key={i} href={w.link} className="flex items-center justify-between rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                <span className="text-neutral-700 dark:text-neutral-300">{w.year} — {w.title}</span>
                <ArrowUpRight className="h-4 w-4" />
              </a>
            ))}
          </div>
        </section>

        {/* CONTACT */}
        <section
  id="contact"
  className="mx-auto max-w-[52rem] px-5 md:px-3 pt-6 md:pt-8 pb-6 md:pb-8 section-fade js-reveal"
>
  <h2 className="flex items-center gap-2 text-xl font-semibold mb-6 md:mb-8">
    <Briefcase className="h-5 w-5 shrink-0" />
    Let’s make things happen
  </h2>
          <p className="mt-3 text-neutral-700 dark:text-neutral-300">
            I love working with people who are passionate about creating impact. Whether it’s solving a challenge, launching something new, or finding a smarter way to get things done, I will be happy to chat.
          </p>
          <div className="mt-6 flex justify-center gap-20 flex-wrap">
            <a href={profile.social.email} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"><Mail className="h-4 w-4" /> Email me</a>
            <a href={profile.social.linkedin} className="inline-flex items-center gap-2 rounded-2xl border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"><Linkedin className="h-4 w-4" /> Connect</a>
            <a href={profile.social.instagram} className="inline-flex items-center gap-2 rounded-2xl border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"><Instagram className="h-4 w-4" /> Follow</a>
            <a href={profile.social.x} className="inline-flex items-center gap-2 rounded-2xl border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"><XIcon className="h-4 w-4" /> Follow</a>
          </div>
          <footer className="mt-16 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">© {new Date().getFullYear()} {profile.name}</footer>
        </section>
      </main>
  );
}
