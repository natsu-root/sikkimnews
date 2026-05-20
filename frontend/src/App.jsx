import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NewsPage from "@/pages/NewsPage";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <div className="App min-h-screen bg-white text-neutral-900">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<NewsPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;
