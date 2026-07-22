"use client";

import OsShell from "@/components/os/OsShell";
import { getEnterpriseDemoDashboard } from "@/lib/os/enterprise-demo";
import { GOLD, NAVY, TEAL } from "@/components/ui/tokens";

export default function EnterpriseHomePage() {
  const data = getEnterpriseDemoDashboard();

  const kpis = [
    {
      id: "employees",
      eyebrow: "EMPLOYEES",
      title: "社員数",
      value: String(data.employeeCount),
      unit: "名",
    },
    {
      id: "coverage",
      eyebrow: "COVERAGE",
      title: "分析実施率",
      value: String(data.analysisCoverage),
      unit: "%",
    },
    {
      id: "score",
      eyebrow: "SCORE",
      title: "平均Score",
      value: data.averageScore.toFixed(1),
      unit: "",
    },
    {
      id: "improvement",
      eyebrow: "IMPROVEMENT",
      title: "改善率",
      value: String(data.improvementRate),
      unit: "%",
    },
  ];

  return (
    <OsShell role="enterprise">
      <header className="mb-10">
        <p
          className="text-[11px] font-semibold tracking-[0.28em]"
          style={{ color: GOLD }}
        >
          ENTERPRISE · SLEEP WELLNESS OS
        </p>
        <h1
          className="mt-3 text-[1.85rem] font-semibold tracking-[-0.05em] sm:text-4xl"
          style={{ color: NAVY }}
        >
          企業ダッシュボード
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-600">
          社員の睡眠ウェルネス状況を、実施率・スコア・改善率・部署比較で把握します。
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <article
            key={kpi.id}
            id={kpi.id}
            className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.18)]"
          >
            <p
              className="text-[10px] font-semibold tracking-[0.2em]"
              style={{ color: GOLD }}
            >
              {kpi.eyebrow}
            </p>
            <p className="mt-3 text-[15px] font-semibold" style={{ color: NAVY }}>
              {kpi.title}
            </p>
            <p
              className="mt-4 text-3xl font-semibold tracking-[-0.04em] tabular-nums"
              style={{ color: NAVY }}
            >
              {kpi.value}
              {kpi.unit ? (
                <span className="ml-1 text-base font-medium text-slate-400">
                  {kpi.unit}
                </span>
              ) : null}
            </p>
          </article>
        ))}
      </div>

      <section id="departments" className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p
              className="text-[10px] font-semibold tracking-[0.2em]"
              style={{ color: GOLD }}
            >
              DEPARTMENTS
            </p>
            <h2
              className="mt-2 text-xl font-semibold tracking-[-0.03em]"
              style={{ color: NAVY }}
            >
              部署比較
            </h2>
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white">
          <div className="grid grid-cols-[1.4fr_repeat(4,0.7fr)] gap-2 border-b border-slate-100 bg-[#fafaf8] px-5 py-3 text-[11px] font-semibold tracking-[0.08em] text-slate-400">
            <span>部署</span>
            <span className="text-right">社員</span>
            <span className="text-right">実施率</span>
            <span className="text-right">平均</span>
            <span className="text-right">改善率</span>
          </div>
          <ul>
            {data.departments.map((dept) => (
              <li
                key={dept.id}
                className="grid grid-cols-[1.4fr_repeat(4,0.7fr)] gap-2 border-b border-slate-100 px-5 py-4 last:border-0"
              >
                <span
                  className="text-[14px] font-semibold"
                  style={{ color: NAVY }}
                >
                  {dept.name}
                </span>
                <span className="text-right text-[14px] tabular-nums text-slate-600">
                  {dept.employeeCount}
                </span>
                <span className="text-right text-[14px] tabular-nums text-slate-600">
                  {dept.analysisCoverage}%
                </span>
                <span
                  className="text-right text-[14px] font-semibold tabular-nums"
                  style={{ color: TEAL }}
                >
                  {dept.averageScore.toFixed(1)}
                </span>
                <span className="text-right text-[14px] tabular-nums text-slate-600">
                  {dept.improvementRate}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </OsShell>
  );
}
