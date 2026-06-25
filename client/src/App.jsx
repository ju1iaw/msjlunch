import { Routes, Route } from "react-router-dom";
import StudentApp from "./student/StudentApp.jsx";
import AdminApp from "./admin/AdminApp.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminApp />} />
      <Route path="/*" element={<StudentApp />} />
    </Routes>
  );
}
