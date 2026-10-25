import { ORIGIN } from "@/lib/auth/config";

/** Adapt upstream discovery examples to this instance. */
export function instanceContent(text: string): string {
  return text.replaceAll("https://justhtml.sh", ORIGIN)
    .replaceAll("npx skills add kernel/just-html -g -y", "npx skills add dprevoznik/just-html -g -y");
}
