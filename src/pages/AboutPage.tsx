import { APP_NAME } from '../config';
import { WashCorner } from '../components/decor';

/**
 * About / help area: what Daydrop is, its privacy posture, and where to find
 * human support. Daydrop does not detect crisis, diagnose, or assess mental
 * health — the support information below is static and informational.
 */
export default function AboutPage() {
  return (
    <div className="page">
      <header className="page-head">
        <div className="head-decor" aria-hidden="true">
          <WashCorner />
        </div>
        <h1 className="page-title">About {APP_NAME}</h1>
      </header>

      <section className="card" aria-label={`What ${APP_NAME} is`}>
        <h2 className="section-title">A personal reflection tool</h2>
        <p>
          {APP_NAME} turns one sentence about your day into a watercolor, a gentle
          soundscape, and a square on your yearly emotional calendar. It is a
          private art journal — <strong>not a medical app</strong>.
        </p>
        <p>
          The tone suggestion is a simple local word-matching helper, not an AI
          model and not a diagnosis. Your own choice of mood always decides the
          calendar color.
        </p>
      </section>

      <section className="card" aria-label="Privacy">
        <h2 className="section-title">Your words stay on this device</h2>
        <p>
          Entries are stored only in this browser (IndexedDB). Nothing is sent to
          a server, there are no accounts, and journal text is never logged or
          shared. Clearing browser data or uninstalling the app may remove your
          entries. You can delete a single entry or all journal data at any time
          from the Journal page.
        </p>
      </section>

      <section className="card" aria-label="Support resources">
        <h2 className="section-title">If you need support</h2>
        <p>
          {APP_NAME} cannot tell when someone is struggling. If you or someone you
          know needs help, in Canada you can call or text <strong>9-8-8</strong> —
          the <strong>988 Suicide Crisis Helpline</strong>, available 24/7 in
          English and French.
        </p>
        <p>
          <a href="tel:988">Call or text 9-8-8</a>
        </p>
      </section>
    </div>
  );
}
