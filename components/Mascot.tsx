export type Mood = "idle" | "happy" | "wink" | "think" | "sad";

const CY = "#4de1ff";

/** The Zuri helper: a friendly white robot with a dark screen face and a gold Z badge on its chest. The face changes with the mood. */
export function Mascot({ mood = "idle", size = 56, float = true }: { mood?: Mood; size?: number; float?: boolean }) {
  const shift: Record<Mood, [number, number]> = { idle: [0, 0], happy: [0, 0], wink: [0, 0], think: [4, -3], sad: [0, 2] };
  const [px, py] = shift[mood];
  const eye = (cx: number) => <ellipse className="hm-eye" cx={cx + px} cy={38 + py} rx={5} ry={6.5} fill={CY} />;
  const arc = (cx: number) => <path d={`M${cx - 6} 42 Q${cx} 32 ${cx + 6} 42`} fill="none" stroke={CY} strokeWidth={3.4} strokeLinecap="round" />;
  const leftEye = mood === "happy" || mood === "wink" ? arc(38) : eye(38);
  const rightEye = mood === "happy" ? arc(62) : eye(62);
  return (
    <svg className={`hm hm-${mood}${float ? " hm-float" : ""}`} viewBox="0 0 100 130" width={size} height={(size * 130) / 100} aria-hidden="true">
      <defs>
        <linearGradient id="zhWhite" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d3d9e1" />
        </linearGradient>
        <linearGradient id="zhGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e6b968" />
          <stop offset=".55" stopColor="#b8843a" />
          <stop offset="1" stopColor="#8a5f24" />
        </linearGradient>
      </defs>
      <g className="hm-body">
        <g className="hm-arm hm-arm-l">
          <rect x={8} y={80} width={13} height={30} rx={6.5} fill="url(#zhWhite)" stroke="#b4bcc7" strokeWidth={1.2} />
          <circle cx={14.5} cy={111} r={6.2} fill="#eef1f5" stroke="#b4bcc7" strokeWidth={1.2} />
        </g>
        <g className="hm-arm hm-arm-r">
          <rect x={79} y={80} width={13} height={30} rx={6.5} fill="url(#zhWhite)" stroke="#b4bcc7" strokeWidth={1.2} />
          <circle cx={85.5} cy={111} r={6.2} fill="#eef1f5" stroke="#b4bcc7" strokeWidth={1.2} />
        </g>
        <rect x={24} y={72} width={52} height={48} rx={22} fill="url(#zhWhite)" stroke="#b4bcc7" strokeWidth={1.4} />
        <path d="M34 108 Q50 114 66 108" fill="none" stroke="#c3cad4" strokeWidth={1.4} strokeLinecap="round" />
        <circle cx={50} cy={95} r={10.5} fill="url(#zhGold)" stroke="#6f4c1a" strokeWidth={1} />
        <text x={50} y={100} textAnchor="middle" fontSize={14} fontWeight={800} fontFamily="Georgia, serif" fill="#fff8e8">Z</text>
        <rect x={42} y={66} width={16} height={8} rx={3} fill="#aeb6c0" />
        <g className="hm-head">
          <line x1={50} y1={5} x2={50} y2={15} stroke="#aeb6c0" strokeWidth={2.4} strokeLinecap="round" />
          <circle className="hm-ant" cx={50} cy={5} r={3.6} fill="url(#zhGold)" stroke="#6f4c1a" strokeWidth={0.8} />
          <ellipse cx={10} cy={42} rx={5} ry={10} fill="#cfd5dc" stroke="#b4bcc7" strokeWidth={1.2} />
          <ellipse cx={90} cy={42} rx={5} ry={10} fill="#cfd5dc" stroke="#b4bcc7" strokeWidth={1.2} />
          <rect x={13} y={14} width={74} height={56} rx={27} fill="url(#zhWhite)" stroke="#b4bcc7" strokeWidth={1.4} />
          <rect x={21} y={21} width={58} height={40} rx={18} fill="#0c1727" />
          <path d="M27 28 Q40 22 52 24" fill="none" stroke="#fff" strokeOpacity={0.22} strokeWidth={2.4} strokeLinecap="round" />
          {mood === "sad" ? (
            <>
              <path d="M31 31 L44 27" stroke={CY} strokeWidth={2.2} strokeLinecap="round" />
              <path d="M56 27 L69 31" stroke={CY} strokeWidth={2.2} strokeLinecap="round" />
            </>
          ) : null}
          {leftEye}
          {rightEye}
          {mood === "happy" || mood === "wink" ? (
            <>
              <circle cx={28} cy={50} r={4} fill="#ff8a96" opacity={0.5} />
              <circle cx={72} cy={50} r={4} fill="#ff8a96" opacity={0.5} />
            </>
          ) : null}
          {mood === "idle" ? <path d="M44 50 Q50 55 56 50" fill="none" stroke={CY} strokeWidth={2.6} strokeLinecap="round" /> : null}
          {mood === "wink" ? <path d="M43 49 Q50 57 57 49" fill="none" stroke={CY} strokeWidth={2.8} strokeLinecap="round" /> : null}
          {mood === "happy" ? <path d="M42 48 Q50 61 58 48 Z" fill={CY} stroke={CY} strokeWidth={1.4} strokeLinejoin="round" /> : null}
          {mood === "think" ? <ellipse cx={53} cy={52} rx={2.6} ry={3} fill="none" stroke={CY} strokeWidth={2.2} /> : null}
          {mood === "sad" ? (
            <>
              <path d="M44 55 Q50 49 56 55" fill="none" stroke={CY} strokeWidth={2.6} strokeLinecap="round" />
              <path className="hm-tear" d="M33 46 Q29.5 52 33 55 Q36.5 52 33 46 Z" fill="#a8ecff" />
            </>
          ) : null}
        </g>
      </g>
      {mood === "happy" ? (
        <g fill="#e6b968">
          <path className="hm-spark hm-s1" d="M4 22 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" />
          <path className="hm-spark hm-s2" d="M92 14 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z" />
          <path className="hm-spark hm-s3" d="M95 62 l1.4 3.4 3.4 1.4 -3.4 1.4 -1.4 3.4 -1.4 -3.4 -3.4 -1.4 3.4 -1.4z" />
        </g>
      ) : null}
      {mood === "think" ? (
        <g fill="#e6b968">
          <circle className="hm-dot hm-d1" cx={84} cy={14} r={1.8} />
          <circle className="hm-dot hm-d2" cx={90} cy={8} r={2.4} />
          <circle className="hm-dot hm-d3" cx={96} cy={0} r={3} />
        </g>
      ) : null}
    </svg>
  );
}
