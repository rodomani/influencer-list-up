import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SearchScreen } from "@/pages/search/search_page";
import { SearchResultsPage } from "@/pages/search/search_results";
import { InfluencerDetailPage } from "@/pages/search/influencer_detail";
import { InfluencerComparePage } from "@/pages/search/influencer_compare";
import { HomeScreen } from "@/pages/home_page";
import { CampaignScreen } from "@/pages/campaign/campaign";
import { CreateCampaignScreen } from "@/pages/campaign/create_campaign";
import { CampaignDetailScreen } from "@/pages/campaign/campaign_detail";
import { CampaignEditScreen } from "@/pages/campaign/campaign_edit";
import { CampaignComparePage } from "@/pages/campaign/campaign_compare";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { LoginPage } from "@/pages/authentication/login";
import { RegisterPage } from "@/pages/authentication/register";
import { VerificationPage } from "@/pages/authentication/verification";
import { useAuth } from "./contexts/AuthContext";
import { Bookmarks } from "@/pages/bookmark/bookmarks";
import "./App.css";

type LastPaths = {
  search: string;
  campaign: string;
  home: string;
  bookmark: string;
};

const DEFAULT_LAST_PATHS: LastPaths = {
  search: "/search/search",
  campaign: "/campaign",
  home: "/home",
  bookmark: "/bookmark",
};

function getStoredPath(key: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem(key) ?? fallback;
}

function App() {
  const location = useLocation();
  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/verify";
  const { user, loading, authError } = useAuth();
  const currentPath = location.pathname + location.search;
  const lastPaths: LastPaths = {
    search: location.pathname.startsWith("/search")
      ? currentPath
      : getStoredPath("lastSearchPath", DEFAULT_LAST_PATHS.search),
    campaign: location.pathname.startsWith("/campaign")
      ? currentPath
      : getStoredPath("lastCampaignPath", DEFAULT_LAST_PATHS.campaign),
    home:
      !location.pathname.startsWith("/search") &&
      !location.pathname.startsWith("/campaign") &&
      !location.pathname.startsWith("/bookmark") &&
      !isAuthPage &&
      location.pathname !== "/"
        ? currentPath
        : getStoredPath("lastHomePath", DEFAULT_LAST_PATHS.home),
    bookmark: location.pathname.startsWith("/bookmark")
      ? currentPath
      : getStoredPath("lastBookmarkPath", DEFAULT_LAST_PATHS.bookmark),
  };
  const activeItem = location.pathname.startsWith("/search")
    ? "search"
    : location.pathname.startsWith("/campaign")
    ? "campaign"
    : location.pathname.startsWith("/bookmark")
    ? "bookmark"
    : "home";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isAuthPage || location.pathname === "/") return;
    if (!user) return;
    if (location.pathname.startsWith("/search")) {
      window.localStorage.setItem("lastSearchPath", currentPath);
    } else if (location.pathname.startsWith("/campaign")) {
      window.localStorage.setItem("lastCampaignPath", currentPath);
    } else if (location.pathname.startsWith("/bookmark")) {
      window.localStorage.setItem("lastBookmarkPath", currentPath);
    } else {
      window.localStorage.setItem("lastHomePath", currentPath);
    }
  }, [currentPath, isAuthPage, location.pathname, user]);

  if (location.pathname === "/") {
    return user ? <Navigate to="/home" replace /> : <LoginPage />;
  }

  if (isAuthPage) {
    if (location.pathname === "/register") return <RegisterPage />;
    if (location.pathname === "/verify") return <VerificationPage />;
    return <LoginPage />;
  }

  if (loading) {
    return (
      <div className="art-shell flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <div className="deco-panel deco-page max-w-md text-center">
          <div className="deco-kicker">準備中</div>
          <div className="section-title mt-3 text-2xl">読み込み中</div>
          <div className="deco-rule my-5" />
          <p className="deco-copy text-sm">分析データとナビゲーションを整えています。</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        {authError && (
          <div className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 border border-red-200 bg-red-50 p-3 text-sm text-red-700 shadow-sm">
            認証の初期化に失敗しました: {authError}
          </div>
        )}
        <LoginPage />
      </>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-[#f9fafb] text-slate-950">
        <AppSidebar
          activeItem={activeItem}
          homeUrl={lastPaths.home}
          searchUrl={lastPaths.search}
          campaignUrl={lastPaths.campaign}
          bookmarkUrl={lastPaths.bookmark}
        />
      <div className="min-w-0 w-full max-w-none flex-1 overflow-x-hidden bg-[#f9fafb] px-4 py-5 sm:px-6 lg:px-8">
        <SidebarTrigger className="mb-6" />
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomeScreen />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/search/search" element={<SearchScreen />} />
            <Route
              path="/search/search_results"
              element={<SearchResultsPage />}
            />
            <Route
              path="/search/influencer/:id"
              element={<InfluencerDetailPage />}
            />
            <Route path="/search/compare" element={<InfluencerComparePage />} />
            <Route path="/campaign" element={<CampaignScreen />} />
            <Route path="/campaign/create" element={<CreateCampaignScreen />} />
            <Route path="/campaign/detail" element={<CampaignDetailScreen />} />
            <Route path="/campaign/edit" element={<CampaignEditScreen />} />
            <Route path="/campaign/compare" element={<CampaignComparePage />} />
            <Route path="/verify" element={<VerificationPage />} />
            <Route path="/bookmark" element={<Bookmarks />} />
          </Routes>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default App;
