// Formatting utilities for Backend

const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0 || typeof bytes !== 'number') return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    // Handle potential log(0) or log(negative)
    if (bytes <= 0) return '0 Bytes'; 
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    // Ensure index doesn't go out of bounds for extremely large numbers
    const unitIndex = Math.min(i, sizes.length - 1);
    return parseFloat((bytes / Math.pow(k, unitIndex)).toFixed(dm)) + ' ' + sizes[unitIndex];
};

module.exports = {
    formatBytes
}; 