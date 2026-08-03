/**
 * Score-first → AI本文非同期 → DB保存 → PDF準備の進行制御。
 * 「AI分析開始」から結果画面表示までを 3 秒以内にすることを目的とする。
 */

import {
  buildScoreFirstAnalysisResult,
  mergeAiNarrativeIntoScoreFirstResult,
} from "@/lib/analysis-fast-path";
import {
  AnalysisError,
  getPendingAnalysisRequest,
  hydrateAnalysisSession,
  peekPendingAnalysisImages,
  runPendingAnalysis,
  setPendingAnalysisRequest,
  type AnalysisResult,
} from "@/lib/analysis-session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { saveAnalysisToRepository } from "@/lib/repositories/client-repository";
import { userMessageFromUnknown } from "@/lib/data-access-errors";

export type ProgressiveAnalysisBootstrap = {
  preliminary: AnalysisResult;
  images: string[];
};

/** 進行中ジョブのフィンガープリント（クライアント×測定日） */
let sharedJobKey: string | null = null;
let sharedBackgroundCompletion: Promise<AnalysisResult> | null = null;
let sharedBootstrap: ProgressiveAnalysisBootstrap | null = null;

function requestJobKey(): string | null {
  const request = getPendingAnalysisRequest();
  if (!request) return null;
  const clientId = request.lifestyle.clientId?.trim() || "anon";
  const date = request.lifestyle.measurementDate?.trim() || "";
  const score = request.seedScore ?? "noscore";
  return `${clientId}|${date}|${score}`;
}

/** 新しい分析開始時に共有ジョブを破棄する（5秒窓の取り違え防止） */
export function resetProgressiveAnalysisJobs() {
  sharedJobKey = null;
  sharedBootstrap = null;
  sharedBackgroundCompletion = null;
}

/**
 * Score を即時確定し、結果画面表示用の暫定結果を session に載せる。
 * AI / DB / PDF は startProgressiveAnalysisBackground で後続実行。
 */
export function bootstrapScoreFirstAnalysis(): ProgressiveAnalysisBootstrap {
  const jobKey = requestJobKey();
  if (sharedBootstrap && sharedJobKey && jobKey && sharedJobKey === jobKey) {
    return sharedBootstrap;
  }

  const request = getPendingAnalysisRequest();
  if (!request) {
    throw new AnalysisError(
      "分析データが見つかりません。最初から入力してください。",
      { errorType: "Validation Error" },
    );
  }

  const preliminary = buildScoreFirstAnalysisResult(request);

  // seed を pending request に埋め込み、AI 側でスコアを整合させる
  setPendingAnalysisRequest({
    ...request,
    seedScore: preliminary.score,
    seedScoreBreakdown: preliminary.scoreBreakdown,
    seedCategoryScores: preliminary.categoryScores,
  });

  const images = peekPendingAnalysisImages();
  hydrateAnalysisSession(preliminary, {
    images: images.length > 0 ? images : undefined,
    notify: true,
  });

  sharedJobKey = requestJobKey();
  sharedBootstrap = { preliminary, images };
  return sharedBootstrap;
}

async function persistAndConsumeCredit(
  result: AnalysisResult,
): Promise<AnalysisResult> {
  let savedRef: { clientId: string; analysisId: string } | null = null;
  try {
    savedRef = await saveAnalysisToRepository(result);
  } catch (saveError) {
    console.error("Failed to save analysis:", saveError);
    // 前回の analysisId を付け替えない（誤った履歴紐付けを防ぐ）
    if (isSupabaseConfigured()) {
      throw new AnalysisError(
        `分析結果の保存に失敗しました。クレジットは消費していません。${userMessageFromUnknown(saveError)}`,
        {
          errorType: "Save Error",
          details:
            saveError instanceof Error
              ? saveError.message
              : String(saveError),
        },
      );
    }
    // デモ/ローカル: 保存失敗でも結果表示は継続（analysisId なし）
    return result;
  }

  if (!savedRef) return result;

  result.clientId = savedRef.clientId;
  result.analysisId = savedRef.analysisId;
  hydrateAnalysisSession(result);

  void fetch("/api/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "analysis_run",
      resourceType: "analysis",
      resourceId: savedRef.analysisId,
      summary: "睡眠分析を実行・保存しました",
      payload: { clientId: savedRef.clientId },
    }),
  }).catch(() => undefined);

  try {
    const creditResponse = await fetch("/api/platform/consume-credit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName: result.clientName ?? "睡眠分析",
        measurementDate: result.measurementDate,
        sleepScore:
          typeof result.metrics?.sleepScore === "number"
            ? result.metrics.sleepScore
            : result.score,
        clientId: savedRef.clientId,
        analysisId: savedRef.analysisId,
      }),
    });

    if (!creditResponse.ok) {
      const payload = (await creditResponse.json().catch(() => null)) as {
        error?: string;
      } | null;
      console.error("Credit consume failed:", payload);
    }
  } catch (creditError) {
    console.error("Failed to consume analysis credit:", creditError);
  }

  return result;
}

/**
 * 結果画面表示後に AI 本文生成 → マージ → DB 保存を非同期実行する。
 * PDF（印刷レイアウト）は結果画面側で contentStatus=ready 後に利用可能になる。
 * リロード時は同一リクエストがあれば再開する。
 */
export function startProgressiveAnalysisBackground(
  preliminary: AnalysisResult,
  images: string[] = [],
): Promise<AnalysisResult> {
  const jobKey = requestJobKey();
  if (
    sharedBackgroundCompletion &&
    sharedJobKey &&
    jobKey &&
    sharedJobKey === jobKey
  ) {
    return sharedBackgroundCompletion;
  }

  sharedJobKey = jobKey;
  sharedBackgroundCompletion = (async () => {
    try {
      const aiResult = await runPendingAnalysis();
      const merged = mergeAiNarrativeIntoScoreFirstResult(
        preliminary,
        aiResult,
      );
      hydrateAnalysisSession(merged, {
        images: images.length > 0 ? images : undefined,
        notify: true,
      });

      try {
        const persisted = await persistAndConsumeCredit(merged);
        persisted.contentStatus = "ready";
        hydrateAnalysisSession(persisted, {
          images: images.length > 0 ? images : undefined,
          notify: true,
        });
        return persisted;
      } catch (saveError) {
        // 保存・クレジット失敗でも AI 本文は結果/PDF に残す（未ログイン時など）
        console.error("Background analysis save failed:", saveError);
        merged.contentStatus = "ready";
        hydrateAnalysisSession(merged, {
          images: images.length > 0 ? images : undefined,
          notify: true,
        });
        return merged;
      }
    } catch (error) {
      const failed: AnalysisResult = {
        ...preliminary,
        contentStatus: "error",
      };
      hydrateAnalysisSession(failed, {
        images: images.length > 0 ? images : undefined,
        notify: true,
      });
      throw error;
    } finally {
      sharedBackgroundCompletion = null;
      if (sharedJobKey === jobKey) {
        sharedBootstrap = null;
      }
    }
  })();

  return sharedBackgroundCompletion;
}
