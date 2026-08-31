import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { AppCard } from "@/components/app-card";
import { PlatformBadge } from "@/components/platform-badge";
import { PreviewBubbles } from "@/components/preview-bubbles";
import { collectionMatchesApp, type AppCollection } from "@/lib/collections";
import { localizedAppCollections, localizedCategoryName } from "@/lib/content-i18n";
import { getAppById, getCategorySummaries, listPublishedApps } from "@/lib/data";
import { formatMessage, localizedPath, surfaceLabelFor, type I18nMessages, type Locale } from "@/lib/i18n";
import { optimizedImageUrl } from "@/lib/image-urls";
import { getI18n } from "@/lib/i18n-server";
import {
  appJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  formatCategoryName,
  itemListJsonLd,
  jsonLdScript,
  localizedAppDescription,
  localizedAppKind,
  localizedAppPlatformPhrase,
  localizedAppSeoTitle,
  pageMetadata,
} from "@/lib/seo";
import { isIndexableCategory, redirectedAppPath } from "@/lib/seo-indexing";
import { skillPath } from "@/lib/skill-routes";
import { primarySurface, surfaceDetails, type SurfaceResolvedDetails } from "@/lib/surfaces";
import type { AppSkill, CatalogApp, CategorySummary } from "@/lib/types";
import { initials } from "@/lib/utils";

const genericCategories = new Set(["featured"]);
const genericCapabilities = new Set(["claude", "claude code", "interactive", "reads", "remote mcp", "writes"]);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const [{ id }, { locale }] = await Promise.all([params, getI18n()]);
  const app = await getAppById(id);
  if (!app) {
    return {};
  }

  return pageMetadata({
    title: localizedAppSeoTitle(app, locale),
    description: localizedAppDescription(app, locale),
    path: `/app/${app.id}`,
    locale,
    imagePath: `/api/og/${app.id}.png`,
    openGraphType: "article",
  });
}

function overlapCount(left: readonly string[], right: readonly string[]): number {
  const rightSet = new Set(right.map((item) => item.toLowerCase()));
  return left.reduce((count, item) => count + (rightSet.has(item.toLowerCase()) ? 1 : 0), 0);
}

function removeGenericTerms(items: readonly string[], genericTerms: Set<string>): string[] {
  return items.filter((item) => !genericTerms.has(item.toLowerCase()));
}

function collectionMatchScore(collection: AppCollection, app: CatalogApp): number {
  const explicitMatch = collection.appIds?.includes(app.id) ? 100 : 0;
  const platformMatch = collection.platform && app.surfaces.some((surface) => surface.platform === collection.platform) ? 8 : 0;
  const categoryMatch = overlapCount(collection.categorySlugs, app.categories) * 3;

  return explicitMatch + platformMatch + categoryMatch;
}

function relatedAppScore(app: CatalogApp, candidate: CatalogApp): number {
  const appCategories = removeGenericTerms(app.categories, genericCategories);
  const candidateCategories = removeGenericTerms(candidate.categories, genericCategories);
  const categoryOverlap = overlapCount(appCategories, candidateCategories);
  const appCapabilities = removeGenericTerms(app.capabilities, genericCapabilities);
  const candidateCapabilities = removeGenericTerms(candidate.capabilities, genericCapabilities);
  const capabilityOverlap = overlapCount(appCapabilities, candidateCapabilities);
  const appSurfaceKeys = app.surfaces.map((surface) => `${surface.platform}:${surface.type}`);
  const candidateSurfaceKeys = candidate.surfaces.map((surface) => `${surface.platform}:${surface.type}`);
  const appPlatforms = app.surfaces.map((surface) => surface.platform);
  const candidatePlatforms = candidate.surfaces.map((surface) => surface.platform);
  const samePrimaryCategory = appCategories[0] && appCategories[0] === candidateCategories[0] ? 3 : 0;
  const sameSource = app.source === candidate.source ? 1 : 0;

  if (categoryOverlap === 0 && capabilityOverlap === 0) {
    return 0;
  }

  return (
    categoryOverlap * 10 +
    capabilityOverlap * 4 +
    overlapCount(appSurfaceKeys, candidateSurfaceKeys) * 2 +
    overlapCount(appPlatforms, candidatePlatforms) +
    samePrimaryCategory +
    sameSource
  );
}

function readableList(items: string[], locale: Locale = "en"): string {
  if (items.length <= 1) {
    return items[0] ?? "";
  }

  if (locale === "ja") {
    return items.join("、");
  }

  if (locale === "zh-hans") {
    return items.join("、");
  }

  if (locale === "ko") {
    if (items.length === 2) {
      return `${items[0]} 및 ${items[1]}`;
    }

    return `${items.slice(0, -1).join(", ")} 및 ${items[items.length - 1]}`;
  }

  if (locale === "ru") {
    if (items.length === 2) {
      return `${items[0]} и ${items[1]}`;
    }

    return `${items.slice(0, -1).join(", ")} и ${items[items.length - 1]}`;
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function trimSentence(value: string): string {
  return value.replace(/\s+/g, " ").trim().replace(/[.。]+$/, "");
}

function authLabel(authType: SurfaceResolvedDetails["authType"], locale: Locale = "en"): string {
  if (authType === "api_key") {
    return "API key";
  }

  if (authType === "oauth") {
    return "OAuth";
  }

  if (locale === "ja") {
    return "なし";
  }

  if (locale === "ko") {
    return "없음";
  }

  if (locale === "zh-hans") {
    return "无";
  }

  if (locale === "ru") {
    return "нет";
  }

  return "none";
}

function skillRelationLabel(relationType: AppSkill["relationType"], copy: I18nMessages["appDetail"]): string {
  if (relationType === "required") {
    return copy.skillRequired;
  }

  if (relationType === "related") {
    return copy.skillRelated;
  }

  return copy.skillRecommended;
}

function mcpSearchName(appName: string): string {
  return /\bmcp\b/i.test(appName) ? appName : `${appName} MCP`;
}

function kindArticle(kind: string): string {
  return kind.startsWith("MCP") ? "an" : "a";
}

function localizedPlatformText(app: Pick<CatalogApp, "surfaces">, locale: Locale): string {
  const platforms = localizedAppPlatformPhrase(app, locale);
  if (!platforms) {
    return "";
  }

  if (locale === "ja") {
    return `（${platforms} 向け）`;
  }

  if (locale === "ko") {
    return `(${platforms}용)`;
  }

  if (locale === "zh-hans") {
    return `（适用于 ${platforms}）`;
  }

  if (locale === "ru") {
    return ` для ${platforms}`;
  }

  if (locale === "es") {
    return ` para ${platforms}`;
  }

  if (locale === "fr") {
    return ` pour ${platforms}`;
  }

  if (locale === "de") {
    return ` für ${platforms}`;
  }

  return ` for ${platforms}`;
}

function categoryLabel(slug: string, category: CategorySummary | undefined, locale: Locale): string {
  const fallback = category ? formatCategoryName(category.name) : slug.replace(/-/g, " ");
  return localizedCategoryName(slug, fallback, locale);
}

function appCategoryNames(app: CatalogApp, categoryBySlug: Map<string, CategorySummary>, locale: Locale, limit = 4): string[] {
  const categorySlugs = app.categories.filter((category) => !genericCategories.has(category));
  const source = categorySlugs.length > 0 ? categorySlugs : app.categories;
  return source.slice(0, limit).map((category) => categoryLabel(category, categoryBySlug.get(category), locale));
}

function fallbackScope(
  app: CatalogApp,
  details: SurfaceResolvedDetails,
  categoryBySlug: Map<string, CategorySummary>,
  locale: Locale,
): string {
  if (details.capabilities.length > 0) {
    if (locale === "ja") {
      return `掲載されている機能は ${details.capabilities.length} 件あります。接続前に読み取り専用、対話型、書き込み可能の範囲を確認してください。`;
    }
    if (locale === "ko") {
      return `등록된 기능은 ${details.capabilities.length}개입니다. 연결 전에 읽기 전용, 인터랙티브, 쓰기 가능 범위를 확인하세요.`;
    }
    if (locale === "zh-hans") {
      return `列表中包含 ${details.capabilities.length} 项能力。连接前请确认只读、交互式和可写范围。`;
    }
    if (locale === "ru") {
      return `В листинге указано возможностей: ${details.capabilities.length}. Перед подключением проверьте read-only, interactive и write-capable scope.`;
    }

    const capabilities = readableList(details.capabilities.slice(0, 5), locale);
    return `Listed capabilities include ${capabilities}.`;
  }

  if (app.categories.length > 0) {
    const categories = readableList(appCategoryNames(app, categoryBySlug, locale, 3), locale);
    if (locale === "ja") {
      return `この掲載は ${categories} ワークフロー向けに分類されています。`;
    }
    if (locale === "ko") {
      return `이 목록은 ${categories} 워크플로로 분류되어 있습니다.`;
    }
    if (locale === "zh-hans") {
      return `此列表被归类为${categories}工作流。`;
    }
    if (locale === "ru") {
      return `Листинг относится к workflows: ${categories}.`;
    }
    return `The listing is categorized for ${categories} workflows.`;
  }

  if (locale === "ja") {
    return "この掲載には、公開者、認証、トランスポート、プラットフォーム詳細が確認用に含まれています。";
  }

  if (locale === "ko") {
    return "이 목록에는 검토를 위한 게시자, 인증, 전송 방식, 플랫폼 세부 정보가 포함되어 있습니다.";
  }

  if (locale === "zh-hans") {
    return "此列表包含发布者、认证、传输方式和平台详情，可用于连接前审查。";
  }

  if (locale === "ru") {
    return "Листинг содержит издателя, auth, transport и детали платформы для проверки перед подключением.";
  }

  return "The listing includes publisher, auth, transport, and platform details for review.";
}

function appFaqItems(
  app: CatalogApp,
  details: SurfaceResolvedDetails,
  primaryListing: ReturnType<typeof primarySurface>,
  categoryBySlug: Map<string, CategorySummary>,
  locale: Locale,
  surfaceCopy: I18nMessages["surface"],
): Array<{ question: string; answer: string }> {
  const mcpName = mcpSearchName(app.name);
  const kind = localizedAppKind(app, locale);
  const platforms = localizedAppPlatformPhrase(app, locale);
  const platformText = platforms ? (locale === "ru" ? ` для ${platforms}` : ` for ${platforms}`) : "";
  const surfaceText = primaryListing
    ? surfaceLabelFor(primaryListing, surfaceCopy)
    : platforms || (locale === "ja" ? "MCP ホスト" : locale === "ko" ? "MCP 호스트" : locale === "zh-hans" ? "MCP 宿主" : locale === "ru" ? "MCP-хост" : "an MCP host");
  const summary = trimSentence(details.tagline || app.tagline || app.description);
  const toolNames = details.tools.slice(0, 5).map((tool) => tool.name);

  if (locale === "ja") {
    return [
      {
        question: `${mcpName} とは？`,
        answer: `${app.name} は MCP App Store で${platforms ? ` ${platforms} 向けの` : ""}${kind} として掲載されています。接続前にプラットフォーム面、ツール、権限、公開者情報を比較できます。`,
      },
      {
        question: `${mcpName} はどう使いますか？`,
        answer: details.installCmd
          ? `この掲載に表示されているインストールコマンドを使い、接続前に ${authLabel(details.authType, locale)} 認証と ${details.mcpTransport} トランスポートを確認します。`
          : `この掲載の ${surfaceText} リンクを開き、接続前にアプリの認証、権限、公開者情報を確認します。`,
      },
      {
        question: `${app.name} はどんなツールを提供しますか？`,
        answer: toolNames.length > 0
          ? `掲載ツールには ${readableList(toolNames, locale)} などがあります。書き込み可能な操作を使う前に、ツール一覧と権限を確認してください。`
          : `${fallbackScope(app, details, categoryBySlug, locale)} 最新のツール範囲は公開者情報を確認してください。`,
      },
    ];
  }

  if (locale === "ko") {
    return [
      {
        question: `${mcpName}는 무엇인가요?`,
        answer: `${app.name}는 MCP App Store에${platforms ? ` ${platforms}용 ` : " "}${kind}로 등록되어 있습니다. 연결 전에 플랫폼 표면, 도구, 권한, 게시자 정보를 비교할 수 있습니다.`,
      },
      {
        question: `${mcpName}는 어떻게 사용하나요?`,
        answer: details.installCmd
          ? `이 목록에 표시된 설치 명령을 사용한 뒤, 연결 전에 ${authLabel(details.authType, locale)} 인증과 ${details.mcpTransport} 전송 방식을 검토하세요.`
          : `이 목록의 ${surfaceText} 링크를 열고, 연결 전에 앱의 인증, 권한, 게시자 정보를 검토하세요.`,
      },
      {
        question: `${app.name}는 어떤 도구를 제공하나요?`,
        answer: toolNames.length > 0
          ? `등록된 도구에는 ${readableList(toolNames, locale)} 등이 포함됩니다. 쓰기 가능한 작업을 사용하기 전에 도구 목록과 권한을 검토하세요.`
          : `${fallbackScope(app, details, categoryBySlug, locale)} 최신 도구 범위는 게시자 세부 정보를 확인하세요.`,
      },
    ];
  }

  if (locale === "zh-hans") {
    return [
      {
        question: `${mcpName} 是什么？`,
        answer: `${app.name} 在 MCP App Store 中作为${platforms ? `适用于 ${platforms} 的` : ""}${kind}列出。连接前可比较平台入口、工具、权限和发布者信息。`,
      },
      {
        question: `${mcpName} 如何使用？`,
        answer: details.installCmd
          ? `使用此列表显示的安装命令，并在连接前检查 ${authLabel(details.authType, locale)} 认证和 ${details.mcpTransport} 传输方式。`
          : `打开此列表中的 ${surfaceText} 链接，并在连接前检查认证、权限和发布者信息。`,
      },
      {
        question: `${app.name} 提供哪些工具？`,
        answer: toolNames.length > 0
          ? `列表工具包括 ${readableList(toolNames, locale)}。使用可写操作前，请先检查工具列表和权限。`
          : `${fallbackScope(app, details, categoryBySlug, locale)} 请查看发布者详情确认最新工具范围。`,
      },
    ];
  }

  if (locale === "ru") {
    return [
      {
        question: `Что такое ${mcpName}?`,
        answer: `${app.name} указано в MCP App Store как ${kind}${platformText}. Перед подключением можно сравнить платформу, tools, permissions и publisher info.`,
      },
      {
        question: `Как использовать ${mcpName}?`,
        answer: details.installCmd
          ? `Используйте install command из листинга, затем перед подключением проверьте ${authLabel(details.authType, locale)} auth и ${details.mcpTransport} transport.`
          : `Откройте ссылку ${surfaceText} из листинга, затем проверьте auth, permissions и publisher details приложения.`,
      },
      {
        question: `Какие tools предоставляет ${app.name}?`,
        answer: toolNames.length > 0
          ? `В листинге указаны tools: ${readableList(toolNames, locale)}. Перед write-capable actions проверьте список tools и permissions.`
          : `${fallbackScope(app, details, categoryBySlug, locale)} Проверьте publisher details для актуального tool scope.`,
      },
    ];
  }

  return [
    {
      question: `What is ${mcpName}?`,
      answer: `${app.name} is listed as ${kindArticle(kind)} ${kind}${platformText}. ${summary}.`,
    },
    {
      question: `How do I use ${mcpName}?`,
      answer: details.installCmd
        ? `Use the install command shown on this listing, then review the ${authLabel(details.authType)} auth type and ${details.mcpTransport} transport before connecting.`
        : `Open the ${surfaceText} link from this listing, then review the app's auth, permissions, and publisher details before connecting.`,
    },
    {
      question: `What tools does ${app.name} provide?`,
      answer: toolNames.length > 0
        ? `Listed tools include ${readableList(toolNames)}. Review the tool list and permissions before using write-capable actions.`
        : `${fallbackScope(app, details, categoryBySlug, locale)} Check the publisher details for the latest tool scope.`,
    },
  ];
}

function appUseCaseItems(
  app: CatalogApp,
  details: SurfaceResolvedDetails,
  categoryBySlug: Map<string, CategorySummary>,
  locale: Locale,
): Array<{ title: string; body: string }> {
  const categoryText = readableList(appCategoryNames(app, categoryBySlug, locale, 4), locale);
  const toolNames = details.tools.slice(0, 4).map((tool) => tool.name);
  const platforms = localizedAppPlatformPhrase(app, locale);
  const items: Array<{ title: string; body: string }> = [];

  if (locale === "ja") {
    items.push({
      title: "ワークフロー適合",
      body: `${app.name} は、静的なチャット回答だけではなく、${categoryText || "接続済み"} ワークフローのライブコンテキストを ${platforms || "MCP ホスト"} が必要とする場合に特に役立ちます。`,
    });

    if (toolNames.length > 0) {
      items.push({
        title: "ツール範囲",
        body: `ワークスペースやアシスタントホストへ接続する前に、${readableList(toolNames, locale)} などの MCP ツールアクセスを比較できます。`,
      });
    } else if (details.capabilities.length > 0) {
      items.push({
        title: "機能確認",
        body: "掲載されている主な機能を確認し、読み取り専用、対話型、書き込み可能のどれに当たるかを見極めます。",
      });
    }

    if (details.examplePrompts.length > 0) {
      items.push({
        title: "プロンプト検証",
        body: `${app.name} を小さなプロンプトで試し、後続作業に十分な文脈が返るかを確認します。`,
      });
    }

    items.push(details.previews.length > 0
      ? {
          title: "プレビュー確認",
          body: `プレビュー例を使って、${app.name} がワークフローに必要な結果、UI、確認ステップを返すかを確認します。`,
        }
      : {
          title: "比較文脈",
          body: `${app.name} を、プラットフォーム対応、認証方式、トランスポート、公開者リンク、関連する MCP アプリコレクションで類似掲載と比較します。`,
        });

    return items.slice(0, 4);
  }

  if (locale === "ko") {
    items.push({
      title: "워크플로 적합성",
      body: `${app.name}는 정적인 채팅 답변이 아니라 ${categoryText || "연결된"} 워크플로의 실시간 컨텍스트가 ${platforms || "MCP 호스트"}에 필요할 때 특히 적합합니다.`,
    });

    if (toolNames.length > 0) {
      items.push({
        title: "도구 범위",
        body: `앱을 워크스페이스나 어시스턴트 호스트에 연결하기 전에 ${readableList(toolNames, locale)} 같은 MCP 도구 접근을 비교할 수 있습니다.`,
      });
    } else if (details.capabilities.length > 0) {
      items.push({
        title: "기능 검토",
        body: "등록된 주요 기능을 확인하고 어떤 작업이 읽기 전용, 대화형, 쓰기 가능인지 검토하세요.",
      });
    }

    if (details.examplePrompts.length > 0) {
      items.push({
        title: "프롬프트 테스트",
        body: `${app.name}를 작은 프롬프트로 테스트하고 후속 작업에 충분한 컨텍스트가 포함되는지 확인하세요.`,
      });
    }

    items.push(details.previews.length > 0
      ? {
          title: "미리보기 확인",
          body: `미리보기 예시로 ${app.name}가 워크플로에 필요한 결과, UI, 확인 단계를 반환하는지 확인하세요.`,
        }
      : {
          title: "비교 컨텍스트",
          body: `${app.name}를 플랫폼 지원, 인증 유형, 전송 방식, 게시자 링크, 관련 MCP 앱 컬렉션 기준으로 유사 목록과 비교하세요.`,
        });

    return items.slice(0, 4);
  }

  if (locale === "zh-hans") {
    items.push({
      title: "工作流匹配",
      body: `${app.name} 适合在 ${platforms || "MCP 宿主"} 中处理${categoryText || "已连接"}工作流，尤其是需要实时上下文而不是静态聊天回答时。`,
    });

    if (toolNames.length > 0) {
      items.push({
        title: "工具范围",
        body: `连接到工作区或助手宿主前，可以比较 ${readableList(toolNames, locale)} 等 MCP 工具访问范围。`,
      });
    } else if (details.capabilities.length > 0) {
      items.push({
        title: "能力审查",
        body: `检查列表中的主要能力，并判断哪些操作是只读、交互式或可写。`,
      });
    }

    if (details.examplePrompts.length > 0) {
      items.push({
        title: "提示词测试",
        body: `先用一个小范围中文提示测试 ${app.name}，确认返回结果包含足够的来源上下文，便于继续跟进。`,
      });
    }

    items.push(details.previews.length > 0
      ? {
          title: "预览确认",
          body: `使用预览示例确认 ${app.name} 是否返回工作流需要的结果、界面或确认步骤。`,
        }
      : {
          title: "比较上下文",
          body: `按平台支持、认证方式、传输方式、发布者链接和相关 MCP 应用集合，把 ${app.name} 与类似列表比较。`,
        });

    return items.slice(0, 4);
  }

  if (locale === "ru") {
    items.push({
      title: "Соответствие workflow",
      body: `${app.name} особенно полезно, когда ${platforms || "MCP-хосту"} нужен живой контекст для ${categoryText || "подключенных"} workflows, а не статичный chat-only ответ.`,
    });

    if (toolNames.length > 0) {
      items.push({
        title: "Покрытие tools",
        body: `Перед подключением приложения к workspace или assistant host сравните доступ к MCP tools, например ${readableList(toolNames, locale)}.`,
      });
    } else if (details.capabilities.length > 0) {
      items.push({
        title: "Проверка возможностей",
        body: `Проверьте указанные возможности, например ${readableList(details.capabilities.slice(0, 4), locale)}, и уточните, какие действия read-only, interactive или write-capable.`,
      });
    }

    if (details.examplePrompts.length > 0) {
      items.push({
        title: "Тест prompts",
        body: `Начните с небольшого prompt для ${app.name} и проверьте, возвращает ли ответ достаточно исходного контекста для продолжения работы.`,
      });
    }

    items.push(details.previews.length > 0
      ? {
          title: "Проверка preview",
          body: `Используйте preview examples, чтобы понять, возвращает ли ${app.name} нужный результат, UI или confirmation step для вашего workflow.`,
        }
      : {
          title: "Контекст сравнения",
          body: `Сравните ${app.name} с похожими листингами по platform support, auth type, transport, publisher links и связанным MCP app collections.`,
        });

    return items.slice(0, 4);
  }

  items.push({
    title: "Workflow fit",
    body: `${app.name} is most relevant when ${platforms || "an MCP host"} needs live context for ${categoryText || "connected"} workflows instead of static chat-only answers.`,
  });

  if (toolNames.length > 0) {
    items.push({
      title: "Tool coverage",
      body: `Use it to compare MCP tool access such as ${readableList(toolNames)} before connecting the app to a workspace or assistant host.`,
    });
  } else if (details.capabilities.length > 0) {
    items.push({
      title: "Capability review",
      body: `Review listed capabilities such as ${readableList(details.capabilities.slice(0, 4))} and confirm which actions are read-only, interactive, or write-capable.`,
    });
  }

  if (details.examplePrompts.length > 0) {
    items.push({
      title: "Prompt testing",
      body: `Start from a listed prompt like "${trimSentence(details.examplePrompts[0])}" and test whether the response includes enough source context for follow-up work.`,
    });
  }

  if (details.previews.length > 0) {
    items.push({
      title: "Preview validation",
      body: `Use the preview examples to check whether ${app.name} returns the kind of result, UI, or confirmation step your workflow needs.`,
    });
  } else {
    items.push({
      title: "Comparison context",
      body: `Compare ${app.name} with similar listings by platform support, auth type, transport, publisher links, and related MCP app collections.`,
    });
  }

  return items.slice(0, 4);
}

function appConnectionChecklist(
  app: CatalogApp,
  details: SurfaceResolvedDetails,
  primaryListing: ReturnType<typeof primarySurface>,
  locale: Locale,
  surfaceCopy: I18nMessages["surface"],
): Array<{ title: string; body: string }> {
  const surfaceText = primaryListing
    ? surfaceLabelFor(primaryListing, surfaceCopy)
    : localizedAppPlatformPhrase(app, locale) || (locale === "ja" ? "MCP ホスト" : locale === "ko" ? "MCP 호스트" : locale === "zh-hans" ? "MCP 宿主" : locale === "ru" ? "MCP-хост" : "MCP host");
  const publisherText = app.publisher && app.publisher !== "Unknown"
    ? app.publisher
    : locale === "ja"
      ? "掲載されている公開者"
      : locale === "ko"
        ? "등록된 게시자"
        : locale === "zh-hans"
          ? "列表中的发布者"
          : locale === "ru"
            ? "указанный издатель"
            : "the listed publisher";
  const privacyText = app.privacyUrl
    ? locale === "ja"
      ? "プライバシーポリシーあり"
      : locale === "ko"
        ? "개인정보 처리방침 링크 있음"
        : locale === "zh-hans"
          ? "已提供隐私政策"
          : locale === "ru"
            ? "privacy policy указана"
            : "a privacy policy is linked"
    : locale === "ja"
      ? "プライバシーポリシーなし"
      : locale === "ko"
        ? "개인정보 처리방침 없음"
        : locale === "zh-hans"
          ? "未列出隐私政策"
          : locale === "ru"
            ? "privacy policy не указана"
            : "no privacy policy is listed";
  const supportText = app.supportUrl
    ? locale === "ja"
      ? "サポート情報あり"
      : locale === "ko"
        ? "지원 정보 링크 있음"
        : locale === "zh-hans"
          ? "已提供支持信息"
          : locale === "ru"
            ? "support details указаны"
            : "support details are linked"
    : locale === "ja"
      ? "サポート情報なし"
      : locale === "ko"
        ? "지원 정보 없음"
        : locale === "zh-hans"
          ? "未列出支持信息"
          : locale === "ru"
            ? "support details не указаны"
            : "support details are not listed";

  if (locale === "ja") {
    return [
      {
        title: "プラットフォーム面",
        body: `主な利用面: ${surfaceText}。プロンプトやツールを評価する前に、チームが実際に使うホストか確認してください。`,
      },
      {
        title: "認証とトランスポート",
        body: `掲載では ${authLabel(details.authType, locale)} 認証と ${details.mcpTransport} トランスポートが示されています。セキュリティとデプロイ要件に合うか確認します。`,
      },
      {
        title: "公開者とポリシーリンク",
        body: `公開者: ${publisherText}。${privacyText}、${supportText}。不足しているポリシーやサポートリンクは導入前の確認項目として扱ってください。`,
      },
    ];
  }

  if (locale === "ko") {
    return [
      {
        title: "플랫폼 표면",
        body: `기본 표면: ${surfaceText}. 프롬프트나 도구를 평가하기 전에 팀이 실제로 사용하는 호스트인지 확인하세요.`,
      },
      {
        title: "인증 및 전송",
        body: `목록에는 ${authLabel(details.authType, locale)} 인증과 ${details.mcpTransport} 전송 방식이 표시됩니다. 보안 및 배포 요구 사항과 맞는지 확인하세요.`,
      },
      {
        title: "게시자 및 정책 링크",
        body: `게시자: ${publisherText}. ${privacyText}, ${supportText}. 누락된 정책이나 지원 링크는 출시 전 검토 항목으로 다루세요.`,
      },
    ];
  }

  if (locale === "zh-hans") {
    return [
      {
        title: "平台入口",
        body: `主要入口：${surfaceText}。评估提示词或工具前，确认这是否是团队实际使用的宿主。`,
      },
      {
        title: "认证和传输",
        body: `列表显示使用 ${authLabel(details.authType, locale)} 认证和 ${details.mcpTransport} 传输方式。请确认它符合安全和部署要求。`,
      },
      {
        title: "发布者和政策链接",
        body: `发布者：${publisherText}。${privacyText}，${supportText}。缺失的政策或支持链接应作为上线前审查项。`,
      },
    ];
  }

  if (locale === "ru") {
    return [
      {
        title: "Платформа",
        body: `Основная поверхность: ${surfaceText}. Перед оценкой prompts или tools подтвердите, что это хост, которым реально пользуется команда.`,
      },
      {
        title: "Auth и transport",
        body: `В листинге указаны ${authLabel(details.authType, locale)} auth и ${details.mcpTransport} transport. Сверьте это с требованиями security и deployment.`,
      },
      {
        title: "Издатель и policy links",
        body: `Издатель: ${publisherText}; ${privacyText}; ${supportText}. Отсутствующие policy или support links считайте пунктами review перед rollout.`,
      },
    ];
  }

  return [
    {
      title: "Platform surface",
      body: `Primary surface: ${surfaceText}. Confirm that this is the host your team actually uses before evaluating prompts or tools.`,
    },
    {
      title: "Auth and transport",
      body: `The listing shows ${authLabel(details.authType)} auth with ${details.mcpTransport} transport. Match that against your security and deployment requirements.`,
    },
    {
      title: "Publisher and policy links",
      body: `Publisher: ${publisherText}; ${privacyText}; ${supportText}. Treat missing policy or support links as review items before rollout.`,
    },
  ];
}

interface AppGuideLink {
  label: string;
  href: string;
  summary: string;
}

const appGuideLinksById: Record<string, AppGuideLink[]> = {
  tldraw: [
    {
      label: "tldraw MCP app guide",
      href: "/learn/tldraw-mcp-app",
      summary: "Use tldraw with Claude for diagrams, wireframes, mind maps, and shared visual workflows.",
    },
    {
      label: "Design app guide",
      href: "/learn/chatgpt-apps-for-design",
      summary: "Compare visual AI app patterns for design teams, asset workflows, and design-to-code handoff.",
    },
  ],
  brand24: [
    {
      label: "Brand24 MCP guide",
      href: "/learn/brand24-mcp",
      summary: "Evaluate Brand24 for social listening, sentiment analysis, brand monitoring, and marketing reporting.",
    },
    {
      label: "Marketing analytics collection",
      href: "/collections/mcp-apps-for-marketing-analytics",
      summary: "Compare MCP apps for SEO, brand monitoring, campaign analytics, and AI visibility workflows.",
    },
  ],
  morningstar: [
    {
      label: "Morningstar MCP guide",
      href: "/learn/morningstar-mcp",
      summary: "Use Morningstar for market research, analyst context, screening, and finance workflows.",
    },
    {
      label: "Finance MCP app collection",
      href: "/collections/mcp-apps-for-finance-teams",
      summary: "Compare finance apps for accounting, market data, payment, and financial analysis workflows.",
    },
  ],
  "ant-dir-gh-anthropic-pdf-server-mcp": [
    {
      label: "Anthropic PDF viewer MCP guide",
      href: "/learn/anthropic-pdf-viewer-mcp",
      summary: "Compare PDF viewer, extraction, annotation, conversion, and document review workflows.",
    },
    {
      label: "Claude productivity connectors",
      href: "/learn/best-claude-connectors-for-productivity",
      summary: "Evaluate Claude connectors for files, calendars, docs, tasks, meetings, and everyday team work.",
    },
  ],
  "pdf-viewer": [
    {
      label: "Anthropic PDF viewer MCP guide",
      href: "/learn/anthropic-pdf-viewer-mcp",
      summary: "Compare PDF viewer, extraction, annotation, conversion, and document review workflows.",
    },
  ],
  smallpdf: [
    {
      label: "Anthropic PDF viewer MCP guide",
      href: "/learn/anthropic-pdf-viewer-mcp",
      summary: "Compare PDF viewer, extraction, annotation, conversion, and document review workflows.",
    },
  ],
  "anypdf-your-pdf-converter": [
    {
      label: "Anthropic PDF viewer MCP guide",
      href: "/learn/anthropic-pdf-viewer-mcp",
      summary: "Compare PDF viewer, extraction, annotation, conversion, and document review workflows.",
    },
  ],
  n8n: [
    {
      label: "n8n MCP guide",
      href: "/learn/n8n-mcp",
      summary: "Use n8n with Claude for workflow search, automation testing, and safe operations review.",
    },
    {
      label: "Claude productivity connectors",
      href: "/learn/best-claude-connectors-for-productivity",
      summary: "Evaluate Claude connectors for files, calendars, docs, tasks, meetings, and everyday team work.",
    },
  ],
  calendly: [
    {
      label: "Calendly to Claude guide",
      href: "/learn/calendly-to-claude",
      summary: "Connect scheduling workflows to Claude with availability, event types, bookings, and review controls.",
    },
    {
      label: "Claude productivity connectors",
      href: "/learn/best-claude-connectors-for-productivity",
      summary: "Evaluate Claude connectors for files, calendars, docs, tasks, meetings, and everyday team work.",
    },
  ],
  "grafana-mcp-server": [
    {
      label: "Pyroscope MCP guide",
      href: "/learn/pyroscope-mcp",
      summary: "Use Grafana MCP Server for profiling, dashboards, metrics, logs, alerts, and incident context.",
    },
    {
      label: "Observability collection",
      href: "/collections/mcp-apps-for-observability",
      summary: "Compare MCP apps for monitoring, logs, metrics, profiling, incidents, and security operations.",
    },
  ],
};

function appRelatedGuideLinks(app: CatalogApp): AppGuideLink[] {
  return appGuideLinksById[app.id] ?? [];
}

export default async function AppDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ locale, messages: t }, { id }] = await Promise.all([getI18n(), params]);
  const href = (path: string) => localizedPath(path, locale);
  const app = await getAppById(id);

  if (!app) {
    const redirectPath = redirectedAppPath(id);
    if (redirectPath) {
      permanentRedirect(redirectPath);
    }

    notFound();
  }

  const primaryListing = primarySurface(app.surfaces);
  const fallbackDetails = {
    tagline: app.tagline,
    description: app.description,
    capabilities: app.capabilities,
    examplePrompts: app.examplePrompts,
    tools: app.tools,
    previews: app.previews,
    mcpEndpoint: app.mcpEndpoint,
    mcpTransport: app.mcpTransport,
    installCmd: app.installCmd,
    authType: app.authType,
  };
  const primaryDetails = surfaceDetails(primaryListing, fallbackDetails);
  const [publishedApps, categories] = await Promise.all([listPublishedApps(), getCategorySummaries()]);
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  const primaryIndexableCategory = app.categories
    .map((category) => categoryBySlug.get(category))
    .find(isIndexableCategory);
  const breadcrumbCategory = primaryIndexableCategory
    ? {
        name: categoryLabel(primaryIndexableCategory.slug, primaryIndexableCategory, locale),
        path: `/category/${primaryIndexableCategory.slug}`,
      }
    : { name: t.common.apps, path: "/store" };
  const relatedCollections = localizedAppCollections(locale)
    .filter((collection) => collectionMatchesApp(collection, app))
    .sort((left, right) => collectionMatchScore(right, app) - collectionMatchScore(left, app))
    .slice(0, 3);
  const relatedApps = publishedApps
    .filter((candidate) => candidate.id !== app.id)
    .map((candidate) => ({
      app: candidate,
      score: relatedAppScore(app, candidate),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (Number(right.app.isFeatured) !== Number(left.app.isFeatured)) {
        return Number(right.app.isFeatured) - Number(left.app.isFeatured);
      }

      return left.app.name.localeCompare(right.app.name);
    })
    .slice(0, 4)
    .map((candidate) => candidate.app);
  const appFaqs = appFaqItems(app, primaryDetails, primaryListing, categoryBySlug, locale, t.surface);
  const appKind = localizedAppKind(app, locale);
  const platformText = localizedPlatformText(app, locale);
  const aboutName = mcpSearchName(app.name);
  const aboutTools = primaryDetails.tools.length > 0
    ? locale === "ja"
      ? `掲載されている MCP ツールには ${readableList(primaryDetails.tools.slice(0, 5).map((tool) => tool.name), locale)} などがあります。`
      : locale === "ko"
        ? `등록된 MCP 도구에는 ${readableList(primaryDetails.tools.slice(0, 5).map((tool) => tool.name), locale)} 등이 포함됩니다.`
        : locale === "zh-hans"
          ? `已列出的 MCP 工具包括 ${readableList(primaryDetails.tools.slice(0, 5).map((tool) => tool.name), locale)} 等。`
          : locale === "ru"
            ? `В листинге указаны MCP tools: ${readableList(primaryDetails.tools.slice(0, 5).map((tool) => tool.name), locale)}.`
            : `Listed MCP tools include ${readableList(primaryDetails.tools.slice(0, 5).map((tool) => tool.name))}.`
    : fallbackScope(app, primaryDetails, categoryBySlug, locale);
  const useCaseItems = appUseCaseItems(app, primaryDetails, categoryBySlug, locale);
  const connectionChecklist = appConnectionChecklist(app, primaryDetails, primaryListing, locale, t.surface);
  const capabilitiesText = primaryDetails.capabilities.join(", ");
  const relatedGuideLinks = appRelatedGuideLinks(app);
  const recommendedSkills = (app.skills ?? []).slice(0, 6);

  return (
    <div className="page-stack">
      <nav className="crumbs">
        <Link href={href("/")}>{t.common.apps}</Link>
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <path d="M9 18 15 12 9 6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        </svg>
        <Link href={href(breadcrumbCategory.path)}>{breadcrumbCategory.name}</Link>
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <path d="M9 18 15 12 9 6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        </svg>
        <span>{app.name}</span>
      </nav>

      <header className="app-head">
        <div className="app-avatar detail-avatar">
          {app.iconUrl ? (
            <img
              alt={`${app.name} icon`}
              decoding="async"
              fetchPriority="high"
              height={256}
              loading="eager"
              sizes="96px"
              src={optimizedImageUrl(app.iconUrl)}
              width={256}
            />
          ) : (
            <span>{initials(app.name)}</span>
          )}
        </div>
        <div className="app-head-text">
          <h1>{app.name}</h1>
          <p>{primaryDetails.tagline}</p>
          <div className="surface-badges detail-surfaces" aria-label={t.common.availableSurfaces}>
            {app.surfaces.map((surface, index) => (
              <PlatformBadge key={`${surface.platform}-${surface.type}-${index}`} label={surfaceLabelFor(surface, t.surface)} surface={surface} />
            ))}
          </div>
        </div>
        <div className="app-head-cta">
          {primaryDetails.installCmd ? <button className="btn-ghost" type="button">{t.appDetail.save}</button> : null}
          {primaryListing?.url ?? app.homepageUrl ? (
            <a className="btn-connect" href={primaryListing?.url ?? app.homepageUrl} rel="noreferrer" target="_blank">
              {t.appDetail.connect}
            </a>
          ) : null}
        </div>
      </header>

      <PreviewBubbles mockupLabel={t.appDetail.mockup} previews={primaryDetails.previews} />

      <section className="detail-section prose-grid">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{primaryDetails.description}</ReactMarkdown>
      </section>

      <section className="detail-section prose-grid" aria-labelledby="about-mcp">
        <h2 className="section-title" id="about-mcp">{formatMessage(t.appDetail.about, { name: aboutName })}</h2>
        <p>
          {formatMessage(t.appDetail.aboutParagraph, {
            appName: app.name,
            article: locale === "en" ? kindArticle(appKind) : "",
            kind: appKind,
            platformText,
          })}
        </p>
        <p>
          {aboutTools} {formatMessage(t.appDetail.authTransport, {
            auth: authLabel(primaryDetails.authType, locale),
            transport: primaryDetails.mcpTransport,
          })}
        </p>
      </section>

      <section className="detail-section" aria-labelledby="app-use-cases">
        <h2 className="section-title" id="app-use-cases">{formatMessage(t.appDetail.useCases, { name: aboutName })}</h2>
        <ul className="tool-list tool-table">
          {useCaseItems.map((item) => (
            <li key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.body}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="detail-section" aria-labelledby="connection-checklist">
        <h2 className="section-title" id="connection-checklist">{t.appDetail.beforeConnect}</h2>
        <ul className="tool-list tool-table">
          {connectionChecklist.map((item) => (
            <li key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.body}</span>
            </li>
          ))}
        </ul>
      </section>

      {recommendedSkills.length > 0 ? (
        <section className="detail-section" aria-labelledby="recommended-skills">
          <h2 className="section-title" id="recommended-skills">{t.appDetail.recommendedSkills}</h2>
          <p className="skill-section-copy">{t.appDetail.recommendedSkillsCopy}</p>
          <div className="skill-grid">
            {recommendedSkills.map((skill) => {
              const skillHref = skill.installUrl ?? skill.sourceUrl;
              const skillTags = Array.from(new Set([...skill.categories, ...skill.tags])).slice(0, 4);

              return (
                <article className="skill-card" key={skill.id}>
                  <div className="skill-card-top">
                    <span className={`skill-relation ${skill.relationType}`}>
                      {skillRelationLabel(skill.relationType, t.appDetail)}
                    </span>
                    {skill.confidence ? <span className="skill-confidence">{Math.round(skill.confidence * 100)}%</span> : null}
                  </div>
                  <h3>
                    <Link href={href(skillPath(skill.id))} prefetch={false}>
                      {skill.displayName}
                    </Link>
                  </h3>
                  <p>{skill.reason ?? skill.description}</p>
                  {skillTags.length > 0 ? (
                    <div className="skill-tags">
                      {skillTags.map((tag) => (
                        <span key={tag}>{tag.replace(/-/g, " ")}</span>
                      ))}
                    </div>
                  ) : null}
                  {skillHref ? (
                    <a className="skill-source" href={skillHref} rel="noreferrer" target="_blank">
                      {t.appDetail.skillSource}
                    </a>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {primaryDetails.examplePrompts.length > 0 ? (
        <section className="detail-section">
          <h2 className="section-title">{t.appDetail.tryPrompts}</h2>
          <ul className="prompts">
            {primaryDetails.examplePrompts.map((prompt) => (
              <li key={prompt}>
                <button className="prompt-row" type="button">
                  <span className="dot" />
                  {prompt}
                  <span className="prompt-copy">{t.appDetail.copy}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {app.surfaces.length > 1 ? (
        <section className="detail-section">
          <h2 className="section-title">{t.appDetail.platformSurfaces}</h2>
          <div className="surface-detail-list">
            {app.surfaces.map((surface, index) => {
              const details = surfaceDetails(surface, fallbackDetails);
              return (
                <article className="surface-detail" key={`${surface.platform}-${surface.type}-${surface.externalId ?? surface.url}-${index}`}>
                  <div>
                    <h3>{surfaceLabelFor(surface, t.surface)}</h3>
                    <p>{details.tagline}</p>
                  </div>
                  <dl>
                    <div>
                      <dt>{t.appDetail.capabilities}</dt>
                      <dd>{details.capabilities.join(", ") || t.common.unknown}</dd>
                    </div>
                    <div>
                      <dt>{t.appDetail.tools}</dt>
                      <dd>{details.tools.length > 0 ? details.tools.map((tool) => tool.name).join(", ") : t.common.notListed}</dd>
                    </div>
                    <div>
                      <dt>{t.appDetail.previews}</dt>
                      <dd>{details.previews.length}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="detail-section">
        <h2 className="section-title">{t.appDetail.information}</h2>
        <div className="info-table">
          <div className="info-row">
            <div className="info-key">{t.appDetail.availableIn}</div>
            <div className="info-val surface-list">
              {app.surfaces.map((surface, index) =>
                surface.url ? (
                  <a href={surface.url} key={`${surface.platform}-${surface.type}-${index}`} rel="noreferrer" target="_blank">
                    {surfaceLabelFor(surface, t.surface)}
                  </a>
                ) : (
                  <span key={`${surface.platform}-${surface.type}-${index}`}>{surfaceLabelFor(surface, t.surface)}</span>
                ),
              )}
            </div>
          </div>
          <div className="info-row">
            <div className="info-key">{t.appDetail.category}</div>
            <div className="info-val surface-list">
              {app.categories.map((category) => {
                const summary = categoryBySlug.get(category);
                const label = categoryLabel(category, summary, locale);

                return isIndexableCategory(summary) ? (
                  <Link href={href(`/category/${category}`)} key={category}>
                    {label}
                  </Link>
                ) : (
                  <span key={category}>{label}</span>
                );
              })}
            </div>
          </div>
          <div className="info-row">
            <div className="info-key">{t.appDetail.capabilities}</div>
            <div className="info-val">{capabilitiesText}</div>
          </div>
          <div className="info-row">
            <div className="info-key">{t.appDetail.developer}</div>
            <div className="info-val">{app.publisher}</div>
          </div>
          <div className="info-row">
            <div className="info-key">{t.appDetail.website}</div>
            <div className="info-val">{app.homepageUrl ? <a href={app.homepageUrl}>{app.homepageUrl}</a> : t.common.notProvided}</div>
          </div>
          {app.repoUrl ? (
            <div className="info-row">
              <div className="info-key">{t.appDetail.githubRepo}</div>
              <div className="info-val">
                <a href={app.repoUrl} rel="noreferrer" target="_blank">
                  {app.repoUrl}
                </a>
              </div>
            </div>
          ) : null}
          <div className="info-row">
            <div className="info-key">{t.appDetail.version}</div>
            <div className="info-val">{app.version ?? t.common.unknown}</div>
          </div>
          <div className="info-row">
            <div className="info-key">{t.appDetail.privacyPolicy}</div>
            <div className="info-val">{app.privacyUrl ? <a href={app.privacyUrl}>{t.common.openPrivacyPolicy}</a> : t.common.notProvided}</div>
          </div>
          <div className="info-row">
            <div className="info-key">{t.appDetail.termsOfService}</div>
            <div className="info-val">{app.termsUrl ? <a href={app.termsUrl}>{t.common.openTermsOfService}</a> : t.common.notProvided}</div>
          </div>
          <div className="info-row">
            <div className="info-key">{t.appDetail.customerSupport}</div>
            <div className="info-val">{app.supportUrl ? <a href={app.supportUrl}>{t.common.openCustomerSupport}</a> : t.common.notProvided}</div>
          </div>
          <div className="info-row">
            <div className="info-key">{t.appDetail.transport}</div>
            <div className="info-val">{primaryDetails.mcpTransport}</div>
          </div>
          <div className="info-row">
            <div className="info-key">{t.appDetail.install}</div>
            <div className="info-val"><code>{primaryDetails.installCmd ?? t.common.notProvided}</code></div>
          </div>
        </div>
      </section>

      {primaryDetails.tools.length > 0 ? (
        <section className="detail-section">
          <h2 className="section-title">{t.appDetail.tools}</h2>
          <ul className="tool-list tool-table">
            {primaryDetails.tools.map((tool) => (
              <li key={tool.name}>
                <strong>{tool.name}</strong>
                <span>{tool.description}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {relatedCollections.length > 0 ? (
        <section className="detail-section" aria-labelledby="related-collections">
          <h2 className="section-title" id="related-collections">{t.appDetail.relatedCollections}</h2>
          <div className="related-collection-grid">
            {relatedCollections.map((collection) => (
              <Link className="related-collection-card" href={href(`/collections/${collection.slug}`)} key={collection.slug}>
                <span>{collection.eyebrow}</span>
                <strong>{collection.title}</strong>
                <p>{collection.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {relatedGuideLinks.length > 0 ? (
        <section className="detail-section" aria-labelledby="related-guides">
          <h2 className="section-title" id="related-guides">{t.common.learn}</h2>
          <div className="related-collection-grid">
            {relatedGuideLinks.map((guide) => (
              <Link className="related-collection-card" href={href(guide.href)} key={guide.href}>
                <span>{t.appDetail.guide}</span>
                <strong>{guide.label}</strong>
                <p>{guide.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {relatedApps.length > 0 ? (
        <section className="detail-section" aria-labelledby="related-apps">
          <h2 className="section-title" id="related-apps">{t.appDetail.similarApps}</h2>
          <div className="app-grid related-app-grid">
            {relatedApps.map((relatedApp) => (
              <AppCard app={relatedApp} key={relatedApp.id} locale={locale} messages={t} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="article-faq" id="faq">
        <div className="section-head compact">
          <p className="eyebrow">{t.common.faq}</p>
          <h2>{formatMessage(t.appDetail.faqTitle, { name: aboutName })}</h2>
        </div>
        <div className="faq-list">
          {appFaqs.map((item) => (
            <details className="faq-item" key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="report">
        <Link className="report-btn" href={href("/")}>
          {t.appDetail.backToApps}
        </Link>
      </div>
      <script
        dangerouslySetInnerHTML={jsonLdScript([
          appJsonLd(app, locale),
          breadcrumbJsonLd([
            { name: "Apps", path: "/" },
            breadcrumbCategory,
            { name: app.name, path: `/app/${app.id}` },
          ]),
          ...(relatedCollections.length > 0
            ? [
                itemListJsonLd(
                  relatedCollections.map((collection) => ({
                    name: collection.title,
                    path: `/collections/${collection.slug}`,
                  })),
                  locale === "zh-hans"
                    ? `${app.name} 相关 MCP 应用集合`
                    : locale === "ja"
                      ? `${app.name} 関連 MCP アプリコレクション`
                      : locale === "ko"
                        ? `${app.name} 관련 MCP 앱 컬렉션`
                        : locale === "ru"
                          ? `${app.name}: связанные коллекции MCP-приложений`
                          : `${app.name} related MCP app collections`,
                ),
              ]
            : []),
          ...(relatedGuideLinks.length > 0
            ? [
                itemListJsonLd(
                  relatedGuideLinks.map((guide) => ({
                    name: guide.label,
                    path: guide.href,
                  })),
                  locale === "zh-hans"
                    ? `${app.name} 相关 MCP 学习指南`
                    : locale === "ja"
                      ? `${app.name} 関連 MCP ガイド`
                      : locale === "ko"
                        ? `${app.name} 관련 MCP 가이드`
                        : locale === "ru"
                          ? `${app.name}: связанные MCP-гайды`
                          : `${app.name} related MCP guides`,
                ),
              ]
            : []),
          ...(relatedApps.length > 0
            ? [
                itemListJsonLd(
                  relatedApps.map((relatedApp) => ({
                    name: relatedApp.name,
                    path: `/app/${relatedApp.id}`,
                  })),
                  locale === "zh-hans"
                    ? `${app.name} 相关 MCP 应用`
                    : locale === "ja"
                      ? `${app.name} 関連 MCP アプリ`
                      : locale === "ko"
                        ? `${app.name} 관련 MCP 앱`
                        : locale === "ru"
                          ? `${app.name}: связанные MCP-приложения`
                          : `${app.name} related MCP apps`,
                ),
              ]
            : []),
          faqJsonLd(appFaqs),
        ])}
        type="application/ld+json"
      />
    </div>
  );
}
