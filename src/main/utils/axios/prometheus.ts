import axios from 'axios';
import appConfig from '../../../shared/resources/appConfig';

const instance = axios.create({
  baseURL: appConfig.PROMETHEUS.URL
});

export default instance;
