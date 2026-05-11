import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect, redirect } from "next/navigation";

import MetaCatalogViewTracker from "@/components/analytics/MetaCatalogViewTracker";
import ListingViewTracker from "@/components/analytics/ListingViewTracker";
import PurchaseActions from "@/components/product/PurchaseActions";
import ProductGallery from "@/components/product/ProductGallery";
import ShareProductButton from "@/components/product/ShareProductButton";
import StarRatingInput from "@/components/reviews/StarRatingInput";
import ShippingQuote from "@/components/shipping/ShippingQuote";
import FavoriteButton from "@/components/social/FavoriteButton";
import FollowSellerButton from "@/components/social/FollowSellerButton";
import ProductCard from "@/components/ui/ProductCard";
import { ProductCarousel } from "@/components/ml/ProductCarousel";
import { FAMILIES } from "@/lib/mock/data";
import {
  closeExpiredAuctions,
  placeProxyBid,
  AUCTION_PAYMENT_WINDOW_DAYS,
} from "@/lib/auctions";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildMetaCatalogListingId } from "@/lib/analytics/metaCatalog";
import { buildListingPath, slugifyListingTitle } from "@/lib/listings/url";
import { createClient } from "@/lib/supabase/server";
import { buildAbsoluteUrl } from "@/lib/utils/site";
import { formatCentsToBRL, parsePriceToCents } from "@/lib/utils/price";
import { insertNotificationsWithPush } from "@/lib/push/delivery";
import {
  calculateMinBidCents,
  DEFAULT_AUCTION_INCREMENT_PERCENT,
} from "@/lib/config/commerce";

export const dynamic = "force-dynamic";

type PageParams = {
  id: string;
  slug?: string;
};

type PageSearchParams = {
  [key: string]: string | string[] | undefined;
  error?: string;
  bid_error?: string;
  bid_success?: string;
  review_error?: string;
  review_success?: string;
  qa_error?: string;
  qa_success?: string;
};

type PageProps = {
  params: PageParams | Promise<PageParams>;
  searchParams?: PageSearchParams | Promise<PageSearchParams>;
};

type ListingRow = {
  id: string;
  title: string;
  price_cents: number | null;
  condition: string | null;
  family: string | null;
  platform: string | null;
  seller_user_id: string;
  status: string | null;
  shipping_available: boolean | null;
  free_shipping: boolean | null;
  quantity_available: number | null;
  description: string | null;
  thumbnail_url: string | null;
  listing_type: string | null;
  auction_end_at: string | null;
  auction_increment_percent: number | null;
  auction_closed_at?: string | null;
  auction_winner_user_id?: string | null;
  auction_final_bid_cents?: number | null;
  auction_order_id?: string | null;
};

type ListingImageRow = {
  id: string;
  path: string;
  sort_order: number | null;
};

type BidRow = {
  id: string;
  amount_cents: number;
  created_at: string | null;
};

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string | null;
  reviewer_user_id: string;
  profiles?: { display_name: string | null }[] | null;
};

type AnswerRow = {
  id: string;
  answer: string;
  created_at: string | null;
  responder_id: string | null;
  profiles?: { display_name: string | null }[] | null;
};

type QuestionRow = {
  id: string;
  question: string;
  created_at: string | null;
  user_id: string;
  profiles?: { display_name: string | null }[] | null;
  listing_answers?: AnswerRow[] | null;
};

type RelatedListingRow = {
  id: string;
  title: string;
  price_cents: number | null;
  condition: string | null;
  family: string | null;
  platform: string | null;
  shipping_available: boolean | null;
  free_shipping: boolean | null;
  thumbnail_url: string | null;
  listing_type: string | null;
};

type MetadataListingRow = Pick<
  ListingRow,
  | "id"
  | "title"
  | "price_cents"
  | "condition"
  | "platform"
  | "description"
  | "thumbnail_url"
  | "status"
>;

function formatCondition(value: string | null) {
  if (!value) {
    return "Sem condicao";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatShipping(isAvailable: boolean | null, isFree: boolean | null) {
  if (isFree) {
    return "Frete gratis";
  }
  return isAvailable === false ? "Envio a combinar" : "Envio disponivel";
}

function formatConditionLabel(value: string | null) {
  if (!value) {
    return null;
  }
  const normalized = value.toLowerCase();
  if (["novo", "new"].includes(normalized)) {
    return "Novo";
  }
  if (["usado", "used", "seminovo", "semi-novo"].includes(normalized)) {
    return "Usado";
  }
  if (["recondicionado", "refurbished"].includes(normalized)) {
    return "Recondicionado";
  }
  return value;
}

function formatShippingLabel(
  shippingAvailable: boolean | null,
  freeShipping: boolean | null
) {
  if (freeShipping) {
    return "Frete gratis";
  }
  if (shippingAvailable) {
    return "Envio disponivel";
  }
  return null;
}

function buildMetadataDescription(listing: MetadataListingRow) {
  const cleanedDescription = listing.description?.replace(/\s+/g, " ").trim();
  if (cleanedDescription) {
    return cleanedDescription.length > 160
      ? `${cleanedDescription.slice(0, 157).trimEnd()}...`
      : cleanedDescription;
  }

  const fallbackParts = [
    listing.platform,
    formatConditionLabel(listing.condition),
    typeof listing.price_cents === "number"
      ? formatCentsToBRL(listing.price_cents)
      : null,
  ].filter(Boolean);

  const fallbackText =
    fallbackParts.length > 0
      ? `${listing.title} - ${fallbackParts.join(" - ")}.`
      : `${listing.title} na GANM OLS.`;

  return fallbackText.length > 160
    ? `${fallbackText.slice(0, 157).trimEnd()}...`
    : fallbackText;
}

function buildSearchParamsSuffix(searchParams?: PageSearchParams) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (typeof value === "string" && value) {
      params.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      value
        .filter((item) => typeof item === "string" && item)
        .forEach((item) => {
          params.append(key, item);
        });
    }
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

function formatBidDate(value: string | null) {
  if (!value) {
    return "Agora mesmo";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Agora mesmo";
  }
  return date.toLocaleString("pt-BR");
}

function formatShortDate(value: string | null) {
  if (!value) {
    return "Agora mesmo";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Agora mesmo";
  }
  return date.toLocaleDateString("pt-BR");
}

function clampRating(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(5, Math.round(value)));
}

function StarRatingDisplay({
  rating,
  size = 16,
}: {
  rating: number;
  size?: number;
}) {
  const filled = clampRating(rating);
  return (
    <div className="flex items-center gap-1 text-zinc-900">
      {Array.from({ length: 5 }).map((_, index) => {
        const active = index < filled;
        return (
          <svg
            key={`star-${index + 1}`}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={active ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.6"
            className={active ? "text-zinc-900" : "text-zinc-300"}
          >
            <path
              d="M12 2l2.9 6.1 6.7.6-5 4.3 1.5 6.6L12 16l-6.1 3.6L7.4 13l-5-4.3 6.7-.6L12 2Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </div>
  );
}

async function getListingMetadata(listingId: string) {
  const admin = createAdminClient();
  const { data: listing } = await admin
    .from("listings")
    .select(
      "id, title, price_cents, condition, platform, description, thumbnail_url, status"
    )
    .eq("id", listingId)
    .maybeSingle();

  if (!listing) {
    return null;
  }

  const { data: image } = await admin
    .from("listing_images")
    .select("path")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const imageUrl = image?.path
    ? admin.storage.from("listing-images").getPublicUrl(image.path).data.publicUrl
    : listing.thumbnail_url;

  return {
    listing: listing as MetadataListingRow,
    imageUrl: imageUrl || null,
  };
}

export async function generateMetadata({
  params,
}: {
  params: PageParams | Promise<PageParams>;
}): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const listingId = decodeURIComponent(String(resolvedParams.id ?? "").trim());

  if (!listingId) {
    return {
      title: "Produto | GANM OLS",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const metadataSource = await getListingMetadata(listingId);

  if (!metadataSource) {
    return {
      title: "Produto nao encontrado | GANM OLS",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const { listing, imageUrl } = metadataSource;
  const canonicalPath = buildListingPath(listing.id, listing.title);
  const description = buildMetadataDescription(listing);
  const shouldIndex = listing.status === "active";

  return {
    title: `${listing.title} | GANM OLS`,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    robots: shouldIndex
      ? undefined
      : {
          index: false,
          follow: false,
        },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: "GANM OLS",
      url: buildAbsoluteUrl(canonicalPath),
      title: listing.title,
      description,
      images: imageUrl
        ? [
            {
              url: imageUrl,
              alt: listing.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: listing.title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

async function placeBid(formData: FormData) {
  "use server";

  const listingId = String(formData.get("listing_id") ?? "").trim();
  const bidRaw = String(formData.get("bid_amount") ?? "").trim();
  const bidCents = parsePriceToCents(bidRaw);
  const productPath = listingId ? `/produto/${listingId}` : "/buscar";

  if (!listingId || !bidCents) {
    redirect(`${productPath}?bid_error=Informe+um+lance+valido`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/entrar?redirect_to=${encodeURIComponent(productPath)}`);
  }

  await closeExpiredAuctions();

  const { data: listing } = await supabase
    .from("listings")
    .select(
      "id, title, price_cents, listing_type, status, auction_increment_percent, auction_end_at, seller_user_id"
    )
    .eq("id", listingId)
    .maybeSingle();

  if (!listing || listing.listing_type !== "auction") {
    redirect(`${productPath}?bid_error=Lances+nao+disponiveis`);
  }

  if (listing.seller_user_id === user.id) {
    redirect(`${productPath}?bid_error=Voce+nao+pode+dar+lance+no+seu+anuncio`);
  }

  if (listing.auction_end_at) {
    const endAt = new Date(listing.auction_end_at);
    if (!Number.isNaN(endAt.getTime()) && endAt <= new Date()) {
      redirect(`${productPath}?bid_error=Lances+encerrados`);
    }
  }

  if (listing.status !== "active") {
    redirect(`${productPath}?bid_error=Lances+inativos`);
  }

  const { data: bidData, error } = await placeProxyBid(listingId, bidCents);

  if (error) {
    const message = String(error.message ?? "Nao foi possivel registrar o lance");
    const minMatch = message.match(/Lance minimo\\s+(\\d+)/i);
    if (minMatch) {
      const minCents = Number.parseInt(minMatch[1] ?? "", 10);
      const formatted = Number.isFinite(minCents)
        ? formatCentsToBRL(minCents)
        : "valor minimo";
      redirect(
        `${productPath}?bid_error=Lance+minimo+${encodeURIComponent(formatted)}`
      );
    }
    redirect(`${productPath}?bid_error=${encodeURIComponent(message)}`);
  }

  const admin = createAdminClient();
  const [{ data: bidderProfile }, { data: adminsData }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", user.id)
      .maybeSingle(),
    admin.from("admins").select("user_id").not("user_id", "is", null),
  ]);

  const bidderLabel =
    bidderProfile?.display_name || bidderProfile?.email || "Um usuario";
  const bidAmountCents =
    (bidData as { current_bid_cents?: number } | null)?.current_bid_cents ?? bidCents;

  const notifications = [
    listing.seller_user_id
      ? {
          user_id: listing.seller_user_id,
          title: "Novo lance recebido",
          body: `${bidderLabel} deu um lance de ${formatCentsToBRL(bidAmountCents)} em ${listing.title ?? "seu anuncio"}.`,
          link: `/produto/${listingId}`,
          type: "bids",
        }
      : null,
    ...(adminsData ?? []).map((row) => ({
      user_id: row.user_id as string,
      title: "Novo lance",
      body: `${bidderLabel} deu um lance de ${formatCentsToBRL(bidAmountCents)}.`,
      link: `/painel-ganm-ols/controle`,
      type: "bids",
    })),
  ].filter(
    (item): item is {
      user_id: string;
      title: string;
      body: string;
      link: string;
      type: string;
    } => Boolean(item)
  );

  if (notifications.length > 0) {
    await insertNotificationsWithPush(admin, notifications);
  }

  redirect(`${productPath}?bid_success=Lance+registrado`);
}

async function submitReview(formData: FormData) {
  "use server";

  const listingId = String(formData.get("listing_id") ?? "").trim();
  const ratingRaw = Number(formData.get("rating") ?? 0);
  const rating = clampRating(ratingRaw);
  const comment = String(formData.get("comment") ?? "").trim();
  const productPath = listingId ? `/produto/${listingId}` : "/buscar";

  if (!listingId || rating < 1 || !comment) {
    redirect(`${productPath}?review_error=Informe+uma+nota+e+comentario`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/entrar?redirect_to=${encodeURIComponent(productPath)}`);
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, seller_user_id, title")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing) {
    redirect(`${productPath}?review_error=Anuncio+nao+encontrado`);
  }

  if (listing.seller_user_id === user.id) {
    redirect(`${productPath}?review_error=Vendedores+nao+podem+avaliar`);
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("listing_id", listingId)
    .eq("buyer_user_id", user.id)
    .in("status", ["approved", "paid", "shipped", "delivered"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!order) {
    redirect(`${productPath}?review_error=Somente+compradores+podem+avaliar`);
  }

  const { error } = await supabase.from("listing_reviews").upsert(
    {
      listing_id: listingId,
      reviewer_user_id: user.id,
      order_id: order.id,
      rating,
      comment,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "listing_id,reviewer_user_id" }
  );

  if (error) {
    redirect(`${productPath}?review_error=${encodeURIComponent(error.message)}`);
  }

  const admin = createAdminClient();
  if (listing.seller_user_id && listing.seller_user_id !== user.id) {
    await insertNotificationsWithPush(admin, {
      user_id: listing.seller_user_id,
      title: "Nova avaliacao recebida",
      body: `Um comprador avaliou ${listing.title ?? "seu anuncio"}.`,
      link: `/produto/${listingId}`,
    });
  }

  redirect(`${productPath}?review_success=Avaliacao+enviada`);
}

async function submitQuestion(formData: FormData) {
  "use server";

  const listingId = String(formData.get("listing_id") ?? "").trim();
  const question = String(formData.get("question") ?? "").trim();
  const productPath = listingId ? `/produto/${listingId}` : "/buscar";

  if (!listingId || !question) {
    redirect(`${productPath}?qa_error=Informe+sua+pergunta`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/entrar?redirect_to=${encodeURIComponent(productPath)}`);
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, seller_user_id, title")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing) {
    redirect(`${productPath}?qa_error=Anuncio+nao+encontrado`);
  }

  const { error } = await supabase.from("listing_questions").insert({
    listing_id: listingId,
    user_id: user.id,
    question,
  });

  if (error) {
    redirect(`${productPath}?qa_error=${encodeURIComponent(error.message)}`);
  }

  const admin = createAdminClient();
  if (listing.seller_user_id && listing.seller_user_id !== user.id) {
    await insertNotificationsWithPush(admin, {
      user_id: listing.seller_user_id,
      title: "Nova pergunta recebida",
      body: `Pergunta no anuncio ${listing.title ?? ""}.`,
      link: `/produto/${listingId}`,
    });
  }

  redirect(`${productPath}?qa_success=Pergunta+enviada`);
}

async function submitAnswer(formData: FormData) {
  "use server";

  const questionId = String(formData.get("question_id") ?? "").trim();
  const listingId = String(formData.get("listing_id") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  const productPath = listingId ? `/produto/${listingId}` : "/buscar";

  if (!questionId || !listingId || !answer) {
    redirect(`${productPath}?qa_error=Resposta+invalida`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/entrar?redirect_to=${encodeURIComponent(productPath)}`);
  }

  const { data: question } = await supabase
    .from("listing_questions")
    .select("id, user_id, listing_id, listings(seller_user_id, title)")
    .eq("id", questionId)
    .maybeSingle();

  if (!question || question.listing_id !== listingId) {
    redirect(`${productPath}?qa_error=Pergunta+nao+encontrada`);
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  const sellerId = question.listings?.[0]?.seller_user_id ?? null;
  const isSeller = sellerId && sellerId === user.id;

  if (!isSeller && isAdmin !== true) {
    redirect(`${productPath}?qa_error=Sem+permissao+para+responder`);
  }

  const { error } = await supabase.from("listing_answers").insert({
    question_id: questionId,
    responder_id: user.id,
    answer,
  });

  if (error) {
    redirect(`${productPath}?qa_error=${encodeURIComponent(error.message)}`);
  }

  const admin = createAdminClient();
  if (question.user_id && question.user_id !== user.id) {
    await insertNotificationsWithPush(admin, {
      user_id: question.user_id,
      title: "Sua pergunta foi respondida",
      body: `Resposta no anuncio ${question.listings?.[0]?.title ?? ""}.`,
      link: `/produto/${listingId}`,
    });
  }

  redirect(`${productPath}?qa_success=Resposta+enviada`);
}

export default async function Page({ params, searchParams }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await closeExpiredAuctions();
  const listingId = decodeURIComponent(String(resolvedParams.id ?? "").trim());
  const errorMessage = resolvedSearchParams?.error
    ? String(resolvedSearchParams.error)
    : "";
  const bidErrorMessage = resolvedSearchParams?.bid_error
    ? String(resolvedSearchParams.bid_error)
    : "";
  const bidSuccessMessage = resolvedSearchParams?.bid_success
    ? String(resolvedSearchParams.bid_success)
    : "";
  const reviewErrorMessage = resolvedSearchParams?.review_error
    ? String(resolvedSearchParams.review_error)
    : "";
  const reviewSuccessMessage = resolvedSearchParams?.review_success
    ? String(resolvedSearchParams.review_success)
    : "";
  const qaErrorMessage = resolvedSearchParams?.qa_error
    ? String(resolvedSearchParams.qa_error)
    : "";
  const qaSuccessMessage = resolvedSearchParams?.qa_success
    ? String(resolvedSearchParams.qa_success)
    : "";
  const familyLabelBySlug = Object.fromEntries(
    FAMILIES.map((family) => [family.slug, family.name])
  );

  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, title, price_cents, condition, family, platform, seller_user_id, status, shipping_available, free_shipping, quantity_available, description, thumbnail_url, listing_type, auction_end_at, auction_increment_percent, auction_closed_at, auction_winner_user_id, auction_final_bid_cents, auction_order_id"
    )
    .eq("id", listingId)
    .maybeSingle();

  const listing = data as ListingRow | null;

  if (error) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Erro ao carregar anuncio
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            {error.message}
          </p>
        </div>
        <Link
          href="/buscar"
          className="inline-flex rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
        >
          Voltar para buscar
        </Link>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Produto nao encontrado
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Este anuncio nao esta mais disponivel ou foi removido.
            {user
              ? " Se voce for o vendedor, verifique o status no painel."
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/buscar"
            className="inline-flex rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
          >
            Voltar para buscar
          </Link>
          {user ? (
            <Link
              href="/vender"
              className="inline-flex rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
            >
              Ir ao painel vendedor
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  const requestedSlug = String(resolvedParams.slug ?? "").trim().toLowerCase();
  const expectedSlug = slugifyListingTitle(listing.title);
  const productPath = buildListingPath(listing.id, listing.title);

  if (requestedSlug !== expectedSlug) {
    permanentRedirect(`${productPath}${buildSearchParamsSuffix(resolvedSearchParams)}`);
  }

  const productUrl = buildAbsoluteUrl(productPath);

  const { data: sellerData } = await supabase
    .from("profiles")
    .select("display_name, city, state")
    .eq("id", listing.seller_user_id)
    .maybeSingle();

  const sellerName =
    sellerData?.display_name?.trim() || "Vendedor verificado";
  const sellerLocation =
    sellerData?.city || sellerData?.state
      ? `${sellerData?.city ?? ""} ${sellerData?.state ?? ""}`.trim()
      : "Localizacao nao informada";

  const { data: imagesData } = await supabase
    .from("listing_images")
    .select("id, path, sort_order")
    .eq("listing_id", listing.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const images = (imagesData ?? []) as ListingImageRow[];
  const imageUrls = images.map((image) => ({
    id: image.id,
    url: supabase.storage.from("listing-images").getPublicUrl(image.path).data
      .publicUrl,
  }));

  const isAuction = listing.listing_type === "auction";
  const availableQuantity =
    typeof listing.quantity_available === "number" ? listing.quantity_available : 1;
  const isAvailable = listing.status === "active" && availableQuantity > 0;
  const { data: bidsData } = isAuction
    ? await supabase
        .from("bids")
        .select("id, amount_cents, created_at")
        .eq("listing_id", listing.id)
        .order("amount_cents", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5)
    : { data: [] };

  const bids = (bidsData ?? []) as BidRow[];
  const highestBid = bids[0];
  const incrementPercent =
    typeof listing.auction_increment_percent === "number"
      ? listing.auction_increment_percent
      : DEFAULT_AUCTION_INCREMENT_PERCENT;
  const auctionClosedAtDate = listing.auction_closed_at
    ? new Date(listing.auction_closed_at)
    : null;
  const hasAuctionClosed =
    auctionClosedAtDate && !Number.isNaN(auctionClosedAtDate.getTime())
      ? auctionClosedAtDate <= new Date()
      : false;
  const minBidCents = calculateMinBidCents(
    highestBid?.amount_cents ?? listing.price_cents ?? 0,
    incrementPercent
  );
  const auctionEndsAt = listing.auction_end_at
    ? new Date(listing.auction_end_at)
    : null;
  const isAuctionEnded =
    auctionEndsAt && !Number.isNaN(auctionEndsAt.getTime())
      ? auctionEndsAt <= new Date()
      : false;
  const isAuctionClosed =
    Boolean(hasAuctionClosed) || isAuctionEnded || listing.status !== "active";
  const currentBidCents = isAuctionClosed
    ? listing.auction_final_bid_cents ??
      highestBid?.amount_cents ??
      listing.price_cents ??
      0
    : highestBid?.amount_cents ?? listing.price_cents ?? 0;
  const isWinner = Boolean(user) && listing.auction_winner_user_id === user?.id;
  const winnerOrderId = listing.auction_order_id ?? null;
  const isSellerUser = user?.id === listing.seller_user_id;
  const canBid =
    Boolean(user) &&
    isAuction &&
    listing.status === "active" &&
    availableQuantity > 0 &&
    !isAuctionClosed &&
    !isSellerUser;

  const { data: reviewsData } = await supabase
    .from("listing_reviews")
    .select(
      "id, rating, comment, created_at, reviewer_user_id, profiles!listing_reviews_reviewer_user_id_fkey(display_name)"
    )
    .eq("listing_id", listing.id)
    .order("created_at", { ascending: false });

  const reviews = (reviewsData ?? []) as ReviewRow[];
  const reviewCount = reviews.length;
  const averageRating =
    reviewCount > 0
      ? reviews.reduce((sum, review) => sum + (review.rating ?? 0), 0) /
        reviewCount
      : 0;
  const userReview = user
    ? reviews.find((review) => review.reviewer_user_id === user.id)
    : null;

  const { data: questionsData } = await supabase
    .from("listing_questions")
    .select(
      "id, question, created_at, user_id, profiles!listing_questions_user_id_fkey(display_name), listing_answers(id, answer, created_at, responder_id, profiles!listing_answers_responder_id_fkey(display_name))"
    )
    .eq("listing_id", listing.id)
    .order("created_at", { ascending: false });

  const questions = (questionsData ?? []) as QuestionRow[];
  const normalizedQuestions = questions.map((question) => ({
    ...question,
    listing_answers: [...(question.listing_answers ?? [])].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return aTime - bTime;
    }),
  }));

  const { data: purchaseOrder } = user
    ? await supabase
        .from("orders")
        .select("id, status")
        .eq("listing_id", listing.id)
        .eq("buyer_user_id", user.id)
        .in("status", ["approved", "paid", "shipped", "delivered"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const canReview = Boolean(purchaseOrder) && !isSellerUser;
  const { data: isAdmin } = user ? await supabase.rpc("is_admin") : { data: false };
  const canAnswer = Boolean(user) && (isSellerUser || isAdmin === true);

  const admin = createAdminClient();

  const [{ data: favoriteRow }, followsCountResult, { data: listingViewsRows }] = await Promise.all([
    user
      ? supabase
          .from("listing_favorites")
          .select("id")
          .eq("listing_id", listing.id)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    admin
      .from("seller_follows")
      .select("id", { count: "exact", head: true })
      .eq("seller_user_id", listing.seller_user_id),
    admin
      .from("analytics_events")
      .select("listing_id")
      .eq("event_type", "listing_view")
      .eq("listing_id", listing.id),
  ]);

  const initialIsFavorite = Boolean((favoriteRow as { id?: string } | null)?.id);
  const followerCount =
    typeof followsCountResult.count === "number" ? followsCountResult.count : 0;
  const viewCount = (listingViewsRows ?? []).length;

  const relatedFilterFamily = listing.family ?? null;
  const relatedFilterPlatform = listing.platform ?? null;

  const relatedQuery = admin
    .from("listings_with_boost")
    .select(
      "id, title, price_cents, condition, family, platform, shipping_available, free_shipping, thumbnail_url, listing_type"
    )
    .eq("status", "active")
    .or("moderation_status.eq.approved,moderation_status.eq.pending,moderation_status.is.null")
    .order("boost_priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(18);

  if (relatedFilterFamily) {
    relatedQuery.eq("family", relatedFilterFamily);
  } else if (relatedFilterPlatform) {
    relatedQuery.eq("platform", relatedFilterPlatform);
  }

  const { data: relatedData } =
    relatedFilterFamily || relatedFilterPlatform ? await relatedQuery : { data: [] };

  const relatedListings = (relatedData ?? [])
    .filter((row) => row && (row as RelatedListingRow).id !== listing.id)
    .slice(0, 12) as RelatedListingRow[];

  return (
    <div className="space-y-8 overflow-x-hidden">
      <ListingViewTracker listingId={listing.id} />
      <MetaCatalogViewTracker
        catalogId={buildMetaCatalogListingId(listing.id)}
        title={listing.title}
        priceCents={listing.price_cents}
        category={
          familyLabelBySlug[listing.family ?? ""] ??
          listing.platform ??
          listing.family ??
          "Marketplace"
        }
        brand={listing.platform ?? listing.family ?? "GANM OLS"}
      />
      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}
      {bidErrorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {bidErrorMessage}
        </div>
      ) : null}
      {bidSuccessMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {bidSuccessMessage}
        </div>
      ) : null}
      {reviewErrorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {reviewErrorMessage}
        </div>
      ) : null}
      {reviewSuccessMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {reviewSuccessMessage}
        </div>
      ) : null}
      {qaErrorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {qaErrorMessage}
        </div>
      ) : null}
      {qaSuccessMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {qaSuccessMessage}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/buscar" className="font-semibold hover:text-zinc-800">
            Voltar
          </Link>
          <span>/</span>
          <Link href="/categorias" className="hover:text-zinc-800">
            Categorias
          </Link>
          {listing.family ? (
            <>
              <span>/</span>
              <Link href={`/marca/${listing.family}`} className="hover:text-zinc-800">
                {familyLabelBySlug[listing.family] ?? listing.family}
              </Link>
            </>
          ) : null}
        </div>
        <FavoriteButton listingId={listing.id} initialIsFavorite={initialIsFavorite} compact />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-6">
          <ProductGallery
            title={listing.title}
            images={imageUrls}
            fallbackUrl={listing.thumbnail_url}
          />

          {relatedListings.length > 0 ? (
            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-zinc-900">
                  Produtos relacionados
                </h2>
                <span className="text-xs text-zinc-500">Sugestoes</span>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 md:hidden">
                {relatedListings.slice(0, 4).map((item) => (
                  <ProductCard
                    key={item.id}
                    href={buildListingPath(item.id, item.title)}
                    title={item.title}
                    priceCents={item.price_cents}
                    thumbnailUrl={item.thumbnail_url}
                    badge={item.listing_type === "auction" ? "Lance" : undefined}
                    platformLabel={
                      item.platform ||
                      familyLabelBySlug[item.family ?? ""] ||
                      "Plataforma"
                    }
                    conditionLabel={formatConditionLabel(item.condition)}
                    shippingLabel={formatShippingLabel(
                      item.shipping_available,
                      item.free_shipping
                    )}
                  />
                ))}
              </div>
              <div className="mt-4 hidden min-w-0 md:block">
                <ProductCarousel>
                  {relatedListings.map((item) => (
                    <div key={item.id} className="ml-rail-item">
                      <ProductCard
                        href={buildListingPath(item.id, item.title)}
                        title={item.title}
                        priceCents={item.price_cents}
                        thumbnailUrl={item.thumbnail_url}
                        badge={item.listing_type === "auction" ? "Lance" : undefined}
                        platformLabel={
                          item.platform ||
                          familyLabelBySlug[item.family ?? ""] ||
                          "Plataforma"
                        }
                        conditionLabel={formatConditionLabel(item.condition)}
                        shippingLabel={formatShippingLabel(
                          item.shipping_available,
                          item.free_shipping
                        )}
                      />
                    </div>
                  ))}
                </ProductCarousel>
              </div>
            </section>
          ) : null}

          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">
              Caracteristicas do produto
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {[
                { label: "Estado", value: formatCondition(listing.condition) },
                {
                  label: "Envio",
                  value: formatShipping(listing.shipping_available, listing.free_shipping),
                },
                {
                  label: "Quantidade",
                  value: String(listing.quantity_available ?? 1),
                },
                {
                  label: "Plataforma",
                  value:
                    familyLabelBySlug[listing.family ?? ""] ??
                    listing.platform ??
                    "Nao informado",
                },
              ].map((info) => (
                <div
                  key={info.label}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    {info.label}
                  </p>
                  <p className="mt-2 text-base font-semibold text-zinc-900">
                    {info.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">Descricao</h2>
            <p className="mt-3 break-words whitespace-pre-line text-sm text-zinc-600">
              {listing.description || "Sem descricao informada."}
            </p>
          </section>
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  {familyLabelBySlug[listing.family ?? ""] ?? listing.family ?? "Plataforma"}
                </p>
                <h1 className="break-words text-2xl font-semibold text-zinc-900">
                  {listing.title}
                </h1>
                <p className="break-words text-sm text-zinc-600">
                  {formatCondition(listing.condition)} -{" "}
                  {formatShipping(listing.shipping_available, listing.free_shipping)}
                </p>
              </div>
              <FavoriteButton listingId={listing.id} initialIsFavorite={initialIsFavorite} />
            </div>

            <div className="mt-4 text-3xl font-semibold text-zinc-900">
              {formatCentsToBRL(listing.price_cents ?? 0)}
            </div>

            <div className="mt-4">
              <ShippingQuote
                listingId={listing.id}
                listingPriceCents={listing.price_cents ?? 0}
                shippingAvailable={listing.shipping_available !== false}
                freeShipping={Boolean(listing.free_shipping)}
              />
            </div>

            <div className="mt-4">
              <ShareProductButton title={listing.title} url={productUrl} />
            </div>

            <div className="mt-4 space-y-2 text-sm text-zinc-600">
              {availableQuantity <= 0 ? (
                <p className="text-xs text-rose-600">Sem estoque.</p>
              ) : null}
              {listing.status && listing.status !== "active" ? (
                <p className="text-xs text-amber-600">
                  Status atual: {listing.status}.
                </p>
              ) : null}
            </div>

            <div className="mt-5">
              {isAuction ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                      Painel de lances
                    </p>
                    <div className="mt-3 space-y-2">
                      <p>
                        Lance atual:{" "}
                        <span className="font-semibold text-zinc-900">
                          {formatCentsToBRL(currentBidCents)}
                        </span>
                      </p>
                      {!isAuctionClosed ? (
                        <p>
                          Lance minimo:{" "}
                          <span className="font-semibold text-zinc-900">
                            {formatCentsToBRL(minBidCents)}
                          </span>
                        </p>
                      ) : null}
                      <p>
                        Encerra em:{" "}
                        <span className="font-semibold text-zinc-900">
                          {auctionEndsAt
                            ? auctionEndsAt.toLocaleString("pt-BR")
                            : "Sem data definida"}
                        </span>
                      </p>
                      {isAuctionClosed ? (
                        <p className="text-xs text-zinc-500">
                          Lances encerrados. O maior lance valido venceu.
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {!isAuctionClosed ? (
                    <form action={placeBid} className="space-y-3">
                      <input type="hidden" name="listing_id" value={listing.id} />
                      <label className="flex flex-col gap-2 text-sm text-zinc-700">
                        Seu lance maximo
                        <input
                          className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                          name="bid_amount"
                          placeholder={`Minimo ${formatCentsToBRL(minBidCents)}`}
                          required
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={!canBid}
                        className="w-full rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
                      >
                        Dar lance
                      </button>
                      <p className="text-xs text-zinc-500">
                        Informe o teto. O sistema cobre automaticamente ate esse valor.
                      </p>
                    </form>
                  ) : null}
                  {isAuctionClosed && isWinner && winnerOrderId ? (
                    <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                      <p className="font-semibold">Voce venceu este lance.</p>
                      <p>
                        Finalize o pagamento em ate {AUCTION_PAYMENT_WINDOW_DAYS} dias.
                      </p>
                      <Link
                        href={`/checkout/lances?order_id=${winnerOrderId}`}
                        className="inline-flex rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white"
                      >
                        Pagar agora
                      </Link>
                    </div>
                  ) : null}
                  {!user ? (
                    <Link
                      href={`/entrar?redirect_to=${encodeURIComponent(productPath)}`}
                      className="inline-flex rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
                    >
                      Entrar para dar lance
                    </Link>
                  ) : null}
                </div>
              ) : (
                <PurchaseActions
                  listingId={listing.id}
                  disabled={!isAvailable}
                  layout="stack"
                  metaProduct={{
                    catalogId: buildMetaCatalogListingId(listing.id),
                    title: listing.title,
                    priceCents: listing.price_cents,
                    category:
                      familyLabelBySlug[listing.family ?? ""] ??
                      listing.platform ??
                      listing.family ??
                      "Marketplace",
                    brand: listing.platform ?? listing.family ?? "GANM OLS",
                  }}
                />
              )}
            </div>

            <Link href="/buscar" className="mt-4 inline-flex text-sm font-semibold text-zinc-600 hover:text-zinc-900">
              Ver produtos similares
            </Link>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Vendido por
            </p>
            <p className="mt-2 text-base font-semibold text-zinc-900">
              {sellerName}
            </p>
            <p className="text-xs text-zinc-500">{sellerLocation}</p>

            <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
              <StarRatingDisplay rating={averageRating} size={14} />
              <span className="rounded-full border border-zinc-200 px-2 py-1">
                {reviewCount > 0 ? `${averageRating.toFixed(1)}/5` : "Sem avaliacoes"}
              </span>
              <span className="rounded-full border border-zinc-200 px-2 py-1">
                {viewCount} visualizacao{viewCount === 1 ? "" : "es"}
              </span>
              <span>
                {reviewCount} avaliacao{reviewCount === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <FollowSellerButton sellerUserId={listing.seller_user_id} initialCount={followerCount} />
              <Link
                href={`/lojas/${listing.seller_user_id}`}
                className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
              >
                Ver loja
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {isAuction ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">
              Ultimos lances
            </h2>
            <span className="text-xs text-zinc-500">
              Incremento: {incrementPercent}%
            </span>
          </div>
          {bids.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-500">
              Nenhum lance ainda. Seja o primeiro.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {bids.map((bid) => (
                <div
                  key={bid.id}
                  className="rounded-3xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Lance
                  </p>
                  <p className="mt-2 text-lg font-semibold text-zinc-900">
                    {formatCentsToBRL(bid.amount_cents)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatBidDate(bid.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Avaliacoes</h2>
            <p className="text-xs text-zinc-500">
              {reviewCount} avaliacao{reviewCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <StarRatingDisplay rating={averageRating} size={18} />
            <span>
              {reviewCount > 0
                ? `Media ${averageRating.toFixed(1)}/5`
                : "Sem media ainda"}
            </span>
          </div>
        </div>
        {user ? (
          canReview ? (
            <form
              action={submitReview}
              className="rounded-3xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600 shadow-sm"
            >
              <input type="hidden" name="listing_id" value={listing.id} />
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Sua avaliacao
                  </p>
                  <div className="mt-2">
                    <StarRatingInput
                      name="rating"
                      defaultValue={userReview?.rating ?? 0}
                    />
                  </div>
                </div>
                <textarea
                  name="comment"
                  required
                  defaultValue={userReview?.comment ?? ""}
                  placeholder="Conte sua experiencia com o vendedor."
                  className="min-h-[110px] w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white"
                >
                  {userReview ? "Atualizar avaliacao" : "Enviar avaliacao"}
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-500">
              Somente compradores podem avaliar este anuncio.
            </div>
          )
        ) : (
          <Link
            href={`/entrar?redirect_to=${encodeURIComponent(productPath)}`}
            className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-500"
          >
            Entre para avaliar este produto.
          </Link>
        )}
        {reviews.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-500">
            Nenhuma avaliacao ainda.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-3xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    {review.profiles?.[0]?.display_name?.trim() || "Comprador"}
                  </p>
                  <span className="text-xs text-zinc-400">
                    {formatShortDate(review.created_at)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <StarRatingDisplay rating={review.rating} size={14} />
                  <span className="text-xs text-zinc-500">
                    {review.rating}/5
                  </span>
                </div>
                {review.comment ? (
                  <p className="mt-2 text-sm text-zinc-600">
                    {review.comment}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Perguntas e respostas
            </h2>
            <p className="text-xs text-zinc-500">
              {normalizedQuestions.length} pergunta
              {normalizedQuestions.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {user ? (
          <form
            action={submitQuestion}
            className="rounded-3xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600 shadow-sm"
          >
            <input type="hidden" name="listing_id" value={listing.id} />
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Sua pergunta
              </p>
              <textarea
                name="question"
                required
                placeholder="Tire sua duvida sobre o produto."
                className="min-h-[110px] w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
              />
              <button
                type="submit"
                className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white"
              >
                Enviar pergunta
              </button>
            </div>
          </form>
        ) : (
          <Link
            href={`/entrar?redirect_to=${encodeURIComponent(productPath)}`}
            className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-500"
          >
            Entre para enviar uma pergunta ao vendedor.
          </Link>
        )}
        {normalizedQuestions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-500">
            Nenhuma pergunta ainda.
          </div>
        ) : (
          <div className="space-y-4">
            {normalizedQuestions.map((question) => (
              <div
                key={question.id}
                className="rounded-3xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    {question.profiles?.[0]?.display_name?.trim() || "Visitante"}
                  </p>
                  <span className="text-xs text-zinc-400">
                    {formatShortDate(question.created_at)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-700">
                  {question.question}
                </p>
                {question.listing_answers &&
                question.listing_answers.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {question.listing_answers.map((answer) => (
                      <div
                        key={answer.id}
                        className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3"
                      >
                        <div className="flex items-center justify-between text-xs text-zinc-400">
                          <span>
                            {answer.profiles?.[0]?.display_name?.trim() ||
                              "Vendedor"}
                          </span>
                          <span>{formatShortDate(answer.created_at)}</span>
                        </div>
                        <p className="mt-2 text-sm text-zinc-700">
                          {answer.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-zinc-400">
                    Aguardando resposta do vendedor.
                  </p>
                )}
                {canAnswer ? (
                  <form
                    action={submitAnswer}
                    className="mt-4 rounded-2xl border border-zinc-200 bg-white p-3"
                  >
                    <input
                      type="hidden"
                      name="question_id"
                      value={question.id}
                    />
                    <input
                      type="hidden"
                      name="listing_id"
                      value={listing.id}
                    />
                    <div className="space-y-3">
                      <textarea
                        name="answer"
                        required
                        placeholder="Responder pergunta"
                        className="min-h-[90px] w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
                      />
                      <button
                        type="submit"
                        className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
                      >
                        Responder
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
