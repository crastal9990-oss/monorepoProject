import { ReactNode } from 'react'
import { SidebarProvider, SidebarInset } from "@repo/ui"
import { AppSidebar } from "../../components/layout/app-sidebar"
import { TopHeader } from "../../components/layout/top-header"

export default function MainLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <TopHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}