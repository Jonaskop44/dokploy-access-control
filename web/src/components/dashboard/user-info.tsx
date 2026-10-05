"use client";

import { Icon } from "@iconify/react";
import { useUserControllerMe } from "@/api/generated/user/user";
import { Button } from "@/components/ui/button";

const formatDate = (value: string) =>
  new Date(value).toLocaleString("de-AT", {
    dateStyle: "medium",
    timeStyle: "short",
  });

export const UserInfo = () => {
  const { data: user, isPending, isError, isFetching, refetch } =
    useUserControllerMe();

  const reloadButton = (
    <Button
      variant="secondary"
      size="sm"
      aria-disabled={isFetching}
      onClick={() => refetch()}
      className="self-end"
    >
      <Icon
        icon={isFetching ? "lucide:loader-circle" : "lucide:refresh-cw"}
        className={isFetching ? "animate-spin" : undefined}
      />
      Neu laden
    </Button>
  );

  if (isPending) return <p className="text-ink-muted-48">Lade Benutzer…</p>;
  if (isError) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-destructive">
          Benutzer konnte nicht geladen werden.
        </p>
        {reloadButton}
      </div>
    );
  }

  const rows = [
    ["Name", user.name],
    ["E-Mail", user.email],
    ["Rolle", user.role],
    ["ID", user.id],
    ["Erstellt", formatDate(user.createdAt)],
    ["Aktualisiert", formatDate(user.updatedAt)],
  ];

  return (
    <div className="flex flex-col gap-4">
      <dl className="divide-y divide-border rounded-xl border border-border bg-background">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-6 px-6 py-4">
            <dt className="text-ink-muted-48">{label}</dt>
            <dd className="truncate text-right">{value}</dd>
          </div>
        ))}
      </dl>
      {reloadButton}
    </div>
  );
};
