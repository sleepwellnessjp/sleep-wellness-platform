"use client";

import AiSourceBadge from "@/components/ai-intelligence/AiSourceBadge";
import { GOLD, NAVY, TEAL } from "@/components/ui/tokens";
import type { ResearchAiReport } from "@/lib/ai-intelligence";

export default function ResearchAiReportCard({
  report,
}: {
  report: ResearchAiReport;
}) {
  return (
    <article className="rounded-[24px] border border-[#071426]/08 bg-white px-5 py-6 sm:px-7 sm:py-7">
      <p
        className="text-[10px] font-semibold tracking-[0.22em]"
        style={{ color: GOLD }}
      >
        RESEARCH AI
      </p>
      <h3
        className="mt-2 text-[1.2rem] font-semibold tracking-[-0.03em] sm:text-[1.35rem]"
        style={{ color: NAVY }}
      >
        {report.title}
      </h3>
      <div className="mt-3 flex flex-wrap gap-2 text-[12px] text-slate-400">
        <span>期間 {report.periodLabel}</span>
        <span aria-hidden>·</span>
        <span>匿名サンプル n={report.sampleSize}</span>
        <span aria-hidden>·</span>
        <span style={{ color: TEAL }}>匿名化済み</span>
      </div>

      <p className="mt-5 text-[14px] leading-7 text-slate-700">{report.abstract}</p>

      <div className="mt-6">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">
          主要ファインディング
        </p>
        <ul className="mt-3 space-y-2">
          {report.keyFindings.map((f) => (
            <li key={f} className="flex items-start gap-2.5">
              <span
                className="mt-[0.65em] h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: GOLD }}
                aria-hidden
              />
              <span className="text-[14px] leading-7" style={{ color: NAVY }}>
                {f}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 space-y-6">
        {report.sections.map((section) => (
          <section key={section.heading}>
            <h4
              className="text-[15px] font-semibold tracking-[-0.02em]"
              style={{ color: NAVY }}
            >
              {section.heading}
            </h4>
            <p className="mt-2 text-[14px] leading-7 text-slate-600">
              {section.body}
            </p>
          </section>
        ))}
      </div>

      <div className="mt-8 border-t border-slate-100 pt-4">
        <AiSourceBadge source={report.source} />
      </div>
    </article>
  );
}
