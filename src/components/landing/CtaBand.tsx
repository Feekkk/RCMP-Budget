import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export function CtaBand() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-24">
      <div className="rounded-[2.5rem] bg-foreground px-8 py-20 text-center text-background md:py-28">
        <h2 className="mx-auto max-w-3xl font-display text-5xl leading-tight md:text-7xl">
          Ready to take control of your budget?
        </h2>
        <div className="mt-10 flex justify-center">
          <Link
            to="/login"
            className="group inline-flex items-center gap-3 rounded-full bg-lime px-7 py-4 text-base font-medium text-lime-foreground transition hover:brightness-95"
          >
            Sign in to Budget Tracker
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background">
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
