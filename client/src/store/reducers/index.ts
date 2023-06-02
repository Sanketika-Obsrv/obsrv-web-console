
import { combineReducers } from 'redux';


import menu from './menu';
import snackbar from './snackbar';
import config from './config';

const reducers = combineReducers({
  menu,
  snackbar,
  config,
});

export default reducers;
