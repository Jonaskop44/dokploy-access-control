"use client";

import { Icon } from "@iconify/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { axiosInstance } from "@/api/axios-instance";
import { getAuthControllerLoginQueryKey } from "@/api/generated/auth/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const LoginError = () => {
  const searchParams = useSearchParams();

  if (!searchParams.has("error")) return null;

  return (
    <p
      role="alert"
      className="flex w-full items-start gap-2 rounded-lg bg-destructive/8 px-4 py-3 text-left text-[14px] leading-[1.43] tracking-[-0.224px] text-destructive"
    >
      <Icon icon="lucide:circle-alert" className="mt-px size-4 shrink-0" />
      <span>
        Es ist ein Fehler aufgetreten. Bitte versuche es erneut oder kontaktiere
        den Support, falls das Problem weiterhin besteht.
      </span>
    </p>
  );
};

export const LoginForm = () => {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const LOGIN_URL = axiosInstance.getUri({
    url: getAuthControllerLoginQueryKey()[0],
  });

  return (
    <form
      action={LOGIN_URL}
      method="get"
      onSubmit={() => setIsRedirecting(true)}
      className="flex w-full flex-col items-center gap-6"
    >
      <Suspense>
        <LoginError />
      </Suspense>

      <Button
        type="submit"
        aria-disabled={isRedirecting}
        className="w-full sm:w-auto"
      >
        {isRedirecting ? (
          <Icon icon="lucide:loader-circle" className="animate-spin" />
        ) : (
          <span className="flex rounded-[3px] p-0.75">
            <Icon icon="logos:microsoft-icon" className="size-3.5" />
          </span>
        )}
        {isRedirecting
          ? "Weiterleitung zu Microsoft"
          : "Mit Microsoft anmelden"}
      </Button>

      <Label className="cursor-pointer text-ink-muted-80">
        <Checkbox name={"rememberMe"} value="true" />
        Angemeldet bleiben
      </Label>
    </form>
  );
};
