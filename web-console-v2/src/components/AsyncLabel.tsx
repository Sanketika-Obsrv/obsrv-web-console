import React from 'react';
import { useEffect, useState } from 'react';
import { fetchMultipleMetrics } from '../services/chartMetrics';

const AsyncLabel = (props: any) => {
  const { uuid, refresh, query, transformer, suffix = '', prefix = '' } = props;
  const [label, setLabel] = useState('');

  const fetchMetric = async (query: any) => {
    try {
      const response = await fetchMultipleMetrics(query, { uuid });
      const transformedLabel =
        (await (transformer && transformer(response))) || response;
      setLabel(transformedLabel as any);
    } catch (error) {
      console.log('error occured', error);
    }
  };

  useEffect(() => {
    fetchMetric(query);
  }, [refresh?.infrastructure]);

  return (
    <>
      {prefix} {label} {suffix}
    </>
  );
};

export default AsyncLabel;
