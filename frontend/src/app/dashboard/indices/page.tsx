"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AllIndicesPage() {
  // Deprecated: indices moved to modal on dashboard. Redirect back to dashboard.
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return null;
}
