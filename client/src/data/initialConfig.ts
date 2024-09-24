
import * as _ from 'lodash';

export default {
    showClusterMenu: false,
    spacing: 1,
    clusterMenu: { frequency: 300, interval: 10 },
    elevation: 2,
    severityToColorMapping: {
        "HIGH": {
            "color": "error"
        },
        "CRITICAL": {
            "color": "error"
        },
        "LOW": {
            "color": "info"
        },
        "MEDIUM": {
            "color": "warning"
        }
    },
    maxFileSize: 5242880,
    rollupGranularityTypes: [
        "none",
        "all",
        "day",
        "second",
        "minute",
        "week",
        "month",
        "quarter",
        "year"
    ]
}
