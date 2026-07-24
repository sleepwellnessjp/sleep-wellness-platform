"use client";

import { useState } from "react";
import ClientTodayHomework from "@/components/ClientTodayHomework";
import {
  ClientDailyBreathingCard,
  ClientDailyYogaCard,
} from "@/components/ClientDailyWellnessSections";
import EmptyState from "@/components/ui/EmptyState";
import SectionCard from "@/components/ui/SectionCard";
import { GOLD, NAVY } from "@/components/ui/tokens";
import ClientPortalShell, {
  ClientPortalError,
  ClientPortalLoading,
  ClientPortalLoginGate,
  ClientPortalUnlinked,
  useClientPortalBundle,
} from "@/components/client-portal/ClientPortalShell";
import { HOMEWORK_CATEGORY_LABELS } from "@/lib/client-portal/constants";
import {
  formatHomeworkDate,
  homeworkStatusLabel,
  homeworkStatusOf,
  setOwnHomeworkCompletion,
  type ClientHomework,
} from "@/lib/repositories/client-homeworks-repository";
import { useToast } from "@/components/ui/Toast";

function MediaLink({ homework }: { homework: ClientHomework }) {
  if (homework.mediaType === "none" || !homework.mediaUrl) {
    return (
      <p className="mt-2 text-[12px] text-slate-400">
        {homework.mediaType === "video"
          ? "動画は準備中です"
          : homework.mediaType === "pdf"
            ? "PDFは準備中です"
            : null}
      </p>
    );
  }

  const label = homework.mediaType === "pdf" ? "PDFを開く" : "動画を見る";
  return (
    <a
      href={homework.mediaUrl}
      target="_blank"
      rel="noreferrer"
      className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full border border-[#8a6a2d]/30 bg-white px-4 text-[12px] font-semibold"
      style={{ color: GOLD }}
    >
      {label}
    </a>
  );
}

function HomeworkList({
  items,
  onToggle,
  busyId,
}: {
  items: ClientHomework[];
  onToggle: (id: string, next: boolean) => void;
  busyId: string | null;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        compact
        illustration="generic"
        title="宿題はまだありません"
        description="認定講師から宿題が届くと、ここに表示されます。"
      />
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const status = homeworkStatusOf(item);
        return (
          <li
            key={item.id}
            className="rounded-2xl border border-slate-200/90 bg-[#fafaf8] px-4 py-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p
                  className="text-[10px] font-semibold tracking-[0.14em]"
                  style={{ color: GOLD }}
                >
                  {HOMEWORK_CATEGORY_LABELS[item.category]}
                </p>
                <p
                  className="mt-1 text-[15px] font-semibold tracking-[-0.02em]"
                  style={{ color: NAVY }}
                >
                  {item.title}
                </p>
                {item.description ? (
                  <p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-slate-600">
                    {item.description}
                  </p>
                ) : null}
                <p className="mt-2 text-[12px] text-slate-400">
                  期限 {formatHomeworkDate(item.dueDate)} ·{" "}
                  {homeworkStatusLabel(status)}
                </p>
                <MediaLink homework={item} />
              </div>
              <label className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[#071426]/10 bg-white px-3 text-[12px] font-semibold">
                <input
                  type="checkbox"
                  checked={item.isCompleted}
                  disabled={busyId === item.id}
                  onChange={(event) =>
                    onToggle(item.id, event.target.checked)
                  }
                  className="h-4 w-4 accent-[#071426]"
                />
                完了
              </label>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function ClientHomeworkPage() {
  const { loading, needsLogin, error, bundle, reload } = useClientPortalBundle();
  const { success, error: toastError } = useToast();
  const [homeworks, setHomeworks] = useState<ClientHomework[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (loading) return <ClientPortalLoading />;
  if (needsLogin) return <ClientPortalLoginGate />;
  if (error) return <ClientPortalError message={error} onRetry={reload} />;
  if (!bundle) return <ClientPortalUnlinked />;

  const items = homeworks ?? bundle.homeworks;
  const byCategory = {
    homework: items.filter((i) => i.category === "homework"),
    breathing: items.filter((i) => i.category === "breathing"),
    yoga: items.filter((i) => i.category === "yoga"),
  };

  const onToggle = async (id: string, next: boolean) => {
    setBusyId(id);
    try {
      const updated = await setOwnHomeworkCompletion(
        id,
        next,
        bundle.data.client.id,
      );
      setHomeworks((prev) => {
        const base = prev ?? bundle.homeworks;
        return base.map((item) => (item.id === updated.id ? updated : item));
      });
      success(next ? "完了にしました" : "未完了に戻しました");
    } catch (err) {
      toastError(
        err instanceof Error ? err.message : "完了状態の更新に失敗しました",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ClientPortalShell eyebrow="HOMEWORK" title="Homework">
      <SectionCard eyebrow="TODAY" title="今日の宿題">
        <ClientTodayHomework
          clientId={bundle.data.client.id}
          onHomeworksChange={setHomeworks}
        />
      </SectionCard>

      <SectionCard eyebrow="ASSIGNED" title="認定講師からの宿題">
        <HomeworkList
          items={byCategory.homework}
          onToggle={onToggle}
          busyId={busyId}
        />
      </SectionCard>

      <SectionCard eyebrow="BREATHING" title="呼吸法">
        {byCategory.breathing.length > 0 ? (
          <HomeworkList
            items={byCategory.breathing}
            onToggle={onToggle}
            busyId={busyId}
          />
        ) : (
          <ClientDailyBreathingCard />
        )}
      </SectionCard>

      <SectionCard eyebrow="YOGA" title="メラトニンヨガ™">
        {byCategory.yoga.length > 0 ? (
          <HomeworkList
            items={byCategory.yoga}
            onToggle={onToggle}
            busyId={busyId}
          />
        ) : (
          <ClientDailyYogaCard />
        )}
      </SectionCard>
    </ClientPortalShell>
  );
}
