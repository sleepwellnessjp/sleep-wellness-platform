import { NextResponse } from "next/server";
import { listPublicInstructors } from "@/lib/instructors/instructor-profile-service";
import type { InstructorDirectoryFilters } from "@/lib/instructors/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters: InstructorDirectoryFilters = {
      query: searchParams.get("q") ?? undefined,
      activityArea: searchParams.get("area") ?? undefined,
      onlineOnly: searchParams.get("online") === "1",
      yoga: searchParams.get("yoga") === "1",
      matPilates: searchParams.get("mat_pilates") === "1",
      machinePilates: searchParams.get("machine_pilates") === "1",
      melatoninYoga: searchParams.get("melatonin_yoga") === "1",
      sleepWellnessCert: searchParams.get("sw_cert") === "1",
    };

    const instructors = await listPublicInstructors(filters);
    return NextResponse.json({ instructors });
  } catch (error) {
    console.error("[api/instructors]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "講師一覧の取得に失敗しました",
        instructors: [],
      },
      { status: 500 },
    );
  }
}
