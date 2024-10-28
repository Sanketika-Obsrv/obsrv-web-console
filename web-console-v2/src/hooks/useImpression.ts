import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { generateImpressionEvent } from 'services/telemetry';

const useImpression = ({ type = "", subtype = "PAGINATE", pageid, object = {} }: Record<string, any>) => {
    const location = useLocation();
    const { pathname } = location;
    const edata = { type, subtype, pageid: pageid || pathname, uri: pathname };

    useEffect(() => {
        generateImpressionEvent({ edata, object });
    }, [pageid])

};

export default useImpression;