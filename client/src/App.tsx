import Routes from 'routes';
import _ from 'lodash';
import ThemeCustomization from 'themes';
import Locales from 'components/Locales';
import ScrollTop from 'components/ScrollTop';
import Snackbar from 'components/@extended/Snackbar';
import { useEffect } from 'react';
import { addHttpRequestsInterceptor, errorInterceptor, responseInterceptor } from 'services/http';
import { useNavigate } from 'react-router';
import { useDispatch } from 'react-redux';
import { globalInteractEventsHandler } from 'services/telemetry';

const App = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    addHttpRequestsInterceptor({ responseInterceptor, errorInterceptor: errorInterceptor({ navigate, dispatch }) })
  }, [])

  return <div onClick={globalInteractEventsHandler}>
    <ThemeCustomization>
      <Locales>
        <ScrollTop>
          <>
            <Routes />
            <Snackbar />
          </>
        </ScrollTop>
      </Locales>
    </ThemeCustomization>
  </div>
}

export default App;
