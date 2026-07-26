export const ACADEMY_ROUTES = {
  home: "/academy",
  certifiedInstructor: "/academy/certified-instructor",
  learn: (lessonId: string) => `/academy/learn/${lessonId}` as const,
  test: (testId: string) => `/academy/tests/${testId}` as const,
  certificate: (id: string) => `/academy/certificates/${id}` as const,
  admin: "/admin/academy",
} as const;
