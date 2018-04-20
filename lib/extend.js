'use strict';

const superagent = require('superagent');
const async = require('async');
const config = require('./config');
const db = require('./db');

// Documentation: https://github.com/auth0/extend/wiki/Auth0-Extend-User%27s-Guide#mapping-isolation-requirements-onto-webtask-tokens
exports.mapTenantToIsolationScope = (req, cb) => {
    return req.webtask
        ? cb(null, req.webtask)
        : async.waterfall([
            (cb) => db.getTenant(config.zerocrmTenant, cb),
            (tenantData, cb) => ensureTenantWebtaskToken(config.zerocrmTenant, tenantData, cb)
        ], (error, tenantWebtaskToken) => {
            if (error) return cb(error);
            // Isolation scope is defined by the webtaskContainer and webtaskToken that
            // authorizes management of webtasks in that container. In this simple case
            // the tenant name is directly mapped onto the webtask container name. 
            return cb(null, {
                webtaskContainer: config.zerocrmTenant,
                webtaskToken: tenantWebtaskToken,
                hostUrl: config.hostUrl
            })
        });

    function ensureTenantWebtaskToken(tenant, tenantData, cb) {        
        // If the webtask token is already associated with the tenant in the system, return it.
        if (tenantData.webtaskToken) {
            return cb(null, tenantData.webtaskToken);
        }

        // Otherwise create a tenant webtask token and store it for future use in the database.
        return async.waterfall([
            (cb) => createTenantWebtaskToken(config.zerocrmTenant, cb),
            (tenantWebtaskToken, cb) => db.updateTenant(config.zerocrmTenant, { webtaskToken: tenantWebtaskToken }, (e) => cb(e, tenantWebtaskToken))
        ], cb)
    }

    function createTenantWebtaskToken(tenant, cb) {
        // Use Auth0 Webtask management API to create a tenant webtask token scoped
        // to only allow managing webtasks in the webtask container with a name matching
        // the tenant name in the ZeroCRM system. 
        superagent
            .post(`${config.hostUrl}/api/tokens/issue`)
            .set('Authorization', `Bearer ${config.masterWebtaskToken}`)
            .send({
                ten: config.zerocrmTenant
            })
            .end((error, res) => {
                if (error || !res.ok) return cb(new Error(`Unable to create tenant webtask token: ${ error ? error.message : res.text }`));
                return cb(null, res.text);
            });
    }

};

// Documentation: https://github.com/auth0/extend/wiki/Auth0-Extend-User%27s-Guide#discovering-extensions
exports.discoverExtensions = (webtaskContext, extensibilityPoint, cb) => {
    return superagent.get(`${webtaskContext.hostUrl}/api/webtask/${webtaskContext.webtaskContainer}`)
        .query({ meta: `auth0-extension-type:${extensibilityPoint}` })
        .set('Authorization', `Bearer ${webtaskContext.webtaskToken}`)
        .end((error, res) => {
            if (error || !res.ok) return cb(new Error(`Unable to discover extensions: ${ error ? error.message : res.text }`));
            return cb(null, res.body);
        });
};

// Documentation: https://github.com/auth0/extend/wiki/Auth0-Extend-User%27s-Guide#invoking-extensions
exports.invokeExtension = (extensions, payload, cb) => {

    // Allow only one extension of a specific type to be defined. In production
    // you may allow multiple extensions to exists but only one to be active a time. 
    // You can use a webtask metadata property to indicate which of the extensions is active.
    if (extensions.length > 1) return errorResponse({ 
        status: 500, 
        message: `Inconsistent configuration. More than 1 extension defined the extensibility point. Only one is allowed.`
    });
    
    // No extensions defined, return unmodified input record
    if (extensions.length === 0) return cb(null, payload);

    let extension = extensions[0];

    // Execute the extension
    return superagent.post(extension.webtask_url)
        .set('Authorization', `Bearer ${extension.meta['wt-auth-secret']}`)
        .send(payload)
        .end((error, res) => {
            if (error) return errorResponse({ 
                statusCode: 502, 
                message: `Error executing extension: ${error.message || 'Unknown error'}` 
            });
            if (!res.ok) return errorResponse({
                statusCode: res.statusCode,
                message: res.text
            });

            // This is the place where any additional validations of the data returned
            // from the extension would happen. 
            return cb(null, res.body);
        })


    function errorResponse(error) {
        error.statusCode = error.statusCode || 500;
        return cb(null, error);
    }
};
