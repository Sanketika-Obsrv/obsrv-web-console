export const granularityOptions = [
    {
        label: 'Day',
        value: 'day',
        checkbox: true
    },
    {
        label: 'Week',
        value: 'week',
        checkbox: true
    },
    {
        label: 'Month',
        value: 'month',
        checkbox: true
    },
    {
        label: 'Year',
        value: 'year',
        checkbox: true
    },
    {
        label: 'Five minute',
        value: 'five_minute',
    },
    {
        label: 'Ten minute',
        value: 'ten_minute',
    },
    {
        label: 'Fifteen minute',
        value: 'fifteen_minute',
    },
    {
        label: 'Thirty minute',
        value: 'thirty_minute',
    },
    {
        label: 'Hour',
        value: 'hour',
    },
    {
        label: 'Six hour',
        value: 'six_hour',
    },
    {
        label: 'Quarter',
        value: 'quarter',
    },
];

export const steps = ['Dimensions', 'Aggregations', 'Review'];
export const aggregationFunctions = ["sum", "min", "max"];
export const allowedSegmentGranurality = ["six_hour", "hour", "thirty_minute", "fifteen_minute", "ten_minute", "five_minute", "day"]
export const defaultMetric = {
    "column": "total_count",
    "type": "count",
    "key": "properties.total_count",
    "ref": "properties.total_count",
    "data_type": "integer",
    "required": false,
    "rollupType": "fact"
}