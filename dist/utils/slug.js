export function generateSlug(businessName, city) {
    const raw = `${businessName} ${city}`;
    return raw
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // remove special chars
        .replace(/\s+/g, '-') // spaces to dashes
        .replace(/-+/g, '-') // collapse multiple dashes
        .replace(/^-|-$/g, ''); // trim leading/trailing dashes
}
