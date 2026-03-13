import { createBrowserRouter } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import StudyPage from './pages/StudyPage';
import { Layout } from './components/Layout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <DashboardPage />,
  },
  {
    element: <Layout showHome />,
    children: [
      {
        path: '/decks/:deckId/study',
        element: <StudyPage />,
      },
    ],
  },
]);
