import type { ButtonHTMLAttributes, ReactNode } from "react";

// Big rounded Bolt-style buttons.
type Variant = "primary" | "secondary" | "text";

const VARIANTS: Record<Variant, string> = {
  primary: "w-full rounded-2xl bg-green py-4 text-lg font-semibold text-white active:opacity-80",
  secondary: "w-full rounded-2xl border-2 border-ink/15 bg-white py-4 text-lg font-semibold text-ink active:bg-ink/5",
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

export function BottomSheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-white px-5 pb-8 pt-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-6 h-1.5 w-10 rounded-full bg-ink/15" />
        {children}
      </div>
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-clay/10 px-4 py-3 text-clay">{children}</p>;
}
