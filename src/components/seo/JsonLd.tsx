import React from "react";

/**
 * Renders a JSON-LD structured-data block. Server component — safe to place anywhere in
 * the tree. `<` is escaped so a value can never prematurely close the <script> element.
 */
export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
