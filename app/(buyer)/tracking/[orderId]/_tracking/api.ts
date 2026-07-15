//app\(buyer)\tracking\[orderId]\_tracking\api.ts
import { apiFetch } from "@/lib/api";
import type { ApiOrder, ApiOrderReviewsResponse, ApiTrackingSnapshot } from "./types";
import { getLocalOrderById, mapApiOrderToBuyerOrder } from "./utils";
import type { Order } from "@/components/buyer/OrdersStorage";

export async function fetchOrderFromApi(orderId: string): Promise<Order | null> {
  try {
    const previous = getLocalOrderById(orderId);
    const data = await apiFetch<ApiOrder>(`/orders/${orderId}`, { method: "GET" });
    if (!data?.id) return null;
    return mapApiOrderToBuyerOrder(data, previous);
  } catch {
    return null;
  }
}

export async function fetchTrackingSnapshot(orderId: string): Promise<ApiTrackingSnapshot | null> {
  try {
    const data = await apiFetch<ApiTrackingSnapshot>(`/orders/${orderId}/tracking`, { method: "GET" });
    if (!data?.orderId) return null;
    return data;
  } catch {
    return null;
  }
}

export async function apiPayment(orderId: string, status: "PENDING" | "PAID" | "FAILED", ref?: string) {
  await apiFetch(`/orders/${orderId}/payment`, {
    method: "POST",
    json: { status, ref },
  });
  return true;
}

export async function apiGetOrderReviews(orderId: string) {
  try {
    return await apiFetch<ApiOrderReviewsResponse>(`/orders/${orderId}/reviews`, { method: "GET" });
  } catch {
    return null;
  }
}

export async function apiPostOrderReviews(
  orderId: string,
  payload: {
    driverStars: number;
    driverComment?: string;
    storeRatings: Array<{
      storeId: string;
      stars: number;
      comment?: string;
    }>;
  }
) {
  return apiFetch<ApiOrderReviewsResponse>(`/orders/${orderId}/reviews`, {
    method: "POST",
    json: payload,
  });
}

export type CancelOrderResponse = {
  id?: string;
  cancelReason?: string;
  cancellationPolicy?: {
    affectedReliability?: boolean;
    workerLabel?: string;
    consecutivePostAssignmentCancellations?: number;
    blockedUntil?: string | null;
  };
};

export async function apiCancelOrder(
  orderId: string,
  confirmReliabilityImpact = false
) {
  return apiFetch<CancelOrderResponse>(`/orders/${orderId}/cancel`, {
    method: "POST",
    json: {
      reason: "CUSTOMER_CANCELLED",
      confirmReliabilityImpact,
    },
  });
}

export async function apiVerifyWompiPayment(
  orderId: string,
  payload: {
    transactionId?: string;
    reference?: string;
  }
) {
  return apiFetch(`/orders/${orderId}/wompi-verify`, {
    method: "POST",
    json: payload,
  });
}