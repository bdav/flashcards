import { createBrowserRouter } from 'react-router-dom';
import DeckListPage from './pages/DeckListPage';
import StudyPage from './pages/StudyPage';
import StatsPage from './pages/StatsPage';
import DeckStatsPage from './pages/DeckStatsPage';
import { Layout } from './components/Layout';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <DeckListPage />,
      },
      {
        path: '/decks/:deckId',
        element: <StudyPage />,
      },
      {
        path: '/decks/:deckId/stats',
        element: <DeckStatsPage />,
      },
      {
        path: '/stats',
        element: <StatsPage />,
      },
    ],
  },
]);
