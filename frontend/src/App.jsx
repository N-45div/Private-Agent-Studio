import { Suspense, lazy } from "react";
import { BrowserRouter, NavLink, Outlet, Route, Routes } from "react-router-dom";
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
            ? "bg-accent text-[#120e0b]"
            : "text-muted hover:bg-white/[0.06] hover:text-ink",
        )
      }
    >
      {children}
    </NavLink>
  );
}

function AppHeader() {
  return (
    <header className="sticky top-4 z-40 mb-6 pt-4">
      <div className="mx-auto flex w-full items-center justify-between gap-4 rounded-[1.75rem] border border-white/10 bg-[#0f1312]/86 px-4 py-3 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.8)] backdrop-blur-xl md:px-5">
        <NavLink to="/" className="flex min-w-0 items-center gap-4">
          <div className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-accent text-[#120e0b] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
            <Binary size={17} weight="light" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-mono text-[10px] uppercase tracking-[0.28em] text-soft">Private Agent Studio</div>
            <div className="truncate text-sm font-semibold tracking-[-0.03em] text-ink">
              0G-native private agent product system
            </div>
          </div>
        </NavLink>

        <nav className="glass-pill flex flex-wrap items-center gap-2 p-1.5">
          <NavigationLink to="/">Home</NavigationLink>
          <NavigationLink to="/architecture">Architecture</NavigationLink>
          <NavigationLink to="/studio">Studio</NavigationLink>
        </nav>
      </div>
    </header>
  );
}

function MarketingFrame() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-3 focus:text-sm focus:text-[#120e0b]"
      >
        Skip to content
      </a>

      <div className="absolute inset-x-0 top-0 h-[32rem] bg-[linear-gradient(180deg,rgba(41,82,76,0.22),rgba(9,11,10,0))]" />

      <div className="relative mx-auto w-full max-w-[1440px] px-4 pb-20 md:px-6 lg:px-10">
        <AppHeader />

        <main id="main-content">
          <Outlet />
        </main>

        <footer className="mt-20 border-t border-white/10 py-10">
          <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-end">
            <div className="space-y-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-soft">
                Private Agent Studio
              </div>
              <p className="max-w-[60ch] text-sm leading-7 text-muted">
                A private agent product system for 0G. Story, system model, and operator workflow now live on separate routes so the interface stays readable.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <a href="https://docs.0g.ai/" target="_blank" rel="noreferrer" className="pill-secondary">
                <Sparkle size={15} weight="light" />
                0G Docs
              </a>
              <a href="https://chainscan-galileo.0g.ai" target="_blank" rel="noreferrer" className="pill-secondary">
                <Radio size={15} weight="light" />
                ChainScan
              </a>
              <NavLink to="/studio" className="pill-primary">
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

function StudioFrame() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#080b0b]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-3 focus:text-sm focus:text-[#120e0b]"
      >
        Skip to content
      </a>

      <div className="absolute inset-x-0 top-0 h-72 bg-[linear-gradient(180deg,rgba(41,82,76,0.22),rgba(8,11,11,0))]" />

      <div className="relative mx-auto min-h-[100dvh] w-full max-w-[1720px] px-4 pb-12 md:px-7 lg:px-10 2xl:px-12">
        <AppHeader />

        <main id="main-content" className="pt-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="relative min-h-[100dvh] overflow-hidden bg-[#090b0a]">
            <div className="mx-auto max-w-[1440px] px-4 py-10 md:px-6 lg:px-10">
              <div className="section-shell">
                <div className="section-core grid min-h-[55dvh] place-items-center p-8">
                  <div className="max-w-md space-y-4 text-center">
                    <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-soft">Loading route</div>
                    <div className="text-3xl font-semibold tracking-[-0.05em] text-ink">Preparing the next surface.</div>
                    <div className="mx-auto h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-1/3 animate-pulse rounded-full bg-accent" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      >
        <Routes>
          <Route element={<MarketingFrame />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/architecture" element={<ArchitecturePage />} />
          </Route>
          <Route element={<StudioFrame />}>
            <Route path="/studio" element={<StudioPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
