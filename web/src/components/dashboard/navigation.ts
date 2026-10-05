export type NavItem = {
  title: string;
  url: string;
  icon: string;
  items?: { title: string; url: string }[];
};

export const DASHBOARD_NAV: NavItem[] = [
  {
    title: "Übersicht",
    url: "/dashboard",
    icon: "lucide:layout-dashboard",
  },
];

// Resolves the nav trail (parent → child) for the current path.
export const getNavTrail = (pathname: string) => {
  for (const item of DASHBOARD_NAV) {
    if (item.url === pathname) return [item];
    const child = item.items?.find((subItem) => subItem.url === pathname);
    if (child) return [item, child];
  }
  return [];
};
