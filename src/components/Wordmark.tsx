import React from "react";

/**
 * The OCRParse wordmark: "OCR" in the brand color, "Parse" in dark gray. Rendered as a
 * single inline element so it can be dropped into headings, the navbar, or auth screens
 * and inherit their font size/weight.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={className}>
      <span className="font-bold text-brandLight dark:text-brandDark">OCR</span>
      <span className="font-normal text-gray-700 dark:text-gray-300">Parse</span>
    </span>
  );
}
