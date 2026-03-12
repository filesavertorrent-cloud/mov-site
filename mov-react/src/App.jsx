import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Admin from './pages/Admin';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<Admin />} />
      {/* Access legacy admin.html if needed (it's not in public though, so it won't work unless copied) */}
    </Routes>
  );
}

export default App;
