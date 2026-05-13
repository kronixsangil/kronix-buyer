//app\(buyer)\tracking\[orderId]\_tracking\useTrackingPage.ts
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/buyer/useAuth";
import { notifyBuyer } from "@/lib/notify";
import type { Order, PaymentMethod, TrackingViewModel } from "./types";
import {
  buildOpenMapsUrl,
  buildStoresToRate,
  CARD,
  CARD_PAD,
  CARD_PAD_SM,
  FLOW_STEPS,
  flowLabel,
  getLocalOrderById,
  isFiniteCoord,
  loadBuyerNotifyState,
  mapCenterBetween,
  normName,
  pickFirstReason,
  saveBuyerNotifyState,
  buildEmbedUrl,
  contextualFlowLabel,
getContextualFlowSteps,
getCourierServiceTypeFromSources,
} from "./utils";
import {
  apiCancelOrder,
  apiGetOrderReviews,
  apiPayment,
  apiPostOrderReviews,
  fetchOrderFromApi,
  fetchTrackingSnapshot,
  
} from "./api";

export function useTrackingPage(): TrackingViewModel {
  const [driverOpen, setDriverOpen] = useState(false);
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const { isLoading: authLoading, isAuthed } = useAuth();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authNext, setAuthNext] = useState<string>("/");
  const requireLogin = (nextPath: string) => {
    setAuthNext(nextPath);
    setShowAuthModal(true);
  };

  const orderId = String(params?.orderId ?? "");
  const invalidOrderId = !orderId;

  const [order, setOrder] = useState<Order | null>(null);
  const [tracking, setTracking] = useState<any | null>(null);
  const deliveredTrackingRef = useRef<any | null>(null);

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [fromApi, setFromApi] = useState(false);

  const [cancelling, setCancelling] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<string | null>(null);
  const [cancelErr, setCancelErr] = useState<string | null>(null);

  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [ratingLoaded, setRatingLoaded] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [driverRatingStars, setDriverRatingStars] = useState<number>(5);
  const [driverRatingComment, setDriverRatingComment] = useState<string>("");
  const [driverCommentOpen, setDriverCommentOpen] = useState(false);
  const [storeRatings, setStoreRatings] = useState<any[]>([]);
  const [ratingSending, setRatingSending] = useState(false);
  const [ratingMsg, setRatingMsg] = useState<string | null>(null);
  const [ratingErr, setRatingErr] = useState<string | null>(null);

  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!orderId) return;
    let alive = true;

    async function load() {
      setLoadErr(null);

      const local = getLocalOrderById(orderId);
      if (local && alive) setOrder(local);

      const [apiOrder, snap] = await Promise.all([fetchOrderFromApi(orderId), fetchTrackingSnapshot(orderId)]);
      if (!alive) return;

      if (!apiOrder) {
        if (local) {
          setFromApi(false);
          setOrder(local);
          setTracking(null);
          setLoadErr(null);
          return;
        }

        setFromApi(false);
        setOrder(null);
        setTracking(null);
        setLoadErr("No pudimos cargar este pedido desde el servidor. Revisa que la API esté encendida.");
        return;
      }

      setFromApi(true);
      setOrder(apiOrder);
      setTracking(snap);

      const flow = String(snap?.flowStatus ?? apiOrder?.flowStatus ?? "").toUpperCase();
      if (flow === "DELIVERED" && snap) deliveredTrackingRef.current = snap;
    }

    load();
    return () => {
      alive = false;
    };
  }, [orderId]);

  const normalizedFlow = (tracking?.flowStatus ?? (order?.flowStatus as any)) ?? null;
  const usingFlow = Boolean(normalizedFlow);

  const orderType = useMemo(() => {
    return String((order as any)?.orderType ?? tracking?.orderType ?? "STORE").trim().toUpperCase() as any;
  }, [order, tracking]);

  const isCourier = orderType === "COURIER";

  const courierServiceType = useMemo(() => {
  return getCourierServiceTypeFromSources(order, tracking);
}, [order, tracking]);

  const courierData = useMemo(() => {
    const fromTracking = tracking?.courier ?? null;
    const fromOrder = (order as any)?.courier ?? null;

    return {
      pickupAddress: String(fromTracking?.pickupAddress ?? fromOrder?.pickupAddress ?? "").trim() || null,
      pickupLat:
        typeof fromTracking?.pickupLat === "number"
          ? fromTracking.pickupLat
          : typeof fromOrder?.pickupLat === "number"
          ? fromOrder.pickupLat
          : null,
      pickupLng:
        typeof fromTracking?.pickupLng === "number"
          ? fromTracking.pickupLng
          : typeof fromOrder?.pickupLng === "number"
          ? fromOrder.pickupLng
          : null,
      pickupPlaceName: String(fromTracking?.pickupPlaceName ?? fromOrder?.pickupPlaceName ?? "").trim() || null,
      pickupReference: String(fromTracking?.pickupReference ?? fromOrder?.pickupReference ?? "").trim() || null,
      dropoffPlaceName: String(fromTracking?.dropoffPlaceName ?? fromOrder?.dropoffPlaceName ?? "").trim() || null,
      dropoffReference: String(fromTracking?.dropoffReference ?? fromOrder?.dropoffReference ?? "").trim() || null,
      senderName: String(fromTracking?.senderName ?? fromOrder?.senderName ?? "").trim() || null,
      senderPhone: String(fromTracking?.senderPhone ?? fromOrder?.senderPhone ?? "").trim() || null,
      receiverName: String(fromTracking?.receiverName ?? fromOrder?.receiverName ?? "").trim() || null,
      receiverPhone: String(fromTracking?.receiverPhone ?? fromOrder?.receiverPhone ?? "").trim() || null,
      packageType: String(fromTracking?.packageType ?? fromOrder?.packageType ?? "").trim() || null,
      packageDescription: String(fromTracking?.packageDescription ?? fromOrder?.packageDescription ?? "").trim() || null,
    };
  }, [order, tracking]);

  useEffect(() => {
    if (!orderId || !fromApi || normalizedFlow === "DELIVERED") return;

    let alive = true;
    async function refreshSnapshot() {
      const snap = await fetchTrackingSnapshot(orderId);
      if (!alive || !snap) return;
      setTracking(snap);
    }

    refreshSnapshot();
    const t = setInterval(refreshSnapshot, 5000);

    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [orderId, fromApi, normalizedFlow]);

  useEffect(() => {
    if (!orderId || !fromApi) return;

    const API = process.env.NEXT_PUBLIC_API || "http://localhost:3004";
    const es = new EventSource(`${API}/events/stream?orderId=${encodeURIComponent(orderId)}`);

    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data?.type !== "order.updated" || data.orderId !== orderId) return;

        Promise.all([fetchOrderFromApi(orderId), fetchTrackingSnapshot(orderId)]).then(([fresh, snap]) => {
          if (fresh) setOrder(fresh);

          const flow = String(snap?.flowStatus ?? fresh?.flowStatus ?? "").toUpperCase();
          if (flow === "DELIVERED") {
            if (snap) {
              deliveredTrackingRef.current = snap;
              setTracking(snap);
            } else if (deliveredTrackingRef.current) {
              setTracking(deliveredTrackingRef.current);
            }
            return;
          }

          if (snap) setTracking(snap);
        });
      } catch {}
    };

    es.onerror = () => {};
    return () => es.close();
  }, [orderId, fromApi]);

  useEffect(() => {
    if (!orderId || !fromApi) return;

    const flow = normalizedFlow ?? null;
    const prof = tracking?.driver?.profile ?? null;
    const driverAssignedNow = Boolean(prof?.id);

    const prev = loadBuyerNotifyState(orderId);
    const prevFlow = (prev?.lastFlow ?? null) as any;
    const prevAssigned = Boolean(prev?.driverAssigned);

    if (driverAssignedNow && !prevAssigned) {
      const name = String(prof?.name ?? "").trim() || "Tu conductor";
      notifyBuyer({
        title: "🚗 Conductor asignado",
        body: `${name} ya fue asignado a tu pedido #${orderId}.`,
        tag: `buyer:assigned:${orderId}`,
        soundEvent: "DRIVER_ASSIGNED",
      });
    }

    const flowChanged = flow && flow !== prevFlow;
    if (flowChanged) {
      if (flow === "STORE_CONFIRMED" || flow === "PREPARING") {
        notifyBuyer({
          title: isCourier ? "✅ Solicitud confirmada" : "✅ Pedido confirmado",
          body: isCourier
            ? `Tu solicitud #${orderId} quedó lista para pago.`
            : `El negocio confirmó tu pedido #${orderId}.`,
          tag: `buyer:store:${orderId}`,
          soundEvent: "STORE_CONFIRMED",
        });
      }

      if (flow === "EN_ROUTE") {
        notifyBuyer({
          title: "🛵 En camino",
          body: `Tu pedido #${orderId} ya va en camino.`,
          tag: `buyer:enroute:${orderId}`,
          soundEvent: "EN_ROUTE",
        });
      }

      if (flow === "DELIVERED") {
        notifyBuyer({
          title: "🎉 Pedido entregado",
          body: `Tu pedido #${orderId} fue entregado.`,
          tag: `buyer:delivered:${orderId}`,
          soundEvent: "DELIVERED",
        });
      }

      if (flow === "CANCELLED") {
        notifyBuyer({
          title: "⚠️ Pedido cancelado",
          body: `Tu pedido #${orderId} fue cancelado.`,
          tag: `buyer:cancelled:${orderId}`,
          soundEvent: "CANCELLED",
        });
      }

      if (flow === "PAYMENT_FAILED") {
        notifyBuyer({
          title: "❌ Pago fallido",
          body: `El pago de tu pedido #${orderId} falló. Puedes reintentar.`,
          tag: `buyer:payfail:${orderId}`,
          soundEvent: "PAYMENT_FAILED",
        });
      }
    }

    saveBuyerNotifyState(orderId, {
      lastFlow: flow ?? prevFlow ?? null,
      driverAssigned: driverAssignedNow || prevAssigned,
    });
  }, [orderId, fromApi, normalizedFlow, tracking?.driver?.profile, isCourier]);

  useEffect(() => {
    if (normalizedFlow !== "DELIVERED") return;
    const drafts = buildStoresToRate(order, tracking);
    setStoreRatings((prev) => {
      if (!prev.length) return drafts;
      const prevByName = new Map(prev.map((x: any) => [normName(x.storeName), x]));
      return drafts.map((d: any) => {
        const existing = prevByName.get(normName(d.storeName));
        return existing ? { ...d, stars: existing.stars, comment: existing.comment, isCommentOpen: existing.isCommentOpen } : d;
      });
    });
  }, [normalizedFlow, order, tracking]);

  useEffect(() => {
  if (!order?.id || !fromApi || normalizedFlow !== "DELIVERED") return;

  let alive = true;
  const oid = order.id;

  async function loadRatingStatus() {
    setRatingErr(null);
    setRatingMsg(null);
    setRatingLoaded(false);

    const r = await apiGetOrderReviews(oid);
      if (!alive) return;

      const existingDriver = r?.driverRating ?? null;
      const existingStores = Array.isArray(r?.storeRatings) ? r.storeRatings : [];
      const alreadyRated = Boolean(existingDriver?.orderId) || existingStores.length > 0;
      setHasRated(alreadyRated);

      if (existingDriver) {
        setDriverRatingStars(Number(existingDriver.rating ?? 5));
        setDriverRatingComment(String(existingDriver.comment ?? ""));
        setDriverCommentOpen(Boolean(String(existingDriver.comment ?? "").trim()));
      }

      if (existingStores.length) {
        const byStoreName = new Map(
          existingStores.map((x) => [normName(x.storeName), { stars: Number(x.rating ?? 5), comment: String(x.comment ?? "") }])
        );

        const drafts = buildStoresToRate(order, tracking).map((d: any) => {
          const found = byStoreName.get(normName(d.storeName));
          return found ? { ...d, stars: found.stars, comment: found.comment, isCommentOpen: Boolean(found.comment.trim()) } : d;
        });

        setStoreRatings(drafts);
      }

      setRatingLoaded(true);
    }

    loadRatingStatus();
    return () => {
      alive = false;
    };
  }, [order?.id, fromApi, normalizedFlow, order, tracking]);

  const etaText = useMemo(() => {
  if (!order) return "";

  if (!isCourier) {
    if (normalizedFlow === "WAITING_CONFIRMATION") return "Por confirmar";
    if (normalizedFlow === "STORE_CONFIRMED") return "Listo para pago";
    if (normalizedFlow === "PAYMENT_PENDING") return "Un momento…";
    if (normalizedFlow === "PAID") return "En preparación";
    if (normalizedFlow === "PREPARING") return "En preparación";
    if (normalizedFlow === "PAYMENT_FAILED") return "Reintenta pago";
    if (normalizedFlow === "CANCELLED") return "Cancelado";
    return "—";
  }

  if (normalizedFlow === "WAITING_CONFIRMATION") return "Solicitud recibida";
  if (normalizedFlow === "STORE_CONFIRMED") return "Listo para pago";
  if (normalizedFlow === "PAYMENT_PENDING") return "Validando pago";
  if (normalizedFlow === "PAID") return "Buscando conductor";
  if (normalizedFlow === "PREPARING") {
    if (courierServiceType === "SEND_PACKAGE") return "Recogiendo paquete";
    if (courierServiceType === "ERRAND") return "Realizando diligencia";
    return "Coordinando recogida";
  }
  if (normalizedFlow === "EN_ROUTE") {
  if (courierServiceType === "SEND_PACKAGE") {
    return "Tu paquete va en camino";
  }

  if (courierServiceType === "ERRAND") {
    return "Tu diligencia está en curso";
  }

  return "Tu servicio va en camino";
}
  if (normalizedFlow === "DELIVERED") return "Finalizado";
  if (normalizedFlow === "PAYMENT_FAILED") return "Reintenta pago";
  if (normalizedFlow === "CANCELLED") return "Cancelado";

  return "—";
}, [order, normalizedFlow, isCourier, courierServiceType]);

  const chip = useMemo(() => {
  if (!order && !tracking) return "—";
  return contextualFlowLabel({
    flow: normalizedFlow,
    isCourier,
    courierServiceType,
  });
}, [order, tracking, normalizedFlow, isCourier, courierServiceType]);

  const timeline = useMemo(() => {
    if ((!order && !tracking) || !normalizedFlow) return { steps: [] as any[] };

    const negative = new Set(["CANCELLED", "PAYMENT_FAILED"]);
    const flowSteps = getContextualFlowSteps({ isCourier, courierServiceType });
const currentIdx = flowSteps.findIndex((s) => s.key === normalizedFlow);

    if (currentIdx < 0) {
      return { steps: [{ key: normalizedFlow, label: flowLabel(normalizedFlow), hint: "Estado actual", done: true, current: true }] };
    }

    const steps: any[] = [];
    for (let i = 0; i <= currentIdx; i++) {
      const s = flowSteps[i];
      steps.push({ key: s.key, label: s.label, hint: s.hint, done: true, current: i === currentIdx });
    }

    const nextIdx = currentIdx + 1;
    if (!negative.has(normalizedFlow) && nextIdx < flowSteps.length) {
  const s = flowSteps[nextIdx];
      steps.push({ key: s.key, label: s.label, hint: s.hint, done: false, current: false });
    }

    return { steps };
  }, [order, tracking, normalizedFlow]);

  const updatedAgoText = useMemo(() => {
    void nowTick;
    if (!tracking?.updatedAt) return "";
    const t = typeof tracking.updatedAt === "string" ? Date.parse(tracking.updatedAt) : new Date(tracking.updatedAt).getTime();
    if (!Number.isFinite(t)) return "";
    const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
    return `Actualizado hace ${diffSec} segundos`;
  }, [tracking, nowTick]);

  const storeStatesFromTracking = useMemo(() => {
    if (isCourier || !tracking?.pickups?.length) return null;

    const sorted = tracking.pickups.slice().sort((a: any, b: any) => (a.sequence ?? 0) - (b.sequence ?? 0));
    const result = sorted.map((p: any) => {
      const confirmed = !!p.confirmedAt;
      const rejected = !!p.rejectedAt;
      return {
        storeId: String(p.storeCode || ""),
        name: p.storeName || "Tienda",
        state: confirmed ? "CONFIRMED" : rejected ? "REJECTED" : "PENDING",
        reason: pickFirstReason(p),
      };
    });

    return result.length ? result : null;
  }, [tracking, isCourier]);

  const storeStatesToRender = useMemo(() => {
    if (isCourier) return null;

    const fromSnap = storeStatesFromTracking ?? null;
    const fromOrder = (order?.storeStates as any[]) ?? null;
    if (!fromSnap?.length) return fromOrder?.length ? fromOrder : null;
    if (!fromOrder?.length) return fromSnap;

    const reasonByName = new Map<string, string>();
    for (const s of fromOrder) {
      const nm = normName(s?.name);
      const rs = String(s?.reason ?? "").trim();
      if (nm && rs) reasonByName.set(nm, rs);
    }

    return fromSnap.map((s: any) => {
      if (s?.state === "REJECTED" && !String(s?.reason ?? "").trim()) {
        const rescued = reasonByName.get(normName(s?.name));
        if (rescued) return { ...s, reason: rescued };
      }
      return s;
    });
  }, [storeStatesFromTracking, order?.storeStates, isCourier]);

  const totals = useMemo(() => {
    const storesSubtotalCOP = Math.max(0, Math.round(Number(tracking?.totals?.storesSubtotalCOP ?? 0)));
    const promosCOP = Math.max(0, Math.round(Number(tracking?.totals?.promoCOP ?? 0)));
    const serviceCOP = Math.max(0, Math.round(Number(tracking?.totals?.serviceFeeCOP ?? 0)));
    const deliveryCOP = Math.max(0, Math.round(Number(tracking?.totals?.deliveryFeeCOP ?? order?.deliveryFeeCOP ?? 0)));
    const tipCOP = Math.max(0, Math.round(Number(tracking?.totals?.tipCOP ?? order?.tipCOP ?? 0)));
    const calculatedTotalCOP = Math.max(0, Math.round(storesSubtotalCOP - promosCOP + serviceCOP + deliveryCOP + tipCOP));
    const serverTotalCOP = Math.max(0, Math.round(Number(tracking?.totals?.totalCOP ?? 0)));
    return { storesSubtotalCOP, promosCOP, serviceCOP, deliveryCOP, tipCOP, calculatedTotalCOP, serverTotalCOP };
  }, [order, tracking]);

  const mapData = useMemo(() => {
    const customer = {
      lat: Number(tracking?.customer?.lat ?? order?.dropoffLocation?.lat ?? 0),
      lng: Number(tracking?.customer?.lng ?? order?.dropoffLocation?.lng ?? 0),
    };

    const driver = tracking?.driver?.location
      ? { lat: Number(tracking.driver.location.lat), lng: Number(tracking.driver.location.lng) }
      : null;

    const hasCustomer = isFiniteCoord(customer.lat, "lat") && isFiniteCoord(customer.lng, "lng");
    const hasDriver = !!driver && isFiniteCoord(driver.lat, "lat") && isFiniteCoord(driver.lng, "lng");

    const center =
      hasCustomer && hasDriver && driver
        ? mapCenterBetween(customer, driver)
        : hasCustomer
        ? customer
        : hasDriver && driver
        ? driver
        : null;

    return {
      hasCustomer,
      hasDriver,
      customer: hasCustomer ? customer : null,
      driver: hasDriver && driver ? driver : null,
      embedUrl: center ? buildEmbedUrl(center, hasDriver ? 14 : 15) : null,
      openUrl: hasCustomer ? buildOpenMapsUrl({ dest: customer, origin: hasDriver && driver ? driver : undefined }) : null,
    };
  }, [tracking, order]);

  const orderCityText = useMemo(() => {
    const cityLabel = String(order?.cityLabel ?? "").trim();
    if (cityLabel) return cityLabel;
    const citySlug = String(order?.citySlug ?? "").trim();
    return citySlug
      ? citySlug.split("-").filter(Boolean).map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join(" ")
      : "";
  }, [order?.cityLabel, order?.citySlug]);

  const simulatePay = async (method: PaymentMethod) => {
  if (!authLoading && !isAuthed) {
    requireLogin(`/tracking/${orderId}`);
    return;
  }
  if (!order || paying) return;

  setPayError(null);
  setPaying(true);

  try {
    if (!fromApi) {
      setPayError("Este pedido no está conectado al servidor. Revisa la API.");
      return;
    }

    await apiPayment(order.id, "PENDING");
    await new Promise((r) => setTimeout(r, 900));

    const normalizedMethod = String(method ?? "").trim().toUpperCase();
    const ref =
  normalizedMethod === "WALLET"
    ? `WALLET-${Date.now()}`
    : normalizedMethod === "WOMPI"
    ? `WOMPI-${Date.now()}`
    : `MOCK-${Date.now()}`;

        setOrder((prev) =>
      prev
        ? {
            ...prev,
            paymentMethod: normalizedMethod as PaymentMethod,
            payment: {
              ...(prev.payment ?? { status: "NONE" }),
              method: normalizedMethod as PaymentMethod,
            },
          }
        : prev
    );

    await apiPayment(order.id, "PAID", ref);

    const [refreshed, snap] = await Promise.all([
      fetchOrderFromApi(order.id),
      fetchTrackingSnapshot(order.id),
    ]);

    if (!refreshed && !snap) {
      setPayError("El backend no devolvió el pedido actualizado después del pago.");
      return;
    }

    if (refreshed) setOrder(refreshed);
    if (snap) setTracking(snap);

    const finalFlow = String(
      snap?.flowStatus ?? refreshed?.flowStatus ?? ""
    ).toUpperCase();

    const finalPayment = String(
      (snap as any)?.paymentStatus ??
        (refreshed as any)?.payment?.status ??
        ""
    ).toUpperCase();

    if (
      !["PAID", "PREPARING", "EN_ROUTE", "DELIVERED"].includes(finalFlow) &&
      finalPayment !== "PAID"
    ) {
      setPayError(
        "El backend no confirmó el pago. Revisa la lógica del endpoint /orders/:id/payment."
      );
    }
  } catch (e: any) {
    setPayError(
      String(
        e?.message ??
          "No se pudo completar el pago (backend). Revisa la API y reintenta."
      )
    );
  } finally {
    setPaying(false);
  }
};

  const cancelOrder = async () => {
    if (!order) return;
    if (!fromApi) {
      setCancelErr("Este pedido no está conectado al servidor.");
      return;
    }

    setCancelErr(null);
    setCancelMsg(null);

    const ok = window.confirm("¿Seguro que deseas cancelar este pedido?");
    if (!ok) return;

    setCancelling(true);
    try {
      const done = await apiCancelOrder(order.id);
      if (!done) {
        setCancelErr("No se pudo cancelar. Si ya pagaste, debes contactar soporte.");
        return;
      }

      setCancelMsg("Tu pedido fue cancelado");

      const [refreshed, snap] = await Promise.all([fetchOrderFromApi(order.id), fetchTrackingSnapshot(order.id)]);
      if (refreshed) setOrder(refreshed);
      if (snap) setTracking(snap);
    } catch {
      setCancelErr("No se pudo cancelar. Revisa la API e inténtalo de nuevo.");
    } finally {
      setCancelling(false);
    }
  };

  const submitRating = async () => {
    if (!authLoading && !isAuthed) {
      requireLogin(`/tracking/${orderId}`);
      return;
    }
    if (!order?.id) return;

    setRatingErr(null);
    setRatingMsg(null);
    setRatingSending(true);

    try {
      await apiPostOrderReviews(order.id, {
        driverStars: driverRatingStars,
        driverComment: driverRatingComment?.trim() ? driverRatingComment.trim() : undefined,
        storeRatings: storeRatings.map((x: any) => ({
          storeId: x.storeId,
          stars: x.stars,
          comment: x.comment?.trim() ? x.comment.trim() : undefined,
        })),
      });

      setHasRated(true);
      setRatingMsg("¡Gracias! Tus calificaciones fueron enviadas ✅");
    } catch (e: any) {
      const msg =
        String(e?.message ?? "").trim() ||
        "No se pudo enviar. Si ya pasaron más de 3 días, la ventana de calificación expiró.";
      setRatingErr(msg);
    } finally {
      setRatingSending(false);
    }
  };

  const canCancel =
    Boolean(usingFlow) &&
    !cancelling &&
    normalizedFlow !== "PAID" &&
    normalizedFlow !== "PREPARING" &&
    normalizedFlow !== "EN_ROUTE" &&
    normalizedFlow !== "DELIVERED" &&
    normalizedFlow !== "CANCELLED";

  const canPayNow = Boolean(usingFlow) && normalizedFlow === "STORE_CONFIRMED" && !paying;
  const canRetry = Boolean(usingFlow) && normalizedFlow === "PAYMENT_FAILED" && !paying;

  return {
    CARD,
    CARD_PAD,
    CARD_PAD_SM,
    router,
    orderId,
    invalidOrderId,
    order,
    tracking,
    loadErr,
    showAuthModal,
    setShowAuthModal,
    authNext,
    paying,
    payError,
    cancelling,
    cancelMsg,
    cancelErr,
    ratingLoaded,
    hasRated,
    driverRatingStars,
    setDriverRatingStars,
    driverRatingComment,
    setDriverRatingComment,
    driverCommentOpen,
    setDriverCommentOpen,
    storeRatings,
    setStoreRatings,
    ratingSending,
    ratingMsg,
    ratingErr,
    fromApi,
    usingFlow,
    normalizedFlow,
    orderType,
    isCourier,
    courierData,
    etaText,
    chip,
    timeline,
    courierServiceType,
    updatedAgoText,
    orderCityText,
    mapData,
    totals,
    driverOpen,
    setDriverOpen,
    storeStatesToRender,
    canCancel,
    canPayNow,
    canRetry,
    simulatePay,
    cancelOrder,
    submitRating,
  } as TrackingViewModel;
}