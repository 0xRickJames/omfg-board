"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut()}
      className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-100"
    >
      Sign out
    </button>
  );
}
