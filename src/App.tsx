import { useEffect, useRef, useState } from 'react';
import { APP_NAME } from './config';
import { isValidDateKey } from './utils/date';
import { getPreference, getStorageState, setPreference } from './db/store';
import {
  THEME_PREFERENCE_KEY,
  DEFAULT_THEME,
  applyTheme,
  coerceThemeKey,
} from './theme/themes';
import TodayPage from './pages/TodayPage';
import CalendarPage from './pages/CalendarPage';
import JournalPage from './pages/JournalPage';
import EntryPage from './pages/EntryPage';
import AboutPage from './pages/AboutPage';
import SettingsPage from './pages/SettingsPage';
import ExportPage from './pages/ExportPage';
import { Sprig } from './components/decor';
import {
  CalendarIcon,
  CloseIcon,
  DropletIcon,
  ExportIcon,
  HomeIcon,
  InfoIcon,
  JournalIcon,
  MenuIcon,
  SettingsIcon,
} from './components/icons';

export const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';

type Route =
  | { name: 'today' }
  | { name: 'calendar' }
  | { name: 'journal' }
  | { name: 'entry'; dateKey: string }
  | { name: 'about' }
  | { name: 'settings' }
  | { name: 'export' };

function parseHash(hash: string): Route | null {
  const path = hash.startsWith('#') ? hash.slice(1) : hash;
  if (path === '' || path === '/') return { name: 'today' };
  if (path === '/calendar') return { name: 'calendar' };
  if (path === '/journal') return { name: 'journal' };
  if (path === '/about') return { name: 'about' };
  if (path === '/settings') return { name: 'settings' };
  if (path === '/export') return { name: 'export' };
  const m = /^\/entry\/([0-9-]+)$/.exec(path);
  if (m && isValidDateKey(m[1])) return { name: 'entry', dateKey: m[1] };
  return null;
}

function currentRoute(): Route {
  const route = parseHash(window.location.hash);
  if (route) return route;
  // Unknown or invalid route: redirect to Today.
  if (window.location.hash !== '#/') window.location.hash = '#/';
  return { name: 'today' };
}

const NAV_ITEMS = [
  { to: '#/', name: 'today' as const, label: 'Home', Icon: HomeIcon },
  { to: '#/calendar', name: 'calendar' as const, label: 'Calendar', Icon: CalendarIcon },
  { to: '#/journal', name: 'journal' as const, label: 'Journal', Icon: JournalIcon },
  { to: '#/export', name: 'export' as const, label: 'Export', Icon: ExportIcon },
  { to: '#/settings', name: 'settings' as const, label: 'Settings', Icon: SettingsIcon },
  { to: '#/about', name: 'about' as const, label: 'About & support', Icon: InfoIcon },
];

function NavList({
  route,
  onNavigate,
  iconOnly = false,
}: {
  route: Route;
  onNavigate?: () => void;
  iconOnly?: boolean;
}) {
  return (
    <nav aria-label="Primary">
      <ul className="nav-list">
        {NAV_ITEMS.map((l) => (
          <li key={l.to}>
            <a
              href={l.to}
              className="nav-link"
              aria-current={route.name === l.name ? 'page' : undefined}
              onClick={onNavigate}
              {...(iconOnly ? { title: l.label, 'aria-label': l.label } : {})}
            >
              <l.Icon className="nav-icon" />
              <span className="nav-label">{l.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function BrandLink() {
  return (
    <a href="#/" className="brand">
      <DropletIcon className="brand-icon" />
      <span className="brand-word">{APP_NAME}</span>
    </a>
  );
}

/** Desktop sidebar brand: clicking toggles the sidebar collapsed/expanded. */
function BrandToggle({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="brand brand-toggle"
      aria-expanded={!collapsed}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      onClick={onToggle}
    >
      <DropletIcon className="brand-icon" />
      <span className="brand-word">{APP_NAME}</span>
    </button>
  );
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => currentRoute());
  const [storageWarn, setStorageWarn] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const toggleSidebar = () => {
    setSidebarCollapsed((c) => {
      void setPreference(SIDEBAR_COLLAPSED_KEY, !c);
      return !c;
    });
  };

  useEffect(() => {
    const onHashChange = () => {
      setRoute(currentRoute());
      setDrawerOpen(false);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (getStorageState() === 'memory') setStorageWarn(true);
  }, []);

  // Restore the saved page theme (independent of mood). Async is fine —
  // the default Daybreak theme paints first, then the saved one applies.
  useEffect(() => {
    let cancelled = false;
    getPreference<string>(THEME_PREFERENCE_KEY, DEFAULT_THEME).then((t) => {
      if (!cancelled) applyTheme(coerceThemeKey(t));
    });
    getPreference<boolean>(SIDEBAR_COLLAPSED_KEY, false).then((c) => {
      if (!cancelled) setSidebarCollapsed(c === true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Drawer: Escape closes, Tab cycles inside, focus moves in on open and
  // back to the menu button on close.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        return;
      }
      if (e.key !== 'Tab' || !drawerRef.current) return;
      const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    const firstLink = drawerRef.current?.querySelector<HTMLAnchorElement>('.nav-link');
    firstLink?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      menuButtonRef.current?.focus();
    };
  }, [drawerOpen]);

  useEffect(() => {
    const titles: Record<Route['name'], string> = {
      today: 'Home',
      calendar: 'Calendar',
      journal: 'Journal',
      entry: 'Entry',
      about: 'About',
      settings: 'Settings',
      export: 'Export',
    };
    document.title = `${titles[route.name]} · ${APP_NAME}`;
  }, [route]);

  return (
    <div className={`app${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      {storageWarn && !bannerDismissed && (
        <div className="storage-banner" role="alert">
          <p>Browser storage is unavailable — entries will only last for this session.</p>
          <button type="button" className="btn btn-ghost" onClick={() => setBannerDismissed(true)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Mobile top bar (<1024px) */}
      <header className="topbar">
        <button
          ref={menuButtonRef}
          type="button"
          className="icon-button"
          aria-expanded={drawerOpen}
          aria-controls="nav-drawer"
          aria-label="Open navigation menu"
          onClick={() => setDrawerOpen(true)}
        >
          <MenuIcon className="nav-icon" />
        </button>
        <BrandLink />
      </header>

      {/* Desktop sidebar (≥1024px) */}
      <aside className="sidebar" aria-label="Site">
        <BrandToggle collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <NavList route={route} iconOnly={sidebarCollapsed} />
        <p className="sidebar-quote">
          <em>Small moments. <br />
          Bigger perspective.</em>
        </p>
        <div className="sidebar-decor" aria-hidden="true">
          <Sprig />
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div
          className="drawer-scrim"
          aria-hidden="true"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      <div
        ref={drawerRef}
        id="nav-drawer"
        className={`drawer${drawerOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        hidden={!drawerOpen}
      >
        <div className="drawer-head">
          <BrandLink />
          <button
            type="button"
            className="icon-button"
            aria-label="Close navigation menu"
            onClick={() => setDrawerOpen(false)}
          >
            <CloseIcon className="nav-icon" />
          </button>
        </div>
        <NavList route={route} onNavigate={() => setDrawerOpen(false)} />
        <p className="sidebar-quote">
          <em>Small moments. Bigger perspective.</em>
        </p>
      </div>

      <main id="main" className="app-main" tabIndex={-1}>
        {route.name === 'today' && <TodayPage />}
        {route.name === 'calendar' && <CalendarPage />}
        {route.name === 'journal' && <JournalPage />}
        {route.name === 'entry' && <EntryPage key={route.dateKey} dateKey={route.dateKey} />}
        {route.name === 'about' && <AboutPage />}
        {route.name === 'settings' && <SettingsPage />}
        {route.name === 'export' && <ExportPage />}
      </main>

      <footer className="app-footer">
        <p>
          {APP_NAME} is a personal reflection tool, not a medical app.{' '}
          <a href="#/about">About &amp; support</a> · <a href="#/settings">Settings</a>
        </p>
      </footer>
    </div>
  );
}
