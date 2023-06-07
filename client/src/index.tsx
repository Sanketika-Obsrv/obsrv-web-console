import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// third-party
import { Provider as ReduxProvider } from 'react-redux';

import 'simplebar/src/simplebar.css';
import './index.css';
import 'assets/third-party/apex-chart.css';

import App from './App';
import { store } from 'store';
import { ConfigProvider } from 'contexts/ConfigContext';
import reportWebVitals from './reportWebVitals';

const container = document.getElementById('root');
const root = createRoot(container!);


root.render(
    <ReduxProvider store={store}>
        <ConfigProvider>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </ConfigProvider>
    </ReduxProvider>
);
reportWebVitals();
