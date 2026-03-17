"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard, FlaskConical, MapPin, Package,
  Truck, ClipboardList, BarChart3, Bell, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trials", label: "Trials", icon: FlaskConical },
  { href: "/sites", label: "Sites", icon: MapPin },
  { href: "/inventory", label: "Kit Inventory", icon: Package },
  { href: "/shipments", label: "Shipments", icon: Truck },
  { href: "/usage", label: "Kit Usage", icon: ClipboardList },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/alerts", label: "Alerts", icon: Bell },
];

function useCurrentPath() {
  const [path, setPath] = useState("");

  useEffect(() => {
    setPath(window.location.pathname);

    // Detect Next.js client-side navigation via History API
    const orig = {
      push: history.pushState.bind(history),
      replace: history.replaceState.bind(history),
    };

    const update = () => setPath(window.location.pathname);

    history.pushState = function (...args) {
      orig.push(...args);
      update();
    };
    history.replaceState = function (...args) {
      orig.replace(...args);
      update();
    };

    window.addEventListener("popstate", update);

    return () => {
      history.pushState = orig.push;
      history.replaceState = orig.replace;
      window.removeEventListener("popstate", update);
    };
  }, []);

  return path;
}

export function Sidebar() {
  const pathname = useCurrentPath();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
      <div className="flex h-16 items-center gap-2 px-6 border-b border-sidebar-border">
        <Activity className="h-6 w-6 text-sidebar-primary" />
        <div>
          <p className="text-sidebar-foreground font-bold text-sm leading-tight">ClinKit</p>
          <p className="text-sidebar-foreground/60 text-xs">Trial Kit Manager</p>
        </div>
      </div>
      <nav className="flex flex-col gap-1 p-3 mt-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname
            ? href === "/" ? pathname === "/" : pathname.startsWith(href)
            : false;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
