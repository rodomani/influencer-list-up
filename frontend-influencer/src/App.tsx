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
import { Routes, Route, useLocation, Navigate, Outlet } from "react-router-dom";
import { LoginPage } from "@/pages/authentication/login";
import { RegisterPage } from "@/pages/authentication/register";
import { VerificationPage } from "@/pages/authentication/verification";
import { useAuth } from "./contexts/AuthContext";
import { Bookmarks } from "@/pages/bookmark/bookmarks";
import { getActiveNavItem, useLastSectionPaths } from "@/hooks/useLastSectionPaths";
import { ProtectedRoute, PublicOnlyRoute } from "@/routes/RouteGuards";
import "./App.css";

const RootLayout = () => <Outlet />;

const AppShell = () => {
  const location = useLocation();
  const { user } = useAuth();
  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/verify";
  const currentPath = location.pathname + location.search;
  const lastPaths = useLastSectionPaths({
    currentPath,
    pathname: location.pathname,
    isAuthPage,
    user,
  });
  const activeItem = getActiveNavItem(location.pathname);

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
          <Outlet />
        </div>
      </div>
    </SidebarProvider>
  );
};

const RootRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return <Navigate to={user ? "/home" : "/login"} replace />;
};

function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<RootRoute />} />

        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify" element={<VerificationPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/home" element={<HomeScreen />} />
            <Route path="/search/search" element={<SearchScreen />} />
            <Route path="/search/search_results" element={<SearchResultsPage />} />
            <Route path="/search/influencer/:id" element={<InfluencerDetailPage />} />
            <Route path="/search/compare" element={<InfluencerComparePage />} />
            <Route path="/campaign" element={<CampaignScreen />} />
            <Route path="/campaign/create" element={<CreateCampaignScreen />} />
            <Route path="/campaign/detail" element={<CampaignDetailScreen />} />
            <Route path="/campaign/edit" element={<CampaignEditScreen />} />
            <Route path="/campaign/compare" element={<CampaignComparePage />} />
            <Route path="/bookmark" element={<Bookmarks />} />
          </Route>
        </Route>

        <Route path="*" element={<RootRoute />} />
      </Route>
    </Routes>
  );
}

export default App;
