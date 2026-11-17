import { useEffect, useRef, type RefObject } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export function RouteEffects({
  mainRef,
}: {
  mainRef: RefObject<HTMLElement | null>;
}) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const previousKey = useRef(location.key);

  useEffect(() => {
    if (previousKey.current === location.key) {
      return;
    }
    previousKey.current = location.key;

    if (navigationType !== "POP") {
      window.scrollTo(0, 0);
    }
    mainRef.current?.focus({ preventScroll: true });
  }, [location.key, navigationType, mainRef]);

  return null;
}
