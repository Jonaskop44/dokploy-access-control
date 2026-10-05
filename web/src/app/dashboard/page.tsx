import type { Metadata } from "next";
import { UserInfo } from "@/components/dashboard/user-info";
import { BlurFade } from "@/components/magicui/blur-fade";

export const metadata: Metadata = {
  title: "Dashboard",
};

const DashboardPage = () => {
  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <BlurFade>
        <h2>Übersicht</h2>
      </BlurFade>
      <BlurFade delay={0.08}>
        <UserInfo />
      </BlurFade>
    </div>
  );
};

export default DashboardPage;
