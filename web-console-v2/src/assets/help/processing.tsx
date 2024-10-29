import React from 'react';

const ProcessingHelpText = () =>{
    return (
        <div className="displayContent">
            <h1 className="contentsHeader">Setup Guide for Dataset Processing</h1>
            <section className="section" id="section1">
                <h1 className="contentsHeader">Data Validation</h1>
                <p className="contentBody"></p>
                <ul className="customList">
                    <li className="contentBody"><strong>Strict:</strong> The specific data record is marked as invalid and will not be available for querying.</li>
                    <li className="contentBody"><strong>Discard new fields:</strong> The new fields are discarded, i.e., not ingested, and the rest of the data record is ingested.</li>
                </ul>
            </section>

            <section className="section" id="section2">
                <h1 className="contentsHeader">Denormalization</h1>
                <p className="contentBody">Enable denormalization of data using master datasets.</p>
                <ul className="customList">
                    <li className="contentBody"><strong>Select Denorm Field:</strong> The field to be denormalized. In addition, the user can provide a JSONata expression as an alternative to selecting the field.</li>
                    <li className="contentBody"><strong>Select Master Dataset:</strong> Select the master dataset from the available list or create one.</li>
                    <li className="contentBody"><strong>View extended fields:</strong> View the extended fields that will be added to the dataset.</li>
                </ul>
            </section>

            <section className="section" id="section3">
                <h1 className="contentsHeader">PII Fields</h1>
                <p className="contentBody">Detect PII fields automatically and prompt the user to either mask or encrypt those fields.</p>
            </section>

            <section className="section" id="section4">
                <h1 className="contentsHeader">Transformations</h1>
                <p className="contentBody">Transformations on the fields can be performed as follows:</p>
                <ul className="customList">
                    <li className="contentBody"><strong>Masking:</strong> Mask one or more fields.</li>
                    <li className="contentBody"><strong>Encryption:</strong> Encrypt one or more fields.</li>
                    <li className="contentBody"><strong>JSONATA:</strong> Provide a JSONata expression (and WYSIWYG editor) to transform the data in existing fields into new fields or replace data within existing fields.</li>
                </ul>
            </section>

            <section className="section" id="section5">
                <h1 className="contentsHeader">Derived Fields</h1>
                <p className="contentBody">Create new columns by applying custom transform expressions.</p>
            </section>

            <section className="section" id="section6">
                <h1 className="contentsHeader">Dedupe Events</h1>
                <p className="contentBody">Drop the duplicate fields.</p>
            </section>
        </div>
    );
}

export default ProcessingHelpText;