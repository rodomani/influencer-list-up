import { useEffect } from "react";

type LastPaths = {
  search: string;
  campaign: string;
  home: string;
  bookmark: string;
};

type UseLastSectionPathsArgs = {
  currentPath: string;
  pathname: string;
  isAuthPage: boolean;
  user: unknown;
};

const DEFAULT_LAST_PATHS: LastPaths = {
  search: "/search/search",
  campaign: "/campaign",
  home: "/home",
  bookmark: "/bookmark",
};

const LAST_PATH_STORAGE_KEYS = {
  search: "lastSearchPath",
  campaign: "lastCampaignPath",
  home: "lastHomePath",
  bookmark: "lastBookmarkPath",
} as const;

const getPathname = (path: string) => {
  if (!path.startsWith("/")) return null;

  try {
    return new URL(path, "http://localhost").pathname;
  } catch {
    return null;
  }
};

const isAllowedPath = (path: string) => {
  const pathname = getPathname(path);
  if (!pathname) return false;

  return (
    pathname === "/home" ||
    pathname.startsWith("/search") ||
    pathname.startsWith("/campaign") ||
    pathname.startsWith("/bookmark")
  );
};

const getStoredPath = (key: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;

  const stored = window.localStorage.getItem(key);
  if (!stored || !isAllowedPath(stored)) return fallback;

  return stored;
};

export const getActiveNavItem = (pathname: string) => {
  if (pathname.startsWith("/search")) return "search";
  if (pathname.startsWith("/campaign")) return "campaign";
  if (pathname.startsWith("/bookmark")) return "bookmark";
  return "home";
};

export function useLastSectionPaths({
  currentPath,
  pathname,
  isAuthPage,
  user,
}: UseLastSectionPathsArgs): LastPaths {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user || isAuthPage || pathname === "/") return;
    if (!isAllowedPath(currentPath)) return;

    if (pathname.startsWith("/search")) {
      window.localStorage.setItem(LAST_PATH_STORAGE_KEYS.search, currentPath);
      return;
    }

    if (pathname.startsWith("/campaign")) {
      window.localStorage.setItem(LAST_PATH_STORAGE_KEYS.campaign, currentPath);
      return;
    }

    if (pathname.startsWith("/bookmark")) {
      window.localStorage.setItem(LAST_PATH_STORAGE_KEYS.bookmark, currentPath);
      return;
    }

    window.localStorage.setItem(LAST_PATH_STORAGE_KEYS.home, currentPath);
  }, [currentPath, isAuthPage, pathname, user]);

  return {
    search: pathname.startsWith("/search")
      ? currentPath
      : getStoredPath(LAST_PATH_STORAGE_KEYS.search, DEFAULT_LAST_PATHS.search),
    campaign: pathname.startsWith("/campaign")
      ? currentPath
      : getStoredPath(LAST_PATH_STORAGE_KEYS.campaign, DEFAULT_LAST_PATHS.campaign),
    home:
      pathname === "/home"
        ? currentPath
        : getStoredPath(LAST_PATH_STORAGE_KEYS.home, DEFAULT_LAST_PATHS.home),
    bookmark: pathname.startsWith("/bookmark")
      ? currentPath
      : getStoredPath(LAST_PATH_STORAGE_KEYS.bookmark, DEFAULT_LAST_PATHS.bookmark),
  };
}
