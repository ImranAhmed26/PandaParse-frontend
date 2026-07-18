import type { Metadata } from "next";
import AppNavbar from "@/components/Navbar/AppNavbar";
import { AppSidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/Auth/RouteGuard";

// The authenticated app is private — never index any of it.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LocaleLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="bg-gray-100 dark:bg-quadraGray">
        <div className="flex h-screen">
          <AppSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <AppNavbar />
            <main className="flex-1 overflow-auto p-4">{children}</main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
