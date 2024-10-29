import axios from 'axios';
import { getBaseURL } from './configData';

axios.defaults.headers.common['Cache-Control'] = 'no-store';
axios.defaults.headers.common['Pragma'] = 'no-store';
export const http = axios.create({ baseURL: getBaseURL() });
