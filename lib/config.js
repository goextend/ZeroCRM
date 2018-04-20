'use strict';

const jws = require('jws');

module.exports = {
    masterWebtaskToken: process.env.MASTER_WEBTASK_TOKEN,
    webtaskContainer: process.env.WEBTASK_CONTAINER,
    zerocrmTenant: process.env.ZEROCRM_TENANT,
    hostUrl: process.env.HOST_URL || 'https://sandbox.auth0-extend.com',
    multitenancyEnabled: false
};

if (module.exports.masterWebtaskToken) {
    
    if (!module.exports.masterWebtaskToken) {
        die('Missing MASTER_WEBTASK_TOKEN environment variable');
    }

    if (!module.exports.zerocrmTenant) {
        die('Missing ZEROCRM_TENANT environment variable.');
    }

    let containerNamespace;
    try {
        let parsedToken = jws.decode(module.exports.masterWebtaskToken);
        containerNamespace = JSON.parse(parsedToken.payload).ten;
    }
    catch (e) {
        die('Invalid MASTER_WEBTASK_TOKEN environment variable.');
    }

    if (containerNamespace === undefined) {
        module.exports.multitenancyEnabled = true;
    }
    // else if (module.exports.webtaskContainer !== module.exports.zerocrmTenant) {
    //     die('When running the ZeroCRM app using a trial webtask token, multi-tenancy is not available. Set WEBTASK_CONTAINER environment variable to the same value as ZEROCRM_TENANT.');
    // }

    function die(message) {
        throw new Error(`${message} Please see https://github.com/auth0/extend/wiki/Auth0-Extend-User%27s-Guide#sample-application for more information.`);
    }
}