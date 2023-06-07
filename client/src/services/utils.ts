export const generateDatesBetweenInterval = (start: any, end: any) => {
    const diffInMinutes = start.diff(end, 'minute');
    const datesBetween = [];

    for (let i = 0; i <= diffInMinutes; i += 5) {
        datesBetween.push(start.subtract(i, 'minute').unix());
    }

    return datesBetween;
}
