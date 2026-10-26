import { Link } from "@tanstack/react-router";
import logo from "@/assets/sarj_logo.png.asset.json";
import { ViewSwitcher } from "./ViewSwitcher";
import { usePortfolio } from "@/context/PortfolioProvider";

export function Logo({ className = "h-9" }: { className?: string }) {
  return <img src={logo.url} alt="سرج sarj.ai" className={`${className} w-auto object-contain`} />;
}

export function SiteHeader() {
  const { role } = usePortfolio();
  const nav = "text-sm text-muted-foreground hover:text-foreground transition-colors";
  return (
    <header className="sticky top-0 z-40 border-b bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
        <div className="flex items-center gap-8">
          <Link to="/"><Logo /></Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/" hash="about" className={nav}>من نحن</Link>
            <Link to="/who" className={nav}>المنصة</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {role ? (
            <ViewSwitcher />
          ) : (
            <Link to="/who" className={nav}>تسجيل الدخول</Link>
          )}
          <Link
            to="/portfolio-request"
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            تحدّث مع فريقنا
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-sm text-muted-foreground">
        <span>سرج العقارية</span>
        <span>sarj.ai · الرياض، المملكة العربية السعودية</span>
      </div>
    </footer>
  );
}
