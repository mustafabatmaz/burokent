import { notFound } from "next/navigation";

// Any address under a language that no page matches gets the translated 404, inside the site layout
export default function CatchAll() {
  notFound();
}
