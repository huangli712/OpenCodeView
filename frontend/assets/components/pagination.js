export class PaginationComponent {
  render(pagination, prefix = "") {
    const { offset, limit, total, hasMore } = pagination;
    const dataAttr = prefix ? `data-${prefix}-offset` : "data-offset";
    const btnClass = prefix ? `${prefix}-page-btn` : "";

    return `
      <div class="pagination ${prefix ? `pagination-${prefix}` : ""}">
        <span class="page-info">Showing ${offset + 1}-${Math.min(offset + limit, total)} of ${total}</span>
        <div class="pagination-buttons">
          ${offset > 0 ? `<button class="btn btn-secondary ${btnClass}" ${dataAttr}="${offset - limit}">← Previous</button>` : ""}
          ${hasMore ? `<button class="btn btn-secondary ${btnClass}" ${dataAttr}="${offset + limit}">Next →</button>` : ""}
        </div>
      </div>
    `;
  }

  setupEvents(callback) {
    document.addEventListener("click", (e) => {
      const target = e.target;

      if (target.classList.contains("btn") && target.dataset.offset) {
        e.preventDefault();
        const offset = parseInt(target.dataset.offset);
        callback(offset);
      }

      if (target.classList.contains("message-page-btn") && target.dataset.messageOffset) {
        e.preventDefault();
        const offset = parseInt(target.dataset.messageOffset);
        callback(offset, true);
      }
    });
  }
}
