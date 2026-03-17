import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Suspense fallback={<aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r" />}>
        <Sidebar />
      </Suspense>
      <main className="flex-1 ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
