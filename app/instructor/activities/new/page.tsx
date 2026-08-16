"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ActivityForm from "@/components/instructor-activities/ActivityForm";
import InstructorNav from "@/components/InstructorNav";
import { GOLD, NAVY } from "@/components/ui/tokens";

export default function NewInstructorActivityPage() {
  const router = useRouter();
  const [instructorName, setInstructorName] = useState("認定インストラクター");

  useEffect(() => {
    void fetch("/api/instructor/profile", { cache: "no-store" })
      .then((response) => response.json())
      .then((json: { profile?: { publicDisplayName?: string; displayName?: string } }) => {
        const name =
          json.profile?.publicDisplayName?.trim() ||
          json.profile?.displayName?.trim();
        if (name) setInstructorName(name);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      <InstructorNav />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <p
          className="text-[11px] font-semibold tracking-[0.2em]"
          style={{ color: GOLD }}
        >
          NEW EVENT
        </p>
        <h1
          className="mt-2 text-2xl font-semibold tracking-[-0.03em]"
          style={{ color: NAVY }}
        >
          新しいイベントを登録
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          公開すると、トップページと認定インストラクターの活動一覧に表示されます。
        </p>
        <div className="mt-6">
          <ActivityForm
            instructorName={instructorName}
            submitLabel="公開する"
            onSubmit={async (activity, status) => {
              const response = await fetch("/api/instructor/activities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ activity, status }),
              });
              const json = (await response.json()) as { error?: string };
              if (!response.ok) {
                throw new Error(json.error ?? "登録に失敗しました");
              }
              router.push("/instructor/activities");
              router.refresh();
            }}
          />
        </div>
      </main>
    </div>
  );
}
