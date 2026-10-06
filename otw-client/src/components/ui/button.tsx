import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-pill font-display text-base font-bold transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-rosy text-white shadow-squish-rosy active:translate-y-[5px] active:shadow-squish-rosy-active",
        secondary:
          "bg-zest text-[var(--zest-ink)] shadow-squish-zest active:translate-y-[5px] active:shadow-squish-zest-active",
        teal:
          "bg-teal text-white shadow-squish-teal active:translate-y-[4px] active:shadow-squish-teal-active",
        ghost:
          "text-teal-dark border-b-2 border-teal-dark/50 rounded-none shadow-none font-sans font-extrabold hover:bg-transparent",
        outline:
          "border-2 border-blossom bg-transparent text-teal-dark rounded-pill hover:bg-blossom/20",
      },
      size: {
        default: "h-12 px-7 py-3",
        sm: "h-9 px-4 text-sm",
        lg: "h-14 px-10 text-lg",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }