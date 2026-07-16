type Step = 1 | 2 | 3;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "入力" },
  { n: 2, label: "分析" },
  { n: 3, label: "結果" },
];

export default function AnalysisFlow({
  current,
  variant = "light",
}: {
  current: Step;
  variant?: "light" | "dark";
}) {
  const isDark = variant === "dark";

  return (
    <nav
      aria-label="分析の進行状況"
      className="flex items-center justify-center gap-2 sm:gap-3"
    >
      {STEPS.map((step, index) => {
        const done = step.n < current;
        const active = step.n === current;

        return (
          <div key={step.n} className="flex items-center gap-2 sm:gap-3">
            {index > 0 && (
              <span
                className={`hidden h-px w-6 sm:block ${
                  isDark
                    ? done || active
                      ? "bg-[#d8b36a]/45"
                      : "bg-white/15"
                    : done || active
                      ? "bg-[#8a6a2d]/50"
                      : "bg-slate-200"
                }`}
                aria-hidden
              />
            )}
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${
                  isDark
                    ? active
                      ? "bg-[#d8b36a] text-[#071426]"
                      : done
                        ? "bg-white/20 text-white"
                        : "bg-white/10 text-white/40"
                    : active
                      ? "bg-[#071426] text-white"
                      : done
                        ? "bg-[#8a6a2d]/15 text-[#8a6a2d]"
                        : "bg-slate-100 text-slate-400"
                }`}
              >
                {done ? "✓" : step.n}
              </span>
              <span
                className={`text-xs font-medium sm:text-sm ${
                  isDark
                    ? active
                      ? "text-white"
                      : done
                        ? "text-[#d8b36a]"
                        : "text-white/40"
                    : active
                      ? "text-[#071426]"
                      : done
                        ? "text-[#8a6a2d]"
                        : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
