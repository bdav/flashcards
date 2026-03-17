import { createBrowserRouter } from 'react-router-dom';
import DeckListPage from './pages/DeckListPage';
import StudyPage from './pages/StudyPage';
import StatsPage from './pages/StatsPage';
import DeckStatsPage from './pages/DeckStatsPage';
import DeckCardsPage from './pages/DeckCardsPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
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
    ],
  },
]);
