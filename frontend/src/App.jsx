import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SyncStatus } from "./components";
import { VolunteerPage, DashboardPage } from "./pages";
import "./App.css";

// Create a react-query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Route for the volunteer PWA */}
          <Route path="/" element={<VolunteerPage />} />

          {/* Route for your manager dashboard */}
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>

        {/* Global sync status indicator */}
        <SyncStatus />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
