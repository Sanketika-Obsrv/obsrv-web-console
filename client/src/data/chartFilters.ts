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
    ]
}
