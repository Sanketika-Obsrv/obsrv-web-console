import * as _ from 'lodash';
import ListRules from './ListRules'
import { functionalAlertConfig } from '../services/configuration';

const CustomAlerts = () => {
    const configuration = functionalAlertConfig;
    return <>
        <ListRules configuration={configuration}></ListRules>
    </>
};

export default CustomAlerts;
