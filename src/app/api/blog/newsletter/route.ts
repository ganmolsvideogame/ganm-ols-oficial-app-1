import { NextResponse } from "next/server";

import {
  sendBlogNewsletterWelcome,
  syncBlogNewsletterContact,
} from "@/lib/brevo/blog";
import {
  isValidNewsletterEmail,
  upsertBlogNewsletterSubscriber,
} from "@/lib/blog/newsletter";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      locale?: string;
    };

    const email = String(body.email ?? "").trim().toLowerCase();
    const locale = body.locale === "en" ? "en" : "pt";

    if (!isValidNewsletterEmail(email)) {
      return NextResponse.json(
        {
          ok: false,
          message:
            locale === "en"
              ? "Use a valid email to join the newsletter."
              : "Use um email válido para entrar na newsletter.",
        },
        { status: 400 }
      );
    }

    await upsertBlogNewsletterSubscriber({ email, locale });

    const [contactResult, emailResult] = await Promise.allSettled([
      syncBlogNewsletterContact(email),
      sendBlogNewsletterWelcome({ email, locale }),
    ]);

    if (
      contactResult.status === "rejected" ||
      emailResult.status === "rejected"
    ) {
      console.warn("blog_newsletter_brevo_warning", {
        contact:
          contactResult.status === "rejected"
            ? contactResult.reason
            : contactResult.value,
        email:
          emailResult.status === "rejected"
            ? emailResult.reason
            : emailResult.value,
      });
    }

    return NextResponse.json({
      ok: true,
      message:
        locale === "en"
          ? "Subscription confirmed. New articles will reach you first."
          : "Inscrição confirmada. Os próximos artigos vão chegar primeiro.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Newsletter subscription failed.",
      },
      { status: 500 }
    );
  }
}
