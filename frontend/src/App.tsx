import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Gallery } from './pages/Gallery';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Trash } from './pages/Trash';
import { Upload } from './pages/Upload';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Gallery />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/trash" element={<Trash />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
