"use client";

import {
  formatDeviceName,
  formatGeneratedAt,
} from "@/components/sleep-wellness-report/report-ui";

export type ReportFooterProps = {
  clientName?: string | null;
  measurementDate?: string | null;
  device: string;
  generatedAt: string;
};

export default function ReportFooter({
  clientName,
  measurementDate,
  device,
  generatedAt,
}: ReportFooterProps) {
  return (
    <footer className="swr-print-avoid swr-footer px-1 pb-2 text-center">
      <p className="text-[11px] leading-5 text-slate-400">
        Sleep Wellness Institute Japan · Sleep Wellness Report
      </p>
      <p className="mt-1 text-[11px] leading-5 text-slate-500">
        {[
          clientName ? `${clientName} 様` : null,
          measurementDate ? `測定日 ${measurementDate}` : null,
          `デバイス ${formatDeviceName(device)}`,
          `生成日 ${formatGeneratedAt(generatedAt)}`,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <p className="mt-2 text-[11px] leading-5 text-slate-400">
        本レポートは医療行為・診断ではありません。体調に不安がある場合は、必要に応じて医療機関へ相談してください。
      </p>
    </footer>
  );
}
