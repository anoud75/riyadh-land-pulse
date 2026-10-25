import { useNavigate } from "@tanstack/react-router";
import { usePortfolio, type Role } from "@/context/PortfolioProvider";

export function ViewSwitcher() {
  const { role, setRole } = usePortfolio();
  const navigate = useNavigate();
  const go = (r: Exclude<Role, null>) => {
    setRole(r);
    navigate({ to: r === "admin" ? "/admin" : "/investor" });
  };
  const btn = (r: Exclude<Role, null>, label: string) => (
    <button
      onClick={() => go(r)}
      aria-pressed={role === r}
      className={`rounded-full px-3 py-1 text-xs transition-colors ${
        role === r ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex items-center rounded-full border bg-secondary p-0.5" role="group" aria-label="مبدل الواجهة">
      {btn("investor", "مستثمر")}
      {btn("admin", "فريق سرج")}
    </div>
  );
}
