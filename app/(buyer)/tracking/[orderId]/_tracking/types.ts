//app\(buyer)\tracking\[orderId]\_tracking\types.ts
import type { Order, PaymentMethod, StoreState } from "@/components/buyer/OrdersStorage";

export type ApiOrderType = "STORE" | "COURIER";

export type ApiOrderFlowStatus =
  | "WAITING_CONFIRMATION"
  | "STORE_CONFIRMED"
  | "PAYMENT_PENDING"
  | "PAID"
  | "PREPARING"
  | "EN_ROUTE"
  | "DELIVERED"
  | "CANCELLED"
  | "PAYMENT_FAILED";

export type ApiCourierData = {
  pickupAddress?: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  pickupPlaceName?: string | null;
  pickupReference?: string | null;
  dropoffPlaceName?: string | null;
  dropoffReference?: string | null;
  senderName?: string | null;
  senderPhone?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
  packageType?: string | null;
  packageDescription?: string | null;
};

export type ApiOrder = {
  id: string;
  orderType?: ApiOrderType | null;
  courierServiceType?: string | null;
  flowStatus?: ApiOrderFlowStatus | null;
  createdAt: string;
  updatedAt: string;

  customerId: string;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  customerNote?: string | null;

  storesSubtotalCOP?: number | null;
  promoCOP?: number | null;
  serviceFeeCOP?: number | null;

  deliveryFeeCOP?: number | null;
  tipCOP?: number | null;
  totalCOP?: number | null;

  pickupAddress?: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  pickupPlaceName?: string | null;
  pickupReference?: string | null;

  dropoffPlaceName?: string | null;
  dropoffReference?: string | null;

  senderName?: string | null;
  senderPhone?: string | null;

  receiverName?: string | null;
  receiverPhone?: string | null;

  packageType?: string | null;
  packageDescription?: string | null;

  pickups?: Array<{
    sequence: number;
    pickupAddress: string;
    pickupLat: number;
    pickupLng: number;
    store?: { name: string } | null;
    storeId: string;
    storeConfirmedAt?: string | null;
    storeRejectedAt?: string | null;
    rejectReason?: string | null;
  }>;

  items?: Array<{
    id: string;
    productId?: string | null;
    storeId: string;
    name: string;
    priceCOP: number;
    qty: number;
    image?: string | null;
  }>;

  paymentStatus?: "PENDING" | "PAID" | "FAILED" | null;
  paymentReference?: string | null;
  paidAt?: string | null;
  status?: string | null;
};

export type ApiTrackingSnapshot = {
  orderId: string;
  orderType?: ApiOrderType | null;
  courierServiceType?: string | null;
  status?: string | null;
  flowStatus?: ApiOrderFlowStatus | null;
  paymentStatus?: "PENDING" | "PAID" | "FAILED" | null;
  updatedAt: string | Date;

  totals: {
    storesSubtotalCOP: number;
    promoCOP: number;
    serviceFeeCOP: number;
    deliveryFeeCOP: number;
    tipCOP: number;
    totalCOP: number;
  };

  customer: {
    address: string;
    lat: number | null;
    lng: number | null;
    note?: string | null;
  };

  pickups: Array<{
    sequence: number;
    storeCode: string;
    storeName: string;
    address: string;
    lat: number | null;
    lng: number | null;
    confirmedAt: string | null;
    rejectedAt: string | null;
    rejectReason?: string | null;
  }>;

  courier?: ApiCourierData | null;

  driver: {
    location: { lat: number; lng: number } | null;
    profile?: {
      id: string;
      name: string;
      phone: string | null;
      profileImageUrl?: string | null;
      vehicle?: { brand: string | null; plate: string | null } | null;
      rewards?: {
        tierCode: string | null;
        tierName: string | null;
        badgeLabel: string | null;
        badgeImageUrl: string | null;
        currentPoints: number;
        currentMonthPoints: number;
        currentMonthDeliveries: number;
        reliabilityPercent: number;
        averageRating: number;
        isPioneer: boolean;
      } | null;
    } | null;
  };
};

export type ApiOrderReviewsResponse = {
  ok?: boolean;
  driverRating?: {
    id: string;
    orderId: string;
    customerId: string;
    driverId: string;
    rating: number;
    comment?: string | null;
    createdAt: string;
  } | null;
  storeRatings?: Array<{
    id: string;
    orderId: string;
    storeId: string;
    storeName: string;
    rating: number;
    comment?: string | null;
    createdAt: string;
  }>;
};

export type StoreReviewDraft = {
  storeId: string;
  storeName: string;
  stars: number;
  comment: string;
  isCommentOpen: boolean;
};

export type BuyerNotifyState = {
  lastFlow?: ApiOrderFlowStatus | null;
  driverAssigned?: boolean;
};

export type PositiveStep = {
  key: ApiOrderFlowStatus;
  label: string;
  hint: string;
};

export type TrackingMapData = {
  hasCustomer: boolean;
  hasDriver: boolean;
  customer: { lat: number; lng: number } | null;
  driver: { lat: number; lng: number } | null;
  embedUrl: string | null;
  openUrl: string | null;
};

export type TrackingViewModel = {
  CARD: string;
  CARD_PAD: string;
  CARD_PAD_SM: string;
  router: any;
  orderId: string;
  invalidOrderId: boolean;

  order: Order | null;
  tracking: ApiTrackingSnapshot | null;
  loadErr: string | null;

  showAuthModal: boolean;
  setShowAuthModal: (v: boolean) => void;
  authNext: string;

  paying: boolean;
  payError: string | null;
  cancelling: boolean;
  cancelMsg: string | null;
  cancelErr: string | null;

  ratingLoaded: boolean;
  hasRated: boolean;
  driverRatingStars: number;
  setDriverRatingStars: (v: number) => void;
  driverRatingComment: string;
  setDriverRatingComment: (v: string) => void;
  driverCommentOpen: boolean;
  setDriverCommentOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  storeRatings: StoreReviewDraft[];
  setStoreRatings: React.Dispatch<React.SetStateAction<StoreReviewDraft[]>>;
  ratingSending: boolean;
  ratingMsg: string | null;
  ratingErr: string | null;

  fromApi: boolean;
  usingFlow: boolean;
  normalizedFlow: ApiOrderFlowStatus | null;

  orderType: ApiOrderType;
  isCourier: boolean;
  courierData: {
    pickupAddress: string | null;
    pickupLat: number | null;
    pickupLng: number | null;
    pickupPlaceName: string | null;
    pickupReference: string | null;
    dropoffPlaceName: string | null;
    dropoffReference: string | null;
    senderName: string | null;
    senderPhone: string | null;
    receiverName: string | null;
    receiverPhone: string | null;
    packageType: string | null;
    packageDescription: string | null;
  };

  etaText: string;
  chip: string;
  timeline: {
    steps: Array<{ key: string; label: string; hint: string; done: boolean; current: boolean }>;
  };
  updatedAgoText: string;
  orderCityText: string;
  mapData: TrackingMapData;

  totals: {
    storesSubtotalCOP: number;
    promosCOP: number;
    serviceCOP: number;
    deliveryCOP: number;
    tipCOP: number;
    calculatedTotalCOP: number;
    serverTotalCOP: number;
  };

  driverOpen: boolean;
  setDriverOpen: React.Dispatch<React.SetStateAction<boolean>>;

  storeStatesToRender: any[] | null;

  canCancel: boolean;
  canPayNow: boolean;
  canRetry: boolean;

  simulatePay: (method: PaymentMethod) => Promise<void>;
  cancelOrder: () => Promise<void>;
  submitRating: () => Promise<void>;
};

export type { Order, PaymentMethod, StoreState };



