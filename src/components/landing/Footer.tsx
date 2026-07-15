import { Wordmark } from "./Nav";

export function Footer() {
  return (
    <footer id="contact" className="mx-auto max-w-7xl px-6 pb-10">
      <div className="flex flex-col items-start justify-between gap-6 border-t border-border pt-8 md:flex-row md:items-center">
        <Wordmark />
        <nav className="flex flex-wrap gap-6 text-sm text-foreground/70">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="mailto:hello@ledgerly.app">hello@ledgerly.app</a>
        </nav>
        <p className="text-xs text-foreground/50">
          © {new Date().getFullYear()} Ledgerly. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
