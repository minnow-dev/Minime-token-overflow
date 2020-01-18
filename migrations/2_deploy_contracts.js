const StandardToken = artifacts.require('StandardToken');

module.exports = function(deployer) {
  deployer.deploy(StandardToken);
};
