import { cookies } from "next/headers";
import { AppSidebar } from "@/components/dashboard/sidebar/app-sidebar";
import { DashboardBreadcrumb } from "@/components/dashboard/header/dashboard-breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const DashboardLayout = async ({ children }: LayoutProps<"/dashboard">) => {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-13 shrink-0 items-center gap-2 border-b border-border bg-frosted transition-[height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <DashboardBreadcrumb />
          </div>
        </header>
        <div className="flex flex-1 flex-col px-6 py-8 md:px-8 md:py-12">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default DashboardLayout;
