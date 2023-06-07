import { useRoutes } from 'react-router-dom';

import MainRoutes from './MainRoutes';
import InvalidRoute from './invalidRoute';

export default function ThemeRoutes() {
  return useRoutes([MainRoutes, InvalidRoute,]);
}
