import { useState, useEffect, useRef } from "react";
import {
  MessageSquare, Compass, Zap, Bell, ChevronDown, ChevronRight,
  Twitter, Github, Menu, X, Check, ArrowRight, Shield, Cpu, Globe, Users
} from "lucide-react";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";
import quidarcLogo from "../imports/erasebg-transformed__62_.png";
// ─── Constants ───────────────────────────────────────────────────────────────

// Was hardcoded to http://localhost:3001 — broke outside local dev. Both of
// these need to be set in .env for staging/production (see .env.example).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
// Where "Launch App" sends people — the actual Quidarc app, a separate
// deployable from this landing page. Update once the real domain is picked.
const APP_URL = import.meta.env.VITE_APP_URL || "https://quidarc-v2-app-216m.vercel.app/";

const NAV_LINKS = ["Home", "Features", "How It Works", "Roadmap", "FAQ"];


const FEATURES = [
  {
    icon: MessageSquare,
    title: "AI Assistant",
    desc: "Natural language guidance across the ecosystem. Ask anything, get precise, contextual answers.",
    gradient: "from-blue-500 to-cyan-400",
  },
  {
    icon: Compass,
    title: "Discover",
    desc: "Explore Arc applications and ecosystem tools curated by AI, surfaced when you need them.",
    gradient: "from-violet-500 to-purple-400",
  },
  {
    icon: Zap,
    title: "Interact",
    desc: "Execute supported on-chain actions through an intuitive AI interface — no manual steps.",
    gradient: "from-cyan-500 to-blue-400",
  },
  {
    icon: Bell,
    title: "Stay Updated",
    desc: "Receive ecosystem insights, updates, and important announcements the moment they happen.",
    gradient: "from-purple-500 to-violet-400",
  },
];

const BENEFITS = [
  { icon: Globe, text: "Unified discovery of all Arc applications in one place." },
  { icon: Cpu, text: "AI-powered intent recognition that learns your workflow." },
  { icon: Shield, text: "Non-custodial — your keys, your control, always." },
  { icon: Users, text: "Built for everyone: DeFi natives and Web3 newcomers alike." },
];

const STEPS = [
  {
    num: "01",
    title: "Ask Naturally",
    desc: "Describe what you want using everyday language — no commands or syntax to memorize.",
    icon: MessageSquare,
  },
  {
    num: "02",
    title: "AI Understands",
    desc: "Quidarc interprets your intent and identifies the best actions within the Arc ecosystem.",
    icon: Cpu,
  },
  {
    num: "03",
    title: "Take Action",
    desc: "Interact with the Arc ecosystem through a unified, intelligent interface — instantly.",
    icon: Zap,
  },
];

const STATS = [
  { value: "100+", label: "Arc Applications" },
  { value: "10K+", label: "Future Community Members" },
  { value: "24/7", label: "AI Assistance" },
  { value: "1", label: "Unified Interface" },
];

const TESTIMONIALS = [
  {
    name: "Aria Nakamura",
    role: "DeFi Developer",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop&auto=format",
    text: "Quidarc completely changed how I navigate Arc. I used to bounce between five different tabs — now everything I need surfaces in one conversation.",
  },
  {
    name: "Marcus Chen",
    role: "Web3 Analyst",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format",
    text: "The AI assistant genuinely understands what I'm asking. It's not just search — it guides me through ecosystem decisions with real context.",
  },
  {
    name: "Priya Sharma",
    role: "Blockchain Researcher",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&auto=format",
    text: "Fast, intuitive, and reliable. For someone new to Arc, Quidarc made the learning curve practically disappear.",
  },
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
    a: "Yes. Developers can explore Arc application APIs, query ecosystem data, and prototype integrations faster using the AI assistant. Developer tooling support is expanding in our upcoming releases.",
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
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
      transform: visible ? "translateY(0)" : "translateY(32px)",
      transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-0" style={{ borderColor: "#e2e8f0" }}>
      <button
        className="w-full flex items-center justify-between py-5 text-left gap-4"
        onClick={() => setOpen(!open)}
      >
        <span className="text-base font-semibold" style={{ color: "#0f172a" }}>{q}</span>
        <ChevronDown
          size={18}
          className="shrink-0 transition-transform duration-300"
          style={{ color: "#2563eb", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? "200px" : "0px", opacity: open ? 1 : 0 }}
      >
        <p className="pb-5 text-sm leading-relaxed" style={{ color: "#64748b" }}>{a}</p>
      </div>
    </div>
  );
}

// ─── Dashboard Mockup ─────────────────────────────────────────────────────────

function DashboardMockup() {
  return (
    <div className="relative w-full max-w-lg mx-auto lg:mx-0 lg:ml-auto">
      {/* Glow behind */}
      <div className="absolute -inset-8 rounded-3xl opacity-30 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 60% 40%, #7c3aed 0%, #2563eb 50%, transparent 80%)" }} />

      {/* Main card */}
      <div className="relative rounded-2xl border overflow-hidden shadow-2xl"
        style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.12)" }}>

        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}>
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#f59e0b" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#22c55e" }} />
          <span className="ml-3 text-xs font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>quidarc.app</span>
        </div>

        <div className="p-5 space-y-4">
          {/* AI chat bubble */}
          <div className="rounded-xl p-4" style={{ background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.25)" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2563eb, #06b6d4)" }}>
                <MessageSquare size={12} color="#fff" />
              </div>
              <span className="text-xs font-semibold" style={{ color: "#93c5fd" }}>Quidarc AI</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
              I found 3 Arc applications matching your query. ArcSwap offers the best rate for ETH → ARC with 0.1% slippage.
            </p>
          </div>

          {/* App cards row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { name: "ArcSwap", tag: "DEX", color: "#2563eb" },
              { name: "ArcLend", tag: "Lending", color: "#7c3aed" },
              { name: "ArcNFT", tag: "NFTs", color: "#06b6d4" },
            ].map((app) => (
              <div key={app.name} className="rounded-lg p-2.5 text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="w-7 h-7 rounded-lg mx-auto mb-1.5 flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: app.color }}>
                  {app.name[3]}
                </div>
                <div className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>{app.name}</div>
                <div className="text-xs mt-0.5 rounded-full px-1.5 py-0.5 inline-block" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)", fontSize: "10px" }}>{app.tag}</div>
              </div>
            ))}
          </div>

          {/* Wallet strip */}
          <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full" style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }} />
              <div>
                <div className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>0x4f3c…8a2d</div>
                <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Arc Mainnet</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold" style={{ color: "#22c55e" }}>$4,281.50</div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>+2.4% today</div>
            </div>
          </div>

          {/* Analytics mini-cards */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Transactions", val: "1,284", up: true },
              { label: "Gas Saved", val: "$38.20", up: true },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{stat.label}</div>
                <div className="text-base font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>{stat.val}</div>
                <div className="text-xs mt-0.5" style={{ color: "#22c55e" }}>↑ +12%</div>
              </div>
            ))}
          </div>

          {/* Search bar */}
          <div className="rounded-xl px-4 py-2.5 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>⌘</span>
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Search Arc ecosystem…</span>
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <div className="absolute -top-4 -right-4 rounded-xl px-3 py-2 text-xs font-semibold shadow-lg"
        style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)", color: "#fff" }}>
        AI-Native ✦
      </div>
      <div className="absolute -bottom-4 -left-4 rounded-xl px-3 py-2 text-xs font-semibold shadow-lg flex items-center gap-1.5"
        style={{ background: "#fff", color: "#0f172a" }}>
        <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#22c55e" }} />
        Live on Arc
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function App() {

  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // 👇 Add this function here
  const joinWaitlist = async () => {

    try {

      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/waitlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: waitlistEmail,
        }),
      });

      const data = await response.json();

      alert(data.message);

      if (data.success) {
        setWaitlistEmail("");
      }

    } catch (err) {

      alert("Unable to join waitlist.");

    } finally {

      setLoading(false);

    }

  };
  
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── NAV ── */}
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrolled ? "rgba(255,255,255,0.9)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid #e2e8f0" : "none",
          boxShadow: scrolled ? "0 1px 24px rgba(0,0,0,0.06)" : "none",
        }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <ImageWithFallback src={quidarcLogo} alt="Quidarc logo" className="w-8 h-8 object-contain" />
            <span className="text-lg font-bold tracking-tight" style={{ color: "#0f172a" }}>Quidarc</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map((l) => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`}
                className="text-sm font-medium transition-colors duration-150"
                style={{ color: "#64748b" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#2563eb")}
                onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}
              >{l}</a>
            ))}
          </nav>

          {/* CTA buttons */}
          <div className="hidden md:flex items-center gap-3">
            <a href={APP_URL} className="text-sm font-medium px-4 py-2 rounded-lg border transition-all duration-150"
              style={{ color: "#2563eb", borderColor: "#e2e8f0" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >Launch App</a>
            <a href="#waitlist" className="text-sm font-semibold px-5 py-2 rounded-lg transition-all duration-150"
              style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)", color: "#fff" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >Join Waitlist</a>
          </div>

          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t px-6 py-4 flex flex-col gap-4 bg-white" style={{ borderColor: "#e2e8f0" }}>
            {NAV_LINKS.map((l) => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`} className="text-sm font-medium" style={{ color: "#64748b" }} onClick={() => setMenuOpen(false)}>{l}</a>
            ))}
            <a href={APP_URL} className="text-sm font-medium" style={{ color: "#64748b" }} onClick={() => setMenuOpen(false)}>Launch App</a>
            <a href="#waitlist" className="text-sm font-semibold px-4 py-2.5 rounded-lg text-center"
              style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)", color: "#fff" }}
              onClick={() => setMenuOpen(false)}
            >Join Waitlist</a>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section id="home" className="relative min-h-screen flex items-center pt-16 overflow-hidden" style={{ background: "#0f172a" }}>
        {/* Background gradients */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-0 left-0 w-full h-full opacity-40"
            style={{ background: "radial-gradient(ellipse 80% 60% at 20% 30%, rgba(37,99,235,0.35) 0%, transparent 60%)" }} />
          <div className="absolute top-0 right-0 w-full h-full opacity-30"
            style={{ background: "radial-gradient(ellipse 60% 50% at 80% 20%, rgba(124,58,237,0.4) 0%, transparent 60%)" }} />
          <div className="absolute bottom-0 left-1/3 w-96 h-96 opacity-20 blur-3xl rounded-full"
            style={{ background: "#06b6d4" }} />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center w-full">
          {/* Left copy */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 text-xs font-semibold"
              style={{ background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.3)", color: "#93c5fd" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              AI-Native Gateway to the Arc Ecosystem
            </div>

            <h1 className="font-extrabold leading-[1.06] mb-6"
              style={{ fontSize: "clamp(2.4rem, 5.5vw, 3.8rem)", color: "#ffffff", letterSpacing: "-0.03em" }}>
              Your Intelligent Gateway<br />to the{" "}
              <span style={{ background: "linear-gradient(90deg,#60a5fa,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Arc Ecosystem
              </span>
            </h1>

            <p className="text-lg leading-relaxed mb-10" style={{ color: "#94a3b8", maxWidth: "520px" }}>
              Discover applications, stay informed, and interact with the Arc ecosystem through one
              AI-powered interface. Quidarc simplifies Web3 by bringing everything together in a
              single, intuitive experience.
            </p>

            <div className="flex flex-wrap gap-4 mb-12">
              <a href="#waitlist" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 group"
                style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)", color: "#fff", boxShadow: "0 8px 32px rgba(37,99,235,0.35)" }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 12px 40px rgba(37,99,235,0.5)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 8px 32px rgba(37,99,235,0.35)")}
              >
                Join Waitlist
                <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
              </a>
              <a href="#" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200"
                style={{ background: "rgba(255,255,255,0.07)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.12)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
              >
                Explore the Vision
              </a>
            </div>

            {/* Trust row */}
            <div className="flex items-center gap-4 text-xs" style={{ color: "#64748b" }}>
              {["No wallet required to join", "Free during beta", "Private by design"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check size={11} style={{ color: "#22c55e" }} />{t}
                </span>
              ))}
            </div>
          </div>

          {/* Right: dashboard mockup */}
          <DashboardMockup />
        </div>
      </section>

      {/* ── ECOSYSTEM PARTNERS ── */}
      <section className="py-16 border-b" style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
        <div className="max-w-6xl mx-auto px-6">
          <FadeUp>
            <p className="text-center text-sm font-semibold mb-8 tracking-widest uppercase" style={{ color: "#94a3b8" }}>
              Built for the Arc Ecosystem
            </p>
          </FadeUp>
          <FadeUp delay={80}>
            <div className="flex flex-wrap items-center justify-center gap-8">
              {ECOSYSTEM_PARTNERS.map((p) => (
                <div key={p} className="px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200"
                  style={{ borderColor: "#e2e8f0", color: "#94a3b8", background: "#fff" }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#2563eb"; e.currentTarget.style.borderColor = "#bfdbfe"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
                >
                  {p}
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeUp className="text-center mb-16">
            <div className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4 tracking-widest uppercase"
              style={{ background: "#eff6ff", color: "#2563eb" }}>Features</div>
            <h2 className="font-extrabold mb-4" style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", letterSpacing: "-0.02em", color: "#0f172a" }}>
              Everything You Need to Navigate Arc
            </h2>
            <p className="text-base mx-auto" style={{ color: "#64748b", maxWidth: "480px" }}>
              Four core capabilities, one seamless experience.
            </p>
          </FadeUp>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <FadeUp key={f.title} delay={i * 80}>
                <div className="group rounded-2xl p-6 border h-full transition-all duration-300 cursor-default"
                  style={{ background: "#fff", borderColor: "#e2e8f0" }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 40px rgba(37,99,235,0.1)"; e.currentTarget.style.borderColor = "#bfdbfe"; e.currentTarget.style.transform = "translateY(-4px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 bg-gradient-to-br ${f.gradient}`}>
                    <f.icon size={20} color="#fff" />
                  </div>
                  <h3 className="font-bold text-base mb-2" style={{ color: "#0f172a" }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>{f.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY QUIDARC ── */}
      <section className="py-24 px-6" style={{ background: "#f8fafc" }}>
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          {/* Left illustration */}
          <FadeUp>
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3]"
              style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)" }}>
              <div className="absolute inset-0 opacity-40"
                style={{ background: "radial-gradient(ellipse at 30% 40%,#2563eb 0%,transparent 60%)" }} />
              <div className="absolute inset-0 opacity-30"
                style={{ background: "radial-gradient(ellipse at 70% 70%,#7c3aed 0%,transparent 55%)" }} />
              {/* Floating app cards illustration */}
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="relative w-full h-full">
                  {[
                    { top: "10%", left: "5%", name: "ArcSwap", color: "#2563eb", w: "48%" },
                    { top: "10%", right: "5%", name: "ArcLend", color: "#7c3aed", w: "42%" },
                    { top: "42%", left: "18%", name: "ArcNFT", color: "#06b6d4", w: "64%" },
                    { bottom: "8%", left: "5%", name: "ArcDAO", color: "#7c3aed", w: "44%" },
                    { bottom: "8%", right: "5%", name: "ArcStake", color: "#2563eb", w: "42%" },
                  ].map((card) => (
                    <div key={card.name}
                      className="absolute rounded-xl px-3 py-2 flex items-center gap-2"
                      style={{
                        top: card.top, left: (card as any).left, right: (card as any).right,
                        bottom: card.bottom, width: card.w,
                        background: "rgba(255,255,255,0.07)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        backdropFilter: "blur(8px)",
                      }}>
                      <div className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: card.color }}>{card.name[3]}</div>
                      <span className="text-xs font-medium truncate" style={{ color: "rgba(255,255,255,0.75)" }}>{card.name}</span>
                    </div>
                  ))}
                  {/* Center hub */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)", boxShadow: "0 0 32px rgba(37,99,235,0.6)" }}>
                    <ImageWithFallback src={quidarcLogo} alt="Quidarc" className="w-8 h-8 object-contain" />
                  </div>
                </div>
              </div>
            </div>
          </FadeUp>

          {/* Right copy */}
          <FadeUp delay={120}>
            <div className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4 tracking-widest uppercase"
              style={{ background: "#eff6ff", color: "#2563eb" }}>Why Quidarc</div>
            <h2 className="font-extrabold mb-5" style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)", letterSpacing: "-0.02em", color: "#0f172a" }}>
              One Interface.<br />Endless Possibilities.
            </h2>
            <p className="text-base leading-relaxed mb-8" style={{ color: "#64748b" }}>
              You no longer need to juggle wallets, explorers, documentation, and multiple dApps.
              Quidarc brings discovery, guidance, and interaction together into one intelligent
              experience — designed for both DeFi veterans and newcomers.
            </p>
            <ul className="space-y-4">
              {BENEFITS.map((b) => (
                <li key={b.text} className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "#eff6ff" }}>
                    <b.icon size={15} style={{ color: "#2563eb" }} />
                  </div>
                  <span className="text-sm leading-relaxed" style={{ color: "#475569" }}>{b.text}</span>
                </li>
              ))}
            </ul>
          </FadeUp>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeUp className="text-center mb-16">
            <div className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4 tracking-widest uppercase"
              style={{ background: "#eff6ff", color: "#2563eb" }}>How It Works</div>
            <h2 className="font-extrabold mb-4" style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", letterSpacing: "-0.02em", color: "#0f172a" }}>
              Three Steps to the Arc Ecosystem
            </h2>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-14 left-[calc(33.33%+16px)] right-[calc(33.33%+16px)] h-px"
              style={{ background: "linear-gradient(90deg,#2563eb,#7c3aed)" }} />

            {STEPS.map((step, i) => (
              <FadeUp key={step.num} delay={i * 100}>
                <div className="relative text-center">
                  <div className="relative inline-flex">
                    <div className="w-28 h-28 rounded-2xl flex items-center justify-center mx-auto mb-6"
                      style={{ background: i === 1 ? "linear-gradient(135deg,#2563eb,#7c3aed)" : "#f1f5f9" }}>
                      <step.icon size={36} style={{ color: i === 1 ? "#fff" : "#2563eb" }} />
                    </div>
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)", color: "#fff" }}>
                      {i + 1}
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-2" style={{ color: "#0f172a" }}>{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>{step.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-20 px-6" style={{ background: "#0f172a" }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {STATS.map((s, i) => (
              <FadeUp key={s.label} delay={i * 80}>
                <div className="rounded-2xl p-6 text-center border"
                  style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="text-4xl font-extrabold mb-2"
                    style={{ background: "linear-gradient(90deg,#60a5fa,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    {s.value}
                  </div>
                  <div className="text-sm font-medium" style={{ color: "#64748b" }}>{s.label}</div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-2xl mx-auto">
          <FadeUp className="text-center mb-12">
            <div className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4 tracking-widest uppercase"
              style={{ background: "#eff6ff", color: "#2563eb" }}>FAQ</div>
            <h2 className="font-extrabold" style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)", letterSpacing: "-0.02em", color: "#0f172a" }}>
              Frequently asked questions
            </h2>
          </FadeUp>

          <FadeUp delay={80}>
            <div className="rounded-2xl border divide-y" style={{ borderColor: "#e2e8f0", background: "#fff" }}>
              {FAQS.map((faq) => (
                <div key={faq.q} className="px-6">
                  <AccordionItem q={faq.q} a={faq.a} />
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section id="waitlist" className="py-24 px-6 relative overflow-hidden" style={{ background: "#0f172a" }}>
        {/* Animated gradient background */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-0 left-0 w-full h-full"
            style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%,rgba(37,99,235,0.25) 0%,transparent 70%)" }} />
          <div className="absolute top-0 right-0 w-2/3 h-full opacity-40"
            style={{ background: "radial-gradient(ellipse 60% 50% at 80% 30%,rgba(124,58,237,0.35) 0%,transparent 65%)" }} />
        </div>

        <div className="relative max-w-2xl mx-auto text-center">
          <FadeUp>
            <div className="flex justify-center mb-6">
              <ImageWithFallback src={quidarcLogo} alt="Quidarc" className="w-14 h-14 object-contain" />
            </div>
            <h2 className="font-extrabold mb-5" style={{ fontSize: "clamp(2rem,5vw,3.2rem)", letterSpacing: "-0.02em", color: "#fff" }}>
              Ready to Experience<br />the Future of Arc?
            </h2>
            <p className="text-base mb-10 leading-relaxed" style={{ color: "#94a3b8" }}>
              Join the waitlist and be among the first to explore the Arc ecosystem through an
              AI-native interface.
            </p>

            {/* Email form */}
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-6">
              <input
                type="email"
                value={waitlistEmail}
                onChange={e => setWaitlistEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
              />
              <button
                onClick={joinWaitlist}
                className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 whitespace-nowrap"
                style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)", color: "#fff", boxShadow: "0 6px 24px rgba(37,99,235,0.4)" }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 10px 32px rgba(37,99,235,0.6)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 6px 24px rgba(37,99,235,0.4)")}
              >
                Join Waitlist
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="#" className="text-sm font-medium transition-colors duration-150 flex items-center gap-1.5"
                style={{ color: "#94a3b8" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#60a5fa")}
                onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
              >
                Read the Vision <ChevronRight size={14} />
              </a>
              <span className="text-xs" style={{ color: "#475569" }}>No spam. Unsubscribe anytime.</span>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t py-10 px-6" style={{ background: "#0f172a", borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="flex items-center gap-2.5">
            <ImageWithFallback src={quidarcLogo} alt="Quidarc logo" className="w-8 h-8 object-contain" />
            <span className="text-base font-bold" style={{ color: "#fff" }}>Quidarc</span>
          </div>
          <p className="text-sm leading-relaxed text-center sm:text-left sm:flex-1" style={{ color: "#64748b", maxWidth: "280px" }}>
            An AI-native gateway bringing the entire Arc ecosystem into one intelligent interface.
          </p>
          <div className="flex items-center gap-3">
            {[
              { Icon: Twitter, label: "Twitter" },
              { Icon: Github, label: "GitHub" },
            ].map(({ Icon, label }) => (
              <a key={label} href="#" aria-label={label}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
                style={{ background: "rgba(255,255,255,0.06)", color: "#64748b" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#64748b"; }}
              >
                <Icon size={15} />
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
