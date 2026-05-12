import React from "react";
import { ImageResponse } from "next/og";

const size = {
  width: 1200,
  height: 630,
};

function cleanText(value: string | undefined, fallback: string, maxLength: number): string {
  const normalized = value?.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return fallback;
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1).trimEnd()}...` : normalized;
}

export function defaultOgImagePath({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): string {
  const params = new URLSearchParams({
    title: cleanText(title, "MCP App Store", 90),
    description: cleanText(description, "Discover MCP apps, ChatGPT apps, Claude connectors, and MCP servers.", 180),
    path,
  });

  return `/api/og?${params.toString()}`;
}

export function ogImageResponse({
  title,
  description,
  eyebrow = "MCP App Store",
  footer = "mcpapp.net",
  metrics = [],
}: {
  title: string;
  description: string;
  eyebrow?: string;
  footer?: string;
  metrics?: string[];
}): ImageResponse {
  const safeTitle = cleanText(title, "MCP App Store", 92);
  const safeDescription = cleanText(description, "Discover MCP apps, ChatGPT apps, Claude connectors, and MCP servers.", 190);
  const safeEyebrow = cleanText(eyebrow, "MCP App Store", 56);
  const safeFooter = cleanText(footer, "mcpapp.net", 96);
  const safeMetrics = metrics.map((item) => cleanText(item, "", 52)).filter(Boolean).slice(0, 3);

  const response = new ImageResponse(
    React.createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f7f1e5",
          color: "#2f2419",
          padding: 42,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            border: "2px solid #2f2419",
            borderRadius: 36,
            background: "#fffdf6",
            padding: "48px 56px",
          },
        },
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            },
          },
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 16,
                fontSize: 28,
                fontWeight: 700,
              },
            },
            React.createElement("div", {
              style: {
                width: 44,
                height: 44,
                borderRadius: 14,
                background: "#2f2419",
              },
            }),
            safeEyebrow,
          ),
          React.createElement(
            "div",
            {
              style: {
                border: "1px solid #c6b69d",
                borderRadius: 999,
                color: "#6d5a47",
                fontSize: 24,
                padding: "12px 18px",
              },
            },
            "mcpapp.net",
          ),
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: 26,
            },
          },
          React.createElement(
            "div",
            {
              style: {
                fontSize: safeTitle.length > 56 ? 66 : 78,
                fontWeight: 800,
                letterSpacing: 0,
                lineHeight: 1.02,
              },
            },
            safeTitle,
          ),
          React.createElement(
            "div",
            {
              style: {
                color: "#5b4a39",
                fontSize: 34,
                lineHeight: 1.25,
                maxWidth: 980,
              },
            },
            safeDescription,
          ),
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 24,
            },
          },
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                gap: 12,
              },
            },
            ...(safeMetrics.length ? safeMetrics : ["ChatGPT apps", "Claude connectors", "MCP servers"]).map((item) =>
              React.createElement(
                "div",
                {
                  key: item,
                  style: {
                    border: "1px solid #d9cbb7",
                    borderRadius: 999,
                    color: "#4c3b2a",
                    fontSize: 22,
                    fontWeight: 650,
                    padding: "10px 16px",
                  },
                },
                item,
              ),
            ),
          ),
          React.createElement(
            "div",
            {
              style: {
                color: "#6d5a47",
                fontSize: 24,
              },
            },
            safeFooter,
          ),
        ),
      ),
    ),
    size,
  );

  response.headers.set("cache-control", "public, max-age=3600, s-maxage=86400");
  return response;
}
