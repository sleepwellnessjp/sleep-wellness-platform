"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import InstructorNav from "@/components/InstructorNav";
import Button from "@/components/ui/Button";
import ErrorState from "@/components/ui/ErrorState";
import SectionCard from "@/components/ui/SectionCard";
import { SoftSkeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, TEAL } from "@/components/ui/tokens";
import {
  DISCUSSION_CATEGORY_LABELS,
  formatCommunityDateTime,
} from "@/lib/community/catalog";
import type {
  CommunityDiscussionComment,
  CommunityDiscussionPost,
} from "@/lib/community/types";
import {
  addDiscussionComment,
  loadDiscussionDetail,
  toggleLike,
} from "@/lib/repositories/community-repository";

export default function CommunityDiscussionDetailPage() {
  const params = useParams();
  const postId = typeof params.id === "string" ? params.id : "";

  const [post, setPost] = useState<CommunityDiscussionPost | null>(null);
  const [comments, setComments] = useState<CommunityDiscussionComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await loadDiscussionDetail(postId);
      if (!detail) {
        setError("投稿が見つかりません");
        setPost(null);
        setComments([]);
        return;
      }
      setPost(detail.post);
      setComments(detail.comments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const roots = useMemo(
    () => comments.filter((c) => !c.parentId),
    [comments],
  );

  const childrenOf = useCallback(
    (parentId: string) => comments.filter((c) => c.parentId === parentId),
    [comments],
  );

  async function handleLikePost() {
    if (!post) return;
    const result = await toggleLike("discussion_post", post.id);
    setPost({ ...post, likedByMe: result.liked, likeCount: result.likeCount });
  }

  async function handleLikeComment(comment: CommunityDiscussionComment) {
    const result = await toggleLike("discussion_comment", comment.id);
    setComments((prev) =>
      prev.map((c) =>
        c.id === comment.id
          ? { ...c, likedByMe: result.liked, likeCount: result.likeCount }
          : c,
      ),
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!post || !body.trim()) return;
    setSubmitting(true);
    try {
      await addDiscussionComment({
        postId: post.id,
        body,
        parentId: replyTo,
      });
      setBody("");
      setReplyTo(null);
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <InstructorNav eyebrow="COMMUNITY" />
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <Link
          href="/community?tab=discussions"
          className="text-[13px] font-semibold text-slate-500 transition hover:text-[#071426]"
        >
          ← ディスカッション一覧
        </Link>

        {loading ? (
          <div className="mt-8">
            <SoftSkeleton variant="card" />
          </div>
        ) : null}

        {error ? (
          <div className="mt-8">
            <ErrorState message={error} onRetry={() => void refresh()} />
          </div>
        ) : null}

        {!loading && !error && post ? (
          <div className="mt-8 space-y-6 animate-fade-up">
            <article className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 sm:px-7 sm:py-7">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                  style={{
                    backgroundColor: "rgba(49,95,104,0.1)",
                    color: TEAL,
                  }}
                >
                  {DISCUSSION_CATEGORY_LABELS[post.category]}
                </span>
                <span className="text-[12px] text-slate-400">
                  {post.authorName} · {formatCommunityDateTime(post.createdAt)}
                </span>
              </div>
              <h1
                className="mt-4 text-[1.55rem] font-semibold tracking-[-0.04em] sm:text-[1.85rem]"
                style={{ color: NAVY }}
              >
                {post.title}
              </h1>
              <p className="mt-4 whitespace-pre-wrap text-[15px] leading-8 text-slate-700">
                {post.body}
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => void handleLikePost()}
                  className="rounded-full border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-600 transition hover:border-[#8a6a2d]/40"
                  style={
                    post.likedByMe
                      ? { color: GOLD, borderColor: "rgba(138,106,45,0.45)" }
                      : undefined
                  }
                >
                  ♡ いいね {post.likeCount}
                </button>
                <span className="rounded-full bg-slate-50 px-4 py-2 text-[13px] text-slate-500">
                  コメント {post.commentCount}
                </span>
              </div>
            </article>

            <SectionCard eyebrow="COMMENTS" title="コメント・返信">
              {!roots.length ? (
                <p className="text-[14px] text-slate-500">
                  まだコメントはありません。最初のコメントを投稿しましょう。
                </p>
              ) : (
                <ul className="space-y-4">
                  {roots.map((comment) => (
                    <li key={comment.id}>
                      <CommentBlock
                        comment={comment}
                        onLike={() => void handleLikeComment(comment)}
                        onReply={() => setReplyTo(comment.id)}
                      />
                      <ul className="mt-3 space-y-3 border-l border-slate-100 pl-4">
                        {childrenOf(comment.id).map((child) => (
                          <li key={child.id}>
                            <CommentBlock
                              comment={child}
                              onLike={() => void handleLikeComment(child)}
                              onReply={() => setReplyTo(comment.id)}
                              nested
                            />
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}

              <form
                className="mt-6 space-y-3 border-t border-slate-100 pt-5"
                onSubmit={(e) => void handleSubmit(e)}
              >
                {replyTo ? (
                  <div className="flex items-center justify-between rounded-2xl bg-[#fafaf8] px-3 py-2 text-[12px] text-slate-500">
                    <span>返信モード</span>
                    <button
                      type="button"
                      className="font-semibold text-[#8a6a2d]"
                      onClick={() => setReplyTo(null)}
                    >
                      解除
                    </button>
                  </div>
                ) : null}
                <textarea
                  className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-[14px] leading-7"
                  placeholder="コメントを書く"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                />
                <Button type="submit" disabled={submitting}>
                  {submitting ? "送信中…" : replyTo ? "返信する" : "コメントする"}
                </Button>
              </form>
            </SectionCard>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function CommentBlock({
  comment,
  onLike,
  onReply,
  nested = false,
}: {
  comment: CommunityDiscussionComment;
  onLike: () => void;
  onReply: () => void;
  nested?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl px-4 py-3 ${
        nested ? "bg-white" : "bg-[#fafaf8]"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-400">
        <span className="font-semibold text-slate-600">{comment.authorName}</span>
        <span>{formatCommunityDateTime(comment.createdAt)}</span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-[14px] leading-7 text-slate-700">
        {comment.body}
      </p>
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={onLike}
          className="text-[12px] font-semibold text-slate-500"
          style={comment.likedByMe ? { color: GOLD } : undefined}
        >
          ♡ {comment.likeCount}
        </button>
        <button
          type="button"
          onClick={onReply}
          className="text-[12px] font-semibold text-slate-500"
        >
          返信
        </button>
      </div>
    </div>
  );
}
