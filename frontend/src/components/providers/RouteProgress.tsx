"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";

export default function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    NProgress.configure({ showSpinner: false, trickleSpeed: 120 });
  }, []);

  useEffect(() => {
    NProgress.start();
    const t = setTimeout(() => NProgress.done(), 300);
    return () => clearTimeout(t);
    // We intentionally depend on both to catch shallow and query changes
  }, [pathname, searchParams]);

  return null;
}
