// This code will execute whenever an opportunity is changed.
// Use 1000+ Node.js modules here. 

module.exports = function(oppty, cb) {
  console.log('On opportunity changed:', oppty);

  if (oppty.size > 1000) {
    // send e-mail to manager
  }
  
  cb(null, oppty);
};
