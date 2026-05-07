//app\(buyer)\wallet\page.tsx
"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useBuyerCity } from "@/components/buyer/CityContext";

type WalletResponse = {
  ok: boolean;
  wallet: {
    id: string;
    userId: string;
    cityId: string;
    cashBalanceCOP: number;
    bonusBalanceCOP: number;
    totalAvailableCOP: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
};

type WalletTransactionItem = {
  id: string;
  walletId: string;
  userId: string;
  cityId: string;
  orderId?: string | null;
  createdByAdminId?: string | null;
  type: string;
  bucket: string;
  amountCOP: number;
  cashBalanceAfterCOP: number;
  bonusBalanceAfterCOP: number;
  reference?: string | null;
  note?: string | null;
  createdAt: string;
};

type WalletTransactionsResponse = {
  ok: boolean;
  wallet: {
    id: string;
    userId: string;
    cityId: string;
    cashBalanceCOP: number;
    bonusBalanceCOP: number;
    totalAvailableCOP: number;
  };
  items: WalletTransactionItem[];
};

type WompiWalletSignatureResponse = {
  ok?: boolean;
  reference: string;
  amountInCents: number;
  currency: "COP";
  signature: string;
  publicKey: string;
};

type WompiWalletVerifyResponse = {
  ok?: boolean;
  status?: string;
  recharge?: any;
};

type WalletRechargeItem = {
  id: string;

  provider: string;

  status: string;

  amountCOP: number;

  amountInCents: number;

  currency: string;

  reference: string;

  wompiTransactionId?: string | null;

  wompiPaymentMethod?: string | null;

  wompiStatus?: string | null;

  approvedAt?: string | null;

  rejectedAt?: string | null;

  verifiedAt?: string | null;

  errorMessage?: string | null;

  createdAt: string;

  updatedAt: string;
};

type WalletRechargesResponse = {
  ok: boolean;
  items: WalletRechargeItem[];
};

type PendingWalletRecharge = {
  reference: string;
  cityId: string;
  amountCOP: number;
  createdAt: string;
};

const MIN_RECHARGE_COP = 20000;
const PENDING_RECHARGE_KEY = "kronix:wallet:pendingRecharge:v1";

const bankLogos = [
  { name: "Bancolombia", src: "/branding/payments/bancolombia.png", fallback: "BC" },
  { name: "Davivienda", src: "/branding/payments/davivienda.png", fallback: "DV" },
  { name: "Nequi", src: "/branding/payments/nequi.png", fallback: "NQ" },
  { name: "Banco de Bogotá", src: "/branding/payments/banco-bogota.png", fallback: "BB" },
  { name: "Wompi", src: "/branding/payments/wompi.png", fallback: "WP" },
];

function formatCOP(value?: number | null) {
  return Number(value ?? 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getTransactionTitle(item: WalletTransactionItem) {
  const type = String(item.type ?? "").toUpperCase();

  if (type === "RECHARGE_REAL") return "Recarga Wompi";
  if (type === "RECHARGE_WOMPI") return "Recarga Wompi";
  if (type === "RECHARGE_MOCK") return "Recarga mock";
  if (type === "ORDER_PAYMENT") return "Pago de pedido";
  if (type === "PROMO_BONUS") return "Bono promocional";
  if (type === "ADMIN_ADJUSTMENT") return "Ajuste administrativo";
  if (type === "REFUND") return "Reembolso";

  return type || "Movimiento";
}

function getTransactionTone(item: WalletTransactionItem) {
  const amount = Number(item.amountCOP ?? 0);
  const type = String(item.type ?? "").toUpperCase();

  if (type === "ORDER_PAYMENT" || amount < 0) {
    return {
      chip: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
      amount: "text-rose-700",
      sign: "-",
      label: "Salida",
    };
  }

  return {
    chip: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    amount: "text-emerald-700",
    sign: "+",
    label: "Ingreso",
  };
}

function getRechargeTone(statusRaw?: string | null) {
  const status = String(statusRaw ?? "").toUpperCase();

  if (status === "APPROVED") {
    return {
      chip: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
      label: "Aprobada",
      amount: "text-emerald-700",
    };
  }

  if (status === "DECLINED") {
    return {
      chip: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
      label: "Rechazada",
      amount: "text-rose-700",
    };
  }

  if (status === "ERROR") {
    return {
      chip: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
      label: "Error",
      amount: "text-rose-700",
    };
  }

  return {
    chip: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    label: "Pendiente",
    amount: "text-amber-700",
  };
}

function readPendingRecharge(): PendingWalletRecharge | null {
  try {
    const raw = localStorage.getItem(PENDING_RECHARGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PendingWalletRecharge;
    if (!parsed?.reference || !parsed?.cityId) return null;

    return parsed;
  } catch {
    return null;
  }
}

function savePendingRecharge(item: PendingWalletRecharge) {
  localStorage.setItem(PENDING_RECHARGE_KEY, JSON.stringify(item));
}

function clearPendingRecharge(reference?: string) {
  const current = readPendingRecharge();

  if (!reference || current?.reference === reference) {
    localStorage.removeItem(PENDING_RECHARGE_KEY);
  }
}

export default function WalletPage() {
  const { city } = useBuyerCity();

  const [wallet, setWallet] = useState<WalletResponse["wallet"] | null>(null);
  const [transactions, setTransactions] = useState<WalletTransactionItem[]>([]);
  const [recharges, setRecharges] = useState<WalletRechargeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [recharging, setRecharging] = useState(false);
  const [checkingPending, setCheckingPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<string>("");

  const wompiScriptLoadedRef = useRef(false);
  const recoveringRef = useRef(false);

  const effectiveAmount = useMemo(() => {
    const amount = Math.round(Number(customAmount || 0));
    if (Number.isFinite(amount) && amount > 0) return amount;
    return 0;
  }, [customAmount]);

  const isRechargeAmountValid = effectiveAmount >= MIN_RECHARGE_COP;

  const rechargeHint = useMemo(() => {
    if (!customAmount) return `Recarga mínima ${formatCOP(MIN_RECHARGE_COP)}`;
    if (!isRechargeAmountValid) return `El mínimo permitido es ${formatCOP(MIN_RECHARGE_COP)}`;
    return "Monto listo para recargar";
  }, [customAmount, isRechargeAmountValid]);

  const combinedHistory = useMemo(() => {
  const rechargeReferences = new Set(
    recharges
      .map((item) => String(item.reference ?? "").trim())
      .filter(Boolean)
  );

  const txItems = transactions
    .filter((item) => {
      const type = String(item.type ?? "").toUpperCase();
      const reference = String(item.reference ?? "").trim();

      if (
        (type === "RECHARGE_REAL" || type === "RECHARGE_WOMPI") &&
        reference &&
        rechargeReferences.has(reference)
      ) {
        return false;
      }

      return true;
    })
    .map((item) => ({
      type: "transaction",
      createdAt: item.createdAt,
      data: item,
    }));

  const rechargeItems = recharges.map((item) => ({
    type: "recharge",
    createdAt: item.approvedAt || item.createdAt,
    data: item,
  }));

  return [...txItems, ...rechargeItems].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );
}, [transactions, recharges]);

  const stats = useMemo(() => {
    const income = transactions
      .filter((item) => Number(item.amountCOP ?? 0) > 0)
      .reduce((acc, item) => acc + Math.abs(Number(item.amountCOP ?? 0)), 0);

    const expenses = transactions
      .filter(
        (item) =>
          Number(item.amountCOP ?? 0) < 0 ||
          String(item.type ?? "").toUpperCase() === "ORDER_PAYMENT"
      )
      .reduce((acc, item) => acc + Math.abs(Number(item.amountCOP ?? 0)), 0);

    return {
      moves: transactions.length,
      income,
      expenses,
    };
  }, [transactions]);

  const loadAll = useCallback(async () => {
    if (!city?.id) {
      setWallet(null);
      setTransactions([]);
      setLoading(false);
      setError("No se ha seleccionado ciudad.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [walletRes, txRes, rechargeRes] = await Promise.all([
  apiFetch<WalletResponse>(
    `/wallet/me?cityId=${encodeURIComponent(city.id)}`,
    {
      method: "GET",
    }
  ),

  apiFetch<WalletTransactionsResponse>(
    `/wallet/me/transactions?limit=20&cityId=${encodeURIComponent(city.id)}`,
    {
      method: "GET",
    }
  ),

  apiFetch<WalletRechargesResponse>(
    `/wallet/me/recharges?limit=20&cityId=${encodeURIComponent(city.id)}`,
    {
      method: "GET",
    }
  ),
]);

      setWallet(walletRes?.wallet ?? null);
      setTransactions(Array.isArray(txRes?.items) ? txRes.items : []);
      setRecharges(
  Array.isArray(rechargeRes?.items)
    ? rechargeRes.items
    : []
);
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar tu saldo KroniX.");
    } finally {
      setLoading(false);
    }
  }, [city?.id]);

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

  async function verifyWalletRecharge(reference: string, transactionId?: string) {
    return apiFetch<WompiWalletVerifyResponse>("/wallet/me/wompi-verify", {
      method: "POST",
      suppressSessionExpiredEvent: true,
      json: {
        reference,
        transactionId: transactionId || undefined,
      },
    });
  }

  async function pollVerifyWalletRecharge(reference: string, transactionId?: string) {
    setCheckingPending(true);
    setStatusMessage("Verificando recarga con Wompi...");

    for (let i = 1; i <= 24; i++) {
      const verify = await verifyWalletRecharge(reference, transactionId);

      if (verify?.ok) {
        clearPendingRecharge(reference);
        setCustomAmount("");
        setStatusMessage("Recarga aprobada. Saldo actualizado.");
        await loadAll();
        setCheckingPending(false);
        return true;
      }

      const status = String(verify?.status ?? "").toUpperCase();

      if (["DECLINED", "ERROR", "VOIDED", "FAILED"].includes(status)) {
        clearPendingRecharge(reference);
        setError("La recarga fue rechazada por Wompi.");
        setStatusMessage(null);
        setCheckingPending(false);
        return false;
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    setError("La recarga sigue pendiente. Si Wompi ya la aprobó, toca Actualizar en unos segundos.");
    setStatusMessage(null);
    setCheckingPending(false);
    return false;
  }

  async function recoverPendingRecharge(silent = false) {
    if (recoveringRef.current) return false;
    if (!city?.id) return false;

    const pending = readPendingRecharge();

    if (!pending?.reference) return false;
    if (pending.cityId !== city.id) return false;

    recoveringRef.current = true;

    if (!silent) {
      setCheckingPending(true);
      setStatusMessage(`Verificando recarga pendiente ${formatCOP(pending.amountCOP)}...`);
      setError(null);
    }

    try {
      const ok = await pollVerifyWalletRecharge(pending.reference);
      return ok;
    } catch (err: any) {
      if (!silent) {
        setError(err?.message || "No se pudo verificar la recarga pendiente.");
      }
      return false;
    } finally {
      recoveringRef.current = false;
      setCheckingPending(false);
    }
  }

  async function refreshWalletAndRecover() {
    await recoverPendingRecharge(false);
    await loadAll();
  }

  useEffect(() => {
    if (city?.id) {
      loadAll().then(() => {
        recoverPendingRecharge(true);
      });
    } else {
      setWallet(null);
      setTransactions([]);
      setLoading(false);
      setError("No se ha seleccionado ciudad.");
    }
  }, [city?.id, loadAll]);

  useEffect(() => {
    function onFocus() {
      recoverPendingRecharge(true);
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        recoverPendingRecharge(true);
      }
    }

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [city?.id]);

  function handleAmountChange(value: string) {
    setCustomAmount(value.replace(/\D/g, ""));
  }

  async function handleWompiRecharge() {
    if (!city?.id) {
      setError("No se ha seleccionado ciudad.");
      return;
    }

    if (!isRechargeAmountValid) {
      setError(`El valor mínimo de recarga es ${formatCOP(MIN_RECHARGE_COP)}.`);
      return;
    }

    setRecharging(true);
    setError(null);
    setStatusMessage("Preparando recarga segura con Wompi...");

    try {
      const sig = await apiFetch<WompiWalletSignatureResponse>("/wallet/me/wompi-signature", {
        method: "POST",
        suppressSessionExpiredEvent: true,
        json: {
          cityId: city.id,
          amountCOP: effectiveAmount,
        },
      });

      savePendingRecharge({
        reference: sig.reference,
        cityId: city.id,
        amountCOP: effectiveAmount,
        createdAt: new Date().toISOString(),
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

      setStatusMessage("Completa la recarga en Wompi. Al volver, KroniX verificará el pago.");
      setRecharging(false);

      checkout.open(async (result: any) => {
        setCheckingPending(true);
        setStatusMessage("Procesando pago... estamos confirmando tu recarga con Wompi.");

        try {
          const transaction =
            result?.transaction ?? result?.data?.transaction ?? result?.data ?? null;

          const status = String(transaction?.status ?? result?.status ?? "").toUpperCase();

          const transactionId = String(
            transaction?.id ?? result?.transactionId ?? result?.id ?? ""
          ).trim();

          if (status === "APPROVED") {
            await pollVerifyWalletRecharge(sig.reference, transactionId);
            return;
          }

          if (["DECLINED", "ERROR", "VOIDED"].includes(status)) {
            clearPendingRecharge(sig.reference);
            setError("La recarga fue rechazada por Wompi.");
            setStatusMessage(null);
            return;
          }

          setStatusMessage("Pago recibido. Esperando confirmación segura de Wompi...");

          await new Promise((resolve) => setTimeout(resolve, 4000));

await pollVerifyWalletRecharge(
  sig.reference,
  transactionId || undefined
);
        } catch (err: any) {
          setError(err?.message || "No se pudo verificar la recarga con Wompi.");
          setStatusMessage(null);
        } finally {
          setCheckingPending(false);
          setRecharging(false);
        }
      });
    } catch (err: any) {
      setError(err?.message || "No se pudo iniciar la recarga con Wompi.");
      setStatusMessage(null);
      setRecharging(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto w-full max-w-md px-4 py-4">
        <div className="space-y-4">
          <div>
            <h1 className="text-[18px] font-black text-slate-900">Saldo KroniX</h1>
            <p className="mt-1 text-[13px] text-slate-600">
              Consulta tu saldo disponible, recarga créditos y revisa tus movimientos.
            </p>
            <p className="mt-1 text-[12px] font-semibold text-slate-500">
              Ciudad activa: {city?.name ? city.name : "No seleccionada"}
            </p>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                  Disponible
                </div>
                <div className="mt-3 text-[34px] font-black leading-none text-slate-900">
                  {loading ? "..." : formatCOP(wallet?.totalAvailableCOP ?? 0)}
                </div>
              </div>

              <div
                className={[
                  "rounded-full px-3 py-1 text-[11px] font-extrabold",
                  wallet?.isActive === false
                    ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                    : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
                ].join(" ")}
              >
                {wallet?.isActive === false ? "Inactiva" : "Activa"}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                  Recargado
                </div>
                <div className="mt-1 text-[16px] font-black text-slate-900">
                  {loading ? "..." : formatCOP(wallet?.cashBalanceCOP ?? 0)}
                </div>
              </div>

              <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                  Bono
                </div>
                <div className="mt-1 text-[16px] font-black text-slate-900">
                  {loading ? "..." : formatCOP(wallet?.bonusBalanceCOP ?? 0)}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="rounded-[18px] border border-slate-200 bg-white px-3 py-3">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                  Movs.
                </div>
                <div className="mt-1 text-[16px] font-black text-slate-900">
                  {loading ? "..." : stats.moves}
                </div>
              </div>

              <div className="rounded-[18px] border border-slate-200 bg-white px-3 py-3">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                  Ingresos
                </div>
                <div className="mt-1 text-[13px] font-black text-emerald-700">
                  {loading ? "..." : formatCOP(stats.income)}
                </div>
              </div>

              <div className="rounded-[18px] border border-slate-200 bg-white px-3 py-3">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                  Pagos
                </div>
                <div className="mt-1 text-[13px] font-black text-rose-700">
                  {loading ? "..." : formatCOP(stats.expenses)}
                </div>
              </div>
            </div>
          </div>

          {statusMessage ? (
            <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-semibold text-emerald-800">
              {statusMessage}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-semibold text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[16px] font-black text-slate-900">Recargar saldo</div>
              </div>

              <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-extrabold text-slate-600 ring-1 ring-slate-200">
                Wallet KroniX
              </div>
            </div>

            <div className="mt-4">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={customAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="Ej: 50000"
                className={[
                  "h-[52px] w-full rounded-[18px] border bg-white px-4 text-[16px] font-black outline-none transition",
                  customAmount && !isRechargeAmountValid
                    ? "border-rose-200 text-rose-700 focus:ring-2 focus:ring-rose-100"
                    : "border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-200",
                ].join(" ")}
              />

              <div
                className={[
                  "mt-2 text-[12px] font-bold",
                  customAmount && !isRechargeAmountValid ? "text-rose-600" : "text-slate-500",
                ].join(" ")}
              >
                {rechargeHint}
              </div>
            </div>

            <div className="mt-4 rounded-[18px] bg-slate-950 px-3 py-3">
              <div className="grid grid-cols-5 gap-2">
                {bankLogos.map((bank) => (
                  <div
                    key={bank.name}
                    className="flex h-[54px] items-center justify-center rounded-[12px] border-2 border-emerald-500 bg-white px-2 shadow-sm"
                    title={bank.name}
                  >
                    <Image
                      src={bank.src}
                      alt={bank.name}
                      width={90}
                      height={90}
                      className="max-h-[80px] w-auto object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <span className="sr-only">{bank.fallback}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleWompiRecharge}
              disabled={recharging || checkingPending || loading || !city?.id || !isRechargeAmountValid}
              className="mt-3 w-full rounded-[20px] bg-emerald-600 py-3 text-[15px] font-extrabold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {recharging || checkingPending
                ? "Verificando recarga..."
                : `Recargar ${formatCOP(effectiveAmount || 0)}`}
            </button>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[16px] font-black text-slate-900">Historial</div>
                  <div className="mt-1 text-[13px] text-slate-500">
                    Tus movimientos más recientes.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={refreshWalletAndRecover}
                  disabled={loading || recharging || checkingPending || !city?.id}
                  className="rounded-[14px] border border-slate-200 bg-white px-3 py-2 text-[12px] font-extrabold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Actualizar
                </button>
              </div>
            </div>

            <div className="p-4">
  {loading ? (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-6 text-center text-[14px] font-semibold text-slate-500">
      Cargando movimientos...
    </div>
  ) : combinedHistory.length === 0 ? (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-6 text-center text-[14px] font-semibold text-slate-500">
      Aún no tienes movimientos en tu wallet.
    </div>
  ) : (
    <div className="space-y-3">
      {combinedHistory.map((entry) => {
        if (entry.type === "recharge") {
          const recharge = entry.data as WalletRechargeItem;
          const tone = getRechargeTone(recharge.status);

          return (
            <div
              key={`recharge-${recharge.id}`}
              className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-[14px] font-extrabold text-slate-900">
                      Recarga Wompi
                    </div>

                    <span
                      className={[
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold",
                        tone.chip,
                      ].join(" ")}
                    >
                      {tone.label}
                    </span>

                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-600 ring-1 ring-slate-200">
                      WOMPI
                    </span>
                  </div>

                  <div className="mt-1 text-[12px] text-slate-500">
                    {formatDate(recharge.createdAt)}
                  </div>

                  <div className="mt-2 text-[12px] text-slate-500">
                    Ref:{" "}
                    <span className="font-semibold text-slate-700">
                      {recharge.reference}
                    </span>
                  </div>

                  {recharge.wompiTransactionId ? (
                    <div className="mt-1 text-[12px] text-slate-500">
                      Tx:{" "}
                      <span className="font-semibold text-slate-700">
                        {recharge.wompiTransactionId}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div
                  className={[
                    "shrink-0 text-right text-[15px] font-black",
                    tone.amount,
                  ].join(" ")}
                >
                  +{formatCOP(recharge.amountCOP)}
                </div>
              </div>
            </div>
          );
        }

        const item = entry.data as WalletTransactionItem;
        const tone = getTransactionTone(item);
        const absoluteAmount = Math.abs(Number(item.amountCOP ?? 0));

        return (
          <div
            key={`transaction-${item.id}`}
            className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[14px] font-extrabold text-slate-900">
                    {getTransactionTitle(item)}
                  </div>

                  <span
                    className={[
                      "inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold",
                      tone.chip,
                    ].join(" ")}
                  >
                    {tone.label}
                  </span>

                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-600 ring-1 ring-slate-200">
                    {String(item.bucket ?? "").toUpperCase()}
                  </span>
                </div>

                <div className="mt-1 text-[12px] text-slate-500">
                  {formatDate(item.createdAt)}
                </div>

                {item.reference ? (
                  <div className="mt-2 text-[12px] text-slate-500">
                    Ref:{" "}
                    <span className="font-semibold text-slate-700">
                      {item.reference}
                    </span>
                  </div>
                ) : null}

                {item.note ? (
                  <div className="mt-2 text-[13px] leading-5 text-slate-700">
                    {item.note}
                  </div>
                ) : null}

                <div className="mt-2 text-[12px] text-slate-500">
                  Cash: {formatCOP(item.cashBalanceAfterCOP)} · Bono:{" "}
                  {formatCOP(item.bonusBalanceAfterCOP)}
                </div>
              </div>

              <div
                className={[
                  "shrink-0 text-right text-[15px] font-black",
                  tone.amount,
                ].join(" ")}
              >
                {tone.sign}
                {formatCOP(absoluteAmount)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}