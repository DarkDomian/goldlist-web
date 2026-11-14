export function AddCardButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="card card--add" onClick={onClick}>
      <span className="card--add__plus" aria-hidden="true">
        +
      </span>
      <span>Add a word</span>
    </button>
  );
}
