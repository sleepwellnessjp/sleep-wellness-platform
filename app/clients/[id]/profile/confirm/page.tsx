"use client";

import ClientProfileConfirmView from "@/components/client-profile/ClientProfileConfirmView";
import { useParams } from "next/navigation";

export default function ClientProfileConfirmPage() {
  const params = useParams();
  const clientId = typeof params.id === "string" ? params.id : "";

  if (!clientId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
        <p className="text-sm text-slate-400">クライアントIDが不正です</p>
      </main>
    );
  }

  return <ClientProfileConfirmView clientId={clientId} />;
}
