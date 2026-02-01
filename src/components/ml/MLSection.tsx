import React from "react";

type Props = {
  title?: string;
  linkText?: string;
  linkHref?: string;
  className?: string;
  children: React.ReactNode;
};

export function MLSection({
  title,
  linkText,
  linkHref,
  className = "",
  children,
}: Props) {
  return (
    <section className={`ml-section ${className}`}>
      <div className="ml-container">
        <div className="ml-module ml-module-pad">
          {(title || (linkText && linkHref)) && (
            <div className="ml-module-head">
              <h2 className="ml-title">{title}</h2>
              {linkText && linkHref && (
                <a className="ml-link" href={linkHref}>
                  {linkText}
                </a>
              )}
            </div>
          )}
          <div className={title ? "mt-4" : ""}>{children}</div>
        </div>
      </div>
    </section>
  );
}
