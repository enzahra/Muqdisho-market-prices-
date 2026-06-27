"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { parseAdminRoles } from "@/lib/admin-role";
import { verifyAdminAuth } from "@/lib/admin-client";

export default function AdminRouter() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const user = await verifyAdminAuth();
      if (!user) {
        router.push("/admin-login?error=" + encodeURIComponent("Fadlan geli email-kaaga iyo password-kaaga."));
        return;
      }
      const roles = parseAdminRoles(user.adminRole);
      const first = roles.includes("ALL") ? "animals" : roles[0];
      router.push(`/admin/${first}`);
    })();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <div className="loader-orb"></div>
      <style jsx>{`
        .loader-orb {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: 4px solid #e2e8f0;
          border-top-color: #1e3a8a;
          animation: spin 1s infinite linear;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
