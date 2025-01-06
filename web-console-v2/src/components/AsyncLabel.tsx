import React from 'react';
import { useEffect, useState } from 'react';
import { fetchMultipleMetrics } from '../services/chartMetrics';

const AsyncLabel = (props: any) => {
  const { uuid, refresh, query, transformer, suffix = '', prefix = '', totalMemory, totalDisk, diskTransformer, memoryTransformer } = props;
  const [label, setLabel] = useState('');
  const [displayTotalMemory, setTotalMemory] = useState('');
  const [displayTotalDisk, setTotalDisk] = useState('');

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

  const fetchTotalMemory = async (query: any) => {
    try {
      const response: any = await fetchMultipleMetrics(query, { uuid });
      setTotalMemory(memoryTransformer(response));
    } catch (error) {
      console.log('error occured', error);
    }
  };


  const fetchTotalDisk = async (query: any) => {
    try {
      const response: any = await fetchMultipleMetrics(query, { uuid });
      setTotalDisk(diskTransformer(response));
    } catch (error) {
      console.log('error occured', error);
    }
  };

  useEffect(() => {
    fetchMetric(query);
    fetchTotalMemory(totalMemory)
    fetchTotalDisk(totalDisk)
  }, [refresh?.infrastructure]);

  return (
    <>
      {prefix} {label} {suffix}
      <br />
      {displayTotalMemory && displayTotalMemory}
      {displayTotalDisk && displayTotalDisk}
    </>
  );
};

export default AsyncLabel;
