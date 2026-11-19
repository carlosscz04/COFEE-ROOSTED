export default function PageHeader({ titulo, subtitulo, children }) {
  return (
    <div className="page-header">
      <div>
        <h2>{titulo}</h2>
        {subtitulo && <p className="text-muted mb-0">{subtitulo}</p>}
      </div>
      <div className="d-flex gap-2 align-items-center flex-wrap">{children}</div>
    </div>
  );
}