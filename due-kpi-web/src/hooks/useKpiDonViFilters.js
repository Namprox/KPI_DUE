import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// History state survives Back and reload without exposing filters in the URL.
export default function useKpiDonViFilters() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search || location.state?.kpiFilters || ""), [location.search, location.state]);
  useEffect(() => {
    if (location.search) navigate(location.pathname, {
      replace: true,
      state: { ...location.state, kpiFilters: Object.fromEntries(new URLSearchParams(location.search)) },
    });
  }, [location, navigate]);
  const setParams = (next) => navigate(location.pathname, {
    state: { ...location.state, kpiFilters: Object.fromEntries(next) },
  });
  return [params, setParams];
}
