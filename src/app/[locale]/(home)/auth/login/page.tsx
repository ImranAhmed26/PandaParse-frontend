import React from "react";
import type { Metadata } from "next";
import Login from "@/components/Auth/Login";
import { PublicRoute } from "@/components/Auth/RouteGuard";

// Utility page — keep it out of the search index.
export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

const page = () => {
  return (
    <PublicRoute>
      <Login />
    </PublicRoute>
  );
};

export default page;
