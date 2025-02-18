import React from 'react';

const CreateDataset = () =>{
    return (
        <div className="displayContent">
            <h1 className="contentsHeader">Setup Guide for Dataset Definition</h1>
            <p className="contentBody">This section provides guidelines for filling out the Dataset Schema. Please ensure that you follow the instructions for each field to ensure the data is valid and consistent.</p>
            <section id="section1" className="section">
                <header className="displayContent">
                    <h3 className="contentsHeader">Dataset Details</h3>
                </header>
                <div className="contentBody">
                    <p><strong>Dataset Name:</strong> Provide a clear, intuitive name for the dataset. This name should describe the dataset’s content and purpose, helping users quickly understand its role. Avoid conflicts with other dataset names to ensure uniqueness and prevent confusion. Note that the <em>dataset ID</em> is automatically generated based on this name. For best results, use only alphabets and avoid special characters, which helps keep the ID generation process straightforward and consistent.</p>
                    <p>Examples of good dataset names:</p>
                    <ul>
                        <li>Customer Orders 2024</li>
                        <li>Product Sales Quarter1</li>
                        <li>Website Traffic July</li>
                        <li>Inventory Stock Levels</li>
                        <li>Employee Performance Review</li>
                    </ul>
                    <p>Choose a name that uniquely describes the dataset&apos;s contents.</p>
                    <p><strong>Dataset Type:</strong> Select the appropriate dataset type based on the nature of your data to help the system process it correctly:</p>
                    <ul>
                        <li><strong>Event Data:</strong> Choose this option for ongoing records or telemetry data (like sensor readings, log events). This type of data is continuously added without modification, making it append-only.</li>
                        <li><strong>Data Changes:</strong> Use this for transactional data, updates, or change logs, such as transaction records, change data capture (CDC), or mutations. This data reflects changes over time and typically includes updates or deletions.</li>
                        <li><strong>Master Data:</strong> Choose this type for stable, reference data that doesn&apos;t change frequently, such as customer, product, or organization details. Master data is often used for denormalization and enriching other datasets with additional information.</li>
                    </ul>
                    <p>Choosing the correct dataset type helps ensure accurate processing, validation, and integration within the system.</p>

                </div>
            </section>

            <section id="section2" className="section">
                <header className="displayContent">
                    <h3 className="contentsHeader">Upload Sample Data or Schema Files</h3>
                </header>
                <div className="contentBody">
                    <p><strong>Sample Data File:</strong></p>
                    <p>Upload a sample data file in JSONL format to auto-generate the dataset schema. Providing a file with at least 100 JSON records helps improve the accuracy of schema detection. Ensure the file contains representative records for best results.</p>
                    <p>Each line in a JSONL file should be a valid JSON object, as shown in this example:</p>
                    <code>
                    &#123;&quot;id&quot;: 1, &quot;name&quot;: &quot;Alice&quot;, &quot;email&quot;: &quot;alice@example.com&quot;&#125;<br/>
                    &#123;&quot;id&quot;: 2, &quot;name&quot;: &quot;Bob&quot;, &quot;email&quot;: &quot;bob@example.com&quot;&#125;<br/>
                    &#123;&quot;id&quot;: 3, &quot;name&quot;: &quot;Charlie&quot;, &quot;email&quot;: &quot;charlie@example.com&quot;&#125;
                    </code>
                    <p>Make sure each line contains a full JSON object.</p>
                    <p><strong>JSON Schema File:</strong></p>
                    <p>Upload a JSON schema file to define the dataset&apos;s structure explicitly. This option provides precise control over the dataset fields.</p>
                    <p>Refer to the <a href="https://json-schema.org/" target="_blank" rel="noreferrer">JSON Schema Specification</a> for guidelines on formatting. For reference, view <a href="https://json-schema.org/learn/getting-started-step-by-step.html" target="_blank" rel="noreferrer">sample schema files</a>.</p>
                </div>
            </section>

        </div>
    );
}

export default CreateDataset;