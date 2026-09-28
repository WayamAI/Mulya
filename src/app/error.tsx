"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";

/** Route error boundary: retry or go home. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-16">
      <div role="alert" className="w-full max-w-md rounded-xl border border-muted bg-container sm:px-4">
        <h1 className="sr-only">This page didn&apos;t load</h1>
        <EmptyState
          className="py-10"
          mark={
            <span
              aria-hidden
              className="mb-2 flex size-12 items-center justify-center rounded-full border border-error-stroke bg-error-surface text-error-icon"
            >
              <AlertTriangle size={20} strokeWidth={1.75} />
            </span>
          }
          title="This page didn't load"
          detail={
            <>
              Something went wrong on our end. You can try refreshing or head back home.
              {error.digest ? (
                <span className="mt-3 block font-mono text-caption text-quaternary">Ref {error.digest}</span>
              ) : null}
            </>
          }
          action={
            <>
              <Button
                icon={RotateCcw}
                onClick={() => {
                  router.refresh();
                  reset();
                }}
              >
                Try again
              </Button>
              {/* Full reload, as in the original, so a broken client state is discarded. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" className={buttonClass({ variant: "secondary" })}>
                <Home size={15} strokeWidth={1.75} aria-hidden />
                Go home
              </a>
            </>
          }
        />
      </div>
    </div>
  );
}
