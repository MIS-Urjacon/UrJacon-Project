"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useMe } from "@/lib/useMe";
import { canAccessPage, slugOf } from "@/lib/access";

// The signed-in frame. Access is re-read from the server, so a changed page list
// applies without signing in again (proxy.js only knows the list at sign-in time).
function Frame({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const me = useMe();
  useEffect(() => {
    const slug = slugOf(pathname);
    if (me && slug && !canAccessPage(me, slug)) router.replace("/dashboard");
  }, [me, pathname, router]);
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

// The app frame (sidebar + top bar). The login page is shown on its own.
export default function Shell({ children }) {
  const pathname = usePathname();
  if (pathname === "/login") return <main className="flex-1">{children}</main>;
  return <Frame>{children}</Frame>;
}
