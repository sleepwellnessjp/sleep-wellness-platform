import AdminShell from "@/components/AdminShell";
import YogaFestSoxaiAdminRegistrations from "@/components/yoga-fest-2026/YogaFestSoxaiAdminRegistrations";

export default function AdminYogaFest2026SoxaiPage() {
  return (
    <AdminShell
      title="ヨガフェスタ SOXAI 参加登録"
      description="スマートリング検証実験の参加登録一覧・CSV出力・削除"
    >
      <YogaFestSoxaiAdminRegistrations />
    </AdminShell>
  );
}
