const {
  expectRevert,
  expectEvent,
  BN,
  time,
  constants,
  ether,
  send
} = require('@openzeppelin/test-helpers');

const {expect} =require('chai');
const {accounts, contract } = require('@openzeppelin/test-environment');

const MiniMeTokenArtifacts = contract.fromArtifact('SignalToken');

describe('MiniMeToken', () => {
  const [controller, sender, spender, recipient, ...others] = accounts;
  const parentToken = constants.ZERO_ADDRESS;
  let snapshotBlock;
  const name = 'MiniMeToken';
  const decimals = new BN('18');
  const symbol = 'MiniMe';
  const transferEnabled = true;

  beforeEach(async () => {
    snapshotBlock = await time.latestBlock();
    MiniMeToken = await MiniMeTokenArtifacts.new(
      constants.ZERO_ADDRESS,
      parentToken,
      snapshotBlock,
      name,
      decimals,
      symbol,
      transferEnabled,
      {from:controller}
    );
  });

  describe('#generateTokens()', () => {
    let generateAmount = ether('1');

    const MAX_UINT128 = (new BN('2').pow(new BN('128')).sub(new BN('1')));
    it('should fail if totalSupply overflows', async () => {
      await MiniMeToken.generateTokens(sender, MAX_UINT128, {
        from: controller
      });
      await expectRevert.unspecified(
        MiniMeToken.generateTokens(sender, generateAmount, { from: controller })
      );
    });
  });

  // Test transfer & doTransfer
  describe('#transfer()', () => {
    const transferAmount = ether('1');
    let beforeSenderBalance;
    let beforeRecipientBalance;
    let afterSenderBalance;
    let afterRecipientBalance;

    beforeEach(async () => {
      let generateAmount = ether('100');
      await MiniMeToken.generateTokens(sender, generateAmount, {
        from: controller
      });
      beforeSenderBalance = await MiniMeToken.balanceOf(sender);
      beforeRecipientBalance = await MiniMeToken.balanceOf(recipient);
      // Transfer Enable
      await MiniMeToken.enableTransfers(true, {from:controller});
    });

    it('ISSUE : should fail if receiver\'s balance overflow', async ()=>{
      await MiniMeToken.generateTokens(controller,constants.MAX_UINT256.sub(ether('100')), {from:controller});
      await MiniMeToken.generateTokens(sender, new BN('1'), {
        from: controller
      });
      await expectRevert.unspecified(MiniMeToken.transfer(controller,ether('100').add(new BN('1')), {from:sender}));
    });
  });
});
