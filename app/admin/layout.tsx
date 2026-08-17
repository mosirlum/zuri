"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import {
  LayoutDashboard, Car, Users, CalendarCheck,
  ShieldAlert, DollarSign, BarChart3, MessageSquare,
  LogOut, Menu, ChevronRight, UserCog, Settings,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, roles: ["super_admin", "staff"] },
  { label: "Bookings", href: "/admin/bookings", icon: CalendarCheck, roles: ["super_admin", "staff"] },
  { label: "Fleet", href: "/admin/fleet", icon: Car, roles: ["super_admin", "staff"] },
  { label: "Drivers", href: "/admin/drivers", icon: Users, roles: ["super_admin", "staff"] },
  { label: "Compliance", href: "/admin/compliance", icon: ShieldAlert, roles: ["super_admin", "staff"] },
  { label: "Finance", href: "/admin/finance", icon: DollarSign, roles: ["super_admin"] },
  { label: "Reports", href: "/admin/reports", icon: BarChart3, roles: ["super_admin"] },
  { label: "Communication", href: "/admin/communication", icon: MessageSquare, roles: ["super_admin", "staff"] },
  { label: "Users", href: "/admin/users", icon: UserCog, roles: ["super_admin"] },
  { label: "Settings", href: "/admin/settings", icon: Settings, roles: ["super_admin", "staff"] },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/login";
    }
    if (status === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role === "driver") {
        window.location.href = "/driver";
      }
    }
  }, [status, session]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    window.location.href = "/login";
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-ink flex flex-col items-center justify-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/zuri-emblem.png" alt="Zuri" className="h-16 w-auto animate-pulse" />
        <p className="text-paper/50 text-sm tracking-widest uppercase">Loading...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const role = (session?.user as any)?.role;
  const filteredNav = navItems.filter(item => item.roles.includes(role));
  const userName = session?.user?.name || "";

  return (
    <div className="min-h-screen bg-paper-soft flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-ink text-paper flex flex-col transition-transform duration-300 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } lg:translate-x-0 lg:static lg:inset-auto`}>

        <div className="p-6 border-b border-paper/10">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/zuri-emblem.png" alt="Zuri" className="h-10 w-auto" />
            <div>
              <div className="font-display font-semibold text-lg leading-none">
                Zuri<em className="italic text-gold">.</em>
              </div>
              <div className="text-[0.5rem] tracking-[0.25em] uppercase text-paper/50 mt-1">
                Business OS
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive ? "bg-gold text-ink" : "text-paper/70 hover:text-paper hover:bg-paper/5"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
                {item.roles.includes("super_admin") && !item.roles.includes("staff") && (
                  <span className="ml-auto text-[0.55rem] tracking-widest uppercase opacity-60">Boss</span>
                )}
                {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-paper/10">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-ink font-bold text-sm flex-shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-paper truncate">{userName}</div>
              <div className="text-[0.65rem] text-paper/50 capitalize">{role?.replace("_", " ")}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-paper/60 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-ink/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-paper border-b border-ink/10 px-6 py-4 flex items-center justify-between lg:px-8">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-ink p-1">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted hidden sm:block">
              {new Date().toLocaleDateString("en-TZ", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
              })}
            </span>
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
