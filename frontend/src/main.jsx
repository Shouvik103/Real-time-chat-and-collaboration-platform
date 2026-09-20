import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { ToastCard } from "@/components/ui/ToastCard";
import App from "./App";
import "./index.css";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-center"
        gutter={10}
        containerStyle={{
          top: 24,
        }}
        toastOptions={{
          duration: 4500,
        }}
      >
        {(t) => <ToastCard t={t} />}
      </Toaster>
    </QueryClientProvider>
  </React.StrictMode>
);
