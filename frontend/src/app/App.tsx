import { useState, useEffect, useRef } from "react";
import { ChevronDown, Twitter, Github, Menu, X, ArrowRight, Loader2 } from "lucide-react";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";
import quidarcLogo from "../imports/erasebg-transformed__62_.png";
import { API_BASE as API_BASE_URL } from "../lib/config";
const APP_URL = import.meta.env.VITE_APP_URL || "https://quidarc-v2-app-216m.vercel.app/";

// Anchors match section ids below; no dead links (Roadmap has no section yet).
const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
];

const FEATURES = [
  {
    title: "AI assistant",
    desc: "Natural-language guidance across the ecosystem. Ask anything, get precise, contextual answers.",
  },
  {
    title: "Discover",
    desc: "Explore Arc applications and ecosystem tools curated by AI, surfaced when you need them.",
  },
  {
    title: "Interact",
    desc: "Execute supported on-chain actions through an intuitive AI interface — no manual steps.",
  },
  {
    title: "Stay updated",
    desc: "Receive ecosystem insights, updates, and announcements the moment they happen.",
  },
];

const BENEFITS = [
  "Unified discovery of every Arc application in one place.",
  "AI-powered intent recognition that learns your workflow.",
  "Non-custodial — your keys, your control, always.",
  "Built for everyone: DeFi natives and Web3 newcomers alike.",
];

const STEPS = [
  {
    num: "01",
    title: "Ask naturally",
    desc: "Describe what you want in everyday language — no commands or syntax to memorize.",
  },
  {
    num: "02",
    title: "AI understands",
    desc: "Quidarc interprets your intent and identifies the best actions within the Arc ecosystem.",
  },
  {
    num: "03",
    title: "Take action",
    desc: "Interact with the Arc ecosystem through a unified, intelligent interface — instantly.",
  },
];

const STATS = [
  { value: "100+", label: "Arc applications" },
  { value: "10K+", label: "Future community members" },
  { value: "24/7", label: "AI assistance" },
  { value: "1", label: "Unified interface" },
];

const FAQS = [
  {
    q: "What is Quidarc?",
    a: "Quidarc is an AI-native gateway to the Arc ecosystem. It unifies discovery, guidance, and interaction through a single intelligent interface, so you never have to juggle multiple dApps, wallets, or documentation tabs again.",
  },
  {
    q: "How does AI help users navigate Arc?",
    a: "Our AI understands natural language. Describe what you want to do — swap tokens, find a protocol, track a transaction — and Quidarc interprets your intent, surfaces the right tools, and guides you through each step.",
  },
  {
    q: "Is Quidarc a wallet?",
    a: "No. Quidarc is a gateway and intelligence layer, not a wallet. It connects with your existing wallets and lets you interact with Arc applications through them without ever holding your keys.",
  },
  {
    q: "Does it support developers?",
    a: "Yes. Developers can explore Arc application APIs, query ecosystem data, and prototype integrations faster using the AI assistant. Developer tooling support is expanding in upcoming releases.",
  },
  {
    q: "Is my data secure?",
    a: "Security is foundational. We do not store private keys or sensitive transaction data. All AI processing is designed with privacy-first principles, and our infrastructure meets industry-standard security benchmarks.",
  },
  {
    q: "When will Quidarc launch?",
    a: "We are actively building and onboarding early community members via our waitlist. Join now to be among the first to access the beta and shape the product with your feedback.",
  },
];

const ECOSYSTEM_PARTNERS = [
  "Arc Protocol", "ArcBridge", "ArcSwap", "ArcLend", "ArcNFT",
  "ArcStake", "ArcDAO", "ArcID", "ArcVault", "ArcOracle",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Reveal-on-scroll that respects prefers-reduced-motion: reduced users get
// content immediately, with no transform to animate (better-accessibility #10).
function useInView(threshold = 0.14) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useInView();
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.6s ease-out ${delay}ms, transform 0.6s ease-out ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

// Small mono eyebrow — the "engineered" voice, used above section headings.
function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-accent ${className}`}>
      <span className="h-px w-6 bg-accent/50" aria-hidden />
      {children}
    </span>
  );
}

function SectionHeading({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`font-display font-semibold text-balance ${className}`}
      style={{ fontSize: "clamp(1.9rem, 4vw, 2.75rem)" }}>
      {children}
    </h2>
  );
}

function AccordionItem({ q, a, id }: { q: string; a: string; id: string }) {
  const [open, setOpen] = useState(false);
  const panelId = `faq-panel-${id}`;
  const btnId = `faq-btn-${id}`;
  return (
    <div className="border-b border-border last:border-0">
      <h3>
        <button
          id={btnId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between gap-4 py-5 text-left transition-colors hover:text-accent"
        >
          <span className="font-display text-base font-medium text-foreground">{q}</span>
          <span className={`shrink-0 grid place-items-center h-8 w-8 rounded-full bg-white/5 text-accent transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
            <ChevronDown size={16} strokeWidth={2} aria-hidden />
          </span>
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={btnId}
        hidden={!open}
      >
        <p className="pb-5 pr-12 text-sm leading-relaxed text-muted-foreground motion-safe:animate-[accordion-in_0.24s_ease-out]">{a}</p>
      </div>
    </div>
  );
}

// ─── Product mockup ─────────────────────────────────────────────────────────

function DashboardMockup() {
  return (
    <div className="relative w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
      {/* Single-accent glow behind — one signal color, not a rainbow */}
      <div className="absolute -inset-10 rounded-[2.5rem] opacity-60 blur-3xl pointer-events-none"
        aria-hidden
        style={{ background: "radial-gradient(ellipse at 60% 35%, oklch(0.82 0.128 197 / 0.28) 0%, transparent 70%)" }} />

      <div className="relative rounded-2xl border border-border-strong bg-card/70 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Window bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-white/[0.02]">
          <span className="font-mono text-xs tracking-wide text-muted-foreground">quidarc.app</span>
          <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-1 font-mono text-[10px] font-medium text-accent">
            Beta
          </span>
        </div>

        <div className="p-5 space-y-4">
          {/* AI reply */}
          <div className="rounded-xl border border-accent/20 bg-accent/[0.06] p-4">
            <div className="flex items-center gap-2.5 mb-2.5">
              <span className="grid place-items-center h-7 w-7 rounded-full bg-accent font-display text-sm font-semibold text-accent-foreground" aria-hidden>
                Q
              </span>
              <span className="text-xs font-semibold text-foreground">Quidarc AI</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success motion-safe:animate-pulse" aria-hidden />
                Online
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Found 3 Arc apps matching your query. ArcSwap offers the best rate for ETH → ARC at 0.1% slippage.
            </p>
          </div>

          {/* App results — neutral surfaces, accent initial */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { name: "ArcSwap", tag: "DEX" },
              { name: "ArcLend", tag: "Lending" },
              { name: "ArcNFT", tag: "NFTs" },
            ].map((app) => (
              <div key={app.name} className="rounded-xl border border-border bg-white/[0.03] p-3 text-center">
                <div className="mx-auto mb-2 grid h-8 w-8 place-items-center rounded-lg bg-accent/12 font-mono text-xs font-semibold text-accent">
                  {app.name[3]}
                </div>
                <div className="text-xs font-medium text-foreground">{app.name}</div>
                <div className="mt-1 font-mono text-[10px] text-muted-foreground">{app.tag}</div>
              </div>
            ))}
          </div>

          {/* Wallet strip */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-white/[0.03] p-3.5">
            <div>
              <div className="font-mono text-xs text-foreground">0x4f3c…8a2d</div>
              <div className="text-[11px] text-muted-foreground">Arc Mainnet</div>
            </div>
            <div className="text-right">
              <div className="tnum text-sm font-semibold text-foreground">$4,281.50</div>
              <div className="text-[11px] font-medium text-success">+2.4%</div>
            </div>
          </div>

          {/* Command bar */}
          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-white/[0.03] px-4 py-3">
            <span className="text-sm text-muted-foreground">Search the Arc ecosystem…</span>
            <kbd className="ml-auto rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">⌘K</kbd>
          </div>
        </div>
      </div>

      {/* Floating labels — accent used once, the other stays neutral */}
      <div className="absolute -top-4 -right-3 flex items-center rounded-xl bg-accent px-3.5 py-2 text-xs font-semibold text-accent-foreground shadow-lg">
        AI-native
      </div>
      <div className="absolute -bottom-4 -left-3 flex items-center gap-1.5 rounded-xl border border-border-strong bg-card px-3.5 py-2 text-xs font-medium text-foreground shadow-lg">
        <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden /> Live on Arc
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type WaitlistStatus = { type: "idle" | "loading" | "success" | "error"; message: string };

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [status, setStatus] = useState<WaitlistStatus>({ type: "idle", message: "" });
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const joinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail.trim()) {
      setStatus({ type: "error", message: "Enter your email to join the waitlist." });
      emailRef.current?.focus();
      return;
    }
    try {
      setStatus({ type: "loading", message: "" });
      const response = await fetch(`${API_BASE_URL}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: waitlistEmail }),
      });
      const data = await response.json();
      if (data.success) {
        setWaitlistEmail("");
        setStatus({ type: "success", message: data.message || "You're on the list. Check your inbox to confirm." });
      } else {
        setStatus({ type: "error", message: data.message || "Unable to join the waitlist. Try again." });
      }
    } catch {
      setStatus({ type: "error", message: "Unable to join the waitlist. Check your connection and try again." });
    }
  };

  const loading = status.type === "loading";

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* Skip link — first focusable element (better-accessibility #13) */}
      <a href="#home"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-foreground">
        Skip to content
      </a>

      {/* ── NAV ── */}
      <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? "border-b border-border bg-background/80 backdrop-blur-xl" : "border-b border-transparent"
      }`}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="#home" className="flex items-center gap-2.5" aria-label="Quidarc home">
            <ImageWithFallback src={quidarcLogo} alt="" className="h-8 w-8 object-contain" />
            <span className="font-display text-lg font-semibold tracking-tight">Quidarc</span>
          </a>

          <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <a href={APP_URL}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-white/5 hover:text-foreground active:scale-[0.96]">
              Launch app
            </a>
            <a href="#waitlist"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm transition hover:bg-accent-hover active:scale-[0.96]">
              Join waitlist
            </a>
          </div>

          <button className="grid h-10 w-10 place-items-center rounded-lg text-foreground transition hover:bg-white/5 md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-border bg-background px-6 py-4 md:hidden">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((l) => (
                <a key={l.label} href={l.href}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                  onClick={() => setMenuOpen(false)}>
                  {l.label}
                </a>
              ))}
              <a href={APP_URL}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                onClick={() => setMenuOpen(false)}>
                Launch app
              </a>
              <a href="#waitlist"
                className="mt-2 rounded-lg bg-accent px-4 py-2.5 text-center text-sm font-semibold text-accent-foreground"
                onClick={() => setMenuOpen(false)}>
                Join waitlist
              </a>
            </div>
          </div>
        )}
      </header>

      {/* tabIndex=-1 so the skip link moves focus here, not just the viewport */}
      <main id="home" tabIndex={-1} className="outline-none">
        {/* ── HERO ── */}
        <section className="relative flex min-h-screen items-center overflow-hidden pt-16">
          {/* Single-accent ambient background */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute inset-0 opacity-70"
              style={{ background: "radial-gradient(ellipse 70% 55% at 15% 25%, oklch(0.82 0.128 197 / 0.15) 0%, transparent 60%)" }} />
            <div className="absolute bottom-0 right-0 h-[32rem] w-[32rem] rounded-full opacity-50 blur-3xl"
              style={{ background: "radial-gradient(circle, oklch(0.82 0.128 197 / 0.1) 0%, transparent 70%)" }} />
            <div className="absolute inset-0"
              style={{
                backgroundImage: "linear-gradient(oklch(1 0 0 / 0.03) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.03) 1px, transparent 1px)",
                backgroundSize: "56px 56px",
                maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 75%)",
              }} />
          </div>

          <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-16 px-6 py-20 lg:grid-cols-2">
            <FadeUp>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.06] px-3.5 py-1.5 font-mono text-xs text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent motion-safe:animate-pulse" aria-hidden />
                AI-native gateway to Arc
              </div>

              <h1 className="mt-7 font-display font-semibold text-foreground"
                style={{ fontSize: "clamp(2.6rem, 6vw, 4.25rem)", lineHeight: 1.04, letterSpacing: "-0.035em" }}>
                One interface for the{" "}
                <span className="text-accent">Arc ecosystem</span>
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
                Discover applications, stay informed, and act across Arc through a single
                AI-powered interface. Quidarc brings everything together in one intuitive experience.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <a href="#waitlist"
                  className="group inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-accent-foreground shadow-lg transition hover:bg-accent-hover active:scale-[0.96]">
                  Join waitlist
                  <ArrowRight size={16} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                </a>
                <a href="#features"
                  className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-white/[0.02] px-6 py-3.5 text-sm font-semibold text-foreground transition hover:bg-white/[0.06] active:scale-[0.96]">
                  Explore features
                </a>
              </div>

              <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-xs text-subtle-foreground">
                {["No wallet required to join", "Free during beta", "Private by design"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-accent" aria-hidden />{t}
                  </li>
                ))}
              </ul>
            </FadeUp>

            <FadeUp delay={120}>
              <DashboardMockup />
            </FadeUp>
          </div>
        </section>

        {/* ── ECOSYSTEM PARTNERS ── */}
        <section className="border-y border-border bg-background-elevated py-14">
          <div className="mx-auto max-w-6xl px-6">
            <FadeUp>
              <p className="text-center font-mono text-xs uppercase tracking-[0.2em] text-subtle-foreground">
                Built for the Arc ecosystem
              </p>
            </FadeUp>
            <FadeUp delay={80}>
              <ul className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
                {ECOSYSTEM_PARTNERS.map((p) => (
                  <li key={p}
                    className="rounded-lg border border-border bg-white/[0.02] px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground">
                    {p}
                  </li>
                ))}
              </ul>
            </FadeUp>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" className="scroll-mt-20 px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <FadeUp className="mx-auto max-w-2xl text-center">
              <Eyebrow>Features</Eyebrow>
              <SectionHeading className="mt-4">Everything you need to navigate Arc</SectionHeading>
              <p className="mt-4 text-base text-muted-foreground">Four core capabilities, one seamless experience.</p>
            </FadeUp>

            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f, i) => (
                <FadeUp key={f.title} delay={i * 70}>
                  <div className="group h-full rounded-2xl border border-border bg-card p-6 transition duration-300 hover:-translate-y-1 hover:border-border-strong hover:shadow-lg">
                    <span className="font-mono text-sm font-medium text-accent tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-5 font-display text-base font-medium text-foreground">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHY QUIDARC ── */}
        <section className="bg-background-elevated px-6 py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
            <FadeUp>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-card">
                <div className="absolute inset-0 opacity-60"
                  aria-hidden
                  style={{ background: "radial-gradient(ellipse at 50% 45%, oklch(0.82 0.128 197 / 0.18) 0%, transparent 65%)" }} />
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <div className="relative h-full w-full">
                    {[
                      { top: "8%", left: "4%", name: "ArcSwap", w: "46%" },
                      { top: "8%", right: "4%", name: "ArcLend", w: "42%" },
                      { top: "42%", left: "20%", name: "ArcNFT", w: "60%" },
                      { bottom: "8%", left: "4%", name: "ArcDAO", w: "44%" },
                      { bottom: "8%", right: "4%", name: "ArcStake", w: "42%" },
                    ].map((card) => (
                      <div key={card.name}
                        className="absolute flex items-center gap-2 rounded-xl border border-border bg-white/[0.04] px-3 py-2 backdrop-blur-sm"
                        style={{ top: (card as any).top, left: (card as any).left, right: (card as any).right, bottom: (card as any).bottom, width: card.w }}>
                        <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-md bg-accent/15 font-mono text-[10px] font-semibold text-accent">
                          {card.name[3]}
                        </span>
                        <span className="truncate text-xs font-medium text-muted-foreground">{card.name}</span>
                      </div>
                    ))}
                    <div className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl bg-accent shadow-xl"
                      style={{ boxShadow: "0 0 40px oklch(0.82 0.128 197 / 0.5)" }}>
                      <ImageWithFallback src={quidarcLogo} alt="" className="h-9 w-9 object-contain" />
                    </div>
                  </div>
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={120}>
              <Eyebrow>Why Quidarc</Eyebrow>
              <SectionHeading className="mt-4">One interface.<br />Endless possibilities.</SectionHeading>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                No more juggling wallets, explorers, docs, and a dozen dApps. Quidarc brings
                discovery, guidance, and interaction into one intelligent experience — for DeFi
                veterans and newcomers alike.
              </p>
              <ul className="mt-8 space-y-4">
                {BENEFITS.map((text) => (
                  <li key={text} className="flex items-start gap-3.5">
                    <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" aria-hidden />
                    <span className="text-sm leading-relaxed text-muted-foreground">{text}</span>
                  </li>
                ))}
              </ul>
            </FadeUp>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" className="scroll-mt-20 px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <FadeUp className="mx-auto max-w-2xl text-center">
              <Eyebrow>How it works</Eyebrow>
              <SectionHeading className="mt-4">Three steps to the Arc ecosystem</SectionHeading>
            </FadeUp>

            <div className="relative mt-16 grid gap-10 md:grid-cols-3">
              <div className="absolute left-[16.66%] right-[16.66%] top-12 hidden h-px bg-gradient-to-r from-transparent via-border-strong to-transparent md:block" aria-hidden />
              {STEPS.map((step, i) => (
                <FadeUp key={step.num} delay={i * 100}>
                  <div className="relative text-center">
                    <div className="relative mx-auto mb-6 inline-flex">
                      <div className={`grid h-24 w-24 place-items-center rounded-2xl border font-display text-3xl font-semibold tabular-nums ${
                        i === 1 ? "border-transparent bg-accent text-accent-foreground shadow-lg" : "border-border bg-card text-accent"
                      }`}>
                        {step.num}
                      </div>
                    </div>
                    <h3 className="font-display text-lg font-medium text-foreground">{step.title}</h3>
                    <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ── STATS ── */}
        <section className="border-y border-border bg-background-elevated px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <dl className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              {STATS.map((s, i) => (
                <FadeUp key={s.label} delay={i * 70}>
                  <div className="rounded-2xl border border-border bg-card p-6 text-center">
                    <dt className="sr-only">{s.label}</dt>
                    <dd className="tnum font-display text-4xl font-semibold text-accent">{s.value}</dd>
                    <p aria-hidden className="mt-2 text-sm font-medium text-muted-foreground">{s.label}</p>
                  </div>
                </FadeUp>
              ))}
            </dl>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="scroll-mt-20 px-6 py-24">
          <div className="mx-auto max-w-2xl">
            <FadeUp className="text-center">
              <Eyebrow className="justify-center">FAQ</Eyebrow>
              <SectionHeading className="mt-4">Frequently asked questions</SectionHeading>
            </FadeUp>
            <FadeUp delay={80}>
              <div className="mt-10 rounded-2xl border border-border bg-card px-6">
                {FAQS.map((faq, i) => (
                  <AccordionItem key={faq.q} id={String(i)} q={faq.q} a={faq.a} />
                ))}
              </div>
            </FadeUp>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section id="waitlist" className="relative scroll-mt-20 overflow-hidden px-6 py-28">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute inset-0"
              style={{ background: "radial-gradient(ellipse 60% 60% at 50% 40%, oklch(0.82 0.128 197 / 0.12) 0%, transparent 70%)" }} />
          </div>
          <div className="relative mx-auto max-w-xl text-center">
            <FadeUp>
              <div className="mb-6 flex justify-center">
                <ImageWithFallback src={quidarcLogo} alt="" className="h-14 w-14 object-contain" />
              </div>
              <h2 className="font-display font-semibold text-foreground"
                style={{ fontSize: "clamp(2rem, 5vw, 3rem)", lineHeight: 1.06, letterSpacing: "-0.03em" }}>
                Ready to experience the future of Arc?
              </h2>
              <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
                Join the waitlist and be among the first to explore the Arc ecosystem through an
                AI-native interface.
              </p>

              <form onSubmit={joinWaitlist} className="mx-auto mt-9 flex max-w-md flex-col gap-3 sm:flex-row" noValidate>
                <label htmlFor="waitlist-email" className="sr-only">Email address</label>
                <input
                  ref={emailRef}
                  id="waitlist-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  placeholder="name@example.com"
                  aria-invalid={status.type === "error"}
                  aria-describedby="waitlist-status"
                  className="flex-1 rounded-xl border border-input bg-input-background px-4 py-3 text-base text-foreground placeholder:text-subtle-foreground outline-none transition-colors focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg transition hover:bg-accent-hover active:scale-[0.96] disabled:opacity-80"
                >
                  {loading && <Loader2 size={15} strokeWidth={2.5} className="animate-spin" aria-hidden />}
                  Join waitlist
                </button>
              </form>

              {/* Inline status replaces alert(); announced politely */}
              <p id="waitlist-status" role="status" aria-live="polite"
                className={`mt-3 min-h-5 text-sm ${
                  status.type === "error" ? "text-destructive" :
                  status.type === "success" ? "text-success" : "text-subtle-foreground"
                }`}>
                {status.message || "No spam. Unsubscribe anytime."}
              </p>
            </FadeUp>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div className="flex items-center gap-2.5">
            <ImageWithFallback src={quidarcLogo} alt="" className="h-8 w-8 object-contain" />
            <span className="font-display text-base font-semibold">Quidarc</span>
          </div>
          <p className="max-w-xs text-center text-sm leading-relaxed text-muted-foreground sm:flex-1 sm:text-left">
            An AI-native gateway bringing the entire Arc ecosystem into one intelligent interface.
          </p>
          <div className="flex items-center gap-2">
            {[
              { Icon: Twitter, label: "Quidarc on X", href: "https://x.com/justQuidarc" },
              { Icon: Github, label: "Quidarc on GitHub", href: "https://github.com/OOBA101" },
            ].map(({ Icon, label, href }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground transition hover:border-border-strong hover:text-foreground active:scale-[0.96]">
                <Icon size={16} strokeWidth={1.75} aria-hidden />
              </a>
            ))}
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-6xl border-t border-border pt-6 text-center text-xs text-subtle-foreground sm:text-left">
          © {new Date().getFullYear()} Quidarc. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
