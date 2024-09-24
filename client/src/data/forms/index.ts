import { batchForm } from './input'
import { kafkaForm } from 'data/connectors/kafka';
import { jdbcForm } from 'data/connectors/jdbc';
import { validateDataForm, dedupeForm } from './processing'
import { retentionForm } from './advanced';
import { objectStoreForm } from 'data/connectors/object';

export const forms = {
    input_kafka: kafkaForm,
    input_jdbc: jdbcForm,
    input_objectStore: objectStoreForm,
    input_batch: batchForm,
    input_dedupe: dedupeForm,
    input_validateData: validateDataForm,
    advanced_retention: retentionForm
}