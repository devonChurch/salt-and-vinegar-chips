const globalConfigApi = require("./globalConfig");
const buildsConfigApi = require("./buildsConfig");
const metadataConfigApi = require("./metadataConfig");

module.exports = {
    ...globalConfigApi,
    ...buildsConfigApi,
    ...metadataConfigApi,
};
