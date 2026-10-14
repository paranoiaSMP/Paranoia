import { siteConfig } from "@/config/site";

export const isAdmin = (role?: string | null) => role === "ADMIN" || role === "DEV";
export const isStaff = (role?: string | null) => isAdmin(role) || role === "MODERATOR";

export const isFounderUuid = (uuid?: string | null) =>
  !!uuid && uuid.replace(/-/g, "").toLowerCase() === siteConfig.founderUuid;
