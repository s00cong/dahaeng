import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "sonner";
import { router } from "@/lib/router";
import { queryClient } from "@/lib/queryClient";
import { cityApi } from "@/api/city.api";
import { queryKeys } from "@/utils/queryKeys";
import "./index.css";

// 앱 시작과 동시에 지도 GeoJSON prefetch (GlobeViewer 마운트 전에 미리 받아둠)
fetch("/geo/countries-50m.json");

// 앱 시작과 동시에 도시 목록 prefetch (컴포넌트 마운트 기다리지 않음)
queryClient.prefetchQuery({
  queryKey: queryKeys.city.list(),
  queryFn: () => cityApi.getList(),
  staleTime: 5 * 60 * 1000,
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ""}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} context={{ queryClient }} />
        <Toaster richColors position="top-center" expand visibleToasts={5} />
      </QueryClientProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
);
