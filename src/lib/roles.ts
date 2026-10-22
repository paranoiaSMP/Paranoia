import { siteConfig } from "@/config/site";

export const isOwner = (role?: string | null) => role === "OWNER" || role === "DEV";
export const isAdmin = (role?: string | null) => isOwner(role) || role === "ADMIN";
export const isStaff = (role?: string | null) => isAdmin(role) || role === "MODERATOR";

export const isFounderUuid = (uuid?: string | null) =>
  !!uuid && uuid.replace(/-/g, "").toLowerCase() === siteConfig.founderUuid;
