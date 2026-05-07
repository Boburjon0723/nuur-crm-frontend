export const showAlert = (message, options = {}) => {
    // Basic browser alert for now, can be replaced by a custom toast/modal
    if (options.variant === 'error') {
        alert('xatolik: ' + message);
    } else {
        alert(message);
    }
};
