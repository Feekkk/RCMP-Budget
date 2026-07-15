import { Wordmark } from "./Nav";

export function Footer() {
  return (
    <footer id="contact" className="mx-auto max-w-7xl px-6 pb-10">
      <div className="flex flex-col items-start justify-between gap-6 border-t border-border pt-8 md:flex-row md:items-center">
        <Wordmark />
        <p className="text-xs text-foreground/50">
          © {new Date().getFullYear()} UniKL Royal College Of Medicine. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
