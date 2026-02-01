"use client";
import React from "react";
import { useInViewOnce } from "@/lib/useInViewOnce";

export function Reveal(props: any) {
  const {
    children,
    className = "",
    as: Tag = "div",
    delayMs = 0,
    style,
    ...rest
  } = props;

  const { ref, inView } = useInViewOnce<HTMLElement>();

  return (
    <Tag
      ref={ref}
      className={`reveal ${inView ? "is-in" : ""} ${className}`}
      style={{ transitionDelay: `${delayMs}ms`, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
