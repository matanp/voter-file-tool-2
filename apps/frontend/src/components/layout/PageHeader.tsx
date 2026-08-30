import React from "react";

export interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
}

/**
 * Member-facing page title block. Owns the spacing between itself and the page
 * content, so call sites should not add their own margin.
 */
export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="primary-header">{title}</h1>
      {description ? (
        <p className="text-muted-foreground mt-2">{description}</p>
      ) : null}
    </div>
  );
}
