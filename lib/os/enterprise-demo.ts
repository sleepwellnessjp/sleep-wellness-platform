export type EnterpriseDepartmentStat = {
  id: string;
  name: string;
  employeeCount: number;
  analysisCoverage: number;
  averageScore: number;
  improvementRate: number;
};

export type EnterpriseDashboard = {
  employeeCount: number;
  analysisCoverage: number;
  averageScore: number;
  improvementRate: number;
  departments: EnterpriseDepartmentStat[];
};

/** Version 3.0 企業Home用デモデータ（テナント実装までの土台） */
export function getEnterpriseDemoDashboard(): EnterpriseDashboard {
  return {
    employeeCount: 248,
    analysisCoverage: 72,
    averageScore: 71.4,
    improvementRate: 58,
    departments: [
      {
        id: "sales",
        name: "営業本部",
        employeeCount: 64,
        analysisCoverage: 81,
        averageScore: 69.2,
        improvementRate: 54,
      },
      {
        id: "eng",
        name: "エンジニアリング",
        employeeCount: 92,
        analysisCoverage: 76,
        averageScore: 73.8,
        improvementRate: 62,
      },
      {
        id: "hr",
        name: "人事・総務",
        employeeCount: 28,
        analysisCoverage: 89,
        averageScore: 75.1,
        improvementRate: 67,
      },
      {
        id: "ops",
        name: "オペレーション",
        employeeCount: 64,
        analysisCoverage: 58,
        averageScore: 68.4,
        improvementRate: 49,
      },
    ],
  };
}
