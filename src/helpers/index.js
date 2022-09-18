const fetch = require("node-fetch");

/** A simple facade to return parsed JSON data from an `href` target. */
module.exports.fetchAsJson = (href) => fetch(href).then((response) => response.json());