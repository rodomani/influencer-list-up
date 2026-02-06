import { useEffect, useState } from "react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SearchScreen } from "@/pages/search/search_page"
import { SearchResultsPage } from "@/pages/search/search_results"
import { InfluencerDetailPage } from "@/pages/search/influencer_detail"
import { HomeScreen } from "@/pages/home_page"
import { CampaignScreen } from "@/pages/campaign/campaign"
import { CreateCampaignScreen } from "@/pages/campaign/create_campaign"
import { CampaignDetailScreen } from "@/pages/campaign/campaign_detail"
import { CampaignEditScreen } from "@/pages/campaign/campaign_edit"
import { Routes, Route, useLocation, Navigate } from "react-router-dom"
import { LoginPage } from "@/pages/authentication/login"
import { RegisterPage } from "@/pages/authentication/register"
import { VerificationPage } from "@/pages/authentication/verification"
import { useAuth } from "./contexts/AuthContext"
import "./App.css"

type LastPaths = {
  search: string
  campaign: string
  home: string
}

function App() {
  const location = useLocation()
  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/verify"
  const { user, loading } = useAuth()
  const [lastPaths, setLastPaths] = useState<LastPaths>(() => {
    if (typeof window === "undefined") {
      return {
        search: "/search/search",
        campaign: "/campaign",
        home: "/home",
      }
    }
    return {
      search: window.localStorage.getItem("lastSearchPath") ?? "/search/search",
      campaign: window.localStorage.getItem("lastCampaignPath") ?? "/campaign",
      home: window.localStorage.getItem("lastHomePath") ?? "/home",
    }
  })
  const activeItem =
    location.pathname.startsWith("/search")
      ? "search"
      : location.pathname.startsWith("/campaign")
        ? "campaign"
        : "home"

  useEffect(() => {
    if (typeof window === "undefined") return
    if (isAuthPage || location.pathname === "/") return
    if (!user) return
    if (location.pathname.startsWith("/search")) {
      const path = location.pathname + location.search
      window.localStorage.setItem("lastSearchPath", path)
      setLastPaths((prev) => ({ ...prev, search: path }))
    } else if (location.pathname.startsWith("/campaign")) {
      const path = location.pathname + location.search
      window.localStorage.setItem("lastCampaignPath", path)
      setLastPaths((prev) => ({ ...prev, campaign: path }))
    } else {
      const path = location.pathname + location.search
      window.localStorage.setItem("lastHomePath", path)
      setLastPaths((prev) => ({ ...prev, home: path }))
    }
  }, [location])

  if (isAuthPage) {
    if (location.pathname === "/register") return <RegisterPage />
    if (location.pathname === "/verify") return <VerificationPage />
    return <LoginPage />
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <AppSidebar
          activeItem={activeItem}
          homeUrl={lastPaths.home}
          searchUrl={lastPaths.search}
          campaignUrl={lastPaths.campaign}
        />
        <div className="flex-1 p-6">
        <SidebarTrigger className="mb-6" />
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/home" element={<HomeScreen />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/search/search" element={<SearchScreen />} />
            <Route path="/search/search_results" element={<SearchResultsPage />} />
            <Route path="/search/influencer/:id" element={<InfluencerDetailPage />} />
            <Route path="/campaign" element={<CampaignScreen />} />
            <Route path="/campaign/create" element={<CreateCampaignScreen />} />
            <Route path="/campaign/detail" element={<CampaignDetailScreen />} />
            <Route path="/campaign/edit" element={<CampaignEditScreen />} />
            <Route path="/verify" element={<VerificationPage />} />

          </Routes>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default App
