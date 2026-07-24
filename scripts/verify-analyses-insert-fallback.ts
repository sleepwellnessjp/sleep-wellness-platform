import {
  insertAnalysisWithSchemaFallback,
  missingAnalysesColumnFromError,
} from "../lib/repositories/analyses-insert";

async function main() {
  const col = missingAnalysesColumnFromError({
    code: "PGRST204",
    message:
      "Could not find the 'analysis_date' column of 'analyses' in the schema cache",
  });
  if (col !== "analysis_date") {
    throw new Error(`parse failed: ${col}`);
  }

  const attempts: string[][] = [];
  const supabase = {
    from() {
      return {
        insert(payload: Record<string, unknown>) {
          attempts.push(Object.keys(payload).sort());
          return {
            select() {
              return {
                async single() {
                  if ("analysis_date" in payload) {
                    return {
                      data: null,
                      error: {
                        code: "PGRST204",
                        message:
                          "Could not find the 'analysis_date' column of 'analyses' in the schema cache",
                      },
                    };
                  }
                  return { data: { id: "analysis-ok" }, error: null };
                },
              };
            },
          };
        },
      };
    },
  };

  const row = await insertAnalysisWithSchemaFallback(supabase as never, {
    client_id: "c1",
    owner_id: "u1",
    analyzed_at: new Date().toISOString(),
    analysis_date: "2026-07-24",
    sleep_onset_time: "23:00",
    sleep_score: 80,
    ocr_data: { confirmed: {} },
    confirmed_metrics: {},
    report_payload: {},
    ai_result: {},
    credits_consumed: 0,
  });

  if (row.id !== "analysis-ok") throw new Error("bad id");
  if (attempts.length !== 2) {
    throw new Error(`expected 2 attempts, got ${attempts.length}`);
  }
  if (attempts[1].includes("analysis_date")) {
    throw new Error("analysis_date still sent on retry");
  }
  if (attempts[1].includes("sleep_onset_time")) {
    throw new Error("structured cols still sent on retry");
  }

  console.log(
    JSON.stringify({
      ok: true,
      attempts: attempts.length,
      secondKeys: attempts[1],
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
