import type { FileRoutesByTo } from "@/routeTree.gen";

export type RoleName = "User" | "HOD" | "Finance" | "Procument" | "CEO";

export type AuthUser = {
  userId: number;
  email: string;
  department: string | null;
  designation: string | null;
  roleId: number;
  roleName: RoleName;
};

export const roleHome: Partial<Record<RoleName, keyof FileRoutesByTo>> = {
  User: "/user",
  HOD: "/hod",
  Finance: "/finance",
  Procument: "/procument",
};
