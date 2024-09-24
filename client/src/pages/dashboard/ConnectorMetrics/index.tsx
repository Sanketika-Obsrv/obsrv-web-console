import _ from 'lodash';
import JDBCConnectorMetrics from './jdbc';
import ObjectConnectorMetrics from './Object';

const ConnectorMetrics = (props: any) => {
    const { connector_config = {}, datasetId, dataset, renderSections } = props;
    const connectorType = _.get(connector_config, 'connector_type');

    const getComponent = () => {
        switch (connectorType) {

            case 'jdbc': {
                return <JDBCConnectorMetrics {...props} />
            }

            case 'object': {
                return <ObjectConnectorMetrics {...props} />
            }
        }
    }

    return <>
        {getComponent()}
    </>
}

export default ConnectorMetrics