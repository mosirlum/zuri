/**
 * Renders text with *asterisks* wrapping converted to gold italic spans.
 * Also supports <br/> tags via dangerouslySetInnerHTML splitting.
 *
 * Example: "Hello *world*" → "Hello <em class=highlight>world</em>"
 */

export default function Highlight({ text }: { text: string }) {
  // Split first by <br/> then handle asterisks per line
  const lines = text.split(/<br\s*\/?>/i);

  return (
    <>
      {lines.map((line, lineIdx) => {
        const parts = line.split(/\*([^*]+)\*/g);
        return (
          <span key={lineIdx}>
            {parts.map((part, i) =>
              i % 2 === 1 ? (
                <em key={i} className="highlight">
                  {part}
                </em>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
            {lineIdx < lines.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
}
