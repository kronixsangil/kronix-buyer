import Image from "next/image";
export const ICOPOR_PRICE_COP = 1500;
export const LUNCH_DRAFT_KEY = "kronix:lunch:draft:v1";
export const LUNCH_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type LunchDraft = {
  savedAt:number;
  citySlug:string;
  configId?:string;
  step:Step;
  cart:Record<string,number>;
  fulfillment:"DELIVERY"|"PICKUP";
  address:string;
  reference:string;
  deliveryLat:number|null;
  deliveryLng:number|null;
  selectedSavedAddressId:string;
  payRef:string;
  note:string;
};
export type LunchItem = {
  id: string;
  category: string;
  name: string;
  description?: string | null;
  priceCOP: number
}
;
export type LunchData = {
  available: boolean;
  isOpen?: boolean;
  closedPeriod?: "BEFORE_OPEN" | "AFTER_CLOSE" | null;
  config?: {
    id:string;
    serviceTitle?:string;
    serviceSubtitle?:string;
    dailyIncludedText?:string|null;
    openTime:string;
    closeTime:string;
    paymentMethodLabel:string;
    paymentDestination?:string|null;
    store:{
      name:string
    }
  }
  ;
  menu?:{
    title?:string;
    includedText?:string|null;
    items?:LunchItem[]
  }
}
;
export type SavedAddressItem = { id:string; label?:string|null; placeName?:string|null; reference?:string|null; address:string; lat?:number|null; lng?:number|null; isDefault?:boolean; isFavorite?:boolean; };
export type Step = "MENU" | "ORDER" | "PAYMENT";
export const money=(v:number)=>`$ ${Number(v||0).toLocaleString("es-CO")}`;
export const categoryLabel=(c:string)=>c==="ESPECIALES"?"Especiales":money(Number(c));
export const plateDayNames=[
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado"
];

export function LunchFlowHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
}) {
  return (
    <header className="relative overflow-hidden bg-gradient-to-b from-[#350071] via-[#5410b3] to-[#F8EBFF] px-4 pb-8 pt-4 text-white">
      <button
        type="button"
        onClick={onBack}
        className="absolute left-4 top-5 z-20 grid h-9 w-9 place-items-center rounded-full bg-black/20 text-2xl font-black"
        aria-label="Volver"
      >
        ‹
      </button>

      <div className="mx-auto flex min-h-[104px] max-w-[400px] items-center justify-center gap-3 pl-8">
        <div className="relative h-[82px] w-[126px] shrink-0">
          <Image
            src="/lunch/Header/header.png"
            alt="La Fortuna"
            fill
            className="object-contain"
            sizes="126px"
          />
        </div>

        <div className="min-w-0 text-left">
          <div className="text-[22px] font-black leading-tight tracking-tight">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-1 max-w-[190px] text-[12px] font-bold leading-snug text-white/85">
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

