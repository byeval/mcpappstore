import type {ReactNode} from 'react';
import type {Locale} from '../../lib/i18n';
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

export function CatalogCopyButton({value,appId,kind,locale,children,className="btn-ghost"}:{value:string;appId:string;kind:string;locale:Locale;children?:ReactNode;className?:string}){const labels=copyText[locale];return <span className="catalog-copy-control"><button className={className} type="button" data-catalog-copy={value} data-copy-app={appId} data-copy-kind={kind} data-copy-idle={labels[0]} data-copy-success={labels[1]} data-copy-error={labels[2]}>{children}<span className={children?"prompt-copy":undefined} aria-live="polite" data-copy-label="">{labels[0]}</span></button><span role="status" data-copy-error-message="" hidden></span></span>;}
