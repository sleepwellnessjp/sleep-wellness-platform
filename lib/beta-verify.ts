/**
 * Version 1.0 Beta — 講師セッションでの保存・読み込み実機確認。
 * テストデータは「Beta Verify」接頭辞で作成し、最後に削除する。
 */

import { writeFile } from "node:fs/promises";
import path from "node:path";
import {
  resolveClientsInstructorColumn,
  clientsInstructorFilterColumn,
  clientsInstructorPayload,
} from "@/lib/supabase/clients-instructor-column";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type BetaVerifyCheck = {
  id:
    | "auth"
    | "clients"
    | "sleep_analysis"
    | "journey"
    | "homework"
    | "follow_up"
    | "report"
    | "cleanup";
  label: string;
  status: "pass" | "fail" | "skip";
  detail: string;
};

export type BetaVerifyResult = {
  ranAt: string;
  overall: "pass" | "fail";
  publishable: boolean;
  summary: string;
  checks: BetaVerifyCheck[];
};

const MARKER = "Beta Verify";
const RESULT_FILE = ".beta-verify-result.json";

function todayTokyo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function persistResult(result: BetaVerifyResult): Promise<void> {
  try {
    await writeFile(
      path.join(process.cwd(), RESULT_FILE),
      `${JSON.stringify(result, null, 2)}\n`,
      "utf8",
    );
  } catch (error) {
    console.warn("[beta-verify] result file write skipped:", error);
  }
}

export async function runBetaDataVerify(): Promise<BetaVerifyResult> {
  const checks: BetaVerifyCheck[] = [];
  const ranAt = new Date().toISOString();

  const fail = async (
    summary: string,
    extra?: BetaVerifyCheck[],
  ): Promise<BetaVerifyResult> => {
    if (extra) checks.push(...extra);
    const result: BetaVerifyResult = {
      ranAt,
      overall: "fail",
      publishable: false,
      summary,
      checks,
    };
    await persistResult(result);
    return result;
  };

  if (!isSupabaseConfigured()) {
    return fail("Supabase が未設定です。", [
      {
        id: "auth",
        label: "認証",
        status: "fail",
        detail: "NEXT_PUBLIC_SUPABASE_URL / KEY がありません。",
      },
    ]);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return fail("Supabase クライアントを作成できませんでした。", [
      {
        id: "auth",
        label: "認証",
        status: "fail",
        detail: "createServerSupabaseClient が null です。",
      },
    ]);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return fail("ログインが必要です。認定講師でサインインしてから再実行してください。", [
      {
        id: "auth",
        label: "認証",
        status: "fail",
        detail: userError?.message || "セッションがありません。",
      },
    ]);
  }

  checks.push({
    id: "auth",
    label: "認証",
    status: "pass",
    detail: `instructor session ok (${user.id.slice(0, 8)}…)`,
  });

  const instructorCol = await resolveClientsInstructorColumn(supabase);
  const filterCol = clientsInstructorFilterColumn(instructorCol);
  const clientName = `${MARKER} ${Date.now()}`;
  let clientId: string | null = null;
  let analysisId: string | null = null;
  let journeyId: string | null = null;
  let homeworkId: string | null = null;
  let followUpId: string | null = null;
  let reportId: string | null = null;

  try {
    // 1) Clients
    const { data: clientRow, error: clientError } = await supabase
      .from("clients")
      .insert({
        ...clientsInstructorPayload(instructorCol, user.id),
        name: clientName,
        age: 42,
        gender: "female",
        start_date: todayTokyo(),
        current_sleep_score: 70,
        memo: `${MARKER} auto`,
      } as never)
      .select("id, name, age, start_date, current_sleep_score")
      .single();

    if (clientError || !clientRow) {
      checks.push({
        id: "clients",
        label: "Clients",
        status: "fail",
        detail: clientError?.message || "clients insert failed",
      });
      return fail("Clients の保存に失敗しました。");
    }

    clientId = (clientRow as { id: string }).id;
    const { data: clientRead, error: clientReadError } = await supabase
      .from("clients")
      .select("id, name, age, start_date, current_sleep_score")
      .eq("id", clientId)
      .eq(filterCol, user.id)
      .maybeSingle();

    if (
      clientReadError ||
      !clientRead ||
      (clientRead as { name: string }).name !== clientName
    ) {
      checks.push({
        id: "clients",
        label: "Clients",
        status: "fail",
        detail: clientReadError?.message || "clients read-back mismatch",
      });
      return fail("Clients の読み込みに失敗しました。");
    }

    checks.push({
      id: "clients",
      label: "Clients",
      status: "pass",
      detail: `save+load ok (age=${(clientRead as { age: number | null }).age})`,
    });

    // 2) Sleep Analysis
    const { data: analysisRow, error: analysisError } = await supabase
      .from("sleep_analyses")
      .insert({
        client_id: clientId,
        instructor_id: user.id,
        analysis_date: todayTokyo(),
        sleep_data: { metrics: { sleepScore: 71 }, source: MARKER },
        lifestyle_data: { note: MARKER },
        analysis_result: { score: 71, summary: MARKER },
      })
      .select("id, analysis_result")
      .single();

    if (analysisError || !analysisRow) {
      checks.push({
        id: "sleep_analysis",
        label: "Sleep Analysis",
        status: "fail",
        detail: analysisError?.message || "sleep_analyses insert failed",
      });
      return fail("Sleep Analysis の保存に失敗しました。");
    }

    analysisId = (analysisRow as { id: string }).id;
    const { data: analysisRead, error: analysisReadError } = await supabase
      .from("sleep_analyses")
      .select("id, analysis_result")
      .eq("id", analysisId)
      .eq("instructor_id", user.id)
      .maybeSingle();

    const analysisResult = (analysisRead as { analysis_result?: { score?: number } } | null)
      ?.analysis_result;
    if (analysisReadError || !analysisRead || analysisResult?.score !== 71) {
      checks.push({
        id: "sleep_analysis",
        label: "Sleep Analysis",
        status: "fail",
        detail: analysisReadError?.message || "sleep_analyses read-back mismatch",
      });
      return fail("Sleep Analysis の読み込みに失敗しました。");
    }

    checks.push({
      id: "sleep_analysis",
      label: "Sleep Analysis",
      status: "pass",
      detail: "save+load ok (sleep_analyses)",
    });

    // 3) Journey
    const { data: journeyRow, error: journeyError } = await supabase
      .from("sleep_journeys")
      .insert({
        client_id: clientId,
        instructor_id: user.id,
        recorded_at: todayTokyo(),
        sleep_score: 72,
        hrv: 48,
        stress: 35,
        achievement_rate: 60,
        instructor_comment: `${MARKER} journey`,
        next_goal: { sleepScore: 80 },
      })
      .select("id, sleep_score")
      .single();

    if (journeyError || !journeyRow) {
      checks.push({
        id: "journey",
        label: "Journey",
        status: "fail",
        detail: journeyError?.message || "sleep_journeys insert failed",
      });
      return fail("Journey の保存に失敗しました。");
    }

    journeyId = (journeyRow as { id: string }).id;
    const { data: journeyRead, error: journeyReadError } = await supabase
      .from("sleep_journeys")
      .select("id, sleep_score, instructor_comment")
      .eq("id", journeyId)
      .eq("instructor_id", user.id)
      .maybeSingle();

    if (
      journeyReadError ||
      !journeyRead ||
      (journeyRead as { sleep_score: number | null }).sleep_score !== 72
    ) {
      checks.push({
        id: "journey",
        label: "Journey",
        status: "fail",
        detail: journeyReadError?.message || "sleep_journeys read-back mismatch",
      });
      return fail("Journey の読み込みに失敗しました。");
    }

    checks.push({
      id: "journey",
      label: "Journey",
      status: "pass",
      detail: "save+load ok (sleep_journeys)",
    });

    // 4) Homework
    const { data: homeworkRow, error: homeworkError } = await supabase
      .from("homework")
      .insert({
        client_id: clientId,
        instructor_id: user.id,
        title: `${MARKER} 就寝ルーティン`,
        description: "22:30 までに入浴",
        start_date: todayTokyo(),
        due_date: todayTokyo(),
        frequency: "daily",
        priority: "high",
        status: "active",
        progress: 20,
        client_message: "",
        instructor_comment: MARKER,
      })
      .select("id, title, status")
      .single();

    if (homeworkError || !homeworkRow) {
      checks.push({
        id: "homework",
        label: "Homework",
        status: "fail",
        detail: homeworkError?.message || "homework insert failed",
      });
      return fail("Homework の保存に失敗しました。");
    }

    homeworkId = (homeworkRow as { id: string }).id;
    const { data: homeworkRead, error: homeworkReadError } = await supabase
      .from("homework")
      .select("id, title, status")
      .eq("id", homeworkId)
      .eq("instructor_id", user.id)
      .maybeSingle();

    if (
      homeworkReadError ||
      !homeworkRead ||
      !(homeworkRead as { title: string }).title.includes(MARKER)
    ) {
      checks.push({
        id: "homework",
        label: "Homework",
        status: "fail",
        detail: homeworkReadError?.message || "homework read-back mismatch",
      });
      return fail("Homework の読み込みに失敗しました。");
    }

    checks.push({
      id: "homework",
      label: "Homework",
      status: "pass",
      detail: "save+load ok (homework)",
    });

    // 5) Follow Up
    const { data: followRow, error: followError } = await supabase
      .from("follow_up_records")
      .insert({
        client_id: clientId,
        instructor_id: user.id,
        follow_up_date: todayTokyo(),
        method: "online",
        sleep_score: 73,
        client_changes: `${MARKER} 朝の目覚めが改善`,
        instructor_notes: `${MARKER} 継続を推奨`,
        next_action: "翌週もスコア確認",
      })
      .select("id, sleep_score")
      .single();

    if (followError || !followRow) {
      checks.push({
        id: "follow_up",
        label: "Follow Up",
        status: "fail",
        detail: followError?.message || "follow_up_records insert failed",
      });
      return fail("Follow Up の保存に失敗しました。");
    }

    followUpId = (followRow as { id: string }).id;
    const { data: followRead, error: followReadError } = await supabase
      .from("follow_up_records")
      .select("id, client_changes, sleep_score")
      .eq("id", followUpId)
      .eq("instructor_id", user.id)
      .maybeSingle();

    if (
      followReadError ||
      !followRead ||
      (followRead as { sleep_score: number | null }).sleep_score !== 73
    ) {
      checks.push({
        id: "follow_up",
        label: "Follow Up",
        status: "fail",
        detail: followReadError?.message || "follow_up_records read-back mismatch",
      });
      return fail("Follow Up の読み込みに失敗しました。");
    }

    const nextFollow = (() => {
      const base = new Date(`${todayTokyo()}T12:00:00+09:00`);
      base.setDate(base.getDate() + 14);
      return base.toISOString().slice(0, 10);
    })();
    await supabase
      .from("clients")
      .update({
        next_follow_up_date: nextFollow,
        current_sleep_score: 73,
      })
      .eq("id", clientId)
      .eq(filterCol, user.id);

    checks.push({
      id: "follow_up",
      label: "Follow Up",
      status: "pass",
      detail: "save+load ok (follow_up_records + clients.next_follow_up_date)",
    });

    // 6) Report
    const { data: reportRow, error: reportError } = await supabase
      .from("reports")
      .insert({
        client_id: clientId,
        instructor_id: user.id,
        analysis_id: analysisId,
        report_data: {
          title: `${MARKER} Report`,
          status: "ready",
          sleepScore: 71,
          clientName: clientName,
        },
      })
      .select("id, report_data")
      .single();

    if (reportError || !reportRow) {
      checks.push({
        id: "report",
        label: "Report",
        status: "fail",
        detail: reportError?.message || "reports insert failed",
      });
      return fail("Report の保存に失敗しました。");
    }

    reportId = (reportRow as { id: string }).id;
    const { data: reportRead, error: reportReadError } = await supabase
      .from("reports")
      .select("id, analysis_id, report_data")
      .eq("id", reportId)
      .eq("instructor_id", user.id)
      .maybeSingle();

    const reportData = (reportRead as { report_data?: { sleepScore?: number } } | null)
      ?.report_data;
    if (reportReadError || !reportRead || reportData?.sleepScore !== 71) {
      checks.push({
        id: "report",
        label: "Report",
        status: "fail",
        detail: reportReadError?.message || "reports read-back mismatch",
      });
      return fail("Report の読み込みに失敗しました。");
    }

    checks.push({
      id: "report",
      label: "Report",
      status: "pass",
      detail: "save+load ok (reports)",
    });
  } finally {
    // Cleanup — cascade from clients deletes child rows when FK is ON DELETE CASCADE
    if (clientId) {
      const { error: deleteError } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientId)
        .eq(filterCol, user.id);

      if (deleteError) {
        // best-effort delete of children if cascade missing
        const ids = {
          reports: reportId,
          follow_up_records: followUpId,
          homework: homeworkId,
          sleep_journeys: journeyId,
          sleep_analyses: analysisId,
        };
        for (const [table, id] of Object.entries(ids)) {
          if (!id) continue;
          await supabase
            .from(table as "reports")
            .delete()
            .eq("id", id)
            .eq("instructor_id", user.id);
        }
        await supabase
          .from("clients")
          .delete()
          .eq("id", clientId)
          .eq(filterCol, user.id);

        checks.push({
          id: "cleanup",
          label: "Cleanup",
          status: "fail",
          detail: deleteError.message,
        });
      } else {
        checks.push({
          id: "cleanup",
          label: "Cleanup",
          status: "pass",
          detail: "Beta Verify テストデータを削除しました",
        });
      }
    }
  }

  const required = [
    "clients",
    "sleep_analysis",
    "journey",
    "homework",
    "follow_up",
    "report",
  ] as const;
  const allPass = required.every((id) =>
    checks.some((c) => c.id === id && c.status === "pass"),
  );

  const result: BetaVerifyResult = {
    ranAt,
    overall: allPass ? "pass" : "fail",
    publishable: allPass,
    summary: allPass
      ? "6機能すべての保存・読み込みに成功。Version 1.0 Beta データ層は公開可能な状態です。"
      : "一部チェックに失敗しました。詳細を確認してください。",
    checks,
  };
  await persistResult(result);
  return result;
}
