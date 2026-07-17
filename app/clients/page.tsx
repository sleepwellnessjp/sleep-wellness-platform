"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import InstructorNav from "@/components/InstructorNav";
import NewClientModal from "@/components/NewClientModal";
import {
  formatDisplayDate,
  getClientListItems,
  type ClientListItem,
} from "@/lib/repositories/client-repository";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [ready, setReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const refresh = async () => {
      setClients(await getClientListItems());
    };
    void refresh();
    setReady(true);

    const onUpdate = () => {
      void refresh();
    };
    window.addEventListener("storage", onUpdate);
    window.addEventListener("swij-clients-updated", onUpdate);
    return () => {
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("swij-clients-updated", onUpdate);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <InstructorNav eyebrow="CLIENTS" />

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14 lg:py-16">
        <header className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            CLIENT DIRECTORY
          </p>
          <h1
            className="mt-4 text-[1.85rem] font-semibold tracking-[-0.05em] sm:mt-5 sm:text-4xl lg:text-5xl"
            style={{ color: NAVY }}
          >
            クライアント一覧
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-slate-600 sm:mt-5 sm:text-base sm:leading-8">
            分析結果は自動で保存され、こちらで確認できます。
            氏名・登録日・最新スコアを一覧で把握できます。
          </p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full border border-[#8a6a2d]/35 bg-[#faf7f1] px-6 py-2.5 text-[13px] font-semibold transition hover:bg-[#f5efe4] sm:text-sm"
            style={{ color: GOLD }}
          >
            新規クライアント登録
          </button>
        </header>

        <div className="mt-10 space-y-3 sm:mt-12">
          {!ready ? (
            <p className="py-16 text-center text-sm text-slate-400">読み込み中...</p>
          ) : clients.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
              <p className="text-base font-semibold" style={{ color: NAVY }}>
                まだクライアントがいません
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                新規登録するか、新しい分析を完了するとここに追加されます。
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="inline-flex min-h-12 items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: NAVY }}
                >
                  新規クライアント登録
                </button>
                <Link
                  href="/analysis/new"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-3.5 text-base font-semibold transition hover:bg-slate-50"
                  style={{ color: NAVY }}
                >
                  新しい分析を作成
                </Link>
              </div>
            </div>
          ) : (
            clients.map((client) => (
              <article
                key={client.id}
                className="group flex flex-col gap-4 rounded-[24px] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.28)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_70px_-42px_rgba(15,23,42,0.32)] sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2
                      className="text-lg font-semibold tracking-[-0.03em] sm:text-xl"
                      style={{ color: NAVY }}
                    >
                      {client.name}
                    </h2>
                    <p className="text-[11px] font-medium tracking-[0.12em] text-slate-400">
                      登録 {formatDisplayDate(client.registeredAt)}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
                    <div className="rounded-2xl bg-[#fafaf8] px-4 py-3">
                      <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">
                        最新睡眠スコア
                      </p>
                      <p
                        className="mt-1 text-2xl font-semibold tracking-[-0.04em]"
                        style={{ color: NAVY }}
                      >
                        {client.latestSleepScore ?? "—"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#fafaf8] px-4 py-3">
                      <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">
                        最新分析日
                      </p>
                      <p
                        className="mt-1 text-lg font-semibold tracking-[-0.03em] sm:text-xl"
                        style={{ color: NAVY }}
                      >
                        {formatDisplayDate(client.latestAnalysisDate)}
                      </p>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/clients/${client.id}`}
                  className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full px-7 py-3.5 text-[15px] font-semibold text-white transition duration-300 group-hover:-translate-y-0.5 sm:text-sm"
                  style={{ backgroundColor: NAVY }}
                >
                  詳細を見る
                </Link>
              </article>
            ))
          )}
        </div>
      </div>

      <NewClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          void getClientListItems().then(setClients);
        }}
      />
    </main>
  );
}
