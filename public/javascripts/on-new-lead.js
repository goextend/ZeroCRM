// This code will enrich the lead with additional profile information whenever a new lead is created
// Require any Node.js modules that you added here.',
// You can access secrets using: module.exports.secrets',
module.exports = function(lead, cb) {
  console.log('On new lead:', lead);

  lead.profile = {
    created: new Date(),
    vip: (lead.value > 1000)
  };
  
  // To use Clearbit add a clearbit_key secret with your clearbit key as the value.',
  // You can signup at https://dashboard.clearbit.com/signup',
  var clearbit_key = module.exports.secrets.clearbit_key; 
  
  // If the clearbit_key secret has been set',
  if (clearbit_key !== undefined) {
    getProfileFromClearbit(lead.email, (err, clearbit) => {
      if(!err) {
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
  function getProfileFromClearbit(email, cb) {
    var clearbit = require("clearbit")(module.exports.secrets.clearbit_key);
    var person = clearbit.Person;
    var cb_profile = {}
    person.find({email: email}).
      then(person=> {
        cb_profile.github = person.github.handle;
        cb_profile.twitter = person.twitter.handle;
        cb_profile.linkedin = person.linkedin.handle;
        cb(null, cb_profile);
      }).
      catch(e=> {
        cb(err);
      });
   }
};