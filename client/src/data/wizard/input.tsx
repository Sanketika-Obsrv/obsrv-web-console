import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { Button, Typography } from '@mui/material';
import { forms } from 'data/forms'
import ConditionalCheckboxForm from "pages/dataset/wizard/components/ConditionalCheckboxBasedForm";
import { downloadJSONFile } from 'services/utils';
import { generateSample } from 'data/sampleBatchEvent';
import DataKeySelection from 'pages/dataset/wizard/components/DataKeySelection';
import interactIds from 'data/telemetry/interact.json';
import Kafka from 'pages/dataset/Connector/connectors/Kafka';
import JDBC from 'pages/dataset/Connector/connectors/JDBC';
import ConnectorSection from 'pages/dataset/Connector';
import AddConnector from 'pages/dataset/Connector/components/AddConnector';
import { ApiOutlined, DatabaseOutlined, CloudOutlined } from "@ant-design/icons";
import { KafkaIcon } from 'assets/images/icons/KafkaIcon';
import ObjectStore from 'pages/dataset/Connector/connectors/ObjectStore/index';
import Neo4jTransformer from 'pages/dataset/Connector/connectors/Neo4jTransformer';
import Debezium from 'pages/dataset/Connector/connectors/Debezium';

const downloadBatchConfig = () => {
    downloadJSONFile(generateSample("observations"), "sampleBatchConfig.json");
}

const dataFormatQues = {
    name: 'dataFormat',
    justifyContents: 'flex-start',
    type: 'checkbox',
    fields: [
        {
            name: "dataFormat",
            label: "Individual Events",
            value: "no",
            required: true,
            selected: true,
            disabled: true,
            description: "Individual event mode is always enabled.",
            form: null
        },
        {
            name: "dataFormat",
            label: "Batch Mode",
            value: "yes",
            required: true,
            form: forms.input_batch,
            description: "Select this option if you wish to send multiple events at once for this dataset.",
            topComponent: <>
                <Button
                    data-edataid={`${interactIds.download_sample_batch_file}`}
                    onClick={_ => downloadBatchConfig()}
                    variant="text"
                    sx={{ my: 0.5, fontSize: '1.25rem' }}
                    startIcon={<FileDownloadOutlinedIcon fontSize='inherit' />}
                >
                    <Typography variant="h6">
                        Download Sample Batch Event
                    </Typography>
                </Button>
            </>
        }
    ]
}

const datasourceQues = {
    label: "Add Connector",
    name: 'dataSource',
    fields: [
        {
            name: "dataSource",
            label: "API",
            value: "api",
            icon: <ApiOutlined />,
            selected: true,
            required: true,
            disabled: true,
            description: "API input is by enabled for all datasets.",
            form: null
        },
        {
            name: "dataSource",
            label: "Events (Kafka)",
            value: "kafka",
            icon: <KafkaIcon />,
            required: true,
            form: forms.input_kafka,
            description: "Load streaming data in real-time from Apache Kafka. Configure topic name and list of Kafka brokers in the form: <BROKER_1>:<PORT_1>,<BROKER_2>:<PORT_2>,...",
            component: <Kafka form={forms.input_kafka} />
        },
        // {
        //     name: "dataSource",
        //     label: "Relational Database",
        //     value: "jdbc",
        //     icon: <DatabaseOutlined />,
        //     required: true,
        //     description: "Load data from databases by providing a standard interface for executing SQL queries, fetching results, and managing database connections.",
        //     component: <JDBC form={forms.input_jdbc} />
        // },
        // {
        //     name: "dataSource",
        //     label: "Cloud Store",
        //     value: "object",
        //     icon: <CloudOutlined />,
        //     required: true,
        //     description: "Load data from Store by providing a standard interface for executing SQL queries, fetching results, and managing database connections.",
        //     component: <ObjectStore form={forms.input_objectStore} />
        // },
        // {
        //     name: "dataSource",
        //     label: "Neo4j",
        //     value: "neo4j",
        //     icon: <CloudOutlined />,
        //     required: true,
        //     description: "Load streaming data in real-time from Neo4j. Configure topic name and list of Kafka brokers in the form: <BROKER_1>:<PORT_1>,<BROKER_2>:<PORT_2>,...",
        //     component: <Neo4jTransformer form={forms.input_kafka} />
        // },
        // {
        //     name: "dataSource",
        //     label: "Debezium",
        //     value: "debezium",
        //     icon: <CloudOutlined />,
        //     required: true,
        //     description: "Load streaming data in real-time from Debezium. Configure topic name and list of Kafka brokers in the form: <BROKER_1>:<PORT_1>,<BROKER_2>:<PORT_2>,...",
        //     component: <Debezium form={forms.input_kafka} />
        // }
    ]
}

export const sections = [
    {
        id: 'dataKey',
        title: 'Data key',
        description: 'Select the key from your data for denormalization.',
        component: <DataKeySelection />,
        master: true,
        componentType: 'box',
        navigation: {
            next: 'dataSource'
        }
    },
    {
        id: 'dataSource',
        title: 'Input Data Sources',
        description: 'Read data from a wide variety of data sources. Batch and Real time data integration.',
        component: <ConnectorSection key="dataSource" dialog={<AddConnector />} {...datasourceQues} />,
        noGrid: true,
        navigation: {
            next: 'dataFormat'
        }
    },
    {
        id: 'dataFormat',
        title: 'Input Data Formats',
        description: 'Decide how the data is ingested into the system.',
        component: <ConditionalCheckboxForm key="dataFormat" {...dataFormatQues} />
    }
];
