export default function Pagination({ page: currentPage, pages: totalPages, total: totalItems, limit: pageSize, onPageChange }) {
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  // Build page numbers array with ellipsis
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className="pagination-wrapper">
      <span className="pagination-info">
        Showing {start}–{end} of {totalItems} entries
      </span>
      <div className="pagination-btns">
        <button
          className="page-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <i className="fa-solid fa-chevron-left" style={{ fontSize: 10 }}></i>
        </button>
        {pages.map((p, idx) =>
          p === '...' ? (
            <button key={`ellipsis-${idx}`} className="page-btn" disabled style={{ cursor: 'default' }}>
              …
            </button>
          ) : (
            <button
              key={p}
              className={`page-btn${p === currentPage ? ' active' : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        )}
        <button
          className="page-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <i className="fa-solid fa-chevron-right" style={{ fontSize: 10 }}></i>
        </button>
      </div>
    </div>
  );
}
