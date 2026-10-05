"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthControllerLogout } from "@/api/generated/auth/auth";
import {
  UserResponseDtoRole,
  type UserResponseDto,
} from "@/api/generated/models";
import { useUserControllerMe } from "@/api/generated/user/user";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@iconify/react";

const ROLE_LABELS: Record<UserResponseDto["role"], string> = {
  [UserResponseDtoRole.TEACHER]: "Lehrkraft",
  [UserResponseDtoRole.STUDENT]: "Schüler:in",
};

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const UserSummary = ({ user }: { user: UserResponseDto }) => (
  <>
    <Avatar>
      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
    </Avatar>
    <div className="grid flex-1 text-left text-sm leading-tight">
      <span className="truncate font-semibold">{user.name}</span>
      <span className="truncate text-xs text-muted-foreground">
        {user.email}
      </span>
    </div>
  </>
);

export const NavUser = () => {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useUserControllerMe();
  const logout = useAuthControllerLogout({
    mutation: {
      onSuccess: () => {
        queryClient.clear();
        router.replace("/");
      },
    },
  });

  if (!user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled aria-label="Lade Benutzer">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="grid flex-1 gap-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <UserSummary user={user} />
            <Icon icon="lucide:chevrons-up-down" className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-fit min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <UserSummary user={user} />
                </div>
              </DropdownMenuLabel>
              <DropdownMenuLabel className="pt-0 text-xs text-muted-foreground">
                {ROLE_LABELS[user.role]}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
            >
              {logout.isPending ? (
                <Icon icon="lucide:loader-circle" className="animate-spin" />
              ) : (
                <Icon icon="lucide:log-out" />
              )}
              Abmelden
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
