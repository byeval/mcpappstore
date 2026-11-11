import type { LearnArticle } from "./learn";
// Full editorial articles. Dates describe this text revision, not a connected-account test.
export const zhCoreArticles: Record<
  string,
  Pick<
    LearnArticle,
    "sections" | "faqs" | "sources" | "updatedAt" | "readingTime"
  >
> = {
  "what-is-an-mcp-app": {
    updatedAt: "2026-11-11",
    readingTime: "阅读约 5 分钟",
    sections: [
      {
        id: "definition",
        title: "先分清协议、服务器和应用",
        body: [
          "MCP（Model Context Protocol，模型上下文协议）是连接 AI 应用与外部工具、数据的开放标准。MCP 服务器负责提供能力，ChatGPT、Claude 或开发工具作为宿主决定用户如何使用这些能力。",
          "本站用“应用”指用户浏览的产品条目；协议中的 MCP Apps 扩展特指可在兼容宿主中显示交互界面的能力。目录中的每个条目并不都实现这个扩展。",
        ],
        bullets: [
          "服务器：公开工具的名称、输入结构与执行接口。",
          "宿主：发现工具、发起调用，并向用户呈现结果。",
          "账号与权限：决定哪些数据可以读取、哪些操作可以执行。",
        ],
      },
      {
        id: "example",
        title: "一次实际请求如何完成",
        body: [
          "以查找项目文档为例：用户提出问题，宿主选择搜索工具，服务器使用已授权账号检索文档，再把结果返回给宿主。模型据此组织回答。连接成功只说明链路可用，不能证明返回内容完整或答案正确。",
        ],
        steps: [
          "选择你已经使用的平台和文档服务。",
          "通过官方入口授权，检查工作区和权限范围。",
          "先搜索一个你知道存在的文件。",
          "打开返回链接，核对标题、内容和权限，再扩大查询范围。",
        ],
      },
      {
        id: "choose",
        title: "选择应用时看什么",
        body: [
          "先明确任务，再比较连接方式。相同服务在不同平台上的工具、UI、套餐和管理员要求可能不同。目录条目、远程 MCP 端点和可下载的本地程序也不是同一种安装入口。",
        ],
        bullets: [
          "身份：发布者是谁，官方文档是否链接到这个服务。",
          "能力：需要的搜索、读取或编辑工具是否真的被提供。",
          "接入：使用官方应用入口、远程 URL，还是本地安装命令。",
          "限制：账号、组织权限、数据范围、返回数量以及写入确认。",
        ],
      },
      {
        id: "troubleshooting",
        title: "连接后没有结果怎么办",
        body: [
          "先用相同账号在原产品中查找目标内容。如果原产品也看不到，优先处理权限或账号问题；如果原产品可见，再检查宿主是否启用了连接器、授权是否过期、查询范围是否过窄。",
          "空结果、权限拒绝、限流和工具未提供应分别记录。不要把一个失败的请求解释成整个产品不可用，也不要把模型生成的答案当成工具已实际执行。",
        ],
      },
    ],
    faqs: [
      {
        question: "所有 MCP 应用都带可视化界面吗？",
        answer:
          "不是。工具可以只返回文本或结构化数据；交互界面需要服务器和宿主共同支持。",
      },
      {
        question: "一个 MCP 服务器可以用于多个平台吗？",
        answer:
          "协议便于复用，但仍需确认各宿主支持的传输、认证和扩展能力，并分别验证实际工作流。",
      },
    ],
    sources: [
      {
        label: "MCP 官方介绍",
        url: "https://modelcontextprotocol.io/docs/getting-started/intro",
      },
      {
        label: "MCP Apps 扩展",
        url: "https://modelcontextprotocol.io/docs/extensions/apps",
      },
    ],
  },
  "build-your-first-mcp-app": {
    updatedAt: "2026-11-11",
    readingTime: "阅读约 6 分钟",
    sections: [
      {
        id: "pick-workflow",
        title: "1. 定义一个能验证的任务",
        body: [
          "先实现一个小任务，例如按项目名搜索工单并返回标题和链接。明确输入、输出、数据来源和成功条件；第一版先不加入发消息、删除或批量修改。",
          "示例验收：给定测试项目名，工具只返回当前账号可见的工单；不存在的项目返回空列表；无权限时返回明确错误。",
        ],
      },
      {
        id: "tool-contract",
        title: "2. 使用官方 SDK 定义工具",
        body: [
          "按下方官方服务器教程选择语言与当前 SDK 版本。工具描述应说明何时使用、参数含义和返回结果；在服务端验证参数并执行权限检查。",
          "下面仅展示工具输入契约，不是可直接运行的完整服务器。实际注册方式以所选 SDK 的当前文档为准。",
        ],
        code: '{"name":"search_projects","description":"Search projects visible to the current account and return titles and links","inputSchema":{"type":"object","properties":{"query":{"type":"string","minLength":1}},"required":["query"],"additionalProperties":false}}',
      },
      {
        id: "connect",
        title: "3. 选择传输和认证",
        body: [
          "本地进程可以使用 stdio；远程服务根据宿主支持情况选择 HTTP 接入。对于需要账号的远程服务，按照协议和宿主要求实现认证，不要把长期密钥写入公开示例。",
          "stdio 的标准输出用于协议消息，调试日志应写到标准错误，避免破坏通信。将测试数据与生产数据分开。",
        ],
      },
      {
        id: "verify",
        title: "4. 在检查器和目标宿主中验证",
        body: [
          "先通过检查器发现工具并调用，再在目标宿主中执行相同任务。检查器通过与宿主工作流通过是两项不同的证据。",
        ],
        steps: [
          "检查工具列表与输入结构是否符合预期。",
          "测试正确输入、空输入、越权请求、空结果与服务端超时。",
          "验证输出链接可以打开，且没有泄露不可见的数据。",
          "若加入写入能力，增加明确确认、重复请求保护和失败后的恢复路径。",
        ],
      },
      {
        id: "publish",
        title: "5. 准备可维护的发布信息",
        body: [
          "提供官方仓库、接入说明、账号要求、权限范围、限制和可复现示例。需要交互界面时再增加相应扩展，并验证目标宿主支持情况。",
          "记录核查的日期、客户端和版本。更新目录的时间不应代替测试时间；公开列出的功能也不等于每个用户都已获得权限。",
        ],
      },
    ],
    faqs: [
      {
        question: "需要先开发网页 UI 吗？",
        answer:
          "不需要。先完成一个可用的工具与完整错误处理；只有任务需要预览、选择或编辑时再加入界面。",
      },
      {
        question: "检查器成功，宿主失败怎么办？",
        answer:
          "对比 URL、传输、认证、工具结构和宿主支持范围，记录实际错误。不要把检查器结果当成跨平台兼容性证明。",
      },
    ],
    sources: [
      {
        label: "官方 MCP 服务器教程",
        url: "https://modelcontextprotocol.io/docs/develop/build-server",
      },
      {
        label: "官方 MCP SDK",
        url: "https://modelcontextprotocol.io/docs/sdk",
      },
      {
        label: "MCP Inspector",
        url: "https://modelcontextprotocol.io/docs/tools/inspector",
      },
      {
        label: "OpenAI MCP 服务器概念",
        url: "https://developers.openai.com/apps-sdk/concepts/mcp-server",
      },
    ],
  },
  "claude-connectors-for-databases": {
    updatedAt: "2026-11-11",
    readingTime: "阅读约 5 分钟",
    sections: [
      {
        id: "choose",
        title: "先确定你要查询什么",
        body: [
          "数据库连接器适合把结构、查询结果或平台管理能力提供给 Claude。先区分只读分析、开发测试和数据库管理：它们需要不同权限，也不能仅凭“支持 PostgreSQL”就认定可以互换。",
          "下面是选型方法，不是对当前账号已完成接入的承诺。具体工具与权限以连接器官方文档和你的授权结果为准。",
        ],
      },
      {
        id: "compare",
        title: "Supabase 与 Neon 怎么比较",
        body: [
          "Supabase 的 MCP 文档围绕其项目与数据库工作流提供接入方法；Neon 的文档覆盖其托管 Postgres 平台。已有数据在哪个平台，通常比目录中的总工具数量更能决定初选。",
        ],
        bullets: [
          "已有 Supabase 项目：先核对项目范围、可用工具和只读配置。",
          "已有 Neon 项目：核对项目、分支和数据库目标，避免连接错环境。",
          "使用其他数据库：检查连接器的实际引擎支持、部署位置和网络可达性。",
          "需要 BI 指标：确认拿到的是业务定义后的指标，还是原始 SQL 结果。",
        ],
      },
      {
        id: "trial",
        title: "用同一组任务做小范围试用",
        body: [
          "建议先用测试库或最小权限账号，记录每次调用对应的环境、查询与结果。",
        ],
        steps: [
          "列出一张已知表的字段，不读取整库。",
          "对一个小时间范围做聚合，并在原数据库中核对。",
          "检查空结果、无权限和查询超时是否清楚返回。",
          "确认结果截断、行数限制和时区，避免把部分结果当成全量。",
        ],
      },
      {
        id: "limits",
        title: "常见错误与边界",
        body: [
          "认证成功但看不到表，可能是项目、分支、schema 或角色权限选错。连接超时则需要检查网络路径、连接器状态和客户端支持。",
          "SQL 能执行不代表答案正确。金额口径、重复记录、时间范围和业务指标定义都需要核对。需要修改数据时，先确认目标环境和变更范围，并准备恢复方法。",
        ],
      },
    ],
    faqs: [
      {
        question: "是否应直接连接生产库？",
        answer:
          "先在测试环境或只读权限下完成可复现验证，再按实际任务决定是否扩大权限。",
      },
      {
        question: "为什么目录中有连接器但 Claude 中找不到？",
        answer:
          "目录收录、平台提供、组织允许和账号已授权是不同状态。按官方接入说明检查当前账号与宿主。",
      },
    ],
    sources: [
      {
        label: "Supabase MCP 文档",
        url: "https://supabase.com/docs/guides/ai-tools/mcp",
      },
      {
        label: "Neon MCP 文档",
        url: "https://neon.com/docs/ai/neon-mcp-server",
      },
    ],
  },
};
