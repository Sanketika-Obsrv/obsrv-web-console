import * as _ from 'lodash';
import ListRules from './ListRules'
import { systemAlertConfig } from '../services/configuration';

const SystemAlerts = () => {

    const configuration = systemAlertConfig

    return <>
        <ListRules configuration={configuration}></ListRules>
    </>
};

export default SystemAlerts;
