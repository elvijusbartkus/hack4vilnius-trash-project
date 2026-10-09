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

// Scrollable screen that fills the phone frame (see PhoneFrame).
export function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="h-full overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-6 px-5 py-8">{children}</div>
    </main>
  );
}

// Full screen on phones; on desktop (md+) a centered 390x844 phone (shorter if the window is) on the sand background.
// The transform makes fixed children (bottom sheets) position inside the frame instead of the window.
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="bg-sand md:flex md:min-h-dvh md:items-center md:justify-center md:py-8">
      <div className="relative h-dvh w-full overflow-hidden bg-sand md:h-[min(844px,calc(100dvh-4rem))] md:w-[390px] md:transform-[translateZ(0)] md:rounded-[44px] md:border md:border-ink/10 md:shadow-[0_24px_60px_-12px_rgb(27_27_27/0.25)]">
        {children}
      </div>
    </div>
  );
}

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-ink/60">{title}</p>
      {children}
    </section>
  );
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
