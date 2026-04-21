import { useEffect, useState, type ReactNode } from "react";
import i18n from "@/i18n";

interface I18nRenderBoundaryProps {
  children: ReactNode;
}

export default function I18nRenderBoundary({ children }: I18nRenderBoundaryProps) {
  const [, setVersion] = useState(0);

  useEffect(() => {
    const rerender = () => {
      setVersion((previous) => previous + 1);
    };

    i18n.on("languageChanged", rerender);
    i18n.on("loaded", rerender);

    return () => {
      i18n.off("languageChanged", rerender);
      i18n.off("loaded", rerender);
    };
  }, []);

  return <>{children}</>;
}
