//app\(buyer)\tracking\[orderId]\_tracking\TrackingPaymentCard.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useBuyerCity } from "@/components/buyer/CityContext";
import type { PaymentMethod, TrackingViewModel } from "./types";

type WalletMeResponse = {
  ok?: boolean;
  wallet?: {
    id: string;
    userId: string;
    cityId?: string | null;
    cashBalanceCOP: number;
    bonusBalanceCOP: number;
    totalAvailableCOP: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
};

type WompiSignatureResponse = {
  reference: string;
  amountInCents: number;
  currency: "COP";
  signature: string;
  publicKey: string;
};

type WompiNequiResponse = {
  ok?: boolean;
  reference: string;
  transactionId?: string;
  status?: string;
  message?: string;
};

const PAYMENT_LOGO = {
  nequi: {
    src: "/branding/payments/nequi-logo.png",
    width: 54,
    height: 54,
    scale: 1.1,
    translateX: 12,
    translateY: 2,
  },
  wompi: {
    src: "/branding/payments/wompi-logo.png",
    width: 92,
    height: 58,
    scale: 1,
    translateX: -2,
    translateY: -4,
  },
  wallet: {
    src: "/branding/payments/kronix-wallet.png",
    width: 62,
    height: 62,
    scale: 1,
    translateX: 12,
    translateY: -2,
  },
};

function formatCOP(value: number) {
  return value.toLocaleString("es-CO", { style: "currency", currency: "COP" });
}

function cleanPhone(value: string) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 10);
}

function getOrderCityId(vm: TrackingViewModel) {
  const candidates = [
    (vm.order as any)?.cityId,
    (vm.order as any)?.city?.id,
    (vm.order as any)?.store?.cityId,
    (vm.order as any)?.storeCityId,
  ];

  for (const value of candidates) {
    const cityId = String(value ?? "").trim();
    if (cityId) return cityId;
  }

  return "";
}

function getPaymentReference(vm: TrackingViewModel) {
  return (
    String((vm.order as any)?.payment?.reference ?? "").trim() ||
    String((vm.order as any)?.paymentReference ?? "").trim()
  );
}

function normalizePaymentMethod(value?: string | null): PaymentMethod | null {
  const method = String(value ?? "").trim().toUpperCase();

  if (method === "WALLET") return "WALLET";
  if (method === "WOMPI") return "WOMPI";
  if (method === "NEQUI") return "NEQUI";

  return null;
}

function getReliablePaymentMethod(
  vm: TrackingViewModel,
  fallback: PaymentMethod
): PaymentMethod {
  const reference = getPaymentReference(vm).toUpperCase();

  if (reference.startsWith("WALLET")) return "WALLET";
  if (reference.startsWith("WOMPI")) return "WOMPI";

  const method =
    normalizePaymentMethod((vm.order as any)?.payment?.method) ||
    normalizePaymentMethod((vm.order as any)?.paymentMethod);

  return method || fallback || "NEQUI";
}

function PaymentImageLogo({
  src,
  alt,
  width,
  height,
  scale,
  translateX,
  translateY,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  scale: number;
  translateX: number;
  translateY: number;
}) {
  return (
    <div className="relative h-[58px] w-[84px] shrink-0 overflow-hidden">
      <img
        src={src}
        alt={alt}
        className="object-contain"
        style={{
          width,
          height,
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
          transformOrigin: "center",
        }}
      />
    </div>
  );
}

export function TrackingPaymentCard({ vm }: { vm: TrackingViewModel }) {
  const { city } = useBuyerCity();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(() =>
    getReliablePaymentMethod(vm, "NEQUI")
  );

  const [nequiPhone, setNequiPhone] = useState("");
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletAvailableCOP, setWalletAvailableCOP] = useState(0);
  const [walletIsActive, setWalletIsActive] = useState(true);

  const wompiScriptLoadedRef = useRef(false);
  const [wompiLoading, setWompiLoading] = useState(false);
  const [wompiError, setWompiError] = useState<string | null>(null);

  const walletCityId = useMemo(() => {
    return getOrderCityId(vm) || String(city?.id ?? "").trim();
  }, [vm, city?.id]);

  const paymentReference = getPaymentReference(vm);

  useEffect(() => {
    const saved = cleanPhone(localStorage.getItem("kronix:nequiPhone:v1") || "");
    if (saved) setNequiPhone(saved);
  }, []);

  useEffect(() => {
    setSelectedMethod(getReliablePaymentMethod(vm, selectedMethod || "NEQUI"));
  }, [
    vm.orderId,
    vm.order?.payment?.method,
    vm.order?.paymentMethod,
    (vm.order as any)?.payment?.reference,
    (vm.order as any)?.paymentReference,
  ]);

  useEffect(() => {
    let alive = true;

    if (!walletCityId) {
      setWalletAvailableCOP(0);
      setWalletIsActive(true);
      setWalletLoading(false);
      return;
    }

    setWalletLoading(true);

    (async () => {
      try {
        const res = await apiFetch<WalletMeResponse>(
          `/wallet/me?cityId=${encodeURIComponent(walletCityId)}`,
          {
            method: "GET",
            suppressSessionExpiredEvent: true,
          }
        );

        if (!alive) return;

        const available = Number(res?.wallet?.totalAvailableCOP ?? 0);
        setWalletAvailableCOP(Number.isFinite(available) ? available : 0);
        setWalletIsActive(res?.wallet?.isActive !== false);
      } catch {
        if (!alive) return;
        setWalletAvailableCOP(0);
        setWalletIsActive(true);
      } finally {
        if (!alive) return;
        setWalletLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [vm.orderId, walletCityId]);

  const totalToPay = useMemo(() => {
    return Math.max(
      0,
      Math.round(
        Number(
          vm.totals?.serverTotalCOP ||
            vm.totals?.calculatedTotalCOP ||
            vm.order?.totalCOP ||
            vm.order?.total ||
            0
        )
      )
    );
  }, [vm.totals, vm.order]);

  const walletCoversTotal = walletAvailableCOP >= totalToPay;
  const walletSelectable = !walletLoading && walletIsActive && walletCoversTotal && totalToPay > 0;
  const walletShortfallCOP = Math.max(0, totalToPay - walletAvailableCOP);
  const walletRemainingAfterPayCOP = Math.max(0, walletAvailableCOP - totalToPay);

  async function ensureWompiScript() {
    if (wompiScriptLoadedRef.current || (window as any).WidgetCheckout) return;

    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[src="https://checkout.wompi.co/widget.js"]');
      if (existing) {
        wompiScriptLoadedRef.current = true;
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.wompi.co/widget.js";
      script.async = true;
      script.onload = () => {
        wompiScriptLoadedRef.current = true;
        resolve();
      };
      script.onerror = () => reject(new Error("No se pudo cargar Wompi."));
      document.head.appendChild(script);
    });
  }

  async function verifyWompiPayment(reference: string, transactionId?: string) {
    return apiFetch<{ ok?: boolean; status?: string; message?: string }>(
      `/orders/${encodeURIComponent(vm.orderId)}/wompi-verify`,
      {
        method: "POST",
        suppressSessionExpiredEvent: true,
        json: {
          reference,
          transactionId: transactionId || undefined,
        },
      }
    );
  }

  async function pollVerifyPayment(reference: string, transactionId?: string) {
    for (let i = 1; i <= 24; i++) {
      const verify = await verifyWompiPayment(reference, transactionId);

      if (verify?.ok) {
        window.location.reload();
        return true;
      }

      const status = String(verify?.status ?? "").toUpperCase();

      if (["DECLINED", "ERROR", "VOIDED", "FAILED"].includes(status)) {
        setWompiError("El pago fue rechazado por Wompi.");
        return false;
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    setWompiError("El pago sigue pendiente. Si ya aprobaste en Nequi, espera unos segundos y actualiza.");
    return false;
  }

  async function payWithNequi() {
    if (!vm.orderId) return;

    const phone = cleanPhone(nequiPhone);

    if (!/^3\d{9}$/.test(phone)) {
      setWompiError("Ingresa un celular Nequi válido de 10 dígitos que empiece por 3.");
      return;
    }

    localStorage.setItem("kronix:nequiPhone:v1", phone);

    setWompiError(null);
    setWompiLoading(true);

    try {
      const res = await apiFetch<WompiNequiResponse>(
        `/orders/${encodeURIComponent(vm.orderId)}/wompi-nequi`,
        {
          method: "POST",
          suppressSessionExpiredEvent: true,
          json: {
            phoneNumber: phone,
          },
        }
      );

      if (!res?.ok) {
        setWompiError(res?.message || "No se pudo iniciar el pago por Nequi.");
        return;
      }

      const status = String(res.status ?? "").toUpperCase();

      if (status === "APPROVED") {
        await pollVerifyPayment(res.reference, res.transactionId);
        return;
      }

      setWompiError("Confirma el pago desde tu app Nequi. Estamos verificando…");
      await pollVerifyPayment(res.reference, res.transactionId);
    } catch (e: any) {
      console.error("🔥 ERROR NEQUI WOMPI:", e);
      setWompiError(e?.message || "No se pudo iniciar el pago directo por Nequi.");
    } finally {
      setWompiLoading(false);
    }
  }

  async function payWithWompi() {
    if (!vm.orderId) return;

    setWompiError(null);
    setWompiLoading(true);

    try {
      const sig = await apiFetch<WompiSignatureResponse>(
        `/orders/${encodeURIComponent(vm.orderId)}/wompi-signature`,
        {
          method: "POST",
          suppressSessionExpiredEvent: true,
        }
      );

      await apiFetch(`/orders/${encodeURIComponent(vm.orderId)}/payment`, {
        method: "POST",
        suppressSessionExpiredEvent: true,
        json: {
          status: "PENDING",
          ref: sig.reference,
        },
      });

      await ensureWompiScript();

      const WidgetCheckout = (window as any).WidgetCheckout;
      if (!WidgetCheckout) throw new Error("Wompi no quedó disponible.");

      const checkout = new WidgetCheckout({
        currency: sig.currency,
        amountInCents: sig.amountInCents,
        reference: sig.reference,
        publicKey: sig.publicKey,
        signature: {
          integrity: sig.signature,
        },
      });

      checkout.open(async (result: any) => {
        try {
          const transaction =
            result?.transaction ??
            result?.data?.transaction ??
            result?.data ??
            null;

          const status = String(transaction?.status ?? result?.status ?? "").toUpperCase();

          const transactionId = String(
            transaction?.id ??
              result?.transactionId ??
              result?.id ??
              ""
          ).trim();

          if (status === "APPROVED") {
            await pollVerifyPayment(sig.reference, transactionId);
            return;
          }

          if (["DECLINED", "ERROR", "VOIDED"].includes(status)) {
            setWompiError("El pago fue rechazado por Wompi.");
            return;
          }

          await pollVerifyPayment(sig.reference, transactionId || undefined);
        } catch (e: any) {
          setWompiError(e?.message || "No se pudo verificar el pago con Wompi.");
        } finally {
          setWompiLoading(false);
        }
      });
    } catch (e: any) {
      console.error("🔥 ERROR WOMPI:", e);
      setWompiError(e?.message || "No se pudo iniciar el pago con Wompi.");
      setWompiLoading(false);
    }
  }

  useEffect(() => {
    if (!vm.orderId) return;
    if (vm.normalizedFlow !== "PAYMENT_PENDING") return;

    const reference =
      String((vm.order as any)?.payment?.reference ?? "").trim() ||
      String((vm.order as any)?.paymentReference ?? "").trim() ||
      `ORDER-${vm.orderId}`;

    if (reference.toUpperCase().startsWith("WALLET")) return;

    let alive = true;

    async function run() {
      try {
        await pollVerifyPayment(reference);
      } catch (e) {
        if (alive) console.error("🔥 WOMPI AUTO VERIFY ERROR:", e);
      }
    }

    run();

    return () => {
      alive = false;
    };
  }, [vm.orderId, vm.normalizedFlow, vm.order]);

  useEffect(() => {
    if (selectedMethod !== "WALLET") return;
    if (walletLoading) return;
    if (!walletSelectable) setSelectedMethod("NEQUI");
  }, [selectedMethod, walletLoading, walletSelectable]);

  if (!vm.usingFlow) return null;

  const paidMethod = getReliablePaymentMethod(vm, selectedMethod);

  const showMethodSelector =
    vm.normalizedFlow === "STORE_CONFIRMED" || vm.normalizedFlow === "PAYMENT_FAILED";

  const handleMainPay = () => {
    if (selectedMethod === "WOMPI") return payWithWompi();
    if (selectedMethod === "NEQUI") return payWithNequi();
    return vm.simulatePay("WALLET");
  };

  return (
    <div className={`${vm.CARD_PAD} mt-4`}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-extrabold text-gray-900">Pago</div>
        <div className="text-[11px] text-gray-500">
          Método: <span className="font-semibold">{paidMethod}</span>
        </div>
      </div>

      {showMethodSelector ? (
        <div className="mt-3 space-y-3">
          <button
            type="button"
            onClick={() => setSelectedMethod("NEQUI")}
            className={`w-full rounded-2xl border p-3 text-left transition ${
              selectedMethod === "NEQUI"
                ? "border-green-600 bg-green-50 ring-1 ring-green-200"
                : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <PaymentImageLogo
                  src={PAYMENT_LOGO.nequi.src}
                  alt="Nequi"
                  width={PAYMENT_LOGO.nequi.width}
                  height={PAYMENT_LOGO.nequi.height}
                  scale={PAYMENT_LOGO.nequi.scale}
                  translateX={PAYMENT_LOGO.nequi.translateX}
                  translateY={PAYMENT_LOGO.nequi.translateY}
                />

                <div className="min-w-0 flex-1 pt-1">
                  <div className="text-sm font-extrabold text-gray-900">NEQUI</div>
                  <div className="mt-1 text-xs leading-snug text-gray-600">
                    Pago directo. Recibirás la aprobación en tu app Nequi.
                  </div>

                  {selectedMethod === "NEQUI" ? (
                    <div className="mt-3">
                      <label className="text-[11px] font-bold text-gray-700">
                        Celular Nequi
                      </label>
                      <input
                        value={nequiPhone}
                        onChange={(e) => setNequiPhone(cleanPhone(e.target.value))}
                        inputMode="numeric"
                        placeholder="Ej: 3991111111 en sandbox"
                        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-green-600 focus:ring-1 focus:ring-green-200"
                      />
                      <div className="mt-1 text-[11px] text-gray-500">
                        Sandbox aprobado: <span className="font-bold">3991111111</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div
                className={`mt-2 h-5 w-5 shrink-0 rounded-full border-2 ${
                  selectedMethod === "NEQUI"
                    ? "border-green-600 bg-green-600"
                    : "border-gray-300 bg-white"
                }`}
              />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMethod("WOMPI")}
            className={`w-full rounded-2xl border p-3 text-left transition ${
              selectedMethod === "WOMPI"
                ? "border-green-600 bg-green-50 ring-1 ring-green-200"
                : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <PaymentImageLogo
                  src={PAYMENT_LOGO.wompi.src}
                  alt="Wompi"
                  width={PAYMENT_LOGO.wompi.width}
                  height={PAYMENT_LOGO.wompi.height}
                  scale={PAYMENT_LOGO.wompi.scale}
                  translateX={PAYMENT_LOGO.wompi.translateX}
                  translateY={PAYMENT_LOGO.wompi.translateY}
                />

                <div className="min-w-0 flex-1 pt-1">
                  <div className="text-sm font-extrabold text-gray-900">WOMPI</div>
                  <div className="mt-1 text-xs leading-snug text-gray-600">
                    Paga con tarjeta, PSE, Nequi u otros métodos disponibles en Wompi.
                  </div>
                </div>
              </div>

              <div
                className={`mt-2 h-5 w-5 shrink-0 rounded-full border-2 ${
                  selectedMethod === "WOMPI"
                    ? "border-green-600 bg-green-600"
                    : "border-gray-300 bg-white"
                }`}
              />
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!walletSelectable) return;
              setSelectedMethod("WALLET");
            }}
            disabled={!walletSelectable}
            className={`w-full rounded-2xl border p-3 text-left transition ${
              selectedMethod === "WALLET"
                ? "border-green-600 bg-green-50 ring-1 ring-green-200"
                : walletSelectable
                  ? "border-gray-200 bg-white hover:bg-gray-50"
                  : "border-gray-200 bg-gray-50 opacity-80"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <PaymentImageLogo
                  src={PAYMENT_LOGO.wallet.src}
                  alt="KroniX Wallet"
                  width={PAYMENT_LOGO.wallet.width}
                  height={PAYMENT_LOGO.wallet.height}
                  scale={PAYMENT_LOGO.wallet.scale}
                  translateX={PAYMENT_LOGO.wallet.translateX}
                  translateY={PAYMENT_LOGO.wallet.translateY}
                />

                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-extrabold text-gray-900">Saldo KroniX</div>

                    {walletLoading ? (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">
                        Consultando...
                      </span>
                    ) : walletSelectable ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">
                        Disponible
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                        Saldo insuficiente
                      </span>
                    )}
                  </div>

                  <div className="mt-2 text-xs text-gray-600">
                    Saldo disponible:{" "}
                    <span className="font-extrabold text-gray-900">
                      {walletLoading ? "Consultando..." : formatCOP(walletAvailableCOP)}
                    </span>
                  </div>

                  {!walletLoading && walletIsActive && !walletCoversTotal ? (
                    <div className="mt-2 text-xs font-semibold text-red-600">
                      Te faltan {formatCOP(walletShortfallCOP)} para pagar este pedido con saldo.
                    </div>
                  ) : null}

                  {!walletLoading && walletSelectable ? (
                    <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-[11px] font-semibold text-emerald-800">
                      Después del pago te quedarían {formatCOP(walletRemainingAfterPayCOP)} disponibles.
                    </div>
                  ) : null}
                </div>
              </div>

              <div
                className={`mt-2 h-5 w-5 shrink-0 rounded-full border-2 ${
                  selectedMethod === "WALLET"
                    ? "border-green-600 bg-green-600"
                    : "border-gray-300 bg-white"
                }`}
              />
            </div>
          </button>
        </div>
      ) : null}

      {vm.payError ? <div className="mt-3 text-sm font-semibold text-red-600">{vm.payError}</div> : null}
      {wompiError ? <div className="mt-3 text-sm font-semibold text-red-600">{wompiError}</div> : null}

      {vm.normalizedFlow === "STORE_CONFIRMED" ? (
        <button
          disabled={!vm.canPayNow || wompiLoading || (selectedMethod === "WALLET" && !walletSelectable)}
          onClick={handleMainPay}
          className="mt-3 w-full rounded-2xl bg-green-600 py-3 text-sm font-extrabold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {vm.paying || wompiLoading ? "Procesando pago…" : "PAGAR AHORA"}
        </button>
      ) : vm.normalizedFlow === "PAYMENT_FAILED" ? (
        <button
          disabled={!vm.canRetry || wompiLoading || (selectedMethod === "WALLET" && !walletSelectable)}
          onClick={handleMainPay}
          className="mt-3 w-full rounded-2xl bg-green-600 py-3 text-sm font-extrabold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {vm.paying || wompiLoading ? "Procesando…" : "REINTENTAR PAGO"}
        </button>
      ) : vm.normalizedFlow === "PAYMENT_PENDING" ? (
        <div className="mt-3 rounded-2xl bg-gray-50 p-3 text-xs text-gray-700 ring-1 ring-gray-200">
          Procesando pago… estamos consultando a Wompi.
        </div>
      ) : vm.order!.payment?.status === "PAID" ||
        vm.normalizedFlow === "PAID" ||
        vm.normalizedFlow === "PREPARING" ||
        vm.normalizedFlow === "EN_ROUTE" ||
        vm.normalizedFlow === "DELIVERED" ? (
        <div className="mt-3 rounded-2xl bg-green-50 p-3 text-xs text-green-800 ring-1 ring-green-200">
          <div className="font-extrabold">Pago exitoso</div>
          <div className="mt-1">
            Método: <span className="font-semibold">{paidMethod}</span>
          </div>
          {paymentReference ? (
            <div className="mt-1">
              Referencia: <span className="font-semibold">{paymentReference}</span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 rounded-2xl bg-gray-50 p-3 text-xs text-gray-700 ring-1 ring-gray-200">
          El pago se habilitará cuando el negocio confirme tu pedido.
        </div>
      )}
    </div>
  );
}