type Props = { text: string };

export function CueDisplay({ text }: Props) {
  return (
    <div className="cue-display" aria-live="polite">
      <div className="cue-display__text">{text}</div>
    </div>
  );
}
