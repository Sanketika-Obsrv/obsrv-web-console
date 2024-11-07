import React from 'react';

const StorageHelpText = () =>{
    return (
        <div className="displayContent">
            <h1 className="contentsHeader">Setup Guide for Dataset Storage</h1>
            <section className="section highlighted" id="section1">
                <h1 className="contentsHeader">Select Storage Type</h1>
                <div className="contentBody">
                    <p>Choose from multiple storage options that best meet your dataset needs:</p>
                    <ul>
                        <li><strong>Data Lakehouse (Hudi):</strong> Stores datasets cost-effectively, ideal for data science and analytical workloads, especially for transactional data. Offers scalable storage but may have slower query responses (not ideal for real-time APIs).</li>
                        <li><strong>Real-time Store (Druid):</strong> Designed for telemetry or append-only data, this real-time OLAP store supports sub-second response times for real-time queries and aggregate analysis.</li>
                        <li><strong>Cache Store (Redis):</strong> Enabled only for &quot;Master&quot; datasets, this option is optimal for data denormalization in real-time due to its speed.</li>
                    </ul>
                </div>
                <h1 className="contentsHeader">Configure Storage Keys:</h1>
                <div className="contentBody">
                    <p>Choose appropriate keys to enable indexing, data storage, and updates.</p>
                    <ul>
                        <li><strong>Primary Key:</strong> Required for Lakehouse and Cache Store. Select a unique identifier field to support record updates. Ensure this key uniquely identifies each record in the dataset.</li>
                        <li><strong>Timestamp Key:</strong> Required for OLAP Store (Druid). Select a timestamp for time-based indexing, either by choosing &quot;Event Arrival Time&quot; for the event&apos;s arrival time into the system, or any valid date-time field from the dataset.</li>
                        <li><strong>Partition Key:</strong> Required for Lakehouse, optional for OLAP Store, and not necessary for Cache Store. Use a field that logically segments data for efficient storage and query performance.</li>
                    </ul>
                </div>

            </section>
            
        </div>
    );
}

export default StorageHelpText;