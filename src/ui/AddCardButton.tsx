export function AddCardButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="card card--add" onClick={onClick}>
      <span className="card--add__plus" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <span>Add a word</span>
    </button>
  );
}
