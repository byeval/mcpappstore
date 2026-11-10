import type { Locale } from "@/lib/i18n";
import type { LearnArticle } from "@/lib/learn";

type ComparisonCopy = Pick<LearnArticle, "title" | "description" | "summary" | "sections" | "faqs">;
// Keep this comparison complete in every supported language. Summary-only translations
// otherwise replace the guide with generic advice that does not answer the comparison.
export const platformComparison: Record<Locale, ComparisonCopy> = {
  en: {
    title: "ChatGPT apps vs Claude connectors",
    description: "Compare ChatGPT apps and Claude connectors by host, connection method, permissions and a repeatable test before choosing an MCP workflow.",
    summary: "Start with the task and host you use. Then verify the connection, permissions and result on the same small example.",
    sections: [
      { id: "shared-layer", title: "Same protocol, separate compatibility checks", body: ["MCP describes how a host connects to a server. A listing that names MCP does not by itself prove support for ChatGPT, Claude or a particular desktop client. Check the platform badge and the publisher's instructions for the exact host you use."] },
      { id: "chatgpt-apps", title: "Evaluate the ChatGPT app experience", body: ["Open the ChatGPT link on the listing and check availability in your account. For a task such as finding a design asset, test the whole path: ask for an asset, inspect the result, then open or use it. A recognizable name or screenshot is not evidence that this full workflow works."], bullets: ["Check whether the result stays in chat or opens the publisher's service.", "Record any separate account, subscription or authorization required."] },
      { id: "claude-connectors", title: "Distinguish remote connectors from local installs", body: ["A remote MCP URL and a command to run a local server are different connection methods. Claude's remote custom connectors connect from Anthropic's cloud; a service available only on your own localhost is not a remote endpoint. Follow instructions for the specific Claude surface rather than pasting an install command into a URL field."], bullets: ["Check the endpoint, authentication method and permitted workspace.", "Start with a read operation before enabling changes to external data."] },
      { id: "decision", title: "Run the same small comparison", body: ["Use one non-sensitive example and write down the outcome for each host. Choose the one that completes your actual task with understandable permissions and a usable result."], steps: ["Name a concrete task, such as finding one project document and citing its source.", "Confirm the publisher, platform support and connection requirements on the listing.", "Connect with the smallest scope available and run the same prompt in each candidate.", "Check source accuracy, missing results, follow-up actions and how to disconnect."], callout: "A directory listing is a discovery aid. Confirm current availability, pricing and permissions with the publisher before connecting." },
    ],
    faqs: [{ question: "Can I reuse one MCP server in both hosts?", answer: "Sometimes. Verify each host's transport, authentication, tools and UI requirements separately; sharing the MCP protocol alone is not a compatibility guarantee." }, { question: "Which should a team choose first?", answer: "Test the host the team already uses against one real task. Compare result quality, connection effort, permission scope and the ability to revoke access." }],
  },
  "zh-hans": {
    title: "ChatGPT 应用与 Claude 连接器怎么选",
    description: "从使用平台、连接方式、权限和实际测试结果，对比 ChatGPT 应用与 Claude 连接器，选择适合任务的 MCP 工具。",
    summary: "先确定任务和常用平台，再用同一个小案例验证连接、权限与结果。",
    sections: [
      { id: "shared-layer", title: "协议相同，兼容性仍需分别确认", body: ["MCP 描述客户端与服务器如何连接。目录中写着 MCP，不代表它已经支持 ChatGPT、Claude 或某个桌面客户端。请核对平台标签，并查看发布者针对你所用平台的连接说明。"] },
      { id: "chatgpt-apps", title: "检查 ChatGPT 中的完整使用过程", body: ["打开条目中的 ChatGPT 链接，确认自己的账号可以使用。以寻找设计素材为例，实际完成提出需求、检查结果、打开或使用素材这几步；熟悉的名称和截图不能代替完整测试。"], bullets: ["结果是在对话中呈现，还是跳转到发布者网站？", "是否另需账号、订阅或授权？把这些条件记录下来。"] },
      { id: "claude-connectors", title: "区分远程连接器与本地安装", body: ["远程 MCP URL 与启动本地服务器的命令是两种连接方式。Claude 远程自定义连接器从 Anthropic 云端发起连接，只在本机 localhost 可用的服务不能直接当作远程地址。请按对应 Claude 产品的说明配置，不要把安装命令填入 URL 输入框。"], bullets: ["检查端点、认证方式和可访问的工作区。", "先测试读取，再决定是否允许修改外部数据。"] },
      { id: "decision", title: "用同一个小案例比较", body: ["选择一个不含敏感信息的例子，记录两个平台的结果。优先选择能完成实际任务、权限清楚且结果可用的方案。"], steps: ["明确任务，例如找到一份项目文档并给出来源。", "从条目核对发布者、支持平台和连接条件。", "使用尽可能小的权限连接，并在候选平台运行相同提示词。", "检查来源准确性、遗漏、后续操作和撤销连接的方法。"], callout: "目录帮助发现工具；连接前仍需向发布者确认当前可用性、价格和权限。" },
    ],
    faqs: [{ question: "同一个 MCP 服务器能在两个平台复用吗？", answer: "有时可以。但传输方式、认证、工具和界面要求都需分别验证，仅使用相同协议并不保证兼容。" }, { question: "团队应该先选哪个？", answer: "先在团队常用的平台测试一个真实任务，再比较结果质量、连接成本、权限范围和撤销访问是否方便。" }],
  },
  es: {
    title: "Apps de ChatGPT frente a conectores de Claude",
    description: "Compara plataforma, conexión, permisos y resultados con una prueba concreta antes de elegir un flujo MCP en ChatGPT o Claude.",
    summary: "Parte de tu tarea y plataforma habitual. Comprueba conexión, permisos y resultados con el mismo ejemplo pequeño.",
    sections: [
      { id: "shared-layer", title: "Un protocolo no garantiza compatibilidad", body: ["Que una ficha mencione MCP no demuestra que funcione en todos los clientes. Comprueba la plataforma indicada y las instrucciones del editor para el producto que utilizas."] },
      { id: "chatgpt-apps", title: "Prueba el recorrido completo en ChatGPT", body: ["Abre el enlace de ChatGPT de la ficha y confirma su disponibilidad en tu cuenta. Para buscar un recurso de diseño, solicita uno, revisa el resultado y ábrelo. Un nombre conocido o una captura no sustituye esta prueba."], bullets: ["Anota si el resultado aparece en el chat o abre otro servicio.", "Comprueba si necesitas otra cuenta, suscripción o autorización."] },
      { id: "claude-connectors", title: "No confundas URL remota e instalación local", body: ["Una URL MCP remota y un comando para iniciar un servidor local requieren configuraciones distintas. Sigue las instrucciones de tu versión de Claude y no pegues un comando de instalación en un campo de URL."], bullets: ["Verifica dirección, autenticación y espacio de trabajo accesible.", "Empieza leyendo datos antes de permitir modificaciones."] },
      { id: "decision", title: "Compara con una tarea pequeña", body: ["Usa un ejemplo sin datos sensibles y registra el resultado de cada candidato."], steps: ["Define la tarea: encontrar un documento de proyecto y citar su fuente.", "Comprueba editor, plataforma y requisitos de conexión.", "Conecta con los permisos mínimos y usa la misma instrucción.", "Revisa exactitud, omisiones, pasos posteriores y cómo desconectar."], callout: "Confirma disponibilidad, precios y permisos actuales con el editor." },
    ],
    faqs: [{ question: "¿Puedo reutilizar el mismo servidor?", answer: "A veces. Verifica transporte, autenticación, herramientas e interfaz en cada plataforma; el protocolo compartido no garantiza compatibilidad." }, { question: "¿Por dónde empieza un equipo?", answer: "Por una tarea real en su plataforma habitual. Compara calidad del resultado, esfuerzo de conexión, permisos y revocación del acceso." }],
  },
  fr: {
    title: "Apps ChatGPT ou connecteurs Claude : comment choisir",
    description: "Comparez plateforme, connexion, permissions et résultats avec un test concret avant de choisir un outil MCP pour ChatGPT ou Claude.",
    summary: "Partez de votre tâche et de votre plateforme habituelle, puis vérifiez la connexion et le résultat sur un petit exemple commun.",
    sections: [
      { id: "shared-layer", title: "Un protocole commun ne suffit pas", body: ["La mention MCP dans une fiche ne prouve pas la compatibilité avec tous les clients. Vérifiez la plateforme indiquée et les instructions de l'éditeur pour votre produit."] },
      { id: "chatgpt-apps", title: "Testez le parcours complet dans ChatGPT", body: ["Ouvrez le lien ChatGPT et vérifiez la disponibilité dans votre compte. Pour trouver un élément graphique, demandez-le, examinez le résultat, puis ouvrez-le. Un nom connu ou une capture ne remplace pas ce test."], bullets: ["Notez si le résultat reste dans la conversation ou ouvre un autre service.", "Vérifiez les comptes, abonnements et autorisations supplémentaires."] },
      { id: "claude-connectors", title: "Distinguez connexion distante et installation locale", body: ["Une URL MCP distante et une commande de lancement local correspondent à deux configurations. Suivez les instructions de votre version de Claude ; ne collez pas une commande dans un champ URL."], bullets: ["Vérifiez l'adresse, l'authentification et l'espace de travail accessible.", "Commencez par une lecture avant d'autoriser des modifications."] },
      { id: "decision", title: "Comparez sur une petite tâche", body: ["Utilisez un exemple sans données sensibles et consignez le résultat de chaque candidat."], steps: ["Définissez la tâche : trouver un document de projet et citer sa source.", "Vérifiez l'éditeur, la plateforme et les conditions de connexion.", "Accordez les permissions minimales et utilisez la même demande.", "Contrôlez exactitude, omissions, actions suivantes et déconnexion."], callout: "Confirmez disponibilité, tarifs et permissions actuels auprès de l'éditeur." },
    ],
    faqs: [{ question: "Puis-je réutiliser le même serveur ?", answer: "Parfois. Vérifiez séparément transport, authentification, outils et interface pour chaque plateforme." }, { question: "Par où commencer en équipe ?", answer: "Testez une tâche réelle sur votre plateforme habituelle. Comparez qualité, effort de connexion, permissions et révocation de l'accès." }],
  },
  de: {
    title: "ChatGPT-Apps und Claude-Connectoren im Vergleich",
    description: "Vergleiche Plattform, Verbindung, Berechtigungen und Ergebnisse mit einer konkreten Aufgabe, bevor du ein MCP-Werkzeug auswählst.",
    summary: "Beginne mit deiner Aufgabe und gewohnten Plattform. Prüfe Verbindung und Ergebnis an demselben kleinen Beispiel.",
    sections: [
      { id: "shared-layer", title: "Ein gemeinsames Protokoll genügt nicht", body: ["Die Angabe MCP garantiert keine Unterstützung in jedem Client. Prüfe die Plattformangabe und die Anleitung des Anbieters für das Produkt, das du verwendest."] },
      { id: "chatgpt-apps", title: "Den vollständigen Ablauf in ChatGPT testen", body: ["Öffne den ChatGPT-Link und prüfe die Verfügbarkeit in deinem Konto. Suche beispielsweise eine Designvorlage, prüfe das Ergebnis und öffne sie. Ein bekannter Name oder ein Screenshot ersetzt diesen Test nicht."], bullets: ["Bleibt das Ergebnis im Chat oder öffnet es einen anderen Dienst?", "Sind ein zusätzliches Konto, Abonnement oder weitere Freigaben nötig?"] },
      { id: "claude-connectors", title: "Remote-URL und lokale Installation unterscheiden", body: ["Eine entfernte MCP-URL und ein Befehl zum Starten eines lokalen Servers erfordern unterschiedliche Konfigurationen. Folge der Anleitung für dein Claude-Produkt; ein Installationsbefehl gehört nicht in ein URL-Feld."], bullets: ["Prüfe Adresse, Authentifizierung und zugänglichen Arbeitsbereich.", "Teste zuerst einen Lesezugriff, bevor du Änderungen erlaubst."] },
      { id: "decision", title: "Mit derselben kleinen Aufgabe vergleichen", body: ["Nutze ein Beispiel ohne sensible Daten und halte die Ergebnisse fest."], steps: ["Definiere die Aufgabe: ein Projektdokument finden und die Quelle nennen.", "Prüfe Anbieter, Plattform und Verbindungsvoraussetzungen.", "Vergib minimale Rechte und verwende dieselbe Anfrage.", "Prüfe Genauigkeit, fehlende Ergebnisse, Folgeaktionen und das Trennen der Verbindung."], callout: "Bestätige aktuelle Verfügbarkeit, Preise und Rechte beim Anbieter." },
    ],
    faqs: [{ question: "Kann ich denselben Server wiederverwenden?", answer: "Manchmal. Transport, Authentifizierung, Werkzeuge und Oberfläche müssen für jede Plattform separat geprüft werden." }, { question: "Womit sollte ein Team beginnen?", answer: "Mit einer realen Aufgabe auf seiner gewohnten Plattform. Vergleicht Ergebnisqualität, Verbindungsaufwand, Rechte und Widerruf des Zugriffs." }],
  },
  ru: {
    title: "Приложения ChatGPT и коннекторы Claude: как выбрать",
    description: "Сравните платформу, подключение, разрешения и результаты на конкретной задаче перед выбором инструмента MCP.",
    summary: "Начните с задачи и привычной платформы. Проверьте подключение и результат на одном небольшом примере.",
    sections: [
      { id: "shared-layer", title: "Общий протокол не гарантирует совместимость", body: ["Упоминание MCP в каталоге не доказывает поддержку каждого клиента. Проверьте указанную платформу и инструкцию издателя именно для вашего продукта."] },
      { id: "chatgpt-apps", title: "Проверьте весь сценарий в ChatGPT", body: ["Откройте ссылку ChatGPT и проверьте доступность в своём аккаунте. Например, запросите материал для дизайна, изучите результат и откройте его. Знакомое название или снимок экрана не заменяют такую проверку."], bullets: ["Остаётся ли результат в чате или открывает другой сервис?", "Нужны ли отдельный аккаунт, подписка или дополнительные разрешения?"] },
      { id: "claude-connectors", title: "Не путайте удалённый адрес и локальную установку", body: ["Удалённый URL MCP и команда запуска локального сервера требуют разных настроек. Следуйте инструкции для своей версии Claude; не вставляйте команду установки в поле URL."], bullets: ["Проверьте адрес, способ входа и доступное рабочее пространство.", "Сначала проверьте чтение, затем решайте, разрешать ли изменение данных."] },
      { id: "decision", title: "Сравните на одной небольшой задаче", body: ["Используйте пример без конфиденциальных данных и запишите результаты каждого варианта."], steps: ["Задайте конкретную цель: найти документ проекта и указать источник.", "Проверьте издателя, платформу и условия подключения.", "Предоставьте минимальные права и повторите один запрос.", "Проверьте точность, пропуски, дальнейшие действия и отключение доступа."], callout: "Уточняйте актуальную доступность, стоимость и разрешения у издателя." },
    ],
    faqs: [{ question: "Можно ли использовать один сервер в обеих системах?", answer: "Иногда. Отдельно проверьте транспорт, авторизацию, инструменты и интерфейс для каждой платформы." }, { question: "С чего начать команде?", answer: "С реальной задачи на привычной платформе. Сравните качество, сложность подключения, права и возможность отозвать доступ." }],
  },
  ja: {
    title: "ChatGPT アプリと Claude コネクタの選び方",
    description: "利用環境、接続方法、権限、実際の結果を同じ課題で比較し、用途に合う MCP ツールを選びます。",
    summary: "普段の利用環境と目的を決め、同じ小さな例で接続と結果を確かめましょう。",
    sections: [
      { id: "shared-layer", title: "同じプロトコルでも互換性は個別に確認", body: ["掲載ページに MCP と書かれていても、すべてのクライアントに対応するとは限りません。対応環境の表示と、利用する製品向けの公開者の手順を確認してください。"] },
      { id: "chatgpt-apps", title: "ChatGPT で一連の操作を試す", body: ["掲載された ChatGPT リンクを開き、自分のアカウントで使えるか確認します。デザイン素材を探すなら、依頼、結果の確認、素材を開く操作まで試しましょう。名前やスクリーンショットだけでは判断できません。"], bullets: ["結果は会話内に表示されるか、外部サービスを開くか。", "別のアカウント、契約、認証が必要かを記録します。"] },
      { id: "claude-connectors", title: "リモート接続とローカル導入を区別", body: ["リモート MCP URL とローカルサーバーの起動コマンドは設定方法が異なります。利用する Claude 製品の説明に従い、URL 欄にインストールコマンドを貼り付けないでください。"], bullets: ["接続先、認証方法、アクセス可能なワークスペースを確認。", "外部データの変更を許可する前に、読み取り操作を試します。"] },
      { id: "decision", title: "同じ小さな課題で比較する", body: ["機密情報を含まない例を使い、それぞれの結果を記録します。"], steps: ["プロジェクト文書を探して出典を示すなど、具体的な課題を決める。", "公開者、対応環境、接続条件を確認する。", "最小限の権限で接続し、同じ依頼を実行する。", "正確さ、抜け、次の操作、接続解除の方法を確認する。"], callout: "利用可能性、料金、権限の最新情報は公開者に確認してください。" },
    ],
    faqs: [{ question: "同じサーバーを両方で使えますか？", answer: "使える場合もあります。転送方式、認証、ツール、画面の要件を各環境で確認してください。" }, { question: "チームはどこから始めるべきですか？", answer: "普段の環境で実際の課題を試し、結果の質、接続の手間、権限、アクセス解除を比較します。" }],
  },
  ko: {
    title: "ChatGPT 앱과 Claude 커넥터 선택 가이드",
    description: "같은 작업으로 플랫폼, 연결 방식, 권한, 실제 결과를 비교해 적합한 MCP 도구를 선택하세요.",
    summary: "평소 쓰는 플랫폼과 작업을 정한 뒤, 작은 예제 하나로 연결과 결과를 확인하세요.",
    sections: [
      { id: "shared-layer", title: "같은 프로토콜이어도 호환성은 별도로 확인", body: ["목록에 MCP라고 적혀 있어도 모든 클라이언트를 지원한다는 뜻은 아닙니다. 플랫폼 표시와 사용 중인 제품에 대한 게시자의 연결 안내를 확인하세요."] },
      { id: "chatgpt-apps", title: "ChatGPT에서 전체 사용 과정을 시험", body: ["목록의 ChatGPT 링크를 열고 내 계정에서 사용할 수 있는지 확인하세요. 디자인 자료를 찾는다면 요청하고, 결과를 검토하고, 자료를 여는 과정까지 시험하세요. 익숙한 이름이나 스크린샷만으로 판단하지 마세요."], bullets: ["결과가 대화 안에 표시되는지 외부 서비스로 연결되는지 확인하세요.", "추가 계정, 구독, 인증이 필요한지 기록하세요."] },
      { id: "claude-connectors", title: "원격 연결과 로컬 설치를 구분", body: ["원격 MCP URL과 로컬 서버 실행 명령은 설정 방식이 다릅니다. 사용하는 Claude 제품의 안내를 따르고, URL 입력란에 설치 명령을 붙여 넣지 마세요."], bullets: ["주소, 인증 방식, 접근 가능한 작업 공간을 확인하세요.", "외부 데이터 변경을 허용하기 전에 읽기 작업부터 시험하세요."] },
      { id: "decision", title: "동일한 작은 작업으로 비교", body: ["민감한 정보가 없는 예제를 사용하고 각 후보의 결과를 기록하세요."], steps: ["프로젝트 문서를 찾고 출처를 제시하는 등 구체적인 작업을 정하세요.", "게시자, 지원 플랫폼, 연결 조건을 확인하세요.", "최소 권한으로 연결하고 동일한 요청을 실행하세요.", "정확성, 누락, 후속 작업, 연결 해제 방법을 확인하세요."], callout: "현재 이용 가능 여부, 요금, 권한은 게시자에게 확인하세요." },
    ],
    faqs: [{ question: "같은 서버를 두 플랫폼에서 쓸 수 있나요?", answer: "가능한 경우도 있습니다. 전송 방식, 인증, 도구, UI 요구 사항을 각 플랫폼에서 확인해야 합니다." }, { question: "팀은 어디서 시작해야 하나요?", answer: "평소 사용하는 플랫폼에서 실제 작업을 시험하고 결과 품질, 연결 노력, 권한, 접근 철회 방법을 비교하세요." }],
  },
};
