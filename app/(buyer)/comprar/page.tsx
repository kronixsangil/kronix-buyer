import { redirect } from "next/navigation";

// La tienda antigua fue retirada. Los establecimientos conservan su flujo propio.
export default function RetiredStorePage() {
  redirect("/");
}
