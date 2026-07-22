"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, TEAL } from "@/components/ui/tokens";
import {
  CASE_GENDER_LABELS,
  DISCUSSION_CATEGORY_LABELS,
  formatCommunityDate,
} from "@/lib/community/catalog";
import type {
  CommunityCaseShare,
  CommunityDiscussionPost,
} from "@/lib/community/types";
import {
  deleteCommunityContent,
  loadAdminCommunityOverview,
} from "@/lib/repositories/community-repository";

type AdminCommunityOverview = {
  discussionCount: number;
  caseCount: number;
  announcementCount: number;
  knowledgeCount: number;
  eventCount: number;
  recentDiscussions: CommunityDiscussionPost[];
  recentCases: CommunityCaseShare[];
};

export default function AdminCommunityPage() {
  const [overview, setOverview] = useState<AdminCommunityOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Auth gate (Supabase 接続時)。失敗してもローカル閲覧は継続。
      await fetch("/api/admin/community", { cache: "no-store" }).catch(
        () => undefined,
      );
      const local = await loadAdminCommunityOverview();
      setOverview(local);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleDelete(kind: "discussion" | "case", id: string) {
    setBusyId(id);
    try {
      await deleteCommunityContent(kind, id);
      await fetch("/api/admin/community", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id }),
      }).catch(() => undefined);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell
      title="Community管理"
      description="お知らせ・ディスカッション・ケース共有など、コミュニティ投稿の管理画面です。"
    >
      {loading ? (
        <div className="grid gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-[28px]" />
          ))}
        </div>
      ) : error ? (
        <SectionCard title="読み込みエラー">
          <p className="text-sm text-slate-600">{error}</p>
          <div className="mt-4">
            <Button size="sm" onClick={() => void refresh()}>
              再読み込み
            </Button>
          </div>
        </SectionCard>
      ) : overview ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="お知らせ" value={overview.announcementCount} />
            <StatCard label="ディスカッション" value={overview.discussionCount} />
            <StatCard label="ケース" value={overview.caseCount} />
            <StatCard label="ナレッジ" value={overview.knowledgeCount} />
            <StatCard label="イベント" value={overview.eventCount} />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <SectionCard eyebrow="MODERATION" title="最近のディスカッション">
              <ul className="space-y-3">
                {overview.recentDiscussions.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
                          className="text-[10px] font-semibold tracking-[0.12em]"
                          style={{ color: TEAL }}
                        >
                          {DISCUSSION_CATEGORY_LABELS[item.category]}
                        </p>
                        <p
                          className="mt-1 font-semibold tracking-[-0.02em]"
                          style={{ color: NAVY }}
                        >
                          {item.title}
                        </p>
                        <p className="mt-1 text-[12px] text-slate-500">
                          {item.authorName} ·{" "}
                          {formatCommunityDate(item.createdAt)} · いいね{" "}
                          {item.likeCount}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busyId === item.id}
                        onClick={() => void handleDelete("discussion", item.id)}
                      >
                        削除
                      </Button>
                    </div>
                  </li>
                ))}
                {!overview.recentDiscussions.length ? (
                  <li className="text-sm text-slate-500">投稿はありません</li>
                ) : null}
              </ul>
            </SectionCard>

            <SectionCard eyebrow="MODERATION" title="最近のケース共有">
              <ul className="space-y-3">
                {overview.recentCases.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
                          className="text-[10px] font-semibold tracking-[0.12em]"
                          style={{ color: GOLD }}
                        >
                          {item.ageBand} / {CASE_GENDER_LABELS[item.gender]}
                        </p>
                        <p
                          className="mt-1 line-clamp-2 text-[14px] leading-6"
                          style={{ color: NAVY }}
                        >
                          {item.challenge}
                        </p>
                        <p className="mt-1 text-[12px] text-slate-500">
                          {item.authorName} ·{" "}
                          {formatCommunityDate(item.createdAt)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busyId === item.id}
                        onClick={() => void handleDelete("case", item.id)}
                      >
                        削除
                      </Button>
                    </div>
                  </li>
                ))}
                {!overview.recentCases.length ? (
                  <li className="text-sm text-slate-500">投稿はありません</li>
                ) : null}
              </ul>
            </SectionCard>
          </div>

          <div className="mt-6">
            <SectionCard eyebrow="ACCESS" title="権限メモ">
              <ul className="space-y-2 text-[14px] leading-7 text-slate-600">
                <li>認定講師（instructor）以上のみコミュニティ利用可</li>
                <li>クライアントは /community にアクセス不可（proxy で遮断）</li>
                <li>管理者は全投稿の削除・管理が可能</li>
              </ul>
            </SectionCard>
          </div>
        </>
      ) : null}
    </AdminShell>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.18)]">
      <p
        className="text-[10px] font-semibold tracking-[0.18em]"
        style={{ color: GOLD }}
      >
        {label}
      </p>
      <p
        className="mt-3 text-3xl font-semibold tracking-[-0.04em]"
        style={{ color: NAVY }}
      >
        {value}
      </p>
    </article>
  );
}
