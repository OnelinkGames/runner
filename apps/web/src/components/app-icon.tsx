import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/logo-mark";

export function AppIcon({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return <LogoMark className={cn("rounded-lg", className)} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn("rounded-lg bg-black/40 object-contain", className)}
      onError={() => setFailed(true)}
    />
  );
}
