import other from './home';
import datasets from './datasets'
import { NavItemType } from 'types/menu';
import profile from './profile';
import alert from './alerts';

const menuItems: { items: NavItemType[] } = {
  items: [other, datasets, alert, profile]
};

export default menuItems;
