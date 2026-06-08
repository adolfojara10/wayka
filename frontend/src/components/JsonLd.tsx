/**
 * `<JsonLd>` — server component emitting a Schema.org JSON-LD
 * `<script type="application/ld+json">` block.
 *
 * Serializes the supplied object with JSON.stringify. The
 * `dangerouslySetInnerHTML` is safe here because we control the
 * input shape (typed object from `lib/jsonld.ts`) and JSON.stringify
 * cannot produce `</script>` — it would be escaped as `\\u003c/script>`.
 */

interface JsonLdProps {
  data: unknown;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      data-testid="jsonld"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
