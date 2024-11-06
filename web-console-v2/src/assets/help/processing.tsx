import React from 'react';

const ProcessingHelpText = () =>{
    return (
        <div className="displayContent">
            <h1 className="contentsHeader">Setup Guide for Dataset Processing</h1>
            <section className="section" id="section1">
                <h1 className="contentsHeader">Data Validation</h1>
                <p className="contentBody">
                    <ul className="customList">
                    <p><strong>Data Validation:</strong> All data is automatically validated to ensure accuracy and compliance with the schema. This includes:</p>
                        <ul>
                        <li>Data type checks</li>
                        <li>Enum validations</li>
                        <li>Range validations</li>
                        <li>Minimum and maximum value checks</li>
                        <li>Required field enforcement</li>
                        </ul>
                        <p>Any mismatches or missing required fields will cause the data to fail validation.</p>
                        <p><strong>Additional Fields:</strong> Select how to handle fields not defined in the schema:</p>
                        <ul>
                        <li><strong>Fail for New Fields (No):</strong> Processing will fail if any fields outside the schema are detected.</li>
                        <li><strong>Ignore New Fields (Yes):</strong> Additional fields will be ignored, and processing will continue.</li>
                        </ul>
                        <p>Choose the option that best fits your data requirements.</p>

                    </ul>
                </p>
            </section>

            <section className="section" id="section2">
                <h1 className="contentsHeader">Data Denormalization</h1>
                <p className="contentBody">
                    Enhance your dataset in real-time by integrating fields from a master dataset.
                    <ol>
                    <li><strong>Select Field for Denormalization:</strong> Choose a field from the event data to use for denormalization, or create a transformed field with JSONata for more customized data integration.</li>
                    <li><strong>Select Master Dataset:</strong> Choose the master dataset that will provide the additional fields to enrich your data.</li>
                    <li><strong>View Added Fields:</strong> Preview the additional fields that will be included in your dataset as a result of denormalization.</li>
                    </ol>
                    <p>This process helps ensure your dataset contains relevant, up-to-date information.</p>
                </p>
            </section>

            <section className="section" id="section3">
                <h1 className="contentsHeader">Data Privacy</h1>
                <div className="contentBody">
                    <p><strong>Marking Sensitive Fields:</strong> To ensure privacy and data security, mark fields containing sensitive information for masking or encryption. Sensitive fields may include Personally Identifiable Information (PII) and other critical data. Here are some examples:</p>
                    <ul>
                    <li><strong>PII:</strong> Name, social security number, date of birth, address, or phone number.</li>
                    <li><strong>Credentials:</strong> Passwords, API keys, and access tokens.</li>
                    <li><strong>Company Identifiers:</strong> Company IDs, customer IDs, and internal project codes.</li>
                    <li><strong>Financial Details:</strong> Credit card numbers, account numbers, and billing information.</li>
                    </ul>
                    <p>Marking these fields enables secure handling, helping comply with privacy standards and protecting sensitive data.Follow the steps below to securely handle sensitive information.</p>
                    <ol>
                    <li><strong>Select Field:</strong> Choose the field that contains sensitive data, such as passwords, API keys, or personal details.</li>
                    <li><strong>Select Action:</strong> Choose the action to take for the selected field:
                        <ul>
                        <li><strong>Mask:</strong> The field’s value will be hidden. This action is irreversible and cannot be recovered.</li>
                        <li><strong>Encrypt:</strong> The field will be encrypted, and can be decrypted when the data is downloaded.</li>
                        </ul>
                    </li>
                    <li><strong>Do you want to skip processing on action failure?</strong> 
                        <ul>
                        <li><strong>Yes:</strong> The record will be skipped if masking or encryption cannot be applied.</li>
                        <li><strong>No:</strong> The record will fail if masking or encryption cannot be applied.</li>
                        </ul>
                    </li>
                    </ol>
                    <p>These actions ensure data privacy and secure handling of sensitive information within the pipeline.</p>
                </div>
            </section>

            <section className="section" id="section4">
                <h1 className="contentsHeader">Data Transformations</h1>
                <div className="contentBody">
                    <p>Customize your data flow in real-time with JSONata expressions. JSONata allows you to modify your data on the fly in <strong>real time</strong>, applying custom transformations as it flows through the pipeline. You can:</p>
                    <ul>
                    <li><strong>Filter Data:</strong> Extract only the data you need based on specific conditions.</li>
                    <li><strong>Restructure Data:</strong> Change the shape of the data by renaming fields or nesting them as needed.</li>
                    <li><strong>Perform Calculations:</strong> Use JSONata expressions to calculate new values based on existing data.</li>
                    </ul>
                    <p>Transformations are applied instantly, ensuring the data you receive is formatted exactly to your specifications. Follow these steps:</p>
                    <ol>
                    <li><strong>Select Field:</strong> Choose the field you want to transform from the event data.</li>
                    <li><strong>Add JSONata Expression:</strong> Enter a valid JSONata expression to transform the data. Use the <strong>Try Out</strong> button to access the JSONata playground for validation and expression generation.</li>
                    <li><strong>Skip on Transformation Failure?</strong> Choose whether to skip processing the event if the transformation fails:
                        <ul>
                        <li><strong>Yes:</strong> Skip the event if the transformation cannot be applied.</li>
                        <li><strong>No:</strong> The event will continue processing even if the transformation fails.</li>
                        </ul>
                    </li>
                    </ol>
                    <p>Real-time transformations help ensure your data is processed exactly as needed.</p>
                </div>
            </section>

            <section className="section" id="section5">
                <h1 className="contentsHeader">Derived Fields</h1>
                <div className="contentBody">
                    <p>Derived fields allow you to create new fields in <strong>real-time</strong> based on existing data using JSONata transformations. Unlike traditional transformations that modify existing fields, derived fields generate entirely new ones, which are then added to the event. This is useful for creating calculated values or adding additional context to the data.</p>
                    <ul>
                        <li><strong>Example:</strong> You can combine two fields (e.g., &quot;first_name&quot; and &quot;last_name&quot;) to create a &quot;full_name&quot; field.</li>
                        <li><strong>How to Use:</strong> Select the existing field(s) you want to transform, write the JSONata expression to generate the new field, and add it back to the event.</li>
                    </ul>
                    <p>Follow these steps:</p>
                    <ol>
                    <li><strong>Field Name:</strong> Specify a unique name for the new field, following JSON naming conventions. You can add this field at any JSON path within the event data structure.</li>
                    <li><strong>Add JSONata Expression:</strong> Enter a valid JSONata expression to define the derived field’s value. Use the <strong>Try Out</strong> button to access the JSONata playground to create and validate your expression.</li>
                    <li><strong>Skip on Transformation Failure?</strong> Choose whether to skip the event if the derived field transformation fails:
                        <ul>
                        <li><strong>Yes:</strong> Skip the event if the derived field transformation cannot be applied.</li>
                        <li><strong>No:</strong> Allow the event to proceed even if the transformation fails.</li>
                        </ul>
                    </li>
                    </ol>
                    <p>Derived fields help to enrich event data with new, customized information in real-time.</p>

                </div>
            </section>

            <section className="section" id="section6">
                <h1 className="contentsHeader">Data Deduplication</h1>
                <div className="contentBody">
                    <p>Deduplication helps prevent duplicate data from entering the system by identifying unique records based on a specified dedupe key. This process is essential for maintaining clean and accurate datasets.</p>
                    <ol>
                        <li><strong>Select Dedupe Key:</strong> Choose a field from the event data that will serve as the unique key for deduplication. This field should contain a unique identifier for each record to ensure duplicates are properly filtered out.</li>
                    </ol>
                    <p>By setting a dedupe key, you enhance data quality and prevent redundant information from affecting downstream processes.</p>

                </div>
            </section>
        </div>
    );
}

export default ProcessingHelpText;