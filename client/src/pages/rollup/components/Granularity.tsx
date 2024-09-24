import { useState } from 'react';
import * as _ from 'lodash';
import { useLocation } from 'react-router';
import AccordionSection from 'components/AccordionSection';
import GranularityOptions from './GranularityOptions';
import Loader from 'components/Loader';

const Granularity = (props: any) => {
    const {
        setProceedToListPage,
        setSelectedGranularityOptions,
        setCustomGranularity,
        customGranularity,
        selectedOptions,
        setSelectedOptions
    } = props;
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const isEditing = location.state?.edit;

    const sections = [
        {
            id: 'granularity',
            title: 'Granularity *',
            component: (!isEditing ?
                <GranularityOptions
                    setSelectedOptions={setSelectedOptions}
                    selectedOptions={selectedOptions}
                    setCustomGranularity={setCustomGranularity}
                    customGranularity={customGranularity}
                    setProceedToListPage={setProceedToListPage}
                    setSelectedGranularityOptions={setSelectedGranularityOptions}
                /> : null),
            componentType: 'box',
        },
    ];

    return (
        <>
            {loading && <Loader />}
            <AccordionSection sections={sections} />
        </>
    );
};

export default Granularity;
