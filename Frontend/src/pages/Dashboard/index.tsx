import { Routes, Route } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import DashboardPage from './DashboardPage';


const Dashboard = () => {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="summaries" element={<div className="p-8 text-white">Summaries page coming soon</div>} />
        <Route path="channels" element={<div className="p-8 text-white">Channels page coming soon</div>} />
        <Route path="collections" element={<div className="p-8 text-white">Collections page coming soon</div>} />
        <Route path="settings" element={<div className="p-8 text-white">Settings page coming soon</div>} />
        {/* <Route path="create/quiz" element={<CreateQuiz />} /> */}
        <Route path="create/notes" element={<div className="p-8 text-white">Create Notes page coming soon</div>} />
        <Route path="create/practice" element={<div className="p-8 text-white">Create Practice page coming soon</div>} />
      </Route>
    </Routes>
  );
};

export default Dashboard;

