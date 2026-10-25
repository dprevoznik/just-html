import { instanceContent } from "@/lib/instance";
import spec from "@/lib/openapi/generated.json";

export const dynamic = "force-static";

const BODY = instanceContent(JSON.stringify(spec));

export function GET(): Response {
  return new Response(BODY, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
