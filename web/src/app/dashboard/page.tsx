import type { Metadata } from "next";
import { UserInfo } from "@/components/dashboard/user-info";

export const metadata: Metadata = {
  title: "Dashboard",
};

const DashboardPage = () => {
  return (
    <main className="min-h-dvh bg-parchment px-6 py-section">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <h2>Dashboard</h2>
        <UserInfo />
      </div>
    </main>
  );
};

export default DashboardPage;
