import { Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import DatabaseList from './pages/DatabaseList';
import TableList from './pages/TableList';
import QueryEditor from './pages/QueryEditor';
import TableView from './pages/TableView';
import DatabaseDetails from './pages/DatabaseDetails';

export const routes = [
  {
    path: '/',
    element: <DashboardLayout />,
    children: [
      { path: '/', element: <Navigate to="/dashboard" /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'databases', element: <DatabaseList /> },
      { path: 'database/:dbType/:dbName', element: <DatabaseDetails /> },
      { path: 'database/:dbType/:dbName/tables', element: <TableList /> },
      { path: 'database/:dbType/:dbName/table/:table', element: <TableView /> },
      { path: 'query/:type/:database', element: <QueryEditor /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" /> },
];

export default routes; 