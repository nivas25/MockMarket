"use client";

import { SWRConfig } from "swr";
import React from "react";

export default function SWRProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: true,
        dedupingInterval: 5000,
        provider: () => new Map(),
        shouldRetryOnError: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
