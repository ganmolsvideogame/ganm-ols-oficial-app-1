"use client";

import { useEffect } from "react";

export default function DedicatedFlowGuard() {
  useEffect(() => {
    document.body.classList.add("listing-flow-dedicated");

    return () => {
      document.body.classList.remove("listing-flow-dedicated");
    };
  }, []);

  return null;
}
