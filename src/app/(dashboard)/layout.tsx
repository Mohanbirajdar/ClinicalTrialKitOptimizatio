import dynamic from "next/dynamic";

const Sidebar = dynamic(
  () => import("@/components/layout/sidebar").then((m) => ({ default: m.Sidebar })),
  {
    ssr: false,
    loading: () => <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r" />,
  }
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
