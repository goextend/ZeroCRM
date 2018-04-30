// This code will enrich the lead with additional profile information whenever a new lead is created
// Require any Node.js modules that you added here.
// You can access secrets using: module.exports.secrets

// To use Clearbit add a clearbit_key secret with your clearbit key as the value.
// You can signup at https://dashboard.clearbit.com/signup

var clearbit_key = module.webtask.secrets.clearbit_key;
var clearbit = require('clearbit')(clearbit_key);

module.exports = function(lead, cb) {
  console.log('On new lead:', lead);

  lead.profile = {
    created: new Date(),
    vip: (lead.value > 1000)
  };
  
  // If the clearbit_key secret has been set',
  if (clearbit_key === 'SET CLEARBIT KEY') {
    getProfileFromClearbit(lead.email, (err, clearbit) => {
      if (!err) {
       lead.profile.clearbit = clearbit;
       cb(null, lead);
      }
      else {
        cb(err);
      }
    });
  }
  else {
    cb(null, lead);
  }

  // Calls clearbit to get social media information for the lead',
  async function getProfileFromClearbit(email, cb) {

    var person = clearbit.Person;
    var cb_profile = {}

    try {
      var result = await person.find({email: email});

      cb_profile.github = result.github.handle;
      cb_profile.twitter = result.twitter.handle;
      cb_profile.linkedin = result.linkedin.handle;

      cb(null, cb_profile);
    } catch(err) {
      console.log(err);
      cb(err);
    }
  }
};