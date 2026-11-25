import { ButtonHTMLAttributes, forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import styles from "@/styles/ui/Button.module.scss";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    const variantClass =
      styles[`button--${variant}`] || styles["button--default"];
    const sizeClass =
      styles[`button--${size}-size`] || styles["button--default-size"];
    const darkVariantClass =
      styles[`button--dark-${variant}`] || styles["button--dark-default"];

    return (
      <Comp
        ref={ref}
        className={cn(
          styles.button,
          variantClass,
          sizeClass,
          darkVariantClass,
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
