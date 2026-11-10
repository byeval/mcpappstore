"use client";

import { useState, type ReactNode } from "react";
import { trackCatalogEvent, type CatalogEventParams } from "@/lib/browser-analytics";
import type { Locale } from "@/lib/i18n";

const copyText: Record<Locale, [string, string, string]> = {
  en: ["Copy", "Copied", "Copy failed. Select and copy the text manually."],
  es: ["Copiar", "Copiado", "No se pudo copiar. Selecciona y copia el texto manualmente."],
  fr: ["Copier", "Copié", "Échec de la copie. Sélectionnez et copiez le texte manuellement."],
  de: ["Kopieren", "Kopiert", "Kopieren fehlgeschlagen. Text bitte manuell auswählen und kopieren."],
  ru: ["Копировать", "Скопировано", "Не удалось скопировать. Выделите и скопируйте текст вручную."],
  "zh-hans": ["复制", "已复制", "复制失败，请选中文字手动复制。"],
  ja: ["コピー", "コピー済み", "コピーできませんでした。テキストを選択してコピーしてください。"],
  ko: ["복사", "복사됨", "복사하지 못했습니다. 텍스트를 선택해 직접 복사해 주세요."],
};

export function CatalogCopyButton({ value, appId, kind, locale, children, className = "btn-ghost" }: {
  value: string;
  appId: string;
  kind: CatalogEventParams["copy_type"];
  locale: Locale;
  children?: ReactNode;
  className?: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const labels = copyText[locale];
  return (
    <span className="catalog-copy-control">
      <button className={className} type="button" onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setStatus("copied");
          trackCatalogEvent("mcp_copy", { app_id: appId, copy_type: kind });
        } catch {
          setStatus("error");
        }
      }}>
        {children}
        <span className={children ? "prompt-copy" : undefined} aria-live="polite">{status === "copied" ? labels[1] : labels[0]}</span>
      </button>
      {status === "error" ? <span role="status">{labels[2]}</span> : null}
    </span>
  );
}
