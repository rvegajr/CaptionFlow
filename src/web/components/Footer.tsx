/** Single source of truth for the public footer (legal links + support email). */
export function Footer() {
  return (
    <footer className="site-footer">
      <p>
        &copy; {new Date().getFullYear()} CaptionFlow ·{' '}
        <a href="/legal/privacy.html">Privacy</a> ·{' '}
        <a href="/legal/terms.html">Terms</a> ·{' '}
        <a href="mailto:support@captionflow.app">support@captionflow.app</a>
      </p>
    </footer>
  );
}
