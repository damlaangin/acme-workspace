"use client";

import Router from "next/router";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface RouteTransitionContextValue {
  isNavigating: boolean;
}

const RouteTransitionContext = createContext<RouteTransitionContextValue>({
  isNavigating: false,
});

export const RouteTransitionProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    const handleStart = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      setIsNavigating(true);
    };

    const handleStop = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        setIsNavigating(false);
      }, 200);
    };

    Router.events.on("routeChangeStart", handleStart);
    Router.events.on("routeChangeComplete", handleStop);
    Router.events.on("routeChangeError", handleStop);

    return () => {
      Router.events.off("routeChangeStart", handleStart);
      Router.events.off("routeChangeComplete", handleStop);
      Router.events.off("routeChangeError", handleStop);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const value = useMemo<RouteTransitionContextValue>(
    () => ({ isNavigating }),
    [isNavigating]
  );

  return (
    <RouteTransitionContext.Provider value={value}>
      {children}
      <RouteTransitionBar active={isNavigating} />
    </RouteTransitionContext.Provider>
  );
};

const RouteTransitionBar = ({ active }: { active: boolean }) => (
  <div
    className={`route-transition-bar ${
      active ? "route-transition-bar--active" : ""
    }`}
    aria-hidden={!active}
  >
    <span className="route-transition-bar__fill" />
  </div>
);

export const useRouteTransition = () => {
  const context = useContext(RouteTransitionContext);
  if (!context) {
    throw new Error(
      "useRouteTransition must be used inside RouteTransitionProvider"
    );
  }
  return context;
};
