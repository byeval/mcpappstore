declare module "next" {
  export type { Metadata, Viewport } from "vinext/shims/metadata";

  export namespace MetadataRoute {
    export type Sitemap = Array<{
      url: string;
      lastModified?: string | Date;
      changeFrequency?:
        | "always"
        | "hourly"
        | "daily"
        | "weekly"
        | "monthly"
        | "yearly"
        | "never";
      priority?: number;
      alternates?: {
        languages?: Record<string, string>;
      };
    }>;

    export type Robots = {
      rules:
        | {
            userAgent?: string | string[];
            allow?: string | string[];
            disallow?: string | string[];
            crawlDelay?: number;
          }
        | Array<{
            userAgent?: string | string[];
            allow?: string | string[];
            disallow?: string | string[];
            crawlDelay?: number;
          }>;
      sitemap?: string | string[];
      host?: string;
    };
  }
}

declare module "next/link" {
  export { default, useLinkStatus } from "vinext/shims/link";
}

declare module "next/navigation" {
  export * from "vinext/shims/navigation";
}

declare module "next/server" {
  export * from "vinext/shims/server";
}

declare module "next/cache" {
  export * from "vinext/shims/cache";
}

declare module "next/image" {
  export { default } from "vinext/shims/image";
}

declare module "next/og" {
  export * from "vinext/shims/og";
}

declare module "next/headers" {
  export * from "vinext/shims/headers";
}
