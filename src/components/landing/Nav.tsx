import { Link } from "@tanstack/react-router";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`inline-flex items-center ${className}`}>
      <img
        src="/budget-logo.png"
        alt="Budget Tracker — UniKL Royal College Of Medicine Perak"
        className="h-12 w-auto"
      />
    </Link>
  );
}

export function Nav() {
  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Wordmark />
        <nav className="hidden items-center gap-8 text-sm text-foreground/80 md:flex">
          <a href="#features" className="hover:text-foreground">
            Features
          </a>
          <a href="#how" className="hover:text-foreground">
            How it works
          </a>
          <a href="#contact" className="hover:text-foreground">
            Contact
          </a>
        </nav>
        <Link
          to="/login"
          className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}
