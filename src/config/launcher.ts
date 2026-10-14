export type LauncherPlatform = {
  id: "windows" | "linux" | "macos";
  name: string;
  format: string;
  url: string | null;
  status: string;
  dataDir: string;
};

export const LAUNCHER = {
  name: "Paranoia Client",
  minecraftVersion: "1.21.1",
  platforms: [
    { id: "windows", name: "Windows", format: "Installeur .exe", url: null, status: "Bientôt disponible", dataDir: "%APPDATA%\\.paranoia-client" },
    { id: "linux", name: "Linux", format: "AppImage ou .deb", url: null, status: "Bientôt disponible", dataDir: "~/.local/share/paranoia-client" },
    { id: "macos", name: "macOS", format: ".dmg", url: null, status: "Plus tard", dataDir: "~/Library/Application Support/paranoia-client" },
  ] satisfies LauncherPlatform[],
} as const;
