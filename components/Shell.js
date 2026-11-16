"use client";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

// The app frame (sidebar + top bar). The login page is shown on its own.
export default function Shell({ children }) {
  const pathname = usePathname();
  if (pathname === "/login") return <main className="flex-1">{children}</main>;
  return (
    <>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </>
  );
}
