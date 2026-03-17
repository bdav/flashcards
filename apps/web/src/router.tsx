import { createBrowserRouter } from 'react-router-dom';
import DeckListPage from './pages/DeckListPage';
import StudyPage from './pages/StudyPage';
import StatsPage from './pages/StatsPage';
import DeckStatsPage from './pages/DeckStatsPage';
import DeckCardsPage from './pages/DeckCardsPage';
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
        path: '/decks/:deckId/cards',
        element: <DeckCardsPage />,
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
