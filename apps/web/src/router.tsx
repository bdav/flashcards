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
import { RouteErrorFallback } from './components/RouteErrorFallback';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <RouteErrorFallback />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
    errorElement: <RouteErrorFallback />,
  },
  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorFallback />,
    children: [
      {
        element: <Layout />,
        errorElement: <RouteErrorFallback />,
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
