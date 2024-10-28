import React from 'react';

const StorageHelpText = () =>{
    return (
        <div className="displayContent">
            <div className="section" id="section1">
                <div className="displayContent">
                    <h1 className="contentsHeader">Setup Guide for Dataset Storage</h1>
                    <h1 className="contentsHeader">Dataset Storage</h1>
                    <h3 className="contentsHeader">Dataset Type</h3>
                    <p className="contentBody">
                        At present, there are three types of datasets that can be created: a regular dataset and a master dataset. While there is no significant difference in the majority of workflows, there are some key differences as outlined below which would impact the UI flows:
                    </p>
                    <ul className="customList">
                        <li className="contentBody"><strong>Master Dataset:</strong> Used for capturing master data (e.g., user, location, catalog)</li>
                        <li className="contentBody"><strong>Events</strong></li>
                        <li className="contentBody"><strong>Transactional</strong></li>
                    </ul>
                </div>
            </div>
            
            <div className="section" id="section2">
                <div className="displayContent">
                    <h3 className="contentsHeader">Dataset Store</h3>
                    <ul className="customList">
                        <li className="contentBody"><strong>Lakehouse</strong></li>
                        <li className="contentBody"><strong>Real-time Store</strong></li>
                    </ul>
                </div>
            </div>
            
            <div className="section" id="section3">
                <div className="displayContent">
                    <h3 className="contentsHeader">Indexing Config</h3>
                    <ul className="customList">
                        <li className="contentBody"><strong>A timestamp key for time-series analysis:</strong> The storage data type of this field should be date, date-time, epoch, or any other date/time type; and this field must be marked as required. User options would be to consider data arrival time as a timestamp key or select a date from one of the date fields. This is not applicable for a master dataset.</li>
                        <li className="contentBody"><strong>A primary key for dedup/updates to the data:</strong> Can be any text/number field. Required only for File/Application/Stream connector types. A primary key can be a combination of more than one field.</li>
                        <li className="contentBody"><strong>A partition key for tenanting, efficient querying of data:</strong> Can be any text/number field. Partition key can be a combination of more than one field.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default StorageHelpText;