// app/(buyer)/kronix/recoger/page.tsx
"use client";

import DomicilioExpressStepOne from "@/components/buyer/kronix/DomicilioExpressStepOne";

export default function KronixRecogerPage() {
  return (
    <div className="px-4 pb-4 pt-2">
      <h1 className="mb-2 text-[22px] font-black leading-tight text-slate-950">
        Domicilio Express
      </h1>
      <DomicilioExpressStepOne />
    </div>
  );
}
