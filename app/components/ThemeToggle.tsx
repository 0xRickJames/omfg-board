"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    // Reading the class set by layout.tsx's pre-hydration script — genuinely
    // external state, unavailable during SSR/render (no `document`).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  }

  // Render a stable placeholder until mounted — the real state lives on
  // the DOM class set by the inline script in layout.tsx, not SSR markup.
  if (isDark === null) {
    return <span className="inline-block w-14" />;
  }

  return (
    <button
      onClick={toggle}
      className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-100"
    >
      {isDark ? "Light mode" : "Dark mode"}
    </button>
  );
}
