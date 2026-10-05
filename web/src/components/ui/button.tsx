import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Button grammar from DESIGN.md: blue pills for actions, compact dark rects
// for utility. Press state is scale(0.95); focus uses the global outline.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border border-transparent font-normal whitespace-nowrap transition-transform duration-120 select-none active:scale-95 disabled:pointer-events-none disabled:text-ink-muted-48 aria-disabled:pointer-events-none aria-disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // button-primary / button-store-hero
        default: "rounded-full bg-primary text-primary-foreground",
        // button-secondary-pill
        secondary: "rounded-full border-primary bg-transparent text-primary",
        // button-dark-utility
        dark: "rounded-md bg-foreground text-background",
        // text-link
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "min-h-11 gap-2 px-5.5 py-2.75 text-[17px] leading-[1.47] tracking-[-0.374px] [&_svg:not([class*='size-'])]:size-4.5",
        lg: "min-h-12 gap-2.5 px-7 py-3.5 text-[18px] leading-none font-light [&_svg:not([class*='size-'])]:size-5",
        sm: "gap-1.5 px-3.75 py-2 text-[14px] leading-[1.29] tracking-[-0.224px] [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
