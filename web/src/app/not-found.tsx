import type { Metadata } from "next";
import Link from "next/link";
import { CenteredPage } from "@/components/layout/centered-page";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Seite nicht gefunden",
};

const NotFound = () => {
  return (
    <CenteredPage
      eyebrow="Fehler 404"
      title="Diese Seite gibt es nicht."
      description="Der Link ist veraltet oder die Seite wurde verschoben. Prüfe die Adresse oder kehre zur Übersicht zurück."
    >
      <Link href="/" className={buttonVariants()}>
        Zur Übersicht
      </Link>
    </CenteredPage>
  );
};

export default NotFound;
