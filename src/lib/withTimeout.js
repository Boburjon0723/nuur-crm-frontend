/**
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} message
 * @returns {Promise<T>}
 */
export function withTimeout(promise, ms, message = "So'rov vaqti tugadi.") {
    const p = Promise.resolve(promise)
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(message)), ms)
        p.then(
            (value) => {
                clearTimeout(timer)
                resolve(value)
            },
            (err) => {
                clearTimeout(timer)
                reject(err)
            }
        )
    })
}
