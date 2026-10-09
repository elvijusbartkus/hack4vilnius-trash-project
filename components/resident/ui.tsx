import type { ButtonHTMLAttributes, ReactNode } from "react";

// Big rounded Bolt-style buttons.
type Variant = "primary" | "secondary" | "text";

const VARIANTS: Record<Variant, string> = {
  primary: "w-full min-h-14 rounded-[3px] bg-green font-display text-xl font-semibold text-sheet hover:bg-green-deep",
  secondary: "w-full min-h-14 rounded-[3px] border-2 border-green bg-sheet font-display text-xl font-semibold text-green hover:bg-sheet-hi",
  text: "font-semibold text-green underline-offset-2 hover:underline",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button {...props} className={`${VARIANTS[variant]} disabled:opacity-40 ${className}`} />;
}

export function Screen({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-8">{children}</main>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <p className="rounded-[3px] border border-clay bg-sheet-hi px-4 py-3 text-clay-deep">{children}</p>;
}
