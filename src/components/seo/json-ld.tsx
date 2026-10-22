/**
 * Renders a JSON-LD graph as a <script type="application/ld+json"> tag.
 *
 * Server component by design: the structured data must be present in the
 * initial HTML, because crawlers that do not execute JS would otherwise see
 * no schema at all.
 *
 * Security: JSON.stringify does NOT escape sequences that can break out of a
 * <script> element, so `</script>` inside any string value would end the tag
 * early and allow injection.
 */
export function JsonLd({ data, id }: { data: Record<string, unknown>; id?: string }) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialize(data) }}
    />
  )
}

/** Code points that are legal in JSON but hazardous inside a <script>. */
const LINE_SEPARATOR = String.fromCharCode(0x2028)
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029)

function serialize(data: Record<string, unknown>): string {
  return (
    JSON.stringify(data)
      // Prevents a value containing "</script>" from closing the tag early.
      .replaceAll('<', '\\u003c')
      // U+2028 and U+2029 are valid JSON but are line terminators in JS
      // source, so an unescaped one truncates the script. Referenced via
      // constants rather than written literally, because a literal U+2028
      // byte in this file would break this module too.
      .replaceAll(LINE_SEPARATOR, '\\u2028')
      .replaceAll(PARAGRAPH_SEPARATOR, '\\u2029')
  )
}
