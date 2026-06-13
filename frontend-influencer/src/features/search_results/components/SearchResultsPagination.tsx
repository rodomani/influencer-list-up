import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type SearchResultsPaginationProps = {
  resultCount: number;
  itemsPerPage: number;
  effectiveCurrentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function SearchResultsPagination({
  resultCount,
  itemsPerPage,
  effectiveCurrentPage,
  totalPages,
  onPageChange,
}: SearchResultsPaginationProps) {
  if (resultCount <= itemsPerPage) return null;

  return (
    <div className="mt-2 flex justify-center border border-slate-200 bg-white p-4">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              className={effectiveCurrentPage === 1 ? "pointer-events-none opacity-50" : ""}
              onClick={(event) => {
                event.preventDefault();
                onPageChange(Math.max(1, effectiveCurrentPage - 1));
              }}
            />
          </PaginationItem>
          {(() => {
            const MAX_VISIBLE = 15;
            const half = Math.floor(MAX_VISIBLE / 2);
            let start = Math.max(1, effectiveCurrentPage - half);
            let end = Math.min(totalPages, effectiveCurrentPage + half);

            const visibleCount = end - start + 1;
            if (visibleCount < MAX_VISIBLE) {
              const missing = MAX_VISIBLE - visibleCount;
              const shiftLeft = Math.min(missing, start - 1);
              start -= shiftLeft;
              end = Math.min(totalPages, end + (missing - shiftLeft));
            }

            return Array.from({ length: end - start + 1 }, (_, index) => {
              const page = start + index;
              return (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    isActive={page === effectiveCurrentPage}
                    onClick={(event) => {
                      event.preventDefault();
                      onPageChange(page);
                    }}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              );
            });
          })()}
          <PaginationItem>
            <PaginationNext
              href="#"
              className={effectiveCurrentPage === totalPages ? "pointer-events-none opacity-50" : ""}
              onClick={(event) => {
                event.preventDefault();
                onPageChange(Math.min(totalPages, effectiveCurrentPage + 1));
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
