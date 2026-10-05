import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { CenteredPage } from "@/components/layout/centered-page";

export const metadata: Metadata = {
  title: "Anmelden",
};

const LoginPage = () => {
  return (
    <CenteredPage
      eyebrow="Dokploy Access Control"
      title="Willkommen zurück."
      description="Melde dich mit dem Microsoft-Konto deiner Organisation an, um deine Zugriffe zu verwalten."
    >
      <LoginForm />

      <p className="text-[12px] leading-none tracking-[-0.12px] text-ink-muted-48">
        Du wirst zur Anmeldung an Microsoft Entra ID weitergeleitet.
      </p>
    </CenteredPage>
  );
};

export default LoginPage;
