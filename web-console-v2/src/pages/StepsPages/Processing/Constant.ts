export const processData = {
    // Pii Fields
    section1: 'Add PII Fields',
    section1Properties: {
        selectFiled: 'Select Sensitive Field',
        selectTransform: 'Select Action',
        mode: 'Skip On Action Failure?'
    },
    // Transformation
    section2: 'Transformation',
    section2Properties: {
        selectFiled: 'Select Field',
        selectTransform: 'Add JSONAta Expression',
        mode: 'Skip On Transformation Failure?'
    },

    // Derived Fields
    section3: 'Derived Fields',
    section3Properties: {
        newField: 'Field Name',
        selectDatasetField: 'Transformation Expression',
        mode: 'Skip On Transformation Failure?'
    },
    section4: 'Dedupe Event',

    //Dedupe Events
    section4Properties: {
        fieldName: 'Select Dedupe Field'
    },

    // Denormalization
    section5: 'Add Denorm Field',
    section5Properties: {
        dataset: 'Dataset Field',
        transformation: 'Transformation',
        masterDataset: 'Master Dataset',
        storeData: 'Input Field (to store the data)'
    }
};

export const helps = {
    section1: {
        strict: 'strict',
        ignoreNewFields: 'ignoreNewFields',
        discardNewFields: 'discardNewFields',
        autoIndexNewFields: 'autoIndexNewFields'
    }
};
