import React from 'react';

const CreateDataset = () =>{
    return (
        <div className="displayContent">
            <h1 className="contentsHeader">Setup Guide for Dataset Definition</h1>
            <p className="contentBody">This section provides guidelines for filling out the Dataset Schema. Please ensure that you follow the instructions for each field to ensure the data is valid and consistent.</p>
            <section id="section1" className="section">
                <header className="displayContent">
                    <h3 className="contentsHeader">Dataset Name</h3>
                </header>
                <p className="contentBody">
                    <strong>Description:</strong> This field is used to specify the name of the dataset.<br />
                    <strong>Format:</strong> The name should not include any special characters. It must adhere to the
                    following pattern: . This pattern ensures that the name is
                    composed only of acceptable characters.<br />
                    <strong>Example:</strong> <code>SalesData2024</code>
                </p>
            </section>

            <section id="section2" className="section">
                <header className="displayContent">
                    <h3 className="contentsHeader">Upload Sample Data or Schema Files</h3>
                </header>
                <p className="contentBody">To upload sample data, choose from the following formats: JSON, CSV, XML, Parquet, Avro,
                    or
                    ORC. Ensure that the sample data is in the correct format and adheres to any specific requirements.</p>
                <p className="contentBody">For schema files, upload according to the data format:</p>
                <ul className="customList">
                    <li className="contentBody">JSON: Upload a JSON schema file as per <a className="links"
                            href="https://json-schema.org/specification">JSON Schema Specification</a>.</li><br />
                    <li className="contentBody">XML: Upload an XSD file.</li><br />
                    <li className="contentBody">ProtoBuf: Upload a .proto file.</li><br />
                    <li className="contentBody">CSV: Upload a CSV schema as per <a className="links"
                            href="http://digital-preservation.github.io/csv-schema/">CSV Schema Specification</a>.</li><br />
                    <li className="contentBody">Avro: Upload an .avsc file which has a JSON structure.</li>
                </ul>
            </section>

        </div>
    );
}

export default CreateDataset;