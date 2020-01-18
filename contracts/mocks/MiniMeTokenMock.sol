pragma solidity^0.4.18;

import "../MiniMeToken.sol";

contract MiniMeTokenMock is MiniMeToken{
    function MiniMeTokenMock(
        address _tokenFactory,
        address _parentToken,
        uint _parentSnapShotBlock,
        string _tokenName,
        uint8 _decimalUnits,
        string _tokenSymbol,
        bool _transfersEnabled
    ) public MiniMeToken(MiniMeTokenFactory(_tokenFactory), MiniMeToken(_parentToken), _parentSnapShotBlock, _tokenName, _decimalUnits, _tokenSymbol, _transfersEnabled){
    }

    function receiveEther() public payable returns(bool){
      return true;
    }

  function getValueAt(address _owner, uint _block) public view returns(uint256){
    uint256 res = super.getValueAt(balances[_owner],_block);
    return res;
  }

  function isContractMock(address _a) public returns(bool) {
    return super.isContract(_a);
  }

  function updateValueAtNow(address _owner, uint _value) public {
    super.updateValueAtNow(balances[_owner], _value);
  }
}
