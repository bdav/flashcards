import { createBrowserRouter } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import StudyPage from './pages/StudyPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <DashboardPage />,
  },
  {
    path: '/decks/:deckId/study',
    element: <StudyPage />,
  },
]);
