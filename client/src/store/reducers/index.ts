
import { combineReducers } from 'redux';


import menu from './menu';
import snackbar from './snackbar';
import config from './config';
import dataset from './dataset';
import wizard from './wizard';
import alerts from './alerts';
import systemSettings from './systemSettings';
const reducers = combineReducers({
  menu,
  snackbar,
  config,
  dataset,
  wizard,
  alerts,
  systemSettings
});

export default reducers;
