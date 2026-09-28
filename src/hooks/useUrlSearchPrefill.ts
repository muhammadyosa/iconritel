import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

/** Isi kotak cari halaman list dari ?q= (dipakai oleh Global Search). */
export function useUrlSearchPrefill(setQuery: (v: string) => void, setField?: (v: string) => void) {
  const [params] = useSearchParams();
  const q = params.get("q");
  useEffect(() => {
    if (q == null) return;
    setField?.("all");
    setQuery(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
}
