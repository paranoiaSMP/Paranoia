"use client";
import React, { createContext, useContext } from "react";
import { siteConfig } from "@/config/site";

const SettingsContext = createContext({ discordUrl: siteConfig.discordUrl as string });

export function SettingsProvider({ children, discordUrl }: { children: React.ReactNode, discordUrl: string }) {
  return <SettingsContext.Provider value={{ discordUrl }}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
