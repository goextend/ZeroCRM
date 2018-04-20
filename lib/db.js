'use strict';

/*

Integration of Auth0 Extend requires that you can durably associate a tenant webtask token 
with your notion of a tenant in the system. This is a simplified, in-memory implementation
of relevant storage abstractions. 

*/

var tenants = {}; // hash of tenantName -> tenantData

exports.getTenant = (tenantName, cb) => {
    return cb(null, tenants[tenantName] || {});
};

exports.updateTenant = (tenantName, tenantData, cb) => {
    tenants[tenantName] = tenantData;
    return cb();
};
