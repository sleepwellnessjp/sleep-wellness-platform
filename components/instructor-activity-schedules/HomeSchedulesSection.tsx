import { formatScheduleDateLabel } from "@/lib/instructor-activity-schedules/format";
import type { PublicActivityScheduleItem } from "@/lib/instructor-activity-schedules/types";

export default function HomeSchedulesSection({
  schedules,
}: {
  schedules: PublicActivityScheduleItem[];
}) {
  return (
    <section className="relative overflow-hidden bg-[#071426] pb-16 sm:pb-20">
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <p className="text-[11px] font-semibold tracking-[0.28em] text-[#d8b36a]">
          INSTRUCTOR SCHEDULE
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
          認定インストラクターの活動予定
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
          認定インストラクターの今後の活動です。各予定を開くと、講師のホームページまたは
          Instagram 等へ移動します。
        </p>
        {schedules.length > 0 ? (
          <ol className="mt-8 divide-y divide-white/10 border-y border-white/10">
            {schedules.map((item) => (
              <li key={item.id}>
                <a
                  href={item.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block py-4 transition hover:bg-white/[0.04] sm:py-5"
                >
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-[#d8b36a]">
                    {formatScheduleDateLabel(item.activityDate)}
                    <span className="ml-3 font-medium tracking-normal text-white/55">
                      {item.instructorName}
                    </span>
                  </p>
                  <p className="mt-1.5 text-base font-semibold text-white sm:text-lg">
                    {item.title}
                  </p>
                  {item.summary ? (
                    <p className="mt-1 text-sm leading-6 text-white/65">
                      {item.summary}
                    </p>
                  ) : null}
                </a>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-8 text-sm text-white/55">
            現在、公開中の活動予定はありません。
          </p>
        )}
      </div>
    </section>
  );
}
