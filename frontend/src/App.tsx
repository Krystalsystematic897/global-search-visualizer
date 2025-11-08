import { Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import ProxyManagement from "./pages/ProxyManagement.tsx";
import SearchJobs from "./pages/SearchJobs.tsx";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/proxies" element={<ProxyManagement />} />
        <Route path="/search" element={<SearchJobs />} />
      </Routes>
    </Layout>
  );
}

export default App;
