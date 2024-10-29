function generateSlug(value: string): string {
    return value
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '');
}

export { generateSlug };
