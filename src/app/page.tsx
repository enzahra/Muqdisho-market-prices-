"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  // Auto‑redirect to the dashboard on load – no login required
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return null;
}
