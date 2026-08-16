const IMAGE_DIRECTORY_PREFIX = '/public/RC_Data_FMS';

export function getImageBasePath(server, database, fallbackOrigin = '') {
    const baseOrigin = server || fallbackOrigin;
    if (!baseOrigin || !database) {
        return '';
    }

    const encodedDatabase = encodeURIComponent(database);
    return new URL(
        `${IMAGE_DIRECTORY_PREFIX}/${encodedDatabase}/Files/Images/`,
        baseOrigin
    ).toString();
}
