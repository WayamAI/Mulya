import { ArrowLeft, Search } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Mark } from "@/components/ui/mark";
import { EmptyState } from "@/components/ui/primitives";

/** 404 for unknown routes. */
export default function NotFound() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-muted bg-container sm:px-4">
        <h1 className="sr-only">Page not found</h1>
        <EmptyState
          className="py-10"
          mark={
            <div className="mb-2 flex flex-col items-center gap-2">
              <Mark id="mark-not-found" size={120} />
              <span className="font-display text-display-metric tabular text-primary">404</span>
            </div>
          }
          title="Page not found"
          detail="The page you're looking for doesn't exist or has been moved."
          action={
            <>
              <ButtonLink href="/" variant="primary" icon={ArrowLeft}>
                Go home
              </ButtonLink>
              <ButtonLink href="/library" variant="secondary" icon={Search}>
                Browse parts
              </ButtonLink>
            </>
          }
        />
      </div>
    </div>
  );
}
