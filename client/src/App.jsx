import { Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import InterviewPage from './components/InterviewPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/session/:id" element={<InterviewPage />} />
    </Routes>
  );
}

export default App;
