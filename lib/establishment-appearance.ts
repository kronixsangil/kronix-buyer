/** Presentation contract shared by native and web. Existing businesses keep their settings. */
export function establishmentAppearance(p: any = {}) {
  const vibrant = p.theme === "VIBRANT";
  const valid = (v: any, fallback: string) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
  return {
    kronix: p.style === "KRONIX",
    primary: valid(p.primaryColor, vibrant ? "#6415C5" : "#008C99"),
    secondary: valid(p.secondaryColor, vibrant ? "#350071" : "#0A3566"),
    background: valid(p.backgroundColor, vibrant ? "#F8EBFF" : "#F8FAFC"),
    text: valid(p.textColor, vibrant ? "#11142D" : "#0F172A"),
    accent: valid(p.accentColor, vibrant ? "#FDE047" : "#FFFFFF"),
    categoryLabel: (key: string) => (Object.prototype.hasOwnProperty.call(p.categoryLabels??{},key) && typeof p.categoryLabels[key] === "string" && p.categoryLabels[key].trim() ? p.categoryLabels[key] : "") || (/^\d+$/.test(key) ? new Intl.NumberFormat("es-CO", {style:"currency",currency:"COP",maximumFractionDigits:0}).format(Number(key)) : key === "ESPECIALES" ? "Especiales" : key),
    title: p.menuTitle || "",
    headline: p.headerText || "Haz tu pedido",
    announcementLabel: p.announcementLabel || "Hoy",
    instruction1: p.instruction1 ?? "1. Selecciona una categoría",
    instruction2: p.instruction2 ?? "2. Selecciona los productos que desees",
    specials: p.specialsCategory || "ESPECIALES",
    showCategories: p.showCategories !== false,
  };
}
