export default {
    default: [
        {
            label: 'Today',
            telemetryid: "today",
            value: 1440,
            default: true,
            step: '5m',
            granularity: "five_minute",
            res: '30s'
        },
        {
            label: 'Last 7 Days',
            telemetryid: "lastSevenDays",
            value: 10080,
            step: '5m',
            granularity: "five_minute",
            res: '30s'
        }
    ],
    variant1: [
        {
            label: 'Today',
            telemetryid: "today",
            value: 1440,
            default: true,
            step: '5m',
            granularity: "five_minute",
            res: '30s'
        },
        {
            label: 'Last 7 Days',
            telemetryid: "lastSevenDays",
            value: 10080,
            step: '5m',
            granularity: "five_minute",
            res: '30s'
        },
        {
            label: 'Last 15 Days',
            telemetryid: "lastFifteenDays",
            value: 21600,
            step: '5m',
            granularity: "five_minute",
            res: '30s'
        },
        {
            label: 'Last 30 Days',
            telemetryid: "lastThirtyDays",
            value: 43200,
            step: '5m',
            granularity: "five_minute",
            res: '30s'
        }
    ],
    alertsSeverity: [
        {
            label: 'Warning',
            color: 'warning',
            default: true,
            value: 'warning'
        },
        {
            label: 'Critical',
            color: 'error',
            value: 'error'
        },
    ]
}
