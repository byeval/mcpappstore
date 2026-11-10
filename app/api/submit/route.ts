import { ZodError } from "zod";
import { SUBMISSION_RECEIPT_COOKIE } from "@/lib/browser-analytics";

import { createSubmission } from "@/lib/data";
import { defaultLocale, localizedPath, normalizeLocale, type Locale } from "@/lib/i18n";
import { enforceSubmissionRateLimit } from "@/lib/rate-limit";
import { parseSubmissionForm } from "@/lib/submit";
import { verifyTurnstile } from "@/lib/turnstile";

function clientIp(request: Request): string | undefined {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers
      .get("x-forwarded-for")
      ?.split(",")
      .map((value) => value.trim())[0]
  );
}

export async function POST(request: Request) {
  let locale: Locale = defaultLocale;
  try {
    const formData = await request.formData();
    locale = normalizeLocale(String(formData.get("locale") ?? "")) ?? defaultLocale;
    const localizedSubmitPath = localizedPath("/submit", locale);
    const { data, assets, turnstileToken } = parseSubmissionForm(formData);
    const ip = clientIp(request);

    const rateLimit = await enforceSubmissionRateLimit(ip);
    if (!rateLimit.allowed) {
      return Response.redirect(
        new URL(`${localizedSubmitPath}?error=${encodeURIComponent("Rate limit reached. Try again tomorrow.")}`, request.url),
        303,
      );
    }

    const turnstile = await verifyTurnstile(turnstileToken, ip);
    if (!turnstile.success) {
      return Response.redirect(
        new URL(`${localizedSubmitPath}?error=${encodeURIComponent(turnstile.message ?? "Captcha verification failed.")}`, request.url),
        303,
      );
    }

    const { appId } = await createSubmission(data, assets, ip);
    return new Response(null, {
      status: 303,
      headers: {
        Location: new URL(`${localizedPath("/submit/success", locale)}?id=${encodeURIComponent(appId)}`, request.url).href,
        "Set-Cookie": `${SUBMISSION_RECEIPT_COOKIE}=1; Max-Age=120; Path=/; SameSite=Lax${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof ZodError
        ? error.issues.map((issue) => issue.message).join(", ")
        : error instanceof Error
          ? error.message
          : "Submission failed.";

    return Response.redirect(new URL(`${localizedPath("/submit", locale)}?error=${encodeURIComponent(message)}`, request.url), 303);
  }
}
