import React from "react";
import type { Metadata } from "next";
import Register from "@/components/Auth/Register";
import { PublicRoute } from "@/components/Auth/RouteGuard";

// Utility page — keep it out of the search index.
export const metadata: Metadata = {
  title: "Create account",
  robots: { index: false, follow: false },
};

const page = () => {
  return (
    <PublicRoute>
      <Register />
    </PublicRoute>
  );
};

export default page;
