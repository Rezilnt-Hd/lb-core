export function createLogger(service) {
    return {
        info: (msg, data) => console.log(JSON.stringify({ level: 'INFO', service, msg, ...data, ts: new Date().toISOString() })),
        error: (msg, data) => console.error(JSON.stringify({ level: 'ERROR', service, msg, ...data, ts: new Date().toISOString() })),
        warn: (msg, data) => console.warn(JSON.stringify({ level: 'WARN', service, msg, ...data, ts: new Date().toISOString() })),
    };
}
