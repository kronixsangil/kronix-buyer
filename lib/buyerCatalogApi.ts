// lib/buyerCatalogApi.ts
"use client";

import { apiFetch } from "./api";

export type ApiStoreTheme = {
  id: string;
  code: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  pageBg: string;
  textPrimary: string;
  textSecondary: string;
  headerBg: string;
  headerTextColor: string;
  headerLogoUrl?: string | null;
  bottomNavBg: string;
  bottomNavActiveColor: string;
  bottomNavInactiveColor: string;
  cardBg: string;
  cardTextColor: string;
  cardRadius: number;
  buttonBg: string;
  buttonTextColor: string;
  badgeBg: string;
  badgeTextColor: string;
  inputBg: string;
  inputBorder: string;
  gradientFrom?: string | null;
  gradientTo?: string | null;
  splashLogoUrl?: string | null;
  tokens?: any;
};

export type ApiPublicStore = {
  id: string;
  storeCode: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string;
  description: string;
  etaMin: number;
  etaMax: number;
  image: string | null;
  image2: string | null;
  image3: string | null;
  image4: string | null;
  isBuyerRecommended: boolean;
  buyerRecommendedOrder: number | null;
  buyerCardTitleOverride: string | null;
  buyerCardSubtitleOverride: string | null;
  buyerCardBadgeText: string | null;
  buyerCardDistanceText: string | null;
  buyerCardRatingText: string | null;
  buyerCardStickerEmoji: string | null;
  buyerCardImageOrder: string | null;
  rating?: number;
  ratingCount?: number;

  themeId?: string | null;
  useCustomTheme?: boolean;
  customThemeJson?: any;
  theme?: ApiStoreTheme | null;
};

export type ApiPublicProduct = {
  id: string;
  storeId: string;
  externalId: string;
  name: string;
  description: string | null;
  info: string | null;
  priceCOP: number;
  image: string | null;
  isActive?: boolean;
  isAvailable: boolean;
  sortOrder?: number;
  category?: string | null;
  categoryOrder?: number;
  displayOrder?: number;
  isRecommended?: boolean;
};

export type ApiBuyerCategory = {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
  sortOrder: number;
  matchTerms: string | null;
};

export type ApiBuyerHomeBanner = {
  id: string;
  key: string;
  title: string;
  subtitle: string | null;
  ctaText: string | null;
  emoji: string | null;
  imageUrl: string | null;
  bgMode: "GRADIENT" | "IMAGE";
  bgFromColor: string;
  bgToColor: string;
  textColor: string;
  overlayColor: string | null;
  overlayOpacity: number | null;
  ctaBgColor: string | null;
  ctaTextColor: string | null;
  fontFamily: string | null;
  minHeight: number | null;
  borderRadius: number | null;
  paddingX: number | null;
  paddingY: number | null;
  contentAlign: "LEFT" | "CENTER";
  mediaPosition: "LEFT" | "RIGHT";
  showCta: boolean;
  showEmoji: boolean;
  showImage: boolean;
  titleFontSize: number | null;
  subtitleFontSize: number | null;
  ctaFontSize: number | null;
  emojiSize: number | null;
  imageWidth: number | null;
  imageHeight: number | null;
  animation: "NONE" | "PULSE" | "FLOAT";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
} | null;

export type ApiBuyerHomeConfig = {
  id: string;
  key: string;
  homeBgMode: "SOLID" | "GRADIENT";
  homeBgColor: string;
  homeBgColor2: string | null;
  showRecommended: boolean;
  recommendedTitle: string;
  recommendedMax: number;
  storeCardLayout: "FEATURED" | "COMPACT";
  storeCardShowName: boolean;
  storeCardShowDescription: boolean;
  storeCardShowCategory: boolean;
  storeCardShowRating: boolean;
  storeCardShowDistance: boolean;
  storeCardShowEta: boolean;
  storeCardShowSticker: boolean;
  storeCardShowExtraImages: boolean;
  storeCardExtraImagesCount: number;
  storeCardShowBadge: boolean;
  storeCardCornerRadius: number;
  storeCardImageWidth: number;
  storeCardImageHeight: number;
  storeCardTitleFontSize: number;
  storeCardSubtitleFontSize: number;
  storeCardMetaFontSize: number;
  telEnabled: boolean;
  telShowMessage: boolean;
  telMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiBuyerHomeResponse = {
  categories: ApiBuyerCategory[];
  banner: ApiBuyerHomeBanner;
  config: ApiBuyerHomeConfig;
  stores: ApiPublicStore[];
  city?: {
    id: string;
    slug: string;
    name: string;
    department: string;
    country: string;
  } | null;
};

export type StoreReviewsResponse = {
  storeId: string;
  storeCode: string;
  rating: number;
  ratingCount: number;
  reviews: Array<{
    id: string;
    name: string;
    text: string;
    stars: number;
    badgeText?: string | null;
    isDefault?: boolean;
    createdAt?: string | null;
  }>;
};

function withCitySlug(
  path: string,
  citySlug?: string,
  extra?: Record<string, string | number | undefined | null>
) {
  const sp = new URLSearchParams();

  if (citySlug) sp.set("citySlug", citySlug);

  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value === undefined || value === null || value === "") continue;
      sp.set(key, String(value));
    }
  }

  const qs = sp.toString();
  return `${path}${qs ? `?${qs}` : ""}`;
}

export async function publicListStores(q?: string, citySlug?: string) {
  return apiFetch<ApiPublicStore[]>(
    withCitySlug("/public/stores", citySlug, { q }),
    {
      suppressSessionExpiredEvent: true,
    } as any
  );
}

export async function publicGetStoreByCode(storeCode: string, citySlug?: string) {
  return apiFetch<ApiPublicStore>(
    withCitySlug(`/public/stores/by-code/${encodeURIComponent(storeCode)}`, citySlug),
    {
      suppressSessionExpiredEvent: true,
    } as any
  );
}

export async function publicGetStoreReviewsByCode(storeCode: string, citySlug?: string) {
  return apiFetch<StoreReviewsResponse>(
    withCitySlug(`/public/stores/by-code/${encodeURIComponent(storeCode)}/reviews`, citySlug),
    {
      suppressSessionExpiredEvent: true,
    } as any
  );
}

export async function publicListProductsByStoreCode(storeCode: string, q?: string, citySlug?: string) {
  return apiFetch<ApiPublicProduct[]>(
    withCitySlug(`/public/stores/by-code/${encodeURIComponent(storeCode)}/products`, citySlug, { q }),
    { suppressSessionExpiredEvent: true } as any
  );
}

export async function publicListBuyerCategories(citySlug?: string) {
  return apiFetch<ApiBuyerCategory[]>(
    withCitySlug(`/public/buyer/categories`, citySlug),
    {
      suppressSessionExpiredEvent: true,
    } as any
  );
}

export type TelAvailability = {
  enabled: boolean;
  showMessage: boolean;
  message: string | null;
};

export async function publicGetTelAvailability(citySlug?: string): Promise<TelAvailability> {
  const config = await publicGetBuyerHomeConfig(citySlug);
  return {
    enabled: config.telEnabled !== false,
    showMessage: config.telShowMessage === true,
    message: String(config.telMessage ?? "").trim() || null,
  };
}

export async function publicGetBuyerHomeBanner(citySlug?: string) {
  return apiFetch<ApiBuyerHomeBanner>(
    withCitySlug(`/public/buyer/banner`, citySlug),
    {
      suppressSessionExpiredEvent: true,
    } as any
  );
}

export async function publicGetBuyerHomeConfig(citySlug?: string) {
  return apiFetch<ApiBuyerHomeConfig>(
    withCitySlug(`/public/buyer/home-config`, citySlug),
    {
      suppressSessionExpiredEvent: true,
    } as any
  );
}

export async function publicGetBuyerHome(citySlug?: string) {
  return apiFetch<ApiBuyerHomeResponse>(
    withCitySlug(`/public/buyer/home`, citySlug),
    {
      suppressSessionExpiredEvent: true,
    } as any
  );
}
