import {
  appCollections,
  featuredAppCollections,
  getAppCollection,
  type AppCollection,
} from "@/lib/collections";
import {
  categoryContentBySlug,
  genericCategoryContent,
  type CategoryContent,
} from "@/lib/category-content";
import type { Locale } from "@/lib/i18n";
import {
  featuredLearnArticles,
  getLearnArticle,
  learnArticles,
  siteFaqItems,
  type LearnArticle,
  type LearnFaq,
  type LearnLink,
  type LearnSection,
  type LearnSource,
} from "@/lib/learn";

type LocalizedLink = Partial<LearnLink>;
type LocalizedSection = Pick<LearnSection, "id"> & Partial<Omit<LearnSection, "id">>;
type LocalizedArticle = Partial<
  Omit<LearnArticle, "primaryCta" | "secondaryCta" | "relatedLinks" | "sections" | "faqs" | "sources">
> & {
  primaryCta?: LocalizedLink;
  secondaryCta?: LocalizedLink;
  relatedLinks?: LocalizedLink[];
  sections?: LocalizedSection[];
  faqs?: LearnFaq[];
  sources?: LearnSource[];
};
type LocalizedCollection = Partial<Omit<AppCollection, "relatedLinks" | "checkpoints" | "faqs">> & {
  relatedLinks?: LocalizedLink[];
  checkpoints?: string[];
  faqs?: LearnFaq[];
};
type ContentLocale = Exclude<Locale, "en">;

const jaArticleCopy: Record<string, LocalizedArticle> = {
  "what-is-an-mcp-app": {
    eyebrow: "MCP の基本",
    title: "MCP アプリとは？",
    description: "MCP アプリ、MCP サーバー、ChatGPT アプリ、Claude コネクタを平易に整理します。",
    summary: "利用者が見るアプリ、裏側の MCP サーバー、実行されるホストの違いを理解できます。",
    readingTime: "5 分で読める",
    topics: ["MCP", "ChatGPT アプリ", "Claude コネクタ"],
    primaryCta: { label: "MCP アプリを探す" },
    secondaryCta: { label: "MCP を投稿" },
    relatedLinks: [
      { label: "最初の MCP アプリを作る方法" },
      { label: "おすすめ MCP アプリコレクション" },
      { label: "MCP アプリ FAQ" },
      { label: "掲載ガイド" },
    ],
    sections: [
      {
        id: "definition",
        title: "短く言うと",
        body: [
          "MCP アプリは、AI アシスタントがチャット画面の外にあるツールやデータへ届くようにするプロダクト体験です。多くの場合、名前、説明、ツール、権限、場合によっては埋め込み UI を含みます。その裏側にある技術レイヤーが MCP サーバーです。",
          "サーバーは Model Context Protocol を通じて機能を公開し、ChatGPT、Claude、Claude Code、その他の MCP 対応クライアントなどのホストが、その機能を利用者にどう見せるかを決めます。",
        ],
        callout:
          "このディレクトリでは、利用者が探す掲載面を「アプリ」、ツールを公開するバックエンドを「サーバー」と呼んでいます。",
      },
      {
        id: "parts",
        title: "3 つの構成要素",
        body: ["ほとんどの MCP アプリには、実務上 3 つのレイヤーがあります。分けて考えるとエコシステム全体を理解しやすくなります。"],
        bullets: [
          "アプリ掲載: 名前、アイコン、タグライン、カテゴリ、例、リンク、対応プラットフォーム。",
          "MCP サーバー: ツール、認証、トランスポート、スキーマ、外部システムを読む・書くコード。",
          "ホスト面: ChatGPT アプリ、Claude コネクタ、Claude Code、IDE、その他のクライアント。",
        ],
      },
      {
        id: "why-it-matters",
        title: "MCP が重要な理由",
        body: [
          "MCP 以前は、AI アプリごとに独自の連携方法が必要になりがちでした。MCP は、ツール、データ、ワークフローを複数の AI ホストへ公開する共通の方法を提供します。",
          "つまり、カレンダー、データベース、デザインツール、CRM、コードベース、分析プロダクトなどを、同じようなコネクタを何度も作り直さず、予測しやすい形でアシスタントに渡せます。",
        ],
      },
      {
        id: "chatgpt-vs-claude",
        title: "ChatGPT アプリと Claude コネクタ",
        body: [
          "ChatGPT アプリは MCP サーバー上に構築された ChatGPT 向け体験で、必要に応じて埋め込み UI を含められます。Claude コネクタは、Claude が外部コンテキストやツールへアクセスするための Claude 向け接続です。",
          "多くのプロダクトは両方をサポートできます。大事なのはラベルの優劣ではなく、利用者がどのホストで作業しているか、サーバーがどの操作を安全に実行できるかです。",
        ],
      },
    ],
    faqs: [
      {
        question: "MCP アプリと MCP サーバーは同じですか？",
        answer: "いいえ。MCP サーバーはツールやデータを公開する技術的なバックエンドで、アプリは人が発見、評価、接続する利用者向けのプロダクト面です。",
      },
      {
        question: "MCP アプリには画面 UI が必要ですか？",
        answer: "必要ありません。ツールだけのサーバーでも有用です。比較、選択、編集、確認が必要な構造化結果では UI が役立ちます。",
      },
      {
        question: "1 つの MCP サーバーを複数の AI クライアントで使えますか？",
        answer: "はい。それがプロトコルの目的です。ホストごとに機能や審査ルールは違っても、サーバー契約は共有できます。",
      },
    ],
  },
  "build-your-first-mcp-app": {
    eyebrow: "ビルダー向けチュートリアル",
    title: "最初の MCP アプリを作る方法",
    description: "MCP サーバーの計画、ツール定義、任意の ChatGPT UI、掲載準備までを進める実践チェックリストです。",
    summary: "安全な 1 つのワークフローから始め、小さなツール契約、認証、テストを整え、発見される形でまとめます。",
    readingTime: "8 分で読める",
    topics: ["MCP サーバー", "Apps SDK", "ビルダー向けチェックリスト"],
    primaryCta: { label: "掲載を投稿" },
    secondaryCta: { label: "掲載ガイドを読む" },
    relatedLinks: [
      { label: "MCP アプリとは？" },
      { label: "開発者向けおすすめ MCP アプリ" },
      { label: "OpenAI Apps SDK クイックスタート" },
      { label: "公式 MCP SDK" },
    ],
    sections: [
      {
        id: "pick-workflow",
        title: "1. ワークフローを 1 つ選ぶ",
        body: [
          "最初のアプリはプロダクト全体である必要はありません。レコード検索、プロジェクト要約、タスク作成、デザイン更新、データベース照会など、前後が明確な狭いワークフローが最適です。",
          "コードを書く前に、利用者への約束を 1 文で書きます。1 文に収まらないなら、より小さなツールに分けましょう。",
        ],
        bullets: [
          "良い最初のワークフロー: 未解決のサポートチケットを検索し、主なブロッカーを要約する。",
          "危険な最初のワークフロー: すべての顧客システムへの全面アクセスをモデルに渡す。",
          "最初の到達点: 読み取り専用ツール 1 つ、成功パス 1 つ、有用な結果形式 1 つ。",
        ],
      },
      {
        id: "tool-contract",
        title: "2. ツール契約を定義する",
        body: [
          "MCP ツールには、モデルが理解しやすい名前、短い説明、型付き入力スキーマが必要です。説明はモデルがツールの出番を判断する材料なので、プロダクト面の一部でもあります。",
        ],
      },
      {
        id: "server",
        title: "3. サーバーを作る",
        body: [
          "可能なら公式 MCP SDK を使います。公式 MCP ドキュメントには TypeScript、Python、C#、Go、Java、Rust などの SDK が掲載されています。",
          "ChatGPT アプリの場合、OpenAI Apps SDK の流れでは MCP サーバーと任意の iframe UI を使います。まずローカルで始め、ホスト型クライアントから接続する段階で HTTP トランスポートへデプロイします。",
        ],
        steps: [
          "MCP サーバープロジェクトを作成する。",
          "最初の読み取り専用ツールを登録する。",
          "モデルと UI の両方が使える構造化結果を返す。",
          "ツール形状が安定してから認証を追加する。",
          "不要なユーザーデータを保存せず、ツール呼び出しとエラーを記録する。",
        ],
      },
      {
        id: "ui",
        title: "4. UI は役立つ場所にだけ追加する",
        body: [
          "UI は、構造化出力の確認、選択肢の比較、正確な選択が必要なときに役立ちます。すべての MCP アプリに必須ではありません。",
          "ChatGPT アプリでは UI は iframe 内で動き、MCP Apps bridge を通じてホストと通信します。結果表示は 1 つ、明確な操作は 1 つ、隠れた副作用はなし、という形に絞りましょう。",
        ],
      },
      {
        id: "ship",
        title: "5. 審査と発見に備える",
        body: [
          "掲載では、何を読めるか、何を書けるか、対応プラットフォーム、認証方式、ワークフローを証明する例を説明します。",
          "良い SEO と良い審査資料は重なります。正確なタイトル、平易な説明、スクリーンショットやプレビュー、プライバシーリンク、サポートリンク、正直な機能ラベルを用意します。",
        ],
        bullets: [
          "ホームページ、プライバシー、規約、サポート URL を追加する。",
          "ChatGPT アプリ、Claude コネクタ、Claude Code など、プラットフォーム面を個別に示す。",
          "マーケティング文ではなく、実際の使い方を示すプロンプト例を入れる。",
          "最小権限の OAuth スコープと読み取り専用の初回リリースを優先する。",
        ],
      },
    ],
    faqs: [
      { question: "最初の MCP アプリは読み取り専用にすべきですか？", answer: "多くの場合ははい。読み取り専用ツールはテスト、審査、信頼の確保がしやすいです。確認と認証境界が明確になってから書き込み操作を追加しましょう。" },
      { question: "どの言語を使うべきですか？", answer: "バックエンドチームが保守できる言語を使ってください。公式 MCP ドキュメントには TypeScript、Python、C#、Go、Java、Rust などの SDK が掲載されています。" },
      { question: "ChatGPT UI コンポーネントは必要ですか？", answer: "埋め込みインターフェイスがワークフローに役立つ場合だけ必要です。検索結果、ギャラリー、比較表、エディタ、ダッシュボードは良い候補です。" },
    ],
  },
  "chatgpt-apps-for-design": {
    eyebrow: "ユースケースガイド",
    title: "デザインチーム向け ChatGPT アプリ",
    description: "ブリーフ、素材、図解、画像編集、ブランド作業、デザインからコードへの流れに役立つ ChatGPT アプリのガイドです。",
    summary: "デザインアプリの型を比較し、一般的なプロンプトではなく視覚的な ChatGPT アプリを使うべき場面を判断します。",
    readingTime: "6 分で読める",
    topics: ["ChatGPT アプリ", "デザイン", "クリエイティブワークフロー"],
    primaryCta: { label: "デザインアプリを探す" },
    secondaryCta: { label: "ChatGPT アプリを探す" },
    relatedLinks: [
      { label: "MCP アプリとは？" },
      { label: "デザインチーム向けおすすめ ChatGPT アプリ" },
      { label: "最初の MCP アプリを作る" },
      { label: "デザイン MCP を投稿" },
    ],
    sections: [
      {
        id: "when-to-use",
        title: "プロンプトよりデザインアプリが向く場面",
        body: [
          "デザイン向け ChatGPT アプリは、素材、プレビュー、プロジェクト文脈、デザインシステム内の操作が必要な作業で役立ちます。通常のプロンプトはアイデアを下書きできますが、アプリならファイル検索、ブランド素材の表示、画像編集、図の作成、構造化出力の受け渡しができます。",
          "優れたアプリは手作業のコピーを減らします。会話を、デザイナー、マーター、プロダクトマネージャーが続けて扱える具体物に変えます。",
        ],
      },
      {
        id: "patterns",
        title: "よくあるデザインワークフロー",
        body: ["有用なデザインアプリの多くは、繰り返し使えるいくつかの型に収まります。型でアプリを選び、後処理の少なさで結果を判断します。"],
        bullets: [
          "ブリーフから初稿へ: キャンペーン案を投稿、資料、ワイヤーフレーム、ムードボードに変える。",
          "素材検索: ストック画像、ブランドファイル、アイコン、参考資料、過去成果物を探す。",
          "デザイン編集: 背景削除、リサイズ、レタッチ、コピー書き換え、バリエーション生成。",
          "図解: 自然言語のブリーフからフロー、マップ、スライド構成、システム図を作る。",
          "デザインからコードへ: 視覚的な方向性を HTML、CSS、コンポーネント、プロトタイプに変える。",
        ],
      },
      {
        id: "evaluation",
        title: "デザインアプリの評価方法",
        body: [
          "最初の画像や初稿だけで判断しないでください。制御性、戻しやすさ、エクスポート経路、ブランド安全性、チームが使う既存システムで編集し続けられるかを見ます。",
        ],
        bullets: [
          "ブランドカラー、フォント、承認済み素材を維持できるか。",
          "生成後に結果を確認または編集できるか。",
          "元のデザインやファイルへ戻れるリンクがあるか。",
          "何を変更したか説明できるか。",
          "確認なしで本番素材へ書き込まないか。",
        ],
      },
    ],
    faqs: [
      { question: "ChatGPT のデザインアプリは画像生成だけですか？", answer: "いいえ。多くのデザインワークフローは検索、編集、図解、プレゼン、素材管理、デザインからコードへの受け渡しです。" },
      { question: "最初に試すべきデザインアプリはどれですか？", answer: "まず自分たちの記録システムに合うアプリから始めます。Canva、Figma、Adobe ツール、Miro、ストックライブラリはそれぞれ別の領域を解決します。" },
    ],
  },
  "claude-connectors-for-databases": {
    eyebrow: "ユースケースガイド",
    title: "データベースとデータチーム向け Claude コネクタ",
    description: "データベース、ウェアハウス、分析ツール、社内データワークフロー向け Claude コネクタと MCP サーバーの評価方法です。",
    summary: "管理されたコンテキスト、範囲付きツール、会話型分析が必要なときに Claude コネクタを使います。",
    readingTime: "7 分で読める",
    topics: ["Claude コネクタ", "データベース", "分析"],
    primaryCta: { label: "データアプリを探す" },
    secondaryCta: { label: "Claude コネクタを探す" },
    relatedLinks: [
      { label: "最初の MCP アプリを作る" },
      { label: "MCP アプリとは？" },
      { label: "データベース向けおすすめ Claude コネクタ" },
      { label: "データコネクタを投稿" },
    ],
    sections: [
      {
        id: "fit",
        title: "データベースコネクタが向く場所",
        body: [
          "データベースや分析コネクタは、貼り付けたエクスポートではなく、ライブまたは管理されたコンテキストで Claude が回答できるようにします。コネクタは無制限の DB アクセスではなく、具体的なツールを公開すべきです。",
          "チームにとっての価値は質問できることだけではありません。Claude が到達できるデータの周りに権限、監査性、再現可能なツール契約を保てることです。",
        ],
      },
      {
        id: "safe-shape",
        title: "安全なデータツールの形",
        body: [
          "良いデータコネクタは狭い読み取り専用ツールから始め、利用者が確認できる場所に限って書き込み操作を追加します。モデルに生の認証情報を渡す必要はなく、利用者が機密 DB ダンプをチャットへ貼る必要もありません。",
        ],
        bullets: [
          "利用者の ID に紐づく範囲付き認証を使う。",
          "最初は任意 SQL より、管理されたクエリツールを優先する。",
          "詳細確認できるソース ID 付きの要約テーブルを返す。",
          "デバッグと監査のためにツール呼び出しとエラーを記録する。",
          "広い展開前に行、ワークスペース、プロジェクトの制限を加える。",
        ],
      },
      {
        id: "workflows",
        title: "価値の高いワークフロー",
        body: ["優れたデータベースコネクタは、単にクエリを実行するだけでなく、利用者がより良い業務質問をできるようにします。検索、構造化取得、説明を組み合わせます。"],
        bullets: [
          "指標が動いた理由を尋ね、根拠となる切り口を取得する。",
          "会議前に顧客レコードを要約する。",
          "停滞プロジェクト、ブロック中タスク、未割当の所有者を探す。",
          "SQL クエリの草案を作り、前提を説明し、結果を表示する。",
          "ウェアハウスデータをドキュメント、チケット、CRM 文脈と比較する。",
        ],
      },
      {
        id: "evaluation",
        title: "接続前に確認すること",
        body: [
          "データコネクタは単純なコンテンツアプリより厳しく確認する必要があります。本番 DB に接続する前に、トランスポート、認証方式、権限モデル、プライバシーポリシー、サポート経路、MCP サーバーが公開する具体的ツールを確認します。",
        ],
      },
    ],
    faqs: [
      { question: "データベース MCP サーバーは任意 SQL を許可すべきですか？", answer: "初期設定では避けるべきです。範囲付きの読み取り専用ツールと管理されたクエリから始めます。任意 SQL は熟練者には有用ですが、強い認証、ログ、制限、レビューが必要です。" },
      { question: "1 つのデータコネクタを Claude と ChatGPT の両方で使えますか？", answer: "多くの場合は可能です。MCP は共有プロトコルとして設計されていますが、各ホストには UI、認証、審査要件の違いがあります。" },
    ],
  },
};

const jaArticleSummaries: Record<string, LocalizedArticle> = {
  "best-mcp-apps-for-spreadsheets": {
    eyebrow: "ユースケースガイド",
    title: "スプレッドシート向けおすすめ MCP アプリ",
    description: "表計算、財務モデル、レポート、表、CSV、共同計画ワークフロー向け MCP アプリの評価方法です。",
    summary: "アシスタントが表を確認し、数式を説明し、レポートを下書きし、計画データをレビュー付きで更新する必要があるときに使います。",
    readingTime: "6 分で読める",
    primaryCta: { label: "生産性アプリを探す" },
    secondaryCta: { label: "金融アプリを探す" },
  },
  "best-mcp-apps-for-coding-agents": {
    eyebrow: "開発者ガイド",
    title: "コーディングエージェント向けおすすめ MCP アプリ",
    description: "コードレビュー、GitHub Issue、ドキュメント、デプロイ、ログ、ブラウザ自動化、開発者ツール向け MCP アプリの選び方です。",
    summary: "コーディングエージェントは、適切なプロジェクト文脈を安全な境界で公開する MCP アプリから最も恩恵を受けます。",
    readingTime: "7 分で読める",
    primaryCta: { label: "開発者向けアプリを探す" },
    secondaryCta: { label: "開発者コレクション" },
  },
  "best-claude-connectors-for-productivity": {
    eyebrow: "Claude ガイド",
    title: "生産性向けおすすめ Claude コネクタ",
    description: "ファイル、カレンダー、ドキュメント、タスク、会議、メッセージ、日常業務向け Claude コネクタの評価方法です。",
    summary: "Claude の生産性コネクタは、過度に広い権限なしで信頼できるワークスペース文脈をチャットへ持ち込むときに役立ちます。",
    readingTime: "6 分で読める",
    primaryCta: { label: "Claude コネクタを探す" },
    secondaryCta: { label: "生産性カテゴリ" },
  },
  "chatgpt-apps-vs-claude-connectors": {
    eyebrow: "比較ガイド",
    title: "ChatGPT アプリと Claude コネクタの違い",
    description: "MCP 対応ワークフローをどこで構築、公開、接続するか選ぶチーム向けの実践比較です。",
    summary: "適切な面は、利用者がどこで作業するか、MCP サーバーが何をできるか、UI やワークフロー制御がどれだけ必要かで決まります。",
    readingTime: "7 分で読める",
    primaryCta: { label: "ChatGPT アプリを探す" },
    secondaryCta: { label: "Claude コネクタを探す" },
  },
  "mcp-app-directory-for-teams": {
    eyebrow: "導入担当者ガイド",
    title: "チーム向け MCP アプリディレクトリ",
    description: "アプリ、コネクタ、権限、公開者、対応プラットフォーム、ワークフロー適合をチームで評価する方法です。",
    summary: "ディレクトリは、機密ツール、データ、ワークフローをアシスタントに接続する前の比較に役立ちます。",
    readingTime: "6 分で読める",
    primaryCta: { label: "ディレクトリを探す" },
    secondaryCta: { label: "FAQ を読む" },
  },
  "tldraw-mcp-app": {
    eyebrow: "検索ガイド",
    title: "tldraw MCP アプリ: Claude で tldraw を使う方法",
    description: "Claude 向け tldraw MCP アプリの図解、ライブキャンバス、プロンプト、評価ポイントを整理します。",
    summary: "図、ワイヤーフレーム、アーキテクチャスケッチ、マインドマップに共有キャンバスが必要なときに使います。",
    readingTime: "5 分で読める",
    primaryCta: { label: "tldraw の掲載を見る" },
    secondaryCta: { label: "デザインアプリを見る" },
  },
  "brand24-mcp": {
    eyebrow: "検索ガイド",
    title: "ブランド監視とソーシャルリスニング向け Brand24 MCP アプリ",
    description: "ChatGPT の Brand24 MCP アプリを、ブランド監視、感情分析、メディア露出、マーケティングレポートで評価する方法です。",
    summary: "マーケティングや PR チームがブランド言及、感情、トレンド、オンライン会話を要約したいときに役立ちます。",
    readingTime: "5 分で読める",
    primaryCta: { label: "Brand24 の掲載を見る" },
    secondaryCta: { label: "マーケティング分析コレクション" },
  },
  "morningstar-mcp": {
    eyebrow: "検索ガイド",
    title: "市場調査と投資データ向け Morningstar MCP アプリ",
    description: "ChatGPT と Claude で使う Morningstar MCP アプリの市場調査、アナリスト文脈、スクリーニング、金融ワークフローです。",
    summary: "信頼できる投資文脈と慎重な確認が必要な市場調査向けの金融 MCP アプリとコネクタです。",
    readingTime: "6 分で読める",
    primaryCta: { label: "Morningstar の掲載を見る" },
    secondaryCta: { label: "金融コレクション" },
  },
  "anthropic-pdf-viewer-mcp": {
    eyebrow: "検索ガイド",
    title: "Anthropic PDF viewer MCP: PDF ビューアと文書ツールを比較",
    description: "Claude と ChatGPT 向け PDF viewer MCP アプリの閲覧、注釈、抽出、変換、安全な文書ワークフローです。",
    summary: "PDF viewer MCP アプリは、PDF をそのままチャットへ貼り付けずに文書確認、抽出、ナビゲーションを支援します。",
    readingTime: "6 分で読める",
    primaryCta: { label: "pdf-viewer の掲載を見る" },
    secondaryCta: { label: "生産性アプリを見る" },
  },
  "n8n-mcp": {
    eyebrow: "検索ガイド",
    title: "Claude 自動化ワークフロー向け n8n MCP コネクタ",
    description: "Claude で n8n MCP コネクタを使うためのワークフロー検索、自動化管理、テスト、権限、導入確認です。",
    summary: "Claude が自動化ワークフローを確認、実行、管理する必要があるときに役立ちます。",
    readingTime: "5 分で読める",
    primaryCta: { label: "n8n の掲載を見る" },
    secondaryCta: { label: "生産性コレクション" },
  },
  "calendly-to-claude": {
    eyebrow: "検索ガイド",
    title: "Calendly to Claude: MCP コネクタでスケジューリング",
    description: "Calendly のようなスケジューリングを Claude へ接続するための空き時間、イベントタイプ、予約リンク、権限確認です。",
    summary: "会話文脈、イベントタイプ、空き時間、予約ワークフローの確認が必要なスケジューリングに役立ちます。",
    readingTime: "5 分で読める",
    primaryCta: { label: "Calendly の掲載を見る" },
    secondaryCta: { label: "生産性コレクション" },
  },
  "pyroscope-mcp": {
    eyebrow: "検索ガイド",
    title: "Grafana で使う Pyroscope MCP: プロファイリングと可観測性",
    description: "Grafana MCP Server 経由の Pyroscope MCP ワークフロー、プロファイル、ダッシュボード、メトリクス、ログ、アラートを評価します。",
    summary: "プロファイリングデータをダッシュボード、ログ、メトリクス、アラート、インシデント文脈と一緒に扱うときに有効です。",
    readingTime: "6 分で読める",
    primaryCta: { label: "Grafana MCP の掲載を見る" },
    secondaryCta: { label: "可観測性コレクション" },
  },
};

const koArticleCopy: Record<string, LocalizedArticle> = {
  "what-is-an-mcp-app": {
    eyebrow: "MCP 기본",
    title: "MCP 앱이란 무엇인가요?",
    description: "MCP 앱, MCP 서버, ChatGPT 앱, Claude 커넥터를 쉬운 말로 정리합니다.",
    summary: "사용자가 보는 앱, 뒤에서 동작하는 MCP 서버, 앱이 실행되는 호스트의 차이를 이해합니다.",
    readingTime: "5분 읽기",
    topics: ["MCP", "ChatGPT 앱", "Claude 커넥터"],
    primaryCta: { label: "MCP 앱 둘러보기" },
    secondaryCta: { label: "MCP 제출" },
    relatedLinks: [
      { label: "첫 MCP 앱을 만드는 방법" },
      { label: "추천 MCP 앱 컬렉션" },
      { label: "MCP 앱 FAQ" },
      { label: "목록 가이드" },
    ],
    sections: [
      {
        id: "definition",
        title: "짧은 정의",
        body: [
          "MCP 앱은 AI 어시스턴트가 채팅창 밖의 도구나 데이터에 닿을 수 있게 하는 제품 경험입니다. 보통 이름, 설명, 도구, 권한, 때로는 임베디드 UI를 포함합니다. 그 아래의 기술 레이어가 MCP 서버입니다.",
          "서버는 Model Context Protocol을 통해 기능을 노출하고, ChatGPT, Claude, Claude Code 또는 다른 MCP 호환 클라이언트 같은 호스트가 그 기능을 사용자에게 어떻게 보여줄지 결정합니다.",
        ],
        callout: "이 디렉터리에서는 사람들이 둘러보는 목록을 앱, 도구를 노출하는 백엔드 엔드포인트를 서버라고 부릅니다.",
      },
      {
        id: "parts",
        title: "세 가지 구성 요소",
        body: ["대부분의 MCP 앱에는 실무적으로 세 가지 레이어가 있습니다. 이들을 분리해서 보면 생태계를 이해하기가 훨씬 쉽습니다."],
        bullets: [
          "앱 목록: 이름, 아이콘, 태그라인, 카테고리, 예시, 링크, 플랫폼 표면.",
          "MCP 서버: 도구, 인증, 전송 방식, 스키마, 외부 시스템을 읽거나 쓰는 코드.",
          "호스트 표면: ChatGPT 앱, Claude 커넥터, Claude Code, IDE 또는 기타 클라이언트.",
        ],
      },
      {
        id: "why-it-matters",
        title: "MCP가 중요한 이유",
        body: [
          "MCP 이전에는 AI 앱마다 별도의 통합 경로가 필요한 경우가 많았습니다. MCP는 도구, 데이터, 워크플로를 여러 AI 호스트에 노출하는 공통 방식을 제공합니다.",
          "그래서 캘린더, 데이터베이스, 디자인 도구, CRM, 코드베이스, 분석 제품을 같은 커넥터를 반복해서 만들지 않고도 예측 가능한 방식으로 어시스턴트에 연결할 수 있습니다.",
        ],
      },
      {
        id: "chatgpt-vs-claude",
        title: "ChatGPT 앱과 Claude 커넥터",
        body: [
          "ChatGPT 앱은 MCP 서버를 기반으로 만든 ChatGPT용 경험이며, 필요하면 임베디드 UI를 포함할 수 있습니다. Claude 커넥터는 Claude가 외부 컨텍스트와 도구에 접근할 수 있게 하는 Claude용 연결입니다.",
          "많은 제품은 둘 다 지원할 수 있습니다. 중요한 질문은 어느 이름이 더 좋은가가 아니라, 사용자가 어느 호스트에서 일하는지와 서버가 어떤 작업을 안전하게 수행할 수 있는지입니다.",
        ],
      },
    ],
    faqs: [
      { question: "MCP 앱과 MCP 서버는 같은 것인가요?", answer: "아닙니다. MCP 서버는 도구와 데이터를 노출하는 기술 백엔드이고, 앱은 사람들이 발견하고 평가하고 연결하는 사용자-facing 제품 표면입니다." },
      { question: "MCP 앱에 시각적 UI가 꼭 필요한가요?", answer: "아닙니다. 도구만 있는 서버도 유용할 수 있습니다. 다만 구조화된 결과를 확인, 비교, 선택, 편집해야 할 때 UI가 도움이 됩니다." },
      { question: "하나의 MCP 서버를 여러 AI 클라이언트에서 쓸 수 있나요?", answer: "네. 그것이 프로토콜의 목적입니다. 호스트마다 기능과 심사 규칙은 다를 수 있지만 서버 계약은 공유할 수 있습니다." },
    ],
  },
  "build-your-first-mcp-app": {
    eyebrow: "빌더 튜토리얼",
    title: "첫 MCP 앱을 만드는 방법",
    description: "MCP 서버 계획, 도구 정의, 선택적 ChatGPT UI 추가, 목록 준비까지 이어지는 첫 빌드 체크리스트입니다.",
    summary: "안전한 한 가지 워크플로에서 시작해 작은 도구 계약, 인증, 테스트를 만들고 발견 가능한 형태로 패키징합니다.",
    readingTime: "8분 읽기",
    topics: ["MCP 서버", "Apps SDK", "빌더 체크리스트"],
    primaryCta: { label: "목록 제출" },
    secondaryCta: { label: "목록 가이드 읽기" },
    relatedLinks: [
      { label: "MCP 앱이란 무엇인가요?" },
      { label: "개발자용 추천 MCP 앱" },
      { label: "OpenAI Apps SDK 빠른 시작" },
      { label: "공식 MCP SDK" },
    ],
    sections: [
      {
        id: "pick-workflow",
        title: "1. 워크플로 하나를 고르기",
        body: [
          "가장 쉬운 첫 앱은 제품 전체가 아닙니다. 레코드 검색, 프로젝트 요약, 작업 생성, 디자인 업데이트, 데이터베이스 조회처럼 시작과 끝이 분명한 좁은 워크플로입니다.",
          "코드를 쓰기 전에 사용자에게 줄 약속을 한 문장으로 적어보세요. 한 문장에 담기 어렵다면 더 작은 도구로 나누는 편이 좋습니다.",
        ],
        bullets: [
          "좋은 첫 워크플로: 열린 지원 티켓을 검색하고 주요 차단 요인을 요약하기.",
          "위험한 첫 워크플로: 모델에 모든 고객 시스템에 대한 전체 접근을 주기.",
          "좋은 첫 마일스톤: 읽기 전용 도구 하나, 성공 경로 하나, 유용한 결과 형태 하나.",
        ],
      },
      {
        id: "tool-contract",
        title: "2. 도구 계약 정의하기",
        body: ["MCP 도구에는 모델이 이해할 수 있는 이름, 간결한 설명, 타입이 있는 입력 스키마가 필요합니다. 설명은 모델이 도구를 언제 쓸지 판단하는 재료이므로 제품 표면의 일부이기도 합니다."],
      },
      {
        id: "server",
        title: "3. 서버 만들기",
        body: [
          "가능하면 공식 MCP SDK를 사용하세요. 공식 MCP 문서에는 TypeScript, Python, C#, Go, Java, Rust 등 여러 언어의 SDK가 정리되어 있습니다.",
          "ChatGPT 앱의 경우 OpenAI Apps SDK 흐름은 MCP 서버와 선택적 iframe UI를 기대합니다. 먼저 로컬에서 시작하고, 호스팅된 클라이언트에서 연결할 준비가 되면 HTTP 전송 방식으로 배포하세요.",
        ],
        steps: [
          "MCP 서버 프로젝트를 생성합니다.",
          "첫 읽기 전용 도구를 등록합니다.",
          "모델과 UI가 함께 사용할 수 있는 구조화된 결과를 반환합니다.",
          "도구 형태가 안정된 뒤 인증을 추가합니다.",
          "불필요한 사용자 데이터를 저장하지 않고 도구 호출과 오류를 기록합니다.",
        ],
      },
      {
        id: "ui",
        title: "4. 도움이 되는 곳에만 UI 추가하기",
        body: [
          "사용자가 구조화된 출력을 확인하거나 선택지를 비교하거나 정확히 선택해야 할 때 UI가 유용합니다. 모든 MCP 앱에 필수는 아닙니다.",
          "ChatGPT 앱에서 UI는 iframe 안에서 실행되고 MCP Apps bridge를 통해 호스트와 통신합니다. 결과 화면 하나, 명확한 행동 하나, 숨은 부작용 없음으로 집중시키세요.",
        ],
      },
      {
        id: "ship",
        title: "5. 심사와 발견 준비하기",
        body: [
          "목록은 앱이 무엇을 읽고 쓸 수 있는지, 어떤 플랫폼을 지원하는지, 어떤 인증을 쓰는지, 워크플로를 증명하는 예시가 무엇인지 설명해야 합니다.",
          "좋은 SEO와 좋은 심사 자료는 겹칩니다. 정확한 제목, 쉬운 설명, 스크린샷이나 미리보기, 개인정보 링크, 지원 링크, 정직한 기능 라벨을 준비하세요.",
        ],
        bullets: [
          "홈페이지, 개인정보, 약관, 지원 URL을 추가합니다.",
          "ChatGPT 앱, Claude 커넥터, Claude Code 등 플랫폼 표면을 각각 표시합니다.",
          "마케팅 문구가 아니라 실제 사용을 보여주는 예시 프롬프트를 포함합니다.",
          "최소 권한 OAuth 범위와 읽기 전용 첫 릴리스를 우선합니다.",
        ],
      },
    ],
    faqs: [
      { question: "첫 MCP 앱은 읽기 전용이어야 하나요?", answer: "대체로 그렇습니다. 읽기 전용 도구는 테스트, 심사, 신뢰 확보가 쉽습니다. 확인 단계와 인증 경계가 분명해진 뒤 쓰기 작업을 추가하세요." },
      { question: "어떤 언어를 써야 하나요?", answer: "백엔드 팀이 유지보수할 수 있는 언어를 쓰세요. 공식 MCP 문서에는 TypeScript, Python, C#, Go, Java, Rust 등 여러 SDK가 정리되어 있습니다." },
      { question: "ChatGPT UI 컴포넌트가 필요한가요?", answer: "워크플로가 임베디드 인터페이스에서 이득을 볼 때만 필요합니다. 검색 결과, 갤러리, 비교표, 편집기, 대시보드는 좋은 후보입니다." },
    ],
  },
};

const koArticleSummaries: Record<string, LocalizedArticle> = {
  "chatgpt-apps-for-design": {
    eyebrow: "사용 사례 가이드",
    title: "디자인 팀을 위한 ChatGPT 앱",
    description: "브리프, 에셋, 다이어그램, 이미지 편집, 브랜드 작업, 디자인-코드 워크플로에 맞춘 ChatGPT 앱 가이드입니다.",
    summary: "디자인 앱 패턴을 비교하고 일반 프롬프트보다 시각적 ChatGPT 앱을 써야 하는 때를 판단합니다.",
    readingTime: "6분 읽기",
    primaryCta: { label: "디자인 앱 둘러보기" },
    secondaryCta: { label: "ChatGPT 앱 둘러보기" },
  },
  "claude-connectors-for-databases": {
    eyebrow: "사용 사례 가이드",
    title: "데이터베이스와 데이터 팀을 위한 Claude 커넥터",
    description: "데이터베이스, 웨어하우스, 분석 도구, 내부 데이터 워크플로용 Claude 커넥터와 MCP 서버를 평가하는 방법입니다.",
    summary: "관리된 컨텍스트, 범위가 정해진 도구, 대화형 분석이 필요할 때 Claude 커넥터를 사용하세요.",
    readingTime: "7분 읽기",
    primaryCta: { label: "데이터 앱 둘러보기" },
    secondaryCta: { label: "Claude 커넥터 둘러보기" },
  },
  "best-mcp-apps-for-spreadsheets": {
    eyebrow: "사용 사례 가이드",
    title: "스프레드시트를 위한 추천 MCP 앱",
    description: "스프레드시트, 재무 모델, 보고서, 표, CSV, 협업 계획 워크플로용 MCP 앱 평가 방법입니다.",
    summary: "어시스턴트가 표를 확인하고 수식을 설명하며 보고서를 초안화하거나 계획 데이터를 검토 후 업데이트해야 할 때 사용합니다.",
    readingTime: "6분 읽기",
    primaryCta: { label: "생산성 앱 둘러보기" },
    secondaryCta: { label: "금융 앱 둘러보기" },
  },
  "best-mcp-apps-for-coding-agents": {
    eyebrow: "개발자 가이드",
    title: "코딩 에이전트를 위한 추천 MCP 앱",
    description: "코드 리뷰, GitHub 이슈, 문서, 배포, 로그, 브라우저 자동화, 개발자 도구용 MCP 앱 선택법입니다.",
    summary: "코딩 에이전트는 적절한 프로젝트 컨텍스트를 안전한 운영 경계로 노출하는 MCP 앱에서 가장 큰 도움을 받습니다.",
    readingTime: "7분 읽기",
    primaryCta: { label: "개발자 앱 둘러보기" },
    secondaryCta: { label: "개발자 컬렉션" },
  },
  "best-claude-connectors-for-productivity": {
    eyebrow: "Claude 가이드",
    title: "생산성을 위한 추천 Claude 커넥터",
    description: "파일, 캘린더, 문서, 작업, 회의, 메시지, 일상 팀 워크플로용 Claude 커넥터를 평가하는 방법입니다.",
    summary: "Claude 생산성 커넥터는 과도한 권한 없이 신뢰할 수 있는 워크스페이스 컨텍스트를 채팅으로 가져올 때 가장 유용합니다.",
    readingTime: "6분 읽기",
    primaryCta: { label: "Claude 커넥터 둘러보기" },
    secondaryCta: { label: "생산성 카테고리" },
  },
  "chatgpt-apps-vs-claude-connectors": {
    eyebrow: "비교 가이드",
    title: "ChatGPT 앱과 Claude 커넥터",
    description: "MCP 기반 워크플로를 어디서 만들고 게시하거나 연결할지 선택하는 팀을 위한 실전 비교입니다.",
    summary: "적합한 표면은 사용자가 어디서 일하는지, MCP 서버가 무엇을 할 수 있는지, UI나 워크플로 제어가 얼마나 필요한지에 따라 달라집니다.",
    readingTime: "7분 읽기",
    primaryCta: { label: "ChatGPT 앱 둘러보기" },
    secondaryCta: { label: "Claude 커넥터 둘러보기" },
  },
  "mcp-app-directory-for-teams": {
    eyebrow: "구매자 가이드",
    title: "팀을 위한 MCP 앱 디렉터리",
    description: "팀이 MCP 앱, 커넥터, 권한, 게시자, 플랫폼 지원, 워크플로 적합성을 평가하는 방법입니다.",
    summary: "디렉터리는 민감한 도구, 데이터, 워크플로를 어시스턴트에 연결하기 전에 MCP 앱을 비교하는 데 도움이 됩니다.",
    readingTime: "6분 읽기",
    primaryCta: { label: "디렉터리 둘러보기" },
    secondaryCta: { label: "FAQ 읽기" },
  },
  "tldraw-mcp-app": {
    eyebrow: "검색 가이드",
    title: "tldraw MCP 앱: Claude에서 tldraw 사용하기",
    description: "Claude용 tldraw MCP 앱의 다이어그램, 라이브 캔버스, 프롬프트, 평가 기준을 정리합니다.",
    summary: "다이어그램, 와이어프레임, 아키텍처 스케치, 마인드맵에 공유 캔버스가 필요할 때 사용합니다.",
    readingTime: "5분 읽기",
    primaryCta: { label: "tldraw 목록 보기" },
    secondaryCta: { label: "디자인 앱 둘러보기" },
  },
  "brand24-mcp": {
    eyebrow: "검색 가이드",
    title: "브랜드 모니터링과 소셜 리스닝을 위한 Brand24 MCP 앱",
    description: "ChatGPT의 Brand24 MCP 앱을 브랜드 모니터링, 감성 분석, 미디어 노출, 마케팅 보고에 평가하는 방법입니다.",
    summary: "마케팅과 PR 팀이 브랜드 언급, 감성, 트렌드, 온라인 대화를 요약할 때 유용합니다.",
    readingTime: "5분 읽기",
    primaryCta: { label: "Brand24 목록 보기" },
    secondaryCta: { label: "마케팅 분석 컬렉션" },
  },
  "morningstar-mcp": {
    eyebrow: "검색 가이드",
    title: "시장 조사와 투자 데이터를 위한 Morningstar MCP 앱",
    description: "ChatGPT와 Claude에서 Morningstar MCP 앱을 시장 조사, 애널리스트 컨텍스트, 스크리닝, 금융 워크플로에 쓰는 방법입니다.",
    summary: "신뢰할 수 있는 투자 컨텍스트와 신중한 검토가 필요한 시장 조사용 금융 MCP 앱과 커넥터입니다.",
    readingTime: "6분 읽기",
    primaryCta: { label: "Morningstar 목록 보기" },
    secondaryCta: { label: "금융 컬렉션" },
  },
  "anthropic-pdf-viewer-mcp": {
    eyebrow: "검색 가이드",
    title: "Anthropic PDF viewer MCP: PDF 뷰어와 문서 도구 비교",
    description: "Claude와 ChatGPT용 PDF viewer MCP 앱의 읽기, 주석, 추출, 변환, 안전한 문서 워크플로입니다.",
    summary: "PDF viewer MCP 앱은 PDF를 통째로 채팅에 붙여넣지 않고도 문서 확인, 추출, 탐색을 돕습니다.",
    readingTime: "6분 읽기",
    primaryCta: { label: "pdf-viewer 목록 보기" },
    secondaryCta: { label: "생산성 앱 둘러보기" },
  },
  "n8n-mcp": {
    eyebrow: "검색 가이드",
    title: "Claude 자동화 워크플로를 위한 n8n MCP 커넥터",
    description: "Claude에서 n8n MCP 커넥터를 평가하기 위한 워크플로 검색, 자동화 관리, 테스트, 권한, 출시 확인입니다.",
    summary: "Claude가 자동화 워크플로를 확인, 실행, 관리해야 할 때 유용합니다.",
    readingTime: "5분 읽기",
    primaryCta: { label: "n8n 목록 보기" },
    secondaryCta: { label: "생산성 컬렉션" },
  },
  "calendly-to-claude": {
    eyebrow: "검색 가이드",
    title: "Calendly to Claude: MCP 커넥터로 일정 관리하기",
    description: "Calendly형 일정 워크플로를 Claude에 연결할 때 필요한 가능 시간, 이벤트 유형, 예약 링크, 권한 검토입니다.",
    summary: "대화 컨텍스트, 이벤트 유형, 가능 시간, 예약 워크플로 검토가 필요한 일정 관리에 유용합니다.",
    readingTime: "5분 읽기",
    primaryCta: { label: "Calendly 목록 보기" },
    secondaryCta: { label: "생산성 컬렉션" },
  },
  "pyroscope-mcp": {
    eyebrow: "검색 가이드",
    title: "Grafana와 함께 쓰는 Pyroscope MCP: 프로파일링과 관찰 가능성",
    description: "Grafana MCP Server를 통한 Pyroscope MCP 워크플로, 프로파일링, 대시보드, 메트릭, 로그, 알림을 평가합니다.",
    summary: "프로파일링 데이터를 대시보드, 로그, 메트릭, 알림, 사고 컨텍스트와 함께 다룰 때 가장 강합니다.",
    readingTime: "6분 읽기",
    primaryCta: { label: "Grafana MCP 목록 보기" },
    secondaryCta: { label: "관찰 가능성 컬렉션" },
  },
};

const zhArticleSummaries: Record<string, LocalizedArticle> = {
  "what-is-an-mcp-app": {
    eyebrow: "MCP 基础",
    title: "什么是 MCP 应用？",
    description: "用通俗语言解释 MCP 应用、MCP 服务器、ChatGPT 应用和 Claude 连接器。",
    summary: "理解用户看到的应用、背后的 MCP 服务器，以及应用运行所在宿主之间的区别。",
    readingTime: "5 分钟阅读",
    topics: ["MCP", "ChatGPT 应用", "Claude 连接器"],
    primaryCta: { label: "浏览 MCP 应用" },
    secondaryCta: { label: "提交 MCP" },
  },
  "build-your-first-mcp-app": {
    eyebrow: "构建者教程",
    title: "如何构建第一个 MCP 应用",
    description: "从规划 MCP 服务器、定义工具、添加可选 ChatGPT UI，到准备提交列表的实用清单。",
    summary: "从一个安全的工作流开始，定义小型工具契约，加入认证和测试，再整理成可被发现的应用列表。",
    readingTime: "8 分钟阅读",
    topics: ["MCP 服务器", "Apps SDK", "构建清单"],
    primaryCta: { label: "提交列表" },
    secondaryCta: { label: "阅读列表指南" },
  },
  "chatgpt-apps-for-design": {
    eyebrow: "用例指南",
    title: "面向设计团队的 ChatGPT 应用",
    description: "了解适合设计简报、素材、图表、图片编辑、品牌工作和设计到代码流程的 ChatGPT 应用。",
    summary: "比较设计应用模式，判断什么时候应使用视觉化 ChatGPT 应用，而不是普通提示词。",
    readingTime: "6 分钟阅读",
    topics: ["ChatGPT 应用", "设计", "创意工作流"],
    primaryCta: { label: "浏览设计应用" },
    secondaryCta: { label: "浏览 ChatGPT 应用" },
  },
  "claude-connectors-for-databases": {
    eyebrow: "用例指南",
    title: "面向数据库和数据团队的 Claude 连接器",
    description: "评估适合数据库、仓库、分析工具和内部数据工作流的 Claude 连接器与 MCP 服务器。",
    summary: "当你需要受控上下文、范围明确的工具和对话式分析时，可以优先考虑 Claude 连接器。",
    readingTime: "7 分钟阅读",
    topics: ["Claude 连接器", "数据库", "分析"],
    primaryCta: { label: "浏览数据应用" },
    secondaryCta: { label: "浏览 Claude 连接器" },
  },
  "best-mcp-apps-for-spreadsheets": {
    eyebrow: "用例指南",
    title: "适合电子表格的最佳 MCP 应用",
    description: "评估适合电子表格、财务模型、报告、表格、CSV 和协作计划工作流的 MCP 应用。",
    summary: "当助手需要检查表格、解释公式、起草报告，或在审阅后更新计划数据时使用。",
    readingTime: "6 分钟阅读",
    topics: ["电子表格", "生产力", "金融"],
    primaryCta: { label: "浏览生产力应用" },
    secondaryCta: { label: "浏览金融应用" },
  },
  "best-mcp-apps-for-coding-agents": {
    eyebrow: "开发者指南",
    title: "适合编码智能体的最佳 MCP 应用",
    description: "为代码审查、GitHub Issue、文档、部署、日志、浏览器自动化和开发者工具选择 MCP 应用。",
    summary: "编码智能体最需要能在安全边界内暴露项目上下文的 MCP 应用。",
    readingTime: "7 分钟阅读",
    topics: ["编码智能体", "开发者工具", "Claude Code"],
    primaryCta: { label: "浏览开发者应用" },
    secondaryCta: { label: "开发者集合" },
  },
  "best-claude-connectors-for-productivity": {
    eyebrow: "Claude 指南",
    title: "适合生产力的最佳 Claude 连接器",
    description: "评估适合文件、日历、文档、任务、会议、消息和日常团队工作的 Claude 连接器。",
    summary: "Claude 生产力连接器适合把可信工作区上下文带入对话，同时避免过宽权限。",
    readingTime: "6 分钟阅读",
    topics: ["Claude 连接器", "生产力", "团队工作流"],
    primaryCta: { label: "浏览 Claude 连接器" },
    secondaryCta: { label: "生产力分类" },
  },
  "chatgpt-apps-vs-claude-connectors": {
    eyebrow: "对比指南",
    title: "ChatGPT 应用与 Claude 连接器对比",
    description: "帮助团队选择在哪里构建、发布或连接 MCP 驱动的工作流。",
    summary: "合适的平台取决于用户在哪里工作、MCP 服务器能做什么，以及是否需要 UI 或工作流控制。",
    readingTime: "7 分钟阅读",
    topics: ["ChatGPT 应用", "Claude 连接器", "MCP"],
    primaryCta: { label: "浏览 ChatGPT 应用" },
    secondaryCta: { label: "浏览 Claude 连接器" },
  },
  "mcp-app-directory-for-teams": {
    eyebrow: "采购者指南",
    title: "面向团队的 MCP 应用目录",
    description: "团队如何评估 MCP 应用、连接器、权限、发布者、平台支持和工作流匹配度。",
    summary: "在把敏感工具、数据和工作流连接到助手之前，目录能帮助团队进行比较。",
    readingTime: "6 分钟阅读",
    topics: ["MCP 目录", "团队", "治理"],
    primaryCta: { label: "浏览目录" },
    secondaryCta: { label: "阅读 FAQ" },
  },
  "tldraw-mcp-app": {
    eyebrow: "搜索指南",
    title: "tldraw MCP 应用：如何在 Claude 中使用 tldraw",
    description: "介绍 Claude 版 tldraw MCP 应用的图表、实时画布、提示词和评估要点。",
    summary: "当图表、线框图、架构草图或思维导图需要共享画布时，可以使用 tldraw。",
    readingTime: "5 分钟阅读",
    primaryCta: { label: "查看 tldraw 列表" },
    secondaryCta: { label: "浏览设计应用" },
  },
  "brand24-mcp": {
    eyebrow: "搜索指南",
    title: "用于品牌监测和社交聆听的 Brand24 MCP 应用",
    description: "评估 ChatGPT 中 Brand24 MCP 应用在品牌监测、情绪分析、媒体曝光和营销报告中的使用方式。",
    summary: "适合营销和 PR 团队总结品牌提及、情绪、趋势和在线讨论。",
    readingTime: "5 分钟阅读",
    primaryCta: { label: "查看 Brand24 列表" },
    secondaryCta: { label: "营销分析集合" },
  },
  "morningstar-mcp": {
    eyebrow: "搜索指南",
    title: "用于市场研究和投资数据的 Morningstar MCP 应用",
    description: "在 ChatGPT 和 Claude 中评估 Morningstar MCP 应用的市场研究、分析师上下文、筛选和金融工作流。",
    summary: "适合需要可信投资上下文和审慎人工复核的市场研究工作流。",
    readingTime: "6 分钟阅读",
    primaryCta: { label: "查看 Morningstar 列表" },
    secondaryCta: { label: "金融集合" },
  },
  "anthropic-pdf-viewer-mcp": {
    eyebrow: "搜索指南",
    title: "Anthropic PDF viewer MCP：比较 PDF 查看器和文档工具",
    description: "比较 Claude 和 ChatGPT 的 PDF viewer MCP 应用，包括阅读、批注、提取、转换和安全文档工作流。",
    summary: "PDF viewer MCP 应用能帮助助手查看、提取和导航文档，而不是把整份 PDF 粘贴进聊天。",
    readingTime: "6 分钟阅读",
    primaryCta: { label: "查看 pdf-viewer 列表" },
    secondaryCta: { label: "浏览生产力应用" },
  },
  "n8n-mcp": {
    eyebrow: "搜索指南",
    title: "适合 Claude 自动化工作流的 n8n MCP 连接器",
    description: "评估 n8n MCP 连接器在 Claude 中的工作流搜索、自动化管理、测试、权限和上线检查。",
    summary: "当 Claude 需要检查、运行或管理自动化工作流时，n8n MCP 很有用。",
    readingTime: "5 分钟阅读",
    primaryCta: { label: "查看 n8n 列表" },
    secondaryCta: { label: "生产力集合" },
  },
  "calendly-to-claude": {
    eyebrow: "搜索指南",
    title: "Calendly to Claude：用 MCP 连接器处理日程工作流",
    description: "将 Calendly 类日程工作流连接到 Claude 时，需要评估可用时间、事件类型、预约链接和权限。",
    summary: "适合需要对话上下文、事件类型、可用时间和预约工作流审查的日程安排。",
    readingTime: "5 分钟阅读",
    primaryCta: { label: "查看 Calendly 列表" },
    secondaryCta: { label: "生产力集合" },
  },
  "pyroscope-mcp": {
    eyebrow: "搜索指南",
    title: "Grafana 中的 Pyroscope MCP：性能剖析和可观测性工作流",
    description: "评估通过 Grafana MCP Server 使用 Pyroscope 的剖析、仪表盘、指标、日志、告警和事故响应工作流。",
    summary: "当剖析数据需要和仪表盘、日志、指标、告警及事故上下文一起分析时，这类 MCP 工作流最有价值。",
    readingTime: "6 分钟阅读",
    primaryCta: { label: "查看 Grafana MCP 列表" },
    secondaryCta: { label: "可观测性集合" },
  },
};

const esArticleSummaries: Record<string, LocalizedArticle> = {
  "what-is-an-mcp-app": { eyebrow: "Fundamentos MCP", title: "¿Qué es una app MCP?", description: "Guía sencilla sobre apps MCP, servidores MCP, apps de ChatGPT y conectores de Claude.", summary: "Entiende la diferencia entre la app visible, el servidor MCP detrás y el host donde se ejecuta.", readingTime: "5 min de lectura", primaryCta: { label: "Explorar apps MCP" }, secondaryCta: { label: "Enviar MCP" } },
  "build-your-first-mcp-app": { eyebrow: "Tutorial para builders", title: "Cómo crear tu primera app MCP", description: "Checklist práctico para planificar un servidor MCP, definir herramientas, añadir una UI opcional de ChatGPT y preparar el listado.", summary: "Empieza con un flujo seguro, define un contrato pequeño de herramientas, añade auth y pruebas, y empaquétalo para ser descubierto.", readingTime: "8 min de lectura", primaryCta: { label: "Enviar listado" }, secondaryCta: { label: "Leer guía de listado" } },
  "chatgpt-apps-for-design": { eyebrow: "Guía de caso de uso", title: "Apps de ChatGPT para equipos de diseño", description: "Guía de apps de ChatGPT para briefs, assets, diagramas, edición de imágenes, marca y diseño a código.", summary: "Compara patrones de apps de diseño y cuándo usar una app visual de ChatGPT en lugar de un prompt general.", readingTime: "6 min de lectura", primaryCta: { label: "Explorar apps de diseño" }, secondaryCta: { label: "Explorar apps de ChatGPT" } },
  "claude-connectors-for-databases": { eyebrow: "Guía de caso de uso", title: "Conectores de Claude para bases de datos y equipos de datos", description: "Cómo evaluar conectores de Claude y servidores MCP para bases de datos, almacenes, analítica y flujos internos de datos.", summary: "Usa conectores de Claude cuando necesites contexto gobernado, herramientas con alcance claro y análisis conversacional.", readingTime: "7 min de lectura", primaryCta: { label: "Explorar apps de datos" }, secondaryCta: { label: "Explorar conectores de Claude" } },
  "best-mcp-apps-for-spreadsheets": { eyebrow: "Guía de caso de uso", title: "Mejores apps MCP para hojas de cálculo", description: "Evalúa apps MCP para hojas, modelos financieros, reportes, tablas, CSV y planificación colaborativa.", summary: "Úsalas cuando el asistente deba revisar tablas, explicar fórmulas, redactar reportes o actualizar datos con revisión.", readingTime: "6 min de lectura", primaryCta: { label: "Explorar productividad" }, secondaryCta: { label: "Explorar finanzas" } },
  "best-mcp-apps-for-coding-agents": { eyebrow: "Guía para developers", title: "Mejores apps MCP para agentes de código", description: "Apps MCP para revisión de código, issues, docs, despliegues, logs, automatización de navegador y herramientas dev.", summary: "Los agentes de código mejoran cuando las apps MCP exponen contexto de proyecto con límites seguros.", readingTime: "7 min de lectura", primaryCta: { label: "Explorar apps dev" }, secondaryCta: { label: "Colección dev" } },
  "best-claude-connectors-for-productivity": { eyebrow: "Guía de Claude", title: "Mejores conectores de Claude para productividad", description: "Evalúa conectores de Claude para archivos, calendarios, documentos, tareas, reuniones, mensajes y trabajo diario.", summary: "Sirven para llevar contexto fiable del workspace al chat sin permisos excesivos.", readingTime: "6 min de lectura", primaryCta: { label: "Explorar Claude" }, secondaryCta: { label: "Categoría productividad" } },
  "chatgpt-apps-vs-claude-connectors": { eyebrow: "Guía comparativa", title: "Apps de ChatGPT vs conectores de Claude", description: "Comparación práctica para decidir dónde construir, publicar o conectar flujos basados en MCP.", summary: "La superficie adecuada depende de dónde trabaja el usuario, qué puede hacer el servidor MCP y cuánta UI o control necesita el flujo.", readingTime: "7 min de lectura", primaryCta: { label: "Explorar ChatGPT" }, secondaryCta: { label: "Explorar Claude" } },
  "mcp-app-directory-for-teams": { eyebrow: "Guía para compradores", title: "Directorio de apps MCP para equipos", description: "Cómo evaluar apps, conectores, permisos, editores, soporte de plataforma y encaje de flujo.", summary: "Un directorio ayuda a comparar antes de conectar herramientas, datos y flujos sensibles a un asistente.", readingTime: "6 min de lectura", primaryCta: { label: "Explorar directorio" }, secondaryCta: { label: "Leer FAQ" } },
  "tldraw-mcp-app": { eyebrow: "Guía de búsqueda", title: "App MCP de tldraw: cómo usar tldraw con Claude", description: "Guía de tldraw MCP para Claude, con diagramas, canvas en vivo, prompts y criterios de evaluación.", summary: "Úsala cuando un flujo visual necesita canvas compartido para diagramas, wireframes, arquitectura o mapas mentales.", readingTime: "5 min de lectura", primaryCta: { label: "Ver tldraw" }, secondaryCta: { label: "Explorar diseño" } },
  "brand24-mcp": { eyebrow: "Guía de búsqueda", title: "Brand24 MCP para monitoreo de marca y social listening", description: "Evalúa Brand24 en ChatGPT para monitoreo de marca, sentimiento, cobertura y reportes de marketing.", summary: "Útil para que marketing y PR resuman menciones, sentimiento, tendencias y conversaciones online.", readingTime: "5 min de lectura", primaryCta: { label: "Ver Brand24" }, secondaryCta: { label: "Analítica marketing" } },
  "morningstar-mcp": { eyebrow: "Guía de búsqueda", title: "Morningstar MCP para investigación de mercado y datos de inversión", description: "Cómo evaluar Morningstar MCP en ChatGPT y Claude para research, contexto de analistas, screening y finanzas.", summary: "App y conector financiero para workflows que necesitan contexto de inversión fiable y revisión cuidadosa.", readingTime: "6 min de lectura", primaryCta: { label: "Ver Morningstar" }, secondaryCta: { label: "Colección finanzas" } },
  "anthropic-pdf-viewer-mcp": { eyebrow: "Guía de búsqueda", title: "Anthropic PDF viewer MCP: compara visores PDF y herramientas de documentos", description: "Guía de apps PDF viewer MCP para Claude y ChatGPT: lectura, anotaciones, extracción, conversión y seguridad.", summary: "Ayudan a inspeccionar, extraer y navegar documentos sin pegar todo el PDF en el chat.", readingTime: "6 min de lectura", primaryCta: { label: "Ver pdf-viewer" }, secondaryCta: { label: "Explorar productividad" } },
  "n8n-mcp": { eyebrow: "Guía de búsqueda", title: "Conector n8n MCP para automatizaciones en Claude", description: "Evalúa n8n MCP para Claude: búsqueda de workflows, gestión de automatizaciones, pruebas, permisos y rollout.", summary: "Útil cuando Claude necesita inspeccionar, ejecutar o gestionar workflows de automatización.", readingTime: "5 min de lectura", primaryCta: { label: "Ver n8n" }, secondaryCta: { label: "Productividad" } },
  "calendly-to-claude": { eyebrow: "Guía de búsqueda", title: "Calendly to Claude: scheduling con un conector MCP", description: "Conecta workflows tipo Calendly a Claude con disponibilidad, tipos de evento, enlaces de reserva y permisos.", summary: "Útil cuando scheduling necesita contexto conversacional, disponibilidad y revisión del flujo de reservas.", readingTime: "5 min de lectura", primaryCta: { label: "Ver Calendly" }, secondaryCta: { label: "Productividad" } },
  "pyroscope-mcp": { eyebrow: "Guía de búsqueda", title: "Pyroscope MCP con Grafana: profiling y observabilidad", description: "Evalúa workflows Pyroscope mediante Grafana MCP Server: perfiles, dashboards, métricas, logs, alertas e incidentes.", summary: "Los perfiles rinden más cuando se analizan junto a dashboards, logs, métricas, alertas e incidentes.", readingTime: "6 min de lectura", primaryCta: { label: "Ver Grafana MCP" }, secondaryCta: { label: "Observabilidad" } },
};

const frArticleSummaries: Record<string, LocalizedArticle> = {
  "what-is-an-mcp-app": { eyebrow: "Bases MCP", title: "Qu'est-ce qu'une app MCP ?", description: "Guide simple des apps MCP, serveurs MCP, apps ChatGPT et connecteurs Claude.", summary: "Comprenez la différence entre l'app visible, le serveur MCP derrière elle et l'hôte où elle s'exécute.", readingTime: "5 min de lecture", primaryCta: { label: "Explorer les apps MCP" }, secondaryCta: { label: "Soumettre un MCP" } },
  "build-your-first-mcp-app": { eyebrow: "Tutoriel builder", title: "Créer votre première app MCP", description: "Checklist pratique pour planifier un serveur MCP, définir les outils, ajouter une UI ChatGPT optionnelle et préparer une fiche.", summary: "Commencez par un workflow sûr, définissez un petit contrat d'outils, ajoutez auth et tests, puis préparez la découverte.", readingTime: "8 min de lecture", primaryCta: { label: "Soumettre une fiche" }, secondaryCta: { label: "Lire le guide" } },
  "chatgpt-apps-for-design": { eyebrow: "Guide de cas d'usage", title: "Apps ChatGPT pour équipes design", description: "Guide des apps ChatGPT pour briefs, assets, diagrammes, édition d'images, marque et design vers code.", summary: "Comparez les modèles d'apps design et les moments où une app visuelle ChatGPT vaut mieux qu'un prompt général.", readingTime: "6 min de lecture", primaryCta: { label: "Explorer le design" }, secondaryCta: { label: "Explorer ChatGPT" } },
  "claude-connectors-for-databases": { eyebrow: "Guide de cas d'usage", title: "Connecteurs Claude pour bases de données et équipes data", description: "Évaluer les connecteurs Claude et serveurs MCP pour bases, warehouses, analytics et workflows data internes.", summary: "Utilisez Claude lorsque vous avez besoin de contexte gouverné, d'outils cadrés et d'analyse conversationnelle.", readingTime: "7 min de lecture", primaryCta: { label: "Explorer la data" }, secondaryCta: { label: "Explorer Claude" } },
  "best-mcp-apps-for-spreadsheets": { eyebrow: "Guide de cas d'usage", title: "Meilleures apps MCP pour tableurs", description: "Évaluer les apps MCP pour tableurs, modèles financiers, rapports, tables, CSV et planification collaborative.", summary: "À utiliser quand l'assistant doit vérifier des tables, expliquer des formules, rédiger des rapports ou mettre à jour avec revue.", readingTime: "6 min de lecture", primaryCta: { label: "Explorer productivité" }, secondaryCta: { label: "Explorer finance" } },
  "best-mcp-apps-for-coding-agents": { eyebrow: "Guide développeur", title: "Meilleures apps MCP pour agents de code", description: "Apps MCP pour revue de code, issues, docs, déploiements, logs, automatisation navigateur et outils dev.", summary: "Les agents de code profitent surtout des apps MCP qui exposent le bon contexte projet avec des limites sûres.", readingTime: "7 min de lecture", primaryCta: { label: "Explorer dev" }, secondaryCta: { label: "Collection dev" } },
  "best-claude-connectors-for-productivity": { eyebrow: "Guide Claude", title: "Meilleurs connecteurs Claude pour productivité", description: "Évaluer les connecteurs Claude pour fichiers, calendriers, docs, tâches, réunions, messages et travail quotidien.", summary: "Ils apportent un contexte workspace fiable au chat sans permissions trop larges.", readingTime: "6 min de lecture", primaryCta: { label: "Explorer Claude" }, secondaryCta: { label: "Catégorie productivité" } },
  "chatgpt-apps-vs-claude-connectors": { eyebrow: "Guide comparatif", title: "Apps ChatGPT vs connecteurs Claude", description: "Comparaison pratique pour choisir où construire, publier ou connecter des workflows MCP.", summary: "La bonne surface dépend de l'endroit où l'utilisateur travaille, des actions du serveur MCP et du besoin d'UI ou de contrôle.", readingTime: "7 min de lecture", primaryCta: { label: "Explorer ChatGPT" }, secondaryCta: { label: "Explorer Claude" } },
  "mcp-app-directory-for-teams": { eyebrow: "Guide acheteur", title: "Directoire d'apps MCP pour équipes", description: "Évaluer apps, connecteurs, permissions, éditeurs, support plateforme et adéquation workflow.", summary: "Un directoire aide les équipes à comparer avant de connecter des outils, données et workflows sensibles.", readingTime: "6 min de lecture", primaryCta: { label: "Explorer le directoire" }, secondaryCta: { label: "Lire la FAQ" } },
  "tldraw-mcp-app": { eyebrow: "Guide de recherche", title: "App MCP tldraw : utiliser tldraw avec Claude", description: "Guide tldraw MCP pour Claude : diagrammes, canvas en direct, prompts et critères d'évaluation.", summary: "À utiliser quand un workflow visuel demande un canvas partagé pour diagrammes, wireframes, architecture ou mind maps.", readingTime: "5 min de lecture", primaryCta: { label: "Voir tldraw" }, secondaryCta: { label: "Explorer design" } },
  "brand24-mcp": { eyebrow: "Guide de recherche", title: "Brand24 MCP pour veille de marque et social listening", description: "Évaluer Brand24 dans ChatGPT pour veille de marque, sentiment, couverture média et reporting marketing.", summary: "Utile aux équipes marketing et RP pour résumer mentions, sentiment, tendances et conversations en ligne.", readingTime: "5 min de lecture", primaryCta: { label: "Voir Brand24" }, secondaryCta: { label: "Analytics marketing" } },
  "morningstar-mcp": { eyebrow: "Guide de recherche", title: "Morningstar MCP pour recherche marché et données d'investissement", description: "Évaluer Morningstar MCP dans ChatGPT et Claude pour recherche, contexte analyste, screening et finance.", summary: "App et connecteur finance pour workflows qui exigent contexte d'investissement fiable et revue attentive.", readingTime: "6 min de lecture", primaryCta: { label: "Voir Morningstar" }, secondaryCta: { label: "Collection finance" } },
  "anthropic-pdf-viewer-mcp": { eyebrow: "Guide de recherche", title: "Anthropic PDF viewer MCP : comparer viewers PDF et outils documentaires", description: "Guide des apps PDF viewer MCP pour Claude et ChatGPT : lecture, annotations, extraction, conversion et sécurité.", summary: "Elles aident à inspecter, extraire et parcourir des documents sans coller tout le PDF dans le chat.", readingTime: "6 min de lecture", primaryCta: { label: "Voir pdf-viewer" }, secondaryCta: { label: "Explorer productivité" } },
  "n8n-mcp": { eyebrow: "Guide de recherche", title: "Connecteur n8n MCP pour automatisations Claude", description: "Évaluer n8n MCP pour Claude : recherche de workflows, gestion d'automatisations, tests, permissions et rollout.", summary: "Utile quand Claude doit inspecter, exécuter ou gérer des workflows d'automatisation.", readingTime: "5 min de lecture", primaryCta: { label: "Voir n8n" }, secondaryCta: { label: "Productivité" } },
  "calendly-to-claude": { eyebrow: "Guide de recherche", title: "Calendly to Claude : scheduling avec un connecteur MCP", description: "Connecter des workflows Calendly à Claude avec disponibilités, types d'événement, liens de réservation et permissions.", summary: "Utile quand la planification demande contexte conversationnel, disponibilité et revue du workflow de réservation.", readingTime: "5 min de lecture", primaryCta: { label: "Voir Calendly" }, secondaryCta: { label: "Productivité" } },
  "pyroscope-mcp": { eyebrow: "Guide de recherche", title: "Pyroscope MCP avec Grafana : profiling et observabilité", description: "Évaluer les workflows Pyroscope via Grafana MCP Server : profils, dashboards, métriques, logs, alertes et incidents.", summary: "Le profiling est plus utile quand il est analysé avec dashboards, logs, métriques, alertes et contexte incident.", readingTime: "6 min de lecture", primaryCta: { label: "Voir Grafana MCP" }, secondaryCta: { label: "Observabilité" } },
};

const deArticleSummaries: Record<string, LocalizedArticle> = {
  "what-is-an-mcp-app": { eyebrow: "MCP-Grundlagen", title: "Was ist eine MCP-App?", description: "Eine einfache Erklärung von MCP-Apps, MCP-Servern, ChatGPT-Apps und Claude-Connectors.", summary: "Verstehe den Unterschied zwischen sichtbarer App, MCP-Server im Hintergrund und dem Host, in dem sie läuft.", readingTime: "5 Min. Lesezeit", primaryCta: { label: "MCP-Apps ansehen" }, secondaryCta: { label: "MCP einreichen" } },
  "build-your-first-mcp-app": { eyebrow: "Builder-Tutorial", title: "Die erste MCP-App erstellen", description: "Praktische Checkliste für MCP-Server, Tool-Vertrag, optionale ChatGPT-UI und Listing-Vorbereitung.", summary: "Starte mit einem sicheren Workflow, definiere kleine Tools, ergänze Auth und Tests und bereite die Entdeckung vor.", readingTime: "8 Min. Lesezeit", primaryCta: { label: "Listing einreichen" }, secondaryCta: { label: "Listing-Guide lesen" } },
  "chatgpt-apps-for-design": { eyebrow: "Use-Case-Guide", title: "ChatGPT-Apps für Designteams", description: "Guide für Design-Briefings, Assets, Diagramme, Bildbearbeitung, Brand-Arbeit und Design-to-Code.", summary: "Vergleiche Design-App-Muster und wann eine visuelle ChatGPT-App besser ist als ein allgemeiner Prompt.", readingTime: "6 Min. Lesezeit", primaryCta: { label: "Design-Apps ansehen" }, secondaryCta: { label: "ChatGPT-Apps ansehen" } },
  "claude-connectors-for-databases": { eyebrow: "Use-Case-Guide", title: "Claude-Connectors für Datenbanken und Datenteams", description: "Bewerte Claude-Connectors und MCP-Server für Datenbanken, Warehouses, Analytics und interne Datenflows.", summary: "Nutze Claude-Connectors für kontrollierten Kontext, klar begrenzte Tools und dialogorientierte Analyse.", readingTime: "7 Min. Lesezeit", primaryCta: { label: "Daten-Apps ansehen" }, secondaryCta: { label: "Claude-Connectors ansehen" } },
  "best-mcp-apps-for-spreadsheets": { eyebrow: "Use-Case-Guide", title: "Beste MCP-Apps für Tabellen", description: "Bewerte MCP-Apps für Tabellen, Finanzmodelle, Berichte, CSV und gemeinsame Planung.", summary: "Für Workflows, in denen der Assistent Tabellen prüft, Formeln erklärt, Berichte entwirft oder Daten mit Review aktualisiert.", readingTime: "6 Min. Lesezeit", primaryCta: { label: "Produktivität ansehen" }, secondaryCta: { label: "Finanzen ansehen" } },
  "best-mcp-apps-for-coding-agents": { eyebrow: "Entwicklerguide", title: "Beste MCP-Apps für Coding Agents", description: "MCP-Apps für Code-Review, Issues, Docs, Deployments, Logs, Browser-Automation und Entwicklertools.", summary: "Coding Agents profitieren von MCP-Apps, die passenden Projektkontext mit sicheren Grenzen bereitstellen.", readingTime: "7 Min. Lesezeit", primaryCta: { label: "Dev-Apps ansehen" }, secondaryCta: { label: "Dev-Kollektion" } },
  "best-claude-connectors-for-productivity": { eyebrow: "Claude-Guide", title: "Beste Claude-Connectors für Produktivität", description: "Bewerte Claude-Connectors für Dateien, Kalender, Dokumente, Aufgaben, Meetings, Nachrichten und Tagesarbeit.", summary: "Sie bringen verlässlichen Workspace-Kontext in den Chat, ohne zu breite Rechte zu vergeben.", readingTime: "6 Min. Lesezeit", primaryCta: { label: "Claude ansehen" }, secondaryCta: { label: "Produktivität" } },
  "chatgpt-apps-vs-claude-connectors": { eyebrow: "Vergleich", title: "ChatGPT-Apps vs Claude-Connectors", description: "Praktischer Vergleich für Teams, die MCP-Workflows bauen, veröffentlichen oder verbinden.", summary: "Die richtige Oberfläche hängt davon ab, wo Nutzer arbeiten, was der MCP-Server kann und wie viel UI oder Kontrolle nötig ist.", readingTime: "7 Min. Lesezeit", primaryCta: { label: "ChatGPT ansehen" }, secondaryCta: { label: "Claude ansehen" } },
  "mcp-app-directory-for-teams": { eyebrow: "Buyer-Guide", title: "MCP-App-Verzeichnis für Teams", description: "Bewerte Apps, Connectors, Rechte, Publisher, Plattformunterstützung und Workflow-Fit.", summary: "Ein Verzeichnis hilft Teams beim Vergleich, bevor sensible Tools, Daten und Workflows verbunden werden.", readingTime: "6 Min. Lesezeit", primaryCta: { label: "Verzeichnis ansehen" }, secondaryCta: { label: "FAQ lesen" } },
  "tldraw-mcp-app": { eyebrow: "Such-Guide", title: "tldraw MCP-App: tldraw mit Claude nutzen", description: "Guide zur tldraw MCP-App für Claude mit Diagrammen, Live-Canvas, Prompts und Bewertungspunkten.", summary: "Für visuelle Workflows mit gemeinsamem Canvas für Diagramme, Wireframes, Architektur oder Mindmaps.", readingTime: "5 Min. Lesezeit", primaryCta: { label: "tldraw ansehen" }, secondaryCta: { label: "Design ansehen" } },
  "brand24-mcp": { eyebrow: "Such-Guide", title: "Brand24 MCP für Brand Monitoring und Social Listening", description: "Bewerte Brand24 in ChatGPT für Brand Monitoring, Sentiment, Medienabdeckung und Marketing-Reports.", summary: "Hilft Marketing- und PR-Teams, Erwähnungen, Stimmung, Trends und Online-Gespräche zusammenzufassen.", readingTime: "5 Min. Lesezeit", primaryCta: { label: "Brand24 ansehen" }, secondaryCta: { label: "Marketing-Analytics" } },
  "morningstar-mcp": { eyebrow: "Such-Guide", title: "Morningstar MCP für Marktrecherche und Investmentdaten", description: "Morningstar MCP in ChatGPT und Claude für Research, Analystenkontext, Screening und Finanz-Workflows bewerten.", summary: "Finanz-App und Connector für Workflows mit verlässlichem Investmentkontext und sorgfältiger Prüfung.", readingTime: "6 Min. Lesezeit", primaryCta: { label: "Morningstar ansehen" }, secondaryCta: { label: "Finanzkollektion" } },
  "anthropic-pdf-viewer-mcp": { eyebrow: "Such-Guide", title: "Anthropic PDF viewer MCP: PDF-Viewer und Dokumenttools vergleichen", description: "Guide zu PDF viewer MCP-Apps für Claude und ChatGPT: Lesen, Annotation, Extraktion, Konvertierung und Sicherheit.", summary: "Hilft beim Prüfen, Extrahieren und Navigieren von Dokumenten, ohne komplette PDFs in den Chat zu kopieren.", readingTime: "6 Min. Lesezeit", primaryCta: { label: "pdf-viewer ansehen" }, secondaryCta: { label: "Produktivität ansehen" } },
  "n8n-mcp": { eyebrow: "Such-Guide", title: "n8n MCP-Connector für Claude-Automatisierungen", description: "n8n MCP für Claude bewerten: Workflow-Suche, Automatisierungsverwaltung, Tests, Rechte und Rollout.", summary: "Nützlich, wenn Claude Automatisierungs-Workflows prüfen, ausführen oder verwalten soll.", readingTime: "5 Min. Lesezeit", primaryCta: { label: "n8n ansehen" }, secondaryCta: { label: "Produktivität" } },
  "calendly-to-claude": { eyebrow: "Such-Guide", title: "Calendly to Claude: Scheduling mit MCP-Connector", description: "Calendly-ähnliche Scheduling-Workflows mit Verfügbarkeit, Eventtypen, Buchungslinks und Rechten an Claude anbinden.", summary: "Für Planung mit Gesprächskontext, Verfügbarkeit und Review von Buchungs-Workflows.", readingTime: "5 Min. Lesezeit", primaryCta: { label: "Calendly ansehen" }, secondaryCta: { label: "Produktivität" } },
  "pyroscope-mcp": { eyebrow: "Such-Guide", title: "Pyroscope MCP mit Grafana: Profiling und Observability", description: "Pyroscope-Workflows über Grafana MCP Server bewerten: Profile, Dashboards, Metriken, Logs, Alerts und Incidents.", summary: "Profiling ist am stärksten, wenn es mit Dashboards, Logs, Metriken, Alerts und Incident-Kontext analysiert wird.", readingTime: "6 Min. Lesezeit", primaryCta: { label: "Grafana MCP ansehen" }, secondaryCta: { label: "Observability" } },
};

const jaCollections: Record<string, LocalizedCollection> = {
  "chatgpt-apps-for-design": {
    eyebrow: "デザインコレクション",
    title: "デザインチーム向けおすすめ ChatGPT アプリ",
    description: "デザインブリーフ、画像、図解、ブランド素材、プロトタイプ、デザインからコードへの流れに使える ChatGPT アプリと MCP 対応ツールです。",
    summary: "ChatGPT 内で視覚的なワークフローを使いたいチーム向けのコレクションです。",
    relatedLinks: [{ label: "デザイン向け ChatGPT アプリガイド" }, { label: "すべての ChatGPT アプリ" }, { label: "デザインカテゴリ" }],
    checkpoints: [
      "画像、図解、レイアウト確認が重要なワークフローでは、プレビューや埋め込み UI を確認します。",
      "編集、エクスポート、素材作成の操作範囲が絞られているツールを優先します。",
      "スクリーンショットだけでなく、構造化されたデザインデータをアシスタントへ返せるか確認します。",
    ],
    faqs: [
      { question: "良いデザイン向け ChatGPT アプリとは？", answer: "ChatGPT に素材、ファイル、編集操作への構造化アクセスを与えつつ、視覚的な判断と最終出力を利用者が制御できるアプリです。" },
      { question: "デザイン MCP アプリに埋め込み UI は必要ですか？", answer: "必須ではありませんが、バリエーション選択、プレビュー確認、構造化出力の編集、視覚変更の確認には特に有用です。" },
    ],
  },
  "claude-connectors-for-databases": {
    eyebrow: "データコレクション",
    title: "データベースと分析向けおすすめ Claude コネクタ",
    description: "データベース、ウェアハウス、分析ダッシュボード、BI ツール、管理されたデータワークフロー向けの Claude コネクタと MCP サーバーです。",
    summary: "Claude で業務データや運用データを照会、要約、説明したいデータチーム向けの実用リストです。",
    relatedLinks: [{ label: "データベース向け Claude コネクタガイド" }, { label: "すべての Claude コネクタ" }, { label: "データカテゴリ" }],
    checkpoints: [
      "コネクタが読み取り専用か、元システムへ書き戻せるかを確認します。",
      "認証、ワークスペース範囲、Claude が到達できるテーブルやダッシュボードを確認します。",
      "追跡分析に十分な文脈付きの構造化結果を返すコネクタを優先します。",
    ],
    faqs: [
      { question: "データベースコネクタは読み取り専用にすべきですか？", answer: "多くのチームは読み取り専用から始めるべきです。書き込み操作には明確な確認、最小権限、強い監査証跡が必要です。" },
      { question: "Claude は MCP で分析ワークフローを使えますか？", answer: "はい。MCP によって Claude はツールやデータソースに接続でき、ホストとコネクタが対応していれば照会、要約、比較、説明が可能です。" },
    ],
  },
  "mcp-apps-for-developers": {
    eyebrow: "開発者コレクション",
    title: "開発者向けおすすめ MCP アプリ",
    description: "コーディング、API 作業、テスト、可観測性、インフラ、ブラウザ自動化、開発者ワークフロー向けの MCP アプリとコネクタです。",
    summary: "開発者向け MCP アプリは、アシスタントがコード文脈、サービス、ドキュメント、ブラウザ、ツールを少ない切り替えで扱えるようにします。",
  },
  "mcp-apps-for-productivity": {
    eyebrow: "ワークフローコレクション",
    title: "生産性ワークフロー向けおすすめ MCP アプリ",
    description: "ノート、カレンダー、ドキュメント、プロジェクト管理、自動化、コミュニケーション、会議、日常業務向け MCP アプリです。",
    summary: "タスク、ドキュメント、会議、チームシステムのライブ文脈が必要なときに役立つ生産性 MCP アプリです。",
  },
  "mcp-apps-for-sales-and-marketing": {
    eyebrow: "成長コレクション",
    title: "営業・マーケティング向けおすすめ MCP アプリ",
    description: "CRM、見込み顧客開拓、顧客調査、メール、マーケティング分析、キャンペーン、営業オペレーション向け MCP アプリです。",
    summary: "営業・マーケティング MCP アプリは、顧客、キャンペーン、パイプラインの文脈があるシステムへアシスタントを接続します。",
  },
  "mcp-apps-for-marketing-analytics": {
    eyebrow: "マーケティング分析コレクション",
    title: "マーケティング分析と SEO 向けおすすめ MCP アプリ",
    description: "ブランド監視、SEO 調査、AI 可視性、キャンペーン分析、ソーシャルリスニング、マーケティングレポート向け MCP アプリです。",
    summary: "アシスタントがライブツールからマーケティング成果、ブランド可視性、SEO シグナルを確認するための検索意図に沿ったコレクションです。",
  },
  "mcp-apps-for-observability": {
    eyebrow: "可観測性コレクション",
    title: "可観測性とインシデント対応向けおすすめ MCP アプリ",
    description: "監視、ログ、メトリクス、インシデント、Kubernetes、セキュリティ運用、インフラ調査向け MCP アプリとコネクタです。",
    summary: "システム確認、インシデント説明、運用シグナル要約をアシスタントに任せたい開発・運用チーム向けです。",
  },
  "mcp-apps-for-voice-and-media": {
    eyebrow: "音声・メディアコレクション",
    title: "音声、オーディオ、メディア向けおすすめ MCP アプリ",
    description: "テキスト読み上げ、文字起こし、音声エージェント、音楽、動画、メディア検索、クリエイティブ素材向け MCP アプリです。",
    summary: "音声、オーディオ、動画、クリエイティブ素材、メディアライブラリが必要なアシスタントワークフロー向けです。",
  },
  "mcp-apps-for-finance-teams": {
    eyebrow: "金融コレクション",
    title: "財務チーム向けおすすめ MCP アプリ",
    description: "会計、市場調査、事業財務、決済、税務、銀行、財務分析向け MCP アプリです。",
    summary: "ライブの数値、書類、分析、金融システムへアシスタントがアクセスする必要があるチーム向けです。",
  },
  "mcp-apps-for-travel-planning": {
    eyebrow: "旅行コレクション",
    title: "旅行計画向けおすすめ MCP アプリ",
    description: "航空券、ホテル、ツアー、地図、レンタル、予約、旅程作成、目的地調査向け MCP アプリです。",
    summary: "旅行 MCP アプリは、広い旅行アイデアから宿泊、移動、体験の具体的な候補へ進めるのに役立ちます。",
  },
  "chatgpt-apps-for-productivity": {
    eyebrow: "ChatGPT コレクション",
    title: "生産性向けおすすめ ChatGPT アプリ",
    description: "ドキュメント、ノート、スライド、ファイル、プロジェクト作業、タスク、共同作業、日常業務向け ChatGPT アプリです。",
    summary: "日常業務の成果物を作成、整理、要約、操作したい人向けの ChatGPT 特化リストです。",
  },
};

const koCollections: Record<string, LocalizedCollection> = {
  "chatgpt-apps-for-design": {
    eyebrow: "디자인 컬렉션",
    title: "디자인 팀을 위한 추천 ChatGPT 앱",
    description: "디자인 브리프, 이미지, 다이어그램, 브랜드 에셋, 프로토타입, 디자인-코드 워크플로용 ChatGPT 앱과 MCP 기반 도구입니다.",
    summary: "에셋 제작부터 디자인 시스템 지원까지 ChatGPT 안에서 시각적 워크플로를 원하는 팀을 위한 컬렉션입니다.",
  },
  "claude-connectors-for-databases": {
    eyebrow: "데이터 컬렉션",
    title: "데이터베이스와 분석을 위한 추천 Claude 커넥터",
    description: "데이터베이스, 웨어하우스, 분석 대시보드, BI 도구, 관리형 데이터 워크플로용 Claude 커넥터와 MCP 서버입니다.",
    summary: "Claude가 비즈니스 또는 운영 데이터를 조회, 요약, 설명하기를 원하는 데이터 팀을 위한 실용적인 목록입니다.",
  },
  "mcp-apps-for-developers": {
    eyebrow: "개발자 컬렉션",
    title: "개발자를 위한 추천 MCP 앱",
    description: "코딩, API 작업, 테스트, 관찰 가능성, 인프라, 브라우저 자동화, 개발자 워크플로용 MCP 앱과 커넥터입니다.",
    summary: "개발자용 MCP 앱은 어시스턴트가 코드 컨텍스트, 서비스, 문서, 브라우저, 도구를 더 적은 전환으로 다루게 해줍니다.",
  },
  "mcp-apps-for-productivity": {
    eyebrow: "워크플로 컬렉션",
    title: "생산성 워크플로를 위한 추천 MCP 앱",
    description: "노트, 캘린더, 문서, 프로젝트 관리, 자동화, 커뮤니케이션, 회의, 일상 업무용 MCP 앱입니다.",
    summary: "작업, 문서, 회의, 팀 시스템의 실시간 컨텍스트가 필요할 때 유용한 생산성 MCP 앱입니다.",
  },
  "mcp-apps-for-sales-and-marketing": {
    eyebrow: "성장 컬렉션",
    title: "영업 및 마케팅을 위한 추천 MCP 앱",
    description: "CRM, 잠재 고객 발굴, 고객 조사, 이메일, 마케팅 분석, 캠페인, 영업 운영용 MCP 앱입니다.",
    summary: "영업 및 마케팅 MCP 앱은 고객, 캠페인, 파이프라인 컨텍스트가 있는 시스템에 어시스턴트를 연결합니다.",
  },
  "mcp-apps-for-marketing-analytics": {
    eyebrow: "마케팅 분석 컬렉션",
    title: "마케팅 분석과 SEO를 위한 추천 MCP 앱",
    description: "브랜드 모니터링, SEO 조사, AI 가시성, 캠페인 분석, 소셜 리스닝, 마케팅 보고용 MCP 앱입니다.",
    summary: "어시스턴트가 라이브 도구에서 마케팅 성과, 브랜드 가시성, SEO 신호를 확인하게 해주는 검색 중심 컬렉션입니다.",
  },
  "mcp-apps-for-observability": {
    eyebrow: "관찰 가능성 컬렉션",
    title: "관찰 가능성과 사고 대응을 위한 추천 MCP 앱",
    description: "관찰 가능성, 모니터링, 로그, 메트릭, 사고, Kubernetes, 보안 운영, 인프라 문제 해결용 MCP 앱과 커넥터입니다.",
    summary: "시스템을 검사하고 사고를 설명하며 운영 신호를 요약하려는 개발 및 운영 팀을 위한 컬렉션입니다.",
  },
  "mcp-apps-for-voice-and-media": {
    eyebrow: "음성 및 미디어 컬렉션",
    title: "음성, 오디오, 미디어 워크플로를 위한 추천 MCP 앱",
    description: "텍스트 음성 변환, 전사, 음성 에이전트, 음악, 비디오, 미디어 검색, 크리에이티브 에셋용 MCP 앱입니다.",
    summary: "음성, 오디오, 비디오, 크리에이티브 에셋, 미디어 라이브러리가 필요한 어시스턴트 워크플로용 컬렉션입니다.",
  },
  "mcp-apps-for-finance-teams": {
    eyebrow: "금융 컬렉션",
    title: "재무 팀을 위한 추천 MCP 앱",
    description: "회계, 시장 조사, 비즈니스 재무, 결제, 세무, 은행, 재무 분석용 MCP 앱입니다.",
    summary: "실시간 숫자, 문서, 분석, 금융 시스템에 어시스턴트가 접근해야 하는 팀을 위한 컬렉션입니다.",
  },
  "mcp-apps-for-travel-planning": {
    eyebrow: "여행 컬렉션",
    title: "여행 계획을 위한 추천 MCP 앱",
    description: "항공권, 호텔, 투어, 지도, 렌털, 예약, 일정 계획, 목적지 조사용 MCP 앱입니다.",
    summary: "여행 MCP 앱은 넓은 여행 아이디어에서 숙소, 이동, 활동의 구체적인 후보로 이동하는 데 도움을 줍니다.",
  },
  "chatgpt-apps-for-productivity": {
    eyebrow: "ChatGPT 컬렉션",
    title: "생산성을 위한 추천 ChatGPT 앱",
    description: "문서, 노트, 슬라이드, 파일, 프로젝트 작업, 작업 워크플로, 협업, 일상 생산성용 ChatGPT 앱입니다.",
    summary: "일상 업무 산출물을 만들고 정리하고 요약하고 실행하고 싶은 사람을 위한 ChatGPT 중심 목록입니다.",
  },
};

const zhCollections: Record<string, LocalizedCollection> = {
  "chatgpt-apps-for-design": {
    eyebrow: "设计集合",
    title: "适合设计团队的最佳 ChatGPT 应用",
    description: "用于设计简报、图像、图表、品牌素材、原型和设计到代码工作流的 ChatGPT 应用与 MCP 工具。",
    summary: "适合希望在 ChatGPT 中完成视觉工作流的团队，从素材创建到设计系统支持。",
  },
  "claude-connectors-for-databases": {
    eyebrow: "数据集合",
    title: "适合数据库和分析的最佳 Claude 连接器",
    description: "用于数据库、数据仓库、分析看板、BI 工具和受控数据工作流的 Claude 连接器与 MCP 服务器。",
    summary: "面向希望让 Claude 查询、总结并解释业务或运营数据的数据团队。",
  },
  "mcp-apps-for-developers": {
    eyebrow: "开发者集合",
    title: "适合开发者的最佳 MCP 应用",
    description: "用于编码、API 工作、测试、可观测性、基础设施、浏览器自动化和开发者工作流的 MCP 应用与连接器。",
    summary: "开发者 MCP 应用能让助手读取代码上下文、检查服务、搜索文档、自动化浏览器并操作工具。",
  },
  "mcp-apps-for-productivity": {
    eyebrow: "工作流集合",
    title: "适合生产力工作流的最佳 MCP 应用",
    description: "比较适合笔记、日历、文档、项目管理、自动化、沟通、会议和日常工作的 MCP 应用。",
    summary: "当助手需要来自任务、文档、会议或团队系统的实时上下文时，生产力 MCP 应用很有用。",
  },
  "mcp-apps-for-sales-and-marketing": {
    eyebrow: "增长集合",
    title: "适合销售和营销的最佳 MCP 应用",
    description: "用于 CRM、潜客开发、客户研究、邮件工作流、营销分析、活动和销售运营的 MCP 应用。",
    summary: "销售和营销 MCP 应用能把助手连接到已经承载客户、活动和管道上下文的系统。",
  },
  "mcp-apps-for-marketing-analytics": {
    eyebrow: "营销分析集合",
    title: "适合营销分析和 SEO 的最佳 MCP 应用",
    description: "用于品牌监测、SEO 研究、AI 可见性、活动分析、社交聆听和营销报告的 MCP 应用。",
    summary: "面向希望助手从实时工具中检查营销表现、品牌可见性和 SEO 信号的团队。",
  },
  "mcp-apps-for-observability": {
    eyebrow: "可观测性集合",
    title: "适合可观测性和事故响应的最佳 MCP 应用",
    description: "用于监控、日志、指标、事故、Kubernetes、安全运营和基础设施排查的 MCP 应用与连接器。",
    summary: "面向希望助手检查系统、解释事故并总结运营信号的开发和运维团队。",
  },
  "mcp-apps-for-voice-and-media": {
    eyebrow: "语音和媒体集合",
    title: "适合语音、音频和媒体工作流的最佳 MCP 应用",
    description: "用于文本转语音、转写、语音智能体、音乐、视频、媒体搜索和创意素材的 MCP 应用。",
    summary: "适合需要语音、音频、视频、创意素材或媒体库的助手工作流。",
  },
  "mcp-apps-for-finance-teams": {
    eyebrow: "金融集合",
    title: "适合财务团队的最佳 MCP 应用",
    description: "用于会计、市场研究、业务财务、支付、税务、银行和财务分析的 MCP 应用。",
    summary: "面向需要助手访问实时数字、文档、分析和金融系统的团队。",
  },
  "mcp-apps-for-travel-planning": {
    eyebrow: "旅行集合",
    title: "适合旅行规划的最佳 MCP 应用",
    description: "用于航班、酒店、行程、地图、租赁、预订、路线规划和目的地研究的 MCP 应用。",
    summary: "旅行 MCP 应用能把宽泛的旅行想法推进到住宿、交通和活动的具体候选方案。",
  },
  "chatgpt-apps-for-productivity": {
    eyebrow: "ChatGPT 集合",
    title: "适合生产力的最佳 ChatGPT 应用",
    description: "用于文档、笔记、幻灯片、文件、项目工作、任务、协作和日常生产力的 ChatGPT 应用。",
    summary: "面向希望在 ChatGPT 中创建、整理、总结和执行日常工作产物的用户。",
  },
};

const esCollections: Record<string, LocalizedCollection> = {
  "chatgpt-apps-for-design": { eyebrow: "Colección de diseño", title: "Mejores apps de ChatGPT para equipos de diseño", description: "Apps de ChatGPT y herramientas MCP para briefs, imágenes, diagramas, marca, prototipos y diseño a código.", summary: "Para equipos que quieren flujos visuales dentro de ChatGPT, desde assets hasta sistemas de diseño." },
  "claude-connectors-for-databases": { eyebrow: "Colección de datos", title: "Mejores conectores de Claude para bases de datos y analítica", description: "Conectores de Claude y servidores MCP para bases, warehouses, dashboards, BI y flujos de datos gobernados.", summary: "Lista práctica para equipos de datos que quieren que Claude consulte, resuma y explique datos." },
  "mcp-apps-for-developers": { eyebrow: "Colección dev", title: "Mejores apps MCP para developers", description: "Apps y conectores MCP para código, APIs, pruebas, observabilidad, infraestructura y automatización.", summary: "Ayudan a los asistentes a leer código, inspeccionar servicios, buscar docs y operar herramientas." },
  "mcp-apps-for-productivity": { eyebrow: "Colección de workflows", title: "Mejores apps MCP para productividad", description: "Apps MCP para notas, calendarios, documentos, proyectos, automatización, comunicación y reuniones.", summary: "Útiles cuando el asistente necesita contexto vivo de tareas, documentos, reuniones o sistemas de equipo." },
  "mcp-apps-for-sales-and-marketing": { eyebrow: "Colección de crecimiento", title: "Mejores apps MCP para ventas y marketing", description: "Apps MCP para CRM, prospección, investigación de clientes, email, analítica, campañas y operaciones.", summary: "Conectan asistentes con sistemas donde viven clientes, campañas y pipeline." },
  "mcp-apps-for-marketing-analytics": { eyebrow: "Colección de marketing analytics", title: "Mejores apps MCP para analítica de marketing y SEO", description: "Apps MCP para monitoreo de marca, SEO, visibilidad AI, campañas, social listening y reportes.", summary: "Para equipos que quieren inspeccionar rendimiento, visibilidad de marca y señales SEO desde herramientas en vivo." },
  "mcp-apps-for-observability": { eyebrow: "Colección de observabilidad", title: "Mejores apps MCP para observabilidad e incidentes", description: "Apps y conectores MCP para monitoreo, logs, métricas, incidentes, Kubernetes, seguridad e infraestructura.", summary: "Para equipos dev y ops que quieren investigar sistemas y resumir señales operativas." },
  "mcp-apps-for-voice-and-media": { eyebrow: "Colección de voz y medios", title: "Mejores apps MCP para voz, audio y medios", description: "Apps MCP para texto a voz, transcripción, agentes de voz, música, video, búsqueda de medios y assets.", summary: "Para flujos de asistente que necesitan voz, audio, video, assets creativos o bibliotecas multimedia." },
  "mcp-apps-for-finance-teams": { eyebrow: "Colección financiera", title: "Mejores apps MCP para equipos financieros", description: "Apps MCP para contabilidad, investigación de mercado, finanzas, pagos, impuestos, banca y análisis.", summary: "Para equipos que necesitan acceso del asistente a números, documentos, análisis y sistemas financieros." },
  "mcp-apps-for-travel-planning": { eyebrow: "Colección de viajes", title: "Mejores apps MCP para planificar viajes", description: "Apps MCP para vuelos, hoteles, tours, mapas, alquileres, reservas, itinerarios y destinos.", summary: "Ayudan a pasar de ideas amplias a opciones concretas de alojamiento, transporte y actividades." },
  "chatgpt-apps-for-productivity": { eyebrow: "Colección ChatGPT", title: "Mejores apps de ChatGPT para productividad", description: "Apps de ChatGPT para documentos, notas, slides, archivos, proyectos, tareas y colaboración.", summary: "Para crear, organizar, resumir y actuar sobre artefactos diarios de trabajo dentro de ChatGPT." },
};

const frCollections: Record<string, LocalizedCollection> = {
  "chatgpt-apps-for-design": { eyebrow: "Collection design", title: "Meilleures apps ChatGPT pour équipes design", description: "Apps ChatGPT et outils MCP pour briefs, images, diagrammes, marque, prototypes et design vers code.", summary: "Pour les équipes qui veulent des workflows visuels dans ChatGPT, des assets aux systèmes de design." },
  "claude-connectors-for-databases": { eyebrow: "Collection data", title: "Meilleurs connecteurs Claude pour bases de données et analytics", description: "Connecteurs Claude et serveurs MCP pour bases, warehouses, dashboards, BI et données gouvernées.", summary: "Liste pratique pour équipes data qui veulent que Claude interroge, résume et explique les données." },
  "mcp-apps-for-developers": { eyebrow: "Collection développeur", title: "Meilleures apps MCP pour développeurs", description: "Apps et connecteurs MCP pour code, API, tests, observabilité, infrastructure et automatisation.", summary: "Aident les assistants à lire le code, inspecter les services, chercher la doc et opérer des outils." },
  "mcp-apps-for-productivity": { eyebrow: "Collection workflows", title: "Meilleures apps MCP pour productivité", description: "Apps MCP pour notes, calendriers, documents, projets, automatisation, communication et réunions.", summary: "Utiles lorsque l'assistant a besoin du contexte vivant des tâches, documents, réunions ou systèmes d'équipe." },
  "mcp-apps-for-sales-and-marketing": { eyebrow: "Collection croissance", title: "Meilleures apps MCP pour ventes et marketing", description: "Apps MCP pour CRM, prospection, recherche client, email, analytics, campagnes et opérations.", summary: "Connectent les assistants aux systèmes où vivent clients, campagnes et pipeline." },
  "mcp-apps-for-marketing-analytics": { eyebrow: "Collection marketing analytics", title: "Meilleures apps MCP pour marketing analytics et SEO", description: "Apps MCP pour monitoring de marque, SEO, visibilité IA, campagnes, social listening et reporting.", summary: "Pour inspecter performance marketing, visibilité de marque et signaux SEO depuis des outils live." },
  "mcp-apps-for-observability": { eyebrow: "Collection observabilité", title: "Meilleures apps MCP pour observabilité et incidents", description: "Apps et connecteurs MCP pour monitoring, logs, métriques, incidents, Kubernetes, sécurité et infra.", summary: "Pour équipes dev et ops qui veulent investiguer les systèmes et résumer les signaux opérationnels." },
  "mcp-apps-for-voice-and-media": { eyebrow: "Collection voix et médias", title: "Meilleures apps MCP pour voix, audio et médias", description: "Apps MCP pour synthèse vocale, transcription, agents vocaux, musique, vidéo, recherche média et assets.", summary: "Pour workflows d'assistant qui ont besoin de voix, audio, vidéo, assets créatifs ou médiathèques." },
  "mcp-apps-for-finance-teams": { eyebrow: "Collection finance", title: "Meilleures apps MCP pour équipes finance", description: "Apps MCP pour comptabilité, marché, finance d'entreprise, paiements, fiscalité, banque et analyse.", summary: "Pour équipes ayant besoin d'accès assistant aux chiffres, documents, analyses et systèmes financiers." },
  "mcp-apps-for-travel-planning": { eyebrow: "Collection voyage", title: "Meilleures apps MCP pour planifier un voyage", description: "Apps MCP pour vols, hôtels, visites, cartes, locations, réservations, itinéraires et destinations.", summary: "Aident à passer d'idées larges à des options concrètes d'hébergement, transport et activités." },
  "chatgpt-apps-for-productivity": { eyebrow: "Collection ChatGPT", title: "Meilleures apps ChatGPT pour productivité", description: "Apps ChatGPT pour documents, notes, slides, fichiers, projets, tâches et collaboration.", summary: "Pour créer, organiser, résumer et agir sur les artefacts quotidiens de travail dans ChatGPT." },
};

const deCollections: Record<string, LocalizedCollection> = {
  "chatgpt-apps-for-design": { eyebrow: "Design-Kollektion", title: "Beste ChatGPT-Apps für Designteams", description: "ChatGPT-Apps und MCP-Tools für Briefings, Bilder, Diagramme, Brand Assets, Prototypen und Design-to-Code.", summary: "Für Teams, die visuelle Workflows in ChatGPT brauchen, von Asset-Erstellung bis Designsystem." },
  "claude-connectors-for-databases": { eyebrow: "Daten-Kollektion", title: "Beste Claude-Connectors für Datenbanken und Analytics", description: "Claude-Connectors und MCP-Server für Datenbanken, Warehouses, Dashboards, BI und kontrollierte Datenflows.", summary: "Praxisliste für Datenteams, die Claude Daten abfragen, zusammenfassen und erklären lassen wollen." },
  "mcp-apps-for-developers": { eyebrow: "Entwickler-Kollektion", title: "Beste MCP-Apps für Entwickler", description: "MCP-Apps und Connectors für Coding, APIs, Tests, Observability, Infrastruktur und Automation.", summary: "Helfen Assistenten, Codekontext zu lesen, Services zu prüfen, Docs zu suchen und Tools zu bedienen." },
  "mcp-apps-for-productivity": { eyebrow: "Workflow-Kollektion", title: "Beste MCP-Apps für Produktivität", description: "MCP-Apps für Notizen, Kalender, Dokumente, Projektarbeit, Automation, Kommunikation und Meetings.", summary: "Nützlich, wenn Assistenten Live-Kontext aus Aufgaben, Dokumenten, Meetings oder Teamsystemen brauchen." },
  "mcp-apps-for-sales-and-marketing": { eyebrow: "Growth-Kollektion", title: "Beste MCP-Apps für Sales und Marketing", description: "MCP-Apps für CRM, Prospektion, Kundenrecherche, E-Mail, Marketing Analytics, Kampagnen und Ops.", summary: "Verbinden Assistenten mit Systemen, in denen Kunden-, Kampagnen- und Pipeline-Kontext liegt." },
  "mcp-apps-for-marketing-analytics": { eyebrow: "Marketing-Analytics-Kollektion", title: "Beste MCP-Apps für Marketing Analytics und SEO", description: "MCP-Apps für Brand Monitoring, SEO, KI-Sichtbarkeit, Kampagnenanalyse, Social Listening und Reporting.", summary: "Für Teams, die Marketing-Performance, Marken-Sichtbarkeit und SEO-Signale aus Live-Tools prüfen wollen." },
  "mcp-apps-for-observability": { eyebrow: "Observability-Kollektion", title: "Beste MCP-Apps für Observability und Incident Response", description: "MCP-Apps und Connectors für Monitoring, Logs, Metriken, Incidents, Kubernetes, Security Ops und Infrastruktur.", summary: "Für Dev- und Ops-Teams, die Systeme untersuchen, Incidents erklären und operative Signale zusammenfassen wollen." },
  "mcp-apps-for-voice-and-media": { eyebrow: "Voice-und-Media-Kollektion", title: "Beste MCP-Apps für Stimme, Audio und Medien", description: "MCP-Apps für Text-to-Speech, Transkription, Voice Agents, Musik, Video, Mediensuche und Kreativassets.", summary: "Für Assistenten-Workflows mit Stimme, Audio, Video, Kreativassets oder Medienbibliotheken." },
  "mcp-apps-for-finance-teams": { eyebrow: "Finanz-Kollektion", title: "Beste MCP-Apps für Finanzteams", description: "MCP-Apps für Buchhaltung, Marktrecherche, Unternehmensfinanzen, Zahlungen, Steuern, Banking und Analyse.", summary: "Für Teams, deren Assistent Zugriff auf Live-Zahlen, Dokumente, Analysen und Finanzsysteme braucht." },
  "mcp-apps-for-travel-planning": { eyebrow: "Reise-Kollektion", title: "Beste MCP-Apps für Reiseplanung", description: "MCP-Apps für Flüge, Hotels, Touren, Karten, Mietangebote, Buchungen, Reisepläne und Zielrecherche.", summary: "Helfen vom groben Reiseplan zu konkreten Optionen für Unterkunft, Transport und Aktivitäten." },
  "chatgpt-apps-for-productivity": { eyebrow: "ChatGPT-Kollektion", title: "Beste ChatGPT-Apps für Produktivität", description: "ChatGPT-Apps für Dokumente, Notizen, Slides, Dateien, Projektarbeit, Aufgaben und Zusammenarbeit.", summary: "Für Nutzer, die tägliche Arbeitsartefakte in ChatGPT erstellen, organisieren, zusammenfassen und ausführen wollen." },
};

const jaCategoryNames: Record<string, string> = {
  featured: "注目",
  productivity: "生産性",
  design: "デザイン",
  data: "データ",
  "developer-tools": "開発者ツール",
  finance: "金融",
  travel: "旅行",
  mcp: "MCP",
  shopping: "ショッピング",
  food: "フード",
  education: "教育",
  api: "API",
  testing: "テスト",
  devops: "DevOps",
  observability: "可観測性",
  "write-code": "コード作成",
  "agentic-coding": "エージェント型コーディング",
  business: "ビジネス",
  media: "メディア",
  voice: "音声",
  audio: "オーディオ",
  documents: "ドキュメント",
  database: "データベース",
  databases: "データベース",
  "text-to-speech": "テキスト読み上げ",
  marketing: "マーケティング",
  visualization: "可視化",
  csv: "CSV",
  "mcp-server": "MCP サーバー",
  "sales-and-marketing": "営業・マーケティング",
  "financial-services": "金融サービス",
  lifestyle: "ライフスタイル",
  entertainment: "エンターテインメント",
  automation: "自動化",
  code: "コード",
};

const koCategoryNames: Record<string, string> = {
  featured: "추천",
  productivity: "생산성",
  design: "디자인",
  data: "데이터",
  "developer-tools": "개발자 도구",
  finance: "금융",
  travel: "여행",
  mcp: "MCP",
  shopping: "쇼핑",
  food: "음식",
  education: "교육",
  api: "API",
  testing: "테스트",
  devops: "DevOps",
  observability: "관찰 가능성",
  "write-code": "코드 작성",
  "agentic-coding": "에이전트 코딩",
  business: "비즈니스",
  media: "미디어",
  voice: "음성",
  audio: "오디오",
  documents: "문서",
  database: "데이터베이스",
  databases: "데이터베이스",
  "text-to-speech": "텍스트 음성 변환",
  marketing: "마케팅",
  visualization: "시각화",
  csv: "CSV",
  "mcp-server": "MCP 서버",
  "sales-and-marketing": "영업 및 마케팅",
  "financial-services": "금융 서비스",
  lifestyle: "라이프스타일",
  entertainment: "엔터테인먼트",
  automation: "자동화",
  code: "코드",
};

const zhCategoryNames: Record<string, string> = {
  featured: "精选",
  productivity: "生产力",
  design: "设计",
  data: "数据",
  "developer-tools": "开发者工具",
  finance: "金融",
  travel: "旅行",
  mcp: "MCP",
  shopping: "购物",
  food: "美食",
  education: "教育",
  api: "API",
  testing: "测试",
  devops: "DevOps",
  observability: "可观测性",
  "write-code": "代码编写",
  "agentic-coding": "智能体编程",
  business: "业务",
  media: "媒体",
  voice: "语音",
  audio: "音频",
  documents: "文档",
  database: "数据库",
  databases: "数据库",
  "text-to-speech": "文本转语音",
  marketing: "营销",
  visualization: "可视化",
  csv: "CSV",
  "mcp-server": "MCP 服务器",
  "sales-and-marketing": "销售与营销",
  "financial-services": "金融服务",
  lifestyle: "生活方式",
  entertainment: "娱乐",
  automation: "自动化",
  code: "代码",
};

const esCategoryNames: Record<string, string> = {
  featured: "Destacado",
  productivity: "Productividad",
  design: "Diseño",
  data: "Datos",
  "developer-tools": "Herramientas para developers",
  finance: "Finanzas",
  travel: "Viajes",
  mcp: "MCP",
  shopping: "Compras",
  food: "Comida",
  education: "Educación",
  api: "API",
  testing: "Pruebas",
  devops: "DevOps",
  observability: "Observabilidad",
  "write-code": "Escritura de código",
  "agentic-coding": "Programación agentic",
  business: "Negocio",
  media: "Medios",
  voice: "Voz",
  audio: "Audio",
  documents: "Documentos",
  database: "Base de datos",
  databases: "Bases de datos",
  "text-to-speech": "Texto a voz",
  marketing: "Marketing",
  visualization: "Visualización",
  csv: "CSV",
  "mcp-server": "Servidor MCP",
  "sales-and-marketing": "Ventas y marketing",
  "financial-services": "Servicios financieros",
  lifestyle: "Estilo de vida",
  entertainment: "Entretenimiento",
  automation: "Automatización",
  code: "Código",
};

const frCategoryNames: Record<string, string> = {
  featured: "En vedette",
  productivity: "Productivité",
  design: "Design",
  data: "Données",
  "developer-tools": "Outils développeur",
  finance: "Finance",
  travel: "Voyage",
  mcp: "MCP",
  shopping: "Shopping",
  food: "Cuisine",
  education: "Éducation",
  api: "API",
  testing: "Tests",
  devops: "DevOps",
  observability: "Observabilité",
  "write-code": "Écriture de code",
  "agentic-coding": "Codage agentique",
  business: "Business",
  media: "Médias",
  voice: "Voix",
  audio: "Audio",
  documents: "Documents",
  database: "Base de données",
  databases: "Bases de données",
  "text-to-speech": "Texte vers voix",
  marketing: "Marketing",
  visualization: "Visualisation",
  csv: "CSV",
  "mcp-server": "Serveur MCP",
  "sales-and-marketing": "Ventes et marketing",
  "financial-services": "Services financiers",
  lifestyle: "Lifestyle",
  entertainment: "Divertissement",
  automation: "Automatisation",
  code: "Code",
};

const deCategoryNames: Record<string, string> = {
  featured: "Empfohlen",
  productivity: "Produktivität",
  design: "Design",
  data: "Daten",
  "developer-tools": "Entwicklertools",
  finance: "Finanzen",
  travel: "Reisen",
  mcp: "MCP",
  shopping: "Shopping",
  food: "Essen",
  education: "Bildung",
  api: "API",
  testing: "Tests",
  devops: "DevOps",
  observability: "Observability",
  "write-code": "Code schreiben",
  "agentic-coding": "Agentic Coding",
  business: "Business",
  media: "Medien",
  voice: "Stimme",
  audio: "Audio",
  documents: "Dokumente",
  database: "Datenbank",
  databases: "Datenbanken",
  "text-to-speech": "Text-to-Speech",
  marketing: "Marketing",
  visualization: "Visualisierung",
  csv: "CSV",
  "mcp-server": "MCP-Server",
  "sales-and-marketing": "Sales und Marketing",
  "financial-services": "Finanzdienstleistungen",
  lifestyle: "Lifestyle",
  entertainment: "Unterhaltung",
  automation: "Automatisierung",
  code: "Code",
};

const jaCategoryGuides: Record<string, Partial<CategoryContent>> = {
  productivity: {
    eyebrow: "生産性ガイド",
    title: "触れる作業成果物で生産性 MCP アプリを選ぶ。",
    metaDescription: "ドキュメント、ファイル、ノート、カレンダー、タスク、会議、チームワークフロー向け生産性 MCP アプリを比較します。",
    body: [
      "生産性 MCP アプリは、日々の仕事が存在するドキュメント、タスク、カレンダー、ノート、会議、ファイル、共同作業ツールにアシスタントが触れられるときに最も役立ちます。",
      "作成または更新したい成果物から始め、そのアプリが文脈を読むだけか、元システムへ安全に書き戻せるかを確認します。",
    ],
  },
  design: {
    eyebrow: "デザインガイド",
    title: "視覚的な文脈と編集しやすさを保てるアプリを探す。",
    metaDescription: "ビジュアル素材、図解、スライド、画像編集、デザインシステム、デザインからコードへのワークフロー向け MCP アプリを比較します。",
    body: [
      "デザイン MCP アプリは、説明だけでなく実際の成果物を見たり作ったりできるときに力を発揮します。良い掲載にはプレビュー、ブランドを意識した操作、エクスポート経路、結果を続けられる編集環境が示されています。",
      "チームにとって決め手は制御性です。バリエーションを確認し、元ファイルを保ち、ブランドやアクセシビリティ制約を見える状態にできるアプリを選びます。",
    ],
  },
  data: {
    eyebrow: "データガイド",
    title: "広い DB アクセスより管理されたアクセスを優先する。",
    metaDescription: "データベース、ウェアハウス、分析、BI、管理されたレポートワークフロー向けデータ MCP アプリと Claude コネクタを比較します。",
    body: [
      "データ MCP アプリはライブ文脈を安全に使えるようにするべきで、制御を弱めるべきではありません。強い掲載は狭いツール、範囲付き認証、明確な制限、答えのソースを示す結果形式を持ちます。",
      "チームは読み取り専用分析から始め、ログ、権限境界、レビュー経路が明確になってから書き込みや自動化へ進むべきです。",
    ],
  },
};

const koCategoryGuides: Record<string, Partial<CategoryContent>> = {
  productivity: {
    eyebrow: "생산성 가이드",
    title: "생산성 MCP 앱은 다루는 업무 산출물 기준으로 선택하세요.",
    metaDescription: "문서, 파일, 노트, 캘린더, 작업, 회의, 팀 워크플로용 생산성 MCP 앱을 비교합니다.",
    body: [
      "생산성 MCP 앱은 어시스턴트가 문서, 작업, 캘린더, 노트, 회의, 파일, 협업 도구처럼 일상 업무가 이미 존재하는 시스템과 함께 일할 때 가장 유용합니다.",
      "만들거나 업데이트해야 하는 산출물에서 시작한 뒤, 앱이 컨텍스트만 읽는지 또는 원본 시스템에 안전하게 쓸 수 있는지 확인하세요.",
    ],
  },
  design: {
    eyebrow: "디자인 가이드",
    title: "시각적 컨텍스트와 편집 가능성을 유지하는 앱을 찾으세요.",
    metaDescription: "시각 에셋, 다이어그램, 슬라이드, 이미지 편집, 디자인 시스템, 디자인-코드 워크플로용 MCP 앱을 비교합니다.",
    body: [
      "디자인 MCP 앱은 설명만 하는 것이 아니라 실제 산출물을 보고 만들 수 있을 때 가장 강력합니다. 좋은 목록은 미리보기, 브랜드 인식 작업, 내보내기 경로, 결과를 이어갈 편집 환경을 보여줍니다.",
      "팀에게 중요한 기준은 제어입니다. 변형을 확인하고 원본 파일을 보존하며 브랜드와 접근성 제약을 볼 수 있게 해주는 앱을 선택하세요.",
    ],
  },
  data: {
    eyebrow: "데이터 가이드",
    title: "넓은 데이터베이스 접근보다 관리된 접근을 우선하세요.",
    metaDescription: "데이터베이스, 웨어하우스, 분석, BI 도구, 관리형 보고 워크플로용 데이터 MCP 앱과 Claude 커넥터를 비교합니다.",
    body: [
      "데이터 MCP 앱은 실시간 컨텍스트를 더 안전하게 만들어야 하며 통제를 약화해서는 안 됩니다. 강한 목록은 좁은 도구, 범위 지정 인증, 명확한 제한, 답변의 출처를 보여주는 결과 형태를 갖습니다.",
      "팀은 읽기 전용 분석부터 시작하고 로그, 권한 경계, 검토 경로가 명확해진 뒤 쓰기나 자동화 워크플로로 이동해야 합니다.",
    ],
  },
};

const zhCategoryGuides: Record<string, Partial<CategoryContent>> = {
  productivity: {
    eyebrow: "生产力指南",
    title: "按可操作的工作产物选择生产力 MCP 应用。",
    metaDescription: "比较适合文档、文件、笔记、日历、任务、会议和团队工作流的生产力 MCP 应用。",
    body: [
      "生产力 MCP 应用最有价值的地方，是让助手能接触日常工作已经存在的系统：文档、任务、日历、笔记、会议、文件和协作工具。",
      "先从你想创建或更新的产物出发，再确认应用只是读取上下文，还是也能安全地写回源系统。",
    ],
  },
  design: {
    eyebrow: "设计指南",
    title: "寻找能保留视觉上下文和可编辑性的应用。",
    metaDescription: "比较适合视觉素材、图表、幻灯片、图像编辑、设计系统和设计到代码工作流的 MCP 应用。",
    body: [
      "设计 MCP 应用在能够查看或创建实际产物时最有用，而不只是描述想法。好的列表会展示预览、品牌感知操作、导出路径，以及能继续编辑结果的环境。",
      "对团队来说，关键是控制力。优先选择能检查变体、保留源文件，并让品牌和无障碍限制保持可见的应用。",
    ],
  },
  data: {
    eyebrow: "数据指南",
    title: "优先选择受控访问，而不是宽泛数据库权限。",
    metaDescription: "比较适合数据库、数据仓库、分析、BI 和受控报告工作流的数据 MCP 应用与 Claude 连接器。",
    body: [
      "数据 MCP 应用应该让实时上下文更安全，而不是降低控制。可靠的列表会展示范围明确的工具、受限认证、清晰限制，以及带来源的结果格式。",
      "团队应从只读分析开始，在日志、权限边界和审阅路径明确后，再推进写入或自动化工作流。",
    ],
  },
};

const localizedFaqs: Record<ContentLocale, LearnFaq[]> = {
  es: [
    { question: "¿Qué es MCP App Store?", answer: "MCP App Store es un directorio para descubrir apps MCP, apps de ChatGPT, conectores de Claude y superficies de plataforma relacionadas." },
    { question: "¿Cuál es la diferencia entre apps de ChatGPT y conectores de Claude?", answer: "Ambos pueden basarse en servidores MCP, pero aparecen en hosts distintos: ChatGPT o Claude." },
    { question: "¿Puedo enviar mi app MCP?", answer: "Sí. Envía nombre, descripción, plataformas, detalles MCP, enlaces, herramientas y ejemplos de vista previa para revisión." },
    { question: "¿Alojan servidores MCP?", answer: "No. El directorio lista apps y conectores; el editor opera el endpoint y el soporte." },
    { question: "¿Todas las fichas se revisan?", answer: "Las propuestas se moderan antes de publicarse, pero revisa permisos, privacidad y editor antes de conectar." },
    { question: "¿Qué incluye una buena ficha?", answer: "Un tagline claro, descripción simple, plataformas, capacidades, auth, URLs de privacidad y soporte, y prompts de ejemplo." },
  ],
  fr: [
    { question: "Qu'est-ce que MCP App Store ?", answer: "MCP App Store est un directoire pour découvrir des apps MCP, apps ChatGPT, connecteurs Claude et surfaces associées." },
    { question: "Quelle différence entre apps ChatGPT et connecteurs Claude ?", answer: "Les deux peuvent reposer sur des serveurs MCP, mais apparaissent dans des hôtes différents : ChatGPT ou Claude." },
    { question: "Puis-je soumettre mon app MCP ?", answer: "Oui. Fournissez nom, description, plateformes, détails MCP, liens, outils et exemples de prévisualisation pour revue." },
    { question: "Hébergez-vous les serveurs MCP ?", answer: "Non. Le directoire liste les apps et connecteurs ; l'éditeur opère l'endpoint et le support." },
    { question: "Toutes les fiches sont-elles revues ?", answer: "Les soumissions sont modérées avant publication, mais vérifiez aussi permissions, confidentialité et éditeur avant connexion." },
    { question: "Que doit contenir une bonne fiche ?", answer: "Un tagline clair, une description simple, les plateformes, capacités, auth, URLs de confidentialité/support et prompts d'exemple." },
  ],
  de: [
    { question: "Was ist der MCP App Store?", answer: "Der MCP App Store ist ein Verzeichnis zum Entdecken von MCP-Apps, ChatGPT-Apps, Claude-Connectors und passenden Plattformflächen." },
    { question: "Was ist der Unterschied zwischen ChatGPT-Apps und Claude-Connectors?", answer: "Beide können auf MCP-Servern basieren, erscheinen aber in unterschiedlichen Hosts: ChatGPT oder Claude." },
    { question: "Kann ich meine MCP-App einreichen?", answer: "Ja. Reiche Name, Beschreibung, Plattformen, MCP-Details, Links, Tools und Preview-Beispiele zur Prüfung ein." },
    { question: "Hostet ihr MCP-Server?", answer: "Nein. Das Verzeichnis listet Apps und Connectors; Publisher betreiben Endpoint und Support." },
    { question: "Werden alle Listings geprüft?", answer: "Einreichungen werden vor Veröffentlichung moderiert, aber prüfe vor dem Verbinden selbst Rechte, Datenschutz und Publisher." },
    { question: "Was gehört in ein gutes Listing?", answer: "Klares Tagline, einfache Beschreibung, Plattformen, Fähigkeiten, Auth, Datenschutz-/Support-URLs und Beispielprompts." },
  ],
  "zh-hans": [
    { question: "MCP App Store 是什么？", answer: "MCP App Store 是用于发现 MCP 应用、ChatGPT 应用、Claude 连接器以及相关平台入口的目录。" },
    { question: "ChatGPT 应用和 Claude 连接器有什么区别？", answer: "两者都可以基于 MCP 服务器，但出现的宿主不同。ChatGPT 应用面向 ChatGPT，Claude 连接器面向 Claude 或 Claude API 工作流。" },
    { question: "可以提交自己的 MCP 应用吗？", answer: "可以。在提交页面提供名称、描述、平台入口、MCP 详情、链接、工具和预览示例后即可进入审核。" },
    { question: "你们托管 MCP 服务器吗？", answer: "不托管。这个目录负责列出应用和连接器，端点与支持运营由发布者负责。" },
    { question: "列表中的所有应用都会审核吗？", answer: "提交内容会在发布前经过审核，但连接前仍应自行检查权限、隐私链接和发布者信息。" },
    { question: "好的列表应包含什么？", answer: "应包含清晰的标语、易懂说明、平台支持、功能、认证方式、隐私和支持 URL，以及示例提示词。" },
  ],
  ja: [
    { question: "MCP App Store とは？", answer: "MCP App Store は、MCP 対応アプリ、ChatGPT アプリ、Claude コネクタ、関連するプラットフォーム面を見つけるためのディレクトリです。" },
    { question: "ChatGPT アプリと Claude コネクタの違いは？", answer: "どちらも MCP サーバーを基盤にできますが、表示されるホストが異なります。ChatGPT アプリは ChatGPT 向け、Claude コネクタは Claude または Claude API ワークフロー向けです。" },
    { question: "自分の MCP アプリを投稿できますか？", answer: "はい。投稿ページで名前、説明、対応プラットフォーム、MCP 詳細、リンク、ツール、プレビュー例を送信して審査に出せます。" },
    { question: "MCP サーバーをホストしていますか？", answer: "いいえ。このディレクトリはアプリとコネクタを掲載します。エンドポイントとサポートの運用は公開者の責任です。" },
    { question: "掲載アプリはすべて審査されていますか？", answer: "公開前に投稿はモデレーションされますが、接続前には利用者自身も権限、プライバシーリンク、公開者情報を確認してください。" },
    { question: "良い掲載には何が必要ですか？", answer: "明確なタグライン、平易な説明、プラットフォーム対応、機能、認証方式、プライバシーとサポート URL、プロンプト例が含まれます。" },
  ],
  ko: [
    { question: "MCP App Store는 무엇인가요?", answer: "MCP App Store는 MCP 기반 앱, ChatGPT 앱, Claude 커넥터, 관련 플랫폼 표면을 발견하기 위한 디렉터리입니다." },
    { question: "ChatGPT 앱과 Claude 커넥터의 차이는 무엇인가요?", answer: "둘 다 MCP 서버를 기반으로 할 수 있지만 나타나는 호스트가 다릅니다. ChatGPT 앱은 ChatGPT용이고 Claude 커넥터는 Claude 또는 Claude API 워크플로용입니다." },
    { question: "내 MCP 앱을 제출할 수 있나요?", answer: "네. 제출 페이지에서 이름, 설명, 플랫폼 표면, MCP 세부 정보, 링크, 도구, 미리보기 예시를 제공해 검토를 받을 수 있습니다." },
    { question: "MCP 서버를 호스팅하나요?", answer: "아닙니다. 이 디렉터리는 앱과 커넥터를 목록화합니다. 엔드포인트와 지원 운영은 게시자의 책임입니다." },
    { question: "목록의 모든 앱이 검토되나요?", answer: "제출물은 공개 전에 검토되지만, 사용자는 앱을 연결하기 전에 권한, 개인정보 링크, 게시자 세부 정보를 직접 확인해야 합니다." },
    { question: "좋은 목록에는 무엇이 포함되어야 하나요?", answer: "명확한 태그라인, 쉬운 설명, 플랫폼 지원, 기능, 인증 유형, 개인정보 및 지원 URL, 예시 프롬프트가 포함되어야 합니다." },
  ],
};

function localizedLinkLabel(href: string, fallback: string, locale: Locale): string {
  const categoryMatch = href.match(/^\/category\/(.+)$/);

  if (locale === "es" || locale === "fr" || locale === "de") {
    const copy = {
      es: {
        apps: "Explorar apps",
        submit: "Enviar MCP",
        faq: "Leer FAQ",
        docs: "Guía de listado",
        collections: "Colecciones",
        whatIs: "¿Qué es una app MCP?",
        build: "Crear la primera app MCP",
        chatgpt: "Apps de ChatGPT",
        claude: "Conectores de Claude",
        productivity: "Productividad",
        design: "Diseño",
        data: "Datos",
        developer: "Developers",
        finance: "Finanzas",
        travel: "Viajes",
      },
      fr: {
        apps: "Explorer les apps",
        submit: "Soumettre un MCP",
        faq: "Lire la FAQ",
        docs: "Guide de fiche",
        collections: "Collections",
        whatIs: "Qu'est-ce qu'une app MCP ?",
        build: "Créer une première app MCP",
        chatgpt: "Apps ChatGPT",
        claude: "Connecteurs Claude",
        productivity: "Productivité",
        design: "Design",
        data: "Données",
        developer: "Développeurs",
        finance: "Finance",
        travel: "Voyage",
      },
      de: {
        apps: "Apps ansehen",
        submit: "MCP einreichen",
        faq: "FAQ lesen",
        docs: "Listing-Guide",
        collections: "Kollektionen",
        whatIs: "Was ist eine MCP-App?",
        build: "Erste MCP-App erstellen",
        chatgpt: "ChatGPT-Apps",
        claude: "Claude-Connectors",
        productivity: "Produktivität",
        design: "Design",
        data: "Daten",
        developer: "Entwickler",
        finance: "Finanzen",
        travel: "Reisen",
      },
    }[locale];

    if (href === "/" || href === "/apps" || href === "/store") return copy.apps;
    if (href === "/submit") return copy.submit;
    if (href === "/faq") return copy.faq;
    if (href === "/docs") return copy.docs;
    if (href === "/collections") return copy.collections;
    if (href === "/learn/what-is-an-mcp-app") return copy.whatIs;
    if (href === "/learn/build-your-first-mcp-app") return copy.build;
    if (href === "/chatgpt-apps") return copy.chatgpt;
    if (href === "/claude-connectors") return copy.claude;
    if (categoryMatch) return localizedCategoryName(categoryMatch[1], categoryMatch[1].replace(/-/g, " "), locale);
    if (href.includes("productivity")) return copy.productivity;
    if (href.includes("design")) return copy.design;
    if (href.includes("database") || href.includes("data")) return copy.data;
    if (href.includes("developer") || href.includes("coding")) return copy.developer;
    if (href.includes("finance")) return copy.finance;
    if (href.includes("travel")) return copy.travel;
    return fallback;
  }

  if (locale === "zh-hans") {
    if (href === "/" || href === "/apps" || href === "/store") return "浏览应用";
    if (href === "/submit") return "提交 MCP";
    if (href === "/faq") return "阅读 FAQ";
    if (href === "/docs") return "列表指南";
    if (href === "/collections") return "集合";
    if (href === "/learn/what-is-an-mcp-app") return "什么是 MCP 应用？";
    if (href === "/learn/build-your-first-mcp-app") return "构建第一个 MCP 应用";
    if (href === "/chatgpt-apps") return "ChatGPT 应用";
    if (href === "/claude-connectors") return "Claude 连接器";
    if (categoryMatch) return localizedCategoryName(categoryMatch[1], categoryMatch[1].replace(/-/g, " "), locale);
    if (href.includes("productivity")) return "生产力";
    if (href.includes("design")) return "设计";
    if (href.includes("database") || href.includes("data")) return "数据";
    if (href.includes("developer") || href.includes("coding")) return "开发者";
    if (href.includes("finance")) return "金融";
    if (href.includes("travel")) return "旅行";
    return fallback;
  }

  if (locale === "ja") {
    if (href === "/" || href === "/apps" || href === "/store") return "アプリを探す";
    if (href === "/submit") return "MCP を投稿";
    if (href === "/faq") return "FAQ を読む";
    if (href === "/docs") return "掲載ガイド";
    if (href === "/collections") return "コレクション";
    if (href === "/learn/what-is-an-mcp-app") return "MCP アプリとは？";
    if (href === "/learn/build-your-first-mcp-app") return "最初の MCP アプリを作る";
    if (href === "/chatgpt-apps") return "ChatGPT アプリ";
    if (href === "/claude-connectors") return "Claude コネクタ";
    if (categoryMatch) return localizedCategoryName(categoryMatch[1], categoryMatch[1].replace(/-/g, " "), locale);
    if (href.includes("productivity")) return "生産性";
    if (href.includes("design")) return "デザイン";
    if (href.includes("database") || href.includes("data")) return "データ";
    if (href.includes("developer") || href.includes("coding")) return "開発者向け";
    if (href.includes("finance")) return "金融";
    if (href.includes("travel")) return "旅行";
    return fallback;
  }

  if (locale === "ko") {
    if (href === "/" || href === "/apps" || href === "/store") return "앱 둘러보기";
    if (href === "/submit") return "MCP 제출";
    if (href === "/faq") return "FAQ 읽기";
    if (href === "/docs") return "목록 가이드";
    if (href === "/collections") return "컬렉션";
    if (href === "/learn/what-is-an-mcp-app") return "MCP 앱이란?";
    if (href === "/learn/build-your-first-mcp-app") return "첫 MCP 앱 만들기";
    if (href === "/chatgpt-apps") return "ChatGPT 앱";
    if (href === "/claude-connectors") return "Claude 커넥터";
    if (categoryMatch) return localizedCategoryName(categoryMatch[1], categoryMatch[1].replace(/-/g, " "), locale);
    if (href.includes("productivity")) return "생산성";
    if (href.includes("design")) return "디자인";
    if (href.includes("database") || href.includes("data")) return "데이터";
    if (href.includes("developer") || href.includes("coding")) return "개발자용";
    if (href.includes("finance")) return "금융";
    if (href.includes("travel")) return "여행";
    return fallback;
  }

  return fallback;
}

function mergeLinks(base: LearnLink[], patches: LocalizedLink[] | undefined, locale: Locale): LearnLink[] {
  if (!patches) {
    return locale !== "en"
      ? base.map((link) => ({ ...link, label: localizedLinkLabel(link.href, link.label, locale) }))
      : base;
  }
  return base.map((link, index) => ({
    ...link,
    label: patches[index]?.label ?? localizedLinkLabel(link.href, link.label, locale),
    href: patches[index]?.href ?? link.href,
  }));
}

function mergeSections(base: LearnSection[], patches: LocalizedSection[] | undefined): LearnSection[] {
  if (!patches) return base;
  const patchById = new Map(patches.map((patch) => [patch.id, patch]));
  return base.map((section) => ({ ...section, ...patchById.get(section.id) }));
}

function genericArticleSections(article: LearnArticle, patch: LocalizedArticle, locale: Locale): LearnSection[] {
  const title = patch.title ?? article.title;
  const summary = patch.summary ?? article.summary;
  const description = patch.description ?? article.description;

  if (locale === "es" || locale === "fr" || locale === "de") {
    const copy = {
      es: {
        overview: "Resumen",
        overviewBody: `${title} reúne los puntos clave antes de evaluar apps MCP y conectores.`,
        evaluation: "Criterios de comparación",
        evaluationBody:
          "Revisa hosts compatibles, permisos de lectura y escritura, editor, auth, previews y alcance de herramientas antes de conectar cuentas importantes o datos de producción.",
        bullets: ["Empieza por búsqueda y resumen de solo lectura.", "Exige confirmación explícita para escrituras o envíos externos.", "Usa previews, soporte y privacidad para evaluar confianza."],
        next: "Siguiente paso",
        nextBody: "Filtra candidatos en colecciones y categorías relacionadas, y compara herramientas, permisos, ejemplos y enlaces del editor.",
      },
      fr: {
        overview: "Aperçu",
        overviewBody: `${title} regroupe les points clés avant d'évaluer apps MCP et connecteurs.`,
        evaluation: "Critères de comparaison",
        evaluationBody:
          "Vérifiez les hôtes compatibles, droits lecture/écriture, éditeur, auth, previews et périmètre des outils avant de connecter comptes importants ou données de production.",
        bullets: ["Commencez par recherche et résumé en lecture seule.", "Demandez une confirmation explicite pour écritures ou envois externes.", "Utilisez previews, support et confidentialité pour évaluer la confiance."],
        next: "Étape suivante",
        nextBody: "Réduisez les candidats via collections et catégories, puis comparez outils, permissions, exemples et liens éditeur.",
      },
      de: {
        overview: "Überblick",
        overviewBody: `${title} bündelt die wichtigsten Punkte, bevor du MCP-Apps und Connectors bewertest.`,
        evaluation: "Vergleichskriterien",
        evaluationBody:
          "Prüfe unterstützte Hosts, Lese-/Schreibrechte, Publisher, Auth, Previews und Tool-Umfang, bevor wichtige Konten oder Produktionsdaten verbunden werden.",
        bullets: ["Starte mit read-only Suche und Zusammenfassung.", "Verlange klare Bestätigung für Schreibaktionen oder externe Übermittlung.", "Nutze Previews, Support und Datenschutzlinks als Vertrauenssignale."],
        next: "Nächster Schritt",
        nextBody: "Grenze Kandidaten über Kollektionen und Kategorien ein und vergleiche Tools, Rechte, Beispiele und Publisher-Links.",
      },
    }[locale];

    return [
      { id: "overview", title: copy.overview, body: [copy.overviewBody, summary] },
      { id: "evaluation", title: copy.evaluation, body: [description, copy.evaluationBody], bullets: copy.bullets },
      { id: "next-step", title: copy.next, body: [copy.nextBody] },
    ];
  }

  if (locale === "zh-hans") {
    return [
      {
        id: "overview",
        title: "概览",
        body: [
          `${title} 是一篇帮助你在评估 MCP 应用和连接器前掌握关键问题的指南。`,
          summary,
        ],
      },
      {
        id: "evaluation",
        title: "比较维度",
        body: [
          description,
          "先确认支持的宿主、读写权限、发布者、认证方式、预览和工具范围。连接重要账号或生产数据前，要把允许的操作边界看清楚。",
        ],
        bullets: [
          "从只读检索和总结开始。",
          "涉及写入或外部发送时，优先选择有明确确认的应用。",
          "通过预览、支持和隐私链接判断可信度。",
        ],
      },
      {
        id: "next-step",
        title: "下一步",
        body: [
          "在目录中的相关集合和分类里缩小候选范围，然后比较实际列表中的工具、权限、示例和发布者链接。",
        ],
      },
    ];
  }

  if (locale === "ja") {
    return [
      {
        id: "overview",
        title: "概要",
        body: [
          `${title} は、MCP アプリやコネクタを評価する前に押さえたい要点を整理するガイドです。`,
          summary,
        ],
      },
      {
        id: "evaluation",
        title: "比較の観点",
        body: [
          description,
          "まず対応ホスト、読み取り・書き込み権限、公開者、認証方式、プレビュー、ツール範囲を確認します。重要なアカウントや本番データに接続する前に、操作がどこまで許可されるかを分けて見てください。",
        ],
        bullets: [
          "読み取り専用の取得や要約から始める。",
          "書き込みや外部送信は明示的な確認があるものを選ぶ。",
          "プレビュー、サポート、プライバシーリンクで信頼性を確認する。",
        ],
      },
      {
        id: "next-step",
        title: "次にすること",
        body: [
          "ディレクトリ内の関連コレクションやカテゴリで候補を絞り、実際の掲載でツール、権限、例、公開者リンクを比較します。",
        ],
      },
    ];
  }

  if (locale === "ko") {
    return [
      {
        id: "overview",
        title: "개요",
        body: [
          `${title}는 MCP 앱과 커넥터를 평가하기 전에 알아야 할 핵심을 정리하는 가이드입니다.`,
          summary,
        ],
      },
      {
        id: "evaluation",
        title: "비교 기준",
        body: [
          description,
          "먼저 지원 호스트, 읽기·쓰기 권한, 게시자, 인증 유형, 미리보기, 도구 범위를 확인하세요. 중요한 계정이나 운영 데이터에 연결하기 전에 어떤 작업이 허용되는지 분리해서 봐야 합니다.",
        ],
        bullets: [
          "읽기 전용 검색과 요약부터 시작합니다.",
          "쓰기나 외부 전송은 명시적 확인이 있는 앱을 선택합니다.",
          "미리보기, 지원, 개인정보 링크로 신뢰성을 확인합니다.",
        ],
      },
      {
        id: "next-step",
        title: "다음 단계",
        body: [
          "디렉터리의 관련 컬렉션과 카테고리에서 후보를 좁힌 뒤, 실제 목록에서 도구, 권한, 예시, 게시자 링크를 비교하세요.",
        ],
      },
    ];
  }

  return article.sections;
}

function genericArticleFaqs(article: LearnArticle, patch: LocalizedArticle, locale: Locale): LearnFaq[] | undefined {
  const title = patch.title ?? article.title;
  if (locale === "es" || locale === "fr" || locale === "de") {
    const copy = {
      es: {
        q1: `¿Qué debo revisar en ${title}?`,
        a1: "Plataformas, alcance de herramientas, permisos de lectura/escritura, enlaces del editor y ejemplos de preview.",
        q2: "¿Cómo elijo la primera app MCP?",
        a2: "Empieza por un flujo centrado en lectura y prioriza confirmación clara y mínimo privilegio para datos importantes o escritura.",
      },
      fr: {
        q1: `Que vérifier dans ${title} ?`,
        a1: "Plateformes, périmètre des outils, permissions lecture/écriture, liens éditeur et exemples de preview.",
        q2: "Comment choisir la première app MCP ?",
        a2: "Commencez par un workflow en lecture et privilégiez confirmation claire et moindre privilège pour données importantes ou écriture.",
      },
      de: {
        q1: `Was sollte ich bei ${title} prüfen?`,
        a1: "Plattformen, Tool-Umfang, Lese-/Schreibrechte, Publisher-Links und Preview-Beispiele.",
        q2: "Wie wähle ich die erste MCP-App?",
        a2: "Starte mit einem leseorientierten Workflow und priorisiere klare Bestätigung sowie Least Privilege für wichtige Daten oder Schreibaktionen.",
      },
    }[locale];
    return [
      { question: copy.q1, answer: copy.a1 },
      { question: copy.q2, answer: copy.a2 },
    ];
  }
  if (locale === "zh-hans") {
    return [
      {
        question: `${title} 应该重点检查什么？`,
        answer: "检查支持平台、工具范围、读写权限、发布者链接和预览示例。",
      },
      {
        question: "第一次应该如何选择要连接的 MCP 应用？",
        answer: "先选择偏读取的工作流。对于重要数据或写入操作，优先选择有明确确认和最小权限的应用。",
      },
    ];
  }
  if (locale === "ja") {
    return [
      {
        question: `${title} では何を確認すべきですか？`,
        answer: "対応プラットフォーム、ツール範囲、読み取り・書き込み権限、公開者リンク、プレビュー例を確認します。",
      },
      {
        question: "最初に接続してよい MCP アプリはどう選びますか？",
        answer: "まず読み取り中心のワークフローを選び、重要なデータや書き込み操作には明確な確認と最小権限があるものを優先します。",
      },
    ];
  }
  if (locale === "ko") {
    return [
      {
        question: `${title}에서 무엇을 확인해야 하나요?`,
        answer: "지원 플랫폼, 도구 범위, 읽기·쓰기 권한, 게시자 링크, 미리보기 예시를 확인하세요.",
      },
      {
        question: "처음 연결할 MCP 앱은 어떻게 고르나요?",
        answer: "먼저 읽기 중심 워크플로를 선택하고, 중요한 데이터나 쓰기 작업에는 명확한 확인과 최소 권한이 있는 앱을 우선하세요.",
      },
    ];
  }
  return article.faqs;
}

function mergeArticle(article: LearnArticle, patch: LocalizedArticle | undefined, locale: Locale): LearnArticle {
  if (!patch) return article;
  return {
    ...article,
    ...patch,
    primaryCta: article.primaryCta ? { ...article.primaryCta, ...patch.primaryCta } : undefined,
    secondaryCta: article.secondaryCta ? { ...article.secondaryCta, ...patch.secondaryCta } : undefined,
    relatedLinks: mergeLinks(article.relatedLinks, patch.relatedLinks, locale),
    sections: patch.sections ? mergeSections(article.sections, patch.sections) : genericArticleSections(article, patch, locale),
    faqs: patch.faqs ?? genericArticleFaqs(article, patch, locale),
    sources: patch.sources ?? article.sources,
  };
}

function articlePatch(locale: Locale, slug: string): LocalizedArticle | undefined {
  if (locale === "es") {
    return esArticleSummaries[slug];
  }
  if (locale === "fr") {
    return frArticleSummaries[slug];
  }
  if (locale === "de") {
    return deArticleSummaries[slug];
  }
  if (locale === "zh-hans") {
    return zhArticleSummaries[slug];
  }
  if (locale === "ja") {
    return jaArticleCopy[slug] ?? jaArticleSummaries[slug];
  }
  if (locale === "ko") {
    return koArticleCopy[slug] ?? koArticleSummaries[slug];
  }
  return undefined;
}

function collectionPatch(locale: Locale, slug: string): LocalizedCollection | undefined {
  if (locale === "es") return esCollections[slug];
  if (locale === "fr") return frCollections[slug];
  if (locale === "de") return deCollections[slug];
  if (locale === "zh-hans") return zhCollections[slug];
  if (locale === "ja") return jaCollections[slug];
  if (locale === "ko") return koCollections[slug];
  return undefined;
}

function genericCollectionCheckpoints(locale: Locale): string[] | undefined {
  if (locale === "es") {
    return [
      "Confirma que la app encaja con tu plataforma y workflow.",
      "Compara por separado acciones de solo lectura y acciones con escritura o UI interactiva.",
      "Revisa editor, auth, privacidad y soporte antes de conectar.",
    ];
  }
  if (locale === "fr") {
    return [
      "Vérifiez que l'app correspond à votre plateforme et workflow.",
      "Comparez séparément les actions en lecture seule et celles avec écriture ou UI interactive.",
      "Vérifiez éditeur, auth, confidentialité et support avant connexion.",
    ];
  }
  if (locale === "de") {
    return [
      "Prüfe, ob die App zu Plattform und Workflow passt.",
      "Vergleiche read-only Aktionen getrennt von schreibenden oder interaktiven Aktionen.",
      "Prüfe Publisher, Auth, Datenschutz und Support vor dem Verbinden.",
    ];
  }
  if (locale === "zh-hans") {
    return [
      "确认候选应用是否匹配你的平台和工作流。",
      "分开比较只读操作，以及可写或交互式操作。",
      "连接前检查发布者、认证方式、隐私和支持链接。",
    ];
  }
  if (locale === "ja") {
    return [
      "候補アプリが使うプラットフォームとワークフローに合うか確認します。",
      "読み取り専用の操作と、書き込み可能または対話型の操作を分けて比較します。",
      "公開者、認証方式、プライバシー、サポートリンクを接続前に確認します。",
    ];
  }
  if (locale === "ko") {
    return [
      "후보 앱이 사용하는 플랫폼과 워크플로에 맞는지 확인합니다.",
      "읽기 전용 작업과 쓰기 가능 또는 인터랙티브 작업을 분리해서 비교합니다.",
      "연결 전에 게시자, 인증 유형, 개인정보, 지원 링크를 확인합니다.",
    ];
  }
  return undefined;
}

function genericCollectionFaqs(collectionTitle: string, locale: Locale): LearnFaq[] | undefined {
  if (locale === "es") {
    return [
      { question: `¿Cómo elegir ${collectionTitle}?`, answer: "Primero reduce candidatos por workflow real y compara herramientas, auth, permisos, previews y enlaces del editor." },
      { question: "¿Qué revisar antes de conectar?", answer: "Alcance de lectura/escritura, soporte, privacidad y límites de cuenta del equipo." },
    ];
  }
  if (locale === "fr") {
    return [
      { question: `Comment choisir ${collectionTitle} ?`, answer: "Réduisez d'abord selon le workflow réel, puis comparez outils, auth, permissions, previews et liens éditeur." },
      { question: "Que vérifier avant connexion ?", answer: "Périmètre lecture/écriture, support, confidentialité et limites de compte de l'équipe." },
    ];
  }
  if (locale === "de") {
    return [
      { question: `Wie wähle ich ${collectionTitle}?`, answer: "Grenze zuerst nach echtem Workflow ein und vergleiche Tools, Auth, Rechte, Previews und Publisher-Links." },
      { question: "Was vor dem Verbinden prüfen?", answer: "Lese-/Schreibumfang, Support, Datenschutz und Konto-Grenzen des Teams." },
    ];
  }
  if (locale === "zh-hans") {
    return [
      {
        question: `${collectionTitle} 应该如何选择？`,
        answer: "先按实际工作流缩小候选，再比较工具、认证方式、权限、预览和发布者链接。",
      },
      {
        question: "连接前应该检查什么？",
        answer: "检查读写范围、支持链接、隐私政策，以及团队账号边界。",
      },
    ];
  }
  if (locale === "ja") {
    return [
      {
        question: `${collectionTitle} はどう選べばよいですか？`,
        answer: "まず実際のワークフローに合う候補を絞り、ツール、認証方式、権限、プレビュー、公開者リンクを比較します。",
      },
      {
        question: "接続前に何を確認すべきですか？",
        answer: "読み取りと書き込みの範囲、サポートリンク、プライバシー、チームのアカウント境界を確認してください。",
      },
    ];
  }
  if (locale === "ko") {
    return [
      {
        question: `${collectionTitle}는 어떻게 선택해야 하나요?`,
        answer: "먼저 실제 워크플로에 맞는 후보를 좁히고 도구, 인증 유형, 권한, 미리보기, 게시자 링크를 비교하세요.",
      },
      {
        question: "연결 전에 무엇을 확인해야 하나요?",
        answer: "읽기와 쓰기 범위, 지원 링크, 개인정보, 팀 계정 경계를 확인하세요.",
      },
    ];
  }
  return undefined;
}

function mergeCollection(collection: AppCollection, patch: LocalizedCollection | undefined, locale: Locale): AppCollection {
  if (!patch) return collection;
  const localized = { ...collection, ...patch };
  return {
    ...localized,
    relatedLinks: mergeLinks(collection.relatedLinks, patch.relatedLinks, locale),
    checkpoints: patch.checkpoints ?? genericCollectionCheckpoints(locale) ?? collection.checkpoints,
    faqs: patch.faqs ?? genericCollectionFaqs(localized.title, locale) ?? collection.faqs,
  };
}

export function localizedLearnArticles(locale: Locale): LearnArticle[] {
  return learnArticles.map((article) => mergeArticle(article, articlePatch(locale, article.slug), locale));
}

export function localizedFeaturedLearnArticles(locale: Locale): LearnArticle[] {
  return featuredLearnArticles().map((article) => mergeArticle(article, articlePatch(locale, article.slug), locale));
}

export function localizedGetLearnArticle(slug: string, locale: Locale): LearnArticle | undefined {
  const article = getLearnArticle(slug);
  return article ? mergeArticle(article, articlePatch(locale, article.slug), locale) : undefined;
}

export function localizedSiteFaqItems(locale: Locale): LearnFaq[] {
  if (locale !== "en") {
    return localizedFaqs[locale];
  }
  return siteFaqItems;
}

export function localizedAppCollections(locale: Locale): AppCollection[] {
  return appCollections.map((collection) => mergeCollection(collection, collectionPatch(locale, collection.slug), locale));
}

export function localizedFeaturedAppCollections(locale: Locale, limit = 4): AppCollection[] {
  return featuredAppCollections(limit).map((collection) => mergeCollection(collection, collectionPatch(locale, collection.slug), locale));
}

export function localizedGetAppCollection(slug: string, locale: Locale): AppCollection | undefined {
  const collection = getAppCollection(slug);
  return collection ? mergeCollection(collection, collectionPatch(locale, collection.slug), locale) : undefined;
}

export function localizedCategoryName(slug: string, fallback: string, locale: Locale): string {
  if (locale === "es") {
    return esCategoryNames[slug] ?? fallback;
  }
  if (locale === "fr") {
    return frCategoryNames[slug] ?? fallback;
  }
  if (locale === "de") {
    return deCategoryNames[slug] ?? fallback;
  }
  if (locale === "zh-hans") {
    return zhCategoryNames[slug] ?? fallback;
  }
  if (locale === "ja") {
    return jaCategoryNames[slug] ?? fallback;
  }
  if (locale === "ko") {
    return koCategoryNames[slug] ?? fallback;
  }
  return fallback;
}

function localizedGenericCategoryContent(slug: string, name: string, count: number, locale: Locale): CategoryContent {
  if (locale === "es" || locale === "fr" || locale === "de") {
    const copy = {
      es: {
        eyebrow: "Guía de categoría",
        title: `Compara apps MCP de ${name} por plataforma, herramientas y señales de confianza.`,
        meta: `Compara apps MCP de ${name}, apps de ChatGPT, conectores de Claude y servidores MCP por plataforma, herramientas, previews y permisos.`,
        body1: `Esta categoría tiene ${count} apps y conectores publicados relacionados con ${name}. Puedes comparar cómo encajan con ChatGPT, Claude, Claude Code u otros hosts MCP.`,
        body2: "Un buen listado MCP muestra workflow, superficie de plataforma, auth, herramientas y enlaces de soporte antes de conectar.",
        checkpoints: ["Confirma soporte para el host que usa tu equipo.", "Separa herramientas de lectura de acciones con escritura o UI interactiva.", "Revisa editor, privacidad, soporte, auth y transporte antes de desplegar."],
        links: ["Apps de ChatGPT", "Conectores de Claude", "Fundamentos MCP"],
        q1: `¿Qué son las apps MCP de ${name}?`,
        a1: `Apps, conectores o servidores MCP listados para workflows de ${name}, con datos para comparar hosts, herramientas, auth y editor.`,
        q2: `¿Cómo elegir apps MCP de ${name}?`,
        a2: "Empieza por soporte de host, alcance de herramientas, permisos, previews y confirmación para acciones importantes.",
      },
      fr: {
        eyebrow: "Guide de catégorie",
        title: `Comparez les apps MCP ${name} par plateforme, outils et signaux de confiance.`,
        meta: `Comparez apps MCP ${name}, apps ChatGPT, connecteurs Claude et serveurs MCP par plateforme, outils, previews et permissions.`,
        body1: `Cette catégorie contient ${count} apps et connecteurs publiés liés à ${name}. Comparez leur adéquation avec ChatGPT, Claude, Claude Code ou d'autres hôtes MCP.`,
        body2: "Une bonne fiche MCP montre workflow, surface plateforme, auth, outils et liens support avant connexion.",
        checkpoints: ["Vérifiez le support de l'hôte utilisé par l'équipe.", "Séparez outils en lecture et actions avec écriture ou UI interactive.", "Vérifiez éditeur, confidentialité, support, auth et transport avant déploiement."],
        links: ["Apps ChatGPT", "Connecteurs Claude", "Bases MCP"],
        q1: `Que sont les apps MCP ${name} ?`,
        a1: `Des apps, connecteurs ou serveurs MCP listés pour les workflows ${name}, avec hosts, outils, auth et liens éditeur à comparer.`,
        q2: `Comment choisir des apps MCP ${name} ?`,
        a2: "Commencez par support host, périmètre outils, permissions, previews et confirmation pour actions importantes.",
      },
      de: {
        eyebrow: "Kategorie-Guide",
        title: `Vergleiche ${name}-MCP-Apps nach Plattform, Tools und Vertrauenssignalen.`,
        meta: `Vergleiche ${name}-MCP-Apps, ChatGPT-Apps, Claude-Connectors und MCP-Server nach Plattform, Tools, Previews und Rechten.`,
        body1: `Diese Kategorie enthält ${count} veröffentlichte Apps und Connectors rund um ${name}. Vergleiche ihren Fit für ChatGPT, Claude, Claude Code oder andere MCP-Hosts.`,
        body2: "Ein gutes MCP-Listing zeigt Workflow, Plattformfläche, Auth, Tools und Supportlinks vor dem Verbinden.",
        checkpoints: ["Prüfe Unterstützung für den Host deines Teams.", "Trenne read-only Tools von schreibenden oder interaktiven Aktionen.", "Prüfe Publisher, Datenschutz, Support, Auth und Transport vor dem Rollout."],
        links: ["ChatGPT-Apps", "Claude-Connectors", "MCP-Grundlagen"],
        q1: `Was sind ${name}-MCP-Apps?`,
        a1: `Für ${name}-Workflows gelistete MCP-Apps, Connectors oder Server mit vergleichbaren Hosts, Tools, Auth und Publisher-Links.`,
        q2: `Wie wähle ich ${name}-MCP-Apps?`,
        a2: "Starte mit Host-Support, Tool-Umfang, Rechten, Previews und Bestätigung für wichtige Aktionen.",
      },
    }[locale];

    return {
      eyebrow: copy.eyebrow,
      title: copy.title,
      metaDescription: copy.meta,
      body: [copy.body1, copy.body2],
      checkpoints: copy.checkpoints,
      relatedLinks: [
        { label: copy.links[0], href: "/chatgpt-apps" },
        { label: copy.links[1], href: "/claude-connectors" },
        { label: copy.links[2], href: "/learn/what-is-an-mcp-app" },
      ],
      faqs: [
        { question: copy.q1, answer: copy.a1 },
        { question: copy.q2, answer: copy.a2 },
      ],
    };
  }

  if (locale === "zh-hans") {
    return {
      eyebrow: "分类指南",
      title: `按平台、工具和可信信号比较${name} MCP 应用。`,
      metaDescription: `按平台支持、工具、预览和权限比较${name} MCP 应用、ChatGPT 应用、Claude 连接器和 MCP 服务器。`,
      body: [
        `此分类当前有 ${count} 个与${name}相关的已发布应用和连接器。你可以比较它们如何适配 ChatGPT、Claude、Claude Code 或其他 MCP 宿主。`,
        "有用的 MCP 列表会在连接前清楚展示工作流、平台入口、认证方式、工具和支持链接。",
      ],
      checkpoints: [
        "确认它是否支持团队使用的助手宿主。",
        "分开比较只读工具和可写或交互式操作。",
        "部署前检查发布者、隐私、支持、认证和传输方式。",
      ],
      relatedLinks: [
        { label: "ChatGPT 应用", href: "/chatgpt-apps" },
        { label: "Claude 连接器", href: "/claude-connectors" },
        { label: "MCP 基础", href: "/learn/what-is-an-mcp-app" },
      ],
      faqs: [
        { question: `什么是${name} MCP 应用？`, answer: `它是面向${name}工作流列出的 MCP 应用、连接器或服务器，可比较支持宿主、工具、认证和发布者链接等信息。` },
        { question: `应该如何选择${name} MCP 应用？`, answer: "先查看宿主支持、工具范围、权限、预览，以及重要写入操作是否需要明确确认。" },
      ],
    };
  }

  if (locale === "ja") {
    return {
      eyebrow: "カテゴリガイド",
      title: `${name} MCP アプリをプラットフォーム、ツール、信頼シグナルで比較する。`,
      metaDescription: `${name} MCP アプリ、ChatGPT アプリ、Claude コネクタ、MCP サーバーを対応プラットフォーム、ツール、プレビュー、権限で比較します。`,
      body: [
        `このカテゴリには現在、${name} に関連する公開済みアプリとコネクタが ${count} 件あります。ChatGPT、Claude、Claude Code、その他の MCP ホストにどう合うかを比較できます。`,
        "有用な MCP 掲載は、接続前にワークフロー、プラットフォーム面、認証方式、ツール、サポートリンクを明確に示します。",
      ],
      checkpoints: [
        "チームが使うアシスタントホストに対応しているか確認します。",
        "読み取り専用ツールと、書き込み可能または対話型の操作を分けて比較します。",
        "展開前に公開者、プライバシー、サポート、認証、トランスポートを確認します。",
      ],
      relatedLinks: [
        { label: "ChatGPT アプリ", href: "/chatgpt-apps" },
        { label: "Claude コネクタ", href: "/claude-connectors" },
        { label: "MCP の基本", href: "/learn/what-is-an-mcp-app" },
      ],
      faqs: [
        { question: `${name} MCP アプリとは？`, answer: `${name} ワークフロー向けに掲載された MCP 対応アプリ、コネクタ、サーバーで、対応ホスト、ツール、認証、公開者リンクなどを比較できます。` },
        { question: `${name} MCP アプリはどう選べばよいですか？`, answer: "ホスト対応、ツール範囲、権限、プレビュー、重要な書き込み操作に明示的な確認があるかから始めます。" },
      ],
    };
  }

  if (locale === "ko") {
    return {
      eyebrow: "카테고리 가이드",
      title: `${name} MCP 앱을 플랫폼, 도구, 신뢰 신호로 비교하세요.`,
      metaDescription: `${name} MCP 앱, ChatGPT 앱, Claude 커넥터, MCP 서버를 플랫폼 지원, 도구, 미리보기, 권한 기준으로 비교합니다.`,
      body: [
        `이 카테고리에는 현재 ${name} 관련 게시 앱과 커넥터가 ${count}개 있습니다. ChatGPT, Claude, Claude Code 또는 다른 MCP 호스트에 어떻게 맞는지 비교할 수 있습니다.`,
        "유용한 MCP 목록은 연결 전에 워크플로, 플랫폼 표면, 인증 유형, 도구, 지원 링크를 명확하게 보여줘야 합니다.",
      ],
      checkpoints: [
        "팀이 사용하는 어시스턴트 호스트를 지원하는지 확인합니다.",
        "읽기 전용 도구와 쓰기 가능 또는 인터랙티브 작업을 따로 비교합니다.",
        "배포 전에 게시자, 개인정보, 지원, 인증, 전송 방식을 검토합니다.",
      ],
      relatedLinks: [
        { label: "ChatGPT 앱", href: "/chatgpt-apps" },
        { label: "Claude 커넥터", href: "/claude-connectors" },
        { label: "MCP 기본", href: "/learn/what-is-an-mcp-app" },
      ],
      faqs: [
        { question: `${name} MCP 앱이란 무엇인가요?`, answer: `${name} 워크플로용으로 등록된 MCP 기반 앱, 커넥터 또는 서버이며 지원 호스트, 도구, 인증, 게시자 링크 같은 정보를 비교할 수 있습니다.` },
        { question: `${name} MCP 앱은 어떻게 선택해야 하나요?`, answer: "호스트 지원, 도구 범위, 권한, 미리보기, 중요한 쓰기 작업에 명시적 검토가 있는지부터 확인하세요." },
      ],
    };
  }

  return genericCategoryContent(name, count);
}

export function localizedCategoryContent(slug: string, name: string, count: number, locale: Locale): CategoryContent | undefined {
  const base = categoryContentBySlug[slug];
  const patch =
    locale === "zh-hans"
      ? zhCategoryGuides[slug]
      : locale === "ja"
        ? jaCategoryGuides[slug]
        : locale === "ko"
          ? koCategoryGuides[slug]
          : undefined;
  if (base) {
    if (locale === "es" || locale === "fr" || locale === "de") {
      return localizedGenericCategoryContent(slug, name, count, locale);
    }

    if (locale === "zh-hans" || locale === "ja" || locale === "ko") {
      const defaultFaqs =
        locale === "zh-hans"
          ? [
              {
                question: `${name} MCP 应用应该如何选择？`,
                answer: "比较支持宿主、工具范围、权限、发布者、预览和支持链接。",
              },
              {
                question: "最先应该检查什么？",
                answer: "先从只读用法开始，并确认写入或外部发送是否有明确确认。",
              },
            ]
          : [
              {
                question: locale === "ja" ? `${name} MCP アプリはどう選べばよいですか？` : `${name} MCP 앱은 어떻게 선택해야 하나요?`,
                answer:
                  locale === "ja"
                    ? "対応ホスト、ツール範囲、権限、公開者、プレビュー、サポートリンクを比較します。"
                    : "지원 호스트, 도구 범위, 권한, 게시자, 미리보기, 지원 링크를 비교하세요.",
              },
              {
                question: locale === "ja" ? "最初に確認するべきことは？" : "처음 확인해야 할 것은 무엇인가요?",
                answer:
                  locale === "ja"
                    ? "読み取り専用の使い方から始め、書き込みや外部送信には明確な確認があるかを見てください。"
                    : "읽기 전용 사용부터 시작하고 쓰기나 외부 전송에는 명확한 확인이 있는지 보세요.",
              },
            ];
      return {
        ...base,
        ...patch,
        checkpoints: patch?.checkpoints ?? genericCollectionCheckpoints(locale) ?? base.checkpoints,
        relatedLinks: mergeLinks(base.relatedLinks, patch?.relatedLinks, locale),
        faqs: patch?.faqs ?? defaultFaqs,
      };
    }
    return {
      ...base,
      ...patch,
    };
  }
  return localizedGenericCategoryContent(slug, name, count, locale);
}
