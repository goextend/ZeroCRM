// Documentation: https://github.com/auth0/extend/wiki/Auth0-Extend-User%27s-Guide#hosting-the-editor
function createExtendEditorConfig(options) {
    var editorOptions = {
        token: options.webtaskContext.webtaskToken,
        hostUrl: options.webtaskContext.hostUrl,
        webtaskContainer: options.webtaskContext.webtaskContainer,
        theme: 'dark',
        header: false,
        toolbar: {
            enabled: true,
            displayName: true
        },
        fullscreen: {
            enabled: true,
            height: '100%',
            width: '100%'
        },        
        poweredBy: false,
        allowRenaming: false,
        allowDeleting: false,
        allowCreating: false,
        allowSwitching: false,
        allowUpdating: true,
        allowAccessingLogs: true,
        allowEditingSecrets: true,
        allowEditingMeta: false,
        allowEditingSchedule: false,
        allowSwitchingTemplates: false,
        allowCreatingFromTemplate: false,
        runner: {
            methods: ['POST'],
            headersEditor: {
                defaultHeaders: {
                    'Content-Type': 'application/json',
                    Authorization: function (secrets) {
                    var token = secrets ? secrets['wt-auth-secret'] : '';
                    return 'Bearer ' + token;
                    }
                }
            },
            paramsEditor:  false,
            bodyEditor: {
                typeSelector: false,
                defaultType: 'raw',
                rawTypeOptions: {
                    defaultMode: 'json',
                    enabled: false
                }
            }
        }
    };

    return editorOptions;
}

function getExtensibilityPointCode(extensibilityPoint) {
    var code = [
        '// This code will execute whenever an opportunity is changed.',
        '// Require any Node.js modules that you added here.',
        '// You can access secrets using: module.webtask.secrets',
        '',
        'module.exports = function(oppty, cb) {',
        '  console.log(\'On opportunity changed:\', oppty);',
        '  ',
        '  if (oppty.size > 1000) {',
        '    // send e-mail to manager',
        '  }',
        '  ',
        '  cb(null, oppty);',
        '};'
    ].join('\n');

    if (extensibilityPoint === 'on-new-lead') {
        code = [
            '// This code will enrich the lead with additional profile information whenever a new lead is created',
            '// Require any Node.js modules that you added here.',
            '// You can access secrets using: module.webtask.secrets',
            '',
            '// To use Clearbit add a clearbit_key secret with your clearbit key as the value.',
            '// You can signup at https://dashboard.clearbit.com/signup',
            '',
            'const clearbit_key = module.webtask.secrets.clearbit_key;',
            'const clearbit = require("clearbit")(clearbit_key);',
            '',
            'module.exports = async function(lead, cb) {',
            '  console.log("On new lead:", lead);',
            '',
            '  lead.profile = {',
            '    created: new Date(),',
            '    vip: (lead.value > 1000)',
            '  };',
            '',
            '  // If the clearbit_key secret has been set',
            '  if (clearbit_key !== "SET CLEARBIT KEY") {',
            '    try {',
            '      cb(null, await getProfileFromClearbit(lead.email));',
            '    } catch (err) {',
            '      cb(err);',
            '    }',
            '    ',
            '    return;',
            '  }',
            '  ',
            '  cb(null, lead);',
            '};',
            '',
            '// Calls clearbit to get social media information for the lead',
            'async function getProfileFromClearbit(email) {',
            '  var Person = clearbit.Person;',
            '  var cb_profile = {};',
            '  ',
            '  return Person.find({email: email}). ',
            '    then(person => {',
            '      cb_profile.github = person.github.handle;',
            '      cb_profile.twitter = person.twitter.handle;',
            '      cb_profile.linkedin = person.linkedin.handle;',
            '      return cb_profile;',
            '    });',
            ' }'        
        ].join('\n')
    }

    return code;
}

function getExtensibilityPointSample(extensibilityPoint)  {
    var sample = { opportunity: 100 }

    if (extensibilityPoint === 'on-new-lead') {
        sample = { name: "Jane Doe", email: "janedoe@sample.com", value: "1000" }
    }

    return JSON.stringify(sample, null, 2);
}

function createRuntimeConfig(options) {
    var editorOptions = {
        webtaskName: options.extensibilityPoint,
        createIfNotExists: {
            category: options.extensibilityPoint
        },
        runner: {
            sample: getExtensibilityPointSample(options.extensibilityPoint)
        },
        categories: [{
            default: true,
            name: options.extensibilityPoint,
            templates: [{
                name: options.extensibilityPoint,
                secrets: {
                    'wt-auth-secret': options.randomBytes,
                    'clearbit_key': 'SET CLEARBIT KEY'
                },
                meta: {
                    'wt-compiler': '@webtask/middleware-compiler',
                    'wt-middleware': '@webtask/bearer-auth-middleware,@auth0extend/zerocrm-middleware',
                    'wt-node-dependencies': '{"@webtask/middleware-compiler":"1.3.0","@webtask/bearer-auth-middleware":"1.2.1", "@auth0extend/zerocrm-middleware":"1.0.0", "clearbit":"1.3.3"}',
                    'wt-auth-secret': options.randomBytes,
                    'auth0-extension-type': options.extensibilityPoint,
                    'wt-editor-linter': 'disabled'
                },
                code: getExtensibilityPointCode(options.extensibilityPoint)
            }]
        }]
    };

    return editorOptions;
}