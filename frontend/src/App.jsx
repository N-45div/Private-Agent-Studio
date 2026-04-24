import { Suspense, lazy } from "react";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import { Binary, BracketsCurly, Radio, Sparkle } from "@phosphor-icons/react";

const HomePage = lazy(() => import("./pages/HomePage.jsx").then((module) => ({ default: module.HomePage })));
const ArchitecturePage = lazy(() =>
  import("./pages/ArchitecturePage.jsx").then((module) => ({ default: module.ArchitecturePage })),
);
const StudioPage = lazy(() => import("./pages/StudioPage.jsx").then((module) => ({ default: module.StudioPage })));

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function NavigationLink({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        classNames(
          "rounded-full px-4 py-2 text-sm font-medium transition-all duration-700 ease-premium",
          isActive
            ? "bg-ink text-white"
            : "text-black/62 hover:bg-white/75 hover:text-ink",
        )
      }
    >
      {children}
    </NavLink>
  );
}

function SiteFrame({ children }) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-3 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      <div className="absolute left-[6%] top-[8rem] h-72 w-72 rounded-full bg-signal/10 blur-3xl" />
      <div className="absolute right-[4%] top-[16rem] h-80 w-80 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative mx-auto w-full max-w-[1440px] px-4 pb-20 md:px-6 lg:px-10">
        <header className="sticky top-6 z-30 mb-8 pt-6">
          <div className="mx-auto flex w-full flex-col gap-4 rounded-[2rem] border border-black/10 bg-white/72 px-5 py-4 shadow-[0_24px_44px_-34px_rgba(18,18,18,0.26)] backdrop-blur-md md:flex-row md:items-center md:justify-between md:px-6">
            <NavLink to="/" className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-ink text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <Binary size={18} weight="light" />
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-black/40">Private Agent Studio</div>
                <div className="mt-1 text-sm font-semibold tracking-[-0.03em] text-ink">
                  0G-native private agent product system
                </div>
              </div>
            </NavLink>

            <nav className="flex flex-wrap items-center gap-2 rounded-full border border-black/10 bg-white/55 p-1.5">
              <NavigationLink to="/">Home</NavigationLink>
              <NavigationLink to="/architecture">Architecture</NavigationLink>
              <NavigationLink to="/studio">Studio</NavigationLink>
            </nav>
          </div>
        </header>

        <main id="main-content">{children}</main>

        <footer className="mt-20 border-t border-black/10 py-10">
          <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-end">
            <div className="space-y-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-black/40">
                Private Agent Studio
              </div>
              <p className="max-w-[60ch] text-sm leading-7 text-black/58">
                A privacy-first builder for wallet-owned multi-agent products on 0G. The site now separates story, architecture, and operator workflows so the interface can stay readable.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <a href="https://docs.0g.ai/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/75 px-4 py-2.5 text-sm font-medium text-ink transition-all duration-700 ease-premium hover:-translate-y-1">
                <Sparkle size={15} weight="light" />
                0G Docs
              </a>
              <a href="https://chainscan-galileo.0g.ai" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/75 px-4 py-2.5 text-sm font-medium text-ink transition-all duration-700 ease-premium hover:-translate-y-1">
                <Radio size={15} weight="light" />
                ChainScan
              </a>
              <NavLink to="/studio" className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white transition-all duration-700 ease-premium hover:-translate-y-1">
                <BracketsCurly size={15} weight="light" />
                Open Studio
              </NavLink>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <SiteFrame>
        <Suspense
          fallback={
            <div className="section-shell">
              <div className="section-core grid min-h-[55dvh] place-items-center p-8">
                <div className="max-w-md space-y-4 text-center">
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-black/40">Loading route</div>
                  <div className="text-3xl font-semibold tracking-[-0.05em] text-ink">Preparing the next surface.</div>
                  <div className="mx-auto h-2 w-full max-w-xs overflow-hidden rounded-full bg-black/8">
                    <div className="h-full w-1/3 animate-pulse rounded-full bg-ink" />
                  </div>
                </div>
              </div>
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/architecture" element={<ArchitecturePage />} />
            <Route path="/studio" element={<StudioPage />} />
          </Routes>
        </Suspense>
      </SiteFrame>
    </BrowserRouter>
  );
}
