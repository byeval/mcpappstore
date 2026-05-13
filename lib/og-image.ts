import React from "react";
import { ImageResponse } from "next/og";

const size = {
  width: 1200,
  height: 630,
};

const siteIconSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="base" x1="10" y1="54" x2="54" y2="10" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#7c5cff"/><stop offset="0.42" stop-color="#22d3ee"/><stop offset="0.76" stop-color="#a3e635"/><stop offset="1" stop-color="#ffe789"/></linearGradient><radialGradient id="glow" cx="47" cy="14" r="42" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff" stop-opacity="0.55"/><stop offset="0.58" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs><rect width="64" height="64" rx="16" fill="url(#base)"/><rect width="64" height="64" rx="16" fill="url(#glow)"/><rect x="2" y="2" width="60" height="60" rx="14" fill="none" stroke="#ffffff" stroke-opacity="0.72" stroke-width="3"/><path fill="#ffffff" d="M14 47V17h8.6L32 32.4 41.4 17H50v30h-8.2V30.6L34.7 42h-5.4l-7.1-11.4V47H14z"/></svg>';
const siteIconDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(siteIconSvg)}`;

function cleanText(value: string | undefined, fallback: string, maxLength: number): string {
  const normalized = value?.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return fallback;
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1).trimEnd()}...` : normalized;
}

export function defaultOgImagePath(): string {
  return "/api/og/default.png";
}

function splitMetric(metric: string): { label: string; value: string } {
  const [label, ...rest] = metric.split(":");
  const value = rest.join(":").trim();

  return value ? { label: label.trim(), value } : { label: metric, value: "" };
}

export function ogImageResponse({
  title,
  description,
  eyebrow = "Directory preview",
  footer = "mcpapp.net",
  metrics = [],
  logoUrl,
  logoAlt,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  footer?: string;
  metrics?: string[];
  logoUrl?: string;
  logoAlt?: string;
}): ImageResponse {
  const safeTitle = cleanText(title, "MCP App Store", 92);
  const safeDescription = cleanText(description, "Discover MCP apps, ChatGPT apps, Claude connectors, and MCP servers.", 190);
  const safeEyebrow = cleanText(eyebrow, "Directory preview", 56).toUpperCase();
  const safeFooter = cleanText(footer, "mcpapp.net", 96);
  const safeMetrics = metrics.map((item) => cleanText(item, "", 52)).filter(Boolean).slice(0, 3);
  const displayMetrics = safeMetrics.length ? safeMetrics : ["ChatGPT apps", "Claude connectors", "MCP servers"];
  const titleSize = logoUrl ? (safeTitle.length > 56 ? 60 : 72) : safeTitle.length > 56 ? 66 : 78;

  const response = new ImageResponse(
    React.createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#ede5d6",
          color: "#241a12",
          padding: 30,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            border: "2px solid #2a2117",
            borderRadius: 34,
            background: "linear-gradient(135deg, #fffdf7 0%, #fff8ea 58%, #eef8f4 100%)",
            overflow: "hidden",
            padding: "42px 52px 46px",
          },
        },
        React.createElement("div", {
          style: {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 10,
            background: "linear-gradient(90deg, #7c5cff 0%, #22d3ee 36%, #a3e635 70%, #ffe789 100%)",
          },
        }),
        React.createElement("div", {
          style: {
            position: "absolute",
            right: -120,
            top: -140,
            width: 420,
            height: 420,
            borderRadius: 999,
            background: "rgba(34, 211, 238, 0.18)",
          },
        }),
        React.createElement("div", {
          style: {
            position: "absolute",
            left: 126,
            bottom: -170,
            width: 520,
            height: 260,
            borderRadius: 999,
            background: "rgba(124, 92, 255, 0.12)",
          },
        }),
        React.createElement(
          "div",
          {
            style: {
              position: "relative",
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
                gap: 14,
                fontSize: 26,
                fontWeight: 700,
              },
            },
            React.createElement("img", {
              alt: "MCP App Store logo",
              height: 48,
              src: siteIconDataUri,
              style: {
                borderRadius: 12,
              },
              width: 48,
            }),
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                },
              },
              React.createElement("div", null, "MCP App Store"),
              React.createElement(
                "div",
                {
                  style: {
                    color: "#745f48",
                    fontSize: 17,
                    fontWeight: 600,
                    letterSpacing: 0,
                  },
                },
                "Apps, connectors, and MCP servers",
              ),
            ),
          ),
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                border: "1px solid #d7c7ad",
                borderRadius: 999,
                background: "rgba(255, 253, 246, 0.72)",
                color: "#5e4934",
                fontSize: 22,
                fontWeight: 650,
                padding: "10px 18px",
              },
            },
            safeFooter,
          ),
        ),
        React.createElement(
          "div",
          {
            style: {
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 42,
              paddingTop: 18,
            },
          },
          logoUrl
            ? React.createElement(
                "div",
                {
                  style: {
                    width: 214,
                    height: 214,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    border: "2px solid #ded0bb",
                    borderRadius: 48,
                    background: "#fffdf8",
                    boxShadow: "0 26px 70px rgba(47, 36, 25, 0.16)",
                    overflow: "hidden",
                  },
                },
                React.createElement("img", {
                  alt: logoAlt ?? safeTitle,
                  height: 164,
                  src: logoUrl,
                  style: {
                    borderRadius: 34,
                    objectFit: "contain",
                  },
                  width: 164,
                }),
              )
            : null,
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: 22,
                minWidth: 0,
              },
            },
            React.createElement(
              "div",
              {
                style: {
                  alignSelf: "flex-start",
                  border: "1px solid #d8cab6",
                  borderRadius: 999,
                  background: "rgba(244, 236, 220, 0.76)",
                  color: "#6a543c",
                  fontSize: 18,
                  fontWeight: 800,
                  letterSpacing: 1.1,
                  padding: "8px 14px",
                },
              },
              safeEyebrow,
            ),
            React.createElement(
              "div",
              {
                style: {
                  fontSize: titleSize,
                  fontWeight: 800,
                  letterSpacing: 0,
                  lineHeight: 0.98,
                },
              },
              safeTitle,
            ),
            React.createElement(
              "div",
              {
                style: {
                  color: "#5b4a39",
                  fontSize: 32,
                  lineHeight: 1.25,
                  maxWidth: logoUrl ? 740 : 940,
                },
              },
              safeDescription,
            ),
          ),
        ),
        React.createElement(
          "div",
          {
            style: {
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 14,
            },
          },
          ...displayMetrics.map((item) => {
            const metric = splitMetric(item);

            return React.createElement(
              "div",
              {
                key: item,
                style: {
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  border: "1px solid #dfd1bb",
                  borderRadius: 16,
                  background: "rgba(255, 253, 246, 0.72)",
                  color: "#352718",
                  fontSize: 22,
                  fontWeight: 760,
                  padding: "12px 16px",
                },
              },
              React.createElement(
                "span",
                {
                  style: {
                    color: "#80684e",
                    fontSize: 18,
                    fontWeight: 700,
                  },
                },
                metric.value ? metric.label : item,
              ),
              metric.value
                ? React.createElement(
                    "span",
                    {
                      style: {
                        color: "#2b2117",
                      },
                    },
                    metric.value,
                  )
                : null,
            );
          }),
        ),
      ),
    ),
    size,
  );

  response.headers.set("cache-control", "public, max-age=3600, s-maxage=86400");
  return response;
}
