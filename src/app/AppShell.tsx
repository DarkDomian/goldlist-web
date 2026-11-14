import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { listCards } from "@/data/cardRepository";
import { selectDue } from "@/domain/selectors";
import { useServices } from "@/services/ServicesContext";
import { UpdatePrompt } from "@/ui/UpdatePrompt";
import { useNow } from "@/ui/useNow";

const navItems = [
  { to: "/today", label: "Today" },
  { to: "/distillation", label: "Distill" },
  { to: "/archive", label: "Archive" },
  { to: "/settings", label: "Settings" },
];

export function useDueCount(): number {
  const { database } = useServices();
  const now = useNow();
  const cards = useLiveQuery(() => listCards(database), [database]) ?? [];
  return selectDue(cards, now).length;
}

export function AppShell({ children }: { children: ReactNode }) {
  const dueCount = useDueCount();

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="app-header">
        <NavLink to="/today" className="app-header__brand">
          <span className="app-header__mark" aria-hidden="true" />
          <span>GoldList</span>
        </NavLink>
        <span className="app-header__tagline">your word notebook</span>
      </header>
      <main id="main-content" className="app-main">
        <UpdatePrompt />
        {children}
      </main>
      <nav className="bottom-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `bottom-nav__link${isActive ? " bottom-nav__link--active" : ""}`
            }
          >
            <span>{item.label}</span>
            {item.to === "/distillation" && dueCount > 0 ? (
              <span className="bottom-nav__badge" data-testid="due-badge">
                {dueCount}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
