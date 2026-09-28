"use client";

import { useRef, useState } from "react";
import { Database, FileSpreadsheet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Mark } from "@/components/ui/mark";
import { cx } from "@/lib/format";

/** Catalogue drop target: drag highlight, file picker, and the picked file's name. */
export function CatalogueDropZone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [file, setFile] = useState<string | null>(null);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const dropped = event.dataTransfer.files?.[0];
        if (dropped) setFile(dropped.name);
      }}
      className={cx(
        "flex flex-col items-center rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors duration-[150ms] sm:px-6 sm:py-12",
        over ? "border-info-icon bg-info-surface" : "border-default bg-raised hover:border-active",
      )}
    >
      <Mark
        id="mark-catalogue"
        size={72}
        className={cx("transition-transform duration-[150ms] motion-reduce:transition-none", over && "-translate-y-1 scale-105")}
      />
      <p className="mt-3 text-label-md text-primary">
        Drop a catalogue file here: .csv, .xlsx, or connect a database
      </p>
      <p className="mt-1 text-body-sm text-quaternary">One row per historical part, with the columns below.</p>
      {file ? (
        <span className="mt-4 inline-flex h-7 max-w-full items-center gap-2 rounded-full border border-info-stroke bg-container pr-1 pl-3 text-label-sm text-primary">
          <FileSpreadsheet size={14} strokeWidth={1.75} aria-hidden className="shrink-0 text-info-icon" />
          <span className="min-w-0 truncate">{file}</span>
          <span className="shrink-0 text-quaternary">· ready to map</span>
          <Button variant="ghost" size="sm" icon={X} aria-label="Remove file" className="size-6" onClick={() => setFile(null)} />
        </span>
      ) : null}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button variant="secondary" icon={FileSpreadsheet} onClick={() => inputRef.current?.click()}>
          Browse files
        </Button>
        <Button variant="ghost" icon={Database}>
          Connect database
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const picked = event.target.files?.[0];
          if (picked) setFile(picked.name);
          event.target.value = "";
        }}
      />
    </div>
  );
}
