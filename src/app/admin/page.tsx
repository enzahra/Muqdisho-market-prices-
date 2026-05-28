"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { normalizeAdminRole, isAdminAccount } from "@/lib/admin-role";

export default function AdminRouter() {
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push("/admin-login");
      return;
    }

    const currentUser = JSON.parse(storedUser);
    if (!isAdminAccount(currentUser)) {
      localStorage.removeItem('user');
      router.push("/admin-login?error=Koontadaada%20ma%20laha%20xuquuqda%20Admin-ka.%20Fadlan%20ku%20gal%20akoon%20Admin%20ah.");
      return;
    }

    const role = normalizeAdminRole(currentUser.adminRole);
    if (role === "ALL") {
      router.push("/admin/animals");
    } else {
      router.push(`/admin/${role}`);
    }
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
