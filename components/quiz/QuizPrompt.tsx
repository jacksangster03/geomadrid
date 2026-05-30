interface QuizPromptProps {
  targetName: string;
  hoveredName: string | null;
  showHoverName: boolean;
}

export default function QuizPrompt({
  targetName,
  hoveredName,
  showHoverName,
}: QuizPromptProps) {
  return (
    <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-100 shrink-0">
      <div className="flex-1 text-center">
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">
          Find this municipality
        </p>
        <p className="text-xl font-bold text-slate-900 leading-tight">
          {targetName}
        </p>
      </div>
      {showHoverName && hoveredName && (
        <div className="absolute right-5 top-1/2 -translate-y-1/2">
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
            {hoveredName}
          </span>
        </div>
      )}
    </div>
  );
}
