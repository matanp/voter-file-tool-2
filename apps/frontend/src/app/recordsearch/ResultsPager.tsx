import { Button } from "~/components/ui/button";
import { scrollToElement } from "~/lib/scrollUtils";
import { cn } from "~/lib/utils";

type ResultsPagerProps = {
  shown: number;
  total: number;
  loadMore: () => void;
  /** The results' top element, which Jump to Top scrolls to. */
  topElementId: string;
  className?: string;
};

/**
 * The footer under paginated voter results: Load More while records remain, Jump to Top once the
 * list is long, and the record count. Used by the results table and the phone result cards.
 */
export const ResultsPager: React.FC<ResultsPagerProps> = ({
  shown,
  total,
  loadMore,
  topElementId,
  className,
}) => (
  <div
    className={cn(
      "flex flex-wrap items-center justify-between gap-3",
      className,
    )}
  >
    <div className="flex flex-wrap gap-2">
      {shown < total && <Button onClick={loadMore}>Load More</Button>}
      {shown > 10 && (
        <Button
          onClick={() => scrollToElement(topElementId, 300)}
          variant="outline"
        >
          Jump to Top
        </Button>
      )}
    </div>
    <p className="font-light">
      Showing {shown} records of {total} total
    </p>
  </div>
);
