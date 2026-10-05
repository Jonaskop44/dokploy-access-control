import type { ReactNode } from "react";
import { BlurFade } from "@/components/ui/blur-fade";
import { DotPattern } from "@/components/ui/dot-pattern";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { HyperText } from "@/components/ui/hyper-text";

type CenteredPageProps = {
  eyebrow: string;
  title: string;
  description: ReactNode;
  children?: ReactNode;
};

const STAGGER = 0.08;

export const CenteredPage = ({
  eyebrow,
  title,
  description,
  children,
}: CenteredPageProps) => {
  return (
    <main className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-parchment px-6 py-section">
      <DotPattern
        width={24}
        height={24}
        cr={1}
        className="-z-10 text-ink-muted-48/25 mask-[radial-gradient(520px_circle_at_center,white,transparent)]"
      />

      <Empty className="max-w-2xl gap-8 p-0 md:p-0">
        <EmptyHeader className="max-w-xl gap-4">
          <BlurFade>
            <EmptyMedia className="mb-0">
              <HyperText
                as="p"
                duration={900}
                className="py-0 text-[14px] leading-[1.29] font-semibold tracking-[0.3em] text-ink-muted-48"
              >
                {eyebrow}
              </HyperText>
            </EmptyMedia>
          </BlurFade>

          <BlurFade delay={STAGGER}>
            <h1 className="text-balance text-foreground">{title}</h1>
          </BlurFade>

          <BlurFade delay={STAGGER * 2}>
            <EmptyDescription className="text-[17px] leading-[1.47] tracking-[-0.374px] text-ink-muted-80">
              {description}
            </EmptyDescription>
          </BlurFade>
        </EmptyHeader>

        {children && (
          <BlurFade delay={STAGGER * 3} className="w-full">
            <EmptyContent className="mx-auto">{children}</EmptyContent>
          </BlurFade>
        )}
      </Empty>
    </main>
  );
};
