"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import CommunitySubNav, {
  isCommunityTabId,
  type CommunityTabId,
} from "@/components/CommunitySubNav";
import InstructorNav from "@/components/InstructorNav";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import SectionCard from "@/components/ui/SectionCard";
import { SoftSkeleton } from "@/components/ui/Skeleton";
import { GOLD, GOLD_MID, NAVY, TEAL } from "@/components/ui/tokens";
import {
  AGE_BAND_OPTIONS,
  ANNOUNCEMENT_CATEGORY_LABELS,
  CASE_GENDER_LABELS,
  DISCUSSION_CATEGORIES,
  DISCUSSION_CATEGORY_LABELS,
  EVENT_TYPE_LABELS,
  formatCommunityDate,
  formatCommunityDateTime,
  KNOWLEDGE_TYPE_LABELS,
} from "@/lib/community/catalog";
import type {
  CommunityCaseGender,
  CommunityDashboardData,
  CommunityDiscussionCategory,
  CommunityMessage,
} from "@/lib/community/types";
import {
  createCaseShare,
  createDiscussionPost,
  loadCommunityDashboard,
  loadMessageThread,
  toggleLike,
} from "@/lib/repositories/community-repository";

function CommunityPageInner() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: CommunityTabId = isCommunityTabId(tabParam)
    ? tabParam
    : "announcements";

  const [data, setData] = useState<CommunityDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await loadCommunityDashboard();
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <div className="no-print">
        <InstructorNav eyebrow="COMMUNITY" />
      </div>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <header className="max-w-2xl animate-fade-up">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            SWIJ COMMUNITY
          </p>
          <h1
            className="mt-4 text-[1.85rem] font-semibold tracking-[-0.05em] sm:text-4xl"
            style={{ color: NAVY }}
          >
            コミュニティ
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-slate-600 sm:text-base">
            Sleep Wellness Institute Japan
            認定講師同士が、学び・相談・情報共有できる場です。
          </p>
        </header>

        <div className="mt-8 animate-fade-up [animation-delay:80ms]">
          <CommunitySubNav active={activeTab} />
        </div>

        {loading && (
          <div className="mt-8">
            <SoftSkeleton variant="card" />
          </div>
        )}

        {error && (
          <div className="mt-8">
            <ErrorState message={error} onRetry={() => void refresh()} />
          </div>
        )}

        {!loading && !error && data && (
          <div className="mt-8 animate-fade-up [animation-delay:120ms]">
            {activeTab === "announcements" && (
              <AnnouncementsSection items={data.announcements} />
            )}
            {activeTab === "discussions" && (
              <DiscussionsSection
                items={data.discussions}
                onChanged={() => void refresh()}
              />
            )}
            {activeTab === "cases" && (
              <CasesSection items={data.cases} onChanged={() => void refresh()} />
            )}
            {activeTab === "knowledge" && (
              <KnowledgeSection items={data.knowledge} />
            )}
            {activeTab === "events" && <EventsSection items={data.events} />}
            {activeTab === "messages" && (
              <MessagesSection threads={data.messageThreads} />
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function AnnouncementsSection({
  items,
}: {
  items: CommunityDashboardData["announcements"];
}) {
  if (!items.length) {
    return (
      <EmptyState
        eyebrow="ANNOUNCEMENTS"
        title="お知らせはまだありません"
        description="SWIJ本部からのアップデート・イベント案内がここに表示されます。"
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.18)] sm:px-6"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em]"
              style={{
                backgroundColor: "rgba(138,106,45,0.12)",
                color: GOLD_MID,
              }}
            >
              {ANNOUNCEMENT_CATEGORY_LABELS[item.category]}
            </span>
            {item.pinned ? (
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                style={{ backgroundColor: "rgba(7,20,38,0.08)", color: NAVY }}
              >
                固定
              </span>
            ) : null}
            <span className="ml-auto text-[12px] text-slate-400">
              {formatCommunityDate(item.publishedAt)}
            </span>
          </div>
          <h2
            className="mt-4 text-lg font-semibold tracking-[-0.03em]"
            style={{ color: NAVY }}
          >
            {item.title}
          </h2>
          <p className="mt-3 text-[14px] leading-7 text-slate-600">{item.body}</p>
          <p className="mt-4 text-[12px] text-slate-400">{item.authorName}</p>
        </article>
      ))}
    </div>
  );
}

function DiscussionsSection({
  items,
  onChanged,
}: {
  items: CommunityDashboardData["discussions"];
  onChanged: () => void;
}) {
  const [category, setCategory] = useState<
    CommunityDiscussionCategory | "all"
  >("all");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [postCategory, setPostCategory] =
    useState<CommunityDiscussionCategory>("sleep_science");
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    if (category === "all") return items;
    return items.filter((item) => item.category === category);
  }, [items, category]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    try {
      await createDiscussionPost({
        category: postCategory,
        title,
        body,
      });
      setTitle("");
      setBody("");
      setShowForm(false);
      onChanged();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <FilterChip
            active={category === "all"}
            label="すべて"
            onClick={() => setCategory("all")}
          />
          {DISCUSSION_CATEGORIES.map((id) => (
            <FilterChip
              key={id}
              active={category === id}
              label={DISCUSSION_CATEGORY_LABELS[id]}
              onClick={() => setCategory(id)}
            />
          ))}
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "閉じる" : "投稿する"}
        </Button>
      </div>

      {showForm ? (
        <SectionCard eyebrow="NEW POST" title="ディスカッションを投稿">
          <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            <label className="block text-sm">
              <span className="text-slate-500">カテゴリ</span>
              <select
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px]"
                value={postCategory}
                onChange={(e) =>
                  setPostCategory(e.target.value as CommunityDiscussionCategory)
                }
              >
                {DISCUSSION_CATEGORIES.map((id) => (
                  <option key={id} value={id}>
                    {DISCUSSION_CATEGORY_LABELS[id]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-500">タイトル</span>
              <input
                className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-[14px]"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="相談や共有のタイトル"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-500">本文</span>
              <textarea
                className="mt-1.5 min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-[14px] leading-7"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="学び・相談・情報共有の内容"
                required
              />
            </label>
            <Button type="submit" disabled={submitting}>
              {submitting ? "投稿中…" : "投稿する"}
            </Button>
          </form>
        </SectionCard>
      ) : null}

      {!filtered.length ? (
        <EmptyState
          eyebrow="DISCUSSIONS"
          title="まだ投稿がありません"
          description="カテゴリを選んで、最初のディスカッションを投稿しましょう。"
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => (
            <li key={item.id}>
              <Link
                href={`/community/discussions/${item.id}`}
                className="block rounded-[24px] border border-slate-200/90 bg-white px-5 py-5 transition hover:border-[#8a6a2d]/35 hover:shadow-[0_16px_40px_-36px_rgba(15,23,42,0.25)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                    style={{
                      backgroundColor: "rgba(49,95,104,0.1)",
                      color: TEAL,
                    }}
                  >
                    {DISCUSSION_CATEGORY_LABELS[item.category]}
                  </span>
                  <span className="text-[12px] text-slate-400">
                    {item.authorName} · {formatCommunityDate(item.createdAt)}
                  </span>
                </div>
                <h3
                  className="mt-3 text-[16px] font-semibold tracking-[-0.02em]"
                  style={{ color: NAVY }}
                >
                  {item.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-[14px] leading-7 text-slate-600">
                  {item.body}
                </p>
                <div className="mt-4 flex gap-4 text-[12px] text-slate-400">
                  <span>いいね {item.likeCount}</span>
                  <span>コメント {item.commentCount}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CasesSection({
  items,
  onChanged,
}: {
  items: CommunityDashboardData["cases"];
  onChanged: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [ageBand, setAgeBand] = useState<string>(AGE_BAND_OPTIONS[2]);
  const [gender, setGender] = useState<CommunityCaseGender>("unspecified");
  const [challenge, setChallenge] = useState("");
  const [intervention, setIntervention] = useState("");
  const [outcome, setOutcome] = useState("");
  const [attachmentNote, setAttachmentNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await createCaseShare({
        ageBand,
        gender,
        challenge,
        intervention,
        outcome,
        attachmentNote,
      });
      setChallenge("");
      setIntervention("");
      setOutcome("");
      setAttachmentNote("");
      setShowForm(false);
      onChanged();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLike(id: string) {
    await toggleLike("case", id);
    onChanged();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[14px] text-slate-500">
          個人が特定されないよう、匿名化した事例のみ投稿してください。画像添付は今後対応予定です。
        </p>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "閉じる" : "ケース投稿"}
        </Button>
      </div>

      {showForm ? (
        <SectionCard eyebrow="CASE SHARE" title="匿名ケースを投稿">
          <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-slate-500">年代</span>
                <select
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-[14px]"
                  value={ageBand}
                  onChange={(e) => setAgeBand(e.target.value)}
                >
                  {AGE_BAND_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-slate-500">性別</span>
                <select
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-[14px]"
                  value={gender}
                  onChange={(e) =>
                    setGender(e.target.value as CommunityCaseGender)
                  }
                >
                  {(
                    Object.keys(CASE_GENDER_LABELS) as CommunityCaseGender[]
                  ).map((key) => (
                    <option key={key} value={key}>
                      {CASE_GENDER_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm">
              <span className="text-slate-500">課題</span>
              <textarea
                className="mt-1.5 min-h-20 w-full rounded-2xl border border-slate-200 px-4 py-3 text-[14px] leading-7"
                value={challenge}
                onChange={(e) => setChallenge(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-500">介入内容</span>
              <textarea
                className="mt-1.5 min-h-20 w-full rounded-2xl border border-slate-200 px-4 py-3 text-[14px] leading-7"
                value={intervention}
                onChange={(e) => setIntervention(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-500">改善結果</span>
              <textarea
                className="mt-1.5 min-h-20 w-full rounded-2xl border border-slate-200 px-4 py-3 text-[14px] leading-7"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-500">添付メモ（任意・画像は将来）</span>
              <input
                className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-[14px]"
                value={attachmentNote}
                onChange={(e) => setAttachmentNote(e.target.value)}
                placeholder="例: 睡眠日記の抜粋を後日添付予定"
              />
            </label>
            <Button type="submit" disabled={submitting}>
              {submitting ? "投稿中…" : "投稿する"}
            </Button>
          </form>
        </SectionCard>
      ) : null}

      {!items.length ? (
        <EmptyState
          eyebrow="CASES"
          title="ケース共有はまだありません"
          description="匿名化した介入事例を投稿し、学びを循環させましょう。"
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-6"
            >
              <div className="flex flex-wrap gap-2 text-[12px] text-slate-500">
                <span>{item.ageBand}</span>
                <span>·</span>
                <span>{CASE_GENDER_LABELS[item.gender]}</span>
                <span className="ml-auto text-slate-400">
                  {formatCommunityDate(item.createdAt)}
                </span>
              </div>
              <dl className="mt-4 space-y-3 text-[14px] leading-7">
                <div>
                  <dt className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">
                    課題
                  </dt>
                  <dd className="mt-1 text-slate-700">{item.challenge}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">
                    介入
                  </dt>
                  <dd className="mt-1 text-slate-700">{item.intervention}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">
                    結果
                  </dt>
                  <dd className="mt-1 text-slate-700">{item.outcome}</dd>
                </div>
              </dl>
              {item.attachmentNote ? (
                <p className="mt-4 rounded-2xl bg-[#fafaf8] px-3 py-2 text-[12px] text-slate-500">
                  添付: {item.attachmentNote}
                </p>
              ) : null}
              <div className="mt-5 flex items-center justify-between">
                <p className="text-[12px] text-slate-400">{item.authorName}</p>
                <button
                  type="button"
                  onClick={() => void handleLike(item.id)}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-600 transition hover:border-[#8a6a2d]/40"
                  style={
                    item.likedByMe
                      ? { color: GOLD, borderColor: "rgba(138,106,45,0.4)" }
                      : undefined
                  }
                >
                  ♡ {item.likeCount}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function KnowledgeSection({
  items,
}: {
  items: CommunityDashboardData["knowledge"];
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const hay = `${item.title} ${item.description} ${item.tags.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  return (
    <div className="space-y-6">
      <label className="block">
        <span className="sr-only">ナレッジ検索</span>
        <input
          className="w-full rounded-full border border-slate-200 bg-white px-5 py-3.5 text-[14px] shadow-[0_12px_40px_-36px_rgba(15,23,42,0.3)]"
          placeholder="タイトル・タグで検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      {!filtered.length ? (
        <EmptyState
          eyebrow="KNOWLEDGE"
          title="該当する資料がありません"
          description="検索語を変えるか、本部からの配信をお待ちください。"
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => (
            <li
              key={item.id}
              className="rounded-[24px] border border-slate-200/90 bg-white px-5 py-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                  style={{
                    backgroundColor: "rgba(138,106,45,0.12)",
                    color: GOLD_MID,
                  }}
                >
                  {KNOWLEDGE_TYPE_LABELS[item.type]}
                </span>
                <span className="text-[12px] text-slate-400">
                  {formatCommunityDate(item.publishedAt)}
                </span>
              </div>
              <h3
                className="mt-3 text-[16px] font-semibold tracking-[-0.02em]"
                style={{ color: NAVY }}
              >
                {item.title}
              </h3>
              <p className="mt-2 text-[14px] leading-7 text-slate-600">
                {item.description}
              </p>
              {item.tags.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] text-slate-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              {item.href ? (
                <div className="mt-4">
                  <Button href={item.href} size="sm" variant="secondary">
                    開く
                  </Button>
                </div>
              ) : (
                <p className="mt-4 text-[12px] text-slate-400">
                  配信ファイルは準備中です
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EventsSection({
  items,
}: {
  items: CommunityDashboardData["events"];
}) {
  if (!items.length) {
    return (
      <EmptyState
        eyebrow="EVENTS"
        title="予定されているイベントはありません"
        description="勉強会・Zoom・リトリート・養成講座がここに一覧表示されます。"
      />
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-[24px] border border-slate-200/90 bg-white px-5 py-5 sm:px-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                style={{
                  backgroundColor: "rgba(49,95,104,0.1)",
                  color: TEAL,
                }}
              >
                {EVENT_TYPE_LABELS[item.type]}
              </span>
              <h3
                className="mt-3 text-[17px] font-semibold tracking-[-0.02em]"
                style={{ color: NAVY }}
              >
                {item.title}
              </h3>
              <p className="mt-2 text-[14px] leading-7 text-slate-600">
                {item.description}
              </p>
            </div>
            <div className="min-w-[10rem] text-right text-[13px] text-slate-500">
              <p>{formatCommunityDateTime(item.startsAt)}</p>
              {item.endsAt ? (
                <p className="mt-1 text-slate-400">
                  〜 {formatCommunityDateTime(item.endsAt)}
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-[12px] text-slate-500">
            <span>{item.location}</span>
            {item.capacity != null ? <span>定員 {item.capacity}名</span> : null}
          </div>
          {item.registrationUrl ? (
            <div className="mt-4">
              <Button href={item.registrationUrl} size="sm">
                申し込む
              </Button>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function MessagesSection({
  threads,
}: {
  threads: CommunityDashboardData["messageThreads"];
}) {
  const [activeId, setActiveId] = useState<string | null>(
    threads[0]?.id ?? null,
  );
  const [messages, setMessages] = useState<CommunityMessage[]>([]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    void loadMessageThread(activeId).then(setMessages);
  }, [activeId]);

  if (!threads.length) {
    return (
      <EmptyState
        eyebrow="MESSAGES"
        title="メッセージはまだありません"
        description="認定講師同士の1対1メッセージ（UIプレビュー）。送受信は今後接続予定です。"
      />
    );
  }

  const active = threads.find((t) => t.id === activeId) ?? threads[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <SectionCard eyebrow="INBOX" title="スレッド">
        <ul className="space-y-2">
          {threads.map((thread) => (
            <li key={thread.id}>
              <button
                type="button"
                onClick={() => setActiveId(thread.id)}
                className={`w-full rounded-2xl px-3.5 py-3 text-left transition ${
                  active?.id === thread.id
                    ? "bg-[#071426] text-white"
                    : "bg-[#fafaf8] hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[14px] font-semibold">{thread.peerName}</p>
                  {thread.unread > 0 ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        active?.id === thread.id
                          ? "bg-white/20 text-white"
                          : "bg-[#8a6a2d]/15 text-[#8a6a2d]"
                      }`}
                    >
                      {thread.unread}
                    </span>
                  ) : null}
                </div>
                <p
                  className={`mt-1 line-clamp-1 text-[12px] ${
                    active?.id === thread.id ? "text-white/70" : "text-slate-500"
                  }`}
                >
                  {thread.lastMessage}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        eyebrow="DIRECT"
        title={active ? `${active.peerName} さん` : "メッセージ"}
      >
        <p className="mb-4 text-[12px] text-slate-400">
          ダミーUIです。実メッセージ送受信は Version 2.1 で接続予定。
        </p>
        <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-[20px] bg-[#fafaf8] px-4 py-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.fromMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-6 ${
                  message.fromMe
                    ? "bg-[#071426] text-white"
                    : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                <p>{message.body}</p>
                <p
                  className={`mt-1.5 text-[10px] ${
                    message.fromMe ? "text-white/55" : "text-slate-400"
                  }`}
                >
                  {formatCommunityDateTime(message.sentAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            disabled
            className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] text-slate-400"
            placeholder="メッセージを入力（準備中）"
          />
          <Button disabled size="md">
            送信
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
        active
          ? "text-white"
          : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
      }`}
      style={active ? { backgroundColor: NAVY } : undefined}
    >
      {label}
    </button>
  );
}

export default function CommunityPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7f7f5]">
          <InstructorNav eyebrow="COMMUNITY" />
          <div className="mx-auto max-w-6xl px-5 py-14">
            <SoftSkeleton variant="card" />
          </div>
        </main>
      }
    >
      <CommunityPageInner />
    </Suspense>
  );
}
