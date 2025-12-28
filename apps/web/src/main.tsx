import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { RoomList } from './pages/RoomList';
import { RoomCreate } from './pages/RoomCreate';
import { GameRoom } from './pages/GameRoom';
import { AdminPanel } from './pages/AdminPanel';
import './index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RoomList />,
  },
  {
    path: '/create',
    element: <RoomCreate />,
  },
  {
    path: '/room/:id',
    element: <GameRoom />,
  },
  {
    path: '/admin/:id',
    element: <AdminPanel />,
  },
]);

createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
);

