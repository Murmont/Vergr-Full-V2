/**
 * TypingIndicator - Animated bouncing dots when someone is typing.
 */
export default function TypingIndicator({ users = [] }) {
  if (users.length === 0) return null;

  const label = users.length === 1
    ? `${users[0].name} is typing`
    : users.length === 2
      ? `${users[0].name} and ${users[1].name} are typing`
      : `${users[0].name} and ${users.length - 1} others are typing`;

  return (
    <div className="flex items-end gap-2 px-1 pb-1 animate-fade-in">
      <div className="bg-surface-2 border border-white/[0.04] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
        <div className="flex items-center gap-[3px]">
          <span className="w-[5px] h-[5px] bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
          <span className="w-[5px] h-[5px] bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }} />
          <span className="w-[5px] h-[5px] bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }} />
        </div>
        <span className="text-[10px] text-text-muted font-medium ml-1">
          {label}
        </span>
      </div>
    </div>
  );
}