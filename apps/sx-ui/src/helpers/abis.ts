export const abis = {
  erc20: [
    'constructor(string name, string symbol)',
    'event Approval(address indexed owner, address indexed spender, uint256 value)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function balanceOf(address account) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function decreaseAllowance(address spender, uint256 subtractedValue) returns (bool)',
    'function increaseAllowance(address spender, uint256 addedValue) returns (bool)',
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function totalSupply() view returns (uint256)',
    'function transfer(address recipient, uint256 amount) returns (bool)',
    'function transferFrom(address sender, address recipient, uint256 amount) returns (bool)'
  ],
  erc721: ['function safeTransferFrom(address from, address to, uint256 tokenId)'],
  erc1155: [
    'function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)'
  ]
};
