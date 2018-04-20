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
                    var token = secrets ? secrets['auth0-extension-secret'] : '';
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
            'var clearbit_key = module.webtask.secrets.clearbit_key;', 
            'var clearbit = require("clearbit")(clearbit_key);',
            'module.exports = function(lead, cb) {',
            '  console.log("On new lead:", lead);',
            '',
            '  lead.profile = {',
            '    created: new Date(),',
            '    vip: (lead.value > 1000)',
            '  };',
            '',  
            '  // If the clearbit_key secret has been set',
            '  if (clearbit_key !== "SET CLEARBIT KEY") {',
            '    getProfileFromClearbit(lead.email, (err, clearbit) => {',
            '      if(!err) {',
            '        lead.profile.clearbit = clearbit;',
            '        cb(null, lead);',
            '      }',
            '      else {',
            '        cb(err);',
            '      }',
            '    });',
            '  }',
            '  else {',
            '    cb(null, lead);',
            '  }',
            '',
            '  // Calls clearbit to get social media information for the lead',
            '  function getProfileFromClearbit(email, cb) {',
            '    var Person = clearbit.Person;',
            '    var cb_profile = {};',
            '    Person.find({email: email}).',
            '      then(person=> {',
            '        cb_profile.github = person.github.handle;',
            '        cb_profile.twitter = person.twitter.handle;',
            '        cb_profile.linkedin = person.linkedin.handle;',
            '        cb(null, cb_profile);',
            '      }).',
            '      catch(e=> {',
            '        console.log(e);',
            '        cb(null, e);',
            '      });',
            '   }',
            '};'        
        ].join('\n');

        if (qs('node') === '8') {
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
                    'auth0-extension-secret': options.randomBytes,
                    'clearbit_key': 'SET CLEARBIT KEY'
                },
                meta: {
                    'wt-compiler': '@webtask/middleware-compiler',
                    'wt-middleware': '@webtask/bearer-auth-middleware,@auth0extend/zerocrm-middleware',
                    'wt-node-dependencies': '{"@webtask/middleware-compiler":"1.3.0","@webtask/bearer-auth-middleware":"1.2.1", "@auth0extend/zerocrm-middleware":"1.0.0", "clearbit":"1.3.3"}',
                    'auth0-extension-secret': options.randomBytes,
                    'auth0-extension-type': options.extensibilityPoint
                },
                code: getExtensibilityPointCode(options.extensibilityPoint)
            }]
        }]
    };

    if (qs('node') === '8') {
        editorOptions.categories[0].templates[0].meta['wt-editor-linter'] = 'disabled';
    }

    return editorOptions;
}

function qs(key) {
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars[key];
}

function createTripMock() {
    return {
        start: function () {},
        next: function () {},
        stop: function () {},
    };
}

function createInitialTutorial() {
    var tutorialUrl = 'settings?mode=tutorial';
    
    if (qs('mode') !== 'tutorial') {
        return createTripMock();
    }

    if (qs('node') === '8') {
        tutorialUrl = 'settings?node=8&mode=tutorial'
    }

    $('.tutorial.step6 a')
        .attr('href', tutorialUrl);

    var trip = new Trip([
        { 
          sel : $(".tutorial.step1"), 
          content : "Enter 'Customer' as a sample customer name.",
          position : "e",
          animation: 'bounce'
        },
        { 
          sel : $(".tutorial.step2"), 
          content : "Enter '5000' as the value of the prospective deal.",
          position : "e" 
        },
        { 
          sel : $(".tutorial.step3"), 
          content : "Enter 'john.doe@acme.com' as the value of email",
          position : "e" 
        },
        { 
          sel : $(".tutorial.step4"), 
          content : "Click here.",
          position : "e" 
        },
        {
          sel : $(".tutorial.step5"), 
          content: 'JSON result is returned showing information about the newly created lead.',
          position : "n",
          delay : 5000
        },
        {
          sel : $(".tutorial.step6"), 
          content: 'Zero CRM can be extended via custom actions to intercept the lead creation event, and implement custom logic. The Settings screen is where you can configure custom actions.',
          position : "e",
          expose : true
          // delay: 1000
        }
      ], {
        delay : -1,
        tripTheme : "white"
      });

    return trip;
}

function createSettingsTutorial() {
    if (qs('mode') !== 'tutorial') {
        return createTripMock();
    }

    var trip = new Trip([
      { 
        sel : $(".tutorial.step1"), 
        content : "Most platforms today use webhooks for extensibility. Zero CRM uses Auth0 Extend to allow users to write the extension code in-place instead, and later execute it securely. Click here to edit the on-new-lead custom action.",
        position : "w",
        animation: 'bounce'
      },
      { 
        sel : $(".tutorial.step2"), 
        content : "The Auth0 Extend editor provides feature-rich and highly customizable in-product extension development experience. Extensions can be written in Node.js or domain specific languages. Users can manage secrets, access real-time logs, and test the code all from within the Auth0 Extend editor. Try modifying the JSON the code returns, save, then go back to 'Leads' and add a new lead to see your custom action executed.",
        position : "n",
        showCloseBox: true
      }
    ], {
      delay : -1,
      tripTheme : "white"
    });

    return trip;
}