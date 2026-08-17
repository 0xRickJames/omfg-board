"use client";

import { useEffect, useState } from "react";

/** Debounced search box — types locally at full speed, propagates (and
 *  updates the URL, via the parent's onChange) 300ms after typing stops. */
export default function TicketSearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [text, setText] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  // value comes from outside (URL load, "Clear filters") — resync when it changes.
  if (value !== prevValue) {
    setPrevValue(value);
    setText(value);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (text !== value) onChange(text);
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <input
      type="search"
      value={text}
      onChange={(e) => setText(e.target.value)}
      placeholder="Search tickets…"
      className="min-w-40 flex-1 rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 sm:max-w-64"
    />
  );
}
