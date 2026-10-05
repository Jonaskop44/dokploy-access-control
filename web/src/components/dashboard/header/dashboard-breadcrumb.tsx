"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { getNavTrail } from "@/components/dashboard/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export const DashboardBreadcrumb = () => {
  const trail = getNavTrail(usePathname());

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {trail.map((entry, index) => {
          const isLast = index === trail.length - 1;

          return (
            <Fragment key={entry.url}>
              <BreadcrumbItem className={isLast ? undefined : "hidden md:block"}>
                {isLast ? (
                  <BreadcrumbPage>{entry.title}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href={entry.url} />}>
                    {entry.title}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator className="hidden md:block" />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
