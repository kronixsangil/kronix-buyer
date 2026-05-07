//app\(buyer)\tracking\[orderId]\_tracking\TrackingRatingCard.tsx
"use client";

import type { TrackingViewModel } from "./types";
import { getStarButtonClass, normName } from "./utils";

function StarSelector({
  value,
  onChange,
  ariaPrefix,
}: {
  value: number;
  onChange: (v: number) => void;
  ariaPrefix: string;
}) {
  return (
    <div className="mt-1.5 flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const v = i + 1;
        const active = v <= value;
        return (
          <button
            key={`${ariaPrefix}-${v}`}
            type="button"
            onClick={() => onChange(v)}
            className={getStarButtonClass(active)}
            aria-label={`${v} estrellas ${ariaPrefix}`}
          >
            <span className="text-sm font-black">{active ? "★" : "☆"}</span>
          </button>
        );
      })}
    </div>
  );
}

export function TrackingRatingCard({ vm }: { vm: TrackingViewModel }) {
  if (!vm.fromApi || vm.normalizedFlow !== "DELIVERED") return null;

  return (
    <div className={`${vm.CARD_PAD} mt-4`}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-extrabold text-gray-900">Califica tu entrega</div>

        {vm.hasRated ? (
          <span className="rounded-full bg-green-50 px-3 py-1 text-[11px] font-extrabold text-green-700 ring-1 ring-green-200">
            Ya calificaste ✅
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-extrabold text-amber-800 ring-1 ring-amber-200">
            Nuevo
          </span>
        )}
      </div>

      {!vm.ratingLoaded ? (
        <div className="mt-3 text-sm text-gray-600">Cargando…</div>
      ) : vm.hasRated ? (
        <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs text-gray-700 ring-1 ring-slate-200">
          Gracias por tu calificación. 💚
        </div>
      ) : (
        <>
          <div className="mt-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <div className="text-[12px] font-semibold text-gray-800">¿Cómo te fue con tu conductor?</div>

            <StarSelector
              value={vm.driverRatingStars}
              onChange={vm.setDriverRatingStars}
              ariaPrefix="conductor"
            />

            <button
              type="button"
              onClick={() => vm.setDriverCommentOpen((v) => !v)}
              className="mt-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-700 hover:bg-slate-50"
            >
              {vm.driverCommentOpen ? "Ocultar comentario" : "Agregar comentario"}
            </button>

            {vm.driverCommentOpen ? (
              <div className="mt-2">
                <textarea
                  value={vm.driverRatingComment}
                  onChange={(e) => vm.setDriverRatingComment(e.target.value)}
                  placeholder="Cuéntanos cómo fue la atención del conductor..."
                  className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-sm text-gray-900 outline-none ring-0 focus:border-gray-300"
                  rows={3}
                  maxLength={500}
                />
                <div className="mt-1 text-[11px] text-gray-500">{vm.driverRatingComment.length}/500</div>
              </div>
            ) : null}
          </div>

          {vm.storeRatings.length ? (
            <div className="mt-3 space-y-3">
              {vm.storeRatings.map((sr, idx) => (
                <div key={`${sr.storeId}:${idx}`} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="text-[12px] font-semibold text-gray-800">
                    ¿Cómo te fue con la tienda <span className="font-extrabold text-gray-900">{sr.storeName}</span>?
                  </div>

                  <StarSelector
                    value={sr.stars}
                    onChange={(v) =>
                      vm.setStoreRatings((prev) =>
                        prev.map((x) =>
                          normName(x.storeName) === normName(sr.storeName) ? { ...x, stars: v } : x
                        )
                      )
                    }
                    ariaPrefix={`tienda-${sr.storeName}`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      vm.setStoreRatings((prev) =>
                        prev.map((x) =>
                          normName(x.storeName) === normName(sr.storeName)
                            ? { ...x, isCommentOpen: !x.isCommentOpen }
                            : x
                        )
                      )
                    }
                    className="mt-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-700 hover:bg-slate-50"
                  >
                    {sr.isCommentOpen ? "Ocultar reseña" : "Agregar reseña"}
                  </button>

                  {sr.isCommentOpen ? (
                    <div className="mt-2">
                      <textarea
                        value={sr.comment}
                        onChange={(e) =>
                          vm.setStoreRatings((prev) =>
                            prev.map((x) =>
                              normName(x.storeName) === normName(sr.storeName)
                                ? { ...x, comment: e.target.value }
                                : x
                            )
                          )
                        }
                        placeholder="Cuéntanos cómo fue la calidad, presentación o atención de la tienda..."
                        className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-sm text-gray-900 outline-none ring-0 focus:border-gray-300"
                        rows={3}
                        maxLength={500}
                      />
                      <div className="mt-1 text-[11px] text-gray-500">{sr.comment.length}/500</div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {vm.ratingErr ? (
            <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700 ring-1 ring-red-200">
              {vm.ratingErr}
            </div>
          ) : null}

          {vm.ratingMsg ? (
            <div className="mt-3 rounded-2xl bg-green-50 p-3 text-sm font-extrabold text-green-800 ring-1 ring-green-200">
              {vm.ratingMsg}
            </div>
          ) : null}

          <button
            type="button"
            disabled={vm.ratingSending}
            onClick={vm.submitRating}
            className="mt-3 w-full rounded-2xl bg-green-600 py-3 text-sm font-extrabold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {vm.ratingSending ? "Enviando…" : "Enviar calificación"}
          </button>

          <div className="mt-2 text-[11px] text-gray-500">
            Puedes calificar hasta <b>3 días</b> después de la entrega.
          </div>
        </>
      )}
    </div>
  );
}