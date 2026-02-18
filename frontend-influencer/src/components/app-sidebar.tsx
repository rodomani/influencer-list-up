import type { LucideIcon } from "lucide-react"
import { Home, Search, Inbox, User2, ChevronUp } from "lucide-react"
import { Link } from "react-router-dom"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type SidebarItem = {
  title: string
  icon: LucideIcon
  key: string
  url: string
}

export type AppSidebarProps = {
  activeItem?: string
  homeUrl?: string
  searchUrl?: string
  campaignUrl?: string
  onSignOut?: () => void
}

export function AppSidebar({
  activeItem,
  homeUrl = "/home",
  searchUrl = "/search/search",
  campaignUrl = "/campaign",
  onSignOut,
}: AppSidebarProps) {
  const items: SidebarItem[] = [
    {
      title: "ホーム",
      url: homeUrl,
      icon: Home,
      key: "home",
    },
    {
      title: "検索",
      url: activeItem === "search" ? "/search/search" : searchUrl,
      icon: Search,
      key: "search",
    },
    {
      title: "キャンペーン",
      url: activeItem === "campaign" ? "/campaign" : campaignUrl,
      icon: Inbox,
      key: "campaign",
    },
  ]

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>メニュー</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={activeItem === item.key}
                  >
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarFooter className="mt-6 pt-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton>
                    <User2 /> ユーザー
                    <ChevronUp className="ml-auto" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  className="w-[--radix-popper-anchor-width]"
                >
                  <DropdownMenuItem>
                    <span>アカウント</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onSignOut}>
                    <span>ログアウト</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  )
}
