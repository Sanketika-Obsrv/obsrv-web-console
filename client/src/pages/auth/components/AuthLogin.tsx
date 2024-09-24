import React, { useEffect, useState } from 'react';
import { Tab, Tabs } from '@mui/material';
import { useDispatch } from 'react-redux';
import { error } from 'services/toaster';
import { useSearchParams } from 'react-router-dom';
import LoginForm from './LoginForm';
import { TabPanel } from 'pages/dataset/wizard/UploadFiles';
import pageIds from 'data/telemetry/pageIds';
import useImpression from 'hooks/useImpression';
import { getConfigValue } from 'services/configData';


const AuthLogin = () => {
  const dispatch = useDispatch();
  const allowedAuthTypes = getConfigValue("AUTHENTICATION_ALLOWED_TYPES") || 'obsrv';
  const [showPassword, setShowPassword] = React.useState(false);
  const [searchParams] = useSearchParams();
  const [tabIndex, setTabIndex] = useState(0);
  const loginView = (allowedAuthTypes.includes("obsrv") && allowedAuthTypes.includes("ad")) ? "tabs" : "non-tabs"

  useImpression({ type: "view", pageid: pageIds.login });
  const getLoginType = () => {
    if (allowedAuthTypes.includes("obsrv")) {
      return "obsrv"
    } else if (allowedAuthTypes.includes("ad")) {
      return "ad"
    } else {
      return ""
    }
  }
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {

    switch (newValue) {
      case 0: {
        // TODO: instrumentation
        // generateInteractTelemetry({ edata: { id: interactIds.upload_sample_file } })
        break;
      }
      case 1: {
        // TODO: instrumentation
        // generateInteractTelemetry({ edata: { id: interactIds.editor_schema } })
        break;
      }
    }

    setTabIndex(newValue);
  };


  useEffect(() => {
    const err = searchParams.get('err');
    if (err) {
      dispatch(error({ message: err }));
    }
  }, []);

  return (
    <>
      {(loginView === "tabs") ?
        <>
          <Tabs variant="fullWidth" value={tabIndex} onChange={handleTabChange} >
            <Tab
              label={"Login with Obsrv"} />
            <Tab
              label={"Login with AD"} />
          </Tabs>
          <TabPanel index={0} value={tabIndex}>
            <LoginForm type={"obsrv"} />
          </TabPanel>
          <TabPanel index={1} value={tabIndex}>
            <LoginForm type={"ad"} />
          </TabPanel>
        </>
        :
        <LoginForm type={getLoginType()} />
      }
    </>
  );
};

export default AuthLogin;